import { STORAGE_PROVIDERS, type StorageProvider } from '../../infra/storage/storage-provider.type';

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'test' | 'production';
  APP_NAME: string;
  APP_PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN_SECONDS: number;
  JWT_REFRESH_EXPIRES_IN_SECONDS: number;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  CORS_ORIGINS: string[];
  STORAGE_PROVIDER: StorageProvider;
  RATE_LIMIT_TTL_MS: number;
  RATE_LIMIT_MAX: number;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

const REQUIRED_VARIABLES = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN_SECONDS',
  'JWT_REFRESH_EXPIRES_IN_SECONDS',
  'JWT_ISSUER',
  'JWT_AUDIENCE',
  'APP_NAME',
  'APP_PORT',
  'CORS_ORIGINS',
  'STORAGE_PROVIDER',
] as const;

function requireString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value.trim();
}

function optionalString(
  config: Record<string, unknown>,
  key: string,
  defaultValue: string,
): string {
  const value = config[key];
  if (value === undefined) {
    return defaultValue;
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Environment variable ${key} must be a non-empty string`);
  }
  return value.trim();
}

function parsePositiveInteger(value: string, key: string, maximum?: number): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Environment variable ${key} must be a positive integer`);
  }

  const parsed = Number(value);
  if (parsed < 1 || (maximum !== undefined && parsed > maximum)) {
    throw new Error(
      `Environment variable ${key} must be between 1 and ${maximum ?? Number.MAX_SAFE_INTEGER}`,
    );
  }
  return parsed;
}

function parseCorsOrigins(rawOrigins: string): string[] {
  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes('*')) {
    throw new Error('CORS_ORIGINS must contain explicit origins and cannot contain wildcards');
  }

  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
        throw new Error();
      }
    } catch {
      throw new Error(`CORS_ORIGINS contains an invalid origin: ${origin}`);
    }
  }

  return [...new Set(origins)];
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  for (const key of REQUIRED_VARIABLES) {
    requireString(config, key);
  }

  const nodeEnv = (config.NODE_ENV ?? 'development') as string;
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const jwtSecret = requireString(config, 'JWT_SECRET');
  const jwtRefreshSecret = requireString(config, 'JWT_REFRESH_SECRET');
  if (jwtSecret.length < 32 || jwtRefreshSecret.length < 32) {
    throw new Error('JWT secrets must contain at least 32 characters');
  }
  if (jwtSecret === jwtRefreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }

  const storageProvider = requireString(config, 'STORAGE_PROVIDER');
  if (!STORAGE_PROVIDERS.includes(storageProvider as StorageProvider)) {
    throw new Error('STORAGE_PROVIDER must be local or s3');
  }

  const logLevel = optionalString(config, 'LOG_LEVEL', 'info');
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    throw new Error('LOG_LEVEL must be debug, info, warn, or error');
  }

  return {
    NODE_ENV: nodeEnv as EnvironmentVariables['NODE_ENV'],
    APP_NAME: requireString(config, 'APP_NAME'),
    APP_PORT: parsePositiveInteger(requireString(config, 'APP_PORT'), 'APP_PORT', 65535),
    DATABASE_URL: requireString(config, 'DATABASE_URL'),
    JWT_SECRET: jwtSecret,
    JWT_REFRESH_SECRET: jwtRefreshSecret,
    JWT_ACCESS_EXPIRES_IN_SECONDS: parsePositiveInteger(
      requireString(config, 'JWT_ACCESS_EXPIRES_IN_SECONDS'),
      'JWT_ACCESS_EXPIRES_IN_SECONDS',
      86400,
    ),
    JWT_REFRESH_EXPIRES_IN_SECONDS: parsePositiveInteger(
      requireString(config, 'JWT_REFRESH_EXPIRES_IN_SECONDS'),
      'JWT_REFRESH_EXPIRES_IN_SECONDS',
      31536000,
    ),
    JWT_ISSUER: requireString(config, 'JWT_ISSUER'),
    JWT_AUDIENCE: requireString(config, 'JWT_AUDIENCE'),
    CORS_ORIGINS: parseCorsOrigins(requireString(config, 'CORS_ORIGINS')),
    STORAGE_PROVIDER: storageProvider as EnvironmentVariables['STORAGE_PROVIDER'],
    RATE_LIMIT_TTL_MS: parsePositiveInteger(
      optionalString(config, 'RATE_LIMIT_TTL_MS', '60000'),
      'RATE_LIMIT_TTL_MS',
    ),
    RATE_LIMIT_MAX: parsePositiveInteger(
      optionalString(config, 'RATE_LIMIT_MAX', '100'),
      'RATE_LIMIT_MAX',
    ),
    LOG_LEVEL: logLevel as EnvironmentVariables['LOG_LEVEL'],
  };
}
