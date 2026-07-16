import {
  AssetLifecycleEventType,
  DocumentTemplateType,
  MaintenancePlanType,
  MaintenancePriority,
  PmocExecutionOrigin,
  PmocGenerationMode,
  PmocHistoryAction,
  PmocOperationalStatus,
  PmocPeriodicity,
  Prisma,
  PrismaClient,
  Role,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { ARGON2_OPTIONS } from '../../infra/security/argon2.constants';
import { LifecyclePublisher } from '../../modules/asset-lifecycle/lifecycle-publisher.service';
import { PrismaService } from '../../modules/database/prisma.service';
import {
  DEMO_MANIFEST_KEY,
  DEMO_MARKER,
  DEMO_SETTING_KEYS,
  DEMO_USER_DEFINITIONS,
} from './demo.constants';
import { buildDemoSnapshots } from './demo-data.factory';

export interface DemoCredential {
  username: string;
  email: string;
  password: string;
}

export interface DemoSeedResult {
  enabled: boolean;
  organization: 'created' | 'converted-bootstrap' | 'preserved';
  usersCreated: string[];
  usersPreserved: string[];
  snapshotKeys: string[];
  credentials: DemoCredential[];
}

interface DemoManifest {
  version: 1;
  createdUserIds: string[];
  createdUsernames: string[];
  createdCustomerIds: string[];
  createdAttachmentKeys: string[];
  createdEquipmentIds: string[];
  createdEquipmentAttachmentKeys: string[];
  createdMaintenancePlanIds: string[];
  createdPmocPlanIds: string[];
  createdSignatureIds: string[];
  createdSignatureImageKeys: string[];
  organizationMode: DemoSeedResult['organization'];
  generatedAt: string;
}

interface DemoSeedOptions {
  enabled?: boolean;
  force?: boolean;
  now?: Date;
  log?: (event: Record<string, unknown>) => void;
}

export async function seedDemoData(
  prisma: PrismaClient,
  options: DemoSeedOptions = {},
): Promise<DemoSeedResult> {
  const enabled = options.force ?? options.enabled ?? process.env.ENABLE_DEMO_DATA === 'true';
  if (!enabled) {
    options.log?.({ event: 'demo_seed_skipped', reason: 'ENABLE_DEMO_DATA_is_false' });
    return {
      enabled: false,
      organization: 'preserved',
      usersCreated: [],
      usersPreserved: [],
      snapshotKeys: [],
      credentials: [],
    };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Demo data cannot be seeded in production');
  }

  const now = options.now ?? new Date();
  const organization = await ensureDemoOrganization(prisma);
  const usersCreated: string[] = [];
  const usersPreserved: string[] = [];
  const createdUserIds: string[] = [];
  const credentials: DemoCredential[] = [];

  for (const definition of DEMO_USER_DEFINITIONS) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: definition.username }, { email: definition.email }],
      },
      select: { id: true, username: true },
    });
    if (existing) {
      usersPreserved.push(existing.username);
      await ensureUserRelations(prisma, existing.id, definition.role);
      continue;
    }

    const password = randomBytes(24).toString('base64url');
    const passwordHash = await argon2.hash(password, ARGON2_OPTIONS);
    const created = await prisma.user.create({
      data: {
        email: definition.email,
        username: definition.username,
        name: definition.name,
        passwordHash,
        role: definition.role,
        jobTitle: definition.jobTitle,
        notes: `${DEMO_MARKER} Development and commercial demonstration account.`,
        isActive: true,
        mustChangePassword: false,
        preferences: { create: { theme: definition.role === 'OPERATOR' ? 'DARK' : 'SYSTEM' } },
        permission: { create: permissionsFor(definition.role) },
      },
      select: { id: true, username: true },
    });
    createdUserIds.push(created.id);
    usersCreated.push(created.username);
    credentials.push({ username: created.username, email: definition.email, password });
  }

  const demoCustomers = await ensureDemoCustomers(prisma);
  const demoEquipments = await ensureDemoEquipments(prisma);
  await ensureDemoLifecycle(prisma);
  const demoMaintenancePlans = await ensureDemoMaintenancePlans(prisma, now);
  const demoPmocPlans = await ensureDemoPmocPlans(prisma);
  const demoSignatures = await ensureDemoSignatures(prisma);

  const snapshots = buildDemoSnapshots(now);
  for (const [key, value] of Object.entries(snapshots)) {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: value as Prisma.InputJsonValue },
      update: { value: value as Prisma.InputJsonValue },
    });
  }

  const previousManifest = await readManifest(prisma);
  const manifest: DemoManifest = {
    version: 1,
    createdUserIds: [...new Set([...(previousManifest?.createdUserIds ?? []), ...createdUserIds])],
    createdUsernames: [
      ...new Set([...(previousManifest?.createdUsernames ?? []), ...usersCreated]),
    ],
    createdCustomerIds: [
      ...new Set([...(previousManifest?.createdCustomerIds ?? []), ...demoCustomers.createdIds]),
    ],
    createdAttachmentKeys: [
      ...new Set([
        ...(previousManifest?.createdAttachmentKeys ?? []),
        ...demoCustomers.attachmentKeys,
      ]),
    ],
    createdEquipmentIds: [
      ...new Set([...(previousManifest?.createdEquipmentIds ?? []), ...demoEquipments.createdIds]),
    ],
    createdEquipmentAttachmentKeys: [
      ...new Set([
        ...(previousManifest?.createdEquipmentAttachmentKeys ?? []),
        ...demoEquipments.attachmentKeys,
      ]),
    ],
    createdMaintenancePlanIds: [
      ...new Set([
        ...(previousManifest?.createdMaintenancePlanIds ?? []),
        ...demoMaintenancePlans.createdIds,
      ]),
    ],
    createdPmocPlanIds: [
      ...new Set([...(previousManifest?.createdPmocPlanIds ?? []), ...demoPmocPlans.createdIds]),
    ],
    createdSignatureIds: [
      ...new Set([...(previousManifest?.createdSignatureIds ?? []), ...demoSignatures.createdIds]),
    ],
    createdSignatureImageKeys: [
      ...new Set([
        ...(previousManifest?.createdSignatureImageKeys ?? []),
        ...demoSignatures.imageKeys,
      ]),
    ],
    organizationMode: organization,
    generatedAt: now.toISOString(),
  };
  await prisma.systemSetting.upsert({
    where: { key: DEMO_MANIFEST_KEY },
    create: { key: DEMO_MANIFEST_KEY, value: manifest as unknown as Prisma.InputJsonValue },
    update: { value: manifest as unknown as Prisma.InputJsonValue },
  });

  const result: DemoSeedResult = {
    enabled: true,
    organization,
    usersCreated,
    usersPreserved,
    snapshotKeys: Object.keys(snapshots),
    credentials,
  };
  options.log?.({
    event: 'demo_seed_completed',
    organization,
    usersCreated,
    usersPreserved,
    snapshotKeys: result.snapshotKeys,
  });
  for (const credential of credentials) {
    options.log?.({
      event: 'demo_user_credential_created',
      ...credential,
      warning: 'This password is displayed only during demo seed execution.',
    });
  }
  return result;
}

export async function resetDemoData(
  prisma: PrismaClient,
  options: Omit<DemoSeedOptions, 'enabled' | 'force'> = {},
): Promise<DemoSeedResult> {
  const manifest = await readManifest(prisma);
  if (manifest?.createdEquipmentAttachmentKeys.length) {
    await Promise.all(
      manifest.createdEquipmentAttachmentKeys.map((key) =>
        rm(resolve(process.env.STORAGE_PATH ?? './storage', key), { force: true }),
      ),
    );
  }
  if (manifest?.createdPmocPlanIds.length) {
    await prisma.pmocPlan.deleteMany({
      where: {
        id: { in: manifest.createdPmocPlanIds },
        observations: { startsWith: DEMO_MARKER },
      },
    });
  }
  if (manifest?.createdMaintenancePlanIds.length) {
    await prisma.maintenancePlan.deleteMany({
      where: {
        id: { in: manifest.createdMaintenancePlanIds },
        description: { startsWith: DEMO_MARKER },
      },
    });
  }
  if (manifest?.createdEquipmentIds.length) {
    await prisma.equipment.deleteMany({
      where: {
        id: { in: manifest.createdEquipmentIds },
        observations: { startsWith: DEMO_MARKER },
      },
    });
  }
  if (manifest?.createdSignatureImageKeys.length) {
    await Promise.all(
      manifest.createdSignatureImageKeys.map((key) =>
        rm(resolve(process.env.STORAGE_PATH ?? './storage', key), { force: true }),
      ),
    );
  }
  if (manifest?.createdSignatureIds.length) {
    await prisma.signature.deleteMany({
      where: {
        id: { in: manifest.createdSignatureIds },
        name: { startsWith: 'Demo ' },
      },
    });
  }
  if (manifest?.createdAttachmentKeys.length) {
    await Promise.all(
      manifest.createdAttachmentKeys.map((key) =>
        rm(resolve(process.env.STORAGE_PATH ?? './storage', key), { force: true }),
      ),
    );
  }
  if (manifest?.createdCustomerIds.length) {
    await prisma.customer.deleteMany({
      where: {
        id: { in: manifest.createdCustomerIds },
        notes: { startsWith: DEMO_MARKER },
      },
    });
  }
  if (manifest?.createdUserIds.length) {
    await prisma.user.deleteMany({
      where: {
        id: { in: manifest.createdUserIds },
        notes: { startsWith: DEMO_MARKER },
      },
    });
  }
  await prisma.systemSetting.deleteMany({
    where: { key: { in: [...DEMO_SETTING_KEYS] } },
  });
  return seedDemoData(prisma, { ...options, force: true });
}

async function ensureDemoOrganization(
  prisma: PrismaClient,
): Promise<DemoSeedResult['organization']> {
  const existing = await prisma.organization.findFirst({
    orderBy: { createdAt: 'asc' },
  });
  if (!existing) {
    const organization = await prisma.organization.create({
      data: {
        legalName: 'Climatize Refrigeração LTDA',
        tradeName: 'Climatize Refrigeração',
        cnpj: '21.505.237/0001-02',
        email: 'contato@climatize.com',
        phone: '+55 81 3030-4242',
        city: 'Recife',
        state: 'PE',
        primaryColor: '#2A6ED1',
        secondaryColor: '#2A629D',
        segment: 'HVAC',
        isActive: true,
        settings: {
          create: {
            language: 'pt-BR',
            timezone: 'America/Recife',
            currency: 'BRL',
            documentPrefix: 'CLIMA',
          },
        },
      },
      select: { id: true },
    });
    await ensureSystemTemplates(prisma, organization.id);
    return 'created';
  }

  const bootstrap =
    existing.legalName === 'ERP Operation' &&
    existing.tradeName === 'ERP Operation' &&
    existing.cnpj === '00.000.000/0001-00' &&
    existing.email === 'contato@example.com';
  if (!bootstrap) {
    return 'preserved';
  }

  await prisma.organization.update({
    where: { id: existing.id },
    data: {
      legalName: 'Climatize Refrigeração LTDA',
      tradeName: 'Climatize Refrigeração',
      cnpj: '27.845.316/0001-42',
      email: 'contato@climatize.com',
      phone: '+55 81 3030-4242',
      city: 'Recife',
      state: 'PE',
      primaryColor: '#0F4C5C',
      secondaryColor: '#2A9D8F',
      segment: 'HVAC',
    },
  });
  await prisma.organizationSettings.upsert({
    where: { organizationId: existing.id },
    create: {
      organizationId: existing.id,
      language: 'pt-BR',
      timezone: 'America/Recife',
      currency: 'BRL',
      documentPrefix: 'CLIMA',
    },
    update: { documentPrefix: 'CLIMA' },
  });
  await ensureSystemTemplates(prisma, existing.id);
  return 'converted-bootstrap';
}

async function ensureSystemTemplates(prisma: PrismaClient, organizationId: string): Promise<void> {
  for (const type of Object.values(DocumentTemplateType)) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { organizationId, type },
      select: { id: true },
    });
    if (!existing) {
      await prisma.documentTemplate.create({
        data: {
          organizationId,
          type,
          name: templateName(type),
          headerContent: '',
          footerContent: '',
          observations: '',
          isDefault: true,
          isSystem: true,
        },
      });
    }
  }
}

async function ensureUserRelations(
  prisma: PrismaClient,
  userId: string,
  role: Role,
): Promise<void> {
  await prisma.$transaction([
    prisma.userPreferences.upsert({
      where: { userId },
      create: { userId },
      update: {},
    }),
    prisma.userPermission.upsert({
      where: { userId },
      create: { userId, ...permissionsFor(role) },
      update: {},
    }),
  ]);
}

async function readManifest(prisma: PrismaClient): Promise<DemoManifest | null> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: DEMO_MANIFEST_KEY },
    select: { value: true },
  });
  if (!setting || typeof setting.value !== 'object' || setting.value === null) {
    return null;
  }
  const value = setting.value as Record<string, unknown>;
  if (value.version !== 1 || !Array.isArray(value.createdUserIds)) {
    return null;
  }
  return {
    version: 1,
    createdUserIds: value.createdUserIds.filter((item): item is string => typeof item === 'string'),
    createdUsernames: Array.isArray(value.createdUsernames)
      ? value.createdUsernames.filter((item): item is string => typeof item === 'string')
      : [],
    createdCustomerIds: Array.isArray(value.createdCustomerIds)
      ? value.createdCustomerIds.filter((item): item is string => typeof item === 'string')
      : [],
    createdAttachmentKeys: Array.isArray(value.createdAttachmentKeys)
      ? value.createdAttachmentKeys.filter((item): item is string => typeof item === 'string')
      : [],
    createdEquipmentIds: Array.isArray(value.createdEquipmentIds)
      ? value.createdEquipmentIds.filter((item): item is string => typeof item === 'string')
      : [],
    createdEquipmentAttachmentKeys: Array.isArray(value.createdEquipmentAttachmentKeys)
      ? value.createdEquipmentAttachmentKeys.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
    createdMaintenancePlanIds: Array.isArray(value.createdMaintenancePlanIds)
      ? value.createdMaintenancePlanIds.filter((item): item is string => typeof item === 'string')
      : [],
    createdPmocPlanIds: Array.isArray(value.createdPmocPlanIds)
      ? value.createdPmocPlanIds.filter((item): item is string => typeof item === 'string')
      : [],
    createdSignatureIds: Array.isArray(value.createdSignatureIds)
      ? value.createdSignatureIds.filter((item): item is string => typeof item === 'string')
      : [],
    createdSignatureImageKeys: Array.isArray(value.createdSignatureImageKeys)
      ? value.createdSignatureImageKeys.filter((item): item is string => typeof item === 'string')
      : [],
    organizationMode:
      value.organizationMode === 'created' || value.organizationMode === 'converted-bootstrap'
        ? value.organizationMode
        : 'preserved',
    generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : '',
  };
}

async function ensureDemoCustomers(
  prisma: PrismaClient,
): Promise<{ createdIds: string[]; attachmentKeys: string[] }> {
  const definitions = [
    [
      'Hospital Santa Clara',
      '27.584.162/0001-08',
      'hospital@demo.example',
      'Boa Vista',
      'Recife',
      'PE',
      'Mariana Costa',
      'Engenharia Clínica',
    ],
    [
      'Condomínio Atlântico Sul',
      '42.918.735/0001-61',
      'sindico@atlanticosul.example',
      'Piedade',
      'Jaboatão dos Guararapes',
      'PE',
      'Carlos Menezes',
      'Síndico',
    ],
    [
      'Shopping Recife',
      '10.438.921/0001-45',
      'manutencao@shoppingrecife.example',
      'Boa Viagem',
      'Recife',
      'PE',
      'Paulo Nascimento',
      'Supervisor de Manutenção',
    ],
    [
      'Colégio Boa Viagem',
      '36.927.514/0001-22',
      'administracao@colegioboaviagem.example',
      'Boa Viagem',
      'Recife',
      'PE',
      'Fernanda Lima',
      'Administradora',
    ],
  ] as const;
  const createdIds: string[] = [];
  const attachmentKeys: string[] = [];
  for (const [name, cnpj, email, district, city, state, contactName, contactRole] of definitions) {
    const existing = await prisma.customer.findFirst({
      where: { OR: [{ name }, { cnpj }] },
      select: { id: true },
    });
    if (existing) continue;
    const customer = await prisma.customer.create({
      data: {
        type: 'COMPANY',
        name,
        tradeName: name,
        cnpj,
        email,
        phone: '+55 81 3030-4040',
        notes: `${DEMO_MARKER} Customer created for development and demonstration.`,
        addresses: {
          create: {
            name: 'Unidade principal',
            zipCode: '50000-000',
            street: 'Avenida Principal',
            number: '1000',
            district,
            city,
            state,
            isPrimary: true,
          },
        },
        contacts: {
          create: {
            name: contactName,
            role: contactRole,
            phone: '+55 81 99999-0000',
            email,
            isPrimary: true,
          },
        },
      },
      select: { id: true },
    });
    const storageKey = `customers/${customer.id}/attachments/demo-contract.pdf`;
    const file = Buffer.from('%PDF-1.4\n% Demo customer attachment\n%%EOF\n');
    const path = resolve(process.env.STORAGE_PATH ?? './storage', storageKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file, { flag: 'wx' });
    await prisma.customerAttachment.create({
      data: {
        customerId: customer.id,
        storageKey,
        fileName: 'contrato-demo.pdf',
        mimeType: 'application/pdf',
        fileSize: file.length,
        category: 'CONTRACT',
      },
    });
    createdIds.push(customer.id);
    attachmentKeys.push(storageKey);
  }
  return { createdIds, attachmentKeys };
}

async function ensureDemoEquipments(
  prisma: PrismaClient,
): Promise<{ createdIds: string[]; attachmentKeys: string[] }> {
  const definitions = [
    {
      customer: 'Colégio Boa Viagem',
      name: 'Split Samsung 24.000 BTU',
      type: 'SPLIT',
      manufacturer: 'Samsung',
      model: 'WindFree 24K',
      capacity: '24.000 BTU',
      voltage: '220V',
      tag: 'CBV-SPL-001',
      metric: ['temperature', 22.4, '°C'],
    },
    {
      customer: 'Shopping Recife',
      name: 'Condensadora LG VRF',
      type: 'CONDENSER',
      manufacturer: 'LG',
      model: 'Multi V 5',
      capacity: '20 HP',
      voltage: '380V',
      tag: 'SR-VRF-001',
      metric: ['pressure', 118.2, 'psi'],
    },
    {
      customer: 'Hospital Santa Clara',
      name: 'Chiller Trane 120 TR',
      type: 'CHILLER',
      manufacturer: 'Trane',
      model: 'RTWD',
      capacity: '120 TR',
      voltage: '380V',
      tag: 'HSC-CHI-001',
      metric: ['current', 84.6, 'A'],
    },
    {
      customer: 'Condomínio Atlântico Sul',
      name: 'Inversor Fronius 8kW',
      type: 'SOLAR_INVERTER',
      manufacturer: 'Fronius',
      model: 'Primo 8.2-1',
      capacity: '8.2 kW',
      voltage: '220V',
      tag: 'CAS-INV-001',
      metric: ['voltage', 223.8, 'V'],
    },
    {
      customer: 'Shopping Recife',
      name: 'Evaporadora LG VRF Loja 114',
      type: 'EVAPORATOR',
      manufacturer: 'LG',
      model: 'ARNU24',
      capacity: '24.000 BTU',
      voltage: '220V',
      tag: 'SR-EVA-114',
      metric: ['temperature', 20.8, '°C'],
      parentTag: 'SR-VRF-001',
    },
  ] as const;
  const createdIds: string[] = [];
  const attachmentKeys: string[] = [];

  for (const definition of definitions) {
    const existing = await prisma.equipment.findFirst({
      where: { tag: definition.tag },
      select: { id: true },
    });
    if (existing) continue;
    const customer = await prisma.customer.findFirst({
      where: { name: definition.customer },
      select: {
        id: true,
        addresses: { where: { isPrimary: true }, take: 1, select: { id: true } },
      },
    });
    if (!customer) continue;
    const parent =
      'parentTag' in definition
        ? await prisma.equipment.findFirst({
            where: { tag: definition.parentTag },
            select: { id: true },
          })
        : null;
    const qrToken = randomUUID();
    const equipment = await prisma.equipment.create({
      data: {
        customerId: customer.id,
        addressId: customer.addresses[0]?.id,
        parentEquipmentId: parent?.id,
        type: definition.type,
        status: definition.tag === 'HSC-CHI-001' ? 'MAINTENANCE' : 'ACTIVE',
        name: definition.name,
        tag: definition.tag,
        manufacturer: definition.manufacturer,
        model: definition.model,
        serialNumber: `DEMO-${definition.tag}-2026`,
        capacity: definition.capacity,
        voltage: definition.voltage,
        installationDate: new Date('2024-03-15'),
        warrantyExpiration: new Date('2027-03-15'),
        observations: `${DEMO_MARKER} Equipment created for development and demonstration.`,
        qrToken,
        qrCode: `equipment:${qrToken}`,
        metrics: {
          create: {
            key: definition.metric[0],
            value: definition.metric[1],
            unit: definition.metric[2],
            recordedAt: new Date(),
          },
        },
      },
      select: { id: true },
    });
    const storageKey = `equipments/${equipment.id}/attachments/demo-manual.pdf`;
    const file = Buffer.from('%PDF-1.4\n% Demo equipment manual\n%%EOF\n');
    const path = resolve(process.env.STORAGE_PATH ?? './storage', storageKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file, { flag: 'wx' });
    await prisma.equipmentAttachment.create({
      data: {
        equipmentId: equipment.id,
        storageKey,
        fileName: 'manual-demo.pdf',
        mimeType: 'application/pdf',
        fileSize: file.length,
        category: 'MANUAL',
      },
    });
    createdIds.push(equipment.id);
    attachmentKeys.push(storageKey);
  }
  return { createdIds, attachmentKeys };
}

async function ensureDemoLifecycle(prisma: PrismaClient): Promise<void> {
  const publisher = new LifecyclePublisher(prisma as unknown as PrismaService);
  const equipments = await prisma.equipment.findMany({
    where: {
      tag: { in: ['CBV-SPL-001', 'SR-VRF-001', 'HSC-CHI-001', 'CAS-INV-001', 'SR-EVA-114'] },
      observations: { startsWith: DEMO_MARKER },
    },
    select: { id: true, tag: true, installationDate: true },
  });
  if (equipments.length === 0) return;

  const operator = await prisma.user.findFirst({
    where: { username: { in: ['joao', 'maria', 'ricardo'] } },
    orderBy: { username: 'asc' },
    select: { id: true },
  });

  for (const equipment of equipments) {
    await ensureDemoLifecycleEvent(prisma, {
      publisher,
      equipmentId: equipment.id,
      type: AssetLifecycleEventType.INSTALLATION,
      occurredAt: equipment.installationDate ?? new Date('2024-03-15T11:00:00.000Z'),
      performedBy: operator?.id ?? null,
      description: `${DEMO_MARKER} Instalação inicial registrada para demonstração.`,
      metadata: { demo: true, source: 'demo.seed', tag: equipment.tag },
    });

    await ensureDemoLifecycleEvent(prisma, {
      publisher,
      equipmentId: equipment.id,
      type: AssetLifecycleEventType.INSPECTION,
      occurredAt: new Date('2026-06-20T13:00:00.000Z'),
      performedBy: operator?.id ?? null,
      description: `${DEMO_MARKER} Inspeção visual e conferência operacional.`,
      metadata: { demo: true, source: 'demo.seed', tag: equipment.tag },
    });

    await ensureDemoLifecycleEvent(prisma, {
      publisher,
      equipmentId: equipment.id,
      type:
        equipment.tag === 'HSC-CHI-001'
          ? AssetLifecycleEventType.CORRECTIVE
          : AssetLifecycleEventType.PREVENTIVE,
      occurredAt:
        equipment.tag === 'HSC-CHI-001'
          ? new Date('2026-06-24T16:30:00.000Z')
          : new Date('2026-06-25T12:30:00.000Z'),
      performedBy: operator?.id ?? null,
      description:
        equipment.tag === 'HSC-CHI-001'
          ? `${DEMO_MARKER} Correção de oscilação elétrica e validação de partida.`
          : `${DEMO_MARKER} Manutenção preventiva com limpeza e medição de desempenho.`,
      metadata: { demo: true, source: 'demo.seed', tag: equipment.tag },
    });
  }
}

async function ensureDemoLifecycleEvent(
  prisma: PrismaClient,
  input: {
    publisher: LifecyclePublisher;
    equipmentId: string;
    type: AssetLifecycleEventType;
    occurredAt: Date;
    performedBy: string | null;
    description: string;
    metadata: Prisma.InputJsonValue;
  },
): Promise<void> {
  const existing = await prisma.assetLifecycleEvent.findFirst({
    where: {
      equipmentId: input.equipmentId,
      type: input.type,
      description: input.description,
    },
    select: { id: true },
  });
  if (existing) return;

  await input.publisher.publishManual(
    {
      equipmentId: input.equipmentId,
      type: input.type,
      occurredAt: input.occurredAt.toISOString(),
      performedBy: input.performedBy ?? undefined,
      description: input.description,
      metadata: input.metadata as Record<string, unknown>,
    },
    input.performedBy ?? 'system',
    { requestId: 'demo-seed', ip: null, userAgent: 'demo.seed' },
  );
}

async function ensureDemoMaintenancePlans(
  prisma: PrismaClient,
  now: Date,
): Promise<{ createdIds: string[] }> {
  const definitions = [
    {
      tag: 'CBV-SPL-001',
      name: 'Preventiva mensal - Sala de aula climatizada',
      type: MaintenancePlanType.PREVENTIVE,
      priority: MaintenancePriority.MEDIUM,
      recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
      daysFromNow: 7,
    },
    {
      tag: 'SR-VRF-001',
      name: 'Inspeção quinzenal - VRF lojas',
      type: MaintenancePlanType.INSPECTION,
      priority: MaintenancePriority.HIGH,
      recurrenceRule: { frequency: 'INTERVAL_DAYS', interval: 15 },
      daysFromNow: 4,
    },
    {
      tag: 'HSC-CHI-001',
      name: 'Preventiva crítica - Chiller hospitalar',
      type: MaintenancePlanType.PREVENTIVE,
      priority: MaintenancePriority.CRITICAL,
      recurrenceRule: { frequency: 'MONTHLY', interval: 1 },
      daysFromNow: 2,
    },
    {
      tag: 'CAS-INV-001',
      name: 'Inspeção trimestral - inversor solar',
      type: MaintenancePlanType.INSPECTION,
      priority: MaintenancePriority.MEDIUM,
      recurrenceRule: { frequency: 'INTERVAL_MONTHS', interval: 3 },
      daysFromNow: 18,
    },
  ] as const;

  const createdIds: string[] = [];
  const owner = await prisma.user.findFirst({
    where: { username: 'ninja' },
    select: { id: true },
  });

  for (const definition of definitions) {
    const equipment = await prisma.equipment.findFirst({
      where: {
        tag: definition.tag,
        observations: { startsWith: DEMO_MARKER },
      },
      select: { id: true },
    });
    if (!equipment) continue;

    const existing = await prisma.maintenancePlan.findFirst({
      where: {
        equipmentId: equipment.id,
        name: definition.name,
      },
      select: { id: true },
    });
    if (existing) continue;

    const firstExecution = addDays(now, definition.daysFromNow);
    const plan = await prisma.maintenancePlan.create({
      data: {
        equipmentId: equipment.id,
        name: definition.name,
        description: `${DEMO_MARKER} Plano de manutenção criado para desenvolvimento e demonstração.`,
        type: definition.type,
        active: true,
        priority: definition.priority,
        recurrenceRule: definition.recurrenceRule,
        firstExecution,
        nextExecution: firstExecution,
        createdBy: owner?.id,
        executions: {
          create: [
            {
              scheduledAt: firstExecution,
              status: 'PLANNED',
              notes: `${DEMO_MARKER} Primeira execução planejada.`,
            },
          ],
        },
      },
      select: { id: true },
    });
    createdIds.push(plan.id);
  }

  return { createdIds };
}

async function ensureDemoPmocPlans(prisma: PrismaClient): Promise<{ createdIds: string[] }> {
  const organization = await prisma.organization.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!organization) return { createdIds: [] };

  const definitions = [
    {
      tag: 'HSC-CHI-001',
      responsibleTechnician: 'Ricardo Almeida',
      artNumber: 'ART-PE-2026-00091',
      contractNumber: 'HSC-PMOC-2026',
      environments: [
        ['Central de água gelada', '85 m²', 4],
        ['UTI climatizada', '120 m²', 28],
      ],
    },
    {
      tag: 'SR-VRF-001',
      responsibleTechnician: 'Ricardo Almeida',
      artNumber: 'ART-PE-2026-00112',
      contractNumber: 'SR-PMOC-2026',
      environments: [
        ['Área técnica VRF', '64 m²', 3],
        ['Corredor lojas 100', '210 m²', 160],
      ],
    },
  ] as const;

  const createdIds: string[] = [];
  for (const definition of definitions) {
    const equipment = await prisma.equipment.findFirst({
      where: { tag: definition.tag, observations: { startsWith: DEMO_MARKER } },
      select: { id: true, customerId: true, name: true },
    });
    if (!equipment) continue;

    const existing = await prisma.pmocPlan.findFirst({
      where: { equipmentId: equipment.id },
      select: { id: true },
    });
    if (existing) continue;

    const maintenancePlan = await prisma.maintenancePlan.findFirst({
      where: {
        equipmentId: equipment.id,
        description: { startsWith: DEMO_MARKER },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        executions: {
          orderBy: { scheduledAt: 'asc' },
          take: 1,
          select: { id: true, scheduledAt: true },
        },
      },
    });
    if (!maintenancePlan) continue;

    const pmoc = await prisma.pmocPlan.create({
      data: {
        organizationId: organization.id,
        customerId: equipment.customerId,
        equipmentId: equipment.id,
        maintenancePlanId: maintenancePlan.id,
        coverage: `${DEMO_MARKER} Cobertura preventiva dos ambientes e equipamento vinculados.`,
        periodicity: PmocPeriodicity.MONTHLY,
        generationMode: PmocGenerationMode.MANUAL,
        operationalStatus: PmocOperationalStatus.PENDING,
        lastReservedExecutionNumber: maintenancePlan.executions[0] ? 1 : 0,
        nextExecutionDate: maintenancePlan.executions[0]?.scheduledAt ?? null,
        nextGenerationDate: maintenancePlan.executions[0]?.scheduledAt ?? null,
        responsibleTechnician: definition.responsibleTechnician,
        artNumber: definition.artNumber,
        contractNumber: definition.contractNumber,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-12-31T00:00:00.000Z'),
        active: true,
        observations: `${DEMO_MARKER} PMOC created for development and demonstration.`,
        equipments: { create: [{ equipmentId: equipment.id }] },
        environments: {
          create: definition.environments.map(([name, area, occupancy]) => ({
            name,
            area,
            occupancy,
            observations: `${DEMO_MARKER} PMOC environment.`,
            equipments: { create: [{ equipmentId: equipment.id }] },
          })),
        },
        executionRequests: maintenancePlan.executions[0]
          ? {
              create: {
                maintenanceExecutionId: maintenancePlan.executions[0].id,
                executionNumber: 1,
                executionYear: maintenancePlan.executions[0].scheduledAt.getUTCFullYear(),
                scheduledFor: maintenancePlan.executions[0].scheduledAt,
                origin: PmocExecutionOrigin.MANUAL,
              },
            }
          : undefined,
        history: {
          create: {
            action: PmocHistoryAction.CREATED,
            newStatus: PmocOperationalStatus.PENDING,
            notes: `${DEMO_MARKER} PMOC Foundation initialized.`,
          },
        },
      },
      select: { id: true },
    });
    createdIds.push(pmoc.id);
  }

  return { createdIds };
}

async function ensureDemoSignatures(
  prisma: PrismaClient,
): Promise<{ createdIds: string[]; imageKeys: string[] }> {
  const definitions = [
    ['Demo Responsável Técnico', 'Responsável Técnico', 'demo-responsavel-tecnico.png'],
    ['Demo Supervisor Operacional', 'Supervisor Operacional', 'demo-supervisor-operacional.png'],
  ] as const;
  const createdIds: string[] = [];
  const imageKeys: string[] = [];
  const file = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  );

  for (const [name, title, fileName] of definitions) {
    const existing = await prisma.signature.findFirst({
      where: { name },
      select: { id: true },
    });
    if (existing) continue;

    const storageKey = `documents/signatures/demo/${fileName}`;
    const path = resolve(process.env.STORAGE_PATH ?? './storage', storageKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, file, { flag: 'wx' }).catch((error: unknown) => {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'EEXIST'
      ) {
        return;
      }
      throw error;
    });
    const signature = await prisma.signature.create({
      data: {
        name,
        title,
        imageStorageKey: storageKey,
        mimeType: 'image/png',
        originalFileName: fileName,
        fileSize: file.length,
        active: true,
      },
      select: { id: true },
    });
    createdIds.push(signature.id);
    imageKeys.push(storageKey);
  }

  return { createdIds, imageKeys };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function permissionsFor(role: Role): Prisma.UserPermissionUncheckedCreateWithoutUserInput {
  if (role === Role.OWNER) {
    return {
      canFinancial: true,
      canUsers: true,
      canReports: true,
      canSchedules: true,
      canTemplates: true,
    };
  }
  if (role === Role.MANAGER) {
    return {
      canFinancial: false,
      canUsers: false,
      canReports: true,
      canSchedules: true,
      canTemplates: true,
    };
  }
  return {
    canFinancial: false,
    canUsers: false,
    canReports: false,
    canSchedules: false,
    canTemplates: false,
  };
}

function templateName(type: DocumentTemplateType): string {
  const names: Record<DocumentTemplateType, string> = {
    BUDGET: 'Orçamento padrão',
    QUOTE: 'Orçamento padrão',
    WORK_ORDER: 'Ordem de serviço padrão',
    RECEIPT: 'Recibo padrão',
    REPORT: 'Relatório legado padrão',
    TECHNICAL_REPORT: 'Relatório técnico padrão',
    TECHNICAL_OPINION: 'Laudo técnico padrão',
    PMOC: 'PMOC padrão',
  };
  return names[type];
}

async function runCli(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await seedDemoData(prisma, {
      log: (event) => process.stdout.write(`${JSON.stringify(event)}\n`),
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runCli().catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        event: 'demo_seed_failed',
        message: error instanceof Error ? error.message : 'Unknown demo seed error',
      })}\n`,
    );
    process.exitCode = 1;
  });
}
