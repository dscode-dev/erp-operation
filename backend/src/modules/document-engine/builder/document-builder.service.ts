import { HttpStatus, Injectable } from '@nestjs/common';
import { DocumentTemplateType, Prisma, SignatureMode } from '@prisma/client';
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
import type {
  DocumentBlueprint,
  DocumentBlueprintComponent,
  DocumentSection,
} from '../blueprint/document-blueprint.types';
import {
  DocumentContextService,
  type BudgetContext,
  type DocumentBuildContext,
  type DocumentContext,
  type TemplatePreviewContext,
} from '../context/document-context.service';

type ChecklistItem = { label: string; done: boolean; note: string | null };

@Injectable()
export class DocumentBuilderService {
  constructor(private readonly context: DocumentContextService) {}

  async buildFromOperation(
    operationId: string,
    type: DocumentTemplateType,
  ): Promise<DocumentBlueprint> {
    const context = await this.context.create(operationId, type);
    return this.buildFromContext(context);
  }

  async buildFromTemplate(templateId: string): Promise<DocumentBlueprint> {
    const context = await this.context.buildTemplatePreviewContext(templateId);
    return this.buildFromContext(context);
  }

  async buildBudget(budgetId: string): Promise<DocumentBlueprint> {
    const context = await this.context.buildBudgetContext(budgetId);
    return this.buildFromContext(context);
  }

  private buildFromContext(context: DocumentBuildContext): DocumentBlueprint {
    if (context.kind === 'templatePreview') {
      return this.buildTemplatePreviewBlueprint(context);
    }
    if (context.kind === 'budget') {
      return this.buildBudgetBlueprint(context);
    }
    return this.buildOperationBlueprint(context);
  }

  private buildOperationBlueprint(context: DocumentContext): DocumentBlueprint {
    const { operation, configuration } = context;
    const { organization, settings } = configuration;
    const { type } = configuration;

    const document = operation.documents.find((item) => item.type === type) ?? {
      id: null,
      number: formatDocumentNumber(OPERATION_DOCUMENT_PREFIX[type], operation.number),
    };

    const generatedAt = new Date().toISOString();
    const sections = this.sections(context);
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

  private buildTemplatePreviewBlueprint(context: TemplatePreviewContext): DocumentBlueprint {
    const { configuration, template, placeholders } = context;
    const { organization, settings } = configuration;
    const generatedAt = placeholders.generatedAt;
    const sections = this.templatePreviewSections(context);
    this.assertBlueprintLimits(sections);

    return {
      version: '1.0',
      metadata: {
        operationId: template.id,
        documentId: null,
        documentType: template.type,
        documentNumber: placeholders.documentNumber,
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
        title: this.clean(template.name || this.titleFor(template.type)),
        subtitle: 'Pré-visualização de modelo',
        organizationName: this.clean(organization.tradeName || organization.legalName),
        documentNumber: placeholders.documentNumber,
      },
      footer: {
        content: this.clean(template.footerContent || `Modelo gerado por ${organization.tradeName}`),
        generatedAt,
      },
      sections,
    };
  }

  private buildBudgetBlueprint(context: BudgetContext): DocumentBlueprint {
    const { budget, configuration } = context;
    const { organization, settings } = configuration;
    const generatedAt = new Date().toISOString();
    const number = budget.document?.number ?? `ORC-${String(budget.number).padStart(6, '0')}`;
    const sections = this.budgetSections(context);
    this.assertBlueprintLimits(sections);

    return {
      version: '1.0',
      metadata: {
        operationId: budget.operationId ?? budget.id,
        documentId: budget.document?.id ?? null,
        documentType: DocumentTemplateType.BUDGET,
        documentNumber: number,
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
        title: 'Orçamento',
        subtitle: budget.operation ? `Operação ${String(budget.operation.number).padStart(6, '0')}` : budget.title,
        organizationName: this.clean(organization.tradeName || organization.legalName),
        documentNumber: number,
      },
      footer: {
        content: this.clean(context.template?.footerContent || `Gerado por ${organization.tradeName} · ${organization.email}`),
        generatedAt,
      },
      sections,
    };
  }

  private sections(context: DocumentContext): DocumentSection[] {
    const { operation } = context;
    const checklist = this.checklist(operation.checklist);
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

    const signature = this.signatureComponent(context);
    if (signature) {
      sections.push({
        id: 'signature',
        title: 'Assinatura',
        critical: true,
        components: [signature],
      });
    }

    return sections;
  }

  private templatePreviewSections(context: TemplatePreviewContext): DocumentSection[] {
    const { template, placeholders } = context;
    const sections: DocumentSection[] = [
      {
        id: 'template-summary',
        title: 'Resumo do modelo',
        critical: true,
        components: [
          this.metadata('template-metadata', [
            ['Nome', template.name],
            ['Tipo', template.type],
            ['Status', template.isActive ? 'Ativo' : 'Inativo'],
            ['Template padrão', template.isDefault ? 'Sim' : 'Não'],
            ['Assinatura obrigatória', template.requiresSignature ? 'Sim' : 'Não'],
            ['Modo de assinatura', template.signatureMode],
            ['Atualizado em', this.date(template.updatedAt)],
          ]),
        ],
      },
      {
        id: 'template-content',
        title: 'Conteúdo configurado',
        critical: true,
        components: [
          {
            id: 'template-header-content',
            kind: 'paragraph',
            text: this.clean(template.headerContent || 'Cabeçalho não configurado.'),
            keepTogether: true,
          },
          {
            id: 'template-footer-content',
            kind: 'paragraph',
            text: this.clean(template.footerContent || 'Rodapé não configurado.'),
            keepTogether: true,
          },
          {
            id: 'template-observations',
            kind: 'observation',
            text: this.clean(template.observations || 'Sem observações.'),
            keepTogether: true,
          },
        ],
      },
      {
        id: 'official-placeholders',
        title: 'Placeholders oficiais',
        components: [
          {
            id: 'placeholder-table',
            kind: 'table',
            keepTogether: true,
            columns: [
              { key: 'field', label: 'Campo', width: 0.38 },
              { key: 'value', label: 'Valor de preview', width: 0.62 },
            ],
            rows: [
              { field: 'Cliente', value: placeholders.customerName },
              { field: 'Equipamento', value: placeholders.equipmentName },
              { field: 'Operador', value: placeholders.operatorName },
              { field: 'Número do documento', value: placeholders.documentNumber },
              { field: 'Data de geração', value: generatedDate(placeholders.generatedAt) },
            ].map((row) => ({
              field: this.clean(row.field),
              value: this.clean(row.value),
            })),
          },
        ],
      },
    ];

    const signature = this.signatureComponent(context);
    if (signature) {
      sections.push({
        id: 'signature',
        title: 'Assinatura',
        critical: true,
        components: [signature],
      });
    }
    return sections;
  }

  private budgetSections(context: BudgetContext): DocumentSection[] {
    const { budget, template } = context;
    const address = budget.customerAddress ?? budget.customer.addresses[0] ?? null;
    const primaryContact = budget.customer.contacts[0] ?? null;
    const sections: DocumentSection[] = [
      {
        id: 'budget-summary',
        title: 'Resumo do orçamento',
        critical: true,
        components: [
          this.metadata('budget-metadata', [
            ['Número', `ORC-${String(budget.number).padStart(6, '0')}`],
            ['Título', budget.title],
            ['Status', budget.status],
            ['Validade', this.date(budget.expirationDate)],
            ['Responsável', budget.creator.name],
            ['Criado em', this.date(budget.createdAt)],
          ]),
        ],
      },
      {
        id: 'budget-customer',
        title: 'Cliente e local',
        critical: true,
        components: [
          this.metadata('budget-customer-metadata', [
            ['Razão/Nome', budget.customer.name],
            ['Nome fantasia', budget.customer.tradeName ?? '—'],
            ['Documento', budget.customer.cnpj ?? budget.customer.cpf ?? '—'],
            [
              'Contato',
              primaryContact
                ? `${primaryContact.name}${primaryContact.phone ? ` · ${primaryContact.phone}` : ''}`
                : budget.customer.phone ?? '—',
            ],
            ['Endereço', address ? this.address(address) : '—'],
          ]),
        ],
      },
    ];

    if (budget.equipment) {
      sections.push({
        id: 'budget-equipment',
        title: 'Equipamento',
        critical: true,
        components: [
          this.metadata('budget-equipment-metadata', [
            ['Nome', budget.equipment.name],
            ['Tag', budget.equipment.tag ?? '—'],
            ['Tipo', budget.equipment.type],
            ['Fabricante', budget.equipment.manufacturer ?? '—'],
            ['Modelo', budget.equipment.model ?? '—'],
            ['Nº de série', budget.equipment.serialNumber ?? '—'],
            ['QR Code', budget.equipment.qrCode],
          ]),
        ],
      });
    }

    if (template?.headerContent) {
      sections.push({
        id: 'budget-template-header',
        title: 'Cabeçalho',
        components: [{ id: 'budget-header-content', kind: 'paragraph', text: this.clean(template.headerContent) }],
      });
    }

    sections.push({
      id: 'budget-items',
      title: 'Itens do orçamento',
      critical: true,
      components: [
        {
          id: 'budget-items-table',
          kind: 'table',
          columns: [
            { key: 'item', label: 'Item', width: 0.34 },
            { key: 'quantity', label: 'Qtd.', width: 0.12 },
            { key: 'unit', label: 'Un.', width: 0.1 },
            { key: 'unitPrice', label: 'Valor un.', width: 0.18 },
            { key: 'margin', label: 'Margem', width: 0.12 },
            { key: 'total', label: 'Total', width: 0.14 },
          ],
          rows: budget.items.map((item) => ({
            item: this.clean(item.description || item.product.name),
            quantity: this.decimal(item.quantity),
            unit: this.clean(item.unit),
            unitPrice: this.money(item.snapshotSalePrice),
            margin: `${this.decimal(item.snapshotMargin)}%`,
            total: this.money(item.total),
          })),
        },
      ],
    });

    sections.push({
      id: 'budget-totals',
      title: 'Totais',
      critical: true,
      components: [
        this.metadata('budget-totals-metadata', [
          ['Subtotal', this.money(budget.subtotal)],
          ['Desconto', this.money(budget.discount)],
          ['Adicional', this.money(budget.additional)],
          ['Total', this.money(budget.total)],
        ]),
      ],
    });

    if (budget.description || budget.observations || template?.observations) {
      sections.push({
        id: 'budget-observations',
        title: 'Observações',
        components: [
          {
            id: 'budget-observations-content',
            kind: 'observation',
            text: this.clean([budget.description, budget.observations, template?.observations].filter(Boolean).join('\n')),
            keepTogether: true,
          },
        ],
      });
    }

    const signature = this.signatureComponent(context);
    if (signature) {
      sections.push({
        id: 'signature',
        title: 'Assinatura',
        critical: true,
        components: [signature],
      });
    }

    return sections;
  }

  private signatureComponent(context: DocumentBuildContext): DocumentBlueprintComponent | null {
    const { signature } = context;
    if (!signature.requiresSignature || signature.signatureMode === SignatureMode.NONE) return null;

    const signatures: Extract<DocumentBlueprintComponent, { kind: 'signature' }>['signatures'] = [];
    if (signature.fixedSignature) {
      signatures.push({
        id: signature.fixedSignature.id,
        role: 'fixed',
        label: 'Assinatura fixa',
        name: this.clean(signature.fixedSignature.name),
        title: this.clean(signature.fixedSignature.title),
        signedAt: null,
        caption: 'Assinatura cadastrada',
        image: {
          mimeType: signature.fixedSignature.image.mimeType,
          fileSize: signature.fixedSignature.image.fileSize,
          contentBase64: signature.fixedSignature.image.contentBase64,
        },
      });
    }
    if (signature.collectedSignature) {
      signatures.push({
        id: 'collected-signature',
        role: 'collected',
        label: signature.collectedSignature.label,
        name: null,
        title: null,
        signedAt: signature.collectedSignature.signedAt,
        caption: 'Assinatura coletada em campo',
        image: null,
      });
    }

    return {
      id: 'document-signature',
      kind: 'signature',
      mode: signature.signatureMode,
      signatures,
      keepTogether: true,
    };
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

  private decimal(value: Prisma.Decimal | number | string): string {
    return Number(value).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    });
  }

  private money(value: Prisma.Decimal | number | string): string {
    return Number(value).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  private titleFor(type: DocumentTemplateType): string {
    const titles: Record<DocumentTemplateType, string> = {
      BUDGET: 'Orçamento',
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

function generatedDate(value: string): string {
  return new Date(value).toISOString();
}
