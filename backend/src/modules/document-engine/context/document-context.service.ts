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
  assignment: {
    include: {
      assigner: { select: { id: true, name: true, username: true, jobTitle: true } },
      assignee: { select: { id: true, name: true, username: true, jobTitle: true } },
      history: {
        orderBy: { createdAt: 'asc' as const },
        take: 20,
        include: { actor: { select: { id: true, name: true, username: true, jobTitle: true } } },
      },
    },
  },
  maintenanceExecution: {
    include: {
      plan: {
        include: {
          pmocPlan: {
            include: {
              environments: {
                orderBy: { name: 'asc' as const },
                take: 20,
                include: {
                  equipments: {
                    include: {
                      equipment: {
                        select: { id: true, name: true, tag: true, type: true, status: true },
                      },
                    },
                  },
                },
              },
              equipments: {
                include: {
                  equipment: {
                    select: { id: true, name: true, tag: true, type: true, status: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  parts: {
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' as const },
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
      inventoryItem: { select: { id: true, location: true } },
    },
  },
  photos: { orderBy: { createdAt: 'asc' as const } },
  documents: { orderBy: { createdAt: 'asc' as const } },
  maintenanceChecklistItems: {
    orderBy: [{ maintenanceType: 'asc' as const }, { position: 'asc' as const }],
  },
  inspectedEquipments: {
    orderBy: { position: 'asc' as const },
    include: { equipment: { select: { id: true, name: true, type: true } } },
  },
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
  institutionalSignatures: Array<{
    id: string;
    name: string;
    title: string;
    professionalCouncil: string | null;
    department: string | null;
    image: ResolvedDocumentAsset;
  }>;
  collectedSignature: {
    label: string;
    name: string | null;
    title: string | null;
    signedAt: string | null;
    caption: string | null;
    image: ResolvedDocumentAsset | null;
  } | null;
  executionSignatures: Array<{
    role: 'client' | 'technician' | 'operator';
    label: string;
    name: string | null;
    title: string | null;
    signedAt: string | null;
    caption: string | null;
    image: ResolvedDocumentAsset | null;
  }>;
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
    const [images, logo, qrCode] = await Promise.all([
      Promise.all(
        operation.photos.map((photo) =>
          this.assets.resolveDocumentImage(photo.storageKey, {
            mimeType: photo.mimeType,
            fileSize: photo.fileSize,
          }),
        ),
      ),
      this.resolveLatestBrandAsset(configuration.organization.id, BrandAssetType.LOGO),
      operation.equipment?.qrCode
        ? this.assets.generateQrCode(operation.equipment.qrCode)
        : Promise.resolve(null),
    ]);

    return {
      kind: 'operation',
      operation,
      configuration,
      template,
      signature,
      assets: {
        signature: signature.fixedSignature?.image ?? null,
        logo,
        watermark: null,
        qrCode,
        images,
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
        executionSignatureClient: true,
        executionSignatureTechnician: true,
        executionSignatureOperator: true,
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
            professionalCouncil: true,
            department: true,
          },
        },
        institutionalSignatures: {
          orderBy: { position: 'asc' },
          select: {
            position: true,
            signature: {
              select: {
                id: true,
                name: true,
                title: true,
                professionalCouncil: true,
                department: true,
                imageStorageKey: true,
                mimeType: true,
                fileSize: true,
                active: true,
                deletedAt: true,
              },
            },
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
    const logo = await this.resolveLatestBrandAsset(
      configuration.organization.id,
      BrandAssetType.LOGO,
    );

    return {
      kind: 'budget',
      budget,
      configuration,
      template,
      signature,
      assets: {
        signature: signature.fixedSignature?.image ?? null,
        logo,
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
    const executionSignature = this.resolveExecutionSignature(operation);
    const acceptsExecutionSignatures = mode !== SignatureMode.FIXED;
    const clientEnabled = Boolean(
      acceptsExecutionSignatures &&
      (template?.executionSignatureClient ||
        mode === SignatureMode.COLLECTED ||
        mode === SignatureMode.HYBRID ||
        (mode === SignatureMode.NONE && executionSignature)),
    );
    const executionSignatures: DocumentSignatureContext['executionSignatures'] = [
      ...(clientEnabled
        ? [
            {
              role: 'client' as const,
              label: 'Assinatura do cliente/responsável',
              name: null,
              title: null,
              signedAt: operation?.signedAt?.toISOString() ?? null,
              caption: executionSignature
                ? 'Assinatura coletada na execução'
                : 'Espaço reservado para assinatura do cliente',
              image: executionSignature?.image ?? null,
            },
          ]
        : []),
      ...(acceptsExecutionSignatures && template?.executionSignatureTechnician
        ? [
            {
              role: 'technician' as const,
              label: 'Assinatura do técnico',
              name: operation?.operator?.name ?? null,
              title: operation?.operator?.jobTitle ?? null,
              signedAt: null,
              caption: 'Espaço reservado para assinatura do técnico',
              image: null,
            },
          ]
        : []),
      ...(acceptsExecutionSignatures && template?.executionSignatureOperator
        ? [
            {
              role: 'operator' as const,
              label: 'Assinatura do operador',
              name: operation?.operator?.name ?? null,
              title: operation?.operator?.jobTitle ?? null,
              signedAt: null,
              caption: 'Espaço reservado para assinatura do operador',
              image: null,
            },
          ]
        : []),
    ];
    const executionSignatureApplies = executionSignatures.length > 0;
    const effectiveMode = executionSignatureApplies
      ? mode === SignatureMode.NONE
        ? SignatureMode.COLLECTED
        : mode === SignatureMode.FIXED
          ? SignatureMode.HYBRID
          : mode
      : mode;
    const requiresSignature = Boolean(
      (template?.requiresSignature && effectiveMode !== SignatureMode.NONE) ||
      executionSignatureApplies,
    );
    const collectedSignature =
      effectiveMode === SignatureMode.COLLECTED || effectiveMode === SignatureMode.HYBRID
        ? {
            label: 'Assinatura do cliente/responsável',
            name: null,
            title: null,
            signedAt: operation?.signedAt?.toISOString() ?? null,
            caption: executionSignature
              ? 'Assinatura coletada na execução'
              : 'Espaço reservado para assinatura coletada',
            image: executionSignature?.image ?? null,
          }
        : null;

    if (!requiresSignature || effectiveMode === SignatureMode.NONE) {
      return {
        requiresSignature: false,
        signatureMode: SignatureMode.NONE,
        signatureId: null,
        fixedSignature: null,
        institutionalSignatures: [],
        collectedSignature: null,
        executionSignatures: [],
      };
    }

    if (effectiveMode === SignatureMode.COLLECTED) {
      return {
        requiresSignature,
        signatureMode: effectiveMode,
        signatureId: null,
        fixedSignature: null,
        institutionalSignatures: [],
        collectedSignature,
        executionSignatures,
      };
    }

    const configured =
      template?.institutionalSignatures
        ?.map((link) => link.signature)
        .filter((signature) => signature.active && !signature.deletedAt) ?? [];
    const signatures =
      configured.length > 0 ? configured : template?.signature ? [template.signature] : [];
    if (signatures.length === 0) {
      throw new ApplicationException(
        ERROR_CODES.SIGNATURE_NOT_FOUND,
        'Document template requires a fixed signature, but no active signature is configured',
        HttpStatus.CONFLICT,
      );
    }
    if (signatures.some((signature) => !signature.active)) {
      throw new ApplicationException(
        ERROR_CODES.SIGNATURE_INACTIVE,
        'Configured signature is inactive',
        HttpStatus.CONFLICT,
      );
    }
    if (
      signatures.some(
        (signature) => !signature.imageStorageKey || !signature.mimeType || !signature.fileSize,
      )
    ) {
      throw new ApplicationException(
        ERROR_CODES.SIGNATURE_IMAGE_REQUIRED,
        'Configured signature image was not uploaded',
        HttpStatus.CONFLICT,
      );
    }

    const institutionalSignatures = await Promise.all(
      signatures.map(async (signature) => ({
        id: signature.id,
        name: signature.name,
        title: signature.title,
        professionalCouncil: signature.professionalCouncil ?? null,
        department: signature.department ?? null,
        image: await this.assets.resolveSignature(signature.imageStorageKey!, {
          mimeType: signature.mimeType!,
          fileSize: signature.fileSize!,
        }),
      })),
    );
    const first = institutionalSignatures[0];

    return {
      requiresSignature,
      signatureMode: effectiveMode,
      signatureId: first.id,
      fixedSignature: {
        id: first.id,
        name: first.name,
        title: first.title,
        image: first.image,
      },
      institutionalSignatures,
      collectedSignature,
      executionSignatures,
    };
  }

  private resolveExecutionSignature(
    operation: DocumentContextOperation | null,
  ): { image: ResolvedDocumentAsset } | null {
    if (!operation?.signatureData) return null;

    const dataUrl = operation.signatureData.trim();
    const match = /^data:(image\/png|image\/jpeg);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
    if (!match) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_RENDER_FAILED,
        'Execution signature must be a PNG or JPEG data URL',
        HttpStatus.CONFLICT,
      );
    }

    const mimeType = match[1].toLowerCase();
    const base64 = match[2].replace(/\s/g, '');
    const buffer = Buffer.from(base64, 'base64');
    if (!this.isValidSignatureBinary(buffer, mimeType)) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_RENDER_FAILED,
        'Execution signature binary is invalid',
        HttpStatus.CONFLICT,
      );
    }

    return {
      image: {
        storageKey: `operation-signature:${operation.id}`,
        mimeType,
        fileSize: buffer.length,
        contentBase64: buffer.toString('base64'),
      },
    };
  }

  private isValidSignatureBinary(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length === 0 || buffer.length > 2_000_000) return false;
    if (mimeType === 'image/png') {
      return buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimeType === 'image/jpeg') {
      return (
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[buffer.length - 2] === 0xff &&
        buffer[buffer.length - 1] === 0xd9
      );
    }
    return false;
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
