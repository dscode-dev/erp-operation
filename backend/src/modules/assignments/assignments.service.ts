import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AssetLifecycleEventType,
  AssignmentEventType,
  AssignmentStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { ASSIGNMENT_AUDIT_ACTIONS, ASSIGNMENT_RESOURCE } from '../../shared/constants/assignments.constants';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import { buildPaginatedResponse } from '../../shared/types/pagination.types';
import { LifecyclePublisher } from '../asset-lifecycle/lifecycle-publisher.service';
import { PrismaService } from '../database/prisma.service';
import { MaintenancePlanningService } from '../maintenance-planning/maintenance-planning.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  AssignmentNotesDto,
  CreateAssignmentDto,
  ListAssignmentsQueryDto,
  ReassignAssignmentDto,
  RejectAssignmentDto,
} from './dto/assignment.dto';

export interface AssignmentAuditContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

const ASSIGNMENT_INCLUDE = {
  assigner: { select: { id: true, name: true, username: true, role: true } },
  assignee: { select: { id: true, name: true, username: true, role: true } },
  operation: {
    include: {
      customer: { select: { id: true, name: true, tradeName: true } },
      address: true,
      equipment: { select: { id: true, name: true, tag: true, type: true } },
      operator: { select: { id: true, name: true } },
      documents: { orderBy: { createdAt: 'asc' as const } },
    },
  },
} satisfies Prisma.AssignmentInclude;

const ASSIGNMENT_HISTORY_INCLUDE = {
  actor: { select: { id: true, name: true, username: true, role: true } },
} satisfies Prisma.AssignmentHistoryInclude;

type AssignmentPayload = Prisma.AssignmentGetPayload<{ include: typeof ASSIGNMENT_INCLUDE }>;
type AssignmentHistoryPayload = Prisma.AssignmentHistoryGetPayload<{
  include: typeof ASSIGNMENT_HISTORY_INCLUDE;
}>;
type AssignmentLifecycleType =
  | typeof AssetLifecycleEventType.ASSIGNMENT_CREATED
  | typeof AssetLifecycleEventType.ASSIGNMENT_REASSIGNED
  | typeof AssetLifecycleEventType.ASSIGNMENT_ACCEPTED
  | typeof AssetLifecycleEventType.ASSIGNMENT_STARTED
  | typeof AssetLifecycleEventType.ASSIGNMENT_COMPLETED;

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecyclePublisher,
    private readonly maintenance: MaintenancePlanningService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(query: ListAssignmentsQueryDto, actor: AuthenticatedUser): Promise<unknown> {
    const where = this.listWhere(query, actor.role === Role.OPERATOR ? actor.id : undefined);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.assignment.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
        include: ASSIGNMENT_INCLUDE,
      }),
      this.prisma.assignment.count({ where }),
    ]);
    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  async my(query: ListAssignmentsQueryDto, actor: AuthenticatedUser): Promise<unknown> {
    const where = this.listWhere(query, actor.id);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.assignment.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
        include: ASSIGNMENT_INCLUDE,
      }),
      this.prisma.assignment.count({ where }),
    ]);
    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  async get(id: string, actor: AuthenticatedUser): Promise<AssignmentPayload> {
    const assignment = await this.assignmentOrThrow(id);
    this.assertCanRead(assignment, actor);
    return assignment;
  }

  async history(operationId: string, actor: AuthenticatedUser): Promise<AssignmentHistoryPayload[]> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { operationId },
      include: ASSIGNMENT_INCLUDE,
    });
    if (!assignment) {
      throw new ApplicationException(
        ERROR_CODES.ASSIGNMENT_NOT_FOUND,
        'Assignment was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    this.assertCanRead(assignment, actor);
    return this.prisma.assignmentHistory.findMany({
      where: { operationId },
      orderBy: { createdAt: 'asc' },
      include: ASSIGNMENT_HISTORY_INCLUDE,
    });
  }

  async create(
    dto: CreateAssignmentDto,
    actor: AuthenticatedUser,
    context: AssignmentAuditContext,
  ): Promise<AssignmentPayload> {
    return this.prisma.$transaction(async (tx) => {
      await this.operationOrThrowTx(tx, dto.operationId);
      const existing = await tx.assignment.findUnique({
        where: { operationId: dto.operationId },
        select: { id: true },
      });
      if (existing) {
        throw new ApplicationException(
          ERROR_CODES.ASSIGNMENT_INVALID_TRANSITION,
          'Operation already has an assignment',
          HttpStatus.CONFLICT,
        );
      }
      await this.operationalUserOrThrowTx(tx, dto.assignedTo);
      const assignment = await this.createForOperationTx(
        tx,
        {
          operationId: dto.operationId,
          assignedBy: actor.id,
          assignedTo: dto.assignedTo,
          notes: dto.notes ?? null,
        },
        actor.id,
        context,
      );
      return tx.assignment.findUniqueOrThrow({ where: { id: assignment.id }, include: ASSIGNMENT_INCLUDE });
    });
  }

  async reassign(
    id: string,
    dto: ReassignAssignmentDto,
    actor: AuthenticatedUser,
    context: AssignmentAuditContext,
  ): Promise<AssignmentPayload> {
    return this.prisma.$transaction(async (tx) => {
      await this.operationalUserOrThrowTx(tx, dto.assignedTo);
      const current = await this.assignmentOrThrowTx(tx, id);
      this.assertNotFinal(current.status);
      const previousStatus = current.status;
      const now = new Date();
      const transition = await tx.assignment.updateMany({
        where: { id, status: current.status, assignedTo: current.assignedTo },
        data: {
          assignedBy: actor.id,
          assignedTo: dto.assignedTo,
          assignedAt: now,
          status: AssignmentStatus.ASSIGNED,
          acceptedAt: null,
          startedAt: null,
          completedAt: null,
          canceledAt: null,
          rejectedAt: null,
          rejectionReason: null,
          notes: dto.notes ?? current.notes,
        },
      });
      if (transition.count !== 1) {
        throw new ApplicationException(
          ERROR_CODES.ASSIGNMENT_INVALID_TRANSITION,
          'Assignment changed while reassignment was being processed',
          HttpStatus.CONFLICT,
        );
      }
      const assignment = await tx.assignment.findUniqueOrThrow({ where: { id } });
      await tx.operation.update({ where: { id: assignment.operationId }, data: { operatorId: dto.assignedTo } });
      await this.historyTx(tx, assignment, AssignmentEventType.REASSIGNED, actor.id, previousStatus, dto.notes);
      await this.auditTx(tx, ASSIGNMENT_AUDIT_ACTIONS.ASSIGNMENT_REASSIGNED, actor.id, context, {
        assignmentId: assignment.id,
        operationId: assignment.operationId,
        assignedTo: assignment.assignedTo,
        previousStatus,
        newStatus: assignment.status,
      });
      await this.lifecycle.publishAssignmentEventTx(
        tx,
        {
          assignmentId: assignment.id,
          operationId: assignment.operationId,
          actorId: actor.id,
          type: AssetLifecycleEventType.ASSIGNMENT_REASSIGNED,
          description: 'Assignment reassigned',
          metadata: { assignedTo: assignment.assignedTo, previousStatus, newStatus: assignment.status },
        },
        context,
      );
      return tx.assignment.findUniqueOrThrow({ where: { id }, include: ASSIGNMENT_INCLUDE });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async accept(id: string, actor: AuthenticatedUser, context: AssignmentAuditContext): Promise<AssignmentPayload> {
    return this.transition(id, actor, context, {
      event: AssignmentEventType.ACCEPTED,
      action: ASSIGNMENT_AUDIT_ACTIONS.ASSIGNMENT_ACCEPTED,
      status: AssignmentStatus.ACCEPTED,
      lifecycleType: AssetLifecycleEventType.ASSIGNMENT_ACCEPTED,
      field: 'acceptedAt',
      allowedFrom: [AssignmentStatus.ASSIGNED],
      description: 'Assignment accepted',
    });
  }

  async start(id: string, actor: AuthenticatedUser, context: AssignmentAuditContext): Promise<AssignmentPayload> {
    return this.transition(id, actor, context, {
      event: AssignmentEventType.STARTED,
      action: ASSIGNMENT_AUDIT_ACTIONS.ASSIGNMENT_STARTED,
      status: AssignmentStatus.STARTED,
      lifecycleType: AssetLifecycleEventType.ASSIGNMENT_STARTED,
      field: 'startedAt',
      allowedFrom: [AssignmentStatus.ACCEPTED],
      description: 'Assignment started',
      operationStatus: 'IN_PROGRESS',
    });
  }

  async complete(
    id: string,
    dto: AssignmentNotesDto,
    actor: AuthenticatedUser,
    context: AssignmentAuditContext,
  ): Promise<AssignmentPayload> {
    return this.transition(id, actor, context, {
      event: AssignmentEventType.COMPLETED,
      action: ASSIGNMENT_AUDIT_ACTIONS.ASSIGNMENT_COMPLETED,
      status: AssignmentStatus.COMPLETED,
      lifecycleType: AssetLifecycleEventType.ASSIGNMENT_COMPLETED,
      field: 'completedAt',
      allowedFrom: [AssignmentStatus.STARTED],
      description: 'Assignment completed',
      notes: dto.notes,
      operationStatus: 'COMPLETED',
      syncOperationCompletion: true,
    });
  }

  async reject(
    id: string,
    dto: RejectAssignmentDto,
    actor: AuthenticatedUser,
    context: AssignmentAuditContext,
  ): Promise<AssignmentPayload> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.assignmentOrThrowTx(tx, id);
      this.assertAssignee(current, actor);
      this.assertAllowed(current.status, [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED]);
      const now = new Date();
      const transition = await tx.assignment.updateMany({
        where: { id, assignedTo: actor.id, status: current.status },
        data: {
          status: AssignmentStatus.REJECTED,
          rejectedAt: now,
          rejectionReason: dto.rejectionReason,
        },
      });
      if (transition.count !== 1) {
        throw new ApplicationException(
          ERROR_CODES.ASSIGNMENT_INVALID_TRANSITION,
          'Assignment transition conflicted with another update',
          HttpStatus.CONFLICT,
        );
      }
      const assignment = await tx.assignment.findUniqueOrThrow({ where: { id } });
      await this.historyTx(
        tx,
        assignment,
        AssignmentEventType.REJECTED,
        actor.id,
        current.status,
        dto.rejectionReason,
      );
      await this.auditTx(tx, ASSIGNMENT_AUDIT_ACTIONS.ASSIGNMENT_REJECTED, actor.id, context, {
        assignmentId: assignment.id,
        operationId: assignment.operationId,
        reason: dto.rejectionReason,
      });
      return tx.assignment.findUniqueOrThrow({ where: { id }, include: ASSIGNMENT_INCLUDE });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async createForOperationTx(
    tx: Prisma.TransactionClient,
    input: {
      operationId: string;
      assignedBy: string;
      assignedTo: string;
      notes?: string | null;
    },
    actorId: string,
    context?: Partial<AssignmentAuditContext>,
  ): Promise<{ id: string }> {
    await this.operationalUserOrThrowTx(tx, input.assignedTo);
    const assignment = await tx.assignment.create({
      data: {
        operationId: input.operationId,
        assignedBy: input.assignedBy,
        assignedTo: input.assignedTo,
        notes: input.notes ?? null,
      },
    });
    await this.historyTx(tx, assignment, AssignmentEventType.ASSIGNED, actorId, null, input.notes ?? null);
    await this.auditTx(tx, ASSIGNMENT_AUDIT_ACTIONS.ASSIGNMENT_CREATED, actorId, this.safeContext(context), {
      assignmentId: assignment.id,
      operationId: assignment.operationId,
      assignedBy: assignment.assignedBy,
      assignedTo: assignment.assignedTo,
      status: assignment.status,
    });
    await this.lifecycle.publishAssignmentEventTx(
      tx,
      {
        assignmentId: assignment.id,
        operationId: assignment.operationId,
        actorId,
        type: AssetLifecycleEventType.ASSIGNMENT_CREATED,
        description: 'Assignment created',
        metadata: { assignedBy: assignment.assignedBy, assignedTo: assignment.assignedTo },
      },
      context,
    );
    await this.notifications.notifyAssignmentAssignedTx(tx, assignment.id);
    return { id: assignment.id };
  }

  private async transition(
    id: string,
    actor: AuthenticatedUser,
    context: AssignmentAuditContext,
    config: {
      event: AssignmentEventType;
      action: string;
      status: AssignmentStatus;
      lifecycleType: AssignmentLifecycleType;
      field: 'acceptedAt' | 'startedAt' | 'completedAt';
      allowedFrom: AssignmentStatus[];
      description: string;
      notes?: string;
      operationStatus?: 'IN_PROGRESS' | 'COMPLETED';
      syncOperationCompletion?: boolean;
    },
  ): Promise<AssignmentPayload> {
    return this.prisma.$transaction(async (tx) => {
      const current = await this.assignmentOrThrowTx(tx, id);
      this.assertAssignee(current, actor);
      this.assertAllowed(current.status, config.allowedFrom);
      const now = new Date();
      const transition = await tx.assignment.updateMany({
        where: { id, assignedTo: actor.id, status: current.status },
        data: {
          status: config.status,
          [config.field]: now,
          ...(config.notes !== undefined ? { notes: config.notes } : {}),
        },
      });
      if (transition.count !== 1) {
        throw new ApplicationException(
          ERROR_CODES.ASSIGNMENT_INVALID_TRANSITION,
          'Assignment transition conflicted with another update',
          HttpStatus.CONFLICT,
        );
      }
      const assignment = await tx.assignment.findUniqueOrThrow({ where: { id } });
      if (config.operationStatus) {
        const operationTransition = await tx.operation.updateMany({
          where: { id: assignment.operationId },
          data: {
            status: config.operationStatus,
            ...(config.operationStatus === 'COMPLETED' ? { completedAt: now } : {}),
            ...(config.operationStatus === 'IN_PROGRESS' ? { startedAt: now } : {}),
          },
        });
        if (operationTransition.count !== 1) {
          throw new ApplicationException(
            ERROR_CODES.OPERATION_NOT_FOUND,
            'Operation could not be synchronized with assignment',
            HttpStatus.CONFLICT,
          );
        }
      }
      await this.historyTx(tx, assignment, config.event, actor.id, current.status, config.notes);
      await this.auditTx(tx, config.action, actor.id, context, {
        assignmentId: assignment.id,
        operationId: assignment.operationId,
        previousStatus: current.status,
        newStatus: assignment.status,
      });
      await this.lifecycle.publishAssignmentEventTx(
        tx,
        {
          assignmentId: assignment.id,
          operationId: assignment.operationId,
          actorId: actor.id,
          type: config.lifecycleType,
          description: config.description,
          metadata: { previousStatus: current.status, newStatus: assignment.status },
        },
        context,
      );
      if (config.syncOperationCompletion) {
        await this.lifecycle.publishOperationCompletedTx(tx, assignment.operationId, actor.id, context);
        await this.maintenance.syncOperationCompletedTx(tx, assignment.operationId, actor.id, context);
      }
      if (config.status === AssignmentStatus.STARTED) {
        await this.notifications.notifyAssignmentStartedTx(tx, assignment.id);
      }
      if (config.status === AssignmentStatus.COMPLETED) {
        await this.notifications.notifyAssignmentCompletedTx(tx, assignment.id);
      }
      return tx.assignment.findUniqueOrThrow({ where: { id }, include: ASSIGNMENT_INCLUDE });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private listWhere(query: ListAssignmentsQueryDto, forcedAssignee?: string): Prisma.AssignmentWhereInput {
    return {
      ...(query.operationId ? { operationId: query.operationId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(forcedAssignee ? { assignedTo: forcedAssignee } : query.assignedTo ? { assignedTo: query.assignedTo } : {}),
      ...(query.customerId ? { operation: { customerId: query.customerId } } : {}),
      ...(query.equipmentId ? { operation: { equipmentId: query.equipmentId } } : {}),
    };
  }

  private async assignmentOrThrow(id: string): Promise<AssignmentPayload> {
    const assignment = await this.prisma.assignment.findUnique({ where: { id }, include: ASSIGNMENT_INCLUDE });
    if (!assignment) {
      throw new ApplicationException(
        ERROR_CODES.ASSIGNMENT_NOT_FOUND,
        'Assignment was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return assignment;
  }

  private async assignmentOrThrowTx(
    tx: Prisma.TransactionClient,
    id: string,
  ): Promise<Prisma.AssignmentGetPayload<{ include: { operation: true } }>> {
    const assignment = await tx.assignment.findUnique({ where: { id }, include: { operation: true } });
    if (!assignment) {
      throw new ApplicationException(
        ERROR_CODES.ASSIGNMENT_NOT_FOUND,
        'Assignment was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return assignment;
  }

  private async operationOrThrowTx(tx: Prisma.TransactionClient, id: string): Promise<void> {
    const operation = await tx.operation.findUnique({ where: { id }, select: { id: true } });
    if (!operation) {
      throw new ApplicationException(
        ERROR_CODES.OPERATION_NOT_FOUND,
        'Operation was not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async operationalUserOrThrowTx(tx: Prisma.TransactionClient, id: string): Promise<void> {
    const user = await tx.user.findUnique({
      where: { id },
      select: { id: true, role: true, isActive: true, disabledAt: true },
    });
    if (!user || !user.isActive || user.disabledAt || user.role === Role.VIEWER) {
      throw new ApplicationException(
        ERROR_CODES.OPERATION_OPERATOR_INVALID,
        'Assigned operator must exist, be active and have an operational role',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private assertCanRead(assignment: Pick<AssignmentPayload, 'assignedTo'>, actor: AuthenticatedUser): void {
    if (actor.role === Role.OPERATOR && assignment.assignedTo !== actor.id) {
      throw new ApplicationException(
        ERROR_CODES.ASSIGNMENT_OPERATOR_FORBIDDEN,
        'Operators can only access their own assignments',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private assertAssignee(assignment: { assignedTo: string }, actor: AuthenticatedUser): void {
    if (assignment.assignedTo !== actor.id) {
      throw new ApplicationException(
        ERROR_CODES.ASSIGNMENT_OPERATOR_FORBIDDEN,
        'Only the assigned operator can execute this transition',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  private assertNotFinal(status: AssignmentStatus): void {
    if (status === AssignmentStatus.COMPLETED || status === AssignmentStatus.CANCELED) {
      throw new ApplicationException(
        ERROR_CODES.ASSIGNMENT_INVALID_TRANSITION,
        'Final assignments cannot be reassigned',
        HttpStatus.CONFLICT,
      );
    }
  }

  private assertAllowed(current: AssignmentStatus, allowed: AssignmentStatus[]): void {
    if (!allowed.includes(current)) {
      throw new ApplicationException(
        ERROR_CODES.ASSIGNMENT_INVALID_TRANSITION,
        'Assignment transition is not allowed from the current status',
        HttpStatus.CONFLICT,
      );
    }
  }

  private async historyTx(
    tx: Prisma.TransactionClient,
    assignment: { id: string; operationId: string; status: AssignmentStatus },
    event: AssignmentEventType,
    actorId: string,
    previousStatus: AssignmentStatus | null,
    notes?: string | null,
  ): Promise<void> {
    await tx.assignmentHistory.create({
      data: {
        assignmentId: assignment.id,
        operationId: assignment.operationId,
        event,
        actorId,
        previousStatus,
        newStatus: assignment.status,
        notes: notes ?? null,
      },
    });
  }

  private async auditTx(
    tx: Prisma.TransactionClient,
    action: string,
    actorId: string,
    context: AssignmentAuditContext,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        action,
        resource: ASSIGNMENT_RESOURCE,
        actor: actorId,
        metadata: {
          requestId: context.requestId,
          ip: context.ip,
          userAgent: context.userAgent,
          ...metadata,
        },
      },
    });
  }

  private safeContext(context?: Partial<AssignmentAuditContext>): AssignmentAuditContext {
    return {
      requestId: context?.requestId ?? 'system',
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
    };
  }
}
