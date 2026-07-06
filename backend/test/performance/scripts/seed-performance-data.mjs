import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

const SCALES = {
  tiny: {
    customers: 20,
    equipments: 40,
    operations: 120,
    products: 40,
    stockMovements: 160,
    budgets: 60,
    financialEntries: 120,
    purchaseOrders: 40,
    lifecycleEvents: 300,
  },
  local: {
    customers: 120,
    equipments: 300,
    operations: 800,
    products: 150,
    stockMovements: 1200,
    budgets: 400,
    financialEntries: 1000,
    purchaseOrders: 200,
    lifecycleEvents: 3000,
  },
  staging: {
    customers: 500,
    equipments: 1500,
    operations: 5000,
    products: 500,
    stockMovements: 10000,
    budgets: 2000,
    financialEntries: 5000,
    purchaseOrders: 1000,
    lifecycleEvents: 20000,
  },
};

function databaseNameFromUrl(url) {
  const parsed = new URL(url);
  return parsed.pathname.replace(/^\//, '').split('?')[0];
}

function assertSafeDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const dbName = databaseNameFromUrl(url);
  if (!dbName.endsWith('_test') && !dbName.endsWith('_perf')) {
    throw new Error(`Refusing to seed performance data into unsafe database "${dbName}"`);
  }
}

async function resetDatabase() {
  if (process.env.ORBIT_PERF_RESET !== 'true') return;
  const tables = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const quoted = tables.map((row) => `"public"."${row.tablename.replace(/"/g, '""')}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
}

function scale() {
  const key = process.env.ORBIT_PERF_SCALE ?? 'tiny';
  if (!SCALES[key]) throw new Error(`Invalid ORBIT_PERF_SCALE ${key}`);
  return SCALES[key];
}

function pick(items, index) {
  return items[index % items.length];
}

function daysFromNow(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function main() {
  assertSafeDatabase();
  await resetDatabase();
  const cfg = scale();
  const password = process.env.ORBIT_PERF_PASSWORD ?? 'PerfPassword!2026';
  const passwordHash = await argon2.hash(password);

  const organization = await prisma.organization.create({
    data: {
      legalName: 'Orbit Performance Company LTDA',
      tradeName: 'Orbit Performance',
      cnpj: '12.345.678/0001-90',
      email: 'performance@orbit.local',
      phone: '+55 81 3000-0000',
      city: 'Recife',
      state: 'PE',
      primaryColor: '#2563EB',
      secondaryColor: '#0F172A',
      segment: 'HVAC',
      settings: {
        create: {
          language: 'pt-BR',
          timezone: 'America/Recife',
          currency: 'BRL',
          documentPrefix: 'PERF',
        },
      },
    },
  });

  for (const type of ['WORK_ORDER', 'BUDGET', 'QUOTE', 'RECEIPT', 'REPORT', 'TECHNICAL_REPORT', 'PMOC']) {
    await prisma.documentTemplate.create({
      data: {
        organizationId: organization.id,
        type,
        name: `Performance ${type}`,
        headerContent: 'Orbit Performance Header',
        footerContent: 'Orbit Performance Footer',
        observations: 'Template de performance',
        isDefault: true,
        isSystem: true,
      },
    });
  }

  const users = {};
  for (const [role, username] of [
    ['OWNER', 'perf-owner'],
    ['MANAGER', 'perf-manager'],
    ['OPERATOR', 'perf-operator'],
    ['VIEWER', 'perf-viewer'],
  ]) {
    const user = await prisma.user.create({
      data: {
        email: `${username.replace('-', '.')}@orbit.local`,
        username,
        name: `Performance ${role}`,
        passwordHash,
        role,
        isActive: true,
        mustChangePassword: false,
        preferences: { create: { theme: 'SYSTEM', notificationsEnabled: true } },
        permission: {
          create: {
            canFinancial: role === 'OWNER' || role === 'MANAGER',
            canUsers: role === 'OWNER',
            canReports: role !== 'OPERATOR',
            canSchedules: role !== 'VIEWER',
            canTemplates: role === 'OWNER',
          },
        },
      },
    });
    users[role] = user;
  }

  const customers = [];
  for (let i = 0; i < cfg.customers; i += 1) {
    const customer = await prisma.customer.create({
      data: {
        type: 'COMPANY',
        name: `Performance Cliente ${String(i + 1).padStart(4, '0')}`,
        tradeName: `Perf Cliente ${i + 1}`,
        email: `cliente-${i + 1}@perf.local`,
        phone: `8199${String(i).padStart(7, '0')}`,
        addresses: {
          create: {
            name: 'Principal',
            zipCode: '50000-000',
            street: 'Rua Performance',
            number: String(i + 1),
            district: 'Centro',
            city: 'Recife',
            state: 'PE',
            isPrimary: true,
          },
        },
      },
      include: { addresses: true },
    });
    customers.push(customer);
  }

  const equipments = [];
  for (let i = 0; i < cfg.equipments; i += 1) {
    const customer = pick(customers, i);
    const equipment = await prisma.equipment.create({
      data: {
        customerId: customer.id,
        addressId: customer.addresses[0].id,
        type: i % 5 === 0 ? 'CHILLER' : 'SPLIT',
        status: i % 13 === 0 ? 'MAINTENANCE' : 'ACTIVE',
        name: `Performance Equipamento ${String(i + 1).padStart(5, '0')}`,
        tag: `PERF-EQ-${String(i + 1).padStart(5, '0')}`,
        manufacturer: 'Orbit HVAC',
        model: `P-${(i % 10) + 1}`,
        serialNumber: `SN-PERF-${i + 1}`,
        qrCode: `equipment:${randomUUID()}`,
      },
    });
    equipments.push(equipment);
  }

  const operations = [];
  for (let i = 0; i < cfg.operations; i += 1) {
    const equipment = pick(equipments, i);
    const customer = customers.find((item) => item.id === equipment.customerId);
    const status = i % 5 === 0 ? 'COMPLETED' : i % 3 === 0 ? 'IN_PROGRESS' : 'DRAFT';
    const operation = await prisma.operation.create({
      data: {
        customerId: equipment.customerId,
        addressId: customer?.addresses[0]?.id ?? null,
        equipmentId: equipment.id,
        operatorId: users.OPERATOR.id,
        type: i % 2 === 0 ? 'PREVENTIVA' : 'CORRETIVA',
        status,
        scheduledFor: daysFromNow((i % 30) - 10),
        startedAt: status !== 'DRAFT' ? daysFromNow((i % 30) - 10) : null,
        completedAt: status === 'COMPLETED' ? daysFromNow((i % 30) - 9) : null,
        checklist: [{ label: 'Inspeção visual', done: i % 2 === 0 }],
        observations: 'Operação de performance',
      },
    });
    operations.push(operation);
    await prisma.assignment.create({
      data: {
        operationId: operation.id,
        assignedBy: users.MANAGER.id,
        assignedTo: users.OPERATOR.id,
        status: status === 'COMPLETED' ? 'COMPLETED' : status === 'IN_PROGRESS' ? 'STARTED' : 'ASSIGNED',
        acceptedAt: status !== 'DRAFT' ? daysFromNow((i % 30) - 10) : null,
        startedAt: status !== 'DRAFT' ? daysFromNow((i % 30) - 10) : null,
        completedAt: status === 'COMPLETED' ? daysFromNow((i % 30) - 9) : null,
      },
    });
  }

  for (let i = 0; i < cfg.lifecycleEvents; i += 1) {
    const equipment = pick(equipments, i);
    const operation = pick(operations, i);
    await prisma.assetLifecycleEvent.create({
      data: {
        equipmentId: equipment.id,
        operationId: operation.id,
        type: i % 4 === 0 ? 'PREVENTIVE' : i % 4 === 1 ? 'CORRECTIVE' : i % 4 === 2 ? 'DOCUMENT' : 'NOTE',
        occurredAt: daysFromNow(-1 * (i % 180)),
        performedBy: users.OPERATOR.id,
        description: `Evento de performance ${i + 1}`,
        metadata: { performance: true, operationNumber: operation.number },
      },
    });
  }

  const products = [];
  for (let i = 0; i < cfg.products; i += 1) {
    const product = await prisma.product.create({
      data: {
        sku: `PERF-SKU-${String(i + 1).padStart(5, '0')}`,
        internalCode: `PERF-INT-${String(i + 1).padStart(5, '0')}`,
        name: `Produto Performance ${i + 1}`,
        unit: 'UN',
        brand: 'Orbit Parts',
        model: `M-${i % 20}`,
        category: i % 2 === 0 ? 'Filtros' : 'Compressores',
        technicalDescription: 'Item de performance',
      },
    });
    products.push(product);
    await prisma.productPricing.create({
      data: {
        organizationId: organization.id,
        productId: product.id,
        costPrice: 50 + (i % 40),
        replacementCost: 55 + (i % 40),
        averageCost: 52 + (i % 40),
        salePrice: 90 + (i % 60),
        minimumSalePrice: 80 + (i % 50),
        suggestedSalePrice: 100 + (i % 70),
        marginPercentage: 35,
        validFrom: daysFromNow(-30),
        active: true,
      },
    });
  }

  const inventoryItems = [];
  for (let i = 0; i < products.length; i += 1) {
    const inventory = await prisma.inventoryItem.create({
      data: {
        organizationId: organization.id,
        productId: products[i].id,
        currentQuantity: 100,
        minimumQuantity: 10,
        idealQuantity: 150,
        reservedQuantity: 0,
        availableQuantity: 100,
        location: `A${(i % 10) + 1}`,
      },
    });
    inventoryItems.push(inventory);
  }

  for (let i = 0; i < cfg.stockMovements; i += 1) {
    await prisma.stockMovement.create({
      data: {
        inventoryItemId: pick(inventoryItems, i).id,
        quantity: (i % 5) + 1,
        type: i % 3 === 0 ? 'IN' : 'OUT',
        reason: 'Movimento performance',
        userId: users.MANAGER.id,
        occurredAt: daysFromNow(-1 * (i % 90)),
      },
    });
  }

  const incomeCategory = await prisma.financialCategory.create({
    data: { organizationId: organization.id, name: 'Performance Receita', type: 'INCOME', color: '#16A34A', icon: 'wallet' },
  });
  const expenseCategory = await prisma.financialCategory.create({
    data: { organizationId: organization.id, name: 'Performance Despesa', type: 'EXPENSE', color: '#DC2626', icon: 'receipt' },
  });
  const account = await prisma.financialAccount.create({
    data: {
      organizationId: organization.id,
      name: 'Conta Performance',
      type: 'BANK',
      openingBalance: 10000,
      currentBalance: 10000,
    },
  });

  for (let i = 0; i < cfg.financialEntries; i += 1) {
    const type = i % 2 === 0 ? 'RECEIVABLE' : 'PAYABLE';
    await prisma.financialEntry.create({
      data: {
        organizationId: organization.id,
        accountId: account.id,
        categoryId: type === 'RECEIVABLE' ? incomeCategory.id : expenseCategory.id,
        type,
        origin: 'MANUAL',
        amount: 100 + (i % 1000),
        dueDate: daysFromNow((i % 60) - 30),
        description: `Lançamento Performance ${i + 1}`,
        status: i % 7 === 0 ? 'PAID' : 'PENDING',
        paidAt: i % 7 === 0 ? daysFromNow(-1 * (i % 20)) : null,
        createdBy: users.MANAGER.id,
      },
    });
  }

  const supplier = await prisma.supplier.create({
    data: {
      legalName: 'Fornecedor Performance LTDA',
      tradeName: 'Fornecedor Performance',
      document: '98.765.432/0001-10',
      contacts: [{ name: 'Compras', email: 'compras@perf.local' }],
      address: { city: 'Recife', state: 'PE' },
    },
  });

  for (let i = 0; i < cfg.purchaseOrders; i += 1) {
    const order = await prisma.purchaseOrder.create({
      data: {
        organizationId: organization.id,
        supplierId: supplier.id,
        status: i % 4 === 0 ? 'RECEIVED' : i % 3 === 0 ? 'SENT' : 'DRAFT',
        expectedDelivery: daysFromNow((i % 30) - 5),
        createdBy: users.MANAGER.id,
        items: {
          create: {
            productId: pick(products, i).id,
            quantity: 5,
            unit: 'UN',
            snapshotCost: 50,
            snapshotDescription: 'Item performance',
            receivedQuantity: i % 4 === 0 ? 5 : 0,
          },
        },
      },
      include: { items: true },
    });
    if (order.status === 'RECEIVED') {
      await prisma.purchaseReceipt.create({
        data: {
          purchaseOrderId: order.id,
          receivedBy: users.MANAGER.id,
          receivedAt: daysFromNow(-1),
          notes: 'Recebimento performance',
        },
      });
    }
  }

  for (let i = 0; i < cfg.budgets; i += 1) {
    const operation = pick(operations, i);
    const equipment = equipments.find((item) => item.id === operation.equipmentId);
    const customer = customers.find((item) => item.id === operation.customerId);
    const total = 500 + (i % 3000);
    await prisma.budget.create({
      data: {
        organizationId: organization.id,
        operationId: operation.id,
        customerId: operation.customerId,
        customerAddressId: customer?.addresses[0]?.id ?? null,
        equipmentId: equipment?.id ?? null,
        status: i % 5 === 0 ? 'APPROVED' : i % 3 === 0 ? 'PENDING' : 'DRAFT',
        title: `Orçamento Performance ${i + 1}`,
        description: 'Budget performance',
        subtotal: total,
        total,
        expirationDate: daysFromNow(30),
        createdBy: users.MANAGER.id,
        items: {
          create: {
            productId: pick(products, i).id,
            description: 'Item budget performance',
            quantity: 2,
            unit: 'UN',
            snapshotCost: 50,
            snapshotSalePrice: total / 2,
            snapshotMargin: 40,
            total,
          },
        },
      },
    });
  }

  await prisma.systemSetting.create({
    data: {
      key: 'performance.fixture.v1',
      value: { scale: process.env.ORBIT_PERF_SCALE ?? 'tiny', createdAt: new Date().toISOString() },
    },
  });

  console.log(JSON.stringify({
    status: 'ok',
    scale: process.env.ORBIT_PERF_SCALE ?? 'tiny',
    credentials: {
      owner: 'perf.owner@orbit.local',
      manager: 'perf.manager@orbit.local',
      operator: 'perf.operator@orbit.local',
      password,
    },
    counts: cfg,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
