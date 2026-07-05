import { AssetLifecycleEventType, Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import { createOperation, prisma } from '../integration/helpers';
import {
  authDelete,
  authGet,
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

describe('AppSec Asset Lifecycle closure', () => {
  let security: SecurityApp;
  let owner: SecurityActor;
  let operator: SecurityActor;
  let viewer: SecurityActor;

  beforeAll(async () => {
    security = await createSecurityApp();
    registerSecurityHttpServer(security.http);
  });

  beforeEach(async () => {
    await resetSecurityState();
    owner = await createSecurityActor(Role.OWNER, 'life-owner');
    operator = await createSecurityActor(Role.OPERATOR, 'life-operator');
    viewer = await createSecurityActor(Role.VIEWER, 'life-viewer');
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('does not expose raw metadata, storage keys, user email or financial fields in public timeline responses', async () => {
    const operation = await createOperation(owner.user);
    const event = await prisma.assetLifecycleEvent.create({
      data: {
        equipmentId: operation.equipmentId,
        operationId: operation.id,
        type: AssetLifecycleEventType.NOTE,
        occurredAt: new Date(),
        performedBy: owner.user.id,
        description: 'Nota sensível',
        metadata: {
          costPrice: 123,
          marginPercentage: 44,
          storageKey: 'private/path.pdf',
          passwordHash: 'argon2-secret',
          token: 'jwt-secret',
          contentBase64: Buffer.from('secret').toString('base64'),
          financialAccountBalance: 9999,
        },
      },
    });
    await prisma.assetLifecycleAttachment.create({
      data: {
        eventId: event.id,
        storageKey: 'asset-lifecycle/private/attachment.pdf',
        originalFileName: '../../invoice.pdf',
        mimeType: 'application/pdf',
        fileSize: 10,
        category: 'evidence',
      },
    });

    for (const actor of [operator, viewer]) {
      const list = await authGet(actor, `/api/v1/asset-lifecycle?operationId=${operation.id}`);
      expect(list.status).toBe(200);
      const detail = await authGet(actor, `/api/v1/asset-lifecycle/${event.id}`);
      expect(detail.status).toBe(200);

      const combined = `${list.text}\n${detail.text}`;
      for (const forbidden of [
          '"metadata"',
        'costPrice',
        'marginPercentage',
        'passwordHash',
        'token',
        'contentBase64',
        'financialAccountBalance',
        'storageKey',
        'private/path.pdf',
        owner.user.email,
      ]) {
        expect(combined).not.toContain(forbidden);
      }
      expect(combined).toContain('timeline');
    }
  });

  it('validates lifecycle filters and attachment parent-child authorization', async () => {
    const opA = await createOperation(owner.user);
    const opB = await createOperation(owner.user);
    const eventA = await prisma.assetLifecycleEvent.create({
      data: {
        equipmentId: opA.equipmentId,
        type: AssetLifecycleEventType.NOTE,
        occurredAt: new Date(),
        performedBy: owner.user.id,
        description: 'A',
        metadata: {},
      },
    });
    const eventB = await prisma.assetLifecycleEvent.create({
      data: {
        equipmentId: opB.equipmentId,
        type: AssetLifecycleEventType.NOTE,
        occurredAt: new Date(),
        performedBy: owner.user.id,
        description: 'B',
        metadata: {},
      },
    });
    const attachment = await prisma.assetLifecycleAttachment.create({
      data: {
        eventId: eventA.id,
        storageKey: 'asset-lifecycle/event-a/attachment.pdf',
        originalFileName: 'attachment.pdf',
        mimeType: 'application/pdf',
        fileSize: 10,
        category: 'evidence',
      },
    });

    const invalidFilter = await authGet(operator, '/api/v1/asset-lifecycle?equipmentId=not-a-uuid');
    expect(invalidFilter.status).toBe(400);
    expect(errorCode(invalidFilter)).toBe(ERROR_CODES.VALIDATION_ERROR);

    const wrongParentDelete = await authDelete(owner, `/api/v1/asset-lifecycle/${eventB.id}/attachments/${attachment.id}`);
    expect(wrongParentDelete.status).toBe(404);
    expect(errorCode(wrongParentDelete)).toBe(ERROR_CODES.ASSET_LIFECYCLE_ATTACHMENT_NOT_FOUND);

    const deniedDelete = await authDelete(operator, `/api/v1/asset-lifecycle/${eventA.id}/attachments/${attachment.id}`);
    expect(deniedDelete.status).toBe(403);
    expect(errorCode(deniedDelete)).toBe(ERROR_CODES.FORBIDDEN);

    const nonexistentUpload = await authPost(owner, `/api/v1/asset-lifecycle/${randomUUID()}/attachments`)
      .field('category', 'evidence')
      .attach('file', Buffer.from('%PDF-1.4\n'), { filename: 'file.pdf', contentType: 'application/pdf' });
    expect(nonexistentUpload.status).toBe(404);
    expect(errorCode(nonexistentUpload)).toBe(ERROR_CODES.ASSET_LIFECYCLE_EVENT_NOT_FOUND);
  });

  it('rejects lifecycle attachment MIME spoofing and returns sanitized attachment payloads', async () => {
    const operation = await createOperation(owner.user);
    const event = await prisma.assetLifecycleEvent.create({
      data: {
        equipmentId: operation.equipmentId,
        type: AssetLifecycleEventType.NOTE,
        occurredAt: new Date(),
        performedBy: owner.user.id,
        description: 'Attachment test',
        metadata: {},
      },
    });

    const spoof = await authPost(owner, `/api/v1/asset-lifecycle/${event.id}/attachments`)
      .field('category', 'evidence')
      .attach('file', Buffer.from('not a pdf'), { filename: '../../proof.pdf', contentType: 'application/pdf' });
    expect(spoof.status).toBe(400);
    expect(errorCode(spoof)).toBe(ERROR_CODES.UPLOAD_INVALID_MIME_TYPE);

    const valid = await authPost(owner, `/api/v1/asset-lifecycle/${event.id}/attachments`)
      .field('category', 'evidence')
      .attach('file', Buffer.from('%PDF-1.4\n'), { filename: '../../proof.pdf', contentType: 'application/pdf' });
    expect(valid.status).toBe(201);
    expect(valid.text).not.toContain('storageKey');
    expect(valid.text).not.toContain('..');

    const list = await authGet(viewer, `/api/v1/asset-lifecycle/${event.id}/attachments`);
    expect(list.status).toBe(200);
    expect(list.text).not.toContain('storageKey');
    expect(list.text).not.toContain('asset-lifecycle/');
  });
});
