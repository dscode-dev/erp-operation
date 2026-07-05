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

beforeAll(() => {
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'pipe',
  });
});
