import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AssetLifecycleEventType,
  FinancialCategoryType,
  FinancialEntryOrigin,
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialHistoryAction,
  Prisma,
} from '@prisma/client';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import {
  FINANCIAL_ACCOUNT_RESOURCE,
  FINANCIAL_AUDIT_ACTIONS,
  FINANCIAL_CATEGORY_RESOURCE,
  FINANCIAL_ENTRY_RESOURCE,
} from '../../shared/constants/financial.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import { buildPaginatedResponse, type PaginatedResponse } from '../../shared/types/pagination.types';
import { LifecyclePublisher } from '../asset-lifecycle/lifecycle-publisher.service';
import { PrismaService } from '../database/prisma.service';
import type {
  CancelFinancialEntryDto,
  CreateFinancialAccountDto,
  CreateFinancialCategoryDto,
  CreateFinancialEntryDto,
  ListFinancialAccountsQueryDto,
  ListFinancialCategoriesQueryDto,
  ListFinancialEntriesQueryDto,
  PayFinancialEntryDto,
  UpdateFinancialAccountDto,
  UpdateFinancialCategoryDto,
  UpdateFinancialEntryDto,
} from './dto/financial.dto';

export interface FinancialAuditContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

const ACCOUNT_INCLUDE = {
  organization: { select: { id: true, tradeName: true, legalName: true } },
} satisfies Prisma.FinancialAccountInclude;

const CATEGORY_INCLUDE = {
  organization: { select: { id: true, tradeName: true, legalName: true } },
} satisfies Prisma.FinancialCategoryInclude;

const ENTRY_INCLUDE = {
  organization: { select: { id: true, tradeName: true, legalName: true } },
  account: { select: { id: true, name: true, type: true, currentBalance: true, active: true } },
  category: { select: { id: true, name: true, type: true, color: true, icon: true, active: true } },
  creator: { select: { id: true, name: true, email: true, username: true, role: true } },
  allocations: { include: { category: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.FinancialEntryInclude;

type EntryWithRelations = Prisma.FinancialEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: LifecyclePublisher,
  ) {}

  async listAccounts(query: ListFinancialAccountsQueryDto): Promise<PaginatedResponse<unknown>> {
    const where: Prisma.FinancialAccountWhereInput = {
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.financialAccount.findMany({
        where,
        include: ACCOUNT_INCLUDE,
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.financialAccount.count({ where }),
    ]);
    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  async createAccount(
    dto: CreateFinancialAccountDto,
    actor: AuthenticatedUser,
    context: FinancialAuditContext,
  ): Promise<unknown> {
    const organizationId = await this.organizationId();
    const openingBalance = this.money(dto.openingBalance ?? 0);
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.financialAccount.create({
        data: {
          organizationId,
          name: this.clean(dto.name),
          type: dto.type,
          description: this.optionalClean(dto.description),
          openingBalance,
          currentBalance: openingBalance,
          active: dto.active ?? true,
        },
        include: ACCOUNT_INCLUDE,
      });
      await this.auditTx(tx, FINANCIAL_AUDIT_ACTIONS.ACCOUNT_CREATED, FINANCIAL_ACCOUNT_RESOURCE, actor, context, {
        accountId: account.id,
        type: account.type,
        openingBalance: account.openingBalance.toString(),
      });
      return account;
    });
  }

  async updateAccount(
    id: string,
    dto: UpdateFinancialAccountDto,
    actor: AuthenticatedUser,
    context: FinancialAuditContext,
  ): Promise<unknown> {
    await this.accountOrThrow(id);
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.financialAccount.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: this.clean(dto.name) } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.description !== undefined ? { description: this.optionalClean(dto.description) } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        include: ACCOUNT_INCLUDE,
      });
      await this.auditTx(tx, FINANCIAL_AUDIT_ACTIONS.ACCOUNT_UPDATED, FINANCIAL_ACCOUNT_RESOURCE, actor, context, {
        accountId: id,
        changedFields: Object.keys(dto),
      });
      return account;
    });
  }

  async deleteAccount(id: string, actor: AuthenticatedUser, context: FinancialAuditContext): Promise<{ deleted: true }> {
    await this.accountOrThrow(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.financialAccount.update({ where: { id }, data: { active: false, deletedAt: new Date() } });
      await this.auditTx(tx, FINANCIAL_AUDIT_ACTIONS.ACCOUNT_DELETED, FINANCIAL_ACCOUNT_RESOURCE, actor, context, { accountId: id });
    });
    return { deleted: true };
  }

  async listCategories(query: ListFinancialCategoriesQueryDto): Promise<PaginatedResponse<unknown>> {
    const where: Prisma.FinancialCategoryWhereInput = {
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.financialCategory.findMany({
        where,
        include: CATEGORY_INCLUDE,
        orderBy: [{ active: 'desc' }, { type: 'asc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.financialCategory.count({ where }),
    ]);
    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  async createCategory(
    dto: CreateFinancialCategoryDto,
    actor: AuthenticatedUser,
    context: FinancialAuditContext,
  ): Promise<unknown> {
    const organizationId = await this.organizationId();
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.financialCategory.create({
        data: {
          organizationId,
          name: this.clean(dto.name),
          type: dto.type,
          color: this.optionalClean(dto.color),
          icon: this.optionalClean(dto.icon),
          active: dto.active ?? true,
        },
        include: CATEGORY_INCLUDE,
      });
      await this.auditTx(tx, FINANCIAL_AUDIT_ACTIONS.CATEGORY_CREATED, FINANCIAL_CATEGORY_RESOURCE, actor, context, {
        categoryId: category.id,
        type: category.type,
      });
      return category;
    });
  }

  async updateCategory(
    id: string,
    dto: UpdateFinancialCategoryDto,
    actor: AuthenticatedUser,
    context: FinancialAuditContext,
  ): Promise<unknown> {
    await this.categoryOrThrow(id);
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.financialCategory.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: this.clean(dto.name) } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.color !== undefined ? { color: this.optionalClean(dto.color) } : {}),
          ...(dto.icon !== undefined ? { icon: this.optionalClean(dto.icon) } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        include: CATEGORY_INCLUDE,
      });
      await this.auditTx(tx, FINANCIAL_AUDIT_ACTIONS.CATEGORY_UPDATED, FINANCIAL_CATEGORY_RESOURCE, actor, context, {
        categoryId: id,
        changedFields: Object.keys(dto),
      });
      return category;
    });
  }

  async deleteCategory(id: string, actor: AuthenticatedUser, context: FinancialAuditContext): Promise<{ deleted: true }> {
    await this.categoryOrThrow(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.financialCategory.update({ where: { id }, data: { active: false, deletedAt: new Date() } });
      await this.auditTx(tx, FINANCIAL_AUDIT_ACTIONS.CATEGORY_DELETED, FINANCIAL_CATEGORY_RESOURCE, actor, context, { categoryId: id });
    });
    return { deleted: true };
  }

  async listEntries(query: ListFinancialEntriesQueryDto): Promise<PaginatedResponse<unknown>> {
    const where = this.entriesWhere(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.financialEntry.findMany({
        where,
        include: ENTRY_INCLUDE,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.financialEntry.count({ where }),
    ]);
    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  async getEntry(id: string): Promise<EntryWithRelations> {
    return this.entryOrThrow(id);
  }

  async createEntry(
    dto: CreateFinancialEntryDto,
    actor: AuthenticatedUser,
    context: FinancialAuditContext,
  ): Promise<EntryWithRelations> {
    const organizationId = await this.organizationId();
    const status = dto.status ?? FinancialEntryStatus.PENDING;
    this.assertCreateStatus(status);
    const paidAt = status === FinancialEntryStatus.PAID ? new Date(dto.paidAt ?? new Date()) : null;
    const amount = this.money(dto.amount);
    await this.assertAccountCategory(organizationId, dto.accountId, dto.categoryId, dto.type);
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.financialEntry.create({
        data: {
          organizationId,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type: dto.type,
          origin: dto.origin ?? FinancialEntryOrigin.MANUAL,
          originId: dto.originId ?? null,
          amount,
          dueDate: new Date(dto.dueDate),
          paidAt,
          description: this.clean(dto.description),
          notes: this.optionalClean(dto.notes),
          status,
          createdBy: actor.id,
        },
        include: ENTRY_INCLUDE,
      });
      if (status === FinancialEntryStatus.PAID) {
        await this.applyBalanceTx(tx, entry.accountId, entry.type, entry.amount, 'apply');
      }
      await this.createHistoryTx(tx, entry.id, actor.id, FinancialHistoryAction.CREATED, null, entry.status, {
        amount: entry.amount.toString(),
        accountId: entry.accountId,
        categoryId: entry.categoryId,
      });
      await this.auditTx(tx, FINANCIAL_AUDIT_ACTIONS.ENTRY_CREATED, FINANCIAL_ENTRY_RESOURCE, actor, context, {
        entryId: entry.id,
        status: entry.status,
        amount: entry.amount.toString(),
      });
      await this.lifecycle.publishFinancialEntryEventTx(
        tx,
        {
          entryId: entry.id,
          actorId: actor.id,
          type: AssetLifecycleEventType.FINANCIAL_ENTRY_CREATED,
          description: `Financial entry ${entry.description} created`,
        },
        context,
      );
      return entry;
    });
  }

  async updateEntry(
    id: string,
    dto: UpdateFinancialEntryDto,
    actor: AuthenticatedUser,
    context: FinancialAuditContext,
  ): Promise<EntryWithRelations> {
    const current = await this.entryOrThrow(id);
    this.assertWritable(current);
    const organizationId = current.organizationId;
    const accountId = dto.accountId ?? current.accountId;
    const categoryId = dto.categoryId ?? current.categoryId;
    const type = dto.type ?? current.type;
    await this.assertAccountCategory(organizationId, accountId, categoryId, type);
    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.financialEntry.update({
        where: { id },
        data: {
          ...(dto.accountId !== undefined ? { accountId: dto.accountId } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.type !== undefined ? { type: dto.type } : {}),
          ...(dto.origin !== undefined ? { origin: dto.origin } : {}),
          ...(dto.originId !== undefined ? { originId: dto.originId } : {}),
          ...(dto.amount !== undefined ? { amount: this.money(dto.amount) } : {}),
          ...(dto.dueDate !== undefined ? { dueDate: new Date(dto.dueDate) } : {}),
          ...(dto.description !== undefined ? { description: this.clean(dto.description) } : {}),
          ...(dto.notes !== undefined ? { notes: this.optionalClean(dto.notes) } : {}),
        },
        include: ENTRY_INCLUDE,
      });
      await this.createHistoryTx(tx, id, actor.id, FinancialHistoryAction.UPDATED, current.status, entry.status, {
        changedFields: Object.keys(dto),
      });
      await this.auditTx(tx, FINANCIAL_AUDIT_ACTIONS.ENTRY_UPDATED, FINANCIAL_ENTRY_RESOURCE, actor, context, {
        entryId: id,
        changedFields: Object.keys(dto),
      });
      return entry;
    });
  }

  async payEntry(
    id: string,
    dto: PayFinancialEntryDto,
    actor: AuthenticatedUser,
    context: FinancialAuditContext,
  ): Promise<EntryWithRelations> {
    return this.runSerializable(async () => this.prisma.$transaction(async (tx) => {
      const current = await tx.financialEntry.findFirst({ where: { id, deletedAt: null }, include: ENTRY_INCLUDE });
      if (!current) {
        throw new ApplicationException(ERROR_CODES.FINANCIAL_ENTRY_NOT_FOUND, 'Financial entry was not found', HttpStatus.NOT_FOUND);
      }
      this.assertPayable(current.status);
      const transition = await tx.financialEntry.updateMany({
        where: {
          id,
          deletedAt: null,
          status: current.status,
        },
        data: {
          status: FinancialEntryStatus.PAID,
          paidAt: new Date(dto.paidAt ?? new Date()),
          ...(dto.notes !== undefined ? { notes: this.optionalClean(dto.notes) } : {}),
        },
      });
      if (transition.count !== 1) {
        throw this.staleFinancialTransition('Financial entry payment was already processed or changed');
      }
      const entry = await tx.financialEntry.findFirstOrThrow({ where: { id, deletedAt: null }, include: ENTRY_INCLUDE });
      await this.applyBalanceTx(tx, entry.accountId, entry.type, entry.amount, 'apply');
      await this.createHistoryTx(tx, id, actor.id, FinancialHistoryAction.PAID, current.status, entry.status, {
        paidAt: entry.paidAt?.toISOString() ?? null,
      });
      await this.auditTx(tx, FINANCIAL_AUDIT_ACTIONS.ENTRY_PAID, FINANCIAL_ENTRY_RESOURCE, actor, context, {
        entryId: id,
        previousStatus: current.status,
      });
      await this.lifecycle.publishFinancialEntryEventTx(
        tx,
        {
          entryId: entry.id,
          actorId: actor.id,
          type: AssetLifecycleEventType.FINANCIAL_ENTRY_PAID,
          description: `Financial entry ${entry.description} paid`,
        },
        context,
      );
      return entry;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  }

  async cancelEntry(
    id: string,
    dto: CancelFinancialEntryDto,
    actor: AuthenticatedUser,
    context: FinancialAuditContext,
  ): Promise<EntryWithRelations> {
    return this.runSerializable(async () => this.prisma.$transaction(async (tx) => {
      const current = await tx.financialEntry.findFirst({ where: { id, deletedAt: null }, include: ENTRY_INCLUDE });
      if (!current) {
        throw new ApplicationException(ERROR_CODES.FINANCIAL_ENTRY_NOT_FOUND, 'Financial entry was not found', HttpStatus.NOT_FOUND);
      }
      this.assertCancelable(current.status);
      const transition = await tx.financialEntry.updateMany({
        where: {
          id,
          deletedAt: null,
          status: current.status,
        },
        data: {
          status: FinancialEntryStatus.CANCELED,
          canceledAt: new Date(),
        },
      });
      if (transition.count !== 1) {
        throw this.staleFinancialTransition('Financial entry cancellation was already processed or changed');
      }
      const entry = await tx.financialEntry.findFirstOrThrow({ where: { id, deletedAt: null }, include: ENTRY_INCLUDE });
      await this.createHistoryTx(tx, id, actor.id, FinancialHistoryAction.CANCELED, current.status, entry.status, {
        reason: this.optionalClean(dto.reason),
      });
      await this.auditTx(tx, FINANCIAL_AUDIT_ACTIONS.ENTRY_CANCELED, FINANCIAL_ENTRY_RESOURCE, actor, context, {
        entryId: id,
        previousStatus: current.status,
      });
      await this.lifecycle.publishFinancialEntryEventTx(
        tx,
        {
          entryId: entry.id,
          actorId: actor.id,
          type: AssetLifecycleEventType.FINANCIAL_ENTRY_CANCELED,
          description: `Financial entry ${entry.description} canceled`,
        },
        context,
      );
      return entry;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
  }

  async stats(): Promise<Record<string, unknown>> {
    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(now);
    endToday.setHours(23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const pending: Prisma.FinancialEntryWhereInput = { deletedAt: null, status: FinancialEntryStatus.PENDING };
    const [accounts, receivableToday, payableToday, overdueReceivable, overduePayable, incomeMonth, expenseMonth, pendingEntries] =
      await this.prisma.$transaction([
        this.prisma.financialAccount.findMany({ where: { deletedAt: null, active: true }, select: { currentBalance: true } }),
        this.sumAmount({ ...pending, type: FinancialEntryType.RECEIVABLE, dueDate: { gte: startToday, lte: endToday } }),
        this.sumAmount({ ...pending, type: FinancialEntryType.PAYABLE, dueDate: { gte: startToday, lte: endToday } }),
        this.sumAmount({ ...pending, type: FinancialEntryType.RECEIVABLE, dueDate: { lt: startToday } }),
        this.sumAmount({ ...pending, type: FinancialEntryType.PAYABLE, dueDate: { lt: startToday } }),
        this.sumAmount({ deletedAt: null, type: FinancialEntryType.RECEIVABLE, status: FinancialEntryStatus.PAID, paidAt: { gte: monthStart, lte: monthEnd } }),
        this.sumAmount({ deletedAt: null, type: FinancialEntryType.PAYABLE, status: FinancialEntryStatus.PAID, paidAt: { gte: monthStart, lte: monthEnd } }),
        this.prisma.financialEntry.findMany({
          where: pending,
          select: { type: true, amount: true, dueDate: true },
          orderBy: { dueDate: 'asc' },
          take: 500,
        }),
      ]);
    const currentBalance = accounts.reduce((sum, item) => sum + Number(item.currentBalance), 0);
    const projectedBalance = pendingEntries.reduce((sum, item) => sum + this.signedAmount(item.type, item.amount), currentBalance);
    const monthlyFlow = this.monthlyFlow(pendingEntries);
    return {
      receivableToday: this.moneyString(receivableToday._sum.amount),
      payableToday: this.moneyString(payableToday._sum.amount),
      overdue: {
        receivable: this.moneyString(overdueReceivable._sum.amount),
        payable: this.moneyString(overduePayable._sum.amount),
      },
      currentBalance: this.moneyString(currentBalance),
      projectedBalance: this.moneyString(projectedBalance),
      income: this.moneyString(incomeMonth._sum.amount),
      expenses: this.moneyString(expenseMonth._sum.amount),
      monthlyFlow,
    };
  }

  async history(entryId: string, query: ListFinancialEntriesQueryDto): Promise<PaginatedResponse<unknown>> {
    await this.entryOrThrow(entryId);
    const where: Prisma.FinancialHistoryWhereInput = { entryId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.financialHistory.findMany({
        where,
        include: { actor: { select: { id: true, name: true, email: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.financialHistory.count({ where }),
    ]);
    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  private entriesWhere(query: ListFinancialEntriesQueryDto): Prisma.FinancialEntryWhereInput {
    return {
      deletedAt: null,
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.origin ? { origin: query.origin } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? { dueDate: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              { notes: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private async accountOrThrow(id: string): Promise<Prisma.FinancialAccountGetPayload<{ include: typeof ACCOUNT_INCLUDE }>> {
    const account = await this.prisma.financialAccount.findFirst({ where: { id, deletedAt: null }, include: ACCOUNT_INCLUDE });
    if (!account) {
      throw new ApplicationException(ERROR_CODES.FINANCIAL_ACCOUNT_NOT_FOUND, 'Financial account was not found', HttpStatus.NOT_FOUND);
    }
    return account;
  }

  private async categoryOrThrow(id: string): Promise<Prisma.FinancialCategoryGetPayload<{ include: typeof CATEGORY_INCLUDE }>> {
    const category = await this.prisma.financialCategory.findFirst({ where: { id, deletedAt: null }, include: CATEGORY_INCLUDE });
    if (!category) {
      throw new ApplicationException(ERROR_CODES.FINANCIAL_CATEGORY_NOT_FOUND, 'Financial category was not found', HttpStatus.NOT_FOUND);
    }
    return category;
  }

  private async entryOrThrow(id: string): Promise<EntryWithRelations> {
    const entry = await this.prisma.financialEntry.findFirst({ where: { id, deletedAt: null }, include: ENTRY_INCLUDE });
    if (!entry) {
      throw new ApplicationException(ERROR_CODES.FINANCIAL_ENTRY_NOT_FOUND, 'Financial entry was not found', HttpStatus.NOT_FOUND);
    }
    return entry;
  }

  private async assertAccountCategory(
    organizationId: string,
    accountId: string,
    categoryId: string,
    entryType: FinancialEntryType,
  ): Promise<void> {
    const [account, category] = await this.prisma.$transaction([
      this.prisma.financialAccount.findFirst({ where: { id: accountId, organizationId, active: true, deletedAt: null }, select: { id: true } }),
      this.prisma.financialCategory.findFirst({ where: { id: categoryId, organizationId, active: true, deletedAt: null }, select: { id: true, type: true } }),
    ]);
    if (!account) throw new ApplicationException(ERROR_CODES.FINANCIAL_ACCOUNT_NOT_FOUND, 'Financial account was not found or inactive', HttpStatus.NOT_FOUND);
    if (!category) throw new ApplicationException(ERROR_CODES.FINANCIAL_CATEGORY_NOT_FOUND, 'Financial category was not found or inactive', HttpStatus.NOT_FOUND);
    if (
      (entryType === FinancialEntryType.RECEIVABLE && category.type !== FinancialCategoryType.INCOME) ||
      (entryType === FinancialEntryType.PAYABLE && category.type !== FinancialCategoryType.EXPENSE) ||
      (entryType === FinancialEntryType.TRANSFER && category.type !== FinancialCategoryType.TRANSFER)
    ) {
      throw new ApplicationException(ERROR_CODES.FINANCIAL_INVALID_RELATIONSHIP, 'Financial category type does not match entry type', HttpStatus.BAD_REQUEST);
    }
  }

  private assertCreateStatus(status: FinancialEntryStatus): void {
    if (status === FinancialEntryStatus.CANCELED || status === FinancialEntryStatus.OVERDUE) {
      throw new ApplicationException(ERROR_CODES.FINANCIAL_ENTRY_INVALID_STATE, 'Financial entry cannot be created with this status', HttpStatus.BAD_REQUEST);
    }
  }

  private assertWritable(entry: EntryWithRelations): void {
    if (entry.status === FinancialEntryStatus.PAID || entry.status === FinancialEntryStatus.CANCELED) {
      throw new ApplicationException(ERROR_CODES.FINANCIAL_ENTRY_INVALID_STATE, 'Final financial entries cannot be edited', HttpStatus.CONFLICT);
    }
  }

  private assertPayable(status: FinancialEntryStatus): void {
    if (status === FinancialEntryStatus.PAID) {
      throw new ApplicationException(ERROR_CODES.FINANCIAL_ENTRY_INVALID_STATE, 'Financial entry is already paid', HttpStatus.CONFLICT);
    }
    if (status === FinancialEntryStatus.CANCELED) {
      throw new ApplicationException(ERROR_CODES.FINANCIAL_ENTRY_INVALID_STATE, 'Canceled financial entries cannot be paid', HttpStatus.CONFLICT);
    }
  }

  private assertCancelable(status: FinancialEntryStatus): void {
    if (status === FinancialEntryStatus.CANCELED) {
      throw new ApplicationException(ERROR_CODES.FINANCIAL_ENTRY_INVALID_STATE, 'Financial entry is already canceled', HttpStatus.CONFLICT);
    }
    if (status === FinancialEntryStatus.PAID) {
      throw new ApplicationException(ERROR_CODES.FINANCIAL_ENTRY_INVALID_STATE, 'Paid financial entries cannot be canceled in V1', HttpStatus.CONFLICT);
    }
  }

  private staleFinancialTransition(message: string): ApplicationException {
    return new ApplicationException(ERROR_CODES.FINANCIAL_ENTRY_INVALID_STATE, message, HttpStatus.CONFLICT);
  }

  private async runSerializable<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (!this.isRetryablePersistenceConflict(error) || attempt === attempts) {
          throw error;
        }
        lastError = error;
      }
    }
    throw lastError;
  }

  private isRetryablePersistenceConflict(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
  }

  private async applyBalanceTx(
    tx: Prisma.TransactionClient,
    accountId: string,
    type: FinancialEntryType,
    amount: Prisma.Decimal,
    mode: 'apply' | 'reverse',
  ): Promise<void> {
    const multiplier = mode === 'apply' ? 1 : -1;
    const delta = this.signedAmount(type, amount) * multiplier;
    if (delta === 0) return;
    await tx.financialAccount.update({
      where: { id: accountId },
      data: { currentBalance: { increment: this.money(delta) } },
    });
  }

  private signedAmount(type: FinancialEntryType, amount: Prisma.Decimal | number): number {
    const value = Number(amount);
    if (type === FinancialEntryType.RECEIVABLE) return value;
    if (type === FinancialEntryType.PAYABLE) return -value;
    return 0;
  }

  private sumAmount(where: Prisma.FinancialEntryWhereInput): Prisma.PrismaPromise<{ _sum: { amount: Prisma.Decimal | null } }> {
    return this.prisma.financialEntry.aggregate({ where, _sum: { amount: true } });
  }

  private monthlyFlow(entries: Array<{ dueDate: Date; type: FinancialEntryType; amount: Prisma.Decimal }>): Array<Record<string, string>> {
    const months = new Map<string, { income: number; expenses: number; net: number }>();
    for (const entry of entries) {
      const key = entry.dueDate.toISOString().slice(0, 7);
      const current = months.get(key) ?? { income: 0, expenses: 0, net: 0 };
      const signed = this.signedAmount(entry.type, entry.amount);
      if (signed >= 0) current.income += signed;
      else current.expenses += Math.abs(signed);
      current.net += signed;
      months.set(key, current);
    }
    return [...months.entries()].map(([month, value]) => ({
      month,
      income: this.moneyString(value.income),
      expenses: this.moneyString(value.expenses),
      net: this.moneyString(value.net),
    }));
  }

  private async createHistoryTx(
    tx: Prisma.TransactionClient,
    entryId: string,
    actorId: string,
    action: FinancialHistoryAction,
    previousStatus: FinancialEntryStatus | null,
    newStatus: FinancialEntryStatus,
    metadata: Prisma.InputJsonObject,
  ): Promise<void> {
    await tx.financialHistory.create({
      data: { entryId, actorId, action, previousStatus, newStatus, metadata },
    });
  }

  private async auditTx(
    tx: Prisma.TransactionClient,
    action: string,
    resource: string,
    actor: AuthenticatedUser,
    context: FinancialAuditContext,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await tx.auditLog.create({
      data: {
        action,
        resource,
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

  private async organizationId(): Promise<string> {
    const organization = await this.prisma.organization.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!organization) {
      throw new ApplicationException(ERROR_CODES.ORGANIZATION_NOT_FOUND, 'Organization was not found', HttpStatus.NOT_FOUND);
    }
    return organization.id;
  }

  private clean(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private optionalClean(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const clean = this.clean(value);
    return clean.length ? clean : null;
  }

  private money(value: number): string {
    return value.toFixed(2);
  }

  private moneyString(value: Prisma.Decimal | number | null | undefined): string {
    return Number(value ?? 0).toFixed(2);
  }
}
