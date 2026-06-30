import { HttpStatus, Injectable } from '@nestjs/common';
import { DocumentTemplateType, Prisma, SignatureMode } from '@prisma/client';
import { ERROR_CODES } from '../../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../../shared/exceptions/application.exception';
import { PrismaService } from '../../database/prisma.service';
import { DocumentAssetResolver } from '../assets/document-asset-resolver.service';
import {
  DocumentConfigurationService,
  type DocumentConfiguration,
  type DocumentConfigurationTemplate,
} from '../configuration/document-configuration.service';

const DOCUMENT_CONTEXT_OPERATION_INCLUDE = {
  customer: {
    include: {
      addresses: {
        orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
        take: 5,
      },
      contacts: {
        orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'asc' as const }],
        take: 5,
      },
    },
  },
  address: true,
  equipment: {
    include: {
      customer: { select: { id: true, name: true } },
      address: true,
      parent: { select: { id: true, name: true, tag: true } },
      children: {
        select: { id: true, name: true, tag: true, status: true },
        orderBy: { name: 'asc' as const },
      },
      metrics: { orderBy: { recordedAt: 'desc' as const }, take: 12 },
      attachments: { orderBy: { createdAt: 'desc' as const }, take: 12 },
    },
  },
  operator: { select: { id: true, name: true, email: true, username: true, jobTitle: true } },
  photos: { orderBy: { createdAt: 'asc' as const } },
  documents: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.OperationInclude;

export type DocumentContextOperation = Prisma.OperationGetPayload<{
  include: typeof DOCUMENT_CONTEXT_OPERATION_INCLUDE;
}>;

export interface ResolvedDocumentAsset {
  storageKey: string;
  mimeType: string;
  fileSize: number;
  contentBase64: string;
}

export interface DocumentSignatureContext {
  requiresSignature: boolean;
  signatureMode: SignatureMode;
  signatureId: string | null;
  fixedSignature: {
    id: string;
    name: string;
    title: string;
    image: ResolvedDocumentAsset;
  } | null;
  collectedSignature: {
    label: string;
    signedAt: string | null;
  } | null;
}

export interface DocumentContext {
  operation: DocumentContextOperation;
  configuration: DocumentConfiguration;
  template: DocumentConfigurationTemplate | null;
  signature: DocumentSignatureContext;
  assets: {
    signature: ResolvedDocumentAsset | null;
    logo: ResolvedDocumentAsset | null;
    watermark: ResolvedDocumentAsset | null;
    qrCode: ResolvedDocumentAsset | null;
    images: ResolvedDocumentAsset[];
  };
}

@Injectable()
export class DocumentContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configuration: DocumentConfigurationService,
    private readonly assets: DocumentAssetResolver,
  ) {}

  async create(operationId: string, type: DocumentTemplateType): Promise<DocumentContext> {
    const [operation, configuration] = await Promise.all([
      this.prisma.operation.findUnique({
        where: { id: operationId },
        include: DOCUMENT_CONTEXT_OPERATION_INCLUDE,
      }),
      this.configuration.getConfigurationForType(type),
    ]);

    if (!operation) {
      throw new ApplicationException(
        ERROR_CODES.OPERATION_NOT_FOUND,
        'Operation was not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const template = configuration.defaultTemplate;
    const signature = await this.resolveSignature(template, operation);

    return {
      operation,
      configuration,
      template,
      signature,
      assets: {
        signature: signature.fixedSignature?.image ?? null,
        logo: null,
        watermark: null,
        qrCode: null,
        images: [],
      },
    };
  }

  private async resolveSignature(
    template: DocumentConfigurationTemplate | null,
    operation: DocumentContextOperation,
  ): Promise<DocumentSignatureContext> {
    const mode = template?.signatureMode ?? SignatureMode.NONE;
    const requiresSignature = Boolean(template?.requiresSignature && mode !== SignatureMode.NONE);
    const collectedSignature =
      mode === SignatureMode.COLLECTED || mode === SignatureMode.HYBRID
        ? {
            label: 'Assinatura do cliente/responsável',
            signedAt: operation.signedAt?.toISOString() ?? null,
          }
        : null;

    if (!requiresSignature || mode === SignatureMode.NONE) {
      return {
        requiresSignature: false,
        signatureMode: SignatureMode.NONE,
        signatureId: null,
        fixedSignature: null,
        collectedSignature: null,
      };
    }

    if (mode === SignatureMode.COLLECTED) {
      return {
        requiresSignature,
        signatureMode: mode,
        signatureId: null,
        fixedSignature: null,
        collectedSignature,
      };
    }

    const signature = template?.signature;
    if (!signature || !template.signatureId) {
      throw new ApplicationException(
        ERROR_CODES.SIGNATURE_NOT_FOUND,
        'Document template requires a fixed signature, but no active signature is configured',
        HttpStatus.CONFLICT,
      );
    }
    if (!signature.active) {
      throw new ApplicationException(
        ERROR_CODES.SIGNATURE_INACTIVE,
        'Configured signature is inactive',
        HttpStatus.CONFLICT,
      );
    }
    if (!signature.imageStorageKey || !signature.mimeType || !signature.fileSize) {
      throw new ApplicationException(
        ERROR_CODES.SIGNATURE_IMAGE_REQUIRED,
        'Configured signature image was not uploaded',
        HttpStatus.CONFLICT,
      );
    }

    const image = await this.assets.resolveSignature(signature.imageStorageKey, {
      mimeType: signature.mimeType,
      fileSize: signature.fileSize,
    });

    return {
      requiresSignature,
      signatureMode: mode,
      signatureId: template.signatureId,
      fixedSignature: {
        id: signature.id,
        name: signature.name,
        title: signature.title,
        image,
      },
      collectedSignature,
    };
  }
}
