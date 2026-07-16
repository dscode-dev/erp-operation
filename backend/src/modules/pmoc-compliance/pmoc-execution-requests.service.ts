import { HttpStatus, Injectable } from '@nestjs/common';
import {
  MaintenanceExecutionStatus,
  NotificationType,
  OperationMaintenanceType,
  OperationStatus,
  PmocExecutionOrigin,
  PmocExecutionRequestStatus,
  PmocGenerationMode,
  PmocHistoryAction,
  PmocOperationalStatus,
  PmocPeriodicity,
  PmocSchedulerStatus,
  Prisma,
  TechnicalCatalogType,
  TechnicalCatalogWorkflow,
} from '@prisma/client';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import {
  PMOC_AUDIT_ACTIONS,
  PMOC_EXECUTION_REQUEST_RESOURCE,
} from '../../shared/constants/pmoc.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import { buildPaginatedResponse } from '../../shared/types/pagination.types';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RecurrenceRuleDto } from '../maintenance-planning/dto/maintenance-planning.dto';
import { RecurringEngine } from '../maintenance-planning/recurring-engine.service';
import type { CreateOperationDto } from '../operations/dto/operation.dto';
import { OperationsService, type OperationAuditContext } from '../operations/operations.service';
import type {
  CreatePmocExecutionRequestDto,
  GeneratePmocWorkOrderDto,
  ListPmocExecutionRequestsQueryDto,
  ReschedulePmocExecutionRequestDto,
} from './dto/pmoc-compliance.dto';

const REQUEST_INCLUDE = {
  requester: { select: { id: true, name: true, username: true, role: true } },
  operation: {
    select: {
      id: true,
      number: true,
      type: true,
      status: true,
      scheduledFor: true,
      completedAt: true,
      operator: { select: { id: true, name: true, username: true, role: true, jobTitle: true } },
    },
  },
  maintenanceExecution: {
    select: { id: true, scheduledAt: true, status: true, executedAt: true, operationId: true },
  },
  plannedOperator: { select: { id: true, name: true, username: true, role: true, jobTitle: true, isActive: true, disabledAt: true } },
  plannedTechnician: { select: { id: true, name: true, username: true, role: true, jobTitle: true, isActive: true, disabledAt: true } },
} satisfies Prisma.PmocExecutionRequestInclude;

const PLAN_FOR_EXECUTION_INCLUDE = {
  customer: {
    include: {
      addresses: { orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }] },
    },
  },
  equipment: { include: { address: true } },
  equipments: {
    include: { equipment: { include: { address: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
  maintenancePlan: true,
  defaultOperator: { select: { id: true, role: true, isActive: true, disabledAt: true } },
  defaultTechnician: { select: { id: true, role: true, isActive: true, disabledAt: true } },
} satisfies Prisma.PmocPlanInclude;

const REQUEST_WITH_PLAN_INCLUDE = {
  ...REQUEST_INCLUDE,
  pmocPlan: { include: PLAN_FOR_EXECUTION_INCLUDE },
} satisfies Prisma.PmocExecutionRequestInclude;

type PlanForExecution = Prisma.PmocPlanGetPayload<{
  include: typeof PLAN_FOR_EXECUTION_INCLUDE;
}>;
type RequestWithPlan = Prisma.PmocExecutionRequestGetPayload<{
  include: typeof REQUEST_WITH_PLAN_INCLUDE;
}>;

@Injectable()
export class PmocExecutionRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operations: OperationsService,
    private readonly notifications: NotificationsService,
    private readonly recurrence: RecurringEngine,
  ) {}

  async list(
    pmocPlanId: string,
    query: ListPmocExecutionRequestsQueryDto,
  ): Promise<unknown> {
    await this.planOrThrow(pmocPlanId);
    const where: Prisma.PmocExecutionRequestWhereInput = {
      pmocPlanId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.pmocExecutionRequest.findMany({
        where,
        include: REQUEST_INCLUDE,
        orderBy: [{ scheduledFor: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.pmocExecutionRequest.count({ where }),
    ]);
    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  async get(id: string): Promise<unknown> {
    return this.requestOrThrow(id);
  }

  async history(pmocPlanId: string): Promise<unknown> {
    await this.planOrThrow(pmocPlanId);
    const events = await this.prisma.pmocHistory.findMany({
      where: { pmocPlanId },
      include: {
        actor: { select: { id: true, name: true, username: true, role: true } },
        operation: { select: { id: true, number: true, type: true, status: true } },
        executionRequest: {
          include: {
            operation: {
              select: {
                id: true,
                number: true,
                status: true,
                completedAt: true,
                operator: {
                  select: { id: true, name: true, username: true, role: true, jobTitle: true },
                },
              },
            },
            maintenanceExecution: {
              select: { id: true, status: true, scheduledAt: true, executedAt: true },
            },
            plannedTechnician: {
              select: { id: true, name: true, username: true, role: true, jobTitle: true },
            },
          },
        },
        pmocPlan: {
          select: {
            defaultTechnician: {
              select: { id: true, name: true, username: true, role: true, jobTitle: true },
            },
            responsibleTechnician: true,
          },
        },
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: 500,
    });
    return events.map((event) => ({
      ...event,
      execution: event.executionRequest
        ? {
            executionNumber: event.executionRequest.executionNumber,
            executionYear: event.executionRequest.executionYear,
            workOrderNumber: event.executionRequest.operation?.number ?? null,
            status: event.executionRequest.status,
            scheduledFor: event.executionRequest.scheduledFor,
            generatedAt: event.executionRequest.generatedAt,
            executedAt: event.executionRequest.maintenanceExecution?.executedAt ?? null,
            operator: event.executionRequest.operation?.operator ?? null,
            responsibleTechnician:
              event.executionRequest.plannedTechnician ??
              event.pmocPlan.defaultTechnician ??
              event.pmocPlan.responsibleTechnician,
          }
        : null,
    }));
  }

  async create(
    pmocPlanId: string,
    dto: CreatePmocExecutionRequestDto,
    actor: AuthenticatedUser,
    context: OperationAuditContext,
  ): Promise<unknown> {
    const plan = await this.planOrThrow(pmocPlanId);
    this.assertPlanCanSchedule(plan);
    const scheduledFor = dto.scheduledFor
      ? new Date(dto.scheduledFor)
      : plan.maintenancePlan.nextExecution;
    return this.createForSchedule(plan, scheduledFor, actor.id, context, dto.notes);
  }

  async prefill(id: string, actor: AuthenticatedUser): Promise<CreateOperationDto> {
    const request = await this.requestWithPlanOrThrow(id);
    this.assertRequestCanGenerate(request.status);
    return this.buildOperationPayload(request.pmocPlan, request.scheduledFor, actor, undefined, request);
  }

  async generate(
    id: string,
    dto: GeneratePmocWorkOrderDto,
    actor: AuthenticatedUser,
    context: OperationAuditContext,
    origin: PmocExecutionOrigin = PmocExecutionOrigin.MANUAL,
  ): Promise<unknown> {
    const request = await this.requestWithPlanOrThrow(id);
    this.assertRequestCanGenerate(request.status);
    this.assertPlanCanSchedule(request.pmocPlan);
    const claimed = await this.prisma.$transaction(async (tx) => {
      const result = await tx.pmocExecutionRequest.updateMany({
        where: {
          id,
          status: { in: [PmocExecutionRequestStatus.PENDING, PmocExecutionRequestStatus.FAILED] },
        },
        data: {
          status: PmocExecutionRequestStatus.GENERATING_OS,
          origin,
          requestedBy: actor.id,
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          failureReason: null,
        },
      });
      if (result.count !== 1) return false;
      await tx.pmocHistory.createMany({
        data: [
          ...(request.status === PmocExecutionRequestStatus.FAILED
            ? [
                {
                  pmocPlanId: request.pmocPlanId,
                  executionRequestId: id,
                  actorId: actor.id,
                  action: PmocHistoryAction.REQUEST_RETRY,
                  previousStatus: request.status,
                  newStatus: PmocExecutionRequestStatus.GENERATING_OS,
                  notes: 'Nova tentativa preservando a identidade da execução.',
                  metadata: { executionNumber: request.executionNumber, origin },
                },
              ]
            : []),
          {
            pmocPlanId: request.pmocPlanId,
            executionRequestId: id,
            actorId: actor.id,
            action: PmocHistoryAction.REQUEST_GENERATING_OS,
            previousStatus: request.status,
            newStatus: PmocExecutionRequestStatus.GENERATING_OS,
            notes:
              origin === PmocExecutionOrigin.AUTO
                ? 'Geração automática iniciada.'
                : 'Geração manual confirmada no wizard oficial.',
            metadata: { executionNumber: request.executionNumber, origin },
          },
        ],
      });
      await tx.auditLog.create({
        data: this.audit(
          PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_GENERATING,
          actor.id,
          context,
          {
            pmocPlanId: request.pmocPlanId,
            executionRequestId: id,
            executionNumber: request.executionNumber,
            origin,
          },
        ),
      });
      if (request.status === PmocExecutionRequestStatus.FAILED) {
        await tx.auditLog.create({
          data: this.audit(PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_RETRIED, actor.id, context, {
            pmocPlanId: request.pmocPlanId,
            executionRequestId: id,
            executionNumber: request.executionNumber,
            origin,
          }),
        });
      }
      return true;
    });
    if (!claimed) {
      throw new ApplicationException(
        ERROR_CODES.PMOC_EXECUTION_REQUEST_CONFLICT,
        'Execution request is already being processed',
        HttpStatus.CONFLICT,
      );
    }

    try {
      const authoritative = await this.buildOperationPayload(
        request.pmocPlan,
        request.scheduledFor,
        actor,
        dto.operation,
        request,
      );
      await this.operations.create(authoritative, actor, context, async (tx, operationId) => {
        const now = new Date();
        let executionId = request.maintenanceExecutionId;
        if (!executionId) {
          const execution = await tx.maintenanceExecution.create({
            data: {
              maintenancePlanId: request.pmocPlan.maintenancePlanId,
              scheduledAt: request.scheduledFor,
              status: MaintenanceExecutionStatus.PLANNED,
              notes: 'Execução criada pela solicitação oficial do PMOC.',
            },
            select: { id: true },
          });
          executionId = execution.id;
        }
        await tx.maintenanceExecution.update({
          where: { id: executionId },
          data: { operationId, status: MaintenanceExecutionStatus.LINKED },
        });
        await tx.pmocExecutionRequest.update({
          where: { id },
          data: {
            maintenanceExecutionId: executionId,
            operationId,
            generatedOperationId: operationId,
            status: PmocExecutionRequestStatus.GENERATED,
            generatedAt: now,
            failureReason: null,
          },
        });
        const nextExecution = this.recurrence.next(
          request.pmocPlan.maintenancePlan.recurrenceRule as unknown as RecurrenceRuleDto,
          request.scheduledFor,
        );
        await tx.maintenancePlan.update({
          where: { id: request.pmocPlan.maintenancePlanId },
          data: { nextExecution },
        });
        await tx.$executeRaw`
          UPDATE "pmoc_plans"
          SET
            "last_generated_execution_number" = GREATEST(
              "last_generated_execution_number",
              ${request.executionNumber}
            ),
            "last_successful_generation" = ${now},
            "operational_status" = 'ACTIVE'::"PmocOperationalStatus",
            "updated_at" = ${now}
          WHERE "id" = ${request.pmocPlanId}::uuid
        `;
        await tx.pmocHistory.create({
          data: {
            pmocPlanId: request.pmocPlanId,
            executionRequestId: id,
            operationId,
            actorId: actor.id,
            action:
              origin === PmocExecutionOrigin.AUTO
                ? PmocHistoryAction.OS_GENERATED_AUTO
                : PmocHistoryAction.OS_GENERATED_MANUAL,
            previousStatus: PmocExecutionRequestStatus.GENERATING_OS,
            newStatus: PmocExecutionRequestStatus.GENERATED,
            notes: 'Ordem de Serviço criada pelo workflow oficial de Operations.',
            metadata: { executionNumber: request.executionNumber, origin },
          },
        });
        await tx.auditLog.create({
          data: this.audit(PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_GENERATED, actor.id, context, {
            pmocPlanId: request.pmocPlanId,
            executionRequestId: id,
            operationId,
            origin,
          }),
        });
        await this.notifications.notifyPmocExecutionTx(
          tx,
          id,
          NotificationType.PMOC_OS_GENERATED,
        );
        if (nextExecution <= request.pmocPlan.endDate) {
          const existingNextRequest = await tx.pmocExecutionRequest.findUnique({
            where: {
              pmocPlanId_scheduledFor: {
                pmocPlanId: request.pmocPlanId,
                scheduledFor: nextExecution,
              },
            },
            select: { id: true },
          });
          if (!existingNextRequest) {
            const nextExecutionNumber = await this.reserveExecutionNumberTx(
              tx,
              request.pmocPlanId,
            );
            let nextMaintenance = await tx.maintenanceExecution.findFirst({
              where: {
                maintenancePlanId: request.pmocPlan.maintenancePlanId,
                scheduledAt: nextExecution,
              },
              select: { id: true },
            });
            nextMaintenance ??= await tx.maintenanceExecution.create({
              data: {
                maintenancePlanId: request.pmocPlan.maintenancePlanId,
                scheduledAt: nextExecution,
                notes: 'Próxima execução planejada automaticamente pelo PMOC.',
              },
              select: { id: true },
            });
            const nextRequest = await tx.pmocExecutionRequest.create({
              data: {
                pmocPlanId: request.pmocPlanId,
                maintenanceExecutionId: nextMaintenance.id,
                executionNumber: nextExecutionNumber,
                executionYear: nextExecution.getUTCFullYear(),
                plannedOperatorId: request.pmocPlan.defaultOperatorId,
                plannedTechnicianId: request.pmocPlan.defaultTechnicianId,
                scheduledFor: nextExecution,
                origin:
                  request.pmocPlan.generationMode === PmocGenerationMode.AUTO
                    ? PmocExecutionOrigin.AUTO
                    : PmocExecutionOrigin.MANUAL,
              },
              select: { id: true },
            });
            await tx.pmocHistory.create({
              data: {
                pmocPlanId: request.pmocPlanId,
                executionRequestId: nextRequest.id,
                action:
                  request.pmocPlan.generationMode === PmocGenerationMode.AUTO
                    ? PmocHistoryAction.REQUEST_CREATED_AUTO
                    : PmocHistoryAction.REQUEST_CREATED_MANUAL,
                newStatus: PmocExecutionRequestStatus.PENDING,
                notes: 'Próxima solicitação calculada pelo RecurringEngine.',
                metadata: {
                  executionNumber: nextExecutionNumber,
                  scheduledFor: nextExecution.toISOString(),
                },
              },
            });
            await tx.auditLog.create({
              data: this.audit(
                request.pmocPlan.generationMode === PmocGenerationMode.AUTO
                  ? PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_CREATED_AUTO
                  : PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_CREATED_MANUAL,
                actor.id,
                context,
                {
                  pmocPlanId: request.pmocPlanId,
                  executionRequestId: nextRequest.id,
                  executionNumber: nextExecutionNumber,
                  scheduledFor: nextExecution.toISOString(),
                },
              ),
            });
          }
        }
        await this.syncPlanScheduleTx(tx, request.pmocPlanId);
      });
    } catch (cause) {
      await this.markFailed(id, request.pmocPlanId, actor.id, context, cause);
      throw new ApplicationException(
        ERROR_CODES.PMOC_GENERATION_FAILED,
        'PMOC Work Order generation failed; the request remains traceable',
        HttpStatus.CONFLICT,
      );
    }
    return this.requestOrThrow(id);
  }

  async cancel(
    id: string,
    actor: AuthenticatedUser,
    context: OperationAuditContext,
  ): Promise<unknown> {
    const request = await this.requestWithPlanOrThrow(id);
    if (
      request.status !== PmocExecutionRequestStatus.PENDING &&
      request.status !== PmocExecutionRequestStatus.FAILED
    ) {
      throw this.invalidState('Only pending or failed requests can be cancelled');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.pmocExecutionRequest.update({
        where: { id },
        data: { status: PmocExecutionRequestStatus.CANCELLED, cancelledAt: new Date() },
      });
      if (request.maintenanceExecutionId) {
        await tx.maintenanceExecution.update({
          where: { id: request.maintenanceExecutionId },
          data: { status: MaintenanceExecutionStatus.CANCELED },
        });
      }
      await tx.pmocHistory.create({
        data: {
          pmocPlanId: request.pmocPlanId,
          executionRequestId: id,
          actorId: actor.id,
          action: PmocHistoryAction.REQUEST_CANCELLED,
          previousStatus: request.status,
          newStatus: PmocExecutionRequestStatus.CANCELLED,
          metadata: { executionNumber: request.executionNumber },
        },
      });
      await tx.auditLog.create({
        data: this.audit(PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_CANCELLED, actor.id, context, {
          pmocPlanId: request.pmocPlanId,
          executionRequestId: id,
        }),
      });
      await this.syncPlanScheduleTx(tx, request.pmocPlanId);
    });
    return this.requestOrThrow(id);
  }

  async reschedule(
    id: string,
    dto: ReschedulePmocExecutionRequestDto,
    actor: AuthenticatedUser,
    context: OperationAuditContext,
  ): Promise<unknown> {
    const request = await this.requestWithPlanOrThrow(id);
    if (
      request.status !== PmocExecutionRequestStatus.PENDING &&
      request.status !== PmocExecutionRequestStatus.FAILED
    ) {
      throw this.invalidState('Only pending or failed requests can be rescheduled');
    }
    const scheduledFor = new Date(dto.scheduledFor);
    if (scheduledFor < request.pmocPlan.startDate || scheduledFor > request.pmocPlan.endDate) {
      throw this.invalidState('Execution date must remain inside the PMOC coverage period');
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.pmocExecutionRequest.update({
          where: { id },
          data: {
            scheduledFor,
            executionYear: scheduledFor.getUTCFullYear(),
            failureReason: null,
          },
        });
        if (request.maintenanceExecutionId) {
          await tx.maintenanceExecution.update({
            where: { id: request.maintenanceExecutionId },
            data: { scheduledAt: scheduledFor },
          });
        }
        await tx.pmocHistory.create({
          data: {
            pmocPlanId: request.pmocPlanId,
            executionRequestId: id,
            actorId: actor.id,
            action: PmocHistoryAction.REQUEST_RESCHEDULED,
            previousStatus: request.status,
            newStatus: request.status,
            notes: dto.notes ? this.safeText(dto.notes) : null,
            metadata: {
              executionNumber: request.executionNumber,
              previousScheduledFor: request.scheduledFor.toISOString(),
              scheduledFor: scheduledFor.toISOString(),
            },
          },
        });
        await tx.auditLog.create({
          data: this.audit(PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_RESCHEDULED, actor.id, context, {
            pmocPlanId: request.pmocPlanId,
            executionRequestId: id,
            executionNumber: request.executionNumber,
            previousScheduledFor: request.scheduledFor.toISOString(),
            scheduledFor: scheduledFor.toISOString(),
          }),
        });
        await this.syncPlanScheduleTx(tx, request.pmocPlanId);
      });
    } catch (cause) {
      if (cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002') {
        throw this.invalidState('Another execution is already scheduled for this date');
      }
      throw cause;
    }
    return this.requestOrThrow(id);
  }

  async createForSchedule(
    plan: PlanForExecution,
    scheduledFor: Date,
    actorId: string | null,
    context: OperationAuditContext,
    notes?: string,
  ): Promise<unknown> {
    const existing = await this.prisma.pmocExecutionRequest.findUnique({
      where: { pmocPlanId_scheduledFor: { pmocPlanId: plan.id, scheduledFor } },
      include: REQUEST_INCLUDE,
    });
    if (existing) return existing;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const executionNumber = await this.reserveExecutionNumberTx(tx, plan.id);
        let execution = await tx.maintenanceExecution.findFirst({
          where: { maintenancePlanId: plan.maintenancePlanId, scheduledAt: scheduledFor },
          select: { id: true },
        });
        execution ??= await tx.maintenanceExecution.create({
          data: {
            maintenancePlanId: plan.maintenancePlanId,
            scheduledAt: scheduledFor,
            notes: notes ?? 'Execução planejada pela fundação PMOC.',
          },
          select: { id: true },
        });
        const request = await tx.pmocExecutionRequest.create({
          data: {
            pmocPlanId: plan.id,
            maintenanceExecutionId: execution.id,
            executionNumber,
            executionYear: scheduledFor.getUTCFullYear(),
            scheduledFor,
            requestedBy: actorId,
            plannedOperatorId: plan.defaultOperatorId,
            plannedTechnicianId: plan.defaultTechnicianId,
            origin:
              plan.generationMode === PmocGenerationMode.AUTO
                ? PmocExecutionOrigin.AUTO
                : PmocExecutionOrigin.MANUAL,
          },
          include: REQUEST_INCLUDE,
        });
        await tx.pmocHistory.create({
          data: {
            pmocPlanId: plan.id,
            executionRequestId: request.id,
            actorId,
            action:
              plan.generationMode === PmocGenerationMode.AUTO
                ? PmocHistoryAction.REQUEST_CREATED_AUTO
                : PmocHistoryAction.REQUEST_CREATED_MANUAL,
            newStatus: PmocExecutionRequestStatus.PENDING,
            notes: notes ?? null,
            metadata: {
              executionNumber,
              scheduledFor: scheduledFor.toISOString(),
              generationMode: plan.generationMode,
            },
          },
        });
        await tx.auditLog.create({
          data: this.audit(
            plan.generationMode === PmocGenerationMode.AUTO
              ? PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_CREATED_AUTO
              : PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_CREATED_MANUAL,
            actorId,
            context,
            {
              pmocPlanId: plan.id,
              executionRequestId: request.id,
              executionNumber,
              scheduledFor: scheduledFor.toISOString(),
            },
          ),
        });
        if (
          plan.generationMode === PmocGenerationMode.MANUAL &&
          scheduledFor.getTime() <= Date.now()
        ) {
          await this.notifications.notifyPmocExecutionTx(
            tx,
            request.id,
            NotificationType.PMOC_EXECUTION_PENDING_MANUAL,
          );
        }
        await this.syncPlanScheduleTx(tx, plan.id);
        return request;
      });
    } catch (cause) {
      if (
        cause instanceof Prisma.PrismaClientKnownRequestError &&
        cause.code === 'P2002'
      ) {
        const concurrent = await this.prisma.pmocExecutionRequest.findUnique({
          where: { pmocPlanId_scheduledFor: { pmocPlanId: plan.id, scheduledFor } },
          include: REQUEST_INCLUDE,
        });
        if (concurrent) return concurrent;
      }
      throw cause;
    }
  }

  async dueAutoRequests(limit: number): Promise<Array<{ id: string; pmocPlanId: string }>> {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return this.prisma.pmocExecutionRequest.findMany({
      where: {
        status: PmocExecutionRequestStatus.PENDING,
        scheduledFor: { lte: new Date() },
        pmocPlan: {
          active: true,
          generationMode: PmocGenerationMode.AUTO,
          endDate: { gte: today },
        },
      },
      select: { id: true, pmocPlanId: true },
      orderBy: [{ scheduledFor: 'asc' }, { id: 'asc' }],
      take: limit,
    });
  }

  async notifyDueManualRequests(limit: number): Promise<number> {
    const due = await this.prisma.pmocExecutionRequest.findMany({
      where: {
        status: PmocExecutionRequestStatus.PENDING,
        scheduledFor: { lte: new Date() },
        pmocPlan: { active: true, generationMode: PmocGenerationMode.MANUAL },
      },
      select: { id: true },
      orderBy: [{ scheduledFor: 'asc' }, { id: 'asc' }],
      take: limit,
    });
    for (const request of due) {
      await this.prisma.$transaction((tx) =>
        this.notifications.notifyPmocExecutionTx(
          tx,
          request.id,
          NotificationType.PMOC_EXECUTION_PENDING_MANUAL,
        ),
      );
    }
    return due.length;
  }

  async recoverStaleGenerating(cutoff: Date): Promise<number> {
    const stale = await this.prisma.pmocExecutionRequest.findMany({
      where: {
        status: PmocExecutionRequestStatus.GENERATING_OS,
        lastAttemptAt: { lt: cutoff },
        operationId: null,
      },
      select: { id: true, pmocPlanId: true, requestedBy: true },
      take: 100,
    });
    for (const request of stale) {
      await this.markFailed(
        request.id,
        request.pmocPlanId,
        request.requestedBy,
        { requestId: 'pmoc-scheduler-recovery', ip: null, userAgent: null },
        new Error('Generation lease expired before an Operation was committed'),
      );
    }
    return stale.length;
  }

  async planForScheduler(id: string): Promise<PlanForExecution> {
    return this.planOrThrow(id);
  }

  async beginSchedulerRun(runAt: Date): Promise<void> {
    const runDate = new Date(
      Date.UTC(runAt.getUTCFullYear(), runAt.getUTCMonth(), runAt.getUTCDate()),
    );
    await this.prisma.pmocPlan.updateMany({
      where: {
        active: true,
        generationMode: PmocGenerationMode.AUTO,
        endDate: { gte: runDate },
      },
      data: {
        lastSchedulerRun: runAt,
        lastSchedulerStatus: PmocSchedulerStatus.RUNNING,
        lastSchedulerError: null,
      },
    });
  }

  async completeIdleSchedulerRuns(processedPmocPlanIds: string[], runAt: Date): Promise<void> {
    await this.prisma.pmocPlan.updateMany({
      where: {
        lastSchedulerRun: runAt,
        lastSchedulerStatus: PmocSchedulerStatus.RUNNING,
        ...(processedPmocPlanIds.length
          ? { id: { notIn: [...new Set(processedPmocPlanIds)] } }
          : {}),
      },
      data: { lastSchedulerStatus: PmocSchedulerStatus.SUCCESS },
    });
  }

  async markSchedulerResult(
    pmocPlanId: string,
    status: typeof PmocSchedulerStatus.SUCCESS | typeof PmocSchedulerStatus.PARTIAL_FAILURE | typeof PmocSchedulerStatus.FAILED,
    runAt: Date,
    error?: string,
  ): Promise<void> {
    await this.prisma.pmocPlan.update({
      where: { id: pmocPlanId },
      data: {
        lastSchedulerRun: runAt,
        lastSchedulerStatus: status,
        lastSchedulerError: error ? this.safeText(error) : null,
      },
    });
  }

  private async buildOperationPayload(
    plan: PlanForExecution,
    scheduledFor: Date,
    actor: AuthenticatedUser,
    reviewed?: CreateOperationDto,
    responsibility?: Pick<RequestWithPlan, 'plannedOperator' | 'plannedTechnician'>,
  ): Promise<CreateOperationDto> {
    const equipments = plan.equipments.length
      ? plan.equipments.map((item) => item.equipment)
      : [plan.equipment];
    const catalog = await this.prisma.technicalCatalog.findMany({
      where: {
        organizationId: plan.organizationId,
        type: TechnicalCatalogType.CHECKLIST,
        active: true,
        deletedAt: null,
        OR: [
          { workflows: { has: TechnicalCatalogWorkflow.PMOC } },
          { workflows: { has: TechnicalCatalogWorkflow.GENERAL } },
        ],
      },
      select: { title: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      take: 100,
    });
    const plannedOperator = responsibility?.plannedOperator;
    const activeDefaultOperator =
      plannedOperator?.isActive && !plannedOperator.disabledAt
        ? plannedOperator.id
        : plan.defaultOperator?.isActive && !plan.defaultOperator.disabledAt
          ? plan.defaultOperator.id
        : null;
    const operatorId = reviewed?.operatorId ?? activeDefaultOperator ?? actor.id;
    const addressId =
      reviewed?.addressId ??
      plan.defaultAddressId ??
      plan.equipment.addressId ??
      plan.customer.addresses[0]?.id ??
      undefined;
    return {
      ...reviewed,
      customerId: plan.customerId,
      addressId,
      equipmentId: plan.equipmentId,
      operatorId,
      type: plan.defaultOperationType,
      status: reviewed?.status ?? OperationStatus.DRAFT,
      scheduledFor: scheduledFor.toISOString(),
      checklist:
        reviewed?.checklist ?? catalog.map((item) => ({ label: item.title, done: false })),
      observations:
        reviewed?.observations ??
        plan.defaultOperationObservations ??
        `Execução preventiva vinculada ao PMOC-${String(plan.number).padStart(6, '0')}.${plan.defaultEstimatedDurationMinutes ? ` Duração estimada: ${plan.defaultEstimatedDurationMinutes} minutos.` : ''}`,
      reportedIssue: reviewed?.reportedIssue ?? `Execução programada do ${plan.maintenancePlan.name}.`,
      serviceDescription: reviewed?.serviceDescription ?? plan.coverage ?? plan.observations ?? undefined,
      maintenanceType: reviewed?.maintenanceType ?? this.maintenanceType(plan.periodicity),
      inspectedEquipments:
        reviewed?.inspectedEquipments ??
        equipments.map((equipment) => ({
          equipmentId: equipment.id,
          sector: equipment.address?.name ?? equipment.name,
        })),
    };
  }

  private maintenanceType(periodicity: PmocPeriodicity): OperationMaintenanceType {
    if (periodicity === PmocPeriodicity.WEEKLY || periodicity === PmocPeriodicity.BIWEEKLY) {
      return OperationMaintenanceType.WEEKLY;
    }
    if (periodicity === PmocPeriodicity.QUARTERLY) return OperationMaintenanceType.QUARTERLY;
    if (periodicity === PmocPeriodicity.SEMIANNUAL) return OperationMaintenanceType.SEMIANNUAL;
    if (periodicity === PmocPeriodicity.YEARLY) return OperationMaintenanceType.ANNUAL;
    return OperationMaintenanceType.MONTHLY;
  }

  private async markFailed(
    id: string,
    pmocPlanId: string,
    actorId: string | null,
    context: OperationAuditContext,
    cause: unknown,
  ): Promise<void> {
    const reason = this.failureMessage(cause);
    await this.prisma.$transaction(async (tx) => {
      const request = await tx.pmocExecutionRequest.findUnique({
        where: { id },
        select: { executionNumber: true },
      });
      const failed = await tx.pmocExecutionRequest.updateMany({
        where: {
          id,
          operationId: null,
          status: PmocExecutionRequestStatus.GENERATING_OS,
        },
        data: { status: PmocExecutionRequestStatus.FAILED, failureReason: reason },
      });
      if (failed.count !== 1) return;
      await tx.pmocPlan.update({
        where: { id: pmocPlanId },
        data: { operationalStatus: PmocOperationalStatus.ERROR },
      });
      await tx.pmocHistory.create({
        data: {
          pmocPlanId,
          executionRequestId: id,
          actorId,
          action: PmocHistoryAction.REQUEST_FAILED,
          previousStatus: PmocExecutionRequestStatus.GENERATING_OS,
          newStatus: PmocExecutionRequestStatus.FAILED,
          notes: reason,
          metadata: { executionNumber: request?.executionNumber ?? null },
        },
      });
      await tx.auditLog.create({
        data: this.audit(PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_FAILED, actorId, context, {
          pmocPlanId,
          executionRequestId: id,
          reason,
          executionNumber: request?.executionNumber ?? null,
        }),
      });
      await this.notifications.notifyPmocExecutionTx(
        tx,
        id,
        NotificationType.PMOC_OS_GENERATION_FAILED,
      );
      await this.syncPlanScheduleTx(tx, pmocPlanId);
    });
  }

  private async reserveExecutionNumberTx(
    tx: Prisma.TransactionClient,
    pmocPlanId: string,
  ): Promise<number> {
    const rows = await tx.$queryRaw<Array<{ executionNumber: number }>>`
      UPDATE "pmoc_plans"
      SET
        "last_reserved_execution_number" = "last_reserved_execution_number" + 1,
        "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = ${pmocPlanId}::uuid
      RETURNING "last_reserved_execution_number" AS "executionNumber"
    `;
    const executionNumber = rows[0]?.executionNumber;
    if (!executionNumber) throw this.notFound();
    return executionNumber;
  }

  private async syncPlanScheduleTx(
    tx: Prisma.TransactionClient,
    pmocPlanId: string,
  ): Promise<void> {
    const [execution, generation] = await Promise.all([
      tx.pmocExecutionRequest.aggregate({
        where: {
          pmocPlanId,
          status: {
            in: [
              PmocExecutionRequestStatus.PENDING,
              PmocExecutionRequestStatus.FAILED,
              PmocExecutionRequestStatus.GENERATING_OS,
            ],
          },
        },
        _min: { scheduledFor: true },
      }),
      tx.pmocExecutionRequest.aggregate({
        where: {
          pmocPlanId,
          status: {
            in: [PmocExecutionRequestStatus.PENDING, PmocExecutionRequestStatus.FAILED],
          },
        },
        _min: { scheduledFor: true },
      }),
    ]);
    await tx.pmocPlan.update({
      where: { id: pmocPlanId },
      data: {
        nextExecutionDate: execution._min.scheduledFor,
        nextGenerationDate: generation._min.scheduledFor,
      },
    });
  }

  private async requestOrThrow(id: string): Promise<unknown> {
    const request = await this.prisma.pmocExecutionRequest.findUnique({
      where: { id },
      include: REQUEST_INCLUDE,
    });
    if (!request) throw this.notFound();
    return request;
  }

  private async requestWithPlanOrThrow(id: string): Promise<RequestWithPlan> {
    const request = await this.prisma.pmocExecutionRequest.findUnique({
      where: { id },
      include: REQUEST_WITH_PLAN_INCLUDE,
    });
    if (!request) throw this.notFound();
    return request;
  }

  private async planOrThrow(id: string): Promise<PlanForExecution> {
    const plan = await this.prisma.pmocPlan.findUnique({
      where: { id },
      include: PLAN_FOR_EXECUTION_INCLUDE,
    });
    if (!plan) {
      throw new ApplicationException(
        ERROR_CODES.PMOC_PLAN_NOT_FOUND,
        'PMOC plan was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return plan;
  }

  private assertPlanCanSchedule(plan: PlanForExecution): void {
    if (!plan.active || plan.generationMode === PmocGenerationMode.PAUSED) {
      throw this.invalidState('Paused or inactive PMOC plans cannot generate Work Orders');
    }
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (plan.endDate < today) {
      throw this.invalidState('Expired PMOC plans cannot generate Work Orders');
    }
  }

  private assertRequestCanGenerate(status: PmocExecutionRequestStatus): void {
    if (
      status !== PmocExecutionRequestStatus.PENDING &&
      status !== PmocExecutionRequestStatus.FAILED
    ) {
      throw this.invalidState('Execution request cannot generate a Work Order in its current state');
    }
  }

  private notFound(): ApplicationException {
    return new ApplicationException(
      ERROR_CODES.PMOC_EXECUTION_REQUEST_NOT_FOUND,
      'PMOC execution request was not found',
      HttpStatus.NOT_FOUND,
    );
  }

  private invalidState(message: string): ApplicationException {
    return new ApplicationException(
      ERROR_CODES.PMOC_EXECUTION_REQUEST_INVALID_STATE,
      message,
      HttpStatus.CONFLICT,
    );
  }

  private failureMessage(cause: unknown): string {
    const message =
      cause instanceof ApplicationException
        ? cause.message
        : 'Internal Work Order generation failure';
    return message
      .split('')
      .filter((character) => {
        const code = character.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000);
  }

  private safeText(value: string): string {
    return value
      .split('')
      .filter((character) => {
        const code = character.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000);
  }

  private audit(
    action: string,
    actorId: string | null,
    context: OperationAuditContext,
    metadata: Record<string, unknown>,
  ): Prisma.AuditLogCreateInput {
    return {
      action,
      resource: PMOC_EXECUTION_REQUEST_RESOURCE,
      actor: actorId,
      metadata: {
        ...metadata,
        requestId: context.requestId,
        ip: context.ip,
        userAgent: context.userAgent,
      },
    };
  }
}
