import { BudgetStatus, OperationMaintenanceType } from '@prisma/client';
import {
  createActor,
  createBudgetFixture,
  createOperation,
  createOrganization,
  createPricingFixture,
  createProductWithInventory,
  disconnectDatabase,
  prisma,
  resetDatabase,
} from './helpers';

describe('database integrity constraints with real PostgreSQL', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('enforces one approved Budget per Operation through partial unique index', async () => {
    const actor = await createActor();
    const first = await createBudgetFixture(actor);
    const budget = await prisma.budget.findUniqueOrThrow({ where: { id: first.budgetId } });
    await prisma.budget.update({
      where: { id: first.budgetId },
      data: { status: BudgetStatus.APPROVED },
    });

    await expect(
      prisma.budget.create({
        data: {
          organizationId: budget.organizationId,
          operationId: budget.operationId,
          customerId: budget.customerId,
          customerAddressId: budget.customerAddressId,
          equipmentId: budget.equipmentId,
          title: 'violating budget',
          introduction: 'Integrity verification',
          amountInWords: 'um real',
          status: BudgetStatus.APPROVED,
          subtotal: 1,
          total: 1,
          expirationDate: new Date('2026-12-31T00:00:00.000Z'),
          createdBy: actor.id,
        },
      }),
    ).rejects.toThrow();
  });

  it('enforces one active InventoryItem per organization/product/location including null location', async () => {
    const org = await createOrganization();
    const item = await createProductWithInventory(org.id, 0);

    await expect(
      prisma.inventoryItem.create({
        data: {
          organizationId: org.id,
          productId: item.productId,
          currentQuantity: 0,
          minimumQuantity: 0,
          idealQuantity: 0,
          reservedQuantity: 0,
          availableQuantity: 0,
          location: null,
          isActive: true,
        },
      }),
    ).rejects.toThrow();
  });

  it('enforces active ProductPricing non-overlap through exclusion constraint', async () => {
    const org = await createOrganization();
    const { productId } = await createPricingFixture(org.id);
    await prisma.productPricing.create({
      data: {
        organizationId: org.id,
        productId,
        costPrice: 10,
        replacementCost: 10,
        averageCost: 10,
        salePrice: 20,
        minimumSalePrice: 15,
        suggestedSalePrice: 22,
        marginPercentage: 50,
        validFrom: new Date('2026-01-01T00:00:00.000Z'),
        validUntil: new Date('2026-12-31T00:00:00.000Z'),
        active: true,
      },
    });

    await expect(
      prisma.productPricing.create({
        data: {
          organizationId: org.id,
          productId,
          costPrice: 11,
          replacementCost: 11,
          averageCost: 11,
          salePrice: 22,
          minimumSalePrice: 16,
          suggestedSalePrice: 24,
          marginPercentage: 50,
          validFrom: new Date('2026-06-01T00:00:00.000Z'),
          validUntil: new Date('2027-01-01T00:00:00.000Z'),
          active: true,
        },
      }),
    ).rejects.toThrow();
  });

  it('rolls back transactional writes on thrown failure', async () => {
    const org = await createOrganization();
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.financialAccount.create({
          data: {
            organizationId: org.id,
            name: 'rollback-account',
            type: 'BANK',
            openingBalance: 0,
            currentBalance: 0,
            active: true,
          },
        });
        await tx.auditLog.create({
          data: { action: 'ROLLBACK_TEST', resource: 'integration', actor: 'test', metadata: {} },
        });
        throw new Error('forced rollback');
      }),
    ).rejects.toThrow('forced rollback');

    await expect(prisma.financialAccount.count()).resolves.toBe(0);
    await expect(prisma.auditLog.count({ where: { action: 'ROLLBACK_TEST' } })).resolves.toBe(0);
  });

  it('persists the technical report reference period, typed checklist and equipment snapshot', async () => {
    const actor = await createActor();
    const operation = await createOperation(actor);

    await prisma.operation.update({
      where: { id: operation.id },
      data: {
        referenceMonth: 6,
        referenceYear: 2026,
        maintenanceType: OperationMaintenanceType.SEMIANNUAL,
        maintenanceChecklistItems: {
          create: {
            maintenanceType: OperationMaintenanceType.SEMIANNUAL,
            description: 'Higienizar filtros e verificar drenagem',
            executed: true,
            observations: 'Executado durante a visita',
            position: 0,
          },
        },
        inspectedEquipments: {
          create: {
            equipmentId: operation.equipmentId,
            position: 0,
            sector: 'Recepção',
            brandSnapshot: 'Orbit HVAC',
            modelSnapshot: 'Split 12000',
            capacitySnapshot: '12.000 BTU/h',
          },
        },
      },
    });

    const persisted = await prisma.operation.findUniqueOrThrow({
      where: { id: operation.id },
      include: { maintenanceChecklistItems: true, inspectedEquipments: true },
    });
    expect(persisted).toMatchObject({
      referenceMonth: 6,
      referenceYear: 2026,
      maintenanceType: OperationMaintenanceType.SEMIANNUAL,
    });
    expect(persisted.maintenanceChecklistItems).toHaveLength(1);
    expect(persisted.inspectedEquipments[0]).toMatchObject({
      sector: 'Recepção',
      brandSnapshot: 'Orbit HVAC',
      capacitySnapshot: '12.000 BTU/h',
    });

    await expect(
      prisma.$executeRaw`UPDATE "operations" SET "reference_year" = NULL WHERE "id" = ${operation.id}::uuid`,
    ).rejects.toThrow();
  });
});
