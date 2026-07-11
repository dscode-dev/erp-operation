import { HttpStatus, Injectable } from '@nestjs/common';
import { DocumentTemplateType, Prisma } from '@prisma/client';
import { ERROR_CODES } from '../../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../../shared/exceptions/application.exception';
import { PrismaService } from '../../database/prisma.service';

const CONFIG_TEMPLATE_SELECT = {
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
    orderBy: { position: 'asc' as const },
    select: {
      position: true,
      signature: { select: { id: true, name: true, title: true, professionalCouncil: true, department: true, imageStorageKey: true, mimeType: true, fileSize: true, active: true, deletedAt: true } },
    },
  },
} satisfies Prisma.DocumentTemplateSelect;

const CONFIG_ORGANIZATION_SELECT = {
  id: true,
  legalName: true,
  tradeName: true,
  cnpj: true,
  email: true,
  phone: true,
  website: true,
  zipCode: true,
  street: true,
  number: true,
  complement: true,
  district: true,
  city: true,
  state: true,
  primaryColor: true,
  secondaryColor: true,
} satisfies Prisma.OrganizationSelect;

const CONFIG_SETTINGS_SELECT = {
  id: true,
  language: true,
  timezone: true,
  currency: true,
  documentPrefix: true,
} satisfies Prisma.OrganizationSettingsSelect;

export type DocumentConfigurationTemplate = Prisma.DocumentTemplateGetPayload<{
  select: typeof CONFIG_TEMPLATE_SELECT;
}>;

export type DocumentConfiguration = {
  type: DocumentTemplateType;
  organization: Prisma.OrganizationGetPayload<{ select: typeof CONFIG_ORGANIZATION_SELECT }>;
  settings: Prisma.OrganizationSettingsGetPayload<{ select: typeof CONFIG_SETTINGS_SELECT }>;
  defaultTemplate: DocumentConfigurationTemplate | null;
  templates: DocumentConfigurationTemplate[];
};

@Injectable()
export class DocumentConfigurationService {
  constructor(private readonly prisma: PrismaService) {}

  async listConfigurations(): Promise<DocumentConfiguration[]> {
    const types = Object.values(DocumentTemplateType);
    return Promise.all(types.map((type) => this.getConfigurationForType(type)));
  }

  async getConfigurationForType(type: DocumentTemplateType): Promise<DocumentConfiguration> {
    const [organization, settings, templates] = await Promise.all([
      this.prisma.organization.findFirst({ orderBy: { createdAt: 'asc' }, select: CONFIG_ORGANIZATION_SELECT }),
      this.prisma.organizationSettings.findFirst({ orderBy: { createdAt: 'asc' }, select: CONFIG_SETTINGS_SELECT }),
      this.prisma.documentTemplate.findMany({
        where: { type, isActive: true },
        select: CONFIG_TEMPLATE_SELECT,
        orderBy: [{ isDefault: 'desc' }, { isSystem: 'desc' }, { createdAt: 'asc' }],
      }),
    ]);

    if (!organization || !settings) {
      throw new ApplicationException(
        ERROR_CODES.ORGANIZATION_NOT_FOUND,
        'Organization foundation is required for document configuration',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      type,
      organization,
      settings,
      defaultTemplate: templates.find((template) => template.isDefault) ?? templates[0] ?? null,
      templates,
    };
  }

  async getConfigurationByTemplate(templateId: string): Promise<DocumentConfiguration> {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id: templateId },
      select: { type: true },
    });
    if (!template) {
      throw new ApplicationException(
        ERROR_CODES.NOT_FOUND,
        'Document template was not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return this.getConfigurationForType(template.type);
  }
}
