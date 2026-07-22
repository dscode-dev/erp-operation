import { OperationType, Role } from '@prisma/client';
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
  return {
    id: '33333333-3333-4333-8333-333333333333',
    number: 14,
    organizationId: '44444444-4444-4444-8444-444444444444',
    customerId: '55555555-5555-4555-8555-555555555555',
    equipmentId: equipment.id,
    equipment,
    equipments: [{ equipment }],
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
        technicalCatalog: { id: 'catalog-1', title: 'Inspecionar filtros', active: true },
      },
      {
        position: 1,
        technicalCatalog: { id: 'catalog-2', title: 'Item desativado', active: false },
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
      ) => { checklist?: Array<{ label: string; done: boolean }> };
    }
  ).buildOperationPayload.bind(service);

  it('snapshots only active selected items when PMOC sends its checklist', () => {
    expect(build(plan(true), new Date('2026-08-01T12:00:00.000Z'), actor).checklist).toEqual([
      { label: 'Inspecionar filtros', done: false },
    ]);
  });

  it('generates the Work Order without checklist when the owner opts out', () => {
    expect(build(plan(false), new Date('2026-08-01T12:00:00.000Z'), actor).checklist).toEqual(
      [],
    );
  });
});
