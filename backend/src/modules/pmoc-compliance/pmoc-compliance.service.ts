import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AssetLifecycleEventType,
  DocumentTemplateType,
  MaintenanceExecutionStatus,
  MaintenancePlanType,
  NotificationType,
  OperationType,
  PmocComplianceStatus,
  PmocExecutionOrigin,
  PmocExecutionRequestStatus,
  PmocGenerationMode,
  PmocHistoryAction,
  PmocOperationalStatus,
  PmocPeriodicity,
  Prisma,
  Role,
} from '@prisma/client';
import {
  PMOC_AUDIT_ACTIONS,
  PMOC_ENVIRONMENT_RESOURCE,
  PMOC_EXECUTION_REQUEST_RESOURCE,
  PMOC_RESOURCE,
} from '../../shared/constants/pmoc.constants';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import { buildPaginatedResponse, type PaginatedResponse } from '../../shared/types/pagination.types';
import { LifecyclePublisher } from '../asset-lifecycle/lifecycle-publisher.service';
import { PrismaService } from '../database/prisma.service';
import { DocumentConfigurationService } from '../document-engine/configuration/document-configuration.service';
import {
  RecurrenceFrequency,
  RecurrenceRuleDto,
} from '../maintenance-planning/dto/maintenance-planning.dto';
import { RecurringEngine } from '../maintenance-planning/recurring-engine.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  ComplianceEvaluationResult,
  ComplianceEvaluator,
} from './compliance/compliance.types';
import {
  CreatePmocEnvironmentDto,
  CreatePmocPlanDto,
  ListPmocQueryDto,
  UpdatePmocEnvironmentDto,
  UpdatePmocPlanDto,
} from './dto/pmoc-compliance.dto';

export interface PmocAuditContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

type PmocPayload = Prisma.PmocPlanGetPayload<{ include: typeof PMOC_INCLUDE }>;

const PMOC_INCLUDE = {
  organization: { select: { id: true, legalName: true, tradeName: true } },
  customer: { select: { id: true, name: true, tradeName: true } },
  equipment: { select: { id: true, name: true, tag: true, type: true, status: true } },
  maintenancePlan: {
    include: {
      executions: {
        orderBy: [{ scheduledAt: 'asc' as const }, { id: 'asc' as const }],
        take: 20,
        include: {
          operation: {
            select: { id: true, number: true, type: true, status: true, completedAt: true },
          },
        },
      },
    },
  },
  defaultOperator: { select: { id: true, name: true, username: true, role: true } },
  defaultTechnician: { select: { id: true, name: true, username: true, role: true } },
  defaultAddress: true,
  signatureOverride: {
    select: {
      id: true,
      name: true,
      title: true,
      professionalCouncil: true,
      department: true,
      active: true,
    },
  },
  executionRequests: {
    orderBy: [{ scheduledFor: 'desc' as const }, { id: 'desc' as const }],
    take: 20,
    include: {
      operation: { select: { id: true, number: true, type: true, status: true } },
      plannedOperator: { select: { id: true, name: true, username: true, role: true } },
      plannedTechnician: { select: { id: true, name: true, username: true, role: true } },
      maintenanceExecution: {
        select: { id: true, status: true, scheduledAt: true, executedAt: true },
      },
    },
  },
  equipments: {
    include: {
      equipment: {
        select: { id: true, name: true, tag: true, type: true, status: true, customerId: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  environments: {
    include: {
      equipments: {
        include: {
          equipment: {
            select: { id: true, name: true, tag: true, type: true, status: true, customerId: true },
          },
        },
      },
    },
    orderBy: [{ name: 'asc' as const }, { id: 'asc' as const }],
  },
} satisfies Prisma.PmocPlanInclude;

@Injectable()
export class PmocComplianceService implements ComplianceEvaluator<{
  resourceId: string;
  evaluatedAt: Date;
}> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recurrence: RecurringEngine,
    private readonly lifecycle: LifecyclePublisher,
    private readonly documentConfiguration: DocumentConfigurationService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(query: ListPmocQueryDto): Promise<unknown> {
    const where: Prisma.PmocPlanWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.equipmentId
        ? {
            OR: [
              { equipmentId: query.equipmentId },
              { equipments: { some: { equipmentId: query.equipmentId } } },
            ],
          }
        : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.pmocPlan.findMany({
        where,
        include: PMOC_INCLUDE,
        orderBy: [{ active: 'desc' }, { endDate: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.pmocPlan.count({ where }),
    ]);
    return this.page(
      items.map((item) => this.withCompliance(item)),
      query.page,
      query.limit,
      total,
    );
  }

  async get(id: string): Promise<unknown> {
    const pmoc = await this.pmocOrThrow(id);
    return this.withCompliance(pmoc);
  }

  async create(
    dto: CreatePmocPlanDto,
    actor: AuthenticatedUser,
    context: PmocAuditContext,
  ): Promise<unknown> {
    const periodicity = dto.periodicity ?? this.periodicityFromRule(dto.recurrenceRule);
    const recurrenceRule = dto.recurrenceRule ?? this.ruleForPeriodicity(periodicity);
    this.recurrence.validate(recurrenceRule);
    const startDate = this.dateOnly(dto.startDate);
    const endDate = this.dateOnly(dto.endDate);
    this.assertDateRange(startDate, endDate);

    const organization = await this.organizationOrThrow();
    const customer = await this.customerForPmocOrThrow(dto.customerId);
    const equipment = await this.equipmentForCustomerOrThrow(dto.equipmentId, dto.customerId);
    const equipmentIds = this.unique([dto.equipmentId, ...(dto.equipmentIds ?? [])]);
    await this.equipmentsForCustomerOrThrow(equipmentIds, dto.customerId);
    await this.validateDefaults(
      dto.defaultOperatorId,
      dto.defaultTechnicianId,
      dto.signatureOverrideId,
    );
    await this.validateAddress(dto.defaultAddressId, dto.customerId);

    return this.prisma.$transaction(async (tx) => {
      const maintenancePlan = await tx.maintenancePlan.create({
        data: {
          equipmentId: dto.equipmentId,
          name: (dto.name ? this.clean(dto.name) : `PMOC · ${customer.tradeName ?? customer.name}`).slice(0, 140),
          description: dto.observations ? this.clean(dto.observations) : 'Plano PMOC operacional',
          type: MaintenancePlanType.PREVENTIVE,
          active: dto.active ?? true,
          priority: dto.priority ?? 'HIGH',
          recurrenceRule: recurrenceRule as unknown as Prisma.InputJsonValue,
          firstExecution: startDate,
          nextExecution: startDate,
          createdBy: actor.id,
        },
      });
      const maintenanceExecution = await tx.maintenanceExecution.create({
        data: {
          maintenancePlanId: maintenancePlan.id,
          scheduledAt: startDate,
          notes: 'Execução inicial planejada gerada pelo PMOC.',
        },
      });
      const created = await tx.pmocPlan.create({
        data: {
          organizationId: organization.id,
          customerId: dto.customerId,
          equipmentId: dto.equipmentId,
          maintenancePlanId: maintenancePlan.id,
          coverage: dto.coverage ? this.clean(dto.coverage) : null,
          periodicity,
          generationMode: dto.generationMode ?? PmocGenerationMode.MANUAL,
          defaultOperatorId: dto.defaultOperatorId ?? null,
          defaultTechnicianId: dto.defaultTechnicianId ?? null,
          defaultAddressId: dto.defaultAddressId ?? null,
          defaultOperationType: dto.defaultOperationType ?? OperationType.PREVENTIVA,
          defaultEstimatedDurationMinutes: dto.defaultEstimatedDurationMinutes ?? null,
          defaultOperationObservations: dto.defaultOperationObservations
            ? this.clean(dto.defaultOperationObservations)
            : null,
          signatureOverrideId: dto.signatureOverrideId ?? null,
          operationalStatus:
            dto.generationMode === PmocGenerationMode.PAUSED || dto.active === false
              ? PmocOperationalStatus.PAUSED
              : PmocOperationalStatus.PENDING,
          lastReservedExecutionNumber: 1,
          nextExecutionDate: startDate,
          nextGenerationDate: startDate,
          responsibleTechnician: this.clean(dto.responsibleTechnician),
          artNumber: dto.artNumber ? this.clean(dto.artNumber) : null,
          contractNumber: dto.contractNumber ? this.clean(dto.contractNumber) : null,
          startDate,
          endDate,
          active: dto.active ?? true,
          observations: dto.observations ? this.clean(dto.observations) : null,
          equipments: {
            create: equipmentIds.map((equipmentId) => ({ equipmentId })),
          },
        },
        select: { id: true, number: true },
      });
      const executionRequest = await tx.pmocExecutionRequest.create({
        data: {
          pmocPlanId: created.id,
          maintenanceExecutionId: maintenanceExecution.id,
          executionNumber: 1,
          executionYear: startDate.getUTCFullYear(),
          scheduledFor: startDate,
          requestedBy: actor.id,
          plannedOperatorId: dto.defaultOperatorId ?? null,
          plannedTechnicianId: dto.defaultTechnicianId ?? null,
          origin:
            dto.generationMode === PmocGenerationMode.AUTO
              ? PmocExecutionOrigin.AUTO
              : PmocExecutionOrigin.MANUAL,
        },
      });
      await tx.pmocHistory.createMany({
        data: [
          {
            pmocPlanId: created.id,
            actorId: actor.id,
            action: PmocHistoryAction.CREATED,
            newStatus:
              dto.generationMode === PmocGenerationMode.PAUSED || dto.active === false
                ? PmocOperationalStatus.PAUSED
                : PmocOperationalStatus.PENDING,
            metadata: { periodicity, generationMode: dto.generationMode ?? PmocGenerationMode.MANUAL },
          },
          {
            pmocPlanId: created.id,
            executionRequestId: executionRequest.id,
            actorId: actor.id,
            action:
              dto.generationMode === PmocGenerationMode.AUTO
                ? PmocHistoryAction.REQUEST_CREATED_AUTO
                : PmocHistoryAction.REQUEST_CREATED_MANUAL,
            newStatus: PmocExecutionRequestStatus.PENDING,
            metadata: { executionNumber: 1, scheduledFor: startDate.toISOString() },
          },
        ],
      });
      await tx.maintenancePlan.update({
        where: { id: maintenancePlan.id },
        data: {
          name: dto.name
            ? this.clean(dto.name).slice(0, 140)
            : this.pmocPlanName(customer.tradeName ?? customer.name, created.number),
        },
      });
      const pmoc = await tx.pmocPlan.findUniqueOrThrow({
        where: { id: created.id },
        include: PMOC_INCLUDE,
      });
      await this.lifecycle.publishPmocEventTx(
        tx,
        {
          pmocPlanId: pmoc.id,
          equipmentId: pmoc.equipmentId,
          actorId: actor.id,
          type: AssetLifecycleEventType.PMOC_CREATED,
          description: `PMOC created for ${equipment.name}`,
          metadata: {
            customerId: dto.customerId,
            maintenancePlanId: maintenancePlan.id,
            pmocNumber: pmoc.number,
          },
        },
        context,
      );
      await tx.auditLog.create({
        data: this.audit(PMOC_AUDIT_ACTIONS.CREATED, PMOC_RESOURCE, actor.id, context, {
          pmocPlanId: pmoc.id,
          customerId: dto.customerId,
          equipmentId: dto.equipmentId,
          maintenancePlanId: maintenancePlan.id,
          pmocNumber: pmoc.number,
        }),
      });
      await tx.auditLog.create({
        data: this.audit(
          (dto.generationMode ?? PmocGenerationMode.MANUAL) === PmocGenerationMode.AUTO
            ? PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_CREATED_AUTO
            : PMOC_AUDIT_ACTIONS.EXECUTION_REQUEST_CREATED_MANUAL,
          PMOC_EXECUTION_REQUEST_RESOURCE,
          actor.id,
          context,
          {
            pmocPlanId: pmoc.id,
            executionRequestId: executionRequest.id,
            executionNumber: 1,
            scheduledFor: startDate.toISOString(),
          },
        ),
      });
      if (
        (dto.generationMode ?? PmocGenerationMode.MANUAL) === PmocGenerationMode.MANUAL &&
        startDate.getTime() <= Date.now()
      ) {
        await this.notifications.notifyPmocExecutionTx(
          tx,
          executionRequest.id,
          NotificationType.PMOC_EXECUTION_PENDING_MANUAL,
        );
      }
      return this.withCompliance(pmoc);
    });
  }

  async update(
    id: string,
    dto: UpdatePmocPlanDto,
    actor: AuthenticatedUser,
    context: PmocAuditContext,
  ): Promise<unknown> {
    const existing = await this.pmocOrThrow(id);
    const startDate = dto.startDate ? this.dateOnly(dto.startDate) : existing.startDate;
    const endDate = dto.endDate ? this.dateOnly(dto.endDate) : existing.endDate;
    this.assertDateRange(startDate, endDate);
    const periodicity = dto.periodicity ?? existing.periodicity;
    const recurrenceRule =
      dto.recurrenceRule ??
      (dto.periodicity
        ? this.ruleForPeriodicity(periodicity)
        : (existing.maintenancePlan.recurrenceRule as unknown as RecurrenceRuleDto));
    this.recurrence.validate(recurrenceRule);
    const equipmentIds =
      dto.equipmentIds !== undefined
        ? this.unique([existing.equipmentId, ...dto.equipmentIds])
        : null;
    if (equipmentIds) await this.equipmentsForCustomerOrThrow(equipmentIds, existing.customerId);
    await this.validateDefaults(
      dto.defaultOperatorId ?? undefined,
      dto.defaultTechnicianId ?? undefined,
      dto.signatureOverrideId ?? undefined,
    );
    await this.validateAddress(dto.defaultAddressId ?? undefined, existing.customerId);

    return this.prisma.$transaction(async (tx) => {
      await tx.maintenancePlan.update({
        where: { id: existing.maintenancePlanId },
        data: {
          ...(dto.name ? { name: this.clean(dto.name).slice(0, 140) } : {}),
          ...(dto.priority ? { priority: dto.priority } : {}),
          ...(dto.recurrenceRule || dto.periodicity
            ? { recurrenceRule: recurrenceRule as unknown as Prisma.InputJsonValue }
            : {}),
          ...(dto.startDate ? { firstExecution: startDate, nextExecution: startDate } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
      });
      if (equipmentIds) {
        await tx.pmocPlanEquipment.deleteMany({ where: { pmocPlanId: id } });
        await tx.pmocPlanEquipment.createMany({
          data: equipmentIds.map((equipmentId) => ({ pmocPlanId: id, equipmentId })),
          skipDuplicates: true,
        });
      }
      const pmoc = await tx.pmocPlan.update({
        where: { id },
        data: {
          ...(dto.coverage !== undefined
            ? { coverage: dto.coverage ? this.clean(dto.coverage) : null }
            : {}),
          ...(dto.periodicity ? { periodicity: dto.periodicity } : {}),
          ...(dto.generationMode ? { generationMode: dto.generationMode } : {}),
          ...(dto.defaultOperatorId !== undefined
            ? { defaultOperatorId: dto.defaultOperatorId }
            : {}),
          ...(dto.defaultTechnicianId !== undefined
            ? { defaultTechnicianId: dto.defaultTechnicianId }
            : {}),
          ...(dto.defaultAddressId !== undefined ? { defaultAddressId: dto.defaultAddressId } : {}),
          ...(dto.defaultOperationType !== undefined
            ? { defaultOperationType: dto.defaultOperationType }
            : {}),
          ...(dto.defaultEstimatedDurationMinutes !== undefined
            ? { defaultEstimatedDurationMinutes: dto.defaultEstimatedDurationMinutes }
            : {}),
          ...(dto.defaultOperationObservations !== undefined
            ? {
                defaultOperationObservations: dto.defaultOperationObservations
                  ? this.clean(dto.defaultOperationObservations)
                  : null,
              }
            : {}),
          ...(dto.signatureOverrideId !== undefined
            ? { signatureOverrideId: dto.signatureOverrideId }
            : {}),
          ...(dto.generationMode === PmocGenerationMode.PAUSED || dto.active === false
            ? { operationalStatus: PmocOperationalStatus.PAUSED }
            : dto.generationMode === PmocGenerationMode.AUTO ||
                dto.generationMode === PmocGenerationMode.MANUAL ||
                dto.active === true
              ? { operationalStatus: PmocOperationalStatus.ACTIVE }
              : {}),
          ...(dto.responsibleTechnician !== undefined
            ? { responsibleTechnician: this.clean(dto.responsibleTechnician) }
            : {}),
          ...(dto.artNumber !== undefined
            ? { artNumber: dto.artNumber ? this.clean(dto.artNumber) : null }
            : {}),
          ...(dto.contractNumber !== undefined
            ? { contractNumber: dto.contractNumber ? this.clean(dto.contractNumber) : null }
            : {}),
          ...(dto.startDate ? { startDate } : {}),
          ...(dto.endDate ? { endDate } : {}),
          ...(dto.observations !== undefined
            ? { observations: dto.observations ? this.clean(dto.observations) : null }
            : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        include: PMOC_INCLUDE,
      });
      if (
        dto.applyDefaultsToPendingExecutions &&
        (dto.defaultOperatorId !== undefined || dto.defaultTechnicianId !== undefined)
      ) {
        await tx.pmocExecutionRequest.updateMany({
          where: {
            pmocPlanId: id,
            status: { in: [PmocExecutionRequestStatus.PENDING, PmocExecutionRequestStatus.FAILED] },
          },
          data: {
            ...(dto.defaultOperatorId !== undefined
              ? { plannedOperatorId: dto.defaultOperatorId }
              : {}),
            ...(dto.defaultTechnicianId !== undefined
              ? { plannedTechnicianId: dto.defaultTechnicianId }
              : {}),
          },
        });
      }
      const historyActions: PmocHistoryAction[] = [PmocHistoryAction.UPDATED];
      if (dto.periodicity || dto.recurrenceRule) {
        historyActions.push(PmocHistoryAction.PERIODICITY_CHANGED);
      }
      if (dto.defaultOperatorId !== undefined) {
        historyActions.push(PmocHistoryAction.OPERATOR_CHANGED);
      }
      if (dto.defaultTechnicianId !== undefined) {
        historyActions.push(PmocHistoryAction.TECHNICIAN_CHANGED);
      }
      if (dto.applyDefaultsToPendingExecutions) {
        historyActions.push(PmocHistoryAction.DEFAULTS_PROPAGATED);
      }
      if (dto.coverage !== undefined || dto.equipmentIds !== undefined) {
        historyActions.push(PmocHistoryAction.COVERAGE_CHANGED);
      }
      await tx.pmocHistory.createMany({
        data: historyActions.map((action) => ({
          pmocPlanId: id,
          actorId: actor.id,
          action,
          previousStatus: existing.operationalStatus,
          newStatus: pmoc.operationalStatus,
          metadata: { changedFields: Object.keys(dto) },
        })),
      });
      await this.lifecycle.publishPmocEventTx(
        tx,
        {
          pmocPlanId: pmoc.id,
          equipmentId: pmoc.equipmentId,
          actorId: actor.id,
          type:
            this.withCompliance(pmoc).compliance.status === PmocComplianceStatus.OVERDUE
              ? AssetLifecycleEventType.PMOC_EXPIRED
              : AssetLifecycleEventType.PMOC_UPDATED,
          description: `PMOC updated for ${pmoc.equipment.name}`,
          metadata: { changedFields: Object.keys(dto), maintenancePlanId: pmoc.maintenancePlanId },
        },
        context,
      );
      await tx.auditLog.create({
        data: this.audit(PMOC_AUDIT_ACTIONS.UPDATED, PMOC_RESOURCE, actor.id, context, {
          pmocPlanId: id,
          changedFields: Object.keys(dto),
        }),
      });
      if (dto.applyDefaultsToPendingExecutions) {
        await tx.auditLog.create({
          data: this.audit(
            PMOC_AUDIT_ACTIONS.DEFAULTS_PROPAGATED,
            PMOC_RESOURCE,
            actor.id,
            context,
            {
              pmocPlanId: id,
              defaultOperatorId: dto.defaultOperatorId,
              defaultTechnicianId: dto.defaultTechnicianId,
              targetStatuses: [
                PmocExecutionRequestStatus.PENDING,
                PmocExecutionRequestStatus.FAILED,
              ],
            },
          ),
        });
      }
      return this.withCompliance(pmoc);
    });
  }

  async delete(
    id: string,
    actor: AuthenticatedUser,
    context: PmocAuditContext,
  ): Promise<{ deleted: true }> {
    const pmoc = await this.pmocOrThrow(id);
    await this.prisma.$transaction(async (tx) => {
      const cancelledAt = new Date();
      const cancellable = await tx.pmocExecutionRequest.findMany({
        where: {
          pmocPlanId: id,
          status: {
            in: [PmocExecutionRequestStatus.PENDING, PmocExecutionRequestStatus.FAILED],
          },
        },
        select: { id: true, executionNumber: true },
      });
      await tx.pmocExecutionRequest.updateMany({
        where: { id: { in: cancellable.map((item) => item.id) } },
        data: { status: PmocExecutionRequestStatus.CANCELLED, cancelledAt },
      });
      await tx.pmocPlan.update({
        where: { id },
        data: {
          active: false,
          generationMode: PmocGenerationMode.PAUSED,
          operationalStatus: PmocOperationalStatus.PAUSED,
          nextExecutionDate: null,
          nextGenerationDate: null,
        },
      });
      await tx.maintenancePlan.update({
        where: { id: pmoc.maintenancePlanId },
        data: { active: false },
      });
      if (cancellable.length) {
        await tx.pmocHistory.createMany({
          data: cancellable.map((request) => ({
            pmocPlanId: id,
            executionRequestId: request.id,
            actorId: actor.id,
            action: PmocHistoryAction.REQUEST_CANCELLED,
            newStatus: PmocExecutionRequestStatus.CANCELLED,
            notes: 'Solicitação cancelada pela desativação do PMOC.',
            metadata: { executionNumber: request.executionNumber },
          })),
        });
      }
      await tx.auditLog.create({
        data: this.audit(PMOC_AUDIT_ACTIONS.DELETED, PMOC_RESOURCE, actor.id, context, {
          pmocPlanId: id,
          maintenancePlanId: pmoc.maintenancePlanId,
        }),
      });
    });
    return { deleted: true };
  }

  async listEnvironments(pmocPlanId: string): Promise<unknown> {
    await this.pmocOrThrow(pmocPlanId);
    return this.prisma.pmocEnvironment.findMany({
      where: { pmocPlanId },
      include: { equipments: { include: { equipment: true } } },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async createEnvironment(
    pmocPlanId: string,
    dto: CreatePmocEnvironmentDto,
    actor: AuthenticatedUser,
    context: PmocAuditContext,
  ): Promise<unknown> {
    const pmoc = await this.pmocOrThrow(pmocPlanId);
    const equipmentIds = dto.equipmentIds ? this.unique(dto.equipmentIds) : [];
    this.assertPmocEquipments(pmoc, equipmentIds);
    return this.prisma.$transaction(async (tx) => {
      const environment = await tx.pmocEnvironment.create({
        data: {
          pmocPlanId,
          name: this.clean(dto.name),
          area: dto.area ? this.clean(dto.area) : null,
          occupancy: dto.occupancy ?? null,
          observations: dto.observations ? this.clean(dto.observations) : null,
          equipments: {
            create: equipmentIds.map((equipmentId) => ({ equipmentId })),
          },
        },
        include: { equipments: { include: { equipment: true } } },
      });
      await tx.auditLog.create({
        data: this.audit(
          PMOC_AUDIT_ACTIONS.ENVIRONMENT_CREATED,
          PMOC_ENVIRONMENT_RESOURCE,
          actor.id,
          context,
          { pmocPlanId, environmentId: environment.id },
        ),
      });
      return environment;
    });
  }

  async updateEnvironment(
    id: string,
    dto: UpdatePmocEnvironmentDto,
    actor: AuthenticatedUser,
    context: PmocAuditContext,
  ): Promise<unknown> {
    const existing = await this.environmentOrThrow(id);
    const pmoc = await this.pmocOrThrow(existing.pmocPlanId);
    const equipmentIds = dto.equipmentIds ? this.unique(dto.equipmentIds) : null;
    if (equipmentIds) this.assertPmocEquipments(pmoc, equipmentIds);
    return this.prisma.$transaction(async (tx) => {
      if (equipmentIds) {
        await tx.pmocEnvironmentEquipment.deleteMany({ where: { environmentId: id } });
        await tx.pmocEnvironmentEquipment.createMany({
          data: equipmentIds.map((equipmentId) => ({ environmentId: id, equipmentId })),
          skipDuplicates: true,
        });
      }
      const environment = await tx.pmocEnvironment.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: this.clean(dto.name) } : {}),
          ...(dto.area !== undefined ? { area: dto.area ? this.clean(dto.area) : null } : {}),
          ...(dto.occupancy !== undefined ? { occupancy: dto.occupancy } : {}),
          ...(dto.observations !== undefined
            ? { observations: dto.observations ? this.clean(dto.observations) : null }
            : {}),
        },
        include: { equipments: { include: { equipment: true } } },
      });
      await tx.auditLog.create({
        data: this.audit(
          PMOC_AUDIT_ACTIONS.ENVIRONMENT_UPDATED,
          PMOC_ENVIRONMENT_RESOURCE,
          actor.id,
          context,
          { pmocPlanId: existing.pmocPlanId, environmentId: id, changedFields: Object.keys(dto) },
        ),
      });
      return environment;
    });
  }

  async deleteEnvironment(
    id: string,
    actor: AuthenticatedUser,
    context: PmocAuditContext,
  ): Promise<{ deleted: true }> {
    const existing = await this.environmentOrThrow(id);
    await this.prisma.$transaction([
      this.prisma.pmocEnvironment.delete({ where: { id } }),
      this.prisma.auditLog.create({
        data: this.audit(
          PMOC_AUDIT_ACTIONS.ENVIRONMENT_DELETED,
          PMOC_ENVIRONMENT_RESOURCE,
          actor.id,
          context,
          { pmocPlanId: existing.pmocPlanId, environmentId: id },
        ),
      }),
    ]);
    return { deleted: true };
  }

  async compliance(id: string): Promise<unknown> {
    const pmoc = await this.pmocOrThrow(id);
    const documentConfiguration = await this.documentConfiguration.getConfigurationForType(
      DocumentTemplateType.PMOC,
    );
    return {
      pmocPlanId: id,
      ...this.evaluatePayload(pmoc),
      document: {
        type: DocumentTemplateType.PMOC,
        engine: 'DocumentEngine',
        defaultTemplate: documentConfiguration.defaultTemplate,
        ready: Boolean(documentConfiguration.defaultTemplate),
      },
    };
  }

  async evaluate(context: {
    resourceId: string;
    evaluatedAt: Date;
  }): Promise<ComplianceEvaluationResult> {
    const pmoc = await this.pmocOrThrow(context.resourceId);
    return this.evaluatePayload(pmoc, context.evaluatedAt);
  }

  async equipmentPmoc(equipmentId: string, query: ListPmocQueryDto): Promise<unknown> {
    await this.equipmentExistsOrThrow(equipmentId);
    return this.list({ ...query, equipmentId });
  }

  async stats(): Promise<unknown> {
    const now = new Date();
    const [plans, environments, monitored] = await this.prisma.$transaction([
      this.prisma.pmocPlan.findMany({ include: PMOC_INCLUDE }),
      this.prisma.pmocEnvironment.count(),
      this.prisma.pmocPlanEquipment.count(),
    ]);
    const evaluated = plans.map((plan) => this.evaluatePayload(plan, now).status);
    return {
      activePmocs: plans.filter((plan) => plan.active).length,
      expiredPmocs: evaluated.filter((status) => status === PmocComplianceStatus.OVERDUE).length,
      compliantPmocs: evaluated.filter((status) => status === PmocComplianceStatus.COMPLIANT)
        .length,
      pendingPmocs: evaluated.filter(
        (status) =>
          status === PmocComplianceStatus.WARNING || status === PmocComplianceStatus.IN_PROGRESS,
      ).length,
      environments,
      monitoredEquipments: monitored,
      upcomingExecutions: plans.reduce(
        (count, plan) =>
          count +
          plan.maintenancePlan.executions.filter(
            (execution) =>
              execution.status === MaintenanceExecutionStatus.PLANNED &&
              execution.scheduledAt >= now,
          ).length,
        0,
      ),
    };
  }

  private withCompliance<T extends PmocPayload>(
    pmoc: T,
  ): T & { operationalStatus: PmocOperationalStatus; compliance: ComplianceEvaluationResult } {
    return {
      ...pmoc,
      operationalStatus: this.operationalStatus(pmoc),
      compliance: this.evaluatePayload(pmoc),
    };
  }

  private operationalStatus(pmoc: PmocPayload, now = new Date()): PmocOperationalStatus {
    if (!pmoc.active || pmoc.generationMode === PmocGenerationMode.PAUSED) {
      return PmocOperationalStatus.PAUSED;
    }
    if (pmoc.endDate < now) return PmocOperationalStatus.EXPIRED;
    if (pmoc.executionRequests.some((request) => request.status === PmocExecutionRequestStatus.FAILED)) {
      return PmocOperationalStatus.ERROR;
    }
    if (
      pmoc.executionRequests.some(
        (request) =>
          request.status === PmocExecutionRequestStatus.PENDING && request.scheduledFor < now,
      )
    ) {
      return PmocOperationalStatus.OVERDUE;
    }
    if (pmoc.executionRequests.some((request) => request.status === PmocExecutionRequestStatus.PENDING)) {
      return PmocOperationalStatus.PENDING;
    }
    return PmocOperationalStatus.ACTIVE;
  }

  private evaluatePayload(pmoc: PmocPayload, evaluatedAt = new Date()): ComplianceEvaluationResult {
    const reasons: string[] = [];
    const pending = pmoc.maintenancePlan.executions.filter(
      (execution) =>
        execution.status === MaintenanceExecutionStatus.PLANNED ||
        execution.status === MaintenanceExecutionStatus.LINKED,
    );
    const overdueExecutions = pending.filter((execution) => execution.scheduledAt < evaluatedAt);
    const nextSevenDays = new Date(evaluatedAt);
    nextSevenDays.setUTCDate(nextSevenDays.getUTCDate() + 7);
    const upcomingSoon = pending.filter((execution) => execution.scheduledAt <= nextSevenDays);

    let status: PmocComplianceStatus = PmocComplianceStatus.COMPLIANT;
    if (!pmoc.active || !pmoc.maintenancePlan.active) {
      status = PmocComplianceStatus.NON_COMPLIANT;
      reasons.push('PMOC or maintenance plan is inactive');
    } else if (pmoc.endDate < evaluatedAt) {
      status = PmocComplianceStatus.OVERDUE;
      reasons.push('PMOC validity is expired');
    } else if (overdueExecutions.length > 0) {
      status = PmocComplianceStatus.OVERDUE;
      reasons.push('There are overdue maintenance executions');
    } else if (pmoc.startDate > evaluatedAt) {
      status = PmocComplianceStatus.IN_PROGRESS;
      reasons.push('PMOC validity has not started yet');
    } else if (upcomingSoon.length > 0) {
      status = PmocComplianceStatus.WARNING;
      reasons.push('There are upcoming PMOC executions within seven days');
    }

    return { status, reasons, evaluatedAt };
  }

  private async pmocOrThrow(id: string): Promise<PmocPayload> {
    const pmoc = await this.prisma.pmocPlan.findUnique({ where: { id }, include: PMOC_INCLUDE });
    if (!pmoc) {
      throw new ApplicationException(
        ERROR_CODES.PMOC_PLAN_NOT_FOUND,
        'PMOC plan was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return pmoc;
  }

  private async environmentOrThrow(id: string): Promise<{ id: string; pmocPlanId: string }> {
    const environment = await this.prisma.pmocEnvironment.findUnique({
      where: { id },
      select: { id: true, pmocPlanId: true },
    });
    if (!environment) {
      throw new ApplicationException(
        ERROR_CODES.PMOC_ENVIRONMENT_NOT_FOUND,
        'PMOC environment was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return environment;
  }

  private async organizationOrThrow(): Promise<{ id: string }> {
    const organization = await this.prisma.organization.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!organization) {
      throw new ApplicationException(
        ERROR_CODES.ORGANIZATION_NOT_FOUND,
        'Organization was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return organization;
  }

  private async equipmentExistsOrThrow(id: string): Promise<void> {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!equipment) {
      throw new ApplicationException(
        ERROR_CODES.EQUIPMENT_NOT_FOUND,
        'Equipment was not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async equipmentForCustomerOrThrow(
    equipmentId: string,
    customerId: string,
  ): Promise<{ id: string; name: string }> {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { id: true, name: true, customerId: true },
    });
    if (!equipment) {
      throw new ApplicationException(
        ERROR_CODES.EQUIPMENT_NOT_FOUND,
        'Equipment was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (equipment.customerId !== customerId) {
      throw new ApplicationException(
        ERROR_CODES.PMOC_INVALID_RELATIONSHIP,
        'Equipment does not belong to the PMOC customer',
        HttpStatus.BAD_REQUEST,
      );
    }
    return equipment;
  }

  private async equipmentsForCustomerOrThrow(
    equipmentIds: string[],
    customerId: string,
  ): Promise<void> {
    const equipments = await this.prisma.equipment.findMany({
      where: { id: { in: equipmentIds } },
      select: { id: true, customerId: true },
    });
    if (equipments.length !== equipmentIds.length) {
      throw new ApplicationException(
        ERROR_CODES.EQUIPMENT_NOT_FOUND,
        'One or more PMOC equipments were not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (equipments.some((equipment) => equipment.customerId !== customerId)) {
      throw new ApplicationException(
        ERROR_CODES.PMOC_INVALID_RELATIONSHIP,
        'All PMOC equipments must belong to the same customer',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async customerForPmocOrThrow(
    customerId: string,
  ): Promise<{ id: string; name: string; tradeName: string | null }> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, isActive: true },
      select: { id: true, name: true, tradeName: true },
    });
    if (!customer) {
      throw new ApplicationException(
        ERROR_CODES.CUSTOMER_NOT_FOUND,
        'Active PMOC customer was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return customer;
  }

  private pmocPlanName(customerName: string, pmocNumber: number): string {
    const prefix = 'PMOC · ';
    const suffix = ` · PMOC-${String(pmocNumber).padStart(6, '0')}`;
    const customerLimit = Math.max(1, 140 - prefix.length - suffix.length);
    return `${prefix}${this.clean(customerName).slice(0, customerLimit)}${suffix}`;
  }

  private periodicityFromRule(rule?: RecurrenceRuleDto): PmocPeriodicity {
    if (!rule) return PmocPeriodicity.MONTHLY;
    const interval = rule.interval ?? 1;
    if (rule.frequency === RecurrenceFrequency.WEEKLY && interval === 1) return PmocPeriodicity.WEEKLY;
    if (rule.frequency === RecurrenceFrequency.WEEKLY && interval === 2) return PmocPeriodicity.BIWEEKLY;
    if (rule.frequency === RecurrenceFrequency.MONTHLY && interval === 1) return PmocPeriodicity.MONTHLY;
    if (rule.frequency === RecurrenceFrequency.MONTHLY && interval === 2) return PmocPeriodicity.BIMONTHLY;
    if (rule.frequency === RecurrenceFrequency.MONTHLY && interval === 3) return PmocPeriodicity.QUARTERLY;
    if (rule.frequency === RecurrenceFrequency.MONTHLY && interval === 4) return PmocPeriodicity.FOUR_MONTHLY;
    if (rule.frequency === RecurrenceFrequency.MONTHLY && interval === 6) return PmocPeriodicity.SEMIANNUAL;
    if (rule.frequency === RecurrenceFrequency.YEARLY && interval === 1) return PmocPeriodicity.YEARLY;
    return PmocPeriodicity.CUSTOM;
  }

  private ruleForPeriodicity(periodicity: PmocPeriodicity): RecurrenceRuleDto {
    const rules: Record<Exclude<PmocPeriodicity, 'CUSTOM'>, RecurrenceRuleDto> = {
      WEEKLY: { frequency: RecurrenceFrequency.WEEKLY, interval: 1 },
      BIWEEKLY: { frequency: RecurrenceFrequency.WEEKLY, interval: 2 },
      MONTHLY: { frequency: RecurrenceFrequency.MONTHLY, interval: 1 },
      BIMONTHLY: { frequency: RecurrenceFrequency.MONTHLY, interval: 2 },
      QUARTERLY: { frequency: RecurrenceFrequency.MONTHLY, interval: 3 },
      FOUR_MONTHLY: { frequency: RecurrenceFrequency.MONTHLY, interval: 4 },
      SEMIANNUAL: { frequency: RecurrenceFrequency.MONTHLY, interval: 6 },
      YEARLY: { frequency: RecurrenceFrequency.YEARLY, interval: 1 },
    };
    if (periodicity === PmocPeriodicity.CUSTOM) {
      throw new ApplicationException(
        ERROR_CODES.MAINTENANCE_RECURRENCE_INVALID,
        'CUSTOM PMOC periodicity requires recurrenceRule',
        HttpStatus.BAD_REQUEST,
      );
    }
    return rules[periodicity];
  }

  private async validateDefaults(
    operatorId?: string,
    technicianId?: string,
    signatureId?: string,
  ): Promise<void> {
    const userIds = this.unique([operatorId, technicianId].filter((id): id is string => Boolean(id)));
    if (userIds.length) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds }, isActive: true, disabledAt: null },
        select: { id: true, role: true },
      });
      if (users.length !== userIds.length) {
        throw new ApplicationException(
          ERROR_CODES.USER_NOT_FOUND,
          'PMOC default users must exist and be active',
          HttpStatus.NOT_FOUND,
        );
      }
      const operator = operatorId ? users.find((user) => user.id === operatorId) : null;
      if (operator?.role === Role.VIEWER) {
        throw new ApplicationException(
          ERROR_CODES.OPERATION_OPERATOR_INVALID,
          'Viewer cannot be the default PMOC operator',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    if (signatureId) {
      const signature = await this.prisma.signature.findFirst({
        where: { id: signatureId, active: true, deletedAt: null },
        select: { id: true },
      });
      if (!signature) {
        throw new ApplicationException(
          ERROR_CODES.SIGNATURE_NOT_FOUND,
          'Active PMOC signature override was not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }
  }

  private async validateAddress(addressId: string | undefined, customerId: string): Promise<void> {
    if (!addressId) return;
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
      select: { id: true },
    });
    if (!address) {
      throw new ApplicationException(
        ERROR_CODES.PMOC_INVALID_RELATIONSHIP,
        'PMOC default address must belong to the selected customer',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertPmocEquipments(pmoc: PmocPayload, equipmentIds: string[]): void {
    const allowed = new Set(pmoc.equipments.map((item) => item.equipmentId));
    for (const equipmentId of equipmentIds) {
      if (!allowed.has(equipmentId)) {
        throw new ApplicationException(
          ERROR_CODES.PMOC_INVALID_RELATIONSHIP,
          'Environment equipment must be controlled by the PMOC',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  private assertDateRange(startDate: Date, endDate: Date): void {
    if (endDate < startDate) {
      throw new ApplicationException(
        ERROR_CODES.VALIDATION_ERROR,
        'PMOC endDate must be after startDate',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private dateOnly(value: string): Date {
    return new Date(value);
  }

  private clean(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private unique(values: string[]): string[] {
    return [...new Set(values)];
  }

  private page<T>(items: T[], page: number, limit: number, total: number): PaginatedResponse<T> {
    return buildPaginatedResponse(items, total, page, limit);
  }

  private audit(
    action: string,
    resource: string,
    actor: string,
    context: PmocAuditContext,
    metadata: Record<string, unknown>,
  ): Prisma.AuditLogUncheckedCreateInput {
    return {
      action,
      resource,
      actor,
      metadata: {
        requestId: context.requestId,
        ip: context.ip,
        userAgent: context.userAgent,
        ...metadata,
      },
    };
  }
}
