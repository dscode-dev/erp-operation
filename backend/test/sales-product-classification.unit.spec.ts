import { HttpStatus } from '@nestjs/common';
import { Role, SaleStatus } from '@prisma/client';
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

  it('returns customer document and preserves sold items plus notes in receipt prefill', async () => {
    const prisma = {
      sale: {
        findUnique: jest.fn().mockResolvedValue({
          id: '11111111-1111-4111-8111-111111111111',
          number: 7,
          status: SaleStatus.COMPLETED,
          soldAt: new Date('2026-07-23T12:00:00.000Z'),
          total: '1350.00',
          notes: 'Entrega realizada na unidade principal',
          warrantyDays: 90,
          warrantyStartsAt: new Date('2026-07-23T00:00:00.000Z'),
          warrantyEndsAt: new Date('2026-10-21T00:00:00.000Z'),
          customer: {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Vectra Consultoria e Serviços LTDA',
            tradeName: 'Vectra Consultoria e Serviços',
            cpf: null,
            cnpj: '12345678000190',
            email: null,
            phone: null,
          },
          customerAddress: null,
          items: [{ description: 'Compressor', quantity: '1.000', unit: 'UN' }],
        }),
      },
    };
    const service = new SalesService(prisma as never, {} as never);

    const prefill = (await service.receiptPrefill(
      '11111111-1111-4111-8111-111111111111',
    )) as {
      origin: string;
      customer: { cnpj: string };
      description: string;
    };

    expect(prefill.origin).toBe('SALE');
    expect(prefill.customer.cnpj).toBe('12345678000190');
    expect(prefill.description).toContain('1.000 UN — Compressor');
    expect(prefill.description).toContain('Entrega realizada na unidade principal');
  });
});
