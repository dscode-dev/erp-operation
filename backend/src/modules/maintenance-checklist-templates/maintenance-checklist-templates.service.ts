import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  MAINTENANCE_CHECKLIST_TEMPLATE_AUDIT_ACTIONS,
  MAINTENANCE_CHECKLIST_TEMPLATE_RESOURCE,
} from '../../shared/constants/maintenance-checklist-templates.constants';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import { buildPaginatedResponse } from '../../shared/types/pagination.types';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import { PrismaService } from '../database/prisma.service';
import type {
  CreateMaintenanceChecklistTemplateDto,
  ListMaintenanceChecklistTemplatesQueryDto,
  UpdateMaintenanceChecklistTemplateDto,
} from './dto/maintenance-checklist-template.dto';

const TEMPLATE_SELECT = {
  id: true,
  organizationId: true,
  maintenanceType: true,
  description: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MaintenanceChecklistTemplateSelect;

export interface MaintenanceChecklistTemplateAuditContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

@Injectable()
export class MaintenanceChecklistTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListMaintenanceChecklistTemplatesQueryDto): Promise<unknown> {
    const organizationId = await this.organizationId();
    const where: Prisma.MaintenanceChecklistTemplateWhereInput = {
      organizationId,
      ...(query.maintenanceType ? { maintenanceType: query.maintenanceType } : {}),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search ? { description: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.maintenanceChecklistTemplate.findMany({
        where,
        select: TEMPLATE_SELECT,
        orderBy: [{ maintenanceType: 'asc' }, { description: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.maintenanceChecklistTemplate.count({ where }),
    ]);
    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  async get(id: string): Promise<unknown> {
    return this.templateOrThrow(id, await this.organizationId());
  }

  async create(
    dto: CreateMaintenanceChecklistTemplateDto,
    actor: AuthenticatedUser,
    context: MaintenanceChecklistTemplateAuditContext,
  ): Promise<unknown> {
    const organizationId = await this.organizationId();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.maintenanceChecklistTemplate.create({
          data: {
            organizationId,
            maintenanceType: dto.maintenanceType,
            description: this.clean(dto.description),
            active: dto.active ?? true,
          },
          select: TEMPLATE_SELECT,
        });
        await tx.auditLog.create({
          data: this.audit(MAINTENANCE_CHECKLIST_TEMPLATE_AUDIT_ACTIONS.CREATED, actor, context, {
            templateId: created.id,
            maintenanceType: created.maintenanceType,
          }),
        });
        return created;
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async update(
    id: string,
    dto: UpdateMaintenanceChecklistTemplateDto,
    actor: AuthenticatedUser,
    context: MaintenanceChecklistTemplateAuditContext,
  ): Promise<unknown> {
    const organizationId = await this.organizationId();
    await this.templateOrThrow(id, organizationId);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.maintenanceChecklistTemplate.update({
          where: { id },
          data: {
            ...(dto.maintenanceType !== undefined ? { maintenanceType: dto.maintenanceType } : {}),
            ...(dto.description !== undefined ? { description: this.clean(dto.description) } : {}),
            ...(dto.active !== undefined ? { active: dto.active } : {}),
          },
          select: TEMPLATE_SELECT,
        });
        await tx.auditLog.create({
          data: this.audit(MAINTENANCE_CHECKLIST_TEMPLATE_AUDIT_ACTIONS.UPDATED, actor, context, {
            templateId: id,
            changedFields: Object.keys(dto),
          }),
        });
        return updated;
      });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async deactivate(
    id: string,
    actor: AuthenticatedUser,
    context: MaintenanceChecklistTemplateAuditContext,
  ): Promise<{ deactivated: true }> {
    const organizationId = await this.organizationId();
    await this.templateOrThrow(id, organizationId);
    await this.prisma.$transaction([
      this.prisma.maintenanceChecklistTemplate.update({ where: { id }, data: { active: false } }),
      this.prisma.auditLog.create({
        data: this.audit(MAINTENANCE_CHECKLIST_TEMPLATE_AUDIT_ACTIONS.DEACTIVATED, actor, context, {
          templateId: id,
          softDelete: true,
        }),
      }),
    ]);
    return { deactivated: true };
  }

  private async organizationId(): Promise<string> {
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
    return organization.id;
  }

  private async templateOrThrow(id: string, organizationId: string): Promise<unknown> {
    const template = await this.prisma.maintenanceChecklistTemplate.findFirst({
      where: { id, organizationId },
      select: TEMPLATE_SELECT,
    });
    if (!template) {
      throw new ApplicationException(
        ERROR_CODES.MAINTENANCE_CHECKLIST_TEMPLATE_NOT_FOUND,
        'Maintenance checklist template was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return template;
  }

  private rethrowConflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApplicationException(
        ERROR_CODES.MAINTENANCE_CHECKLIST_TEMPLATE_CONFLICT,
        'An equal checklist item already exists for this maintenance type',
        HttpStatus.CONFLICT,
      );
    }
    throw error;
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

  private audit(
    action: string,
    actor: AuthenticatedUser,
    context: MaintenanceChecklistTemplateAuditContext,
    metadata: Record<string, unknown>,
  ): Prisma.AuditLogUncheckedCreateInput {
    return {
      action,
      resource: MAINTENANCE_CHECKLIST_TEMPLATE_RESOURCE,
      actor: actor.id,
      metadata: {
        requestId: context.requestId,
        ip: context.ip,
        userAgent: context.userAgent,
        ...metadata,
      },
    };
  }
}

export function checklistTemplateContextFromRequest(
  request: RequestWithId,
): MaintenanceChecklistTemplateAuditContext {
  return {
    requestId: request.requestId,
    ip: request.ip || null,
    userAgent: request.get('user-agent') ?? null,
  };
}
