import { FinancialAccountType, FinancialCategoryType, FinancialEntryType, Role } from '@prisma/client';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import { createOrganization, prisma } from '../integration/helpers';
import {
  authPost,
  closeSecurityApp,
  createSecurityActor,
  createSecurityApp,
  dataOf,
  errorCode,
  registerSecurityHttpServer,
  resetSecurityState,
  type SecurityActor,
  type SecurityApp,
} from './security-app';

describe('AppSec Financial mass assignment and workflow abuse', () => {
  let security: SecurityApp;
  let owner: SecurityActor;
  let accountId: string;
  let categoryId: string;

  beforeAll(async () => {
    security = await createSecurityApp();
    registerSecurityHttpServer(security.http);
  });

  beforeEach(async () => {
    await resetSecurityState();
    owner = await createSecurityActor(Role.OWNER, 'finance-owner');
    const organization = await createOrganization();
    const account = await prisma.financialAccount.create({
      data: {
        organizationId: organization.id,
        name: 'Conta Segurança',
        type: FinancialAccountType.BANK,
        openingBalance: 0,
        currentBalance: 0,
        active: true,
      },
    });
    const category = await prisma.financialCategory.create({
      data: {
        organizationId: organization.id,
        name: 'Receita Segurança',
        type: FinancialCategoryType.INCOME,
        active: true,
      },
    });
    accountId = account.id;
    categoryId = category.id;
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('rejects status and paidAt injection during entry creation', async () => {
    const response = await authPost(owner, '/api/v1/financial/entries').send({
      accountId,
      categoryId,
      type: FinancialEntryType.RECEIVABLE,
      amount: 120,
      dueDate: '2026-07-05T12:00:00.000Z',
      description: 'Entrada com tentativa de mass assignment',
      status: 'PAID',
      paidAt: '2026-07-05T12:10:00.000Z',
    });

    expect(response.status).toBe(400);
    expect(errorCode(response)).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(response.text).toContain('status should not exist');
    expect(response.text).toContain('paidAt should not exist');

    const account = await prisma.financialAccount.findUniqueOrThrow({ where: { id: accountId } });
    expect(account.currentBalance.toString()).toBe('0');
    await expect(prisma.financialEntry.count()).resolves.toBe(0);
  });

  it('creates financial entries only as PENDING and leaves payment to the official endpoint', async () => {
    const response = await authPost(owner, '/api/v1/financial/entries').send({
      accountId,
      categoryId,
      type: FinancialEntryType.RECEIVABLE,
      amount: 120,
      dueDate: '2026-07-05T12:00:00.000Z',
      description: 'Entrada legítima pendente',
    });

    expect(response.status).toBe(201);
    const entry = dataOf<{ id: string; status: string; paidAt: string | null }>(response);
    expect(entry.status).toBe('PENDING');
    expect(entry.paidAt).toBeNull();

    const account = await prisma.financialAccount.findUniqueOrThrow({ where: { id: accountId } });
    expect(account.currentBalance.toString()).toBe('0');
  });
});
