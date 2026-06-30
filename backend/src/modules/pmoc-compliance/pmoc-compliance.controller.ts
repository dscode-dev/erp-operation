import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Roles } from '../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import {
  CreatePmocEnvironmentDto,
  CreatePmocPlanDto,
  ListPmocQueryDto,
  UpdatePmocEnvironmentDto,
  UpdatePmocPlanDto,
} from './dto/pmoc-compliance.dto';
import { PmocAuditContext, PmocComplianceService } from './pmoc-compliance.service';

@Controller()
export class PmocComplianceController {
  constructor(private readonly pmoc: PmocComplianceService) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('pmoc/stats')
  stats(): Promise<unknown> {
    return this.pmoc.stats();
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('pmoc')
  list(@Query() query: ListPmocQueryDto): Promise<unknown> {
    return this.pmoc.list(query);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('pmoc/:id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.pmoc.get(id);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('pmoc')
  create(
    @Body() body: CreatePmocPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.pmoc.create(body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('pmoc/:id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdatePmocPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.pmoc.update(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Delete('pmoc/:id')
  delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deleted: true }> {
    return this.pmoc.delete(id, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('pmoc/:id/environments')
  listEnvironments(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.pmoc.listEnvironments(id);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('pmoc/:id/environments')
  createEnvironment(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CreatePmocEnvironmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.pmoc.createEnvironment(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('pmoc/environments/:id')
  updateEnvironment(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdatePmocEnvironmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.pmoc.updateEnvironment(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Delete('pmoc/environments/:id')
  deleteEnvironment(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deleted: true }> {
    return this.pmoc.deleteEnvironment(id, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('pmoc/:id/compliance')
  compliance(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.pmoc.compliance(id);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('equipments/:id/pmoc')
  equipmentPmoc(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ListPmocQueryDto,
  ): Promise<unknown> {
    return this.pmoc.equipmentPmoc(id, query);
  }

  private context(request: RequestWithId): PmocAuditContext {
    return {
      requestId: request.requestId,
      ip: request.ip || null,
      userAgent: request.get('user-agent') ?? null,
    };
  }
}
