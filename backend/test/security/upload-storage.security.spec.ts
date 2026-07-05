import { BrandAssetType, Role } from '@prisma/client';
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

describe('AppSec upload and storage boundary', () => {
  let security: SecurityApp;
  let owner: SecurityActor;
  let manager: SecurityActor;

  beforeAll(async () => {
    security = await createSecurityApp();
    registerSecurityHttpServer(security.http);
  });

  beforeEach(async () => {
    await resetSecurityState();
    await createOrganization();
    owner = await createSecurityActor(Role.OWNER, 'upload-owner');
    manager = await createSecurityActor(Role.MANAGER, 'upload-manager');
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('rejects MIME and extension spoofing when binary signature does not match', async () => {
    const response = await authPost(owner, '/api/v1/organization/assets')
      .field('type', BrandAssetType.LOGO)
      .attach('file', Buffer.from('not a png'), {
        filename: '../../logo.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(errorCode(response)).toBe(ERROR_CODES.UPLOAD_INVALID_MIME_TYPE);
    await expect(prisma.brandAsset.count()).resolves.toBe(0);
  });

  it('rejects active SVG payloads with event handlers', async () => {
    const response = await authPost(owner, '/api/v1/organization/assets')
      .field('type', BrandAssetType.LOGO)
      .attach('file', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'), {
        filename: 'logo.svg',
        contentType: 'image/svg+xml',
      });

    expect(response.status).toBe(400);
    expect(errorCode(response)).toBe(ERROR_CODES.UPLOAD_INVALID_MIME_TYPE);
    await expect(prisma.brandAsset.count()).resolves.toBe(0);
  });

  it('stores valid assets with server-generated storage keys and sanitized names', async () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
    const response = await authPost(owner, '/api/v1/organization/assets')
      .field('type', BrandAssetType.LOGO)
      .attach('file', png, {
        filename: '../Orbit Logo.PNG',
        contentType: 'image/png',
      });

    expect(response.status).toBe(201);
    const asset = await prisma.brandAsset.findFirstOrThrow();
    expect(asset.storageKey).toMatch(/^organization\/logo\/[0-9a-f-]+\.png$/);
    expect(asset.originalFileName).not.toContain('..');
    expect(asset.originalFileName).not.toContain('/');
  });

  it('denies restricted asset upload to MANAGER', async () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const response = await authPost(manager, '/api/v1/organization/assets')
      .field('type', BrandAssetType.LOGO)
      .attach('file', png, {
        filename: 'logo.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(403);
    expect(errorCode(response)).toBe(ERROR_CODES.FORBIDDEN);
    await expect(prisma.brandAsset.count()).resolves.toBe(0);
  });
});
