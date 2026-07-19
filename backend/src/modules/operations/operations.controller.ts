import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import {
  CreateOperationDto,
  ListOperationsQueryDto,
  UpdateOperationDto,
  UpdateOperationPhotoDto,
} from './dto/operation.dto';
import { OperationsService, type OperationAuditContext } from './operations.service';

@Controller('operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get()
  list(@Query() query: ListOperationsQueryDto, @CurrentUser() actor: AuthenticatedUser): Promise<unknown> {
    return this.operations.list(query, actor);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('stats')
  stats(@CurrentUser() actor: AuthenticatedUser): Promise<Record<string, unknown>> {
    return this.operations.stats(actor);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR)
  @Post()
  create(
    @Body() body: CreateOperationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.operations.create(body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('photos/:photoId')
  getPhoto(
    @Param('photoId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.operations.getPhoto(id, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('photos/:photoId')
  updatePhoto(
    @Param('photoId', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateOperationPhotoDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.operations.updatePhoto(id, body.caption, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Delete('photos/:photoId')
  deletePhoto(
    @Param('photoId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.operations.deletePhoto(id, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get(':id')
  get(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.operations.get(id, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch(':id/approve')
  approve(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.operations.approve(id, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR)
  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateOperationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.operations.update(id, body, actor, this.context(request));
  }

  private context(request: RequestWithId): OperationAuditContext {
    return {
      requestId: request.requestId,
      ip: request.ip || null,
      userAgent: request.get('user-agent') ?? null,
    };
  }
}
