import { HttpStatus, Injectable } from '@nestjs/common';
import { BrandAssetType, DocumentTemplateType, Prisma, SignatureMode } from '@prisma/client';
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

const DOCUMENT_CONTEXT_BUDGET_INCLUDE = {
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
  customerAddress: true,
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
  operation: { select: { id: true, number: true, type: true, status: true, equipmentId: true } },
  creator: { select: { id: true, name: true, email: true, username: true, jobTitle: true } },
  items: {
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          unit: true,
          brand: true,
          model: true,
          category: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  document: true,
} satisfies Prisma.BudgetInclude;

export type DocumentContextOperation = Prisma.OperationGetPayload<{
  include: typeof DOCUMENT_CONTEXT_OPERATION_INCLUDE;
}>;

export type DocumentContextBudget = Prisma.BudgetGetPayload<{
  include: typeof DOCUMENT_CONTEXT_BUDGET_INCLUDE;
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
  kind: 'operation';
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

export interface TemplatePreviewContext {
  kind: 'templatePreview';
  configuration: DocumentConfiguration;
  template: DocumentConfigurationTemplate;
  signature: DocumentSignatureContext;
  placeholders: {
    documentNumber: string;
    generatedAt: string;
    customerName: string;
    equipmentName: string;
    operatorName: string;
  };
  assets: {
    signature: ResolvedDocumentAsset | null;
    logo: ResolvedDocumentAsset | null;
    watermark: ResolvedDocumentAsset | null;
    qrCode: ResolvedDocumentAsset | null;
    images: ResolvedDocumentAsset[];
  };
}

export interface BudgetContext {
  kind: 'budget';
  budget: DocumentContextBudget;
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

export type DocumentBuildContext = DocumentContext | TemplatePreviewContext | BudgetContext;

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
      kind: 'operation',
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

  async buildTemplatePreviewContext(templateId: string): Promise<TemplatePreviewContext> {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        organizationId: true,
        type: true,
        name: true,
        headerContent: true,
        footerContent: true,
        observations: true,
        isDefault: true,
        isSystem: true,
        isActive: true,
        requiresSignature: true,
        signatureMode: true,
        signatureId: true,
        createdAt: true,
        updatedAt: true,
        signature: {
          select: {
            id: true,
            name: true,
            title: true,
            imageStorageKey: true,
            mimeType: true,
            fileSize: true,
            active: true,
          },
        },
      },
    });

    if (!template) {
      throw new ApplicationException(
        ERROR_CODES.TEMPLATE_NOT_FOUND,
        'Document template was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (!template.isActive) {
      throw new ApplicationException(
        ERROR_CODES.TEMPLATE_INACTIVE,
        'Document template is inactive and cannot be previewed',
        HttpStatus.CONFLICT,
      );
    }

    const [configuration, logo] = await Promise.all([
      this.configuration.getConfigurationForType(template.type),
      this.resolveLatestBrandAsset(template.organizationId, BrandAssetType.LOGO),
    ]);
    const signature = await this.resolveSignature(template, null);

    return {
      kind: 'templatePreview',
      configuration: {
        ...configuration,
        defaultTemplate: template,
      },
      template,
      signature,
      placeholders: {
        documentNumber: `MODELO-${template.type}`,
        generatedAt: new Date().toISOString(),
        customerName: 'Cliente',
        equipmentName: 'Equipamento',
        operatorName: 'Operador',
      },
      assets: {
        signature: signature.fixedSignature?.image ?? null,
        logo,
        watermark: null,
        qrCode: null,
        images: [],
      },
    };
  }

  async buildBudgetContext(budgetId: string): Promise<BudgetContext> {
    const [budget, configuration] = await Promise.all([
      this.prisma.budget.findUnique({
        where: { id: budgetId },
        include: DOCUMENT_CONTEXT_BUDGET_INCLUDE,
      }),
      this.configuration.getConfigurationForType(DocumentTemplateType.BUDGET),
    ]);

    if (!budget) {
      throw new ApplicationException(
        ERROR_CODES.BUDGET_NOT_FOUND,
        'Budget was not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const template = configuration.defaultTemplate;
    const signature = await this.resolveSignature(template, null);

    return {
      kind: 'budget',
      budget,
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
    operation: DocumentContextOperation | null,
  ): Promise<DocumentSignatureContext> {
    const mode = template?.signatureMode ?? SignatureMode.NONE;
    const requiresSignature = Boolean(template?.requiresSignature && mode !== SignatureMode.NONE);
    const collectedSignature =
      mode === SignatureMode.COLLECTED || mode === SignatureMode.HYBRID
        ? {
            label: 'Assinatura do cliente/responsável',
            signedAt: operation?.signedAt?.toISOString() ?? null,
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

  private async resolveLatestBrandAsset(
    organizationId: string,
    type: BrandAssetType,
  ): Promise<ResolvedDocumentAsset | null> {
    const asset = await this.prisma.brandAsset.findFirst({
      where: { organizationId, type },
      orderBy: { createdAt: 'desc' },
      select: { storageKey: true, mimeType: true, fileSize: true },
    });
    if (!asset) return null;
    return this.assets.resolveLogo(asset.storageKey, {
      mimeType: asset.mimeType,
      fileSize: asset.fileSize,
    });
  }
}
