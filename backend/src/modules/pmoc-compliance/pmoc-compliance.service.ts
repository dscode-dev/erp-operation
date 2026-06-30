import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AssetLifecycleEventType,
  DocumentTemplateType,
  MaintenanceExecutionStatus,
  MaintenancePlanType,
  PmocComplianceStatus,
  Prisma,
} from '@prisma/client';
import {
  PMOC_AUDIT_ACTIONS,
  PMOC_ENVIRONMENT_RESOURCE,
  PMOC_RESOURCE,
} from '../../shared/constants/pmoc.constants';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import { LifecyclePublisher } from '../asset-lifecycle/lifecycle-publisher.service';
import { PrismaService } from '../database/prisma.service';
import { DocumentConfigurationService } from '../document-engine/configuration/document-configuration.service';
import { RecurrenceRuleDto } from '../maintenance-planning/dto/maintenance-planning.dto';
import { RecurringEngine } from '../maintenance-planning/recurring-engine.service';
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
    this.recurrence.validate(dto.recurrenceRule);
    const startDate = this.dateOnly(dto.startDate);
    const endDate = this.dateOnly(dto.endDate);
    this.assertDateRange(startDate, endDate);

    const organization = await this.organizationOrThrow();
    const equipment = await this.equipmentForCustomerOrThrow(dto.equipmentId, dto.customerId);
    const equipmentIds = this.unique([dto.equipmentId, ...(dto.equipmentIds ?? [])]);
    await this.equipmentsForCustomerOrThrow(equipmentIds, dto.customerId);

    return this.prisma.$transaction(async (tx) => {
      const maintenancePlan = await tx.maintenancePlan.create({
        data: {
          equipmentId: dto.equipmentId,
          name: `PMOC · ${equipment.name}`,
          description: dto.observations ? this.clean(dto.observations) : 'Plano PMOC operacional',
          type: MaintenancePlanType.PREVENTIVE,
          active: dto.active ?? true,
          priority: dto.priority ?? 'HIGH',
          recurrenceRule: dto.recurrenceRule as unknown as Prisma.InputJsonValue,
          firstExecution: startDate,
          nextExecution: startDate,
          createdBy: actor.id,
          executions: {
            create: {
              scheduledAt: startDate,
              notes: 'Execução inicial planejada gerada pelo PMOC.',
            },
          },
        },
      });
      const pmoc = await tx.pmocPlan.create({
        data: {
          organizationId: organization.id,
          customerId: dto.customerId,
          equipmentId: dto.equipmentId,
          maintenancePlanId: maintenancePlan.id,
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
          metadata: { customerId: dto.customerId, maintenancePlanId: maintenancePlan.id },
        },
        context,
      );
      await tx.auditLog.create({
        data: this.audit(PMOC_AUDIT_ACTIONS.CREATED, PMOC_RESOURCE, actor.id, context, {
          pmocPlanId: pmoc.id,
          customerId: dto.customerId,
          equipmentId: dto.equipmentId,
          maintenancePlanId: maintenancePlan.id,
        }),
      });
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
    const recurrenceRule =
      dto.recurrenceRule ??
      (existing.maintenancePlan.recurrenceRule as unknown as RecurrenceRuleDto);
    this.recurrence.validate(recurrenceRule);
    const equipmentIds =
      dto.equipmentIds !== undefined
        ? this.unique([existing.equipmentId, ...dto.equipmentIds])
        : null;
    if (equipmentIds) await this.equipmentsForCustomerOrThrow(equipmentIds, existing.customerId);

    return this.prisma.$transaction(async (tx) => {
      await tx.maintenancePlan.update({
        where: { id: existing.maintenancePlanId },
        data: {
          ...(dto.priority ? { priority: dto.priority } : {}),
          ...(dto.recurrenceRule
            ? { recurrenceRule: dto.recurrenceRule as unknown as Prisma.InputJsonValue }
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
      return this.withCompliance(pmoc);
    });
  }

  async delete(
    id: string,
    actor: AuthenticatedUser,
    context: PmocAuditContext,
  ): Promise<{ deleted: true }> {
    const pmoc = await this.pmocOrThrow(id);
    await this.prisma.$transaction([
      this.prisma.pmocPlan.update({ where: { id }, data: { active: false } }),
      this.prisma.maintenancePlan.update({
        where: { id: pmoc.maintenancePlanId },
        data: { active: false },
      }),
      this.prisma.auditLog.create({
        data: this.audit(PMOC_AUDIT_ACTIONS.DELETED, PMOC_RESOURCE, actor.id, context, {
          pmocPlanId: id,
          maintenancePlanId: pmoc.maintenancePlanId,
        }),
      }),
    ]);
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
  ): T & { compliance: ComplianceEvaluationResult } {
    return { ...pmoc, compliance: this.evaluatePayload(pmoc) };
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

  private page<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
  ): {
    items: T[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  } {
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
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
