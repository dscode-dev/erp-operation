import { PurchaseOrderStatus, Role, StockMovementType } from '@prisma/client';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import {
  createOperation,
  createOrganization,
  createProductWithInventory,
  createSupplierProductPurchase,
  prisma,
} from '../integration/helpers';
import {
  authDelete,
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

describe('AppSec Inventory and Procurement deep abuse closure', () => {
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
    owner = await createSecurityActor(Role.OWNER, 'inv-owner');
    operator = await createSecurityActor(Role.OPERATOR, 'inv-operator');
    viewer = await createSecurityActor(Role.VIEWER, 'inv-viewer');
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('rejects inventory balance mass assignment and movement numeric abuse', async () => {
    const organization = await createOrganization();
    const item = await createProductWithInventory(organization.id, 5);

    const massAssignment = await authPatch(owner, `/api/v1/inventory/${item.inventoryItemId}`).send({
      currentQuantity: 999,
      availableQuantity: 999,
    });
    expect(massAssignment.status).toBe(400);
    expect(errorCode(massAssignment)).toBe(ERROR_CODES.VALIDATION_ERROR);

    for (const quantity of [0, -1, 1.1234]) {
      const response = await authPost(operator, '/api/v1/inventory/movements').send({
        inventoryItemId: item.inventoryItemId,
        quantity,
        type: StockMovementType.OUT,
        reason: 'abuse',
      });
      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe(ERROR_CODES.VALIDATION_ERROR);
    }

    const excessiveOut = await authPost(operator, '/api/v1/inventory/movements').send({
      inventoryItemId: item.inventoryItemId,
      quantity: 10,
      type: StockMovementType.OUT,
      reason: 'negative stock attempt',
    });
    expect(excessiveOut.status).toBe(409);
    expect(errorCode(excessiveOut)).toBe(ERROR_CODES.INVENTORY_NEGATIVE_STOCK);

    const fresh = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: item.inventoryItemId } });
    expect(Number(fresh.currentQuantity)).toBe(5);
    expect(Number(fresh.availableQuantity)).toBe(5);
    await expect(prisma.stockMovement.count()).resolves.toBe(0);
  });

  it('rejects operation material product mismatch, insufficient stock and wrong-parent deletion', async () => {
    const organization = await createOrganization();
    const opA = await createOperation(owner.user);
    const opB = await createOperation(owner.user);
    await prisma.assignment.create({
      data: {
        operationId: opA.id,
        assignedBy: owner.user.id,
        assignedTo: operator.user.id,
      },
    });
    const itemA = await createProductWithInventory(organization.id, 2);
    const itemB = await createProductWithInventory(organization.id, 2);

    const mismatch = await authPost(operator, `/api/v1/operations/${opA.id}/materials`).send({
      productId: itemA.productId,
      inventoryItemId: itemB.inventoryItemId,
      quantity: 1,
    });
    expect(mismatch.status).toBe(400);
    expect(errorCode(mismatch)).toBe(ERROR_CODES.INVENTORY_PRODUCT_MISMATCH);

    const insufficient = await authPost(operator, `/api/v1/operations/${opA.id}/materials`).send({
      productId: itemA.productId,
      inventoryItemId: itemA.inventoryItemId,
      quantity: 3,
    });
    expect(insufficient.status).toBe(409);
    expect(errorCode(insufficient)).toBe(ERROR_CODES.INVENTORY_NEGATIVE_STOCK);

    const created = await authPost(owner, `/api/v1/operations/${opA.id}/materials`).send({
      productId: itemA.productId,
      inventoryItemId: itemA.inventoryItemId,
      quantity: 1,
    });
    expect(created.status).toBe(201);
    const partId = (created.body as { data: { id: string } }).data.id;

    const wrongParent = await authDelete(owner, `/api/v1/operations/${opB.id}/materials/${partId}`);
    expect(wrongParent.status).toBe(404);
    await expect(prisma.operationPart.count({ where: { operationId: opA.id, deletedAt: null } })).resolves.toBe(1);
    await expect(prisma.stockMovement.count({ where: { type: StockMovementType.RETURN } })).resolves.toBe(0);

    expect((await authPost(viewer, `/api/v1/operations/${opA.id}/materials`).send({
      productId: itemA.productId,
      inventoryItemId: itemA.inventoryItemId,
      quantity: 1,
    })).status).toBe(403);
  });

  it('rejects Procurement mass assignment, invalid receipt payloads and preserves stock side effects', async () => {
    const organization = await createOrganization();
    const purchase = await createSupplierProductPurchase(owner.user, organization.id, 5);

    const itemInjection = await authPost(owner, `/api/v1/purchase-orders/${purchase.orderId}/items`).send({
      productId: purchase.productId,
      quantity: 1,
      unit: 'UN',
      snapshotCost: 10,
      snapshotDescription: 'Injected',
      receivedQuantity: 99,
    });
    expect(itemInjection.status).toBe(400);
    expect(errorCode(itemInjection)).toBe(ERROR_CODES.VALIDATION_ERROR);

    const statusInjection = await authPatch(owner, `/api/v1/purchase-orders/${purchase.orderId}`).send({
      status: PurchaseOrderStatus.RECEIVED,
    });
    expect(statusInjection.status).toBe(400);
    expect(errorCode(statusInjection)).toBe(ERROR_CODES.VALIDATION_ERROR);

    const duplicateLine = await authPost(owner, `/api/v1/purchase-orders/${purchase.orderId}/receipts`).send({
      items: [
        { itemId: purchase.itemId, quantity: 3 },
        { itemId: purchase.itemId, quantity: 3 },
      ],
    });
    expect(duplicateLine.status).toBe(404);
    expect(errorCode(duplicateLine)).toBe(ERROR_CODES.PURCHASE_ITEM_NOT_FOUND);
    await expect(prisma.purchaseReceipt.count()).resolves.toBe(0);
    await expect(prisma.stockMovement.count()).resolves.toBe(0);

    const overReceipt = await authPost(owner, `/api/v1/purchase-orders/${purchase.orderId}/receipts`).send({
      items: [{ itemId: purchase.itemId, quantity: 6 }],
    });
    expect(overReceipt.status).toBe(409);
    expect(errorCode(overReceipt)).toBe(ERROR_CODES.PURCHASE_INVALID_RECEIPT);
    await expect(prisma.purchaseReceipt.count()).resolves.toBe(0);
    await expect(prisma.stockMovement.count()).resolves.toBe(0);
  });
});
