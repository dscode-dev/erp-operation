import { HttpStatus } from '@nestjs/common';
import { Role } from '@prisma/client';
import { SalesService } from '../src/modules/sales/sales.service';
import { ERROR_CODES } from '../src/shared/constants/error-codes.constants';

describe('Sales product classification', () => {
  it('rejects a product that is not enabled for sales', async () => {
    const prisma = {
      organization: { findFirst: jest.fn().mockResolvedValue({ id: 'organization-id' }) },
      customer: { findFirst: jest.fn().mockResolvedValue({ id: 'customer-id' }) },
      product: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'product-id',
          name: 'Material de consumo interno',
          unit: 'UN',
          isActive: true,
          isSellable: false,
        }),
      },
    };
    const pricing = { resolveForConsumer: jest.fn() };
    const service = new SalesService(prisma as never, pricing as never);

    await expect(
      service.create(
        {
          customerId: '11111111-1111-4111-8111-111111111111',
          soldAt: '2026-07-22T12:00:00.000Z',
          items: [{ productId: '22222222-2222-4222-8222-222222222222', quantity: 1 }],
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          email: 'owner@orbit.test',
          username: 'owner',
          name: 'Owner',
          role: Role.OWNER,
          isActive: true,
          mustChangePassword: false,
        },
        { requestId: 'request-id', ip: '127.0.0.1', userAgent: 'jest' },
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.PRODUCT_NOT_SELLABLE, status: HttpStatus.CONFLICT });
    expect(pricing.resolveForConsumer).not.toHaveBeenCalled();
  });
});
