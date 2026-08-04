import 'reflect-metadata';

import { OperationMaintenanceType, Role, RvtExecutionStatus, RvtPlanStatus } from '@prisma/client';
import { RvtPlanningService } from '../src/modules/rvt-planning/rvt-planning.service';

describe('RVT planning assignment guarantee', () => {
  it('starts configured checklist items as executed so the field user only unchecks exceptions', () => {
    const service = new RvtPlanningService({} as never, {} as never, {} as never, {} as never);
    const actor = { id: '11111111-1111-4111-8111-111111111111', name: 'Técnico' };
    const prefill = (service as unknown as { prefill: (execution: unknown, actor: unknown) => { maintenanceChecklist: Array<{ executed: boolean; result: string }> } }).prefill({
      id: '22222222-2222-4222-8222-222222222222',
      executionNumber: 1,
      scheduledAt: new Date('2026-08-03T12:00:00.000Z'),
      rvtPlanId: '33333333-3333-4333-8333-333333333333',
      rvtPlan: {
        organizationId: '99999999-9999-4999-8999-999999999999',
        customerId: '44444444-4444-4444-8444-444444444444',
        addressId: '55555555-5555-4555-8555-555555555555',
        maintenanceType: OperationMaintenanceType.WEEKLY,
        observations: null,
        responsibleTechnician: actor,
        equipments: [],
        checklists: [{
          technicalCatalogId: '66666666-6666-4666-8666-666666666666',
          technicalCatalog: { title: 'Limpar filtro', description: null },
        }],
      },
    }, actor);

    expect(prefill.maintenanceChecklist).toEqual([
      expect.objectContaining({ executed: true, result: 'YES' }),
    ]);
  });

  it('backfills the primary Assignment before returning a previously prepared execution', async () => {
    const actor = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'owner@orbit.test',
      username: 'owner',
      name: 'Owner',
      role: Role.OWNER,
      isActive: true,
      mustChangePassword: false,
    };
    const operationId = '22222222-2222-4222-8222-222222222222';
    const executionId = '33333333-3333-4333-8333-333333333333';
    const transaction = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      assignment: { findFirst: jest.fn().mockResolvedValue(null) },
      rvtExecution: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      rvtExecution: {
        findUnique: jest.fn().mockResolvedValue({
          id: executionId,
          operationId,
          maintenanceExecutionId: '44444444-4444-4444-8444-444444444444',
          assignedOperatorId: null,
          status: RvtExecutionStatus.PENDING,
          rvtPlanId: '55555555-5555-4555-8555-555555555555',
          rvtPlan: {
            active: true,
            status: RvtPlanStatus.ACTIVE,
            defaultOperatorId: null,
            observations: null,
            maintenanceType: OperationMaintenanceType.WEEKLY,
            equipments: [],
            checklists: [],
            responsibleTechnician: { id: actor.id, name: actor.name, jobTitle: null },
          },
        }),
      },
      $transaction: jest.fn(async (callback: (client: typeof transaction) => Promise<void>) => callback(transaction)),
    };
    const assignments = { createForOperationTx: jest.fn().mockResolvedValue({ id: '66666666-6666-4666-8666-666666666666' }) };
    const operations = { get: jest.fn().mockResolvedValue({ id: operationId, assignment: { id: '66666666-6666-4666-8666-666666666666' } }) };
    const service = new RvtPlanningService(prisma as never, {} as never, operations as never, assignments as never);
    const context = { requestId: 'rvt-assignment-test', ip: null, userAgent: null };

    await service.prepareExecution(executionId, { operatorId: actor.id }, actor, context);

    expect(assignments.createForOperationTx).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({ operationId, assignedBy: actor.id, assignedTo: actor.id, isPrimary: true }),
      actor.id,
      context,
    );
    expect(transaction.rvtExecution.update).toHaveBeenCalledWith({
      where: { id: executionId },
      data: { assignedOperatorId: actor.id, status: RvtExecutionStatus.ASSIGNED },
    });
    expect(operations.get).toHaveBeenCalledWith(operationId, actor, context);
  });

  it('does not create a second Assignment in the RVT transaction hook', async () => {
    const actor = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'owner@orbit.test',
      username: 'owner',
      name: 'Owner',
      role: Role.OWNER,
      isActive: true,
      mustChangePassword: false,
    };
    const executionId = '22222222-2222-4222-8222-222222222222';
    const operationId = '33333333-3333-4333-8333-333333333333';
    const transaction = {
      rvtExecution: { update: jest.fn().mockResolvedValue({}) },
      maintenanceExecution: { update: jest.fn().mockResolvedValue({}) },
      signature: { findFirst: jest.fn().mockResolvedValue({ id: '44444444-4444-4444-8444-444444444444' }) },
      operationDocument: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const execution = {
      id: executionId,
      operationId: null,
      maintenanceExecutionId: '55555555-5555-4555-8555-555555555555',
      assignedOperatorId: null,
      status: RvtExecutionStatus.PENDING,
      scheduledAt: new Date('2026-08-03T12:00:00.000Z'),
      rvtPlanId: '66666666-6666-4666-8666-666666666666',
      rvtPlan: {
        organizationId: '99999999-9999-4999-8999-999999999999',
        active: true,
        status: RvtPlanStatus.ACTIVE,
        customerId: '77777777-7777-4777-8777-777777777777',
        addressId: '88888888-8888-4888-8888-888888888888',
        defaultOperatorId: actor.id,
        responsibleTechnicianId: actor.id,
        observations: null,
        maintenanceType: OperationMaintenanceType.WEEKLY,
        equipments: [],
        checklists: [],
        responsibleTechnician: { id: actor.id, name: actor.name, jobTitle: null },
      },
    };
    const prisma = {
      rvtExecution: { findUnique: jest.fn().mockResolvedValue(execution) },
      technicalCatalog: {
        findMany: jest.fn().mockResolvedValue([
          {
            title: 'Limpeza semestral',
            description: null,
            maintenanceType: OperationMaintenanceType.SEMIANNUAL,
          },
        ]),
      },
    };
    const assignments = { createForOperationTx: jest.fn() };
    const operations = {
      create: jest.fn(async (
        _dto: unknown,
        _actor: unknown,
        _context: unknown,
        hook: (tx: typeof transaction, createdOperationId: string) => Promise<void>,
      ) => {
        await hook(transaction, operationId);
        return { id: operationId };
      }),
    };
    const service = new RvtPlanningService(prisma as never, {} as never, operations as never, assignments as never);

    await service.prepareExecution(
      executionId,
      { operatorId: actor.id },
      actor,
      { requestId: 'rvt-create-assignment-test', ip: null, userAgent: null },
    );

    expect(assignments.createForOperationTx).not.toHaveBeenCalled();
    expect(operations.create).toHaveBeenCalledTimes(1);
    const createDto = operations.create.mock.calls[0]?.[0] as {
      maintenanceChecklist: Array<{ maintenanceType: OperationMaintenanceType; executed: boolean; result: string }>;
    };
    expect(createDto.maintenanceChecklist).toContainEqual(
      expect.objectContaining({ maintenanceType: OperationMaintenanceType.SEMIANNUAL, executed: false, result: 'NO' }),
    );
    expect(transaction.rvtExecution.update).toHaveBeenCalledWith({
      where: { id: executionId },
      data: {
        operationId,
        assignedOperatorId: actor.id,
        status: RvtExecutionStatus.ASSIGNED,
      },
    });
  });
});
