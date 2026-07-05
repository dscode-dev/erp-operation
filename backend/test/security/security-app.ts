import { ValidationPipe, VersioningType, type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import * as request from 'supertest';
import type { Response, Test as SupertestRequest } from 'supertest';
import { AppModule } from '../../src/app.module';
import { ARGON2_OPTIONS } from '../../src/infra/security/argon2.constants';
import { API_PREFIX, API_VERSION } from '../../src/shared/constants/api.constants';
import type { AuthenticatedUser } from '../../src/shared/types/authenticated-user.type';
import { prisma, resetDatabase, testId } from '../integration/helpers';

type HttpServer = Parameters<typeof request>[0];

export interface SecurityActor {
  user: AuthenticatedUser;
  password: string;
  accessToken: string;
  refreshToken: string;
}

export interface SecurityApp {
  app: INestApplication;
  http: HttpServer;
}

export async function createSecurityApp(): Promise<SecurityApp> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix(API_PREFIX);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_VERSION,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );
  await app.init();
  return { app, http: app.getHttpServer() as HttpServer };
}

export async function resetSecurityState(): Promise<void> {
  await resetDatabase();
}

export async function closeSecurityApp(app: INestApplication): Promise<void> {
  await app.close();
}

export async function createSecurityActor(
  role: Role,
  usernamePrefix = role.toLowerCase(),
): Promise<SecurityActor> {
  const password = `Orbit!${testId(usernamePrefix)}Aa1`;
  const suffix = testId(usernamePrefix);
  const created = await prisma.user.create({
    data: {
      email: `${suffix}@security.orbit.test`,
      username: suffix.slice(0, 50),
      name: `${role} Security Actor`,
      passwordHash: await argon2.hash(password, ARGON2_OPTIONS),
      role,
      isActive: true,
      mustChangePassword: false,
    },
  });
  const accessTokenId = randomUUID();
  const refreshTokenId = randomUUID();
  const refreshToken = `security-refresh-${refreshTokenId}`;
  await prisma.refreshToken.create({
    data: {
      id: refreshTokenId,
      userId: created.id,
      tokenHash: await argon2.hash(refreshToken, ARGON2_OPTIONS),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  const accessToken = new JwtService().sign(
    {
      sub: created.id,
      username: created.username,
      role: created.role,
      type: 'access',
      sid: refreshTokenId,
      jti: accessTokenId,
    },
    {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE,
      algorithm: 'HS256',
    },
  );
  return {
    user: {
      id: created.id,
      email: created.email,
      username: created.username,
      name: created.name,
      role: created.role,
      isActive: created.isActive,
      mustChangePassword: created.mustChangePassword,
    },
    password,
    accessToken,
    refreshToken,
  };
}

let activeHttpServer: HttpServer | null = null;

export function registerSecurityHttpServer(http: HttpServer): void {
  activeHttpServer = http;
}

export function authGet(actor: SecurityActor, path: string): SupertestRequest {
  return requestFor(path, 'get').set('Authorization', `Bearer ${actor.accessToken}`);
}

export function authPost(actor: SecurityActor, path: string): SupertestRequest {
  return requestFor(path, 'post').set('Authorization', `Bearer ${actor.accessToken}`);
}

export function authPatch(actor: SecurityActor, path: string): SupertestRequest {
  return requestFor(path, 'patch').set('Authorization', `Bearer ${actor.accessToken}`);
}

export function authDelete(actor: SecurityActor, path: string): SupertestRequest {
  return requestFor(path, 'delete').set('Authorization', `Bearer ${actor.accessToken}`);
}

export function errorCode(response: Response): string | undefined {
  const body = response.body as { error?: { code?: string } };
  return body.error?.code;
}

export function dataOf<T>(response: Response): T {
  return (response.body as { data: T }).data;
}

function requestFor(path: string, method: 'get' | 'post' | 'patch' | 'delete'): SupertestRequest {
  if (!activeHttpServer) {
    throw new Error('Security HTTP server was not registered.');
  }
  return request(activeHttpServer)[method](path);
}
