import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import {
  CreateOperationDto,
  ListOperationsQueryDto,
  UpdateOperationDto,
} from './dto/operation.dto';
import { OperationsService, type OperationAuditContext } from './operations.service';

@Controller('operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get()
  list(@Query() query: ListOperationsQueryDto): Promise<unknown> {
    return this.operations.list(query);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('stats')
  stats(): Promise<Record<string, unknown>> {
    return this.operations.stats();
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
  getPhoto(@Param('photoId', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.operations.getPhoto(id);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.operations.get(id);
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
