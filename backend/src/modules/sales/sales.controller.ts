import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import { CreateSaleDto, ListSalesQueryDto, UpdateSaleDto } from './dto/sale.dto';
import { SalesService } from './sales.service';

type AuditContext = { requestId: string; ip: string | null; userAgent: string | null };

@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}
  @Roles(Role.OWNER, Role.MANAGER, Role.VIEWER) @Get() list(@Query() query: ListSalesQueryDto): Promise<unknown> { return this.sales.list(query); }
  @Roles(Role.OWNER, Role.MANAGER, Role.VIEWER) @Get(':id') get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> { return this.sales.get(id); }
  @Roles(Role.OWNER, Role.MANAGER, Role.VIEWER) @Get(':id/receipt-prefill') receiptPrefill(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> { return this.sales.receiptPrefill(id); }
  @Roles(Role.OWNER, Role.MANAGER) @Post() create(@Body() body: CreateSaleDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> { return this.sales.create(body, actor, this.context(req)); }
  @Roles(Role.OWNER, Role.MANAGER) @Patch(':id') update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdateSaleDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> { return this.sales.update(id, body, actor, this.context(req)); }
  @Roles(Role.OWNER, Role.MANAGER) @Patch(':id/complete') complete(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> { return this.sales.complete(id, actor, this.context(req)); }
  @Roles(Role.OWNER, Role.MANAGER) @Delete(':id') cancel(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> { return this.sales.cancel(id, actor, this.context(req)); }
  private context(req: RequestWithId): AuditContext { return { requestId: req.requestId, ip: req.ip || null, userAgent: req.get('user-agent') ?? null }; }
}
