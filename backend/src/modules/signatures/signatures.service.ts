import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { extname } from 'node:path';
import { DocumentAssetResolver } from '../document-engine/assets/document-asset-resolver.service';
import { PrismaService } from '../database/prisma.service';
import {
  MAX_SIGNATURE_IMAGE_SIZE_BYTES,
  SIGNATURE_AUDIT_ACTIONS,
  SIGNATURE_IMAGE_EXTENSIONS,
  SIGNATURE_IMAGE_MIME_TYPES,
  SIGNATURE_RESOURCE,
} from '../../shared/constants/signatures.constants';
import { ERROR_CODES } from '../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../shared/exceptions/application.exception';
import type { AuthenticatedUser } from '../../shared/types/authenticated-user.type';
import { buildPaginatedResponse } from '../../shared/types/pagination.types';
import type { RequestWithId } from '../../shared/types/request-with-id.type';
import type {
  CreateSignatureDto,
  ListSignaturesQueryDto,
  UpdateSignatureDto,
} from './dto/signature.dto';
import type { UploadedSignatureFile } from './types/uploaded-signature-file.type';

export interface SignatureAuditContext {
  requestId: string;
  ip: string | null;
  userAgent: string | null;
}

const SIGNATURE_SELECT = {
  id: true,
  name: true,
  title: true,
  mimeType: true,
  originalFileName: true,
  fileSize: true,
  active: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SignatureSelect;

const SIGNATURE_INTERNAL_SELECT = {
  ...SIGNATURE_SELECT,
  imageStorageKey: true,
} satisfies Prisma.SignatureSelect;

type SignatureInternal = Prisma.SignatureGetPayload<{ select: typeof SIGNATURE_INTERNAL_SELECT }>;
export type SignatureResponse = Prisma.SignatureGetPayload<{ select: typeof SIGNATURE_SELECT }> & { hasImage: boolean };

export interface SignatureImageResponse extends SignatureResponse {
  contentBase64: string;
}

@Injectable()
export class SignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: DocumentAssetResolver,
  ) {}

  async list(query: ListSignaturesQueryDto): Promise<unknown> {
    const where: Prisma.SignatureWhereInput = {
      deletedAt: null,
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.signature.findMany({
        where,
        select: SIGNATURE_INTERNAL_SELECT,
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.signature.count({ where }),
    ]);
    return buildPaginatedResponse(items.map((item) => this.toResponse(item)), total, query.page, query.limit);
  }

  async get(id: string): Promise<SignatureResponse> {
    return this.signatureOrThrow(id, { includeDeleted: false });
  }

  async create(
    dto: CreateSignatureDto,
    actor: AuthenticatedUser,
    context: SignatureAuditContext,
  ): Promise<SignatureResponse> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.signature.create({
        data: {
          name: this.clean(dto.name),
          title: this.clean(dto.title),
          active: dto.active ?? true,
        },
        select: SIGNATURE_INTERNAL_SELECT,
      });
      await tx.auditLog.create({
        data: this.auditInput(SIGNATURE_AUDIT_ACTIONS.SIGNATURE_CREATED, actor, context, {
          signatureId: created.id,
        }),
      });
      return this.toResponse(created);
    });
  }

  async update(
    id: string,
    dto: UpdateSignatureDto,
    actor: AuthenticatedUser,
    context: SignatureAuditContext,
  ): Promise<SignatureResponse> {
    await this.signatureOrThrow(id, { includeDeleted: false });
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.signature.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: this.clean(dto.name) } : {}),
          ...(dto.title !== undefined ? { title: this.clean(dto.title) } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        select: SIGNATURE_INTERNAL_SELECT,
      });
      await tx.auditLog.create({
        data: this.auditInput(SIGNATURE_AUDIT_ACTIONS.SIGNATURE_UPDATED, actor, context, {
          signatureId: id,
          changedFields: Object.keys(dto),
        }),
      });
      return this.toResponse(updated);
    });
  }

  async remove(
    id: string,
    actor: AuthenticatedUser,
    context: SignatureAuditContext,
  ): Promise<{ deleted: true }> {
    await this.signatureOrThrow(id, { includeDeleted: false });
    await this.prisma.$transaction([
      this.prisma.signature.update({ where: { id }, data: { active: false, deletedAt: new Date() } }),
      this.prisma.auditLog.create({
        data: this.auditInput(SIGNATURE_AUDIT_ACTIONS.SIGNATURE_DELETED, actor, context, {
          signatureId: id,
          softDelete: true,
        }),
      }),
    ]);
    return { deleted: true };
  }

  async uploadImage(
    id: string,
    file: UploadedSignatureFile | undefined,
    actor: AuthenticatedUser,
    context: SignatureAuditContext,
  ): Promise<SignatureResponse> {
    const signature = await this.signatureInternalOrThrow(id, { includeDeleted: false });
    this.validateImage(file);
    const validFile = file as UploadedSignatureFile;
    const extension = this.extensionFor(validFile);
    const stored = await this.assets.saveSignatureImage({ content: validFile.buffer, extension });
    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        const saved = await tx.signature.update({
          where: { id },
          data: {
            imageStorageKey: stored.storageKey,
            mimeType: validFile.mimetype,
            originalFileName: this.sanitizeOriginalName(validFile.originalname),
            fileSize: validFile.size,
          },
          select: SIGNATURE_INTERNAL_SELECT,
        });
        await tx.auditLog.create({
          data: this.auditInput(SIGNATURE_AUDIT_ACTIONS.SIGNATURE_IMAGE_UPLOADED, actor, context, {
            signatureId: id,
            fileSize: validFile.size,
            mimeType: validFile.mimetype,
          }),
        });
        return saved;
      });
      if (signature.imageStorageKey)
        await this.assets.delete(signature.imageStorageKey).catch(() => undefined);
      return this.toResponse(updated);
    } catch (error) {
      await this.assets.delete(stored.storageKey).catch(() => undefined);
      throw error;
    }
  }

  async downloadImage(
    id: string,
    actor: AuthenticatedUser,
    context: SignatureAuditContext,
  ): Promise<SignatureImageResponse> {
    const signature = await this.signatureInternalOrThrow(id, { includeDeleted: false });
    if (!signature.imageStorageKey) {
      throw new ApplicationException(
        ERROR_CODES.SIGNATURE_IMAGE_REQUIRED,
        'Signature image was not uploaded',
        HttpStatus.CONFLICT,
      );
    }
    const stored = await this.assets.getSignatureImage(signature.imageStorageKey);
    await this.prisma.auditLog.create({
      data: this.auditInput(SIGNATURE_AUDIT_ACTIONS.SIGNATURE_IMAGE_DOWNLOADED, actor, context, {
        signatureId: id,
      }),
    });
    return {
      ...this.toResponse(signature),
      contentBase64: stored.content.toString('base64'),
    };
  }

  private async signatureOrThrow(
    id: string,
    options: { includeDeleted: boolean } = { includeDeleted: false },
  ): Promise<SignatureResponse> {
    return this.toResponse(await this.signatureInternalOrThrow(id, options));
  }

  private async signatureInternalOrThrow(
    id: string,
    options: { includeDeleted: boolean } = { includeDeleted: false },
  ): Promise<SignatureInternal> {
    const signature = await this.prisma.signature.findUnique({ where: { id }, select: SIGNATURE_INTERNAL_SELECT });
    if (!signature || (!options.includeDeleted && signature.deletedAt)) {
      throw new ApplicationException(
        ERROR_CODES.SIGNATURE_NOT_FOUND,
        'Signature was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return signature;
  }

  private toResponse(signature: SignatureInternal): SignatureResponse {
    const { imageStorageKey, ...safe } = signature;
    void imageStorageKey;
    return { ...safe, hasImage: Boolean(signature.imageStorageKey) };
  }

  private validateImage(file: UploadedSignatureFile | undefined): void {
    if (!file) {
      throw new ApplicationException(
        ERROR_CODES.SIGNATURE_IMAGE_REQUIRED,
        'Signature image file is required',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (file.size <= 0 || file.size > MAX_SIGNATURE_IMAGE_SIZE_BYTES) {
      throw new ApplicationException(
        ERROR_CODES.UPLOAD_FILE_TOO_LARGE,
        'Signature image is empty or exceeds the 2 MiB limit',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!SIGNATURE_IMAGE_MIME_TYPES.includes(file.mimetype as never)) {
      throw new ApplicationException(
        ERROR_CODES.UPLOAD_INVALID_MIME_TYPE,
        'Signature image MIME type is not allowed',
        HttpStatus.BAD_REQUEST,
      );
    }
    const extension = extname(file.originalname).toLowerCase().replace('.', '');
    if (!SIGNATURE_IMAGE_EXTENSIONS.includes(extension as never)) {
      throw new ApplicationException(
        ERROR_CODES.UPLOAD_INVALID_EXTENSION,
        'Signature image extension is not allowed',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (!this.hasValidBinarySignature(file.buffer, file.mimetype)) {
      throw new ApplicationException(
        ERROR_CODES.UPLOAD_INVALID_MIME_TYPE,
        'Signature image binary signature is invalid',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private hasValidBinarySignature(buffer: Buffer, mimeType: string): boolean {
    if (mimeType === 'image/png') {
      return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  private extensionFor(file: UploadedSignatureFile): 'png' | 'jpg' | 'jpeg' {
    const extension = extname(file.originalname).toLowerCase().replace('.', '');
    return extension === 'jpeg' ? 'jpeg' : file.mimetype === 'image/png' ? 'png' : 'jpg';
  }

  private sanitizeOriginalName(name: string): string {
    const fallback = 'signature-image';
    const sanitized = name.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ').trim();
    return (sanitized || fallback).slice(0, 255);
  }

  private clean(input: string): string {
    return input
      .split('')
      .filter((char) => {
        const code = char.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
      })
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private auditInput(
    action: string,
    actor: AuthenticatedUser,
    context: SignatureAuditContext,
    metadata: Record<string, unknown>,
  ): Prisma.AuditLogUncheckedCreateInput {
    return {
      action,
      resource: SIGNATURE_RESOURCE,
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

export function signatureContextFromRequest(request: RequestWithId): SignatureAuditContext {
  return {
    requestId: request.requestId,
    ip: request.ip || null,
    userAgent: request.get('user-agent') ?? null,
  };
}
