import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { RawResponse } from '../../shared/decorators/raw-response.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import { DocumentEngineService, contextFromRequest } from '../document-engine/document-engine.service';
import { BudgetsService, type BudgetAuditContext } from './budgets.service';
import { BudgetDecisionDto, CreateBudgetDto, ListBudgetsQueryDto, UpdateBudgetDto } from './dto/budget.dto';

@Controller()
export class BudgetsController {
  constructor(
    private readonly budgets: BudgetsService,
    private readonly documents: DocumentEngineService,
  ) {}

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('budgets')
  list(@Query() query: ListBudgetsQueryDto): Promise<unknown> {
    return this.budgets.list(query);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('budgets/stats')
  stats(@Query() query: ListBudgetsQueryDto): Promise<unknown> {
    return this.budgets.stats(query);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('budgets/history/:id')
  history(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ListBudgetsQueryDto,
  ): Promise<unknown> {
    return this.budgets.history(id, query);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('operations/:id/budgets')
  operationBudgets(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ListBudgetsQueryDto,
  ): Promise<unknown> {
    return this.budgets.listByOperation(id, query);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('budgets/:id/render')
  renderDocument(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.documents.renderBudget(id, actor, contextFromRequest(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @RawResponse()
  @Get('budgets/:id/download')
  async downloadDocument(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
    @Res() response: Response,
  ): Promise<void> {
    const file = await this.documents.downloadBudget(id, actor, contextFromRequest(request));
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.setHeader('Content-Length', String(file.content.length));
    response.end(file.content);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('budgets/:id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.budgets.get(id);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('budgets')
  create(
    @Body() body: CreateBudgetDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.budgets.create(body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('budgets/:id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateBudgetDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.budgets.update(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('budgets/:id/approve')
  approve(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: BudgetDecisionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.budgets.approve(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('budgets/:id/reject')
  reject(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: BudgetDecisionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.budgets.reject(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Delete('budgets/:id')
  delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deleted: true }> {
    return this.budgets.cancel(id, actor, this.context(request));
  }

  private context(request: RequestWithId): BudgetAuditContext {
    return { requestId: request.requestId, ip: request.ip || null, userAgent: request.get('user-agent') ?? null };
  }
}
