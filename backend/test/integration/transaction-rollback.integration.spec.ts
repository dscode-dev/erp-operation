import { BudgetStatus, StockMovementType } from '@prisma/client';
import { LifecyclePublisher } from '../../src/modules/asset-lifecycle/lifecycle-publisher.service';
import { BudgetsService } from '../../src/modules/budgets/budgets.service';
import { InventoryService } from '../../src/modules/inventory/inventory.service';
import { ProcurementService } from '../../src/modules/procurement/procurement.service';
import {
  context,
  createActor,
  createBudgetFixture,
  createOperation,
  createOrganization,
  createProductWithInventory,
  createSupplierProductPurchase,
  disconnectDatabase,
  prisma,
  resetDatabase,
} from './helpers';

class ThrowingInventoryService extends InventoryService {
  override createMovementInTransaction(): Promise<never> {
    throw new Error('forced inventory rollback');
  }
}

class ThrowingLifecyclePublisher extends LifecyclePublisher {
  override publishPartReplacementTx(): Promise<never> {
    throw new Error('forced lifecycle rollback');
  }

  override publishBudgetEventTx(): Promise<never> {
    throw new Error('forced budget rollback');
  }
}

describe('cross-domain transaction rollback with real PostgreSQL', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('Procurement receipt rollback reverts receipt, quantities, stock, history and audit', async () => {
    const actor = await createActor();
    const org = await createOrganization();
    const lifecycle = new LifecyclePublisher(prisma as never);
    const procurement = new ProcurementService(
      prisma as never,
      new ThrowingInventoryService(prisma as never, lifecycle),
      lifecycle,
    );
    const purchase = await createSupplierProductPurchase(actor, org.id, 10);

    await expect(procurement.receive(purchase.orderId, { items: [{ itemId: purchase.itemId, quantity: 5 }] }, actor, context)).rejects.toThrow('forced inventory rollback');

    const [item, order, receipts, movements, history, audits] = await Promise.all([
      prisma.purchaseOrderItem.findUniqueOrThrow({ where: { id: purchase.itemId } }),
      prisma.purchaseOrder.findUniqueOrThrow({ where: { id: purchase.orderId } }),
      prisma.purchaseReceipt.count({ where: { purchaseOrderId: purchase.orderId } }),
      prisma.stockMovement.count({ where: { type: StockMovementType.IN } }),
      prisma.purchaseHistory.count({ where: { purchaseOrderId: purchase.orderId } }),
      prisma.auditLog.count({ where: { action: 'PURCHASE_RECEIPT_CREATED' } }),
    ]);
    expect(item.receivedQuantity.toString()).toBe('0');
    expect(order.status).toBe('SENT');
    expect(receipts).toBe(0);
    expect(movements).toBe(0);
    expect(history).toBe(0);
    expect(audits).toBe(0);
  });

  it('Inventory material consumption rollback reverts part, movement, balance, audit and lifecycle', async () => {
    const actor = await createActor();
    const org = await createOrganization();
    const operation = await createOperation(actor);
    const item = await createProductWithInventory(org.id, 10);
    const inventory = new InventoryService(prisma as never, new ThrowingLifecyclePublisher(prisma as never));

    await expect(inventory.consumeMaterial(operation.id, { productId: item.productId, inventoryItemId: item.inventoryItemId, quantity: 3 }, actor, context)).rejects.toThrow('forced lifecycle rollback');

    const [inventoryItem, parts, movements, audits, events] = await Promise.all([
      prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.inventoryItemId } }),
      prisma.operationPart.count({ where: { operationId: operation.id } }),
      prisma.stockMovement.count({ where: { inventoryItemId: item.inventoryItemId } }),
      prisma.auditLog.count({ where: { action: 'OPERATION_MATERIAL_CONSUMED' } }),
      prisma.assetLifecycleEvent.count(),
    ]);
    expect(inventoryItem.currentQuantity.toString()).toBe('10');
    expect(inventoryItem.availableQuantity.toString()).toBe('10');
    expect(parts).toBe(0);
    expect(movements).toBe(0);
    expect(audits).toBe(0);
    expect(events).toBe(0);
  });

  it('Budget approval rollback reverts status, approval, history, audit and lifecycle', async () => {
    const actor = await createActor();
    const fixture = await createBudgetFixture(actor);
    const budgets = new BudgetsService(
      prisma as never,
      new ThrowingLifecyclePublisher(prisma as never),
      { notifyBudgetDecisionTx: jest.fn() } as never,
    );

    await expect(budgets.approve(fixture.budgetId, {}, actor, context)).rejects.toThrow('forced budget rollback');

    const [budget, approvals, history, audits, events] = await Promise.all([
      prisma.budget.findUniqueOrThrow({ where: { id: fixture.budgetId } }),
      prisma.budgetApproval.count({ where: { budgetId: fixture.budgetId } }),
      prisma.budgetHistory.count({ where: { budgetId: fixture.budgetId, action: 'APPROVED' } }),
      prisma.auditLog.count({ where: { action: 'BUDGET_APPROVED' } }),
      prisma.assetLifecycleEvent.count(),
    ]);
    expect(budget.status).toBe(BudgetStatus.PENDING);
    expect(approvals).toBe(0);
    expect(history).toBe(0);
    expect(audits).toBe(0);
    expect(events).toBe(0);
  });
});
