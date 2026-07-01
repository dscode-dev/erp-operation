import {
  AssetLifecycleEventType,
  DocumentTemplateType,
  PrismaClient,
  Role,
  StockMovementType,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { ARGON2_OPTIONS } from './infra/security/argon2.constants';
import { seedDemoData } from './seeds/demo/demo.seed';

const prisma = new PrismaClient();

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required to run the OWNER seed`);
  }
  return value;
}

function generateStrongPassword(): string {
  return randomBytes(24).toString('base64url');
}

async function main(): Promise<void> {
  const email = requiredEnvironment('OWNER_EMAIL').toLowerCase();
  await seedOwner(email);
  await seedOrganization();
  await seedDemoData(prisma, {
    log: (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
  });
  await seedInventoryMaterials();
  await seedProductPricing();
}

async function seedOwner(email: string): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username: 'ninja' }],
    },
    select: { id: true, email: true, username: true, role: true },
  });

  if (existing) {
    await ensureOwnerFoundation(existing.id);
    process.stdout.write(
      `${JSON.stringify({
        event: 'owner_seed_skipped',
        reason: 'owner_already_exists',
        user: existing,
      })}\n`,
    );
    return;
  }

  const password = generateStrongPassword();
  const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);

  const owner = await prisma.user.create({
    data: {
      email,
      username: 'daniel',
      name: 'Daniel',
      passwordHash,
      role: Role.OWNER,
      isActive: true,
      mustChangePassword: false,
      preferences: { create: {} },
      permission: {
        create: {
          canFinancial: true,
          canUsers: true,
          canReports: true,
          canSchedules: true,
          canTemplates: true,
        },
      },
    },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
    },
  });

  process.stdout.write(
    `${JSON.stringify({
      event: 'owner_seed_created',
      user: owner,
      generatedPassword: password,
      warning: 'Store this password now. It will not be displayed again.',
    })}\n`,
  );
}

async function ensureOwnerFoundation(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.userPreferences.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.userPermission.upsert({
      where: { userId },
      create: {
        userId,
        canFinancial: true,
        canUsers: true,
        canReports: true,
        canSchedules: true,
        canTemplates: true,
      },
      update: {
        canFinancial: true,
        canUsers: true,
        canReports: true,
        canSchedules: true,
        canTemplates: true,
      },
    }),
  ]);
}

async function seedOrganization(): Promise<void> {
  const existingOrganization = await prisma.organization.findFirst({
    select: { id: true, legalName: true, tradeName: true },
  });

  const organization =
    existingOrganization ??
    (await prisma.organization.create({
      data: {
        legalName: 'ERP Operation',
        tradeName: 'ERP Operation',
        cnpj: '00.000.000/0001-00',
        email: 'contato@example.com',
        phone: '+55 00 00000-0000',
        city: 'Recife',
        state: 'PE',
        primaryColor: '#2A6ED1',
        secondaryColor: '#2A629D',
        segment: null,
        isActive: true,
      },
      select: { id: true, legalName: true, tradeName: true },
    }));

  const settings = await prisma.organizationSettings.upsert({
    where: { organizationId: organization.id },
    create: {
      organizationId: organization.id,
      language: 'pt-BR',
      timezone: 'America/Recife',
      currency: 'BRL',
      documentPrefix: 'ERP',
    },
    update: {},
    select: { id: true, language: true, timezone: true, currency: true, documentPrefix: true },
  });

  const templateTypes = Object.values(DocumentTemplateType);
  for (const type of templateTypes) {
    const exists = await prisma.documentTemplate.findFirst({
      where: { organizationId: organization.id, type },
      select: { id: true },
    });
    if (!exists) {
      await prisma.documentTemplate.create({
        data: {
          organizationId: organization.id,
          type,
          name: defaultTemplateName(type),
          headerContent: '',
          footerContent: '',
          observations: '',
          isDefault: true,
          isSystem: true,
        },
      });
    } else {
      await prisma.documentTemplate.update({
        where: { id: exists.id },
        data: { isSystem: true },
      });
    }
  }

  process.stdout.write(
    `${JSON.stringify({
      event: existingOrganization
        ? 'organization_seed_skipped_or_completed'
        : 'organization_seed_created',
      organization,
      settings,
      defaultTemplatesEnsured: templateTypes,
    })}\n`,
  );
}

function defaultTemplateName(type: DocumentTemplateType): string {
  const names: Record<DocumentTemplateType, string> = {
    QUOTE: 'Orçamento padrão',
    WORK_ORDER: 'Ordem de serviço padrão',
    RECEIPT: 'Recibo padrão',
    REPORT: 'Relatório padrão',
    TECHNICAL_REPORT: 'Relatório técnico padrão',
    PMOC: 'PMOC padrão',
  };
  return names[type];
}

async function seedInventoryMaterials(): Promise<void> {
  const [organization, actor] = await Promise.all([
    prisma.organization.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }),
    prisma.user.findFirst({ where: { role: Role.OWNER }, orderBy: { createdAt: 'asc' }, select: { id: true } }),
  ]);
  if (!organization || !actor) return;

  await prisma.supplier.upsert({
    where: { document: '12.345.678/0001-90' },
    create: {
      legalName: 'Friopeças Distribuidora LTDA',
      tradeName: 'Friopeças',
      document: '12.345.678/0001-90',
      contacts: [{ name: 'Atendimento Comercial', phone: '+55 81 3333-0101' }],
      address: { city: 'Recife', state: 'PE' },
      notes: 'Fornecedor inicial para insumos HVAC.',
    },
    update: {},
  });

  const products = [
    {
      sku: 'HVAC-FILTRO-G4-001',
      internalCode: 'MAT-0001',
      manufacturerCode: 'G4-600X600',
      name: 'Filtro G4 600x600',
      unit: 'UN',
      brand: 'Tecfil',
      model: 'G4',
      category: 'Filtros',
      technicalDescription: 'Filtro grosso G4 para sistemas de climatização.',
      ideal: 24,
      minimum: 6,
      initial: 18,
    },
    {
      sku: 'HVAC-GAS-R410A-KG',
      internalCode: 'MAT-0002',
      manufacturerCode: 'R410A',
      name: 'Fluido refrigerante R410A',
      unit: 'KG',
      brand: 'Chemours',
      model: 'R410A',
      category: 'Refrigeração',
      technicalDescription: 'Fluido refrigerante para sistemas split/VRF.',
      ideal: 40,
      minimum: 10,
      initial: 26,
    },
    {
      sku: 'HVAC-CAP-45UF',
      internalCode: 'MAT-0003',
      manufacturerCode: 'CAP-45UF-440V',
      name: 'Capacitor 45µF 440V',
      unit: 'UN',
      brand: 'Epcos',
      model: '45µF 440V',
      category: 'Elétrica',
      technicalDescription: 'Capacitor de partida/funcionamento para condensadoras.',
      ideal: 12,
      minimum: 3,
      initial: 8,
    },
  ];

  for (const item of products) {
    const product = await prisma.product.upsert({
      where: { sku: item.sku },
      create: {
        sku: item.sku,
        internalCode: item.internalCode,
        manufacturerCode: item.manufacturerCode,
        name: item.name,
        unit: item.unit,
        brand: item.brand,
        model: item.model,
        category: item.category,
        technicalDescription: item.technicalDescription,
      },
      update: {
        name: item.name,
        unit: item.unit,
        brand: item.brand,
        model: item.model,
        category: item.category,
        technicalDescription: item.technicalDescription,
      },
    });
    const inventoryItem =
      (await prisma.inventoryItem.findFirst({
        where: { organizationId: organization.id, productId: product.id },
      })) ??
      (await prisma.inventoryItem.create({
        data: {
          organizationId: organization.id,
          productId: product.id,
          minimumQuantity: item.minimum,
          idealQuantity: item.ideal,
          location: 'Almoxarifado principal',
        },
      }));
    const existingInitialMovement = await prisma.stockMovement.findFirst({
      where: { inventoryItemId: inventoryItem.id, reason: 'Initial inventory seed' },
      select: { id: true },
    });
    if (!existingInitialMovement) {
      await prisma.stockMovement.create({
        data: {
          inventoryItemId: inventoryItem.id,
          quantity: item.initial,
          type: StockMovementType.IN,
          reason: 'Initial inventory seed',
          userId: actor.id,
          occurredAt: new Date(),
        },
      });
      await prisma.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: { currentQuantity: item.initial, availableQuantity: item.initial },
      });
    }
  }

  const operation = await prisma.operation.findFirst({
    where: { equipmentId: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, number: true, equipmentId: true },
  });
  if (!operation) return;
  const product = await prisma.product.findUnique({ where: { sku: 'HVAC-FILTRO-G4-001' } });
  if (!product) return;
  const inventoryItem = await prisma.inventoryItem.findFirst({
    where: { organizationId: organization.id, productId: product.id },
  });
  if (!inventoryItem) return;
  const existingPart = await prisma.operationPart.findFirst({
    where: { operationId: operation.id, productId: product.id, deletedAt: null },
  });
  if (existingPart) return;
  await prisma.$transaction(async (tx) => {
    const part = await tx.operationPart.create({
      data: {
        operationId: operation.id,
        productId: product.id,
        inventoryItemId: inventoryItem.id,
        quantity: 1,
        notes: 'Consumo inicial vinculado por seed.',
      },
    });
    await tx.stockMovement.create({
      data: {
        inventoryItemId: inventoryItem.id,
        quantity: 1,
        type: StockMovementType.CONSUMPTION,
        reason: `Consumed in operation #${operation.number}`,
        operationId: operation.id,
        userId: actor.id,
        occurredAt: new Date(),
      },
    });
    const current = Number(inventoryItem.currentQuantity) - 1;
    await tx.inventoryItem.update({
      where: { id: inventoryItem.id },
      data: { currentQuantity: current, availableQuantity: current },
    });
    if (operation.equipmentId) {
      await tx.assetLifecycleEvent.create({
        data: {
          equipmentId: operation.equipmentId,
          operationId: operation.id,
          type: AssetLifecycleEventType.PART_REPLACEMENT,
          occurredAt: new Date(),
          performedBy: actor.id,
          description: `Part/material consumed: ${product.name}`,
          metadata: {
            productId: product.id,
            inventoryItemId: inventoryItem.id,
            operationPartId: part.id,
            quantity: 1,
            productName: product.name,
            source: 'seed',
          },
        },
      });
    }
  });
}

async function seedProductPricing(): Promise<void> {
  const organization = await prisma.organization.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!organization) return;

  const pricings = [
    {
      sku: 'HVAC-FILTRO-G4-001',
      costPrice: 42.5,
      replacementCost: 45,
      averageCost: 43.8,
      salePrice: 78,
      minimumSalePrice: 68,
      suggestedSalePrice: 82,
    },
    {
      sku: 'HVAC-GAS-R410A-KG',
      costPrice: 88,
      replacementCost: 92,
      averageCost: 89.5,
      salePrice: 145,
      minimumSalePrice: 128,
      suggestedSalePrice: 152,
    },
    {
      sku: 'HVAC-CAP-45UF',
      costPrice: 31,
      replacementCost: 34,
      averageCost: 32,
      salePrice: 69,
      minimumSalePrice: 58,
      suggestedSalePrice: 72,
    },
  ];

  for (const item of pricings) {
    const product = await prisma.product.findUnique({ where: { sku: item.sku }, select: { id: true } });
    if (!product) continue;
    const existing = await prisma.productPricing.findFirst({
      where: { organizationId: organization.id, productId: product.id, active: true },
      select: { id: true },
    });
    if (existing) continue;
    const marginPercentage =
      item.salePrice === 0 ? 0 : Number((((item.salePrice - item.averageCost) / item.salePrice) * 100).toFixed(2));
    await prisma.productPricing.create({
      data: {
        organizationId: organization.id,
        productId: product.id,
        costPrice: item.costPrice,
        replacementCost: item.replacementCost,
        averageCost: item.averageCost,
        salePrice: item.salePrice,
        minimumSalePrice: item.minimumSalePrice,
        suggestedSalePrice: item.suggestedSalePrice,
        marginPercentage,
        validFrom: new Date('2026-07-01T00:00:00.000Z'),
        active: true,
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        event: 'owner_seed_failed',
        message: error instanceof Error ? error.message : 'Unknown seed error',
      })}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
