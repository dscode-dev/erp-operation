import { randomUUID } from 'node:crypto';
import { ReleaseApiClient, firstItem, login, requiredEnv } from './release-api-client.mjs';

const apiBaseUrl = requiredEnv('ORBIT_RELEASE_API_URL');
const ownerEmail = requiredEnv('ORBIT_RELEASE_OWNER_EMAIL');
const ownerPassword = requiredEnv('ORBIT_RELEASE_OWNER_PASSWORD');
const suffix = (process.env.ORBIT_RELEASE_RUN_ID ?? randomUUID()).replace(/[^a-z0-9]/gi, '').slice(0, 12);
const numericSuffix = suffix.replace(/\D/g, '').padEnd(6, '7').slice(0, 6);
const now = new Date();
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

const api = new ReleaseApiClient({ baseUrl: apiBaseUrl });
const results = [];

async function step(name, fn) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    results.push({ name, status: 'PASS', durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    results.push({
      name,
      status: 'FAIL',
      durationMs: Date.now() - startedAt,
      error: error.message,
      code: error.code,
      statusCode: error.status,
    });
    throw error;
  }
}

async function main() {
  const ownerSession = await step('A_AUTH_OWNER_LOGIN', () => login(api, ownerEmail, ownerPassword));
  const owner = api.withToken(ownerSession.accessToken);
  const ownerMe = await step('A_AUTH_ME', () => owner.get('/auth/me'));

  const operatorPayload = {
    email: `operator.rc.${suffix}@orbit.local`,
    username: `op.rc.${suffix}`.slice(0, 50),
    name: `Operador RC ${suffix}`,
    role: 'OPERATOR',
    phone: '+55 81 99999-0000',
    jobTitle: 'Técnico de Campo',
  };
  const createdOperator = await step('A_USER_CREATE_OPERATOR', () => owner.post('/users', operatorPayload));
  const operatorId = createdOperator.user.id;
  const operatorTempPassword = createdOperator.temporaryPassword;
  const operatorNewPassword = `Rc!${suffix}StrongPassword42`;
  const operatorInitialSession = await step('A_OPERATOR_INITIAL_LOGIN', () =>
    login(api, operatorPayload.email, operatorTempPassword),
  );
  await step('A_OPERATOR_CHANGE_PASSWORD', () =>
    api
      .withToken(operatorInitialSession.accessToken)
      .patch('/users/change-password', {
        currentPassword: operatorTempPassword,
        newPassword: operatorNewPassword,
      }),
  );
  const operatorSession = await step('A_OPERATOR_LOGIN_AFTER_CHANGE', () =>
    login(api, operatorPayload.email, operatorNewPassword),
  );
  const operator = api.withToken(operatorSession.accessToken);

  const customer = await step('B_CUSTOMER_CREATE', () =>
    owner.post('/customers', {
      type: 'COMPANY',
      name: `Hospital RC ${suffix}`,
      tradeName: `Hospital RC ${suffix}`,
      cnpj: `12.345.${numericSuffix.slice(0, 3)}/0001-${numericSuffix.slice(3, 5)}`,
      email: `compras.rc.${suffix}@hospital.local`,
      phone: '+55 81 3333-4444',
    }),
  );
  const address = await step('B_CUSTOMER_ADDRESS_CREATE', () =>
    owner.post(`/customers/${customer.id}/addresses`, {
      name: 'Matriz',
      zipCode: '50000-000',
      street: 'Rua da Certificação',
      number: '22',
      district: 'Boa Vista',
      city: 'Recife',
      state: 'PE',
      isPrimary: true,
    }),
  );
  const equipment = await step('B_EQUIPMENT_CREATE_WITH_QR', () =>
    owner.post('/equipments', {
      customerId: customer.id,
      addressId: address.id,
      type: 'SPLIT',
      name: `Split RC ${suffix}`,
      tag: `RC-${suffix}`,
      manufacturer: 'Orbit QA',
      model: 'QA-12000',
      serialNumber: `SN-${suffix}`,
      capacity: '12000 BTU',
    }),
  );
  await step('B_EQUIPMENT_QR_LOOKUP', () => owner.get(`/equipments/lookup/${encodeURIComponent(equipment.qrCode)}`));

  const product = await step('C_PRODUCT_CREATE', () =>
    owner.post('/products', {
      sku: `RC-${suffix}`,
      internalCode: `INT-${suffix}`,
      name: `Filtro RC ${suffix}`,
      unit: 'UN',
      brand: 'Orbit',
      model: 'QA',
      category: 'Filtros',
      technicalDescription: 'Item criado pelo workflow de certificação RC.',
    }),
  );
  const inventoryPage = await step('C_INVENTORY_ITEM_LOOKUP', () =>
    owner.get('/inventory', { query: { productId: product.id, limit: 5 } }),
  );
  const inventoryItemId = product.inventoryItems?.[0]?.id ?? firstItem(inventoryPage)?.id;
  if (!inventoryItemId) throw new Error('Product creation did not create an inventory item');
  await step('C_PRICING_CREATE', () =>
    owner.post(`/products/${product.id}/pricing`, {
      costPrice: 80,
      replacementCost: 82,
      averageCost: 81,
      salePrice: 150,
      minimumSalePrice: 120,
      suggestedSalePrice: 160,
      validFrom: now.toISOString(),
      active: true,
    }),
  );
  await step('C_STOCK_IN', () =>
    owner.post('/inventory/movements', {
      inventoryItemId,
      quantity: 10,
      type: 'IN',
      reason: 'Carga inicial do workflow RC',
    }),
  );

  const operation = await step('D_OPERATION_CREATE_DELEGATED', () =>
    owner.post('/operations', {
      customerId: customer.id,
      addressId: address.id,
      equipmentId: equipment.id,
      operatorId,
      type: 'PREVENTIVA',
      status: 'DRAFT',
      scheduledFor: tomorrow.toISOString(),
      checklist: [{ label: 'Inspeção visual', done: false }],
      observations: 'Operação criada pelo workflow RC.',
    }),
  );
  const assignments = await step('D_ASSIGNMENT_MY_OPERATOR', () =>
    operator.get('/assignments/my', { query: { operationId: operation.id, limit: 5 } }),
  );
  const assignment = firstItem(assignments);
  if (!assignment?.id) throw new Error('Delegated operation did not create a visible operator assignment');
  await step('D_ASSIGNMENT_ACCEPT', () => operator.patch(`/assignments/${assignment.id}/accept`, {}));
  await step('D_ASSIGNMENT_START', () => operator.patch(`/assignments/${assignment.id}/start`, {}));
  await step('D_OPERATION_MATERIAL_CONSUMPTION', () =>
    owner.post(`/operations/${operation.id}/materials`, {
      productId: product.id,
      inventoryItemId,
      quantity: 1,
      notes: 'Consumo certificado no RC',
    }),
  );
  await step('D_ASSIGNMENT_COMPLETE', () =>
    operator.patch(`/assignments/${assignment.id}/complete`, { notes: 'Concluído pelo workflow RC' }),
  );
  await step('D_ASSET_LIFECYCLE_TIMELINE', () => owner.get(`/equipments/${equipment.id}/lifecycle`));

  const budget = await step('E_BUDGET_CREATE', () =>
    owner.post('/budgets', {
      operationId: operation.id,
      customerId: customer.id,
      customerAddressId: address.id,
      equipmentId: equipment.id,
      title: `Orçamento RC ${suffix}`,
      expirationDate: nextWeek.toISOString(),
      observations: 'Orçamento criado pelo workflow RC.',
      items: [{ productId: product.id, quantity: 2 }],
    }),
  );
  await step('E_BUDGET_APPROVE', () =>
    owner.patch(`/budgets/${budget.id}/approve`, { observation: 'Aprovado pelo workflow RC' }),
  );
  const renderedBudget = await step('E_BUDGET_RENDER_DOCUMENT', () => owner.post(`/budgets/${budget.id}/render`, {}));
  if (!renderedBudget?.documentId) throw new Error('Budget render did not return documentId');
  await step('E_BUDGET_DOWNLOAD_DOCUMENT', () => owner.get(`/budgets/${budget.id}/download`));
  await step('E_BUDGET_HISTORY', () => owner.get(`/budgets/history/${budget.id}`));

  const account = await step('F_FINANCIAL_ACCOUNT_CREATE', () =>
    owner.post('/financial/accounts', {
      name: `Conta RC ${suffix}`,
      type: 'CASH',
      openingBalance: 1000,
      active: true,
    }),
  );
  const category = await step('F_FINANCIAL_CATEGORY_CREATE', () =>
    owner.post('/financial/categories', {
      name: `Receita RC ${suffix}`,
      type: 'INCOME',
      color: '#2563eb',
      icon: 'wallet',
      active: true,
    }),
  );
  const entry = await step('F_FINANCIAL_ENTRY_CREATE', () =>
    owner.post('/financial/entries', {
      accountId: account.id,
      categoryId: category.id,
      type: 'RECEIVABLE',
      origin: 'BUDGET',
      originId: budget.id,
      amount: 300,
      dueDate: tomorrow.toISOString(),
      description: `Recebível RC ${suffix}`,
    }),
  );
  await step('F_FINANCIAL_ENTRY_PAY', () =>
    owner.patch(`/financial/entries/${entry.id}/pay`, { paidAt: now.toISOString(), notes: 'Pago no RC' }),
  );
  await step('F_FINANCIAL_STATS', () => owner.get('/financial/stats'));

  const supplier = await step('G_SUPPLIER_CREATE', () =>
    owner.post('/suppliers', {
      legalName: `Fornecedor RC ${suffix}`,
      tradeName: `Fornecedor RC ${suffix}`,
      document: `DOC-${suffix}`,
      contacts: [{ name: 'Compras', email: `supplier.rc.${suffix}@orbit.local` }],
      address: { city: 'Recife', state: 'PE' },
      isActive: true,
    }),
  );
  const purchaseOrder = await step('G_PURCHASE_ORDER_CREATE', () =>
    owner.post('/purchase-orders', {
      supplierId: supplier.id,
      expectedDelivery: nextWeek.toISOString(),
      notes: 'Pedido criado pelo workflow RC',
    }),
  );
  const purchaseItem = await step('G_PURCHASE_ORDER_ITEM_CREATE', () =>
    owner.post(`/purchase-orders/${purchaseOrder.id}/items`, {
      productId: product.id,
      quantity: 3,
      unit: 'UN',
      snapshotCost: 80,
      snapshotDescription: 'Filtro RC snapshot',
    }),
  );
  await step('G_PURCHASE_ORDER_SEND', () => owner.patch(`/purchase-orders/${purchaseOrder.id}/send`, {}));
  await step('G_PURCHASE_RECEIPT_PARTIAL', () =>
    owner.post(`/purchase-orders/${purchaseOrder.id}/receipts`, {
      notes: 'Recebimento parcial RC',
      items: [{ itemId: purchaseItem.id, quantity: 1 }],
    }),
  );
  await step('G_PURCHASE_RECEIPT_FINAL', () =>
    owner.post(`/purchase-orders/${purchaseOrder.id}/receipts`, {
      notes: 'Recebimento final RC',
      items: [{ itemId: purchaseItem.id, quantity: 2 }],
    }),
  );
  await step('G_PURCHASE_HISTORY', () => owner.get(`/purchase-orders/history/${purchaseOrder.id}`));
  await step('G_DASHBOARD_STATS_SURFACES', async () => {
    await owner.get('/customers/stats');
    await owner.get('/equipments/stats');
    await owner.get('/operations/stats');
    await owner.get('/inventory/stats');
    await owner.get('/pricing/stats');
    await owner.get('/budgets/stats');
    await owner.get('/purchase-orders/stats');
  });

  console.log(JSON.stringify({ status: 'PASS', check: 'critical_workflows', actor: ownerMe.id, suffix, results }));
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'FAIL', check: 'critical_workflows', suffix, results, error: error.message }));
  process.exit(1);
});
