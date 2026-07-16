import { EquipmentStatus, EquipmentType, MaintenanceExecutionStatus, MaintenancePlanType, OperationType, Role, TechnicalCatalogType, TechnicalCatalogWorkflow } from '@prisma/client';
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

  it('assigns an independent PMOC number and derives the official plan name from it', async () => {
    const graph = await createCustomerGraph();
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: graph.customerId } });
    const payload = {
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
      data: { number: number; maintenancePlan: { name: string } };
    };
    expect(createdPlan.data.maintenancePlan.name).toBe(
      `PMOC · ${customer.tradeName ?? customer.name} · PMOC-${String(createdPlan.data.number).padStart(6, '0')}`,
    );
    expect(createdPlan.data.maintenancePlan.name).not.toContain('OS-');
  });

  it('suggests the official name and persists only valid structured scope catalogs', async () => {
    const graph = await createCustomerGraph();
    const organization = await prisma.organization.findFirstOrThrow();
    const scope = await prisma.technicalCatalog.create({
      data: {
        organizationId: organization.id,
        type: TechnicalCatalogType.PLAN_SCOPE,
        title: `Sala técnica ${Date.now()}`,
        workflows: [TechnicalCatalogWorkflow.PMOC],
      },
    });
    const unrelated = await prisma.technicalCatalog.create({
      data: {
        organizationId: organization.id,
        type: TechnicalCatalogType.OBJECTIVE,
        title: `Objetivo ${Date.now()}`,
      },
    });

    const suggestion = await authGet(
      owner,
      `/api/v1/pmoc/name-suggestion?customerId=${graph.customerId}`,
    );
    expect(suggestion.status).toBe(200);
    expect((suggestion.body as { data: { name: string } }).data.name).toContain('PMOC-');

    const payload = {
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      equipmentIds: [graph.equipmentId],
      responsibleTechnician: owner.user.name,
      startDate: '2026-08-15',
      endDate: '2027-08-15',
    };
    const invalid = await authPost(owner, '/api/v1/pmoc').send({
      ...payload,
      scopeCatalogIds: [unrelated.id],
    });
    expect(invalid.status).toBe(400);
    expect(errorCode(invalid)).toBe(ERROR_CODES.TECHNICAL_CATALOG_NOT_FOUND);

    const created = await authPost(owner, '/api/v1/pmoc').send({
      ...payload,
      scopeCatalogIds: [scope.id],
    });
    expect(created.status).toBe(201);
    expect((created.body as { data: { coverage: string; scopes: Array<{ technicalCatalogId: string }> } }).data)
      .toMatchObject({ coverage: scope.title, scopes: [{ technicalCatalogId: scope.id }] });
  });

  it('replaces PMOC equipment coverage without leaving the MaintenancePlan primary out of sync', async () => {
    const graph = await createCustomerGraph();
    const replacement = await prisma.equipment.create({
      data: {
        customerId: graph.customerId,
        addressId: graph.addressId,
        type: EquipmentType.SPLIT,
        status: EquipmentStatus.ACTIVE,
        name: 'Equipamento substituto PMOC',
        tag: `PMOC-REPLACE-${Date.now()}`,
        qrCode: `PMOC-REPLACE-QR-${Date.now()}`,
        isActive: true,
      },
    });
    const created = await authPost(owner, '/api/v1/pmoc').send({
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      equipmentIds: [graph.equipmentId],
      responsibleTechnician: owner.user.name,
      startDate: '2026-07-15',
      endDate: '2027-07-15',
    });
    const plan = (created.body as { data: { id: string; maintenancePlanId: string } }).data;
    const updated = await authPatch(owner, `/api/v1/pmoc/${plan.id}`).send({
      equipmentIds: [replacement.id],
    });
    expect(updated.status).toBe(200);
    expect((updated.body as { data: { equipmentId: string; equipments: Array<{ equipmentId: string }> } }).data).toMatchObject({
      equipmentId: replacement.id,
      equipments: [{ equipmentId: replacement.id }],
    });
    await expect(prisma.maintenancePlan.findUniqueOrThrow({ where: { id: plan.maintenancePlanId } })).resolves.toMatchObject({
      equipmentId: replacement.id,
    });
  });

  it('links a standard manageable Work Order only after the PMOC execution exists', async () => {
    const graph = await createCustomerGraph();
    const pmocResponse = await authPost(owner, '/api/v1/pmoc').send({
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      equipmentIds: [graph.equipmentId],
      responsibleTechnician: owner.user.name,
      startDate: '2026-07-16',
      endDate: '2027-07-16',
      recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
    });
    expect(pmocResponse.status).toBe(201);
    const pmoc = pmocResponse.body as {
      data: { maintenancePlan: { executions: Array<{ id: string }> } };
    };
    const executionId = pmoc.data.maintenancePlan.executions[0]?.id;
    expect(executionId).toBeDefined();

    const operationResponse = await authPost(owner, '/api/v1/operations').send({
      customerId: graph.customerId,
      addressId: graph.addressId,
      equipmentId: graph.equipmentId,
      operatorId: owner.user.id,
      type: 'PREVENTIVA',
      status: 'DRAFT',
      inspectedEquipments: [{ equipmentId: graph.equipmentId, sector: 'Área técnica' }],
    });
    expect(operationResponse.status).toBe(201);
    const operation = operationResponse.body as {
      data: { id: string; documents: Array<{ type: string }> };
    };
    expect(operation.data.documents.some((document) => document.type === 'WORK_ORDER')).toBe(true);

    const linked = await authPatch(owner, `/api/v1/maintenance-executions/${executionId}`).send({
      operationId: operation.data.id,
      status: MaintenanceExecutionStatus.LINKED,
    });
    expect(linked.status).toBe(200);
    await expect(
      prisma.maintenanceExecution.findUniqueOrThrow({ where: { id: executionId } }),
    ).resolves.toMatchObject({ operationId: operation.data.id });
    expect((await authGet(owner, `/api/v1/operations/${operation.data.id}`)).status).toBe(200);
  });

  it('generates a PMOC Work Order through the official workflow with history and notifications', async () => {
    const graph = await createCustomerGraph();
    const secondEquipment = await prisma.equipment.create({
      data: {
        customerId: graph.customerId,
        addressId: graph.addressId,
        type: EquipmentType.SPLIT,
        status: EquipmentStatus.ACTIVE,
        name: 'Split complementar PMOC',
        tag: `PMOC-${Date.now()}`,
        qrCode: `PMOC-QR-${Date.now()}`,
        isActive: true,
      },
    });
    const created = await authPost(owner, '/api/v1/pmoc').send({
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      equipmentIds: [graph.equipmentId, secondEquipment.id],
      serviceTypes: [OperationType.PREVENTIVA, OperationType.CORRETIVA],
      responsibleTechnician: owner.user.name,
      periodicity: 'QUARTERLY',
      generationMode: 'MANUAL',
      defaultOperatorId: operator.user.id,
      coverage: 'Manutenção preventiva integral do equipamento.',
      startDate: '2026-07-16',
      endDate: '2027-07-16',
    });
    expect(created.status).toBe(201);
    const pmoc = created.body as {
      data: { id: string; executionRequests: Array<{ id: string }> };
    };
    const requestId = pmoc.data.executionRequests[0]?.id;
    expect(requestId).toBeDefined();

    const prefill = await authGet(owner, `/api/v1/pmoc/execution-requests/${requestId}/prefill`);
    expect(prefill.status).toBe(200);
    expect(prefill.body).toMatchObject({
      data: {
        customerId: graph.customerId,
        equipmentId: graph.equipmentId,
        operatorId: operator.user.id,
        type: 'PREVENTIVA',
        serviceTypes: ['PREVENTIVA', 'CORRETIVA'],
      },
    });
    expect((prefill.body as { data: { inspectedEquipments: Array<{ equipmentId: string }> } }).data.inspectedEquipments.map((item) => item.equipmentId)).toEqual(
      expect.arrayContaining([graph.equipmentId, secondEquipment.id]),
    );

    const generated = await authPost(
      owner,
      `/api/v1/pmoc/execution-requests/${requestId}/generate-work-order`,
    ).send({ operation: (prefill.body as { data: Record<string, unknown> }).data });
    expect(generated.status).toBe(201);
    const generatedRequest = generated.body as {
      data: {
        status: string;
        executionNumber: number;
        generatedOperationId: string;
        operation: { id: string; operator: { id: string } };
      };
    };
    expect(generatedRequest.data.status).toBe('GENERATED');
    expect(generatedRequest.data.executionNumber).toBe(1);
    expect(generatedRequest.data.operation.operator.id).toBe(operator.user.id);

    const operationId = generatedRequest.data.operation.id;
    const generatedOperation = await prisma.operation.findUniqueOrThrow({
      where: { id: operationId },
      include: { inspectedEquipments: true },
    });
    expect(generatedOperation.serviceTypes).toEqual([
      OperationType.PREVENTIVA,
      OperationType.CORRETIVA,
    ]);
    expect(generatedOperation.inspectedEquipments.map((item) => item.equipmentId)).toEqual(
      expect.arrayContaining([graph.equipmentId, secondEquipment.id]),
    );
    expect(generatedRequest.data.generatedOperationId).toBe(operationId);
    await expect(prisma.assignment.findUnique({ where: { operationId } })).resolves.toMatchObject({
      assignedTo: operator.user.id,
    });
    await expect(
      prisma.operationDocument.findUnique({ where: { operationId_type: { operationId, type: 'WORK_ORDER' } } }),
    ).resolves.toBeTruthy();
    const maintenanceExecution = await prisma.maintenanceExecution.findUniqueOrThrow({
      where: { operationId },
    });
    expect(maintenanceExecution.status).toBe(MaintenanceExecutionStatus.LINKED);
    const executedAt = '2026-07-16T14:00:00.000Z';
    const completed = await authPatch(
      owner,
      `/api/v1/maintenance-executions/${maintenanceExecution.id}`,
    ).send({ status: MaintenanceExecutionStatus.COMPLETED, executedAt });
    expect(completed.status).toBe(200);
    await expect(prisma.pmocPlan.findUniqueOrThrow({ where: { id: pmoc.data.id } })).resolves.toMatchObject({
      lastReservedExecutionNumber: 2,
      lastGeneratedExecutionNumber: 1,
      lastExecutionDate: new Date(executedAt),
    });
    await expect(
      prisma.pmocExecutionRequest.findMany({
        where: { pmocPlanId: pmoc.data.id },
        orderBy: { executionNumber: 'asc' },
        select: { executionNumber: true, status: true },
      }),
    ).resolves.toEqual([
      { executionNumber: 1, status: 'GENERATED' },
      { executionNumber: 2, status: 'PENDING' },
    ]);
    const historyResponse = await authGet(owner, `/api/v1/pmoc/${pmoc.data.id}/history`);
    expect(historyResponse.status).toBe(200);
    const history = historyResponse.body as {
      data: Array<{ action: string; execution: { executionNumber: number; workOrderNumber: number; executedAt: string } | null }>;
    };
    const completionHistory = history.data.find((item) => item.action === 'EXECUTION_COMPLETED');
    expect(completionHistory?.execution?.executionNumber).toBe(1);
    expect(completionHistory?.execution?.executedAt).toBe(executedAt);
    expect(history.data.some((item) => item.action === 'ASSIGNMENT_ASSIGNED')).toBe(true);
    await expect(
      prisma.pmocHistory.count({ where: { pmocPlanId: pmoc.data.id, operationId } }),
    ).resolves.toBeGreaterThan(0);
    await expect(
      prisma.notification.count({ where: { type: 'PMOC_OS_GENERATED', entityId: pmoc.data.id } }),
    ).resolves.toBeGreaterThan(0);
  });

  it('keeps a failed request traceable and rolls back the official Operation', async () => {
    const graph = await createCustomerGraph();
    const unrelated = await createCustomerGraph();
    const created = await authPost(owner, '/api/v1/pmoc').send({
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      responsibleTechnician: owner.user.name,
      generationMode: 'MANUAL',
      startDate: '2026-07-16',
      endDate: '2027-07-16',
    });
    const requestId = (
      created.body as { data: { executionRequests: Array<{ id: string }> } }
    ).data.executionRequests[0].id;
    const before = await prisma.operation.count();
    const failed = await authPost(
      owner,
      `/api/v1/pmoc/execution-requests/${requestId}/generate-work-order`,
    ).send({
      operation: {
        customerId: graph.customerId,
        addressId: unrelated.addressId,
        equipmentId: graph.equipmentId,
        operatorId: operator.user.id,
        type: 'PREVENTIVA',
      },
    });
    expect(failed.status).toBe(409);
    expect(errorCode(failed)).toBe(ERROR_CODES.PMOC_GENERATION_FAILED);
    await expect(prisma.operation.count()).resolves.toBe(before);
    await expect(
      prisma.pmocExecutionRequest.findUniqueOrThrow({ where: { id: requestId } }),
    ).resolves.toMatchObject({ status: 'FAILED', operationId: null, executionNumber: 1 });
    await expect(
      prisma.notification.count({ where: { type: 'PMOC_OS_GENERATION_FAILED' } }),
    ).resolves.toBeGreaterThan(0);

    const retried = await authPost(
      owner,
      `/api/v1/pmoc/execution-requests/${requestId}/generate-work-order`,
    ).send({});
    expect(retried.status).toBe(201);
    expect(retried.body).toMatchObject({
      data: { id: requestId, status: 'GENERATED', executionNumber: 1 },
    });
    await expect(
      prisma.pmocHistory.count({
        where: { executionRequestId: requestId, action: 'REQUEST_RETRY' },
      }),
    ).resolves.toBe(1);
  });

  it('reserves monotonic execution numbers and never reuses a cancelled number', async () => {
    const graph = await createCustomerGraph();
    const created = await authPost(owner, '/api/v1/pmoc').send({
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      responsibleTechnician: owner.user.name,
      generationMode: 'MANUAL',
      startDate: '2026-07-16',
      endDate: '2027-07-16',
    });
    const pmoc = created.body as {
      data: { id: string; executionRequests: Array<{ id: string; executionNumber: number }> };
    };
    expect(pmoc.data.executionRequests[0].executionNumber).toBe(1);
    const cancelled = await authPatch(
      owner,
      `/api/v1/pmoc/execution-requests/${pmoc.data.executionRequests[0].id}/cancel`,
    ).send({});
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toMatchObject({
      data: { status: 'CANCELLED', executionNumber: 1 },
    });

    const [second, third] = await Promise.all([
      authPost(owner, `/api/v1/pmoc/${pmoc.data.id}/execution-requests`).send({
        scheduledFor: '2026-08-16T00:00:00.000Z',
      }),
      authPost(owner, `/api/v1/pmoc/${pmoc.data.id}/execution-requests`).send({
        scheduledFor: '2026-09-16T00:00:00.000Z',
      }),
    ]);
    expect(second.status).toBe(201);
    expect(third.status).toBe(201);
    expect(
      [
        (second.body as { data: { executionNumber: number } }).data.executionNumber,
        (third.body as { data: { executionNumber: number } }).data.executionNumber,
      ].sort(),
    ).toEqual([2, 3]);
    await expect(
      prisma.pmocExecutionRequest.findMany({
        where: { pmocPlanId: pmoc.data.id },
        orderBy: { executionNumber: 'asc' },
        select: { executionNumber: true, status: true },
      }),
    ).resolves.toEqual([
      { executionNumber: 1, status: 'CANCELLED' },
      { executionNumber: 2, status: 'PENDING' },
      { executionNumber: 3, status: 'PENDING' },
    ]);
  });

  it('reschedules the same execution and propagates defaults only to pending requests', async () => {
    const graph = await createCustomerGraph();
    const created = await authPost(owner, '/api/v1/pmoc').send({
      name: 'PMOC operacional consolidado',
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      responsibleTechnician: operator.user.name,
      defaultOperatorId: operator.user.id,
      defaultTechnicianId: operator.user.id,
      defaultOperationType: 'PREVENTIVA',
      defaultEstimatedDurationMinutes: 180,
      defaultOperationObservations: 'Validar parâmetros de operação.',
      generationMode: 'MANUAL',
      startDate: '2026-07-16',
      endDate: '2027-07-16',
    });
    expect(created.status).toBe(201);
    const pmoc = created.body as {
      data: { id: string; executionRequests: Array<{ id: string; executionNumber: number }> };
    };
    const request = pmoc.data.executionRequests[0];
    const rescheduled = await authPatch(
      owner,
      `/api/v1/pmoc/execution-requests/${request.id}/reschedule`,
    ).send({ scheduledFor: '2026-08-20T12:00:00.000Z', notes: 'Cliente solicitou nova data.' });
    expect(rescheduled.status).toBe(200);
    expect(rescheduled.body).toMatchObject({
      data: {
        id: request.id,
        executionNumber: request.executionNumber,
        scheduledFor: '2026-08-20T12:00:00.000Z',
      },
    });

    const updated = await authPatch(owner, `/api/v1/pmoc/${pmoc.data.id}`).send({
      defaultOperatorId: owner.user.id,
      defaultTechnicianId: owner.user.id,
      responsibleTechnician: owner.user.name,
      applyDefaultsToPendingExecutions: true,
    });
    expect(updated.status).toBe(200);
    await expect(
      prisma.pmocExecutionRequest.findUniqueOrThrow({ where: { id: request.id } }),
    ).resolves.toMatchObject({
      executionNumber: 1,
      plannedOperatorId: owner.user.id,
      plannedTechnicianId: owner.user.id,
    });
    await expect(
      prisma.pmocHistory.count({
        where: { executionRequestId: request.id, action: 'REQUEST_RESCHEDULED' },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.pmocHistory.count({
        where: { pmocPlanId: pmoc.data.id, action: 'DEFAULTS_PROPAGATED' },
      }),
    ).resolves.toBe(1);
  });

  it('returns server-side PMOC dashboard, calendar and deterministic health projections', async () => {
    const graph = await createCustomerGraph();
    const created = await authPost(owner, '/api/v1/pmoc').send({
      name: 'PMOC com inteligência operacional',
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      responsibleTechnician: operator.user.name,
      defaultOperatorId: operator.user.id,
      defaultTechnicianId: operator.user.id,
      periodicity: 'MONTHLY',
      generationMode: 'MANUAL',
      startDate: '2026-07-16',
      endDate: '2027-06-16',
    });
    expect(created.status).toBe(201);
    const pmocId = (created.body as { data: { id: string } }).data.id;

    const stats = await authGet(
      owner,
      '/api/v1/pmoc/stats?from=2026-07-01T00:00:00.000Z&to=2026-07-31T23:59:59.999Z',
    );
    expect(stats.status).toBe(200);
    expect(stats.body).toMatchObject({
      data: {
        activePmocs: 1,
        pausedPmocs: 0,
        executionsThisMonth: 1,
        pendingExecutions: 1,
        calendar: {
          items: [
            {
              pmocPlanId: pmocId,
              executionNumber: 1,
              origin: 'MANUAL',
              planName: 'PMOC com inteligência operacional',
            },
          ],
        },
      },
    });

    const detail = await authGet(owner, `/api/v1/pmoc/${pmocId}`);
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      data: {
        overview: {
          expectedExecutions: 12,
          completedExecutions: 0,
          remainingExecutions: 12,
          health: { code: 'CRITICAL', label: 'Crítica' },
        },
      },
    });
  });

  it('allows only one concurrent generation for the same Execution Request', async () => {
    const graph = await createCustomerGraph();
    const created = await authPost(owner, '/api/v1/pmoc').send({
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      responsibleTechnician: owner.user.name,
      generationMode: 'MANUAL',
      defaultOperatorId: operator.user.id,
      startDate: '2026-07-16',
      endDate: '2027-07-16',
    });
    const requestId = (
      created.body as { data: { executionRequests: Array<{ id: string }> } }
    ).data.executionRequests[0].id;
    expect(
      (
        await authPost(
          operator,
          `/api/v1/pmoc/execution-requests/${requestId}/generate-work-order`,
        ).send({})
      ).status,
    ).toBe(403);

    const responses = await Promise.all([
      authPost(owner, `/api/v1/pmoc/execution-requests/${requestId}/generate-work-order`).send({}),
      authPost(owner, `/api/v1/pmoc/execution-requests/${requestId}/generate-work-order`).send({}),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    await expect(
      prisma.operation.count({ where: { pmocExecutionRequest: { id: requestId } } }),
    ).resolves.toBe(1);
  });

  it('runs the scheduler adapter and automatically generates due PMOC Work Orders', async () => {
    const graph = await createCustomerGraph();
    const created = await authPost(owner, '/api/v1/pmoc').send({
      customerId: graph.customerId,
      equipmentId: graph.equipmentId,
      responsibleTechnician: owner.user.name,
      periodicity: 'MONTHLY',
      generationMode: 'AUTO',
      defaultOperatorId: operator.user.id,
      startDate: '2026-07-16',
      endDate: '2027-07-16',
    });
    expect(created.status).toBe(201);
    const pmoc = created.body as {
      data: { id: string; executionRequests: Array<{ id: string }> };
    };
    const requestId = pmoc.data.executionRequests[0].id;

    const scheduler = await authPost(owner, '/api/v1/pmoc/scheduler/run?limit=10').send({});
    expect(scheduler.status).toBe(201);
    expect(scheduler.body).toMatchObject({ data: { attempted: 1, generated: 1, failed: 0 } });
    await expect(
      prisma.pmocExecutionRequest.findUniqueOrThrow({ where: { id: requestId } }),
    ).resolves.toMatchObject({ status: 'GENERATED' });
    await expect(
      prisma.pmocExecutionRequest.count({
        where: { pmocPlanId: pmoc.data.id, status: 'PENDING' },
      }),
    ).resolves.toBe(1);
    await expect(prisma.pmocPlan.findUniqueOrThrow({ where: { id: pmoc.data.id } })).resolves.toMatchObject({
      lastGeneratedExecutionNumber: 1,
      lastSchedulerStatus: 'SUCCESS',
      lastSchedulerError: null,
    });
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
