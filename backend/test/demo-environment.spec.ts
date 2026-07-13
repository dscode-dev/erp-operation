import { validateEnvironment } from '../src/modules/config/configuration';

const baseEnvironment: Record<string, unknown> = {
  NODE_ENV: 'development',
  APP_NAME: 'ERP',
  APP_PORT: '3000',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/erp',
  JWT_SECRET: 'access-secret-with-at-least-32-characters',
  JWT_REFRESH_SECRET: 'refresh-secret-with-at-least-32-characters',
  JWT_ACCESS_EXPIRES_IN_SECONDS: '900',
  JWT_REFRESH_EXPIRES_IN_SECONDS: '2592000',
  JWT_ISSUER: 'erp',
  JWT_AUDIENCE: 'clients',
  CORS_ORIGINS: 'http://localhost:3001',
  STORAGE_PROVIDER: 'local',
  STORAGE_DRIVER: 'local',
  STORAGE_PATH: './storage',
};

describe('demo environment policy', () => {
  it('defaults both demo flags to false', () => {
    const environment = validateEnvironment(baseEnvironment);
    expect(environment.ENABLE_DEMO_DATA).toBe(false);
    expect(environment.ENABLE_DEMO_ENDPOINTS).toBe(false);
    expect(environment.HTTP_JSON_BODY_LIMIT_BYTES).toBe(1_048_576);
    expect(environment.OPERATION_JSON_BODY_LIMIT_BYTES).toBe(125_829_120);
  });

  it('validates configurable JSON body limits', () => {
    const environment = validateEnvironment({
      ...baseEnvironment,
      HTTP_JSON_BODY_LIMIT_BYTES: '2097152',
      OPERATION_JSON_BODY_LIMIT_BYTES: '67108864',
    });

    expect(environment.HTTP_JSON_BODY_LIMIT_BYTES).toBe(2_097_152);
    expect(environment.OPERATION_JSON_BODY_LIMIT_BYTES).toBe(67_108_864);
    expect(() =>
      validateEnvironment({
        ...baseEnvironment,
        OPERATION_JSON_BODY_LIMIT_BYTES: String(129 * 1024 * 1024),
      }),
    ).toThrow('OPERATION_JSON_BODY_LIMIT_BYTES');
  });

  it('allows demo flags in development', () => {
    const environment = validateEnvironment({
      ...baseEnvironment,
      ENABLE_DEMO_DATA: 'true',
      ENABLE_DEMO_ENDPOINTS: 'true',
    });
    expect(environment.ENABLE_DEMO_DATA).toBe(true);
    expect(environment.ENABLE_DEMO_ENDPOINTS).toBe(true);
  });

  it('rejects demo data and endpoints in production', () => {
    expect(() =>
      validateEnvironment({
        ...baseEnvironment,
        NODE_ENV: 'production',
        ENABLE_DEMO_DATA: 'true',
        ENABLE_DEMO_ENDPOINTS: 'false',
      }),
    ).toThrow('Demo data and demo endpoints must be disabled in production');
  });
});
