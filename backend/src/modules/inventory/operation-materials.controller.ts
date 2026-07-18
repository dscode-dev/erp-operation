import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import { CreateOperationMaterialDto } from './dto/inventory.dto';
import { InventoryService, type InventoryAuditContext } from './inventory.service';

@Controller('operations/:operationId/materials')
export class OperationMaterialsController {
  constructor(private readonly inventory: InventoryService) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get()
  list(
    @Param('operationId', new ParseUUIDPipe({ version: '4' })) operationId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.inventory.listOperationMaterials(operationId, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR)
  @Post()
  consume(
    @Param('operationId', new ParseUUIDPipe({ version: '4' })) operationId: string,
    @Body() body: CreateOperationMaterialDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.inventory.consumeMaterial(operationId, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Delete(':id')
  delete(
    @Param('operationId', new ParseUUIDPipe({ version: '4' })) operationId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deleted: true }> {
    return this.inventory.deleteOperationMaterial(operationId, id, actor, this.context(request));
  }

  private context(request: RequestWithId): InventoryAuditContext {
    return { requestId: request.requestId, ip: request.ip || null, userAgent: request.get('user-agent') ?? null };
  }
}
