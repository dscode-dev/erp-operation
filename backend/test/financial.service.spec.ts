import { HttpStatus } from '@nestjs/common';
import {
  FinancialAccountType,
  FinancialCategoryType,
  FinancialEntryOrigin,
  FinancialEntryStatus,
  FinancialEntryType,
  Role,
} from '@prisma/client';
import { ERROR_CODES } from '../src/shared/constants/error-codes.constants';
import { ApplicationException } from '../src/shared/exceptions/application.exception';
import { FinancialService } from '../src/modules/financial/financial.service';

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

function paidEntry(): Record<string, unknown> {
  return {
    id: '00000000-0000-4000-8000-000000000101',
    organizationId: '00000000-0000-4000-8000-000000000201',
    accountId: '00000000-0000-4000-8000-000000000301',
    categoryId: '00000000-0000-4000-8000-000000000401',
    type: FinancialEntryType.RECEIVABLE,
    origin: FinancialEntryOrigin.MANUAL,
    originId: null,
    amount: { toString: () => '100.00' },
    dueDate: new Date(),
    paidAt: new Date(),
    description: 'Entrada paga',
    notes: null,
    status: FinancialEntryStatus.PAID,
    createdBy: actor.id,
    canceledAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    organization: { id: 'org', tradeName: 'Org', legalName: 'Org LTDA' },
    account: { id: 'account', name: 'Banco', type: FinancialAccountType.BANK, currentBalance: { toString: () => '100.00' }, active: true },
    category: { id: 'category', name: 'Serviços', type: FinancialCategoryType.INCOME, color: null, icon: null, active: true },
    creator: { id: actor.id, name: actor.name, email: actor.email, username: actor.username, role: actor.role },
    allocations: [],
  };
}

describe('FinancialService state guards', () => {
  function serviceWithEntry(entry: ReturnType<typeof paidEntry>): FinancialService {
    const prisma = {
      financialEntry: {
        findFirst: jest.fn().mockResolvedValue(entry),
      },
    };
    const lifecycle = {};
    return new FinancialService(prisma as never, lifecycle as never);
  }

  it('rejects duplicate payment', async () => {
    const service = serviceWithEntry(paidEntry());
    await service.payEntry(paidEntry().id as string, {}, actor, context).catch((error: ApplicationException) => {
      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
    });
    await expect(service.payEntry(paidEntry().id as string, {}, actor, context)).rejects.toMatchObject({
      code: ERROR_CODES.FINANCIAL_ENTRY_INVALID_STATE,
    } satisfies Partial<ApplicationException>);
  });

  it('rejects canceling a paid entry in V1', async () => {
    const service = serviceWithEntry(paidEntry());
    await service.cancelEntry(paidEntry().id as string, {}, actor, context).catch((error: ApplicationException) => {
      expect(error.code).toBe(ERROR_CODES.FINANCIAL_ENTRY_INVALID_STATE);
      expect(error.getStatus()).toBe(HttpStatus.CONFLICT);
    });
  });
});
