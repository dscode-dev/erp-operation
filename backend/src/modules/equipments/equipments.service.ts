import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { EquipmentStatus, EquipmentType, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  STORAGE_PROVIDER_TOKEN,
  type StorageProviderContract,
} from '../../infra/storage/storage-provider.type';
import {
  EQUIPMENT_ATTACHMENT_EXTENSIONS,
  EQUIPMENT_ATTACHMENT_MIME_TYPES,
  EQUIPMENT_ATTACHMENT_RESOURCE,
  EQUIPMENT_AUDIT_ACTIONS,
  EQUIPMENT_METRIC_RESOURCE,
  EQUIPMENT_RESOURCE,
  MAX_EQUIPMENT_ATTACHMENT_SIZE_BYTES,
} from '../../shared/constants/equipments.constants';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import { PrismaService } from '../database/prisma.service';
import type {
  CreateEquipmentDto,
  CreateEquipmentMetricDto,
  ListEquipmentsQueryDto,
  UpdateEquipmentDto,
} from './dto/equipment.dto';
import type { UploadedEquipmentFile } from './types/uploaded-equipment-file.type';

export interface EquipmentAuditContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

const EQUIPMENT_INCLUDE = {
  customer: { select: { id: true, name: true, tradeName: true, isActive: true } },
  address: true,
  parent: { select: { id: true, name: true, tag: true, type: true } },
  children: {
    select: { id: true, name: true, tag: true, type: true, status: true, isActive: true },
    orderBy: { name: 'asc' as const },
  },
  attachments: { orderBy: { createdAt: 'desc' as const } },
  metrics: { orderBy: { recordedAt: 'desc' as const }, take: 20 },
} satisfies Prisma.EquipmentInclude;

@Injectable()
export class EquipmentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER_TOKEN) private readonly storage: StorageProviderContract,
  ) {}

  async list(query: ListEquipmentsQueryDto): Promise<unknown> {
    const where: Prisma.EquipmentWhereInput = {
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.addressId ? { addressId: query.addressId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { tag: { contains: query.search, mode: 'insensitive' } },
              { serialNumber: { contains: query.search, mode: 'insensitive' } },
              { model: { contains: query.search, mode: 'insensitive' } },
              { manufacturer: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.equipment.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        include: {
          customer: { select: { id: true, name: true, tradeName: true } },
          address: { select: { id: true, name: true, city: true, state: true } },
          _count: { select: { children: true, attachments: true, metrics: true } },
        },
      }),
      this.prisma.equipment.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async get(id: string): Promise<unknown> {
    return this.equipmentOrThrow(id);
  }

  /**
   * Look up an equipment by its QR identifier. The QR encodes `qrCode`
   * (`equipment:<qrToken>`); `qrToken` is also accepted for resilience and to
   * prepare for future signed/tokenized QR formats. Returns the same full
   * detail payload as `get`.
   */
  async lookupByQrCode(qrCode: string): Promise<unknown> {
    const value = (qrCode ?? '').trim();
    if (!value) {
      throw new ApplicationException(
        ERROR_CODES.VALIDATION_ERROR,
        'QR code is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const equipment = await this.prisma.equipment.findFirst({
      where: { OR: [{ qrCode: value }, { qrToken: value }] },
      include: EQUIPMENT_INCLUDE,
    });
    if (!equipment) {
      throw new ApplicationException(
        ERROR_CODES.EQUIPMENT_NOT_FOUND,
        'Equipment was not found for the provided QR code',
        HttpStatus.NOT_FOUND,
      );
    }
    return equipment;
  }

  async stats(): Promise<Record<string, unknown>> {
    const [total, active, maintenance, inactive, retired, byType] = await this.prisma.$transaction([
      this.prisma.equipment.count(),
      this.prisma.equipment.count({ where: { status: EquipmentStatus.ACTIVE } }),
      this.prisma.equipment.count({ where: { status: EquipmentStatus.MAINTENANCE } }),
      this.prisma.equipment.count({ where: { status: EquipmentStatus.INACTIVE } }),
      this.prisma.equipment.count({ where: { status: EquipmentStatus.RETIRED } }),
      this.prisma.equipment.findMany({ select: { type: true } }),
    ]);
    const types = Object.fromEntries(
      Object.values(EquipmentType).map((type) => [
        type,
        byType.filter((item) => item.type === type).length,
      ]),
    );
    return { total, active, maintenance, inactive, retired, byType: types };
  }

  async create(
    dto: CreateEquipmentDto,
    actor: AuthenticatedUser,
    context: EquipmentAuditContext,
  ): Promise<unknown> {
    await this.validateRelations(dto.customerId, dto.addressId, dto.parentEquipmentId);
    const qrToken = randomUUID();
    const equipment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.equipment.create({
        data: {
          ...this.createData(dto),
          qrToken,
          qrCode: `equipment:${qrToken}`,
        },
        include: EQUIPMENT_INCLUDE,
      });
      await tx.auditLog.create({
        data: this.audit(
          EQUIPMENT_AUDIT_ACTIONS.EQUIPMENT_CREATED,
          EQUIPMENT_RESOURCE,
          actor,
          context,
          {
            equipmentId: created.id,
            customerId: created.customerId,
            type: created.type,
          },
        ),
      });
      return created;
    });
    return equipment;
  }

  async update(
    id: string,
    dto: UpdateEquipmentDto,
    actor: AuthenticatedUser,
    context: EquipmentAuditContext,
  ): Promise<unknown> {
    const existing = await this.equipmentOrThrow(id);
    const customerId = dto.customerId ?? existing.customerId;
    const addressId = dto.addressId ?? existing.addressId ?? undefined;
    const parentId = dto.parentEquipmentId ?? existing.parentEquipmentId ?? undefined;
    await this.validateRelations(customerId, addressId, parentId, id);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.equipment.update({
        where: { id },
        data: this.updateData(dto),
        include: EQUIPMENT_INCLUDE,
      });
      await tx.auditLog.create({
        data: this.audit(
          EQUIPMENT_AUDIT_ACTIONS.EQUIPMENT_UPDATED,
          EQUIPMENT_RESOURCE,
          actor,
          context,
          {
            equipmentId: id,
            changedFields: Object.keys(dto),
          },
        ),
      });
      return updated;
    });
  }

  remove(id: string, actor: AuthenticatedUser, context: EquipmentAuditContext): Promise<unknown> {
    return this.setActive(
      id,
      false,
      EQUIPMENT_AUDIT_ACTIONS.EQUIPMENT_DELETED,
      actor,
      context,
      true,
    );
  }

  disable(id: string, actor: AuthenticatedUser, context: EquipmentAuditContext): Promise<unknown> {
    return this.setActive(id, false, EQUIPMENT_AUDIT_ACTIONS.EQUIPMENT_DISABLED, actor, context);
  }

  enable(id: string, actor: AuthenticatedUser, context: EquipmentAuditContext): Promise<unknown> {
    return this.setActive(id, true, EQUIPMENT_AUDIT_ACTIONS.EQUIPMENT_ENABLED, actor, context);
  }

  async createMetric(
    id: string,
    dto: CreateEquipmentMetricDto,
    actor: AuthenticatedUser,
    context: EquipmentAuditContext,
  ): Promise<unknown> {
    await this.equipmentOrThrow(id);
    return this.prisma.$transaction(async (tx) => {
      const metric = await tx.equipmentMetric.create({
        data: {
          equipmentId: id,
          key: dto.key,
          value: dto.value,
          unit: dto.unit,
          recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        },
      });
      await tx.auditLog.create({
        data: this.audit(
          EQUIPMENT_AUDIT_ACTIONS.EQUIPMENT_METRIC_CREATED,
          EQUIPMENT_METRIC_RESOURCE,
          actor,
          context,
          {
            equipmentId: id,
            metricId: metric.id,
            key: metric.key,
          },
        ),
      });
      return metric;
    });
  }

  async listMetrics(id: string): Promise<unknown> {
    await this.equipmentOrThrow(id);
    return this.prisma.equipmentMetric.findMany({
      where: { equipmentId: id },
      orderBy: { recordedAt: 'desc' },
    });
  }

  async deleteMetric(
    id: string,
    metricId: string,
    actor: AuthenticatedUser,
    context: EquipmentAuditContext,
  ): Promise<{ deleted: true }> {
    const metric = await this.prisma.equipmentMetric.findFirst({
      where: { id: metricId, equipmentId: id },
    });
    if (!metric) throw this.notFound('Equipment metric was not found');
    await this.prisma.$transaction([
      this.prisma.equipmentMetric.delete({ where: { id: metricId } }),
      this.prisma.auditLog.create({
        data: this.audit(
          EQUIPMENT_AUDIT_ACTIONS.EQUIPMENT_METRIC_DELETED,
          EQUIPMENT_METRIC_RESOURCE,
          actor,
          context,
          {
            equipmentId: id,
            metricId,
          },
        ),
      }),
    ]);
    return { deleted: true };
  }

  async uploadAttachment(
    id: string,
    category: Prisma.EquipmentAttachmentCreateInput['category'],
    file: UploadedEquipmentFile | undefined,
    actor: AuthenticatedUser,
    context: EquipmentAuditContext,
  ): Promise<unknown> {
    await this.equipmentOrThrow(id);
    this.validateFile(file);
    const valid = file as UploadedEquipmentFile;
    const extension =
      valid.mimetype === 'application/pdf' ? 'pdf' : valid.mimetype === 'image/png' ? 'png' : 'jpg';
    const storageKey = `equipments/${id}/attachments/${randomUUID()}.${extension}`;
    await this.storage.save({ storageKey, content: valid.buffer });
    try {
      return await this.prisma.$transaction(async (tx) => {
        const attachment = await tx.equipmentAttachment.create({
          data: {
            equipmentId: id,
            storageKey,
            fileName: this.sanitize(valid.originalname),
            mimeType: valid.mimetype,
            fileSize: valid.size,
            category,
          },
        });
        await tx.auditLog.create({
          data: this.audit(
            EQUIPMENT_AUDIT_ACTIONS.EQUIPMENT_ATTACHMENT_UPLOADED,
            EQUIPMENT_ATTACHMENT_RESOURCE,
            actor,
            context,
            {
              equipmentId: id,
              attachmentId: attachment.id,
              category,
              mimeType: attachment.mimeType,
              fileSize: attachment.fileSize,
            },
          ),
        });
        return attachment;
      });
    } catch (error) {
      await this.storage.delete(storageKey);
      throw error;
    }
  }

  async getAttachment(id: string): Promise<unknown> {
    const attachment = await this.attachmentOrThrow(id);
    const stored = await this.storage.get(attachment.storageKey);
    return { ...attachment, contentBase64: stored.content.toString('base64') };
  }

  async deleteAttachment(
    id: string,
    actor: AuthenticatedUser,
    context: EquipmentAuditContext,
  ): Promise<{ deleted: true }> {
    const attachment = await this.attachmentOrThrow(id);
    await this.prisma.$transaction([
      this.prisma.equipmentAttachment.delete({ where: { id } }),
      this.prisma.auditLog.create({
        data: this.audit(
          EQUIPMENT_AUDIT_ACTIONS.EQUIPMENT_ATTACHMENT_DELETED,
          EQUIPMENT_ATTACHMENT_RESOURCE,
          actor,
          context,
          {
            equipmentId: attachment.equipmentId,
            attachmentId: id,
          },
        ),
      }),
    ]);
    await this.storage.delete(attachment.storageKey);
    return { deleted: true };
  }

  private updateData(
    dto: CreateEquipmentDto | UpdateEquipmentDto,
  ): Prisma.EquipmentUncheckedUpdateInput {
    return {
      ...(dto.customerId ? { customerId: dto.customerId } : {}),
      ...(dto.addressId ? { addressId: dto.addressId } : {}),
      ...(dto.parentEquipmentId ? { parentEquipmentId: dto.parentEquipmentId } : {}),
      ...(dto.type ? { type: dto.type } : {}),
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.name ? { name: dto.name } : {}),
      tag: dto.tag,
      manufacturer: dto.manufacturer,
      model: dto.model,
      serialNumber: dto.serialNumber,
      capacity: dto.capacity,
      voltage: dto.voltage,
      installationDate: dto.installationDate ? new Date(dto.installationDate) : undefined,
      warrantyExpiration: dto.warrantyExpiration ? new Date(dto.warrantyExpiration) : undefined,
      observations: dto.observations,
    };
  }

  private createData(dto: CreateEquipmentDto): Prisma.EquipmentUncheckedCreateInput {
    return {
      customerId: dto.customerId,
      addressId: dto.addressId,
      parentEquipmentId: dto.parentEquipmentId,
      type: dto.type,
      status: dto.status,
      name: dto.name,
      tag: dto.tag,
      manufacturer: dto.manufacturer,
      model: dto.model,
      serialNumber: dto.serialNumber,
      capacity: dto.capacity,
      voltage: dto.voltage,
      installationDate: dto.installationDate ? new Date(dto.installationDate) : undefined,
      warrantyExpiration: dto.warrantyExpiration ? new Date(dto.warrantyExpiration) : undefined,
      observations: dto.observations,
      qrCode: '',
    };
  }

  private async validateRelations(
    customerId: string,
    addressId?: string,
    parentId?: string,
    currentId?: string,
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
          ERROR_CODES.EQUIPMENT_ADDRESS_MISMATCH,
          'Address does not belong to the selected customer',
          HttpStatus.BAD_REQUEST,
        );
    }
    if (parentId) {
      if (parentId === currentId)
        throw new ApplicationException(
          ERROR_CODES.EQUIPMENT_HIERARCHY_INVALID,
          'Equipment cannot be its own parent',
          HttpStatus.BAD_REQUEST,
        );
      const parent = await this.prisma.equipment.findFirst({
        where: { id: parentId, customerId },
        select: { id: true, parentEquipmentId: true },
      });
      if (!parent || parent.parentEquipmentId === currentId)
        throw new ApplicationException(
          ERROR_CODES.EQUIPMENT_HIERARCHY_INVALID,
          'Parent equipment is invalid for this customer',
          HttpStatus.BAD_REQUEST,
        );
    }
  }

  private async setActive(
    id: string,
    active: boolean,
    action: string,
    actor: AuthenticatedUser,
    context: EquipmentAuditContext,
    deleted = false,
  ): Promise<unknown> {
    await this.equipmentOrThrow(id);
    return this.prisma.$transaction(async (tx) => {
      const equipment = await tx.equipment.update({
        where: { id },
        data: {
          isActive: active,
          disabledAt: active ? null : new Date(),
          status: active ? EquipmentStatus.ACTIVE : EquipmentStatus.INACTIVE,
        },
        include: EQUIPMENT_INCLUDE,
      });
      await tx.auditLog.create({
        data: this.audit(action, EQUIPMENT_RESOURCE, actor, context, {
          equipmentId: id,
          ...(deleted ? { softDelete: true } : {}),
        }),
      });
      return deleted ? { deleted: true } : equipment;
    });
  }

  private async equipmentOrThrow(
    id: string,
  ): Promise<Prisma.EquipmentGetPayload<{ include: typeof EQUIPMENT_INCLUDE }>> {
    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: EQUIPMENT_INCLUDE,
    });
    if (!equipment)
      throw new ApplicationException(
        ERROR_CODES.EQUIPMENT_NOT_FOUND,
        'Equipment was not found',
        HttpStatus.NOT_FOUND,
      );
    return equipment;
  }

  private async attachmentOrThrow(
    id: string,
  ): Promise<Prisma.EquipmentAttachmentGetPayload<object>> {
    const attachment = await this.prisma.equipmentAttachment.findUnique({ where: { id } });
    if (!attachment) throw this.notFound('Equipment attachment was not found');
    return attachment;
  }

  private notFound(message: string): ApplicationException {
    return new ApplicationException(ERROR_CODES.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }

  private validateFile(file: UploadedEquipmentFile | undefined): void {
    if (!file)
      throw new ApplicationException(
        ERROR_CODES.UPLOAD_FILE_REQUIRED,
        'A file field is required',
        HttpStatus.BAD_REQUEST,
      );
    if (file.size > MAX_EQUIPMENT_ATTACHMENT_SIZE_BYTES)
      throw new ApplicationException(
        ERROR_CODES.UPLOAD_FILE_TOO_LARGE,
        'Attachment exceeds the 5 MiB limit',
        HttpStatus.BAD_REQUEST,
      );
    const extension = extname(file.originalname).slice(1).toLowerCase();
    if (!EQUIPMENT_ATTACHMENT_EXTENSIONS.includes(extension as never))
      throw new ApplicationException(
        ERROR_CODES.UPLOAD_INVALID_EXTENSION,
        'Attachment extension is not allowed',
        HttpStatus.BAD_REQUEST,
      );
    if (!EQUIPMENT_ATTACHMENT_MIME_TYPES.includes(file.mimetype as never))
      throw new ApplicationException(
        ERROR_CODES.UPLOAD_INVALID_MIME_TYPE,
        'Attachment MIME type is not allowed',
        HttpStatus.BAD_REQUEST,
      );
    const pdf = file.buffer.subarray(0, 5).toString() === '%PDF-';
    const png =
      file.buffer.length >= 8 &&
      file.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg =
      file.buffer.length >= 3 &&
      file.buffer[0] === 0xff &&
      file.buffer[1] === 0xd8 &&
      file.buffer[2] === 0xff;
    if (
      (file.mimetype === 'application/pdf' && !pdf) ||
      (file.mimetype === 'image/png' && !png) ||
      (file.mimetype === 'image/jpeg' && !jpeg)
    )
      throw new ApplicationException(
        ERROR_CODES.UPLOAD_INVALID_MIME_TYPE,
        'Attachment content does not match its declared type',
        HttpStatus.BAD_REQUEST,
      );
  }

  private sanitize(name: string): string {
    return (
      name
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 255) || 'attachment'
    );
  }

  private audit(
    action: string,
    resource: string,
    actor: AuthenticatedUser,
    context: EquipmentAuditContext,
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
