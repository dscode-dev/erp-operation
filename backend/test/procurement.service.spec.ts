import { HttpStatus } from '@nestjs/common';
import { PurchaseOrderStatus, Role } from '@prisma/client';
import { ProcurementService } from '../src/modules/procurement/procurement.service';
import { ERROR_CODES } from '../src/shared/constants/error-codes.constants';
import { ApplicationException } from '../src/shared/exceptions/application.exception';

const actor = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'owner@example.com',
  username: 'owner',
  name: 'Owner',
  role: Role.OWNER,
  isActive: true,
  mustChangePassword: false,
};

const context = { requestId: 'req-test', ip: '127.0.0.1', userAgent: 'jest' };

function order(status: PurchaseOrderStatus): Record<string, unknown> {
  return {
    id: '00000000-0000-4000-8000-000000000101',
    organizationId: '00000000-0000-4000-8000-000000000201',
    supplierId: '00000000-0000-4000-8000-000000000301',
    number: 1,
    status,
    notes: null,
    expectedDelivery: null,
    createdBy: actor.id,
    canceledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: {},
    creator: {},
    receipts: [],
    items: [
      {
        id: '00000000-0000-4000-8000-000000000401',
        purchaseOrderId: '00000000-0000-4000-8000-000000000101',
        productId: '00000000-0000-4000-8000-000000000501',
        quantity: { toString: () => '10' },
        receivedQuantity: { toString: () => '9' },
        product: {},
      },
    ],
  };
}

describe('ProcurementService state guards', () => {
  function serviceWithOrder(value: Record<string, unknown>): ProcurementService {
    const prisma = {
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue(value),
      },
      $transaction: jest.fn(),
    };
    return new ProcurementService(prisma as never, {} as never, {} as never);
  }

  it('rejects receiving a draft purchase order', async () => {
    const service = serviceWithOrder(order(PurchaseOrderStatus.DRAFT));
    await service.receive(order(PurchaseOrderStatus.DRAFT).id as string, { items: [{ itemId: '00000000-0000-4000-8000-000000000401', quantity: 1 }] }, actor, context).catch((error: ApplicationException) => {
      expect(error.code).toBe(ERROR_CODES.PURCHASE_INVALID_STATE);
      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
    });
  });

  it('rejects receiving above purchased quantity', async () => {
    const tx = {
      purchaseReceipt: { create: jest.fn().mockResolvedValue({ id: 'receipt' }) },
    };
    const prisma = {
      purchaseOrder: { findUnique: jest.fn().mockResolvedValue(order(PurchaseOrderStatus.SENT)) },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => callback(tx)),
    };
    const service = new ProcurementService(prisma as never, {} as never, {} as never);
    await service.receive(order(PurchaseOrderStatus.SENT).id as string, { items: [{ itemId: '00000000-0000-4000-8000-000000000401', quantity: 2 }] }, actor, context).catch((error: ApplicationException) => {
      expect(error.code).toBe(ERROR_CODES.PURCHASE_INVALID_RECEIPT);
      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
    });
  });
});
