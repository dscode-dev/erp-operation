import { DocumentTemplateType, PrismaClient, Role } from '@prisma/client';
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
      username: 'ninja',
      name: 'Darlan Simplicio',
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
        primaryColor: '#0F172A',
        secondaryColor: '#2563EB',
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
