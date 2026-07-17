import { Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RawResponse } from '../../shared/decorators/raw-response.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import { DocumentEngineService, contextFromRequest } from './document-engine.service';
import {
  DocumentIdParamsDto,
  ListDocumentsQueryDto,
  OperationDocumentParamsDto,
  TemplatePreviewParamsDto,
} from './dto/document-engine.dto';

@Controller('documents')
export class DocumentEngineController {
  constructor(private readonly documents: DocumentEngineService) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get()
  listDocuments(@Query() query: ListDocumentsQueryDto, @CurrentUser() actor: AuthenticatedUser): Promise<unknown> {
    return this.documents.listDocuments(query, actor);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('operations/:operationId/:type/preview')
  previewOperation(
    @Param() params: OperationDocumentParamsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.documents.previewOperation(
      params.operationId,
      params.type,
      actor,
      contextFromRequest(request),
    );
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR)
  @Post('operations/:operationId/:type/render')
  renderOperation(
    @Param() params: OperationDocumentParamsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.documents.renderOperation(
      params.operationId,
      params.type,
      actor,
      contextFromRequest(request),
    );
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('templates/:templateId/preview')
  previewTemplate(
    @Param() params: TemplatePreviewParamsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.documents.previewTemplate(params.templateId, actor, contextFromRequest(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get(':documentId/preview')
  previewDocument(
    @Param() params: DocumentIdParamsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.documents.previewDocument(params.documentId, actor, contextFromRequest(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR)
  @Post(':documentId/render')
  renderDocument(
    @Param() params: DocumentIdParamsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.documents.renderDocument(params.documentId, actor, contextFromRequest(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @RawResponse()
  @Get(':documentId/download')
  async downloadDocument(
    @Param() params: DocumentIdParamsDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.documents.downloadDocument(
      params.documentId,
      actor,
      contextFromRequest(request),
    );
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.setHeader('Content-Length', String(file.content.length));
    response.end(file.content);
  }
}
