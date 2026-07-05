import { BudgetStatus, DocumentTemplateType, OperationDocumentStatus, Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ERROR_CODES } from '../../src/shared/constants/error-codes.constants';
import { createBudgetFixture, createOperation, createOrganization, prisma, testId } from '../integration/helpers';
import {
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

describe('AppSec Document Engine closure', () => {
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
    owner = await createSecurityActor(Role.OWNER, 'doc-owner');
    manager = await createSecurityActor(Role.MANAGER, 'doc-manager');
    operator = await createSecurityActor(Role.OPERATOR, 'doc-operator');
    viewer = await createSecurityActor(Role.VIEWER, 'doc-viewer');
  });

  afterAll(async () => {
    await closeSecurityApp(security.app);
  });

  it('enforces document type RBAC through direct operation document endpoints', async () => {
    await createOrganization();
    const operation = await createOperation(owner.user);

    await expect(authGet(owner, `/api/v1/documents/operations/${operation.id}/QUOTE/preview`))
      .resolves.toHaveProperty('status', 200);

    for (const actor of [manager, operator, viewer]) {
      const preview = await authGet(actor, `/api/v1/documents/operations/${operation.id}/QUOTE/preview`);
      expect(preview.status).toBe(403);
      expect(errorCode(preview)).toBe(ERROR_CODES.DOCUMENT_FORBIDDEN_TYPE);
    }

    const viewerRender = await authPost(viewer, `/api/v1/documents/operations/${operation.id}/WORK_ORDER/render`).send({});
    expect(viewerRender.status).toBe(403);
    expect(errorCode(viewerRender)).toBe(ERROR_CODES.FORBIDDEN);
  });

  it('renders template previews without Operation and rejects guessed or inactive templates', async () => {
    const organization = await createOrganization();
    const hostile = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      '../../../../etc/passwd',
      '{{constructor.constructor("return process")()}}',
      '${process.env.DATABASE_URL}',
      'unicode-\u202Etxt',
    ].join('\n');
    const template = await prisma.documentTemplate.create({
      data: {
        organizationId: organization.id,
        type: DocumentTemplateType.WORK_ORDER,
        name: testId('Hostile template'),
        headerContent: hostile,
        footerContent: hostile,
        observations: hostile,
        isActive: true,
      },
    });
    const inactive = await prisma.documentTemplate.create({
      data: {
        organizationId: organization.id,
        type: DocumentTemplateType.REPORT,
        name: testId('Inactive template'),
        headerContent: 'inactive',
        footerContent: 'inactive',
        observations: 'inactive',
        isActive: false,
      },
    });

    const preview = await authGet(operator, `/api/v1/documents/templates/${template.id}/preview`);
    expect(preview.status).toBe(200);
    expect(preview.text).not.toContain(process.env.DATABASE_URL ?? 'postgresql://orbit_test');
    expect(preview.text).not.toContain('orbit_test:orbit_test');
    expect(preview.text).not.toContain('storageKey');

    const guessed = await authGet(owner, `/api/v1/documents/templates/${randomUUID()}/preview`);
    expect(guessed.status).toBe(404);
    expect(errorCode(guessed)).toBe(ERROR_CODES.TEMPLATE_NOT_FOUND);

    const inactivePreview = await authGet(owner, `/api/v1/documents/templates/${inactive.id}/preview`);
    expect(inactivePreview.status).toBe(409);
    expect(errorCode(inactivePreview)).toBe(ERROR_CODES.TEMPLATE_INACTIVE);
  });

  it('keeps Budget document emission behind commercial roles and state checks', async () => {
    const { budgetId } = await createBudgetFixture(owner.user);

    for (const actor of [operator, viewer]) {
      const denied = await authPost(actor, `/api/v1/budgets/${budgetId}/render`).send({});
      expect(denied.status).toBe(403);
      expect(errorCode(denied)).toBe(ERROR_CODES.FORBIDDEN);
    }

    const pendingDownload = await authGet(manager, `/api/v1/budgets/${budgetId}/download`);
    expect(pendingDownload.status).toBe(404);
    expect(errorCode(pendingDownload)).toBe(ERROR_CODES.DOCUMENT_NOT_FOUND);

    await prisma.budget.update({ where: { id: budgetId }, data: { status: BudgetStatus.REJECTED } });
    const rejected = await authPost(owner, `/api/v1/budgets/${budgetId}/render`).send({});
    expect(rejected.status).toBe(409);
    expect(errorCode(rejected)).toBe(ERROR_CODES.BUDGET_INVALID_STATUS);
  });

  it('returns a controlled error and no success audit when a rendered binary is missing', async () => {
    const operation = await createOperation(owner.user);
    const document = await prisma.operationDocument.create({
      data: {
        operationId: operation.id,
        type: DocumentTemplateType.WORK_ORDER,
        number: testId('DOC-MISSING').slice(0, 80),
        status: OperationDocumentStatus.READY,
        storageKey: 'documents/missing.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        renderMetadata: {},
        renderedAt: new Date(),
      },
    });

    const response = await authGet(owner, `/api/v1/documents/${document.id}/download`);
    expect([404, 409]).toContain(response.status);
    expect(response.text).not.toContain('documents/missing.pdf');

    const downloads = await prisma.auditLog.count({
      where: { action: 'DOCUMENT_DOWNLOADED', metadata: { path: ['documentId'], equals: document.id } },
    });
    expect(downloads).toBe(0);
  });
});
