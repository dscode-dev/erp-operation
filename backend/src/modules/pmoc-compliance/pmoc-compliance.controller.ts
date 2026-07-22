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
  CreatePmocExecutionRequestDto,
  CreatePmocPlanDto,
  GeneratePmocWorkOrderDto,
  ListPmocExecutionRequestsQueryDto,
  ListPmocQueryDto,
  PmocActiveCoverageQueryDto,
  PmocNameSuggestionQueryDto,
  PmocDashboardQueryDto,
  ReschedulePmocExecutionRequestDto,
  RunPmocSchedulerQueryDto,
  UpdatePmocEnvironmentDto,
  UpdatePmocPlanDto,
} from './dto/pmoc-compliance.dto';
import { PmocExecutionRequestsService } from './pmoc-execution-requests.service';
import { PmocSchedulerService } from './pmoc-scheduler.service';
import { PmocAuditContext, PmocComplianceService } from './pmoc-compliance.service';

@Controller()
export class PmocComplianceController {
  constructor(
    private readonly pmoc: PmocComplianceService,
    private readonly executionRequests: PmocExecutionRequestsService,
    private readonly scheduler: PmocSchedulerService,
  ) {}

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('pmoc/stats')
  stats(@Query() query: PmocDashboardQueryDto): Promise<unknown> {
    return this.pmoc.stats(query);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('pmoc')
  list(@Query() query: ListPmocQueryDto): Promise<unknown> {
    return this.pmoc.list(query);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('pmoc/name-suggestion')
  nameSuggestion(
    @Query() query: PmocNameSuggestionQueryDto,
  ): Promise<{ name: string; provisionalNumber: number }> {
    return this.pmoc.nameSuggestion(query.customerId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Get('pmoc/active-coverage')
  activeCoverage(@Query() query: PmocActiveCoverageQueryDto): Promise<unknown> {
    return this.pmoc.activeCoverage(query.customerId);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('pmoc/scheduler/run')
  runScheduler(
    @Query() query: RunPmocSchedulerQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.scheduler.run(actor, this.context(request), query.limit);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('pmoc/execution-requests/:id')
  getExecutionRequest(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<unknown> {
    return this.executionRequests.get(id);
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR)
  @Get('pmoc/execution-requests/:id/prefill')
  executionRequestPrefill(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<unknown> {
    return this.executionRequests.prefill(id, actor);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('pmoc/execution-requests/:id/generate-work-order')
  generateWorkOrder(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: GeneratePmocWorkOrderDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.executionRequests.generate(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('pmoc/execution-requests/:id/cancel')
  cancelExecutionRequest(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.executionRequests.cancel(id, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Patch('pmoc/execution-requests/:id/reschedule')
  rescheduleExecutionRequest(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: ReschedulePmocExecutionRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.executionRequests.reschedule(id, body, actor, this.context(request));
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

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('pmoc/:id/execution-requests')
  listExecutionRequests(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Query() query: ListPmocExecutionRequestsQueryDto,
  ): Promise<unknown> {
    return this.executionRequests.list(id, query);
  }

  @Roles(Role.OWNER, Role.MANAGER)
  @Post('pmoc/:id/execution-requests')
  createExecutionRequest(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: CreatePmocExecutionRequestDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: RequestWithId,
  ): Promise<unknown> {
    return this.executionRequests.create(id, body, actor, this.context(request));
  }

  @Roles(Role.OWNER, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @Get('pmoc/:id/history')
  history(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<unknown> {
    return this.executionRequests.history(id);
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
