import {
  AssignmentStatus,
  AssetLifecycleEventType,
  BudgetStatus,
  FinancialEntryStatus,
  FinancialEntryType,
  MaintenanceExecutionStatus,
  Prisma,
  Role,
  StockMovementType,
} from '@prisma/client';
import { AssignmentsService } from '../../src/modules/assignments/assignments.service';
import { LifecyclePublisher } from '../../src/modules/asset-lifecycle/lifecycle-publisher.service';
import { BudgetsService } from '../../src/modules/budgets/budgets.service';
import { FinancialService } from '../../src/modules/financial/financial.service';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { MaintenancePlanningService } from '../../src/modules/maintenance-planning/maintenance-planning.service';
import { RecurrenceFrequency } from '../../src/modules/maintenance-planning/dto/maintenance-planning.dto';
import { RecurringEngine } from '../../src/modules/maintenance-planning/recurring-engine.service';
import { PricingService } from '../../src/modules/pricing/pricing.service';
import { ProcurementService } from '../../src/modules/procurement/procurement.service';
import {
  context,
  createActor,
  createBudgetFixture,
  createDocumentEngine,
  createFinancialEntryFixture,
  createMaintenanceFixture,
  createOperation,
  createOrganization,
  createPricingFixture,
  createProductWithInventory,
  createSupplierProductPurchase,
  decimal,
  disconnectDatabase,
  prisma,
  resetDatabase,
  settledFailures,
  settledSuccesses,
} from '../integration/helpers';

function services(): {
  lifecycle: LifecyclePublisher;
  recurrence: RecurringEngine;
  maintenance: MaintenancePlanningService;
  inventory: InventoryService;
  financial: FinancialService;
  procurement: ProcurementService;
  assignments: AssignmentsService;
  pricing: PricingService;
  budgets: BudgetsService;
} {
  const lifecycle = new LifecyclePublisher(prisma as never);
  const recurrence = new RecurringEngine();
  const maintenance = new MaintenancePlanningService(prisma as never, recurrence, lifecycle);
  const inventory = new InventoryService(prisma as never, lifecycle);
  return {
    lifecycle,
    recurrence,
    maintenance,
    inventory,
    financial: new FinancialService(prisma as never, lifecycle),
    procurement: new ProcurementService(prisma as never, inventory, lifecycle),
    assignments: new AssignmentsService(prisma as never, lifecycle, maintenance, {
      notifyAssignmentAssignedTx: jest.fn(),
      notifyAssignmentStartedTx: jest.fn(),
      notifyAssignmentCompletedTx: jest.fn(),
    } as never),
    pricing: new PricingService(prisma as never),
    budgets: new BudgetsService(prisma as never, new PricingService(prisma as never), lifecycle, {
      notifyBudgetDecisionTx: jest.fn(),
    } as never),
  };
}

describe('critical workflows with real PostgreSQL concurrency', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('Financial: concurrent double payment commits once and applies balance once', async () => {
    const actor = await createActor();
    const { financial } = services();
    const fixture = await createFinancialEntryFixture(actor, 100);

    const results = await Promise.allSettled([
      financial.payEntry(fixture.entryId, {}, actor, context),
      financial.payEntry(fixture.entryId, {}, actor, context),
    ]);

    expect(settledSuccesses(results).length).toBe(1);
    expect(settledFailures(results).length).toBe(1);

    const [entry, account, history, audit] = await Promise.all([
      prisma.financialEntry.findUniqueOrThrow({ where: { id: fixture.entryId } }),
      prisma.financialAccount.findUniqueOrThrow({ where: { id: fixture.accountId } }),
      prisma.financialHistory.count({ where: { entryId: fixture.entryId, action: 'PAID' } }),
      prisma.auditLog.count({ where: { action: 'FINANCIAL_ENTRY_PAID' } }),
    ]);
    expect(entry.status).toBe(FinancialEntryStatus.PAID);
    expect(decimal(account.currentBalance)).toBe('100.00');
    expect(history).toBe(1);
    expect(audit).toBe(1);
  });

  it('Financial: payment/cancel race leaves one coherent terminal state', async () => {
    const actor = await createActor();
    const { financial } = services();
    const fixture = await createFinancialEntryFixture(actor, 75);

    await Promise.allSettled([
      financial.payEntry(fixture.entryId, {}, actor, context),
      financial.cancelEntry(fixture.entryId, { reason: 'race' }, actor, context),
    ]);

    const [entry, account, paidHistory, canceledHistory] = await Promise.all([
      prisma.financialEntry.findUniqueOrThrow({ where: { id: fixture.entryId } }),
      prisma.financialAccount.findUniqueOrThrow({ where: { id: fixture.accountId } }),
      prisma.financialHistory.count({ where: { entryId: fixture.entryId, action: 'PAID' } }),
      prisma.financialHistory.count({ where: { entryId: fixture.entryId, action: 'CANCELED' } }),
    ]);
    expect([FinancialEntryStatus.PAID, FinancialEntryStatus.CANCELED]).toContain(entry.status);
    expect(paidHistory + canceledHistory).toBe(1);
    expect(decimal(account.currentBalance)).toBe(entry.status === FinancialEntryStatus.PAID ? '75.00' : '0.00');
  });

  it('Financial: independent concurrent payments to same account use exact atomic Decimal arithmetic', async () => {
    const actor = await createActor();
    const { financial } = services();
    const fixture = await createFinancialEntryFixture(actor, 10.25);
    const category = await prisma.financialCategory.findUniqueOrThrow({ where: { id: fixture.categoryId } });
    const entries = await Promise.all(
      [20.1, 30.65].map((amount) =>
        prisma.financialEntry.create({
          data: {
            organizationId: category.organizationId,
            accountId: fixture.accountId,
            categoryId: fixture.categoryId,
            type: FinancialEntryType.RECEIVABLE,
            amount,
            dueDate: new Date(),
            description: `entry ${amount}`,
            createdBy: actor.id,
          },
        }),
      ),
    );

    const results = await Promise.allSettled([
      financial.payEntry(fixture.entryId, {}, actor, context),
      ...entries.map((entry) => financial.payEntry(entry.id, {}, actor, context)),
    ]);

    expect(settledFailures(results)).toEqual([]);
    const account = await prisma.financialAccount.findUniqueOrThrow({ where: { id: fixture.accountId } });
    expect(decimal(account.currentBalance)).toBe('61.00');
  });

  it('Inventory: concurrent overspend cannot make stock negative', async () => {
    const actor = await createActor();
    const org = await createOrganization();
    const operation = await createOperation(actor);
    const { inventory } = services();
    const item = await createProductWithInventory(org.id, 10);

    const results = await Promise.allSettled([
      inventory.consumeMaterial(operation.id, { productId: item.productId, inventoryItemId: item.inventoryItemId, quantity: 7 }, actor, context),
      inventory.consumeMaterial(operation.id, { productId: item.productId, inventoryItemId: item.inventoryItemId, quantity: 6 }, actor, context),
    ]);

    expect(settledSuccesses(results).length).toBe(1);
    const inventoryItem = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.inventoryItemId } });
    const movements = await prisma.stockMovement.count({ where: { inventoryItemId: item.inventoryItemId, type: StockMovementType.CONSUMPTION } });
    const parts = await prisma.operationPart.count({ where: { inventoryItemId: item.inventoryItemId, deletedAt: null } });
    expect(new Prisma.Decimal(inventoryItem.currentQuantity).gte(0)).toBe(true);
    expect(inventoryItem.availableQuantity.toString()).toBe(new Prisma.Decimal(inventoryItem.currentQuantity).minus(inventoryItem.reservedQuantity).toString());
    expect(movements).toBe(1);
    expect(parts).toBe(1);
  });

  it('Inventory: duplicate return restores stock only once', async () => {
    const actor = await createActor();
    const org = await createOrganization();
    const operation = await createOperation(actor);
    const { inventory } = services();
    const item = await createProductWithInventory(org.id, 10);
    const consumed = (await inventory.consumeMaterial(
      operation.id,
      { productId: item.productId, inventoryItemId: item.inventoryItemId, quantity: 4 },
      actor,
      context,
    )) as { id: string };

    const results = await Promise.allSettled([
      inventory.deleteOperationMaterial(operation.id, consumed.id, actor, context),
      inventory.deleteOperationMaterial(operation.id, consumed.id, actor, context),
    ]);

    expect(settledSuccesses(results).length).toBe(1);
    const inventoryItem = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.inventoryItemId } });
    const returns = await prisma.stockMovement.count({ where: { inventoryItemId: item.inventoryItemId, type: StockMovementType.RETURN } });
    expect(inventoryItem.currentQuantity.toString()).toBe('10');
    expect(returns).toBe(1);
  });

  it('Procurement: concurrent over-receipt cannot exceed purchased quantity', async () => {
    const actor = await createActor();
    const org = await createOrganization();
    const { procurement } = services();
    const purchase = await createSupplierProductPurchase(actor, org.id, 10);

    const results = await Promise.allSettled([
      procurement.receive(purchase.orderId, { items: [{ itemId: purchase.itemId, quantity: 7 }] }, actor, context),
      procurement.receive(purchase.orderId, { items: [{ itemId: purchase.itemId, quantity: 6 }] }, actor, context),
    ]);

    expect(settledSuccesses(results).length).toBe(1);
    const [item, receiptCount, movementCount] = await Promise.all([
      prisma.purchaseOrderItem.findUniqueOrThrow({ where: { id: purchase.itemId } }),
      prisma.purchaseReceipt.count({ where: { purchaseOrderId: purchase.orderId } }),
      prisma.stockMovement.count({ where: { inventoryItem: { productId: purchase.productId }, type: StockMovementType.IN } }),
    ]);
    expect(new Prisma.Decimal(item.receivedQuantity).lte(item.quantity)).toBe(true);
    expect(receiptCount).toBe(1);
    expect(movementCount).toBe(1);
  });

  it('Assignment: reassign versus accept never authorizes stale operator as final assignee', async () => {
    const manager = await createActor(Role.MANAGER, 'manager');
    const operatorA = await createActor(Role.OPERATOR, 'op-a');
    const operatorB = await createActor(Role.OPERATOR, 'op-b');
    const operation = await createOperation(operatorA);
    const { assignments } = services();
    const assignment = await assignments.create({ operationId: operation.id, assignedTo: operatorA.id }, manager, context);

    await Promise.allSettled([
      assignments.reassign(assignment.id, { assignedTo: operatorB.id }, manager, context),
      assignments.accept(assignment.id, operatorA, context),
    ]);

    const final = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    if (final.assignedTo === operatorB.id) {
      expect(final.status).toBe(AssignmentStatus.ASSIGNED);
    } else {
      expect(final.assignedTo).toBe(operatorA.id);
      expect(final.status).toBe(AssignmentStatus.ACCEPTED);
    }
  });

  it('Assignment: reassign versus start leaves coherent state and no stale started assignee', async () => {
    const manager = await createActor(Role.MANAGER, 'manager');
    const operatorA = await createActor(Role.OPERATOR, 'op-a');
    const operatorB = await createActor(Role.OPERATOR, 'op-b');
    const operation = await createOperation(operatorA);
    const { assignments } = services();
    const assignment = await assignments.create({ operationId: operation.id, assignedTo: operatorA.id }, manager, context);
    await assignments.accept(assignment.id, operatorA, context);

    await Promise.allSettled([
      assignments.reassign(assignment.id, { assignedTo: operatorB.id }, manager, context),
      assignments.start(assignment.id, operatorA, context),
    ]);

    const final = await prisma.assignment.findUniqueOrThrow({ where: { id: assignment.id } });
    if (final.assignedTo === operatorB.id) {
      expect(final.status).toBe(AssignmentStatus.ASSIGNED);
      expect(final.startedAt).toBeNull();
    } else {
      expect(final.assignedTo).toBe(operatorA.id);
      expect(final.status).toBe(AssignmentStatus.STARTED);
      expect(final.startedAt).toBeTruthy();
    }
  });

  it('Assignment: duplicate start appends one STARTED history and synchronizes Operation once', async () => {
    const manager = await createActor(Role.MANAGER, 'manager');
    const operator = await createActor(Role.OPERATOR, 'op');
    const operation = await createOperation(operator);
    const { assignments } = services();
    const assignment = await assignments.create({ operationId: operation.id, assignedTo: operator.id }, manager, context);
    await assignments.accept(assignment.id, operator, context);

    const results = await Promise.allSettled([
      assignments.start(assignment.id, operator, context),
      assignments.start(assignment.id, operator, context),
    ]);

    expect(settledSuccesses(results).length).toBe(1);
    expect(await prisma.assignmentHistory.count({ where: { assignmentId: assignment.id, event: 'STARTED' } })).toBe(1);
    const finalOperation = await prisma.operation.findUniqueOrThrow({ where: { id: operation.id } });
    expect(finalOperation.status).toBe('IN_PROGRESS');
    expect(finalOperation.startedAt).toBeTruthy();
  });

  it('Assignment: duplicate complete completes Operation and Maintenance once', async () => {
    const manager = await createActor(Role.MANAGER, 'manager');
    const operator = await createActor(Role.OPERATOR, 'op');
    const fixture = await createMaintenanceFixture(operator);
    const { assignments } = services();
    const assignment = await assignments.create({ operationId: fixture.operationId, assignedTo: operator.id }, manager, context);
    await assignments.accept(assignment.id, operator, context);
    await assignments.start(assignment.id, operator, context);

    const results = await Promise.allSettled([
      assignments.complete(assignment.id, {}, operator, context),
      assignments.complete(assignment.id, {}, operator, context),
    ]);

    expect(settledSuccesses(results).length).toBe(1);
    expect(await prisma.assignmentHistory.count({ where: { assignmentId: assignment.id, event: 'COMPLETED' } })).toBe(1);
    const execution = await prisma.maintenanceExecution.findUniqueOrThrow({ where: { id: fixture.executionId } });
    const plan = await prisma.maintenancePlan.findUniqueOrThrow({ where: { id: fixture.planId } });
    expect(execution.status).toBe(MaintenanceExecutionStatus.COMPLETED);
    expect(plan.lastExecution).toBeTruthy();
    expect(plan.nextExecution > plan.lastExecution!).toBe(true);
    expect(await prisma.assetLifecycleEvent.count({ where: { operationId: fixture.operationId, type: AssetLifecycleEventType.MAINTENANCE } })).toBe(1);
  });

  it('Budget: concurrent approvals for same budget produce one successful decision', async () => {
    const actor = await createActor();
    const { budgets } = services();
    const fixture = await createBudgetFixture(actor);

    const results = await Promise.allSettled([
      budgets.approve(fixture.budgetId, {}, actor, context),
      budgets.approve(fixture.budgetId, {}, actor, context),
    ]);

    expect(settledSuccesses(results).length).toBe(1);
    const [budget, approvals, history] = await Promise.all([
      prisma.budget.findUniqueOrThrow({ where: { id: fixture.budgetId } }),
      prisma.budgetApproval.count({ where: { budgetId: fixture.budgetId, status: BudgetStatus.APPROVED } }),
      prisma.budgetHistory.count({ where: { budgetId: fixture.budgetId, action: 'APPROVED' } }),
    ]);
    expect(budget.status).toBe(BudgetStatus.APPROVED);
    expect(approvals).toBe(1);
    expect(history).toBe(1);
  });

  it('Budget: database enforces at most one approved budget per operation', async () => {
    const actor = await createActor();
    const fixtureA = await createBudgetFixture(actor);
    const budgetA = await prisma.budget.findUniqueOrThrow({ where: { id: fixtureA.budgetId }, include: { items: true } });
    const budgetB = await prisma.budget.create({
      data: {
        organizationId: budgetA.organizationId,
        operationId: budgetA.operationId,
        customerId: budgetA.customerId,
        customerAddressId: budgetA.customerAddressId,
        equipmentId: budgetA.equipmentId,
        title: 'Budget B',
        status: BudgetStatus.PENDING,
        subtotal: 100,
        total: 100,
        expirationDate: new Date('2026-12-31T00:00:00.000Z'),
        createdBy: actor.id,
      },
    });
    const { budgets } = services();

    await Promise.allSettled([
      budgets.approve(budgetA.id, {}, actor, context),
      budgets.approve(budgetB.id, {}, actor, context),
    ]);

    const approved = await prisma.budget.count({ where: { operationId: budgetA.operationId, status: BudgetStatus.APPROVED } });
    expect(approved).toBe(1);
  });

  it('Budget: approve versus reject produces one terminal decision and matching history', async () => {
    const actor = await createActor();
    const { budgets } = services();
    const fixture = await createBudgetFixture(actor);

    await Promise.allSettled([
      budgets.approve(fixture.budgetId, {}, actor, context),
      budgets.reject(fixture.budgetId, { observation: 'reject race' }, actor, context),
    ]);

    const budget = await prisma.budget.findUniqueOrThrow({ where: { id: fixture.budgetId } });
    expect([BudgetStatus.APPROVED, BudgetStatus.REJECTED]).toContain(budget.status);
    const approvals = await prisma.budgetApproval.count({ where: { budgetId: fixture.budgetId } });
    const terminalHistory = await prisma.budgetHistory.count({ where: { budgetId: fixture.budgetId, action: { in: ['APPROVED', 'REJECTED'] } } });
    expect(approvals).toBe(1);
    expect(terminalHistory).toBe(1);
  });

  it('Budget: approve versus cancel produces one coherent terminal state', async () => {
    const actor = await createActor();
    const { budgets } = services();
    const fixture = await createBudgetFixture(actor);

    await Promise.allSettled([
      budgets.approve(fixture.budgetId, {}, actor, context),
      budgets.cancel(fixture.budgetId, actor, context),
    ]);

    const budget = await prisma.budget.findUniqueOrThrow({ where: { id: fixture.budgetId } });
    expect([BudgetStatus.APPROVED, BudgetStatus.CANCELED]).toContain(budget.status);
    const terminalHistory = await prisma.budgetHistory.count({ where: { budgetId: fixture.budgetId, action: { in: ['APPROVED', 'CANCELED'] } } });
    expect(terminalHistory).toBe(1);
    if (budget.status === BudgetStatus.CANCELED) {
      expect(await prisma.budgetApproval.count({ where: { budgetId: fixture.budgetId } })).toBe(0);
    }
  });

  it('Budget: snapshots remain stable after Pricing revision and blueprint uses snapshots', async () => {
    const actor = await createActor();
    const fixture = await createBudgetFixture(actor);
    const originalItem = await prisma.budgetItem.findFirstOrThrow({ where: { budgetId: fixture.budgetId } });
    const pricing = await prisma.productPricing.findFirstOrThrow({ where: { productId: fixture.productId, active: true } });
    const { pricing: pricingService } = services();
    await pricingService.createPricingRevision(
      pricing.id,
      { costPrice: 80, replacementCost: 85, averageCost: 80, salePrice: 160, minimumSalePrice: 130, suggestedSalePrice: 170, validFrom: '2026-06-01T00:00:00.000Z' },
      actor,
      context,
    );

    const item = await prisma.budgetItem.findUniqueOrThrow({ where: { id: originalItem.id } });
    expect(item.snapshotCost.toString()).toBe(originalItem.snapshotCost.toString());
    expect(item.snapshotSalePrice.toString()).toBe(originalItem.snapshotSalePrice.toString());
    expect(item.snapshotMargin.toString()).toBe(originalItem.snapshotMargin.toString());
    const { builder } = createDocumentEngine();
    const blueprint = await builder.buildBudget(fixture.budgetId);
    const itemsTable = blueprint.sections.find((section) => section.id === 'budget-items')?.components[0];
    expect(itemsTable?.kind).toBe('table');
    if (itemsTable?.kind === 'table') {
      expect(itemsTable.rows[0].unitPrice).toContain('100,00');
      expect(itemsTable.rows[0].margin).toBe('50,00%');
    }
  });

  it('Pricing: overlapping active periods are rejected by PostgreSQL exclusion constraint', async () => {
    const actor = await createActor();
    const org = await createOrganization();
    const { pricing } = services();
    const fixture = await createPricingFixture(org.id);

    const results = await Promise.allSettled([
      pricing.createProductPricing(
        fixture.productId,
        { costPrice: 10, replacementCost: 10, averageCost: 10, salePrice: 20, minimumSalePrice: 15, suggestedSalePrice: 22, validFrom: '2026-01-01T00:00:00.000Z' },
        actor,
        context,
      ),
      pricing.createProductPricing(
        fixture.productId,
        { costPrice: 12, replacementCost: 12, averageCost: 12, salePrice: 24, minimumSalePrice: 18, suggestedSalePrice: 26, validFrom: '2026-06-01T00:00:00.000Z' },
        actor,
        context,
      ),
    ]);

    expect(settledSuccesses(results).length).toBe(1);
    const count = await prisma.productPricing.count({ where: { productId: fixture.productId, active: true } });
    expect(count).toBe(1);
  });

  it('Pricing: adjacent half-open periods are valid and open-ended overlap is rejected', async () => {
    const actor = await createActor();
    const org = await createOrganization();
    const { pricing } = services();
    const fixture = await createPricingFixture(org.id);

    await pricing.createProductPricing(
      fixture.productId,
      { costPrice: 10, replacementCost: 10, averageCost: 10, salePrice: 20, minimumSalePrice: 15, suggestedSalePrice: 22, validFrom: '2026-01-01T00:00:00.000Z', validUntil: '2026-06-01T00:00:00.000Z' },
      actor,
      context,
    );
    await expect(pricing.createProductPricing(
      fixture.productId,
      { costPrice: 11, replacementCost: 11, averageCost: 11, salePrice: 22, minimumSalePrice: 16, suggestedSalePrice: 24, validFrom: '2026-06-01T00:00:00.000Z', validUntil: '2026-12-01T00:00:00.000Z' },
      actor,
      context,
    )).resolves.toBeTruthy();

    await expect(pricing.createProductPricing(
      fixture.productId,
      { costPrice: 12, replacementCost: 12, averageCost: 12, salePrice: 24, minimumSalePrice: 18, suggestedSalePrice: 26, validFrom: '2026-11-01T00:00:00.000Z' },
      actor,
      context,
    )).rejects.toMatchObject({ code: 'PRICING_OVERLAP' });
  });

  it('Pricing: concurrent revision leaves one active current price and stable conflict for loser', async () => {
    const actor = await createActor();
    const org = await createOrganization();
    const { pricing } = services();
    const fixture = await createPricingFixture(org.id);
    const current = await pricing.createProductPricing(
      fixture.productId,
      { costPrice: 10, replacementCost: 10, averageCost: 10, salePrice: 20, minimumSalePrice: 15, suggestedSalePrice: 22, validFrom: '2026-01-01T00:00:00.000Z' },
      actor,
      context,
    );

    const results = await Promise.allSettled([
      pricing.createPricingRevision(current.id, { costPrice: 12, replacementCost: 12, averageCost: 12, salePrice: 24, minimumSalePrice: 18, suggestedSalePrice: 26, validFrom: '2026-06-01T00:00:00.000Z' }, actor, context),
      pricing.createPricingRevision(current.id, { costPrice: 13, replacementCost: 13, averageCost: 13, salePrice: 26, minimumSalePrice: 19, suggestedSalePrice: 28, validFrom: '2026-06-01T00:00:00.000Z' }, actor, context),
    ]);

    expect(settledSuccesses(results).length).toBe(1);
    const active = await prisma.productPricing.count({ where: { productId: fixture.productId, active: true } });
    expect(active).toBe(1);
    await expect(pricing.getProductPricing(fixture.productId, new Date('2026-07-01T00:00:00.000Z'))).resolves.toBeTruthy();
  });

  it('Maintenance recurrence covers month-end and leap-year boundaries according to current JS UTC semantics', () => {
    const { recurrence } = services();
    expect(recurrence.next({ frequency: RecurrenceFrequency.DAILY, interval: 1 }, new Date('2026-02-28T00:00:00.000Z')).toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(recurrence.next({ frequency: RecurrenceFrequency.WEEKLY, interval: 1 }, new Date('2026-02-22T00:00:00.000Z')).toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(recurrence.next({ frequency: RecurrenceFrequency.MONTHLY, interval: 1 }, new Date('2026-01-31T00:00:00.000Z')).toISOString()).toBe('2026-03-03T00:00:00.000Z');
    expect(recurrence.next({ frequency: RecurrenceFrequency.YEARLY, interval: 1 }, new Date('2024-02-29T00:00:00.000Z')).toISOString()).toBe('2025-03-01T00:00:00.000Z');
    expect(recurrence.next({ frequency: RecurrenceFrequency.INTERVAL_DAYS, interval: 30 }, new Date('2026-01-31T00:00:00.000Z')).toISOString()).toBe('2026-03-02T00:00:00.000Z');
    expect(recurrence.next({ frequency: RecurrenceFrequency.INTERVAL_MONTHS, interval: 2 }, new Date('2026-01-31T00:00:00.000Z')).toISOString()).toBe('2026-03-31T00:00:00.000Z');
  });
});
