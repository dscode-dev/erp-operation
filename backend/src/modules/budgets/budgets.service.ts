import { HttpStatus, Injectable } from '@nestjs/common';
import { AssetLifecycleEventType, BudgetHistoryAction, BudgetStatus, DocumentTemplateType, Prisma } from '@prisma/client';
import { BUDGET_AUDIT_ACTIONS, BUDGET_RESOURCE } from '../../shared/constants/budgets.constants';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import { buildPaginatedResponse, type PaginatedResponse } from '../../shared/types/pagination.types';
import { LifecyclePublisher } from '../asset-lifecycle/lifecycle-publisher.service';
import { PrismaService } from '../database/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import type { BudgetDecisionDto, BudgetItemInputDto, CreateBudgetDto, ListBudgetsQueryDto, UpdateBudgetDto } from './dto/budget.dto';

export interface BudgetAuditContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

const BUDGET_INCLUDE = {
  organization: { select: { id: true, tradeName: true, legalName: true } },
  operation: { select: { id: true, number: true, type: true, status: true, equipmentId: true, customerId: true } },
  customer: { select: { id: true, name: true, tradeName: true, email: true, phone: true } },
  customerAddress: true,
  equipment: { select: { id: true, name: true, tag: true, type: true, status: true } },
  creator: { select: { id: true, name: true, email: true, username: true, role: true } },
  items: { include: { product: true }, orderBy: { createdAt: 'asc' } },
  document: {
    select: {
      id: true,
      budgetId: true,
      operationId: true,
      type: true,
      number: true,
      status: true,
      mimeType: true,
      fileSize: true,
      renderedAt: true,
      renderMetadata: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  approvals: {
    include: { actor: { select: { id: true, name: true, email: true, username: true } } },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.BudgetInclude;

type BudgetWithRelations = Prisma.BudgetGetPayload<{ include: typeof BUDGET_INCLUDE }>;

type BudgetRelations = {
  organizationId: string;
  customerId: string;
  customerAddressId: string | null;
  equipmentId: string | null;
  operationId: string | null;
};

type SnapshotItem = {
  productId: string;
  description: string;
  quantity: number;
  unit: string;
  snapshotCost: string;
  snapshotSalePrice: string;
  snapshotMargin: string;
  total: string;
};

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly lifecycle: LifecyclePublisher,
  ) {}

  async list(query: ListBudgetsQueryDto): Promise<unknown> {
    const where = this.listWhere(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.budget.findMany({
        where,
        include: BUDGET_INCLUDE,
        orderBy: [{ createdAt: 'desc' }, { number: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.budget.count({ where }),
    ]);
    return this.page(items, total, query.page, query.limit);
  }

  async get(id: string): Promise<BudgetWithRelations> {
    return this.budgetOrThrow(id);
  }

  async listByOperation(operationId: string, query: ListBudgetsQueryDto): Promise<unknown> {
    await this.operationOrThrow(operationId);
    return this.list({ ...query, operationId });
  }

  async create(dto: CreateBudgetDto, actor: AuthenticatedUser, context: BudgetAuditContext): Promise<BudgetWithRelations> {
    this.assertCreateStatus(dto.status);
    const relations = await this.resolveRelations(dto);
    const items = await this.resolveSnapshotItems(dto.items);
    const totals = this.calculateTotals(items, dto.discount, dto.additional);
    const expirationDate = new Date(dto.expirationDate);
    if (Number.isNaN(expirationDate.getTime())) {
      throw new ApplicationException(ERROR_CODES.VALIDATION_ERROR, 'Invalid expiration date', HttpStatus.BAD_REQUEST);
    }

    return this.prisma.$transaction(async (tx) => {
      const budget = await tx.budget.create({
        data: {
          ...relations,
          status: dto.status ?? BudgetStatus.DRAFT,
          title: this.clean(dto.title),
          description: this.optionalClean(dto.description),
          subtotal: totals.subtotal,
          discount: totals.discount,
          additional: totals.additional,
          total: totals.total,
          expirationDate,
          observations: this.optionalClean(dto.observations),
          createdBy: actor.id,
          items: { createMany: { data: items } },
        },
        include: BUDGET_INCLUDE,
      });
      await this.createHistoryTx(tx, budget.id, actor.id, BudgetHistoryAction.CREATED, null, budget.status, {
        documentTemplateType: DocumentTemplateType.BUDGET,
        items: items.length,
      });
      await this.auditTx(tx, BUDGET_AUDIT_ACTIONS.BUDGET_CREATED, actor, context, {
        budgetId: budget.id,
        number: budget.number,
        status: budget.status,
        total: budget.total.toString(),
      });
      return budget;
    });
  }

  async update(id: string, dto: UpdateBudgetDto, actor: AuthenticatedUser, context: BudgetAuditContext): Promise<BudgetWithRelations> {
    const current = await this.budgetOrThrow(id);
    this.assertWritable(current);
    this.assertUpdateStatus(dto.status);

    const relations =
      dto.customerId || dto.customerAddressId !== undefined || dto.equipmentId !== undefined || dto.operationId !== undefined
        ? await this.resolveRelations({
            operationId: dto.operationId ?? current.operationId ?? undefined,
            customerId: dto.customerId ?? current.customerId,
            customerAddressId: dto.customerAddressId ?? current.customerAddressId ?? undefined,
            equipmentId: dto.equipmentId ?? current.equipmentId ?? undefined,
          })
        : undefined;
    const items = dto.items ? await this.resolveSnapshotItems(dto.items) : undefined;
    const totals = items
      ? this.calculateTotals(items, dto.discount ?? Number(current.discount), dto.additional ?? Number(current.additional))
      : this.calculateTotals(
          current.items.map((item) => ({
            productId: item.productId,
            description: item.description,
            quantity: Number(item.quantity),
            unit: item.unit,
            snapshotCost: item.snapshotCost.toString(),
            snapshotSalePrice: item.snapshotSalePrice.toString(),
            snapshotMargin: item.snapshotMargin.toString(),
            total: item.total.toString(),
          })),
          dto.discount ?? Number(current.discount),
          dto.additional ?? Number(current.additional),
        );

    return this.prisma.$transaction(async (tx) => {
      if (items) {
        await tx.budgetItem.deleteMany({ where: { budgetId: id } });
      }
      const nextStatus = dto.status ?? current.status;
      const budget = await tx.budget.update({
        where: { id },
        data: {
          ...(relations ?? {}),
          ...(dto.title !== undefined ? { title: this.clean(dto.title) } : {}),
          ...(dto.description !== undefined ? { description: this.optionalClean(dto.description) } : {}),
          ...(dto.expirationDate !== undefined ? { expirationDate: new Date(dto.expirationDate) } : {}),
          ...(dto.observations !== undefined ? { observations: this.optionalClean(dto.observations) } : {}),
          status: nextStatus,
          subtotal: totals.subtotal,
          discount: totals.discount,
          additional: totals.additional,
          total: totals.total,
          ...(items ? { items: { createMany: { data: items } } } : {}),
        },
        include: BUDGET_INCLUDE,
      });
      await this.createHistoryTx(
        tx,
        id,
        actor.id,
        current.status !== nextStatus ? BudgetHistoryAction.SUBMITTED : BudgetHistoryAction.UPDATED,
        current.status,
        budget.status,
        { changedFields: Object.keys(dto), itemsReplaced: Boolean(items) },
      );
      await this.auditTx(tx, BUDGET_AUDIT_ACTIONS.BUDGET_UPDATED, actor, context, {
        budgetId: id,
        number: budget.number,
        changedFields: Object.keys(dto),
      });
      return budget;
    });
  }

  async approve(id: string, dto: BudgetDecisionDto, actor: AuthenticatedUser, context: BudgetAuditContext): Promise<BudgetWithRelations> {
    const current = await this.budgetOrThrow(id);
    this.assertApprovalCandidate(current);
    if (current.expirationDate < new Date()) {
      throw new ApplicationException(ERROR_CODES.BUDGET_EXPIRED, 'Expired budgets cannot be approved', HttpStatus.CONFLICT);
    }

    return this.prisma.$transaction(async (tx) => {
      if (current.operationId) {
        const approved = await tx.budget.findFirst({
          where: { operationId: current.operationId, status: BudgetStatus.APPROVED, id: { not: id } },
          select: { id: true, number: true },
        });
        if (approved) {
          throw new ApplicationException(
            ERROR_CODES.BUDGET_MULTIPLE_APPROVAL,
            'Another budget is already approved for this operation',
            HttpStatus.CONFLICT,
            { approvedBudgetId: approved.id, approvedBudgetNumber: approved.number },
          );
        }
      }
      await tx.budgetApproval.create({
        data: { budgetId: id, actorId: actor.id, status: BudgetStatus.APPROVED, observation: this.optionalClean(dto.observation) },
      });
      const budget = await tx.budget.update({
        where: { id },
        data: { status: BudgetStatus.APPROVED, approvedAt: new Date(), rejectedAt: null, canceledAt: null },
        include: BUDGET_INCLUDE,
      });
      await this.createHistoryTx(tx, id, actor.id, BudgetHistoryAction.APPROVED, current.status, BudgetStatus.APPROVED, {
        observation: this.optionalClean(dto.observation),
      });
      await this.auditTx(tx, BUDGET_AUDIT_ACTIONS.BUDGET_APPROVED, actor, context, {
        budgetId: id,
        number: budget.number,
        total: budget.total.toString(),
      });
      await this.lifecycle.publishBudgetEventTx(
        tx,
        {
          budgetId: id,
          actorId: actor.id,
          type: AssetLifecycleEventType.BUDGET_APPROVED,
          description: `Budget #${budget.number} approved`,
          metadata: { total: budget.total.toString(), customerId: budget.customerId },
        },
        context,
      );
      return budget;
    });
  }

  async reject(id: string, dto: BudgetDecisionDto, actor: AuthenticatedUser, context: BudgetAuditContext): Promise<BudgetWithRelations> {
    const current = await this.budgetOrThrow(id);
    this.assertApprovalCandidate(current);

    return this.prisma.$transaction(async (tx) => {
      await tx.budgetApproval.create({
        data: { budgetId: id, actorId: actor.id, status: BudgetStatus.REJECTED, observation: this.optionalClean(dto.observation) },
      });
      const budget = await tx.budget.update({
        where: { id },
        data: { status: BudgetStatus.REJECTED, rejectedAt: new Date() },
        include: BUDGET_INCLUDE,
      });
      await this.createHistoryTx(tx, id, actor.id, BudgetHistoryAction.REJECTED, current.status, BudgetStatus.REJECTED, {
        observation: this.optionalClean(dto.observation),
      });
      await this.auditTx(tx, BUDGET_AUDIT_ACTIONS.BUDGET_REJECTED, actor, context, {
        budgetId: id,
        number: budget.number,
      });
      await this.lifecycle.publishBudgetEventTx(
        tx,
        {
          budgetId: id,
          actorId: actor.id,
          type: AssetLifecycleEventType.BUDGET_REJECTED,
          description: `Budget #${budget.number} rejected`,
          metadata: { customerId: budget.customerId },
        },
        context,
      );
      return budget;
    });
  }

  async cancel(id: string, actor: AuthenticatedUser, context: BudgetAuditContext): Promise<{ deleted: true }> {
    const current = await this.budgetOrThrow(id);
    this.assertWritable(current);
    await this.prisma.$transaction(async (tx) => {
      await tx.budget.update({ where: { id }, data: { status: BudgetStatus.CANCELED, canceledAt: new Date() } });
      await this.createHistoryTx(tx, id, actor.id, BudgetHistoryAction.CANCELED, current.status, BudgetStatus.CANCELED, {});
      await this.auditTx(tx, BUDGET_AUDIT_ACTIONS.BUDGET_CANCELED, actor, context, {
        budgetId: id,
        number: current.number,
      });
    });
    return { deleted: true };
  }

  async stats(query: ListBudgetsQueryDto): Promise<unknown> {
    const where = this.listWhere(query);
    const [total, approved, rejected, pending, potential, approvedTotal] = await this.prisma.$transaction([
      this.prisma.budget.count({ where }),
      this.prisma.budget.count({ where: { ...where, status: BudgetStatus.APPROVED } }),
      this.prisma.budget.count({ where: { ...where, status: BudgetStatus.REJECTED } }),
      this.prisma.budget.count({ where: { ...where, status: BudgetStatus.PENDING } }),
      this.prisma.budget.aggregate({
        where: { ...where, status: { in: [BudgetStatus.DRAFT, BudgetStatus.PENDING] } },
        _sum: { total: true },
      }),
      this.prisma.budget.aggregate({ where: { ...where, status: BudgetStatus.APPROVED }, _avg: { total: true } }),
    ]);
    return {
      total,
      approved,
      rejected,
      pending,
      potentialRevenue: potential._sum.total?.toString() ?? '0',
      averageTicket: approvedTotal._avg.total?.toString() ?? '0',
    };
  }

  async history(id: string, query: ListBudgetsQueryDto): Promise<unknown> {
    await this.budgetOrThrow(id);
    const where: Prisma.BudgetHistoryWhereInput = { budgetId: id };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.budgetHistory.findMany({
        where,
        include: { actor: { select: { id: true, name: true, email: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.budgetHistory.count({ where }),
    ]);
    return this.page(items, total, query.page, query.limit);
  }

  private async resolveRelations(dto: {
    customerId: string;
    customerAddressId?: string;
    equipmentId?: string;
    operationId?: string;
  }): Promise<BudgetRelations> {
    const [organization, customer] = await Promise.all([
      this.prisma.organization.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } }),
      this.prisma.customer.findUnique({ where: { id: dto.customerId }, select: { id: true, isActive: true } }),
    ]);
    if (!organization) {
      throw new ApplicationException(ERROR_CODES.ORGANIZATION_NOT_FOUND, 'Organization was not found', HttpStatus.NOT_FOUND);
    }
    if (!customer?.isActive) {
      throw new ApplicationException(ERROR_CODES.CUSTOMER_NOT_FOUND, 'Customer was not found or is inactive', HttpStatus.NOT_FOUND);
    }

    let operationId = dto.operationId ?? null;
    let customerAddressId = dto.customerAddressId ?? null;
    let equipmentId = dto.equipmentId ?? null;
    if (dto.operationId) {
      const operation = await this.prisma.operation.findUnique({
        where: { id: dto.operationId },
        select: { id: true, customerId: true, addressId: true, equipmentId: true },
      });
      if (!operation) throw new ApplicationException(ERROR_CODES.OPERATION_NOT_FOUND, 'Operation was not found', HttpStatus.NOT_FOUND);
      if (operation.customerId !== dto.customerId) {
        throw new ApplicationException(ERROR_CODES.BUDGET_INVALID_RELATIONSHIP, 'Operation belongs to another customer', HttpStatus.BAD_REQUEST);
      }
      if (equipmentId && operation.equipmentId && operation.equipmentId !== equipmentId) {
        throw new ApplicationException(ERROR_CODES.BUDGET_INVALID_RELATIONSHIP, 'Operation belongs to another equipment', HttpStatus.BAD_REQUEST);
      }
      customerAddressId = customerAddressId ?? operation.addressId;
      equipmentId = equipmentId ?? operation.equipmentId;
      operationId = operation.id;
    }
    if (customerAddressId) {
      const address = await this.prisma.customerAddress.findUnique({
        where: { id: customerAddressId },
        select: { customerId: true },
      });
      if (!address || address.customerId !== dto.customerId) {
        throw new ApplicationException(ERROR_CODES.BUDGET_INVALID_RELATIONSHIP, 'Address belongs to another customer', HttpStatus.BAD_REQUEST);
      }
    }
    if (equipmentId) {
      const equipment = await this.prisma.equipment.findUnique({
        where: { id: equipmentId },
        select: { customerId: true, isActive: true },
      });
      if (!equipment?.isActive || equipment.customerId !== dto.customerId) {
        throw new ApplicationException(ERROR_CODES.BUDGET_INVALID_RELATIONSHIP, 'Equipment belongs to another customer', HttpStatus.BAD_REQUEST);
      }
    }
    return { organizationId: organization.id, customerId: dto.customerId, customerAddressId, equipmentId, operationId };
  }

  private async resolveSnapshotItems(dtoItems: BudgetItemInputDto[]): Promise<SnapshotItem[]> {
    if (!dtoItems.length) {
      throw new ApplicationException(ERROR_CODES.BUDGET_ITEM_REQUIRED, 'Budget must have at least one item', HttpStatus.BAD_REQUEST);
    }
    const items: SnapshotItem[] = [];
    for (const item of dtoItems) {
      const [product, pricing] = await Promise.all([
        this.prisma.product.findUnique({ where: { id: item.productId }, select: { id: true, name: true, unit: true, isActive: true } }),
        this.pricing.resolveForConsumer(item.productId, 'BUDGET'),
      ]);
      if (!product?.isActive) {
        throw new ApplicationException(ERROR_CODES.PRODUCT_NOT_FOUND, 'Product was not found or is inactive', HttpStatus.NOT_FOUND);
      }
      const quantity = Number(item.quantity);
      const salePrice = Number(pricing.salePrice);
      items.push({
        productId: item.productId,
        description: this.clean(item.description || product.name),
        quantity,
        unit: product.unit,
        snapshotCost: pricing.costPrice,
        snapshotSalePrice: pricing.salePrice,
        snapshotMargin: pricing.marginPercentage,
        total: this.money(quantity * salePrice),
      });
    }
    return items;
  }

  private calculateTotals(items: SnapshotItem[], discount = 0, additional = 0): { subtotal: string; discount: string; additional: string; total: string } {
    const subtotal = items.reduce((sum, item) => sum + Number(item.total), 0);
    const total = subtotal - discount + additional;
    if (total < 0) {
      throw new ApplicationException(ERROR_CODES.VALIDATION_ERROR, 'Budget total cannot be negative', HttpStatus.BAD_REQUEST);
    }
    return { subtotal: this.money(subtotal), discount: this.money(discount), additional: this.money(additional), total: this.money(total) };
  }

  private async budgetOrThrow(id: string): Promise<BudgetWithRelations> {
    const budget = await this.prisma.budget.findUnique({ where: { id }, include: BUDGET_INCLUDE });
    if (!budget) {
      throw new ApplicationException(ERROR_CODES.BUDGET_NOT_FOUND, 'Budget was not found', HttpStatus.NOT_FOUND);
    }
    return budget;
  }

  private async operationOrThrow(id: string): Promise<void> {
    const operation = await this.prisma.operation.findUnique({ where: { id }, select: { id: true } });
    if (!operation) throw new ApplicationException(ERROR_CODES.OPERATION_NOT_FOUND, 'Operation was not found', HttpStatus.NOT_FOUND);
  }

  private listWhere(query: ListBudgetsQueryDto): Prisma.BudgetWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.equipmentId ? { equipmentId: query.equipmentId } : {}),
      ...(query.operationId ? { operationId: query.operationId } : {}),
      ...(query.from || query.to
        ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {}),
      ...(query.expired ? { expirationDate: { lt: new Date() }, status: { in: [BudgetStatus.DRAFT, BudgetStatus.PENDING] } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
              { customer: { tradeName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
  }

  private assertCreateStatus(status?: BudgetStatus): void {
    const allowed: BudgetStatus[] = [BudgetStatus.DRAFT, BudgetStatus.PENDING];
    if (status && !allowed.includes(status)) {
      throw new ApplicationException(ERROR_CODES.BUDGET_INVALID_STATUS, 'Budget can only be created as DRAFT or PENDING', HttpStatus.BAD_REQUEST);
    }
  }

  private assertUpdateStatus(status?: BudgetStatus): void {
    const allowed: BudgetStatus[] = [BudgetStatus.DRAFT, BudgetStatus.PENDING, BudgetStatus.CANCELED];
    if (status && !allowed.includes(status)) {
      throw new ApplicationException(ERROR_CODES.BUDGET_INVALID_STATUS, 'Use approval endpoints for final budget decisions', HttpStatus.BAD_REQUEST);
    }
  }

  private assertWritable(budget: BudgetWithRelations): void {
    if (budget.status === BudgetStatus.APPROVED) {
      throw new ApplicationException(ERROR_CODES.BUDGET_APPROVED_IMMUTABLE, 'Approved budgets cannot be changed', HttpStatus.CONFLICT);
    }
    const finalStatuses: BudgetStatus[] = [BudgetStatus.REJECTED, BudgetStatus.EXPIRED, BudgetStatus.CANCELED];
    if (finalStatuses.includes(budget.status)) {
      throw new ApplicationException(ERROR_CODES.BUDGET_INVALID_STATUS, 'Final budgets cannot be changed', HttpStatus.CONFLICT);
    }
  }

  private assertApprovalCandidate(budget: BudgetWithRelations): void {
    const allowed: BudgetStatus[] = [BudgetStatus.DRAFT, BudgetStatus.PENDING];
    if (!allowed.includes(budget.status)) {
      throw new ApplicationException(ERROR_CODES.BUDGET_INVALID_STATUS, 'Budget cannot receive this decision in its current status', HttpStatus.CONFLICT);
    }
  }

  private async createHistoryTx(
    tx: Prisma.TransactionClient,
    budgetId: string,
    actorId: string,
    action: BudgetHistoryAction,
    previousStatus: BudgetStatus | null,
    newStatus: BudgetStatus,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await tx.budgetHistory.create({
      data: { budgetId, actorId, action, previousStatus, newStatus, metadata: metadata as Prisma.InputJsonValue },
    });
  }

  private async auditTx(
    tx: Prisma.TransactionClient,
    action: string,
    actor: AuthenticatedUser,
    context: BudgetAuditContext,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        action,
        resource: BUDGET_RESOURCE,
        actor: actor.id,
        metadata: {
          requestId: context.requestId,
          ip: context.ip,
          userAgent: context.userAgent,
          ...metadata,
        },
      },
    });
  }

  private page<T>(items: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
    return buildPaginatedResponse(items, total, page, limit);
  }

  private money(value: number): string {
    return value.toFixed(2);
  }

  private clean(value: string): string {
    return value
      .split('')
      .filter((char) => {
        const code = char.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private optionalClean(value?: string | null): string | null {
    return value ? this.clean(value) : null;
  }
}
