import { Role } from '@prisma/client';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import { createOperation, createOrganization, createProductWithInventory, prisma } from '../integration/helpers';
import {
  authGet,
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

describe('AppSec RBAC and commercial confidentiality', () => {
  let security: SecurityApp;
  let owner: SecurityActor;
  let manager: SecurityActor;
  let operator: SecurityActor;
  let viewer: SecurityActor;

  beforeAll(async () => {
    security = await createSecurityApp();
    registerSecurityHttpServer(security.http);
  });

  beforeEach(async () => {
    await resetSecurityState();
    owner = await createSecurityActor(Role.OWNER, 'rbac-owner');
    manager = await createSecurityActor(Role.MANAGER, 'rbac-manager');
    operator = await createSecurityActor(Role.OPERATOR, 'rbac-operator');
    viewer = await createSecurityActor(Role.VIEWER, 'rbac-viewer');
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('enforces the financial RBAC boundary across read and mutation routes', async () => {
    await expectAllowed(owner, '/api/v1/financial/accounts');
    await expectAllowed(manager, '/api/v1/financial/accounts');
    await expectForbidden(operator, '/api/v1/financial/accounts');
    await expectForbidden(viewer, '/api/v1/financial/accounts');
    await expectForbidden(operator, '/api/v1/financial/stats');
    await expectForbidden(viewer, '/api/v1/financial/stats');
  });

  it('denies Pricing to OPERATOR and VIEWER through direct and nested endpoints', async () => {
    const organization = await createOrganization();
    const product = await createProductWithInventory(organization.id, 3);
    await prisma.productPricing.create({
      data: {
        organizationId: organization.id,
        productId: product.productId,
        costPrice: 10,
        replacementCost: 11,
        averageCost: 9,
        salePrice: 20,
        minimumSalePrice: 15,
        suggestedSalePrice: 22,
        marginPercentage: 50,
        validFrom: new Date('2026-01-01T00:00:00.000Z'),
        active: true,
      },
    });

    await expectAllowed(owner, '/api/v1/pricing');
    await expectAllowed(manager, '/api/v1/pricing');
    await expectForbidden(operator, '/api/v1/pricing');
    await expectForbidden(viewer, '/api/v1/pricing');
    await expectForbidden(operator, `/api/v1/products/${product.productId}/pricing`);
    await expectForbidden(viewer, `/api/v1/pricing/history/${product.productId}`);

    const productResponse = await authGet(operator, `/api/v1/products/${product.productId}`);
    expect(productResponse.status).toBe(200);
    expect(productResponse.text).not.toContain('costPrice');
    expect(productResponse.text).not.toContain('replacementCost');
    expect(productResponse.text).not.toContain('averageCost');
    expect(productResponse.text).not.toContain('minimumSalePrice');
    expect(productResponse.text).not.toContain('marginPercentage');
  });

  it('keeps Budget and Procurement behind OWNER/MANAGER roles', async () => {
    await expectAllowed(owner, '/api/v1/budgets');
    await expectAllowed(manager, '/api/v1/budgets');
    await expectForbidden(operator, '/api/v1/budgets');
    await expectForbidden(viewer, '/api/v1/budgets');

    await expectAllowed(owner, '/api/v1/purchase-orders');
    await expectAllowed(manager, '/api/v1/purchase-orders');
    await expectForbidden(operator, '/api/v1/purchase-orders');
    await expectForbidden(viewer, '/api/v1/purchase-orders');
  });

  it('rejects a Budget origin that is not a completed Work Order', async () => {
    await createOrganization();
    const operation = await createOperation(owner.user);
    const response = await authPost(owner, '/api/v1/budgets').send({
      operationId: operation.id,
      customerId: operation.customerId,
      customerAddressId: operation.addressId,
      equipmentId: operation.equipmentId,
      title: 'Orçamento indevido para OS aberta',
      introduction: 'Proposta comercial.',
      validityDays: 30,
      paymentMethods: ['PIX'],
      status: 'DRAFT',
      items: [
        {
          type: 'SERVICE',
          description: 'Serviço técnico',
          quantity: 1,
          unit: 'SERV',
          unitPrice: 100,
        },
      ],
    });

    expect(response.status).toBe(409);
    expect(errorCode(response)).toBe(ERROR_CODES.BUDGET_OPERATION_NOT_COMPLETED);
  });
});

async function expectAllowed(actor: SecurityActor, path: string): Promise<void> {
  const response = await authGet(actor, path);
  expect(response.status).toBe(200);
}

async function expectForbidden(actor: SecurityActor, path: string): Promise<void> {
  const response = await authGet(actor, path);
  expect(response.status).toBe(403);
  expect(errorCode(response)).toBe(ERROR_CODES.FORBIDDEN);
}
