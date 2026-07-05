import { BudgetStatus, DocumentTemplateType } from '@prisma/client';
import { ApplicationException } from '../../src/shared/exceptions/application.exception';
import {
  context,
  ControlledStorage,
  createActor,
  createBudgetFixture,
  createDocumentEngine,
  disconnectDatabase,
  prisma,
  resetDatabase,
  settledFailures,
  settledSuccesses,
} from '../integration/helpers';

describe('Document Engine integrity with real PostgreSQL and controlled storage', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('concurrent Budget render keeps one coherent authoritative document and cleans losing binary', async () => {
    const actor = await createActor();
    const fixture = await createBudgetFixture(actor);
    const initialDocument = await prisma.operationDocument.create({
      data: {
        budgetId: fixture.budgetId,
        type: DocumentTemplateType.BUDGET,
        number: 'ORC-CONCURRENT',
        status: 'DRAFT',
      },
    });
    const storage = new ControlledStorage();
    storage.setSaveBarrier(2);
    const { documents } = createDocumentEngine(storage);

    const results = await Promise.allSettled([
      documents.renderDocument(initialDocument.id, actor, context),
      documents.renderDocument(initialDocument.id, actor, context),
    ]);

    expect(settledSuccesses(results).length).toBe(1);
    expect(settledFailures(results).length).toBe(1);
    const document = await prisma.operationDocument.findUniqueOrThrow({ where: { budgetId: fixture.budgetId } });
    expect(document.storageKey).toBeTruthy();
    expect(document.mimeType).toBe('application/pdf');
    expect(document.fileSize).toBeGreaterThan(0);
    expect(document.renderedAt).toBeTruthy();
    expect(storage.saves.length).toBe(2);
    expect(storage.deletes.length).toBeGreaterThanOrEqual(1);
    expect(await prisma.auditLog.count({ where: { action: 'DOCUMENT_RENDERED', metadata: { path: ['budgetId'], equals: fixture.budgetId } } })).toBe(1);
    expect(await prisma.budgetHistory.count({ where: { budgetId: fixture.budgetId, action: 'DOCUMENT_RENDERED' } })).toBe(0);
  });

  it('storage write failure does not mark document as rendered', async () => {
    const actor = await createActor();
    const fixture = await createBudgetFixture(actor);
    const storage = new ControlledStorage();
    storage.failSave = true;
    const { documents } = createDocumentEngine(storage);

    await expect(documents.renderBudget(fixture.budgetId, actor, context)).rejects.toMatchObject({
      code: 'DOCUMENT_RENDER_FAILED',
    });

    const document = await prisma.operationDocument.findUnique({ where: { budgetId: fixture.budgetId } });
    expect(document?.renderedAt ?? null).toBeNull();
    expect(document?.storageKey ?? null).toBeNull();
    expect(await prisma.auditLog.count({ where: { action: 'DOCUMENT_RENDERED' } })).toBe(0);
    expect(await prisma.budgetHistory.count({ where: { budgetId: fixture.budgetId, action: 'DOCUMENT_RENDERED' } })).toBe(0);
  });

  it('database stale failure after storage write attempts cleanup and keeps metadata truthful', async () => {
    const actor = await createActor();
    const fixture = await createBudgetFixture(actor);
    const storage = new ControlledStorage();
    storage.afterSave = async (): Promise<void> => {
      await prisma.operationDocument.update({
        where: { budgetId: fixture.budgetId },
        data: { renderMetadata: { forcedStaleWrite: true } },
      });
    };
    const { documents } = createDocumentEngine(storage);

    await expect(documents.renderBudget(fixture.budgetId, actor, context)).rejects.toMatchObject({
      code: 'DOCUMENT_RENDER_FAILED',
    });

    const document = await prisma.operationDocument.findUniqueOrThrow({ where: { budgetId: fixture.budgetId } });
    expect(document.renderedAt).toBeNull();
    expect(document.storageKey).toBeNull();
    expect(storage.saves.length).toBe(1);
    expect(storage.deletes).toEqual(storage.saves);
    expect(await prisma.auditLog.count({ where: { action: 'DOCUMENT_RENDERED' } })).toBe(0);
    expect(await prisma.budgetHistory.count({ where: { budgetId: fixture.budgetId, action: 'DOCUMENT_RENDERED' } })).toBe(0);
  });

  it('missing binary during download returns controlled error without success audit', async () => {
    const actor = await createActor();
    const fixture = await createBudgetFixture(actor);
    const document = await prisma.operationDocument.create({
      data: {
        budgetId: fixture.budgetId,
        type: DocumentTemplateType.BUDGET,
        number: 'ORC-MISSING',
        status: 'READY',
        storageKey: 'documents/missing.pdf',
        mimeType: 'application/pdf',
        fileSize: 100,
        renderedAt: new Date(),
      },
    });
    const storage = new ControlledStorage();
    storage.failGet = true;
    const { documents } = createDocumentEngine(storage);

    await expect(documents.downloadDocument(document.id, actor, context)).rejects.toBeInstanceOf(ApplicationException);
    expect(await prisma.auditLog.count({ where: { action: 'DOCUMENT_DOWNLOADED' } })).toBe(0);
  });

  it('does not render canceled or rejected Budget documents', async () => {
    const actor = await createActor();
    const fixture = await createBudgetFixture(actor);
    await prisma.budget.update({ where: { id: fixture.budgetId }, data: { status: BudgetStatus.REJECTED } });
    const { documents } = createDocumentEngine();
    await expect(documents.renderBudget(fixture.budgetId, actor, context)).rejects.toMatchObject({
      code: 'BUDGET_INVALID_STATUS',
    });
  });
});
