import { DocumentTemplateType, Prisma, PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { ARGON2_OPTIONS } from '../../infra/security/argon2.constants';
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
        legalName: 'Climatize Nordeste Serviços de Climatização LTDA',
        tradeName: 'Climatize Nordeste',
        cnpj: '27.845.316/0001-42',
        email: 'contato@climatizenordeste.example',
        phone: '+55 81 3030-4242',
        city: 'Recife',
        state: 'PE',
        primaryColor: '#0F4C5C',
        secondaryColor: '#2A9D8F',
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
      legalName: 'Climatize Nordeste Serviços de Climatização LTDA',
      tradeName: 'Climatize Nordeste',
      cnpj: '27.845.316/0001-42',
      email: 'contato@climatizenordeste.example',
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
    QUOTE: 'Orçamento padrão',
    WORK_ORDER: 'Ordem de serviço padrão',
    RECEIPT: 'Recibo padrão',
    REPORT: 'Relatório padrão',
    TECHNICAL_REPORT: 'Relatório técnico padrão',
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
