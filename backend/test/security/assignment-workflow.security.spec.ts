import { AssignmentEventType, AssignmentStatus, Role } from '@prisma/client';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import { createOperation, createOrganization, prisma } from '../integration/helpers';
import {
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

describe('AppSec Assignment workflow abuse', () => {
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
    owner = await createSecurityActor(Role.OWNER, 'assign-owner');
    operatorA = await createSecurityActor(Role.OPERATOR, 'assign-opa');
    operatorB = await createSecurityActor(Role.OPERATOR, 'assign-opb');
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('prevents an operator from accepting another operator assignment', async () => {
    const operation = await createOperation(operatorA.user);
    const assignment = await createAssignment(operation.id, operatorA.user.id);

    const response = await authPatch(operatorB, `/api/v1/assignments/${assignment.id}/accept`).send({
      assignedTo: operatorB.user.id,
      status: AssignmentStatus.COMPLETED,
    });

    expect(response.status).toBe(403);
    expect(errorCode(response)).toBe(ERROR_CODES.ASSIGNMENT_OPERATOR_FORBIDDEN);
    const persisted = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    expect(persisted.assignedTo).toBe(operatorA.user.id);
    expect(persisted.status).toBe(AssignmentStatus.ASSIGNED);
    await expect(
      prisma.assignmentHistory.count({
        where: { operationId: operation.id, event: { not: AssignmentEventType.ASSIGNED } },
      }),
    ).resolves.toBe(0);
  });

  it('rejects repeated or out-of-order terminal workflow transitions', async () => {
    const operation = await createOperation(operatorA.user);
    const assignment = await createAssignment(operation.id, operatorA.user.id);

    expect((await authPatch(operatorA, `/api/v1/assignments/${assignment.id}/accept`)).status).toBe(200);
    const repeatedAccept = await authPatch(operatorA, `/api/v1/assignments/${assignment.id}/accept`);
    expect(repeatedAccept.status).toBe(409);
    expect(errorCode(repeatedAccept)).toBe(ERROR_CODES.ASSIGNMENT_INVALID_TRANSITION);

    const completeWithoutStart = await authPatch(operatorA, `/api/v1/assignments/${assignment.id}/complete`).send({
      notes: 'Tentativa sem iniciar',
    });
    expect(completeWithoutStart.status).toBe(409);
    expect(errorCode(completeWithoutStart)).toBe(ERROR_CODES.ASSIGNMENT_INVALID_TRANSITION);

    const acceptedCount = await prisma.assignmentHistory.count({
      where: { operationId: operation.id, event: AssignmentEventType.ACCEPTED },
    });
    expect(acceptedCount).toBe(1);
  });

  async function createAssignment(
    operationId: string,
    assignedTo: string,
  ): Promise<{ id: string }> {
    const response = await authPost(owner, '/api/v1/assignments').send({ operationId, assignedTo });
    expect(response.status).toBe(201);
    const created = response.body as { data?: { id?: string } };
    if (typeof created.data?.id !== 'string') {
      throw new Error('Assignment creation did not return id.');
    }
    return { id: created.data.id };
  }
});
