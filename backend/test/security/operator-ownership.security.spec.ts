import {
  AssignmentStatus,
  DocumentTemplateType,
  MaintenancePlanType,
  MaintenancePriority,
  Role,
} from '@prisma/client';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import {
  OPERATOR_ACCESS_DENIED_ACTION,
  OPERATOR_ACCESS_RESOURCE,
} from '../../src/modules/operation-access/operation-access.service';
import { createOperation, createOrganization, prisma, testId } from '../integration/helpers';
import {
  authGet,
  authPatch,
  closeSecurityApp,
  createSecurityActor,
  createSecurityApp,
  dataOf,
  errorCode,
  registerSecurityHttpServer,
  resetSecurityState,
  type SecurityActor,
  type SecurityApp,
} from './security-app';

const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('ORBIT_SECURITY_FIX01 Operator ownership', () => {
  let security: SecurityApp;
  let owner: SecurityActor;
  let operatorA: SecurityActor;
  let operatorB: SecurityActor;

  beforeAll(async () => {
    security = await createSecurityApp();
    registerSecurityHttpServer(security.http);
  });

  beforeEach(async () => {
    await resetSecurityState();
    await createOrganization();
    owner = await createSecurityActor(Role.OWNER, 'ownership-owner');
    operatorA = await createSecurityActor(Role.OPERATOR, 'ownership-a');
    operatorB = await createSecurityActor(Role.OPERATOR, 'ownership-b');
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('filters operation lists and stats exclusively through active Assignments', async () => {
    const own = await operationAssignedTo(operatorA);
    await operationAssignedTo(operatorB);

    const list = await authGet(operatorA, '/api/v1/operations?page=1&limit=20');
    expect(list.status).toBe(200);
    const page = dataOf<{ items: Array<{ id: string }>; pagination: { total: number } }>(list);
    expect(page.items.map((item) => item.id)).toEqual([own.operationId]);
    expect(page.pagination.total).toBe(1);

    const stats = await authGet(operatorA, '/api/v1/operations/stats');
    expect(stats.status).toBe(200);
    expect(dataOf<{ total: number }>(stats).total).toBe(1);
  });

  it('returns 403 and audits direct operation/photo IDOR attempts', async () => {
    const own = await operationAssignedTo(operatorA);
    const foreign = await operationAssignedTo(operatorB);

    const upload = await authPatch(operatorA, `/api/v1/operations/${own.operationId}`).send({
      photos: [{ dataUrl: `data:image/png;base64,${ONE_PIXEL_PNG}`, caption: 'Permitida' }],
    });
    expect(upload.status).toBe(200);
    const ownPhoto = await prisma.operationPhoto.findFirstOrThrow({ where: { operationId: own.operationId } });
    expect((await authGet(operatorA, `/api/v1/operations/photos/${ownPhoto.id}`)).status).toBe(200);

    const foreignPhoto = await prisma.operationPhoto.create({
      data: {
        operationId: foreign.operationId,
        createdById: operatorB.user.id,
        storageKey: `security/${testId('foreign-photo')}.png`,
        mimeType: 'image/png',
        fileSize: 1,
      },
    });
    for (const path of [
      `/api/v1/operations/${foreign.operationId}`,
      `/api/v1/operations/photos/${foreignPhoto.id}`,
    ]) {
      const response = await authGet(operatorA, path);
      expect(response.status).toBe(403);
      expect(errorCode(response)).toBe(ERROR_CODES.FORBIDDEN);
    }

    const denied = await prisma.auditLog.findMany({
      where: { action: OPERATOR_ACCESS_DENIED_ACTION, resource: OPERATOR_ACCESS_RESOURCE, actor: operatorA.user.id },
    });
    expect(denied).toHaveLength(2);
    for (const event of denied) {
      const metadata = event.metadata as Record<string, unknown>;
      expect(metadata).toMatchObject({
        userId: operatorA.user.id,
        role: Role.OPERATOR,
      });
      expect(typeof metadata.tenant).toBe('string');
      expect(typeof metadata.resourceId).toBe('string');
      expect(typeof metadata.reason).toBe('string');
      expect(JSON.stringify(metadata)).not.toContain('storageKey');
    }
  });

  it('isolates repository, preview, download and handoff by Assignment', async () => {
    const own = await operationAssignedTo(operatorA);
    const foreign = await operationAssignedTo(operatorB);
    const ownDocument = await documentFor(own.operationId, 'OS-OWN');
    const foreignDocument = await documentFor(foreign.operationId, 'OS-FOREIGN');
    const unbackedDocument = await prisma.operationDocument.create({
      data: {
        type: DocumentTemplateType.WORK_ORDER,
        number: 'OS-UNBACKED',
      },
    });

    const repository = await authGet(operatorA, '/api/v1/documents?page=1&limit=20');
    expect(repository.status).toBe(200);
    const page = dataOf<{ items: Array<{ id: string }> }>(repository);
    expect(page.items.map((item) => item.id)).toEqual([ownDocument.id]);

    for (const path of [
      `/api/v1/documents/operations/${foreign.operationId}/WORK_ORDER/preview`,
      `/api/v1/documents/${foreignDocument.id}/preview`,
      `/api/v1/documents/${foreignDocument.id}/download`,
      `/api/v1/documents/${foreignDocument.id}/handoff`,
      `/api/v1/documents/${foreignDocument.id}/handoff/history`,
      `/api/v1/documents/${unbackedDocument.id}/preview`,
    ]) {
      const response = await authGet(operatorA, path);
      expect(response.status).toBe(403);
      expect(errorCode(response)).toBe(ERROR_CODES.FORBIDDEN);
    }
  });

  it('isolates MaintenanceExecution reads and writes by Assignment', async () => {
    const own = await maintenanceAssignedTo(operatorA);
    const foreign = await maintenanceAssignedTo(operatorB);

    const ownList = await authGet(
      operatorA,
      `/api/v1/maintenance-plans/${own.planId}/executions?page=1&limit=20`,
    );
    expect(ownList.status).toBe(200);
    expect(dataOf<{ items: Array<{ id: string }> }>(ownList).items.map((item) => item.id)).toEqual([
      own.executionId,
    ]);

    const foreignList = await authGet(
      operatorA,
      `/api/v1/maintenance-plans/${foreign.planId}/executions?page=1&limit=20`,
    );
    expect(foreignList.status).toBe(200);
    expect(dataOf<{ items: unknown[] }>(foreignList).items).toHaveLength(0);

    const update = await authPatch(
      operatorA,
      `/api/v1/maintenance-executions/${foreign.executionId}`,
    ).send({ notes: 'IDOR' });
    expect(update.status).toBe(403);
    expect(errorCode(update)).toBe(ERROR_CODES.FORBIDDEN);
    await expect(
      prisma.maintenanceExecution.findUniqueOrThrow({ where: { id: foreign.executionId } }),
    ).resolves.toMatchObject({ notes: null });
  });

  it('revokes access when the current Assignment is canceled or rejected', async () => {
    const canceled = await operationAssignedTo(operatorA, AssignmentStatus.CANCELED);
    const rejected = await operationAssignedTo(operatorA, AssignmentStatus.REJECTED);

    for (const operationId of [canceled.operationId, rejected.operationId]) {
      const response = await authGet(operatorA, `/api/v1/operations/${operationId}`);
      expect(response.status).toBe(403);
      expect(errorCode(response)).toBe(ERROR_CODES.FORBIDDEN);
    }
  });

  async function operationAssignedTo(
    actor: SecurityActor,
    status: AssignmentStatus = AssignmentStatus.ASSIGNED,
  ): Promise<{ operationId: string; equipmentId: string }> {
    const operation = await createOperation(actor.user);
    await prisma.assignment.create({
      data: {
        operationId: operation.id,
        assignedBy: owner.user.id,
        assignedTo: actor.user.id,
        status,
        ...(status === AssignmentStatus.CANCELED ? { canceledAt: new Date() } : {}),
        ...(status === AssignmentStatus.REJECTED ? { rejectedAt: new Date(), rejectionReason: 'Teste' } : {}),
      },
    });
    return { operationId: operation.id, equipmentId: operation.equipmentId };
  }

  async function documentFor(operationId: string, number: string): Promise<{ id: string }> {
    return prisma.operationDocument.create({
      data: {
        operationId,
        type: DocumentTemplateType.WORK_ORDER,
        number,
        status: 'DRAFT',
      },
      select: { id: true },
    });
  }

  async function maintenanceAssignedTo(
    actor: SecurityActor,
  ): Promise<{ planId: string; executionId: string }> {
    const operation = await operationAssignedTo(actor);
    const plan = await prisma.maintenancePlan.create({
      data: {
        equipmentId: operation.equipmentId,
        name: testId('ownership-plan'),
        type: MaintenancePlanType.PREVENTIVE,
        active: true,
        priority: MaintenancePriority.MEDIUM,
        recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
        firstExecution: new Date('2026-08-01T12:00:00.000Z'),
        nextExecution: new Date('2026-08-01T12:00:00.000Z'),
        createdBy: owner.user.id,
      },
    });
    const execution = await prisma.maintenanceExecution.create({
      data: {
        maintenancePlanId: plan.id,
        operationId: operation.operationId,
        scheduledAt: new Date('2026-08-01T12:00:00.000Z'),
      },
    });
    return { planId: plan.id, executionId: execution.id };
  }
});
