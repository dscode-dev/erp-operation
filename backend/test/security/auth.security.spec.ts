import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import { prisma } from '../integration/helpers';
import {
  closeSecurityApp,
  createSecurityActor,
  createSecurityApp,
  dataOf,
  errorCode,
  registerSecurityHttpServer,
  resetSecurityState,
  type SecurityApp,
} from './security-app';

describe('AppSec authentication boundary', () => {
  let security: SecurityApp;

  beforeAll(async () => {
    security = await createSecurityApp();
    registerSecurityHttpServer(security.http);
  });

  beforeEach(async () => {
    await resetSecurityState();
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('rejects missing and malformed bearer tokens with stable errors', async () => {
    const missing = await request(security.http).get('/api/v1/auth/me');
    expect(missing.status).toBe(401);
    expect(errorCode(missing)).toBe(ERROR_CODES.UNAUTHORIZED);

    const malformed = await request(security.http)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-valid-jwt');
    expect(malformed.status).toBe(401);
    expect(errorCode(malformed)).toBe(ERROR_CODES.AUTH_INVALID_TOKEN);
    expect(malformed.text).not.toContain('Prisma');
    expect(malformed.text).not.toContain('DATABASE_URL');
  });

  it('rejects an already-issued token after the user is deactivated', async () => {
    const owner = await createSecurityActor(Role.OWNER, 'inactive-owner');
    await prisma.user.update({ where: { id: owner.user.id }, data: { isActive: false } });

    const response = await request(security.http)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(401);
    expect(errorCode(response)).toBe(ERROR_CODES.AUTH_USER_INACTIVE);
  });

  it('does not trust a manipulated role claim from an otherwise valid session', async () => {
    const owner = await createSecurityActor(Role.OWNER, 'claim-owner');
    const session = await prisma.refreshToken.findFirstOrThrow({
      where: { userId: owner.user.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    const token = new JwtService().sign(
      {
        sub: owner.user.id,
        username: owner.user.username,
        role: 'OPERATOR',
        type: 'access',
        sid: session.id,
        jti: randomUUID(),
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
        algorithm: 'HS256',
      },
    );

    const response = await request(security.http)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(dataOf<{ role: Role }>(response).role).toBe(Role.OWNER);
  });
});
