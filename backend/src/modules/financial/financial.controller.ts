import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import {
  CancelFinancialEntryDto,
  CreateFinancialAccountDto,
  CreateFinancialCategoryDto,
  CreateFinancialEntryDto,
  ListFinancialAccountsQueryDto,
  ListFinancialCategoriesQueryDto,
  ListFinancialEntriesQueryDto,
  PayFinancialEntryDto,
  UpdateFinancialAccountDto,
  UpdateFinancialCategoryDto,
  UpdateFinancialEntryDto,
} from './dto/financial.dto';
import { FinancialService, type FinancialAuditContext } from './financial.service';

@Controller('financial')
@Roles(Role.OWNER, Role.MANAGER)
export class FinancialController {
  constructor(private readonly financial: FinancialService) {}

  @Get('accounts')
  listAccounts(@Query() query: ListFinancialAccountsQueryDto): Promise<unknown> {
    return this.financial.listAccounts(query);
  }

  @Post('accounts')
  createAccount(
    @Body() body: CreateFinancialAccountDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.financial.createAccount(body, actor, this.context(request));
  }

  @Patch('accounts/:id')
  updateAccount(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateFinancialAccountDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.financial.updateAccount(id, body, actor, this.context(request));
  }

  @Delete('accounts/:id')
  deleteAccount(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.financial.deleteAccount(id, actor, this.context(request));
  }

  @Get('categories')
  listCategories(@Query() query: ListFinancialCategoriesQueryDto): Promise<unknown> {
    return this.financial.listCategories(query);
  }

  @Post('categories')
  createCategory(
    @Body() body: CreateFinancialCategoryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.financial.createCategory(body, actor, this.context(request));
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateFinancialCategoryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.financial.updateCategory(id, body, actor, this.context(request));
  }

  @Delete('categories/:id')
  deleteCategory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.financial.deleteCategory(id, actor, this.context(request));
  }

  @Get('entries')
  listEntries(@Query() query: ListFinancialEntriesQueryDto): Promise<unknown> {
    return this.financial.listEntries(query);
  }

  @Get('entries/:id')
  getEntry(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.financial.getEntry(id);
  }

  @Post('entries')
  createEntry(
    @Body() body: CreateFinancialEntryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.financial.createEntry(body, actor, this.context(request));
  }

  @Patch('entries/:id')
  updateEntry(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateFinancialEntryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.financial.updateEntry(id, body, actor, this.context(request));
  }

  @Patch('entries/:id/pay')
  payEntry(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: PayFinancialEntryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.financial.payEntry(id, body, actor, this.context(request));
  }

  @Patch('entries/:id/cancel')
  cancelEntry(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CancelFinancialEntryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.financial.cancelEntry(id, body, actor, this.context(request));
  }

  @Get('stats')
  stats(): Promise<unknown> {
    return this.financial.stats();
  }

  @Get('history/:id')
  history(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ListFinancialEntriesQueryDto,
  ): Promise<unknown> {
    return this.financial.history(id, query);
  }

  private context(request: RequestWithId): FinancialAuditContext {
    return { requestId: request.requestId, ip: request.ip || null, userAgent: request.get('user-agent') ?? null };
  }
}
