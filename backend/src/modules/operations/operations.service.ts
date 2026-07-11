import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DocumentTemplateType, Prisma, Role } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProviderContract,
} from '../../infra/storage/storage-provider.type';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import {
  MAX_OPERATION_PHOTOS,
  MAX_OPERATION_PHOTO_SIZE_BYTES,
  MAX_OPERATION_SIGNATURE_SIZE_BYTES,
  OPERATION_AUDIT_ACTIONS,
  OPERATION_DOCUMENT_PREFIX,
  OPERATION_PHOTO_MIME_TYPES,
  OPERATION_RESOURCE,
  OPERATION_SIGNATURE_MIME_TYPES,
  formatDocumentNumber,
} from '../../shared/constants/operations.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import { buildPaginatedResponse } from '../../shared/types/pagination.types';
import { LifecyclePublisher } from '../asset-lifecycle/lifecycle-publisher.service';
import { AssignmentsService } from '../assignments/assignments.service';
import { PrismaService } from '../database/prisma.service';
import { MaintenancePlanningService } from '../maintenance-planning/maintenance-planning.service';
import type {
  CreateOperationDto,
  ListOperationsQueryDto,
  OperationChecklistItemDto,
  OperationPhotoInputDto,
  UpdateOperationDto,
} from './dto/operation.dto';

export interface OperationAuditContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

const OPERATION_INCLUDE = {
  customer: { select: { id: true, name: true, tradeName: true } },
  address: true,
  equipment: { select: { id: true, name: true, tag: true, type: true } },
  operator: { select: { id: true, name: true } },
  photos: {
    orderBy: { createdAt: 'asc' as const },
    select: { id: true, caption: true, mimeType: true, fileSize: true, createdAt: true },
  },
  documents: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.OperationInclude;

const OPERATION_LIST_INCLUDE = {
  customer: { select: { id: true, name: true } },
  equipment: { select: { id: true, name: true } },
  operator: { select: { id: true, name: true } },
  documents: { orderBy: { createdAt: 'asc' as const } },
  _count: { select: { photos: true, documents: true } },
} satisfies Prisma.OperationInclude;

type DecodedPhoto = { buffer: Buffer; mimeType: string; ext: string; caption: string | null };
type OperationAssignment = {
  operatorId: string;
  delegated: boolean;
  ignoredOperatorId?: string;
};

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN) private readonly storage: StorageProviderContract,
    private readonly lifecycle: LifecyclePublisher,
    private readonly maintenance: MaintenancePlanningService,
    private readonly assignments: AssignmentsService,
  ) {}

  async list(query: ListOperationsQueryDto): Promise<unknown> {
    const where: Prisma.OperationWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.equipmentId ? { equipmentId: query.equipmentId } : {}),
      ...(query.operatorId ? { operatorId: query.operatorId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
              { equipment: { name: { contains: query.search, mode: 'insensitive' } } },
              { operator: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.operation.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: OPERATION_LIST_INCLUDE,
      }),
      this.prisma.operation.count({ where }),
    ]);
    return buildPaginatedResponse(items, total, query.page, query.limit);
  }

  async stats(): Promise<Record<string, unknown>> {
    const [total, draft, inProgress, completed, canceled] = await this.prisma.$transaction([
      this.prisma.operation.count(),
      this.prisma.operation.count({ where: { status: 'DRAFT' } }),
      this.prisma.operation.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.operation.count({ where: { status: 'COMPLETED' } }),
      this.prisma.operation.count({ where: { status: 'CANCELED' } }),
    ]);
    return {
      total,
      byStatus: { DRAFT: draft, IN_PROGRESS: inProgress, COMPLETED: completed, CANCELED: canceled },
    };
  }

  async get(id: string): Promise<unknown> {
    return this.operationOrThrow(id);
  }

  async create(
    dto: CreateOperationDto,
    actor: AuthenticatedUser,
    context: OperationAuditContext,
  ): Promise<unknown> {
    await this.validateRelations(dto.customerId, dto.addressId, dto.equipmentId);
    const photos = (dto.photos ?? []).map((p) => this.decodePhoto(p));
    if (photos.length > MAX_OPERATION_PHOTOS) {
      throw new ApplicationException(
        ERROR_CODES.OPERATION_PHOTO_INVALID,
        `A maximum of ${MAX_OPERATION_PHOTOS} photos is allowed`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const assignment = await this.resolveOperatorAssignment(dto.operatorId, actor);
    const signatureData = this.normalizeSignatureData(dto.signatureData);

    // Operation + auto Work Order draft are created atomically. The OS number is
    // derived from the operation sequential number.
    const operationId = await this.prisma.$transaction(async (tx) => {
      const operation = await tx.operation.create({
        data: {
          customerId: dto.customerId,
          addressId: dto.addressId ?? null,
          equipmentId: dto.equipmentId ?? null,
          operatorId: assignment.operatorId,
          type: dto.type,
          status: dto.status ?? 'DRAFT',
          scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
          checklist: this.normalizeChecklist(dto.checklist),
          observations: dto.observations ?? null,
          reportedIssue: dto.reportedIssue ?? null,
          serviceDescription: dto.serviceDescription ?? null,
          signatureData,
          signedAt: signatureData ? (dto.signedAt ? new Date(dto.signedAt) : new Date()) : null,
        },
      });
      await tx.operationDocument.create({
        data: {
          operationId: operation.id,
          type: DocumentTemplateType.WORK_ORDER,
          number: formatDocumentNumber(OPERATION_DOCUMENT_PREFIX.WORK_ORDER, operation.number),
          status: 'DRAFT',
        },
      });
      await tx.auditLog.create({
        data: this.audit(
          OPERATION_AUDIT_ACTIONS.OPERATION_CREATED,
          OPERATION_RESOURCE,
          actor,
          context,
          {
            operationId: operation.id,
            number: operation.number,
            customerId: operation.customerId,
            createdBy: actor.id,
            operatorId: operation.operatorId,
            delegated: assignment.delegated,
            ignoredOperatorId: assignment.ignoredOperatorId ?? null,
          },
        ),
      });
      if (assignment.delegated) {
        await tx.auditLog.create({
          data: this.audit(
            OPERATION_AUDIT_ACTIONS.OPERATION_DELEGATED,
            OPERATION_RESOURCE,
            actor,
            context,
            {
              operationId: operation.id,
              number: operation.number,
              customerId: operation.customerId,
              createdBy: actor.id,
              operatorId: operation.operatorId,
              delegatedUserId: operation.operatorId,
            },
          ),
        });
      }
      await this.assignments.createForOperationTx(
        tx,
        {
          operationId: operation.id,
          assignedBy: actor.id,
          assignedTo: operation.operatorId,
          notes: dto.observations ?? null,
        },
        actor.id,
        context,
      );
      await this.lifecycle.publishOperationCompletedTx(tx, operation.id, actor.id, context);
      await this.maintenance.syncOperationCompletedTx(tx, operation.id, actor.id, context);
      return operation.id;
    });

    // Photos are persisted via the storage provider (non-transactional) after the
    // operation exists. A failed photo never blocks the operation.
    for (const photo of photos) {
      const storageKey = `operations/${operationId}/photos/${randomUUID()}.${photo.ext}`;
      try {
        await this.storage.save({ storageKey, content: photo.buffer });
        await this.prisma.operationPhoto.create({
          data: {
            operationId,
            storageKey,
            caption: photo.caption,
            mimeType: photo.mimeType,
            fileSize: photo.buffer.length,
          },
        });
      } catch {
        await this.storage.delete(storageKey).catch(() => undefined);
      }
    }

    return this.operationOrThrow(operationId);
  }

  async update(
    id: string,
    dto: UpdateOperationDto,
    actor: AuthenticatedUser,
    context: OperationAuditContext,
  ): Promise<unknown> {
    await this.operationOrThrow(id);
    const photos = (dto.photos ?? []).map((p) => this.decodePhoto(p));
    if (photos.length > MAX_OPERATION_PHOTOS) {
      throw new ApplicationException(
        ERROR_CODES.OPERATION_PHOTO_INVALID,
        `A maximum of ${MAX_OPERATION_PHOTOS} photos is allowed per update`,
        HttpStatus.BAD_REQUEST,
      );
    }
    const signatureData = this.normalizeSignatureData(dto.signatureData);
    await this.prisma.$transaction(async (tx) => {
      await tx.operation.update({
        where: { id },
        data: {
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.startedAt ? { startedAt: new Date(dto.startedAt) } : {}),
          ...(dto.completedAt ? { completedAt: new Date(dto.completedAt) } : {}),
          ...(dto.checklist ? { checklist: this.normalizeChecklist(dto.checklist) } : {}),
          ...(dto.observations !== undefined ? { observations: dto.observations } : {}),
          ...(dto.reportedIssue !== undefined ? { reportedIssue: dto.reportedIssue } : {}),
          ...(dto.serviceDescription !== undefined ? { serviceDescription: dto.serviceDescription } : {}),
          ...(signatureData ? { signatureData, signedAt: dto.signedAt ? new Date(dto.signedAt) : new Date() } : {}),
        },
      });
      await tx.auditLog.create({
        data: this.audit(
          OPERATION_AUDIT_ACTIONS.OPERATION_UPDATED,
          OPERATION_RESOURCE,
          actor,
          context,
          {
            operationId: id,
            changedFields: Object.keys(dto),
          },
        ),
      });
      await this.lifecycle.publishOperationCompletedTx(tx, id, actor.id, context);
      await this.maintenance.syncOperationCompletedTx(tx, id, actor.id, context);
    });
    for (const photo of photos) {
      const storageKey = `operations/${id}/photos/${randomUUID()}.${photo.ext}`;
      try {
        await this.storage.save({ storageKey, content: photo.buffer });
        await this.prisma.operationPhoto.create({
          data: {
            operationId: id,
            storageKey,
            caption: photo.caption,
            mimeType: photo.mimeType,
            fileSize: photo.buffer.length,
          },
        });
      } catch {
        await this.storage.delete(storageKey).catch(() => undefined);
      }
    }
    return this.operationOrThrow(id);
  }

  async getPhoto(photoId: string): Promise<unknown> {
    const photo = await this.prisma.operationPhoto.findUnique({ where: { id: photoId } });
    if (!photo)
      throw new ApplicationException(
        ERROR_CODES.OPERATION_PHOTO_NOT_FOUND,
        'Operation photo was not found',
        HttpStatus.NOT_FOUND,
      );
    const stored = await this.storage.get(photo.storageKey);
    return {
      id: photo.id,
      caption: photo.caption,
      mimeType: photo.mimeType,
      fileSize: photo.fileSize,
      createdAt: photo.createdAt,
      contentBase64: stored.content.toString('base64'),
    };
  }

  private normalizeChecklist(items?: OperationChecklistItemDto[]): Prisma.InputJsonValue {
    return (items ?? []).map((item) => ({
      label: item.label,
      done: item.done,
      note: item.note ?? null,
    }));
  }

  private decodePhoto(input: OperationPhotoInputDto): DecodedPhoto {
    const match = /^data:(image\/png|image\/jpeg);base64,(.+)$/.exec(input.dataUrl.trim());
    if (!match)
      throw new ApplicationException(
        ERROR_CODES.OPERATION_PHOTO_INVALID,
        'Photo must be a PNG or JPEG data URL',
        HttpStatus.BAD_REQUEST,
      );
    const mimeType = match[1];
    if (!OPERATION_PHOTO_MIME_TYPES.includes(mimeType as never))
      throw new ApplicationException(
        ERROR_CODES.OPERATION_PHOTO_INVALID,
        'Photo MIME type is not allowed',
        HttpStatus.BAD_REQUEST,
      );
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0 || buffer.length > MAX_OPERATION_PHOTO_SIZE_BYTES)
      throw new ApplicationException(
        ERROR_CODES.OPERATION_PHOTO_INVALID,
        'Photo is empty or exceeds the 5 MiB limit',
        HttpStatus.BAD_REQUEST,
      );
    return {
      buffer,
      mimeType,
      ext: mimeType === 'image/png' ? 'png' : 'jpg',
      caption: input.caption ?? null,
    };
  }

  private normalizeSignatureData(value?: string): string | null {
    if (!value) return null;
    const dataUrl = value.trim();
    const match = /^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
    if (!match)
      throw new ApplicationException(
        ERROR_CODES.OPERATION_PHOTO_INVALID,
        'Signature must be a PNG or JPEG data URL',
        HttpStatus.BAD_REQUEST,
      );

    const mimeType = match[1].toLowerCase();
    if (!OPERATION_SIGNATURE_MIME_TYPES.includes(mimeType as never))
      throw new ApplicationException(
        ERROR_CODES.OPERATION_PHOTO_INVALID,
        'Signature MIME type is not allowed',
        HttpStatus.BAD_REQUEST,
      );

    const base64 = match[2].replace(/\s/g, '');
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_OPERATION_SIGNATURE_SIZE_BYTES)
      throw new ApplicationException(
        ERROR_CODES.OPERATION_PHOTO_INVALID,
        'Signature is empty or exceeds the 2 MiB limit',
        HttpStatus.BAD_REQUEST,
      );
    if (!this.isValidSignatureBinary(buffer, mimeType))
      throw new ApplicationException(
        ERROR_CODES.OPERATION_PHOTO_INVALID,
        'Signature binary is invalid',
        HttpStatus.BAD_REQUEST,
      );

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  private isValidSignatureBinary(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === 'image/png') {
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimeType === 'image/jpeg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
    }
    return false;
  }

  private async validateRelations(
    customerId: string,
    addressId?: string,
    equipmentId?: string,
  ): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!customer)
      throw new ApplicationException(
        ERROR_CODES.CUSTOMER_NOT_FOUND,
        'Customer was not found',
        HttpStatus.NOT_FOUND,
      );
    if (addressId) {
      const address = await this.prisma.customerAddress.findFirst({
        where: { id: addressId, customerId },
        select: { id: true },
      });
      if (!address)
        throw new ApplicationException(
          ERROR_CODES.VALIDATION_ERROR,
          'Address does not belong to the selected customer',
          HttpStatus.BAD_REQUEST,
        );
    }
    if (equipmentId) {
      const equipment = await this.prisma.equipment.findFirst({
        where: { id: equipmentId, customerId },
        select: { id: true },
      });
      if (!equipment)
        throw new ApplicationException(
          ERROR_CODES.VALIDATION_ERROR,
          'Equipment does not belong to the selected customer',
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  private async resolveOperatorAssignment(
    requestedOperatorId: string | undefined,
    actor: AuthenticatedUser,
  ): Promise<OperationAssignment> {
    if (!requestedOperatorId) {
      return { operatorId: actor.id, delegated: false };
    }

    if (actor.role === Role.OPERATOR) {
      return { operatorId: actor.id, delegated: false, ignoredOperatorId: requestedOperatorId };
    }

    if (actor.role !== Role.OWNER && actor.role !== Role.MANAGER) {
      throw new ApplicationException(
        ERROR_CODES.FORBIDDEN,
        'Only OWNER and MANAGER users can delegate operations',
        HttpStatus.FORBIDDEN,
      );
    }

    const operator = await this.prisma.user.findUnique({
      where: { id: requestedOperatorId },
      select: { id: true, role: true, isActive: true, disabledAt: true },
    });
    if (!operator || !operator.isActive || operator.disabledAt) {
      throw new ApplicationException(
        ERROR_CODES.OPERATION_OPERATOR_INVALID,
        'Assigned operator must exist and be active',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      operator.role !== Role.OWNER &&
      operator.role !== Role.MANAGER &&
      operator.role !== Role.OPERATOR
    ) {
      throw new ApplicationException(
        ERROR_CODES.OPERATION_OPERATOR_INVALID,
        'Assigned operator must have an operational role',
        HttpStatus.BAD_REQUEST,
      );
    }

    return { operatorId: operator.id, delegated: operator.id !== actor.id };
  }

  private async operationOrThrow(
    id: string,
  ): Promise<Prisma.OperationGetPayload<{ include: typeof OPERATION_INCLUDE }>> {
    const operation = await this.prisma.operation.findUnique({
      where: { id },
      include: OPERATION_INCLUDE,
    });
    if (!operation)
      throw new ApplicationException(
        ERROR_CODES.OPERATION_NOT_FOUND,
        'Operation was not found',
        HttpStatus.NOT_FOUND,
      );
    return operation;
  }

  private audit(
    action: string,
    resource: string,
    actor: AuthenticatedUser,
    context: OperationAuditContext,
    metadata: Record<string, unknown>,
  ): Prisma.AuditLogUncheckedCreateInput {
    return {
      action,
      resource,
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
