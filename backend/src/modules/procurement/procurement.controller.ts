import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import {
  CreatePurchaseOrderDto,
  CreatePurchaseOrderItemDto,
  CreatePurchaseReceiptDto,
  ListPurchaseOrdersQueryDto,
  UpdatePurchaseOrderDto,
  UpdatePurchaseOrderItemDto,
} from './dto/procurement.dto';
import { ProcurementService, type ProcurementAuditContext } from './procurement.service';

@Controller()
@Roles(Role.OWNER, Role.MANAGER)
export class ProcurementController {
  constructor(private readonly procurement: ProcurementService) {}

  @Get('purchase-orders')
  list(@Query() query: ListPurchaseOrdersQueryDto): Promise<unknown> {
    return this.procurement.list(query);
  }

  @Get('purchase-orders/stats')
  stats(): Promise<unknown> {
    return this.procurement.stats();
  }

  @Get('purchase-orders/:id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.procurement.get(id);
  }

  @Post('purchase-orders')
  create(@Body() body: CreatePurchaseOrderDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> {
    return this.procurement.create(body, actor, this.context(req));
  }

  @Patch('purchase-orders/:id')
  update(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdatePurchaseOrderDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> {
    return this.procurement.update(id, body, actor, this.context(req));
  }

  @Patch('purchase-orders/:id/send')
  send(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> {
    return this.procurement.send(id, actor, this.context(req));
  }

  @Patch('purchase-orders/:id/cancel')
  cancel(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> {
    return this.procurement.cancel(id, actor, this.context(req));
  }

  @Get('purchase-orders/:id/items')
  listItems(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.procurement.listItems(id);
  }

  @Post('purchase-orders/:id/items')
  createItem(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: CreatePurchaseOrderItemDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> {
    return this.procurement.createItem(id, body, actor, this.context(req));
  }

  @Patch('purchase-order-items/:id')
  updateItem(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: UpdatePurchaseOrderItemDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> {
    return this.procurement.updateItem(id, body, actor, this.context(req));
  }

  @Delete('purchase-order-items/:id')
  deleteItem(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> {
    return this.procurement.deleteItem(id, actor, this.context(req));
  }

  @Get('purchase-orders/:id/receipts')
  listReceipts(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.procurement.listReceipts(id);
  }

  @Post('purchase-orders/:id/receipts')
  receive(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Body() body: CreatePurchaseReceiptDto, @CurrentUser() actor: AuthenticatedUser, @Req() req: RequestWithId): Promise<unknown> {
    return this.procurement.receive(id, body, actor, this.context(req));
  }

  @Get('purchase-orders/history/:id')
  history(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @Query() query: ListPurchaseOrdersQueryDto): Promise<unknown> {
    return this.procurement.history(id, query);
  }

  private context(request: RequestWithId): ProcurementAuditContext {
    return { requestId: request.requestId, ip: request.ip || null, userAgent: request.get('user-agent') ?? null };
  }
}
