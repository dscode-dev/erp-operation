import { execFileSync } from 'node:child_process';
import { URL } from 'node:url';

function assertSafeTestDatabase(url: string | undefined): asserts url is string {
  if (!url) {
    throw new Error('TEST_DATABASE_URL is required for real PostgreSQL integration tests.');
  }
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, '');
  if (!database.endsWith('_test')) {
    throw new Error(`Refusing to run integration tests against non-test database "${database}". Use a *_test database.`);
  }
  if (parsed.hostname.includes('prod') || database.includes('prod')) {
    throw new Error('Refusing to run integration tests against a production-looking database.');
  }
}

assertSafeTestDatabase(process.env.TEST_DATABASE_URL);
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.APP_NAME = process.env.APP_NAME ?? 'Orbit Security Test';
process.env.APP_PORT = process.env.APP_PORT ?? '3001';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'security-test-access-secret-at-least-thirty-two-characters';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'security-test-refresh-secret-at-least-thirty-two-characters';
process.env.JWT_ACCESS_EXPIRES_IN_SECONDS = process.env.JWT_ACCESS_EXPIRES_IN_SECONDS ?? '900';
process.env.JWT_REFRESH_EXPIRES_IN_SECONDS =
  process.env.JWT_REFRESH_EXPIRES_IN_SECONDS ?? '2592000';
process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'orbit-security-tests';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'orbit-security-suite';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3000';
process.env.STORAGE_PROVIDER = process.env.STORAGE_PROVIDER ?? 'local';
process.env.STORAGE_DRIVER = process.env.STORAGE_DRIVER ?? 'local';
process.env.STORAGE_PATH = process.env.STORAGE_PATH ?? '/tmp/orbit-security-storage';
process.env.RATE_LIMIT_TTL_MS = '60000';
process.env.RATE_LIMIT_MAX = '10000';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'error';
process.env.ENABLE_DEMO_DATA = process.env.ENABLE_DEMO_DATA ?? 'false';
process.env.ENABLE_DEMO_ENDPOINTS = process.env.ENABLE_DEMO_ENDPOINTS ?? 'false';

beforeAll(() => {
  if (process.env.ORBIT_TEST_SKIP_MIGRATE === 'true') return;
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'pipe',
  });
});
