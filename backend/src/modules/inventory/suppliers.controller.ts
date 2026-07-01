import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import { CreateSupplierDto, ListSuppliersQueryDto, UpdateSupplierDto } from './dto/inventory.dto';
import { InventoryService, type InventoryAuditContext } from './inventory.service';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly inventory: InventoryService) {}

  @Roles(Role.OWNER, Role.MANAGER)
  @Get()
  list(@Query() query: ListSuppliersQueryDto): Promise<unknown> {
    return this.inventory.listSuppliers(query);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post()
  create(@Body() body: CreateSupplierDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: RequestWithId): Promise<unknown> {
    return this.inventory.createSupplier(body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateSupplierDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.inventory.updateSupplier(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Delete(':id')
  delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deleted: true }> {
    return this.inventory.deleteSupplier(id, actor, this.context(request));
  }

  private context(request: RequestWithId): InventoryAuditContext {
    return { requestId: request.requestId, ip: request.ip || null, userAgent: request.get('user-agent') ?? null };
  }
}
