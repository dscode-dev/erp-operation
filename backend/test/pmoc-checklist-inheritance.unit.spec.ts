import {
  MaintenanceChecklistResult,
  OperationMaintenanceType,
  OperationType,
  Role,
} from '@prisma/client';
import { PmocExecutionRequestsService } from '../src/modules/pmoc-compliance/pmoc-execution-requests.service';
import type { AuthenticatedUser } from '../src/shared/types/authenticated-user.type';

const actor = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'owner@orbit.test',
  username: 'owner',
  name: 'Owner',
  role: Role.OWNER,
  isActive: true,
  mustChangePassword: false,
};

function plan(includeChecklistInOperations: boolean): Record<string, unknown> {
  const equipment = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Split 18.000 BTU',
    addressId: null,
    address: null,
  };
  const secondEquipment = {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Condensadora principal',
    addressId: null,
    address: { name: 'Cobertura' },
  };
  return {
    id: '33333333-3333-4333-8333-333333333333',
    number: 14,
    organizationId: '44444444-4444-4444-8444-444444444444',
    customerId: '55555555-5555-4555-8555-555555555555',
    equipmentId: equipment.id,
    equipment,
    equipments: [{ equipment }, { equipment: secondEquipment }],
    customer: { addresses: [] },
    maintenancePlan: { name: 'PMOC Cliente' },
    defaultOperator: null,
    defaultTechnician: null,
    defaultOperatorId: null,
    defaultAddressId: null,
    defaultOperationType: OperationType.PREVENTIVA,
    serviceTypes: [OperationType.PREVENTIVA],
    defaultOperationObservations: null,
    defaultEstimatedDurationMinutes: null,
    coverage: 'Climatização',
    observations: null,
    periodicity: 'MONTHLY',
    includeChecklistInOperations,
    checklists: [
      {
        position: 0,
        technicalCatalog: {
          id: 'catalog-1',
          title: 'Inspecionar filtros',
          active: true,
          maintenanceType: OperationMaintenanceType.MONTHLY,
        },
      },
      {
        position: 1,
        technicalCatalog: {
          id: 'catalog-2',
          title: 'Item desativado',
          active: false,
          maintenanceType: null,
        },
      },
    ],
  };
}

function planWithOverride(): Record<string, unknown> {
  const equipment = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Split 18.000 BTU',
    addressId: null,
    address: null,
  };
  const secondEquipment = {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'Condensadora principal',
    addressId: null,
    address: { name: 'Cobertura' },
  };
  return {
    id: '33333333-3333-4333-8333-333333333333',
    number: 15,
    organizationId: '44444444-4444-4444-8444-444444444444',
    customerId: '55555555-5555-4555-8555-555555555555',
    equipmentId: equipment.id,
    equipment,
    equipments: [{ equipment }, { equipment: secondEquipment }],
    customer: { addresses: [] },
    maintenancePlan: { name: 'PMOC Cliente' },
    defaultOperator: null,
    defaultTechnician: null,
    defaultOperatorId: null,
    defaultAddressId: null,
    defaultOperationType: OperationType.PREVENTIVA,
    serviceTypes: [OperationType.PREVENTIVA],
    defaultOperationObservations: null,
    defaultEstimatedDurationMinutes: null,
    coverage: 'Climatização',
    observations: null,
    periodicity: 'MONTHLY',
    includeChecklistInOperations: true,
    checklists: [
      {
        position: 0,
        equipmentId: equipment.id,
        technicalCatalog: {
          id: 'catalog-specific',
          title: 'Higienizar serpentina do Split',
          active: true,
          maintenanceType: OperationMaintenanceType.MONTHLY,
        },
      },
      {
        position: 1,
        equipmentId: null,
        technicalCatalog: {
          id: 'catalog-general',
          title: 'Procedimento geral',
          active: true,
          maintenanceType: OperationMaintenanceType.MONTHLY,
        },
      },
    ],
  };
}

describe('PMOC checklist inheritance', () => {
  const service = new PmocExecutionRequestsService(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const build = (
    service as unknown as {
      buildOperationPayload: (
        plan: unknown,
        scheduledFor: Date,
        actor: AuthenticatedUser,
        reviewed?: {
          checklist: Array<{ label: string; done: boolean }>;
          inspectedEquipments: Array<{ equipmentId: string; sector: string }>;
        },
      ) => {
        checklist?: Array<{ label: string; done: boolean }>;
        maintenanceChecklist?: Array<{
          equipmentId: string;
          maintenanceType: OperationMaintenanceType;
          description: string;
          executed: boolean;
          result: MaintenanceChecklistResult;
        }>;
        inspectedEquipments?: Array<{ equipmentId: string; sector: string }>;
      };
    }
  ).buildOperationPayload.bind(service);

  it('snapshots active general items for every equipment marked as executed (Sim)', () => {
    const payload = build(plan(true), new Date('2026-08-01T12:00:00.000Z'), actor);
    expect(payload.checklist).toEqual([
      { label: 'Inspecionar filtros', done: false },
    ]);
    // Itens gerais (sem equipmentId) se aplicam a todos os equipamentos e, por
    // terem sido selecionados no plano, entram como executados (Sim).
    expect(payload.maintenanceChecklist).toEqual([
      {
        equipmentId: '22222222-2222-4222-8222-222222222222',
        maintenanceType: OperationMaintenanceType.MONTHLY,
        description: 'Inspecionar filtros',
        executed: true,
        result: MaintenanceChecklistResult.YES,
      },
      {
        equipmentId: '66666666-6666-4666-8666-666666666666',
        maintenanceType: OperationMaintenanceType.MONTHLY,
        description: 'Inspecionar filtros',
        executed: true,
        result: MaintenanceChecklistResult.YES,
      },
    ]);
    expect(payload.inspectedEquipments).toEqual([
      {
        equipmentId: '22222222-2222-4222-8222-222222222222',
        sector: 'Split 18.000 BTU',
      },
      {
        equipmentId: '66666666-6666-4666-8666-666666666666',
        sector: 'Cobertura',
      },
    ]);
  });

  it('generates the Work Order without checklist when the owner opts out', () => {
    const payload = build(plan(false), new Date('2026-08-01T12:00:00.000Z'), actor);
    expect(payload.checklist).toEqual([]);
    expect(payload.maintenanceChecklist).toEqual([]);
  });

  it('uses the equipment-specific checklist as an override of the general one', () => {
    const payload = build(planWithOverride(), new Date('2026-08-01T12:00:00.000Z'), actor);
    // Equipamento com checklist específico usa APENAS o seu; o outro herda o geral.
    expect(payload.maintenanceChecklist).toEqual([
      {
        equipmentId: '22222222-2222-4222-8222-222222222222',
        maintenanceType: OperationMaintenanceType.MONTHLY,
        description: 'Higienizar serpentina do Split',
        executed: true,
        result: MaintenanceChecklistResult.YES,
      },
      {
        equipmentId: '66666666-6666-4666-8666-666666666666',
        maintenanceType: OperationMaintenanceType.MONTHLY,
        description: 'Procedimento geral',
        executed: true,
        result: MaintenanceChecklistResult.YES,
      },
    ]);
  });

  it('keeps the PMOC per-equipment checklist even when a reviewed general checklist differs', () => {
    const payload = build(
      plan(true),
      new Date('2026-08-01T12:00:00.000Z'),
      actor,
      {
        checklist: [{ label: 'Procedimento adicional', done: false }],
        inspectedEquipments: [],
      },
    );

    // O checklist geral revisado alimenta apenas o campo `checklist` da OS; a
    // tabela de manutenção do PMOC continua vindo da configuração do plano.
    expect(payload.checklist).toEqual([{ label: 'Procedimento adicional', done: false }]);
    expect(payload.maintenanceChecklist).toEqual([
      {
        equipmentId: '22222222-2222-4222-8222-222222222222',
        maintenanceType: OperationMaintenanceType.MONTHLY,
        description: 'Inspecionar filtros',
        executed: true,
        result: MaintenanceChecklistResult.YES,
      },
      {
        equipmentId: '66666666-6666-4666-8666-666666666666',
        maintenanceType: OperationMaintenanceType.MONTHLY,
        description: 'Inspecionar filtros',
        executed: true,
        result: MaintenanceChecklistResult.YES,
      },
    ]);
    expect(payload.inspectedEquipments).toHaveLength(2);
  });
});
