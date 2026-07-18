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
  CreateMaintenanceExecutionDto,
  CreateMaintenancePlanDto,
  ListMaintenanceExecutionsQueryDto,
  ListMaintenancePlansQueryDto,
  UpdateMaintenanceExecutionDto,
  UpdateMaintenancePlanDto,
} from './dto/maintenance-planning.dto';
import {
  MaintenancePlanningService,
  type MaintenanceAuditContext,
} from './maintenance-planning.service';

@Controller()
export class MaintenancePlanningController {
  constructor(private readonly maintenance: MaintenancePlanningService) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('maintenance-plans/stats')
  stats(@CurrentUser() actor: AuthenticatedUser): Promise<unknown> {
    return this.maintenance.stats(actor);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('maintenance-plans')
  list(@Query() query: ListMaintenancePlansQueryDto): Promise<unknown> {
    return this.maintenance.listPlans(query);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('maintenance-plans/:id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<unknown> {
    return this.maintenance.getPlan(id);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('maintenance-plans')
  create(
    @Body() body: CreateMaintenancePlanDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.maintenance.createPlan(body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('maintenance-plans/:id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateMaintenancePlanDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.maintenance.updatePlan(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @HttpCode(HttpStatus.OK)
  @Delete('maintenance-plans/:id')
  delete(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<{ deleted: true }> {
    return this.maintenance.deletePlan(id, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('maintenance-plans/:id/executions')
  listExecutions(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ListMaintenanceExecutionsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<unknown> {
    return this.maintenance.listExecutions(id, query, actor);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('maintenance-plans/:id/executions')
  createExecution(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CreateMaintenanceExecutionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.maintenance.createExecution(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR)
  @Patch('maintenance-executions/:id')
  updateExecution(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: UpdateMaintenanceExecutionDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.maintenance.updateExecution(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('equipments/:id/maintenance')
  equipmentMaintenance(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ListMaintenancePlansQueryDto,
  ): Promise<unknown> {
    return this.maintenance.equipmentMaintenance(id, query);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('equipments/:id/maintenance/upcoming')
  equipmentUpcoming(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ListMaintenanceExecutionsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<unknown> {
    return this.maintenance.equipmentUpcoming(id, query, actor);
  }

  private context(request: RequestWithId): MaintenanceAuditContext {
    return {
      requestId: request.requestId,
      ip: request.ip || null,
      userAgent: request.get('user-agent') ?? null,
    };
  }
}
