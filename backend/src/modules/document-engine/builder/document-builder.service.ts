import { HttpStatus, Injectable } from '@nestjs/common';
import { DocumentTemplateType, Prisma } from '@prisma/client';
import {
  DOCUMENT_MAX_COMPONENTS,
  DOCUMENT_MAX_SECTIONS,
  DOCUMENT_MAX_TABLE_ROWS,
} from '../../../shared/constants/document-engine.constants';
import { ERROR_CODES } from '../../../shared/constants/error-codes.constants';
import {
  formatDocumentNumber,
  OPERATION_DOCUMENT_PREFIX,
} from '../../../shared/constants/operations.constants';
import { ApplicationException } from '../../../shared/exceptions/application.exception';
import { PrismaService } from '../../database/prisma.service';
import type {
  DocumentBlueprint,
  DocumentBlueprintComponent,
  DocumentSection,
} from '../blueprint/document-blueprint.types';
import { DocumentConfigurationService } from '../configuration/document-configuration.service';
import { DefaultSignaturePolicyResolver } from '../signatures/default-signature-policy.resolver';

const OPERATION_DOCUMENT_BUILDER_INCLUDE = {
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

type OperationForDocument = Prisma.OperationGetPayload<{
  include: typeof OPERATION_DOCUMENT_BUILDER_INCLUDE;
}>;

type ChecklistItem = { label: string; done: boolean; note: string | null };

@Injectable()
export class DocumentBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly signaturePolicy: DefaultSignaturePolicyResolver,
    private readonly configuration: DocumentConfigurationService,
  ) {}

  async buildFromOperation(
    operationId: string,
    type: DocumentTemplateType,
  ): Promise<DocumentBlueprint> {
    const [operation, configuration] = await Promise.all([
      this.prisma.operation.findUnique({
        where: { id: operationId },
        include: OPERATION_DOCUMENT_BUILDER_INCLUDE,
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
    const { organization, settings } = configuration;

    const document = operation.documents.find((item) => item.type === type) ?? {
      id: null,
      number: formatDocumentNumber(OPERATION_DOCUMENT_PREFIX[type], operation.number),
    };

    const generatedAt = new Date().toISOString();
    const sections = this.sections(operation, type);
    this.assertBlueprintLimits(sections);

    return {
      version: '1.0',
      metadata: {
        operationId: operation.id,
        documentId: document.id,
        documentType: type,
        documentNumber: document.number,
        generatedAt,
        locale: 'pt-BR',
        timezone: settings.timezone,
        currency: settings.currency,
        organization: {
          legalName: this.clean(organization.legalName),
          tradeName: this.clean(organization.tradeName),
          cnpj: this.clean(organization.cnpj),
          email: this.clean(organization.email),
          phone: this.clean(organization.phone),
          city: this.clean(organization.city),
          state: this.clean(organization.state),
          primaryColor: organization.primaryColor,
          secondaryColor: organization.secondaryColor,
        },
      },
      header: {
        title: this.titleFor(type),
        subtitle: `Operação ${String(operation.number).padStart(6, '0')}`,
        organizationName: this.clean(organization.tradeName || organization.legalName),
        documentNumber: document.number,
      },
      footer: {
        content: this.clean(`Gerado por ${organization.tradeName} · ${organization.email}`),
        generatedAt,
      },
      sections,
    };
  }

  private sections(operation: OperationForDocument, type: DocumentTemplateType): DocumentSection[] {
    const checklist = this.checklist(operation.checklist);
    const signature = this.signaturePolicy.resolve({
      operationId: operation.id,
      documentType: type,
      hasCollectedSignature: Boolean(operation.signatureData),
    });
    const address = operation.address ?? operation.customer.addresses[0] ?? null;
    const primaryContact = operation.customer.contacts[0] ?? null;

    const sections: DocumentSection[] = [
      {
        id: 'operation-summary',
        title: 'Resumo da operação',
        critical: true,
        components: [
          this.metadata('operation-metadata', [
            ['Cliente', operation.customer.tradeName ?? operation.customer.name],
            ['Tipo', operation.type],
            ['Status', operation.status],
            ['Operador', operation.operator.name],
            ['Agendado para', this.date(operation.scheduledFor)],
            ['Início', this.date(operation.startedAt)],
            ['Conclusão', this.date(operation.completedAt)],
          ]),
        ],
      },
      {
        id: 'customer',
        title: 'Cliente e local',
        critical: true,
        components: [
          this.metadata('customer-metadata', [
            ['Razão/Nome', operation.customer.name],
            ['Nome fantasia', operation.customer.tradeName ?? '—'],
            ['Documento', operation.customer.cnpj ?? operation.customer.cpf ?? '—'],
            [
              'Contato',
              primaryContact
                ? `${primaryContact.name}${primaryContact.phone ? ` · ${primaryContact.phone}` : ''}`
                : '—',
            ],
            ['Endereço', address ? this.address(address) : '—'],
          ]),
        ],
      },
    ];

    if (operation.equipment) {
      sections.push({
        id: 'equipment',
        title: 'Equipamento',
        critical: true,
        components: [
          this.metadata('equipment-metadata', [
            ['Nome', operation.equipment.name],
            ['Tag', operation.equipment.tag ?? '—'],
            ['Tipo', operation.equipment.type],
            ['Fabricante', operation.equipment.manufacturer ?? '—'],
            ['Modelo', operation.equipment.model ?? '—'],
            ['Nº de série', operation.equipment.serialNumber ?? '—'],
            ['QR Code', operation.equipment.qrCode],
          ]),
          {
            id: 'equipment-qr',
            kind: 'qrCode',
            label: 'QR do equipamento',
            value: operation.equipment.qrCode,
            keepTogether: true,
          },
        ],
      });
      if (operation.equipment.metrics.length > 0) {
        sections.push({
          id: 'equipment-metrics',
          title: 'Métricas recentes',
          components: [
            {
              id: 'metrics-table',
              kind: 'table',
              columns: [
                { key: 'key', label: 'Métrica', width: 0.34 },
                { key: 'value', label: 'Valor', width: 0.22 },
                { key: 'unit', label: 'Unidade', width: 0.14 },
                { key: 'recordedAt', label: 'Registro', width: 0.3 },
              ],
              rows: operation.equipment.metrics.map((metric) => ({
                key: this.clean(metric.key),
                value: String(metric.value),
                unit: this.clean(metric.unit),
                recordedAt: this.date(metric.recordedAt),
              })),
            },
          ],
        });
      }
    }

    sections.push({
      id: 'checklist',
      title: 'Checklist',
      components: [{ id: 'operation-checklist', kind: 'checklist', items: checklist }],
    });

    if (operation.observations) {
      sections.push({
        id: 'observations',
        title: 'Observações',
        components: [
          {
            id: 'operation-observations',
            kind: 'observation',
            text: this.clean(operation.observations),
          },
        ],
      });
    }

    if (operation.photos.length > 0) {
      sections.push({
        id: 'photos',
        title: 'Fotos',
        components: operation.photos.map((photo) => ({
          id: `photo-${photo.id}`,
          kind: 'image',
          sourceId: photo.id,
          caption: photo.caption ? this.clean(photo.caption) : null,
          mimeType: photo.mimeType,
          fileSize: photo.fileSize,
          keepTogether: true,
        })),
      });
    }

    sections.push({
      id: 'related-documents',
      title: 'Documentos relacionados',
      components: [
        {
          id: 'related-documents-list',
          kind: 'list',
          items: operation.documents
            .map((doc) => `${doc.number} · ${doc.type} · ${doc.status}`)
            .map((item) => this.clean(item)),
        },
      ],
    });

    sections.push({
      id: 'signature',
      title: 'Assinatura',
      critical: true,
      components: [
        {
          id: 'signature-placeholder',
          kind: 'signaturePlaceholder',
          label: signature.label,
          strategy: signature.strategy,
          signedAt: operation.signedAt?.toISOString() ?? signature.signedAt,
          keepTogether: true,
        },
      ],
    });

    return sections;
  }

  private metadata(id: string, entries: Array<[string, string]>): DocumentBlueprintComponent {
    return {
      id,
      kind: 'metadata',
      items: entries.map(([label, value]) => ({
        label: this.clean(label),
        value: this.clean(value),
      })),
      keepTogether: true,
    };
  }

  private checklist(value: Prisma.JsonValue): ChecklistItem[] {
    if (!Array.isArray(value)) return [];
    return value.slice(0, DOCUMENT_MAX_TABLE_ROWS).map((item, index) => {
      const record =
        item && typeof item === 'object' && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};
      return {
        label: this.clean(typeof record.label === 'string' ? record.label : `Item ${index + 1}`),
        done: Boolean(record.done),
        note:
          typeof record.note === 'string' && record.note.trim() ? this.clean(record.note) : null,
      };
    });
  }

  private address(address: {
    name?: string | null;
    street: string;
    number: string;
    district: string;
    city: string;
    state: string;
  }): string {
    return this.clean(
      [
        address.name,
        `${address.street}, ${address.number}`,
        address.district,
        `${address.city}/${address.state}`,
      ]
        .filter(Boolean)
        .join(' · '),
    );
  }

  private date(value: Date | string | null): string {
    if (!value) return '—';
    return new Date(value).toISOString();
  }

  private titleFor(type: DocumentTemplateType): string {
    const titles: Record<DocumentTemplateType, string> = {
      QUOTE: 'Orçamento',
      WORK_ORDER: 'Ordem de Serviço',
      RECEIPT: 'Recibo',
      REPORT: 'Relatório',
      TECHNICAL_REPORT: 'Relatório Técnico',
      PMOC: 'PMOC',
    };
    return titles[type];
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
      .trim()
      .slice(0, 5000);
  }

  private assertBlueprintLimits(sections: DocumentSection[]): void {
    const components = sections.flatMap((section) => section.components);
    const tableRows = components
      .filter(
        (component): component is Extract<DocumentBlueprintComponent, { kind: 'table' }> =>
          component.kind === 'table',
      )
      .reduce((total, table) => total + table.rows.length, 0);
    if (
      sections.length > DOCUMENT_MAX_SECTIONS ||
      components.length > DOCUMENT_MAX_COMPONENTS ||
      tableRows > DOCUMENT_MAX_TABLE_ROWS
    ) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_SIZE_LIMIT_EXCEEDED,
        'Document blueprint exceeds production limits',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
