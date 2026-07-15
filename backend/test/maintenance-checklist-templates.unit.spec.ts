import { OperationMaintenanceType, TechnicalCatalogType } from '@prisma/client';
import { MaintenanceChecklistTemplatesService } from '../src/modules/maintenance-checklist-templates/maintenance-checklist-templates.service';

const organizationId = '11111111-1111-4111-8111-111111111111';
const actor = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'owner@orbit.test',
  username: 'owner',
  name: 'Owner',
  role: 'OWNER',
  isActive: true,
  mustChangePassword: false,
} as const;
const context = { requestId: 'request-1', ip: '127.0.0.1', userAgent: 'jest' };

describe('MaintenanceChecklistTemplatesService', () => {
  it('scopes and paginates the catalog by organization and maintenance type', async () => {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId }) },
      technicalCatalog: {
        findMany: jest.fn((args: unknown) => ({ kind: 'findMany', args })),
        count: jest.fn((args: unknown) => ({ kind: 'count', args })),
      },
      $transaction: jest.fn().mockResolvedValue([
        [
          {
            id: 'template-1',
            organizationId,
            maintenanceType: OperationMaintenanceType.SEMIANNUAL,
            title: 'Inspecionar filtros',
            active: true,
            createdAt: new Date('2026-07-15T12:00:00.000Z'),
            updatedAt: new Date('2026-07-15T12:00:00.000Z'),
          },
        ],
        1,
      ]),
    };
    const service = new MaintenanceChecklistTemplatesService(prisma as never);

    const result = await service.list({
      page: 2,
      limit: 10,
      maintenanceType: OperationMaintenanceType.SEMIANNUAL,
      active: true,
    });

    const findMany = prisma.technicalCatalog.findMany.mock.calls[0]?.[0] as {
      where: {
        organizationId: string;
        type: TechnicalCatalogType;
        maintenanceType: OperationMaintenanceType;
        active: boolean;
        deletedAt: null;
      };
      skip: number;
      take: number;
    };
    expect(findMany.where).toMatchObject({
      organizationId,
      type: TechnicalCatalogType.CHECKLIST,
      maintenanceType: OperationMaintenanceType.SEMIANNUAL,
      active: true,
      deletedAt: null,
    });
    expect(findMany.skip).toBe(10);
    expect(findMany.take).toBe(10);
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'template-1',
          description: 'Inspecionar filtros',
          maintenanceType: OperationMaintenanceType.SEMIANNUAL,
        }),
      ],
      pagination: { page: 2, limit: 10, total: 1, totalPages: 1 },
    });
  });

  it('creates a sanitized item and its audit event in one transaction', async () => {
    const tx = {
      technicalCatalog: {
        create: jest.fn().mockResolvedValue({
          id: '33333333-3333-4333-8333-333333333333',
          organizationId,
          type: TechnicalCatalogType.CHECKLIST,
          maintenanceType: OperationMaintenanceType.WEEKLY,
          title: 'Verificar filtros',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId }) },
      technicalCatalog: {
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 2 } }),
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    const service = new MaintenanceChecklistTemplatesService(prisma as never);

    await service.create(
      {
        maintenanceType: OperationMaintenanceType.WEEKLY,
        description: '  Verificar\u0000   filtros  ',
      },
      actor,
      context,
    );

    const createCalls = tx.technicalCatalog.create.mock.calls as unknown as Array<
      [
        {
          data: {
            organizationId: string;
            type: TechnicalCatalogType;
            title: string;
            active: boolean;
          };
        },
      ]
    >;
    const createCall = createCalls[0][0];
    expect(createCall.data).toMatchObject({
      organizationId,
      type: TechnicalCatalogType.CHECKLIST,
      title: 'Verificar filtros',
      active: true,
    });
    const auditCalls = tx.auditLog.create.mock.calls as unknown as Array<
      [{ data: { action: string; actor: string; resource: string } }]
    >;
    const auditCall = auditCalls[0][0];
    expect(auditCall.data).toMatchObject({
      action: 'MAINTENANCE_CHECKLIST_TEMPLATE_CREATED',
      actor: actor.id,
      resource: 'MAINTENANCE_CHECKLIST_TEMPLATE',
    });
  });

  it('soft-deactivates catalog items instead of deleting them', async () => {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId }) },
      technicalCatalog: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'template-1',
          type: TechnicalCatalogType.CHECKLIST,
        }),
        update: jest.fn((args: unknown) => ({ kind: 'update', args })),
      },
      auditLog: { create: jest.fn((args: unknown) => ({ kind: 'audit', args })) },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const service = new MaintenanceChecklistTemplatesService(prisma as never);

    await expect(
      service.deactivate('33333333-3333-4333-8333-333333333333', actor, context),
    ).resolves.toEqual({
      deactivated: true,
    });

    const update = prisma.technicalCatalog.update.mock.calls[0]?.[0] as {
      data: { active: boolean };
    };
    expect(update.data.active).toBe(false);
  });
});
