import { HttpStatus, Injectable } from '@nestjs/common';
import { BudgetHistoryAction, BudgetStatus, DocumentTemplateType, type OperationDocument, Prisma, Role } from '@prisma/client';
import {
  DOCUMENT_ENGINE_AUDIT_ACTIONS,
  DOCUMENT_ENGINE_RESOURCE,
  DOCUMENT_MIME_TYPE,
  DOCUMENT_RENDER_RESOURCE,
  FINANCIAL_DOCUMENT_TYPES,
} from '../../shared/constants/document-engine.constants';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import {
  formatDocumentNumber,
  OPERATION_DOCUMENT_PREFIX,
} from '../../shared/constants/operations.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import { AppLoggerService } from '../../infra/logger/app-logger.service';
import { LifecyclePublisher } from '../asset-lifecycle/lifecycle-publisher.service';
import { PrismaService } from '../database/prisma.service';
import { DocumentAssetResolver } from './assets/document-asset-resolver.service';
import type { DocumentBlueprint } from './blueprint/document-blueprint.types';
import { DocumentBuilderService } from './builder/document-builder.service';
import { PdfEngineService } from './pdf/pdf-engine.service';
import { DocumentRendererService } from './renderer/document-renderer.service';

export interface DocumentAuditContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

type DocumentRequest =
  | { source: 'operation'; operationId: string; type: DocumentTemplateType }
  | { source: 'document'; documentId: string }
  | { source: 'budget'; budgetId: string };

@Injectable()
export class DocumentEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly builder: DocumentBuilderService,
    private readonly renderer: DocumentRendererService,
    private readonly pdf: PdfEngineService,
    private readonly logger: AppLoggerService,
    private readonly assets: DocumentAssetResolver,
    private readonly lifecycle: LifecyclePublisher,
  ) {}

  async previewOperation(
    operationId: string,
    type: DocumentTemplateType,
    actor: AuthenticatedUser,
    context: DocumentAuditContext,
  ): Promise<unknown> {
    this.assertTypeAccess(type, actor);
    const blueprint = await this.builder.buildFromOperation(operationId, type);
    await this.audit(
      DOCUMENT_ENGINE_AUDIT_ACTIONS.DOCUMENT_PREVIEWED,
      DOCUMENT_ENGINE_RESOURCE,
      actor,
      context,
      {
        operationId,
        documentType: type,
        documentId: blueprint.metadata.documentId,
      },
    );
    return blueprint;
  }

  async previewDocument(
    documentId: string,
    actor: AuthenticatedUser,
    context: DocumentAuditContext,
  ): Promise<unknown> {
    const document = await this.documentOrThrow(documentId);
    this.assertTypeAccess(document.type, actor);
    if (document.budgetId) {
      const blueprint = await this.builder.buildBudget(document.budgetId);
      await this.audit(
        DOCUMENT_ENGINE_AUDIT_ACTIONS.DOCUMENT_PREVIEWED,
        DOCUMENT_ENGINE_RESOURCE,
        actor,
        context,
        {
          budgetId: document.budgetId,
          documentType: document.type,
          documentId: blueprint.metadata.documentId,
        },
      );
      return blueprint;
    }
    if (!document.operationId) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_NOT_FOUND,
        'Document is not linked to an operation or budget',
        HttpStatus.CONFLICT,
      );
    }
    return this.previewOperation(document.operationId, document.type, actor, context);
  }

  async previewTemplate(
    templateId: string,
    actor: AuthenticatedUser,
    context: DocumentAuditContext,
  ): Promise<unknown> {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id: templateId },
      select: { type: true },
    });
    if (!template) {
      throw new ApplicationException(
        ERROR_CODES.TEMPLATE_NOT_FOUND,
        'Document template was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    this.assertTypeAccess(template.type, actor);
    const blueprint = await this.builder.buildFromTemplate(templateId);
    await this.audit(
      DOCUMENT_ENGINE_AUDIT_ACTIONS.TEMPLATE_PREVIEWED,
      DOCUMENT_ENGINE_RESOURCE,
      actor,
      context,
      {
        templateId,
        documentType: blueprint.metadata.documentType,
      },
    );
    return blueprint;
  }

  async renderOperation(
    operationId: string,
    type: DocumentTemplateType,
    actor: AuthenticatedUser,
    context: DocumentAuditContext,
  ): Promise<unknown> {
    this.assertTypeAccess(type, actor);
    const operation = await this.prisma.operation.findUnique({
      where: { id: operationId },
      select: { id: true, number: true },
    });
    if (!operation) {
      throw new ApplicationException(
        ERROR_CODES.OPERATION_NOT_FOUND,
        'Operation was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const document = await this.prisma.operationDocument.upsert({
      where: { operationId_type: { operationId, type } },
      create: {
        operationId,
        type,
        number: formatDocumentNumber(OPERATION_DOCUMENT_PREFIX[type], operation.number),
        status: 'DRAFT',
      },
      update: {},
    });
    return this.renderDocument(document.id, actor, context);
  }

  async renderBudget(
    budgetId: string,
    actor: AuthenticatedUser,
    context: DocumentAuditContext,
  ): Promise<unknown> {
    const request: DocumentRequest = { source: 'budget', budgetId };
    this.assertTypeAccess(DocumentTemplateType.BUDGET, actor);
    const budget = await this.budgetOrThrow(budgetId);
    this.assertBudgetRenderable(budget.status);
    const document = await this.prisma.operationDocument.upsert({
      where: { budgetId },
      create: {
        budgetId,
        operationId: budget.operationId,
        type: DocumentTemplateType.BUDGET,
        number: `ORC-${String(budget.number).padStart(6, '0')}`,
        status: 'DRAFT',
      },
      update: {
        operationId: budget.operationId,
      },
    });
    const rendered = (await this.renderDocumentFromRequest(request, document.id, actor, context)) as Record<string, unknown>;
    const preview = await this.builder.buildBudget(budgetId);
    await this.prisma.budgetHistory.create({
      data: {
        budgetId,
        actorId: actor.id,
        action: BudgetHistoryAction.DOCUMENT_RENDERED,
        previousStatus: budget.status,
        newStatus: budget.status,
        metadata: {
          documentId: document.id,
          documentNumber: document.number,
          renderedAt: new Date().toISOString(),
        },
      },
    });
    return {
      documentId: document.id,
      preview,
      download: `/api/v1/budgets/${budgetId}/download`,
      status: rendered.status,
      document: rendered,
    };
  }

  async renderDocument(
    documentId: string,
    actor: AuthenticatedUser,
    context: DocumentAuditContext,
  ): Promise<unknown> {
    const document = await this.documentOrThrow(documentId);
    this.assertTypeAccess(document.type, actor);
    try {
      if (!document.budgetId && !document.operationId) {
        throw new ApplicationException(
          ERROR_CODES.DOCUMENT_NOT_FOUND,
          'Document is not linked to an operation or budget',
          HttpStatus.CONFLICT,
        );
      }
      const blueprint = await this.buildBlueprintForDocument(document);
      const rendered = this.renderer.render(blueprint);
      const pdf = this.pdf.create(rendered);
      const stored = await this.assets.saveDocumentPdf({
        operationId: document.operationId,
        sourceId: document.budgetId ?? document.operationId ?? document.id,
        documentType: document.type,
        content: pdf.buffer,
      });

      if (document.storageKey)
        await this.assets.delete(document.storageKey).catch(() => undefined);

      const updated = await this.prisma.$transaction(async (tx) => {
        const persisted = await tx.operationDocument.updateMany({
          where: { id: document.id, updatedAt: document.updatedAt },
          data: {
            storageKey: stored.storageKey,
            mimeType: DOCUMENT_MIME_TYPE,
            fileSize: pdf.buffer.length,
            renderedAt: new Date(),
            status: 'READY',
            renderMetadata: {
              engine: 'direct-pdf-v1',
              blueprintVersion: blueprint.version,
              pageCount: pdf.pageCount,
              generatedAt: blueprint.metadata.generatedAt,
            },
          },
        });
        if (persisted.count !== 1) {
          await this.assets.delete(stored.storageKey).catch(() => undefined);
          throw new ApplicationException(
            ERROR_CODES.DOCUMENT_RENDER_FAILED,
            'Document changed while rendering; retry the render request',
            HttpStatus.CONFLICT,
          );
        }
        const saved = await tx.operationDocument.findUniqueOrThrow({ where: { id: document.id } });
        await tx.auditLog.create({
          data: this.auditInput(
            DOCUMENT_ENGINE_AUDIT_ACTIONS.DOCUMENT_RENDERED,
            DOCUMENT_RENDER_RESOURCE,
            actor,
            context,
            {
              documentId: document.id,
              operationId: document.operationId,
              budgetId: document.budgetId,
              documentType: document.type,
              pageCount: pdf.pageCount,
              fileSize: pdf.buffer.length,
            },
          ),
        });
        await this.lifecycle.publishDocumentRenderedTx(tx, saved.id, actor.id, context);
        return saved;
      });

      this.logger.info('Document rendered', {
        event: 'document.rendered',
        requestId: context.requestId,
        documentId: updated.id,
        operationId: updated.operationId,
        documentType: updated.type,
        fileSize: updated.fileSize,
      });

      return this.documentPayload(updated);
    } catch (error) {
      this.logger.error('Document render failed', {
        event: 'document.render_failed',
        requestId: context.requestId,
        documentId,
        ...(error instanceof Error ? { error: error.message } : {}),
      });
      if (error instanceof ApplicationException) throw error;
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_RENDER_FAILED,
        'Document rendering failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async downloadDocument(
    documentId: string,
    actor: AuthenticatedUser,
    context: DocumentAuditContext,
  ): Promise<unknown> {
    const document = await this.documentOrThrow(documentId);
    this.assertTypeAccess(document.type, actor);
    if (!document.storageKey || !document.mimeType || !document.fileSize) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_DOWNLOAD_NOT_READY,
        'Document has not been rendered yet',
        HttpStatus.CONFLICT,
      );
    }
    let stored: { content: Buffer };
    try {
      stored = await this.assets.getDocumentPdf(document.storageKey);
    } catch (error) {
      if (error instanceof ApplicationException) throw error;
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_DOWNLOAD_NOT_READY,
        'Document binary is not available',
        HttpStatus.CONFLICT,
      );
    }
    await this.audit(
      DOCUMENT_ENGINE_AUDIT_ACTIONS.DOCUMENT_DOWNLOADED,
      DOCUMENT_RENDER_RESOURCE,
      actor,
      context,
      {
        documentId: document.id,
        operationId: document.operationId,
        documentType: document.type,
      },
    );
    return {
      ...this.documentPayload(document),
      contentBase64: stored.content.toString('base64'),
    };
  }

  async downloadBudget(
    budgetId: string,
    actor: AuthenticatedUser,
    context: DocumentAuditContext,
  ): Promise<unknown> {
    this.assertTypeAccess(DocumentTemplateType.BUDGET, actor);
    const budget = await this.budgetOrThrow(budgetId);
    this.assertBudgetRenderable(budget.status);
    const document = await this.prisma.operationDocument.findUnique({
      where: { budgetId },
    });
    if (!document) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_NOT_FOUND,
        'Budget document was not rendered yet',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.downloadDocument(document.id, actor, context);
  }

  private assertTypeAccess(type: DocumentTemplateType, actor: AuthenticatedUser): void {
    if (FINANCIAL_DOCUMENT_TYPES.includes(type as never) && actor.role !== Role.OWNER) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_FORBIDDEN_TYPE,
        'Only OWNER can access financial document types',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private async documentOrThrow(id: string): Promise<OperationDocument> {
    const document = await this.prisma.operationDocument.findUnique({ where: { id } });
    if (!document) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_NOT_FOUND,
        'Document was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return document;
  }

  private async budgetOrThrow(id: string): Promise<{ id: string; number: number; status: BudgetStatus; operationId: string | null }> {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      select: { id: true, number: true, status: true, operationId: true },
    });
    if (!budget) {
      throw new ApplicationException(
        ERROR_CODES.BUDGET_NOT_FOUND,
        'Budget was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return budget;
  }

  private assertBudgetRenderable(status: BudgetStatus): void {
    const blockedStatuses: BudgetStatus[] = [BudgetStatus.CANCELED, BudgetStatus.REJECTED];
    if (blockedStatuses.includes(status)) {
      throw new ApplicationException(
        ERROR_CODES.BUDGET_INVALID_STATUS,
        'Canceled or rejected budgets cannot be rendered',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async renderDocumentFromRequest(
    request: DocumentRequest,
    documentId: string,
    actor: AuthenticatedUser,
    context: DocumentAuditContext,
  ): Promise<unknown> {
    void request;
    return this.renderDocument(documentId, actor, context);
  }

  private async buildBlueprintForDocument(document: OperationDocument): Promise<DocumentBlueprint> {
    if (document.budgetId) {
      return this.builder.buildBudget(document.budgetId);
    }
    if (!document.operationId) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_NOT_FOUND,
        'Document is not linked to an operation or budget',
        HttpStatus.CONFLICT,
      );
    }
    return this.builder.buildFromOperation(document.operationId, document.type);
  }

  private documentPayload(document: {
    id: string;
    operationId: string | null;
    budgetId?: string | null;
    type: DocumentTemplateType;
    number: string;
    status: string;
    storageKey: string | null;
    mimeType: string | null;
    fileSize: number | null;
    renderedAt: Date | null;
    renderMetadata: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }): Record<string, unknown> {
    return {
      id: document.id,
      operationId: document.operationId,
      budgetId: document.budgetId ?? null,
      type: document.type,
      number: document.number,
      status: document.status,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      renderedAt: document.renderedAt,
      renderMetadata: document.renderMetadata,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      downloadReady: Boolean(document.storageKey),
    };
  }

  private async audit(
    action: string,
    resource: string,
    actor: AuthenticatedUser,
    context: DocumentAuditContext,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: this.auditInput(action, resource, actor, context, metadata),
    });
  }

  private auditInput(
    action: string,
    resource: string,
    actor: AuthenticatedUser,
    context: DocumentAuditContext,
    metadata: Record<string, unknown>,
  ): Prisma.AuditLogUncheckedCreateInput {
    return {
      action,
      resource,
      actor: actor.id,
      metadata: {
        requestId: context.requestId,
        ip: context.ip,
        userAgent: context.userAgent,
        ...metadata,
      },
    };
  }
}

export function contextFromRequest(request: RequestWithId): DocumentAuditContext {
  return {
    requestId: request.requestId,
    ip: request.ip || null,
    userAgent: request.get('user-agent') ?? null,
  };
}
