import {
  OperationMaintenanceType,
  Role,
  TechnicalCatalogArea,
  TechnicalCatalogType,
  TechnicalCatalogWorkflow,
} from '@prisma/client';
import { TechnicalCatalogsController } from '../src/modules/technical-catalogs/technical-catalogs.controller';
import { TechnicalCatalogsService } from '../src/modules/technical-catalogs/technical-catalogs.service';
import { ROLES_KEY } from '../src/shared/constants/auth.constants';

const organizationId = '11111111-1111-4111-8111-111111111111';
const catalogId = '33333333-3333-4333-8333-333333333333';
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

describe('TechnicalCatalogsService', () => {
  it('keeps catalog mutations restricted to OWNER and MANAGER', () => {
    const mutationMethods = ['create', 'update', 'reorder', 'remove'] as const;
    for (const method of mutationMethods) {
      const handler = TechnicalCatalogsController.prototype[method];
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([Role.OWNER, Role.MANAGER]);
    }
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const listHandler = TechnicalCatalogsController.prototype.list;
    expect(Reflect.getMetadata(ROLES_KEY, listHandler)).toEqual([
      Role.OWNER,
      Role.MANAGER,
      Role.OPERATOR,
      Role.VIEWER,
    ]);
  });

  it('scopes searchable catalog queries to the installation organization', async () => {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId }) },
      technicalCatalog: {
        findMany: jest.fn((args: unknown) => ({ operation: 'findMany', args })),
        count: jest.fn((args: unknown) => ({ operation: 'count', args })),
      },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };
    const service = new TechnicalCatalogsService(prisma as never);

    await service.list({
      page: 1,
      limit: 20,
      search: 'compressor',
      type: TechnicalCatalogType.SITE_CONDITION,
      active: true,
      sortBy: 'sortOrder',
      order: 'asc',
    });

    const listArgs = prisma.technicalCatalog.findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
      skip: number;
      take: number;
    };
    expect(listArgs.where).toMatchObject({
      organizationId,
      type: TechnicalCatalogType.SITE_CONDITION,
      active: true,
      deletedAt: null,
    });
    expect(listArgs.skip).toBe(0);
    expect(listArgs.take).toBe(20);
  });

  it('filters context on the server and includes GENERAL applicability when requested', async () => {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId }) },
      technicalCatalog: {
        findMany: jest.fn((args: unknown) => ({ operation: 'findMany', args })),
        count: jest.fn((args: unknown) => ({ operation: 'count', args })),
      },
      $transaction: jest.fn().mockResolvedValue([[], 0]),
    };
    const service = new TechnicalCatalogsService(prisma as never);

    await service.list({
      page: 1,
      limit: 100,
      type: TechnicalCatalogType.RECOMMENDATION,
      areas: [TechnicalCatalogArea.HVAC],
      workflow: TechnicalCatalogWorkflow.TECHNICAL_OPINION,
      includeGeneral: true,
      active: true,
      sortBy: 'sortOrder',
      order: 'asc',
    });

    const args = prisma.technicalCatalog.findMany.mock.calls[0]?.[0] as {
      where: { organizationId: string; AND: unknown[] };
    };
    expect(args.where.organizationId).toBe(organizationId);
    expect(args.where.AND).toEqual([
      {
        OR: [
          { areas: { hasSome: [TechnicalCatalogArea.HVAC] } },
          { areas: { has: TechnicalCatalogArea.GENERAL } },
        ],
      },
      {
        OR: [
          { workflows: { has: TechnicalCatalogWorkflow.TECHNICAL_OPINION } },
          { workflows: { has: TechnicalCatalogWorkflow.GENERAL } },
        ],
      },
    ]);
  });

  it('creates sanitized catalog content and audit in one transaction', async () => {
    const created = {
      id: catalogId,
      organizationId,
      type: TechnicalCatalogType.OBJECTIVE,
      title: 'Inspeção preventiva',
      description: null,
      maintenanceType: null,
      sortOrder: 3,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tx = {
      technicalCatalog: { create: jest.fn().mockResolvedValue(created) },
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
    const service = new TechnicalCatalogsService(prisma as never);

    await service.create(
      { type: TechnicalCatalogType.OBJECTIVE, title: '  Inspeção\u0000   preventiva  ' },
      actor,
      context,
    );

    const createCalls = tx.technicalCatalog.create.mock.calls as unknown as Array<
      [{ data: Record<string, unknown> }]
    >;
    const createArgs = createCalls[0][0];
    expect(createArgs.data).toMatchObject({
      organizationId,
      type: TechnicalCatalogType.OBJECTIVE,
      title: 'Inspeção preventiva',
      sortOrder: 3,
      tags: [],
      areas: [TechnicalCatalogArea.GENERAL],
      workflows: [TechnicalCatalogWorkflow.GENERAL],
    });
    const auditCalls = tx.auditLog.create.mock.calls as unknown as Array<
      [{ data: Record<string, unknown> }]
    >;
    const auditArgs = auditCalls[0][0];
    expect(auditArgs.data).toMatchObject({
      action: 'TECHNICAL_CATALOG_CREATED',
      resource: 'TECHNICAL_CATALOG',
      actor: actor.id,
    });
  });

  it('normalizes and deduplicates tags while retaining explicit applicability', async () => {
    const created = {
      id: catalogId,
      organizationId,
      type: TechnicalCatalogType.SITE_CONDITION,
      title: 'Falha elétrica',
      description: null,
      tags: ['eletrica', 'seguranca'],
      areas: [TechnicalCatalogArea.ELECTRICAL],
      workflows: [TechnicalCatalogWorkflow.WORK_ORDER],
      maintenanceType: null,
      sortOrder: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tx = {
      technicalCatalog: { create: jest.fn().mockResolvedValue(created) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId }) },
      technicalCatalog: { aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: null } }) },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    };
    const service = new TechnicalCatalogsService(prisma as never);

    await service.create(
      {
        type: TechnicalCatalogType.SITE_CONDITION,
        title: 'Falha elétrica',
        tags: [' Elétrica ', 'eletrica', 'Segurança'],
        areas: [TechnicalCatalogArea.ELECTRICAL],
        workflows: [TechnicalCatalogWorkflow.WORK_ORDER],
      },
      actor,
      context,
    );

    const createCalls = tx.technicalCatalog.create.mock.calls as unknown as Array<
      [{ data: Record<string, unknown> }]
    >;
    expect(createCalls[0][0].data).toMatchObject({
      tags: ['eletrica', 'seguranca'],
      areas: [TechnicalCatalogArea.ELECTRICAL],
      workflows: [TechnicalCatalogWorkflow.WORK_ORDER],
    });
  });

  it('rejects checklist records without their maintenance classification', async () => {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId }) },
    };
    const service = new TechnicalCatalogsService(prisma as never);

    await expect(
      service.create(
        { type: TechnicalCatalogType.CHECKLIST, title: 'Verificar pressão' },
        actor,
        context,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects cross-type or cross-organization reorder requests', async () => {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId }) },
      technicalCatalog: { count: jest.fn().mockResolvedValue(0) },
    };
    const service = new TechnicalCatalogsService(prisma as never);

    await expect(
      service.reorder(
        {
          type: TechnicalCatalogType.CONCLUSION,
          items: [{ id: catalogId, sortOrder: 0 }],
        },
        actor,
        context,
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('soft-deletes catalog entries and records the action', async () => {
    const existing = {
      id: catalogId,
      organizationId,
      type: TechnicalCatalogType.RECOMMENDATION,
      title: 'Monitoramento periódico',
      description: null,
      maintenanceType: null,
      sortOrder: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId }) },
      technicalCatalog: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn((args: unknown) => ({ operation: 'update', args })),
      },
      auditLog: { create: jest.fn((args: unknown) => ({ operation: 'audit', args })) },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const service = new TechnicalCatalogsService(prisma as never);

    await expect(service.remove(catalogId, actor, context)).resolves.toEqual({ deleted: true });
    const updateArgs = prisma.technicalCatalog.update.mock.calls[0]?.[0] as {
      where: { id: string };
      data: { active: boolean; deletedAt: Date };
    };
    expect(updateArgs.where).toEqual({ id: catalogId });
    expect(updateArgs.data.active).toBe(false);
    expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);
  });

  it('activates or deactivates an existing entry through the audited update path', async () => {
    const existing = {
      id: catalogId,
      organizationId,
      type: TechnicalCatalogType.CONCLUSION,
      title: 'Necessita nova inspeção',
      description: null,
      maintenanceType: null,
      sortOrder: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updated = { ...existing, active: false };
    const tx = {
      technicalCatalog: { update: jest.fn().mockResolvedValue(updated) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId }) },
      technicalCatalog: { findFirst: jest.fn().mockResolvedValue(existing) },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    const service = new TechnicalCatalogsService(prisma as never);

    await expect(service.update(catalogId, { active: false }, actor, context)).resolves.toEqual(
      updated,
    );
    const updateCalls = tx.technicalCatalog.update.mock.calls as unknown as Array<
      [{ data: { active: boolean } }]
    >;
    expect(updateCalls[0][0].data.active).toBe(false);
    const auditCalls = tx.auditLog.create.mock.calls as unknown as Array<
      [{ data: { action: string } }]
    >;
    expect(auditCalls[0][0].data.action).toBe('TECHNICAL_CATALOG_UPDATED');
  });

  it('accepts maintenance classification for checklist records', async () => {
    const created = {
      id: catalogId,
      organizationId,
      type: TechnicalCatalogType.CHECKLIST,
      title: 'Limpar filtros',
      description: null,
      maintenanceType: OperationMaintenanceType.WEEKLY,
      sortOrder: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const tx = {
      technicalCatalog: { create: jest.fn().mockResolvedValue(created) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: organizationId }) },
      technicalCatalog: { aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: null } }) },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    };
    const service = new TechnicalCatalogsService(prisma as never);

    await expect(
      service.create(
        {
          type: TechnicalCatalogType.CHECKLIST,
          title: 'Limpar filtros',
          maintenanceType: OperationMaintenanceType.WEEKLY,
        },
        actor,
        context,
      ),
    ).resolves.toEqual(created);
  });
});
