import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { ARGON2_OPTIONS } from './infra/security/argon2.constants';
import { MIN_PASSWORD_LENGTH } from './shared/constants/users.constants';

const prisma = new PrismaClient();

type OwnerBootstrapInput = {
  email: string;
  username: string;
  name: string;
  password: string;
};

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required to bootstrap the initial OWNER`);
  return value;
}

function ownerBootstrapInput(): OwnerBootstrapInput {
  const input = {
    email: requiredEnvironment('OWNER_EMAIL').toLowerCase(),
    username: requiredEnvironment('OWNER_USERNAME').toLowerCase(),
    name: requiredEnvironment('OWNER_NAME'),
    password: requiredEnvironment('OWNER_PASSWORD'),
  };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 254) {
    throw new Error('OWNER_EMAIL must be a valid email address with at most 254 characters');
  }
  if (!/^[a-z0-9._-]{3,50}$/.test(input.username)) {
    throw new Error(
      'OWNER_USERNAME must contain 3 to 50 lowercase letters, numbers, dots, underscores or hyphens',
    );
  }
  if (input.name.length < 2 || input.name.length > 150) {
    throw new Error('OWNER_NAME must contain between 2 and 150 characters');
  }
  if (input.password.length < MIN_PASSWORD_LENGTH || input.password.length > 128) {
    throw new Error(
      `OWNER_PASSWORD must contain between ${MIN_PASSWORD_LENGTH} and 128 characters`,
    );
  }
  const normalizedPassword = input.password.toLowerCase();
  if (
    ['replace_with', 'change_me', 'changeme', 'example', 'password'].some((fragment) =>
      normalizedPassword.includes(fragment),
    )
  ) {
    throw new Error('OWNER_PASSWORD must not use a placeholder or example value');
  }

  return input;
}

async function main(): Promise<void> {
  const input = ownerBootstrapInput();
  const [emailUser, usernameUser, userCount] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.user.findUnique({ where: { username: input.username } }),
    prisma.user.count(),
  ]);

  if (emailUser || usernameUser) {
    if (!emailUser || !usernameUser || emailUser.id !== usernameUser.id) {
      throw new Error('OWNER_EMAIL and OWNER_USERNAME belong to different existing users');
    }
    if (emailUser.role !== Role.OWNER) {
      throw new Error('The configured bootstrap user exists but is not an OWNER');
    }
    if (!emailUser.isActive || emailUser.disabledAt) {
      throw new Error('The configured bootstrap OWNER is disabled');
    }

    await ensureOwnerFoundation(emailUser.id);
    process.stdout.write(
      `${JSON.stringify({
        event: 'owner_bootstrap_skipped',
        reason: 'owner_already_exists',
        userId: emailUser.id,
      })}\n`,
    );
    return;
  }

  if (userCount > 0) {
    throw new Error(
      'The database already contains users. The bootstrap seed can only create the first OWNER',
    );
  }

  const passwordHash = await argon2.hash(input.password, ARGON2_OPTIONS);
  const owner = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      name: input.name,
      passwordHash,
      role: Role.OWNER,
      isActive: true,
      mustChangePassword: true,
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
    select: { id: true, email: true, username: true, name: true, role: true },
  });

  process.stdout.write(
    `${JSON.stringify({
      event: 'owner_bootstrap_created',
      user: owner,
      mustChangePassword: true,
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

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        event: 'owner_bootstrap_failed',
        message: error instanceof Error ? error.message : 'Unknown bootstrap error',
      })}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
