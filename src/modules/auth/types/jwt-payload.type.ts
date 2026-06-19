import type { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: Role;
  type: 'access';
  jti: string;
  sid: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  jti: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

export interface AuthRequestContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}
