import { Role } from '@prisma/client';
import * as request from 'supertest';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import { createOrganization, prisma } from '../integration/helpers';
import {
  authPost,
  closeSecurityApp,
  createSecurityActor,
  createSecurityApp,
  errorCode,
  registerSecurityHttpServer,
  resetSecurityState,
  type SecurityActor,
  type SecurityApp,
} from './security-app';

describe('AppSec audit metadata and rate-limit closure', () => {
  let security: SecurityApp;
  let owner: SecurityActor;

  beforeAll(async () => {
    security = await createSecurityApp();
    registerSecurityHttpServer(security.http);
  });

  beforeEach(async () => {
    await resetSecurityState();
    await createOrganization();
    owner = await createSecurityActor(Role.OWNER, 'audit-owner');
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('keeps audit metadata free of credentials, binary payloads and raw request body material', async () => {
    const signature = await authPost(owner, '/api/v1/signatures').send({
      name: 'Assinatura Auditável',
      title: 'Responsável',
    });
    expect(signature.status).toBe(201);
    const signatureId = (signature.body as { data: { id: string } }).data.id;
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const invalidUpload = await authPost(owner, `/api/v1/signatures/${signatureId}/upload`)
      .attach('file', Buffer.from('spoof'), { filename: 'signature.png', contentType: 'image/png' });
    expect(invalidUpload.status).toBe(400);

    const validUpload = await authPost(owner, `/api/v1/signatures/${signatureId}/upload`)
      .attach('file', png, { filename: 'signature.png', contentType: 'image/png' });
    expect(validUpload.status).toBe(201);

    const auditLogs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'asc' } });
    const serialized = JSON.stringify(auditLogs);
    for (const forbidden of [
      'passwordHash',
      'accessToken',
      'refreshToken',
      'authorization',
      'Bearer ',
      'DATABASE_URL',
      'contentBase64',
      png.toString('base64'),
      'spoof',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(auditLogs.filter((log) => log.action === 'SIGNATURE_IMAGE_UPLOADED')).toHaveLength(1);
  });
});

describe('AppSec rate-limit and forwarded-header trust closure', () => {
  let lowLimit: SecurityApp;
  const previousMax = process.env.RATE_LIMIT_MAX;
  const previousTtl = process.env.RATE_LIMIT_TTL_MS;

  beforeAll(async () => {
    process.env.RATE_LIMIT_MAX = '2';
    process.env.RATE_LIMIT_TTL_MS = '60000';
    lowLimit = await createSecurityApp();
  });

  afterAll(async () => {
    await closeSecurityApp(lowLimit.app);
    process.env.RATE_LIMIT_MAX = previousMax ?? '10000';
    process.env.RATE_LIMIT_TTL_MS = previousTtl ?? '60000';
  });

  it('applies global throttling and is not bypassed by spoofed forwarded IP headers on direct app access', async () => {
    let throttled: request.Response | null = null;
    for (let index = 0; index < 11; index += 1) {
      const response = await request(lowLimit.http)
        .post('/api/v1/auth/login')
        .set('X-Forwarded-For', `203.0.113.${index + 1}`)
        .send({ email: `missing-${index}@orbit.test`, password: 'invalid-password' });
      if (response.status === 429) {
        throttled = response;
        break;
      }
      expect(response.status).toBe(401);
    }

    expect(throttled?.status).toBe(429);
    expect(throttled ? errorCode(throttled) : undefined).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
  });
});
