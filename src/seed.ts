import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { ARGON2_OPTIONS } from './infra/security/argon2.constants';

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
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username: 'ninja' }],
    },
    select: { id: true, email: true, username: true, role: true },
  });

  if (existing) {
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
