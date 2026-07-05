import { DocumentTemplateType, Role, SignatureMode } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import { createOrganization, prisma } from '../integration/helpers';
import {
  authDelete,
  authGet,
  authPatch,
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

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0, 0, 0, 0]);

describe('AppSec Signature Domain closure', () => {
  let security: SecurityApp;
  let owner: SecurityActor;
  let manager: SecurityActor;
  let operator: SecurityActor;
  let viewer: SecurityActor;

  beforeAll(async () => {
    security = await createSecurityApp();
    registerSecurityHttpServer(security.http);
  });

  beforeEach(async () => {
    await resetSecurityState();
    await createOrganization();
    owner = await createSecurityActor(Role.OWNER, 'sig-owner');
    manager = await createSecurityActor(Role.MANAGER, 'sig-manager');
    operator = await createSecurityActor(Role.OPERATOR, 'sig-operator');
    viewer = await createSecurityActor(Role.VIEWER, 'sig-viewer');
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('enforces the documented signature RBAC matrix', async () => {
    const signature = await prisma.signature.create({ data: { name: 'Diretoria', title: 'Diretor', active: true } });

    for (const actor of [owner, manager, viewer]) {
      expect((await authGet(actor, '/api/v1/signatures')).status).toBe(200);
      expect((await authGet(actor, `/api/v1/signatures/${signature.id}`)).status).toBe(200);
    }
    expect((await authGet(operator, '/api/v1/signatures')).status).toBe(403);

    for (const actor of [manager, operator, viewer]) {
      expect((await authPost(actor, '/api/v1/signatures').send({ name: 'X', title: 'Y' })).status).toBe(403);
      expect((await authPatch(actor, `/api/v1/signatures/${signature.id}`).send({ name: 'Z' })).status).toBe(403);
      expect((await authDelete(actor, `/api/v1/signatures/${signature.id}`)).status).toBe(403);
    }
  });

  it('rejects spoofed signature uploads and never stores binary data in audit metadata', async () => {
    const signature = await prisma.signature.create({ data: { name: 'Técnico', title: 'Responsável', active: true } });

    const spoof = await authPost(owner, `/api/v1/signatures/${signature.id}/upload`)
      .attach('file', Buffer.from('<svg onload="alert(1)"></svg>'), {
        filename: '../../signature.png',
        contentType: 'image/png',
      });
    expect(spoof.status).toBe(400);
    expect(errorCode(spoof)).toBe(ERROR_CODES.UPLOAD_INVALID_MIME_TYPE);
    await expect(prisma.auditLog.count({ where: { action: 'SIGNATURE_IMAGE_UPLOADED' } })).resolves.toBe(0);

    const mismatch = await authPost(owner, `/api/v1/signatures/${signature.id}/upload`)
      .attach('file', png, { filename: 'signature.jpg', contentType: 'image/jpeg' });
    expect(mismatch.status).toBe(400);
    expect(errorCode(mismatch)).toBe(ERROR_CODES.UPLOAD_INVALID_MIME_TYPE);

    const valid = await authPost(owner, `/api/v1/signatures/${signature.id}/upload`)
      .attach('file', jpeg, { filename: '../Assinatura Final.JPG', contentType: 'image/jpeg' });
    expect(valid.status).toBe(201);

    const saved = await prisma.signature.findUniqueOrThrow({ where: { id: signature.id } });
    expect(saved.imageStorageKey).toMatch(/^documents\/signatures\/[0-9a-f-]+\.jpg$/);
    expect(saved.originalFileName).not.toContain('..');
    expect(saved.originalFileName).not.toContain('/');

    const auditText = JSON.stringify(await prisma.auditLog.findMany({ where: { action: 'SIGNATURE_IMAGE_UPLOADED' } }));
    expect(auditText).not.toContain(png.toString('base64'));
    expect(auditText).not.toContain(jpeg.toString('base64'));
    expect(auditText).not.toContain('imageStorageKey');
  });

  it('rejects unsafe signature/template configuration invariants early', async () => {
    const inactive = await prisma.signature.create({ data: { name: 'Inativa', title: 'Cargo', active: false } });

    const fixedWithoutId = await authPost(owner, '/api/v1/organization/templates').send({
      type: DocumentTemplateType.WORK_ORDER,
      name: 'Modelo fixo sem assinatura',
      headerContent: 'Header',
      footerContent: 'Footer',
      observations: 'Obs',
      requiresSignature: true,
      signatureMode: SignatureMode.FIXED,
    });
    expect(fixedWithoutId.status).toBe(400);
    expect(errorCode(fixedWithoutId)).toBe(ERROR_CODES.VALIDATION_ERROR);

    const inactiveBind = await authPost(owner, '/api/v1/organization/templates').send({
      type: DocumentTemplateType.WORK_ORDER,
      name: 'Modelo assinatura inativa',
      headerContent: 'Header',
      footerContent: 'Footer',
      observations: 'Obs',
      requiresSignature: true,
      signatureMode: SignatureMode.HYBRID,
      signatureId: inactive.id,
    });
    expect(inactiveBind.status).toBe(409);
    expect(errorCode(inactiveBind)).toBe(ERROR_CODES.SIGNATURE_INACTIVE);

    const staleNone = await authPost(owner, '/api/v1/organization/templates').send({
      type: DocumentTemplateType.WORK_ORDER,
      name: 'Modelo none stale',
      headerContent: 'Header',
      footerContent: 'Footer',
      observations: 'Obs',
      requiresSignature: false,
      signatureMode: SignatureMode.NONE,
      signatureId: randomUUID(),
    });
    expect(staleNone.status).toBe(400);
    expect(errorCode(staleNone)).toBe(ERROR_CODES.VALIDATION_ERROR);
  });
});
