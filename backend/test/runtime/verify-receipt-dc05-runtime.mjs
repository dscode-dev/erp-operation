import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { unlink, writeFile } from 'node:fs/promises';
import argon2 from 'argon2';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

if (process.env.ORBIT_RUNTIME_VERIFY !== 'true') throw new Error('ORBIT_RUNTIME_VERIFY=true is required.');
dotenv.config({ path: new URL('../../../.env', import.meta.url), quiet: true });
process.env.DATABASE_URL ??= `postgresql://${encodeURIComponent(process.env.POSTGRES_USER ?? '')}:${encodeURIComponent(process.env.POSTGRES_PASSWORD ?? '')}@127.0.0.1:5432/${encodeURIComponent(process.env.POSTGRES_DB ?? '')}?schema=public`;
const prisma = new PrismaClient();
const credentialsPath = '/private/tmp/orbit-dc05-credentials.json';
const owner = await prisma.user.findFirst({ where: { role: 'OWNER', isActive: true, disabledAt: null }, orderBy: { createdAt: 'asc' } });
if (!owner) throw new Error('An active OWNER is required for runtime verification.');
const originalHash = owner.passwordHash;
const temporaryPassword = `Dc05!${randomBytes(18).toString('base64url')}`;

try {
  await prisma.user.update({ where: { id: owner.id }, data: { passwordHash: await argon2.hash(temporaryPassword), mustChangePassword: false } });
  await writeFile(credentialsPath, JSON.stringify({ email: owner.email, password: temporaryPassword }), { mode: 0o600 });
  const runtime = spawnSync('node', ['frontend/test/runtime/verify-receipt-dc05-runtime.mjs'], {
    cwd: new URL('../../../', import.meta.url),
    env: { ...process.env, ORBIT_RUNTIME_CREDENTIALS: credentialsPath },
    encoding: 'utf8',
  });
  if (runtime.stdout) process.stdout.write(runtime.stdout);
  if (runtime.stderr) process.stderr.write(runtime.stderr);
  if (runtime.status !== 0) throw new Error(`Runtime process exited with ${runtime.status}`);
  const ui = spawnSync('node', ['frontend/test/runtime/verify-receipt-dc05-ui.mjs'], {
    cwd: new URL('../../../', import.meta.url),
    env: { ...process.env, ORBIT_RUNTIME_CREDENTIALS: credentialsPath },
    encoding: 'utf8',
  });
  if (ui.stdout) process.stdout.write(ui.stdout);
  if (ui.stderr) process.stderr.write(ui.stderr);
  if (ui.status !== 0) throw new Error(`UI runtime process exited with ${ui.status}`);
} finally {
  await prisma.user.update({ where: { id: owner.id }, data: { passwordHash: originalHash } });
  await prisma.$disconnect();
  await unlink(credentialsPath).catch(() => undefined);
}
