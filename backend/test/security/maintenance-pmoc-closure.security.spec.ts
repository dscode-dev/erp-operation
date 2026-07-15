import {
  DocumentTemplateType,
  MaintenanceExecutionStatus,
  MaintenancePlanType,
  OperationStatus,
  OperationType,
  Role,
} from '@prisma/client';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import { createCustomerGraph, createMaintenanceFixture, createOperation, createOrganization, prisma } from '../integration/helpers';
import {
  authGet,
  authPatch,
  authPost,
  closeSecurityApp,
  createSecurityActor,
  createSecurityApp,
  errorCode,
  registerSecurityHttpServer,
  resetSecurityState,
  type SecurityActor,
  type SecurityApp,
} from './security-app';

describe('AppSec Maintenance Planning and PMOC closure', () => {
  let security: SecurityApp;
  let owner: SecurityActor;
  let operator: SecurityActor;
  let viewer: SecurityActor;

  beforeAll(async () => {
    security = await createSecurityApp();
    registerSecurityHttpServer(security.http);
  });

  beforeEach(async () => {
    await resetSecurityState();
    await createOrganization();
    owner = await createSecurityActor(Role.OWNER, 'mnt-owner');
    operator = await createSecurityActor(Role.OPERATOR, 'mnt-operator');
    viewer = await createSecurityActor(Role.VIEWER, 'mnt-viewer');
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('enforces Maintenance RBAC and rejects recurrence abuse at the HTTP DTO boundary', async () => {
    const graph = await createCustomerGraph();
    const payload = {
      equipmentId: graph.equipmentId,
      name: 'Plano preventivo',
      type: MaintenancePlanType.PREVENTIVE,
      recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
      firstExecution: '2026-07-10T09:00:00.000Z',
    };

    expect((await authGet(viewer, '/api/v1/maintenance-plans')).status).toBe(200);
    expect((await authPost(operator, '/api/v1/maintenance-plans').send(payload)).status).toBe(403);
    expect((await authPost(viewer, '/api/v1/maintenance-plans').send(payload)).status).toBe(403);

    const invalids = [
      { recurrenceRule: { frequency: 'INTERVAL_DAYS', interval: 0 } },
      { recurrenceRule: { frequency: 'INTERVAL_MONTHS', interval: -1 } },
      { recurrenceRule: { frequency: 'INTERVAL_DAYS', interval: 3651 } },
      { recurrenceRule: { frequency: 'CRON_EVERY_MS', interval: 1 } },
      { firstExecution: 'not-a-date' },
    ];
    for (const patch of invalids) {
      const response = await authPost(owner, '/api/v1/maintenance-plans').send({ ...payload, ...patch });
      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe(ERROR_CODES.VALIDATION_ERROR);
    }
  });

  it('blocks MaintenanceExecution links to Operations from another Equipment and keeps side effects absent', async () => {
    const fixture = await createMaintenanceFixture(owner.user);
    const unrelatedOperation = await createOperation(owner.user);

    const response = await authPatch(owner, `/api/v1/maintenance-executions/${fixture.executionId}`).send({
      operationId: unrelatedOperation.id,
      status: MaintenanceExecutionStatus.COMPLETED,
      executedAt: '2026-07-10T10:00:00.000Z',
    });
    expect(response.status).toBe(400);
    expect(errorCode(response)).toBe(ERROR_CODES.MAINTENANCE_OPERATION_MISMATCH);

    const execution = await prisma.maintenanceExecution.findUniqueOrThrow({ where: { id: fixture.executionId } });
    expect(execution.status).toBe(MaintenanceExecutionStatus.PLANNED);
    await expect(prisma.assetLifecycleEvent.count({ where: { operationId: unrelatedOperation.id } })).resolves.toBe(0);
  });

  it('enforces PMOC RBAC and Customer/Equipment relationship integrity', async () => {
    const graph = await createCustomerGraph();
    const otherGraph = await createCustomerGraph();
    const payload = {
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      responsibleTechnician: 'Responsável Técnico',
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
      recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
    };

    expect((await authGet(operator, '/api/v1/pmoc')).status).toBe(200);
    expect((await authPost(operator, '/api/v1/pmoc').send(payload)).status).toBe(403);
    expect((await authPost(viewer, '/api/v1/pmoc').send(payload)).status).toBe(403);

    const reversedDates = await authPost(owner, '/api/v1/pmoc').send({
      ...payload,
      startDate: '2026-12-31T00:00:00.000Z',
      endDate: '2026-07-01T00:00:00.000Z',
    });
    expect(reversedDates.status).toBe(400);
    expect(errorCode(reversedDates)).toBe(ERROR_CODES.VALIDATION_ERROR);

    const mismatchedEquipment = await authPost(owner, '/api/v1/pmoc').send({
      ...payload,
      equipmentIds: [otherGraph.equipmentId],
    });
    expect(mismatchedEquipment.status).toBe(400);
    expect(errorCode(mismatchedEquipment)).toBe(ERROR_CODES.PMOC_INVALID_RELATIONSHIP);
  });

  it('creates one traceable PMOC from a completed Work Order and derives its official name', async () => {
    const graph = await createCustomerGraph();
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: graph.customerId } });
    const operation = await prisma.operation.create({
      data: {
        customerId: graph.customerId,
        addressId: graph.addressId,
        equipmentId: graph.equipmentId,
        operatorId: owner.user.id,
        type: OperationType.PREVENTIVA,
        status: OperationStatus.COMPLETED,
        completedAt: new Date('2026-07-15T10:00:00.000Z'),
        checklist: [],
        documents: {
          create: {
            type: DocumentTemplateType.WORK_ORDER,
            number: 'OS-009999',
          },
        },
      },
    });
    const payload = {
      sourceOperationId: operation.id,
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      equipmentIds: [graph.equipmentId],
      responsibleTechnician: owner.user.name,
      startDate: '2026-07-15',
      endDate: '2027-07-15',
      recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
    };

    const created = await authPost(owner, '/api/v1/pmoc').send(payload);
    expect(created.status).toBe(201);
    const createdPlan = created.body as {
      data: { sourceOperationId: string; maintenancePlan: { name: string } };
    };
    expect(createdPlan.data.sourceOperationId).toBe(operation.id);
    expect(createdPlan.data.maintenancePlan.name).toBe(
      `PMOC · ${customer.tradeName ?? customer.name} · OS-009999`,
    );

    const duplicate = await authPost(owner, '/api/v1/pmoc').send(payload);
    expect(duplicate.status).toBe(409);
    expect(errorCode(duplicate)).toBe(ERROR_CODES.PMOC_SOURCE_OPERATION_CONFLICT);
    await expect(
      prisma.pmocPlan.count({ where: { sourceOperationId: operation.id } }),
    ).resolves.toBe(1);
  });

  it('blocks PMOC environment relationship confusion across PMOC scope', async () => {
    const graph = await createCustomerGraph();
    const outOfScope = await createCustomerGraph();
    const create = await authPost(owner, '/api/v1/pmoc').send({
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      responsibleTechnician: 'Responsável Técnico',
      startDate: '2026-07-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
      recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
    });
    expect(create.status).toBe(201);
    const pmocId = (create.body as { data: { id: string } }).data.id;

    const response = await authPost(owner, `/api/v1/pmoc/${pmocId}/environments`).send({
      name: 'Centro Cirúrgico',
      equipmentIds: [outOfScope.equipmentId],
    });
    expect(response.status).toBe(400);
    expect(errorCode(response)).toBe(ERROR_CODES.PMOC_INVALID_RELATIONSHIP);
    await expect(prisma.pmocEnvironment.count()).resolves.toBe(0);
  });
});
