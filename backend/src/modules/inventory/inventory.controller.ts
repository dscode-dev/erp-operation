import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import {
  CreateStockMovementDto,
  ListInventoryQueryDto,
  ListStockMovementsQueryDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import { InventoryService, type InventoryAuditContext } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get()
  list(@Query() query: ListInventoryQueryDto): Promise<unknown> {
    return this.inventory.listInventory(query);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('stats')
  stats(@CurrentUser() actor: AuthenticatedUser): Promise<unknown> {
    return this.inventory.inventoryStats(actor);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('movements')
  movements(@Query() query: ListStockMovementsQueryDto, @CurrentUser() actor: AuthenticatedUser): Promise<unknown> {
    return this.inventory.listMovements(query, actor);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR)
  @Post('movements')
  createMovement(
    @Body() body: CreateStockMovementDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.inventory.createMovement(body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.inventory.getInventoryItem(id);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateInventoryItemDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.inventory.updateInventoryItem(id, body, actor, this.context(request));
  }

  private context(request: RequestWithId): InventoryAuditContext {
    return { requestId: request.requestId, ip: request.ip || null, userAgent: request.get('user-agent') ?? null };
  }
}
