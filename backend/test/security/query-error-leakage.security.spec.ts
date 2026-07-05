import { Role } from '@prisma/client';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import {
  authGet,
  closeSecurityApp,
  createSecurityActor,
  createSecurityApp,
  errorCode,
  registerSecurityHttpServer,
  resetSecurityState,
  type SecurityActor,
  type SecurityApp,
} from './security-app';

describe('AppSec pagination, filter abuse and error leakage', () => {
  let security: SecurityApp;
  let owner: SecurityActor;

  beforeAll(async () => {
    security = await createSecurityApp();
    registerSecurityHttpServer(security.http);
  });

  beforeEach(async () => {
    await resetSecurityState();
    owner = await createSecurityActor(Role.OWNER, 'query-owner');
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it.each([
    ['/api/v1/products?page=0', ERROR_CODES.VALIDATION_ERROR],
    ['/api/v1/products?limit=100000', ERROR_CODES.VALIDATION_ERROR],
    ['/api/v1/financial/entries?accountId=not-a-uuid', ERROR_CODES.VALIDATION_ERROR],
    ['/api/v1/financial/entries?status=PAID;DROP TABLE users', ERROR_CODES.VALIDATION_ERROR],
  ])('rejects abusive query %s with stable validation errors', async (path, expectedCode) => {
    const response = await authGet(owner, path);
    expect(response.status).toBe(400);
    expect(errorCode(response)).toBe(expectedCode);
    expect(response.text).not.toContain('SELECT');
    expect(response.text).not.toContain('Prisma');
    expect(response.text).not.toContain(process.cwd());
  });

  it('normalizes malformed UUID route errors without leaking internals', async () => {
    const response = await authGet(owner, '/api/v1/financial/entries/not-a-uuid');

    expect(response.status).toBe(400);
    expect(response.text).not.toContain('Prisma');
    expect(response.text).not.toContain('schema');
    expect(response.text).not.toContain(process.env.DATABASE_URL ?? 'DATABASE_URL');
  });
});
