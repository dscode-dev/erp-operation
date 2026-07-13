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
  DocumentVisualStyle,
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
    const sections = this.sections(context, generatedAt, document.number);
    this.assertBlueprintLimits(sections);

    return {
      version: '1.0',
      metadata: {
        operationId: operation.id,
        documentId: document.id,
        documentType: type,
        documentNumber: document.number,
        sourceKind: 'operation',
        sourceId: operation.id,
        templateId: context.template?.id ?? null,
        templateUpdatedAt: context.template?.updatedAt
          ? new Date(context.template.updatedAt).toISOString()
          : null,
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
          website: this.clean(organization.website ?? ''),
          address: this.organizationAddress(organization),
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
        logo: context.assets.logo
          ? {
              mimeType: context.assets.logo.mimeType,
              fileSize: context.assets.logo.fileSize,
              contentBase64: context.assets.logo.contentBase64,
            }
          : null,
      },
      footer: {
        content: this.clean(
          `${organization.tradeName || organization.legalName} · ${this.organizationAddress(organization)} · ${organization.phone} · ${organization.email}${organization.website ? ` · ${organization.website}` : ''} · ${document.number}`,
        ),
        generatedAt,
      },
      visualStyle: this.visualStyle(organization.primaryColor),
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
        operationId: null,
        documentId: null,
        documentType: template.type,
        documentNumber: placeholders.documentNumber,
        sourceKind: 'template',
        sourceId: template.id,
        templateId: template.id,
        templateUpdatedAt: new Date(template.updatedAt).toISOString(),
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
          website: this.clean(organization.website ?? ''),
          address: this.organizationAddress(organization),
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
        logo: context.assets.logo
          ? {
              mimeType: context.assets.logo.mimeType,
              fileSize: context.assets.logo.fileSize,
              contentBase64: context.assets.logo.contentBase64,
            }
          : null,
      },
      footer: {
        content: this.clean(
          template.footerContent || `Modelo gerado por ${organization.tradeName}`,
        ),
        generatedAt,
      },
      visualStyle: this.visualStyle(organization.primaryColor),
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
        budgetId: budget.id,
        documentId: budget.document?.id ?? null,
        documentType: DocumentTemplateType.BUDGET,
        documentNumber: number,
        sourceKind: 'budget',
        sourceId: budget.id,
        templateId: context.template?.id ?? null,
        templateUpdatedAt: context.template?.updatedAt
          ? new Date(context.template.updatedAt).toISOString()
          : null,
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
          website: this.clean(organization.website ?? ''),
          address: this.organizationAddress(organization),
          city: this.clean(organization.city),
          state: this.clean(organization.state),
          primaryColor: organization.primaryColor,
          secondaryColor: organization.secondaryColor,
        },
      },
      header: {
        title: 'Orçamento',
        subtitle: budget.operation
          ? `Operação ${String(budget.operation.number).padStart(6, '0')}`
          : budget.title,
        organizationName: this.clean(organization.tradeName || organization.legalName),
        documentNumber: number,
        logo: context.assets.logo
          ? {
              mimeType: context.assets.logo.mimeType,
              fileSize: context.assets.logo.fileSize,
              contentBase64: context.assets.logo.contentBase64,
            }
          : null,
      },
      footer: {
        content: this.clean(
          context.template?.footerContent ||
            `Gerado por ${organization.tradeName} · ${organization.email}`,
        ),
        generatedAt,
      },
      visualStyle: this.visualStyle(organization.primaryColor),
      sections,
    };
  }

  private sections(
    context: DocumentContext,
    generatedAt: string,
    documentNumber: string,
  ): DocumentSection[] {
    const sections =
      context.configuration.type === DocumentTemplateType.WORK_ORDER
        ? this.workOrderSections(context, generatedAt, documentNumber)
        : context.configuration.type === DocumentTemplateType.TECHNICAL_REPORT
          ? this.visitReportSections(context, generatedAt, documentNumber)
          : this.sharedIdentitySections(context);

    switch (context.configuration.type) {
      case DocumentTemplateType.WORK_ORDER:
        break;
      case DocumentTemplateType.TECHNICAL_REPORT:
        break;
      case DocumentTemplateType.REPORT:
        sections.push(...this.legacyReportSections(context));
        break;
      case DocumentTemplateType.TECHNICAL_OPINION:
        sections.push(...this.technicalOpinionSections(context));
        break;
      case DocumentTemplateType.PMOC:
        sections.push(...this.pmocReportSections(context));
        break;
      case DocumentTemplateType.RECEIPT:
        sections.push(...this.receiptSections(context));
        break;
      case DocumentTemplateType.QUOTE:
        sections.push(...this.operationQuoteSections(context));
        break;
      case DocumentTemplateType.BUDGET:
        sections.push(...this.executionReportSections(context));
        break;
    }

    sections.push(...this.evidenceAndRelatedSections(context));

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

  private sharedIdentitySections(context: DocumentContext): DocumentSection[] {
    const { operation } = context;
    const address = operation.address ?? operation.customer.addresses[0] ?? null;
    const primaryContact = operation.customer.contacts[0] ?? null;
    const sections: DocumentSection[] = [
      {
        id: 'document-purpose',
        title: this.purposeTitle(context.configuration.type),
        critical: true,
        components: [
          this.metadata('document-purpose-metadata', [
            ['Documento', this.titleFor(context.configuration.type)],
            ['Operação', String(operation.number).padStart(6, '0')],
            ['Tipo da operação', operation.type],
            ['Status operacional', operation.status],
            ['Agendado para', this.date(operation.scheduledFor)],
            ['Conclusão', this.date(operation.completedAt)],
          ]),
        ],
      },
      {
        id: 'customer-location',
        title: 'Cliente e local de atendimento',
        critical: true,
        components: [
          this.metadata('customer-metadata', [
            ['Cliente', operation.customer.tradeName ?? operation.customer.name],
            ['Razão/Nome', operation.customer.name],
            ['Documento', operation.customer.cnpj ?? operation.customer.cpf ?? '—'],
            [
              'Contato',
              primaryContact
                ? `${primaryContact.name}${primaryContact.phone ? ` · ${primaryContact.phone}` : ''}`
                : (operation.customer.phone ?? '—'),
            ],
            ['Endereço', address ? this.address(address) : '—'],
          ]),
        ],
      },
    ];

    if (operation.equipment) sections.push(this.equipmentSection(context));
    return sections;
  }

  private workOrderSections(
    context: DocumentContext,
    generatedAt: string,
    documentNumber: string,
  ): DocumentSection[] {
    const { operation } = context;
    const address = operation.address ?? operation.customer.addresses[0] ?? null;
    const contact = operation.customer.contacts[0] ?? null;
    const serviceItems = this.lines(operation.serviceDescription);
    return [
      {
        id: 'work-order-identification',
        title: 'Identificação da ordem de serviço',
        critical: true,
        components: [
          this.metadata('work-order-identification-metadata', [
            ['Número', documentNumber],
            ['Data de emissão', this.date(generatedAt)],
            ['Data de criação', this.date(operation.createdAt)],
            ['Data do agendamento', this.date(operation.scheduledFor)],
            ['Status', operation.status],
            ['Responsável', operation.assignment?.assignee.name ?? operation.operator.name],
            ['Operador', operation.operator.name],
          ]),
        ],
      },
      {
        id: 'work-order-customer',
        title: 'Cliente',
        critical: true,
        components: [
          this.metadata('work-order-customer-metadata', [
            ['Cliente', operation.customer.tradeName ?? operation.customer.name],
            ['Razão/Nome', operation.customer.name],
            ['Documento', operation.customer.cnpj ?? operation.customer.cpf ?? '—'],
            [
              'Contato',
              contact
                ? `${contact.name}${contact.phone ? ` · ${contact.phone}` : ''}`
                : (operation.customer.phone ?? '—'),
            ],
            ['Endereço', address ? this.address(address) : '—'],
          ]),
        ],
      },
      operation.equipment ? { ...this.equipmentSection(context), pageBreakAfter: true } : null,
      {
        id: 'work-order-reported-issue',
        title: 'Defeito ou solicitação informada',
        components: [
          {
            id: 'work-order-reported-issue-text',
            kind: 'observation',
            text: this.clean(operation.reportedIssue || 'Não informado.'),
            keepTogether: true,
          },
        ],
      },
      {
        id: 'work-order-services',
        title: 'Serviços executados',
        components:
          serviceItems.length > 1
            ? [{ id: 'work-order-services-list', kind: 'list', items: serviceItems }]
            : [
                {
                  id: 'work-order-services-text',
                  kind: 'paragraph',
                  text: this.clean(
                    operation.serviceDescription ||
                      'A execução deve ser detalhada no checklist e nos registros operacionais.',
                  ),
                  keepTogether: true,
                },
              ],
      },
      this.checklistSection(operation, 'Checklist da execução'),
      this.materialsSection(operation),
      this.observationSection(operation, 'Observações e resultado operacional'),
    ].filter((section): section is DocumentSection => Boolean(section));
  }

  private visitReportSections(
    context: DocumentContext,
    generatedAt: string,
    documentNumber: string,
  ): DocumentSection[] {
    const { operation } = context;
    const address = operation.address ?? operation.customer.addresses[0] ?? null;
    const contact = operation.customer.contacts[0] ?? null;
    const sections: DocumentSection[] = [
      {
        id: 'technical-report-identification',
        title: 'Identificação do relatório',
        critical: true,
        components: [
          this.metadata('technical-report-identification-metadata', [
            ['Número', documentNumber],
            ['Emissão', this.date(generatedAt)],
            ['Responsável', operation.assignment?.assignee.name ?? operation.operator.name],
            [
              'Função',
              operation.assignment?.assignee.jobTitle ?? operation.operator.jobTitle ?? '—',
            ],
            ['Situação', operation.status],
            ['Referência operacional', `OP-${String(operation.number).padStart(6, '0')}`],
          ]),
        ],
      },
      {
        id: 'technical-report-customer',
        title: 'Cliente',
        critical: true,
        components: [
          this.metadata('technical-report-customer-metadata', [
            ['Cliente', operation.customer.tradeName ?? operation.customer.name],
            ['Razão/Nome', operation.customer.name],
            ['Documento', operation.customer.cnpj ?? operation.customer.cpf ?? '—'],
            [
              'Contato',
              contact
                ? `${contact.name}${contact.phone ? ` · ${contact.phone}` : ''}`
                : (operation.customer.phone ?? '—'),
            ],
          ]),
        ],
      },
      {
        id: 'technical-report-location',
        title: 'Local da visita',
        critical: true,
        components: [
          this.metadata('technical-report-location-metadata', [
            ['Local', address?.name ?? 'Local principal do cliente'],
            ['Endereço', address ? this.address(address) : '—'],
            ['Agendamento', this.date(operation.scheduledFor)],
            ['Início', this.date(operation.startedAt)],
            ['Conclusão', this.date(operation.completedAt)],
            ['Operador em campo', operation.operator.name],
          ]),
        ],
      },
      ...(operation.equipment ? this.technicalReportEquipmentSections(context) : []),
      {
        id: 'visit-objective',
        title: 'Objetivo da visita',
        critical: true,
        components: this.technicalNarrative(
          'visit-objective',
          operation.reportedIssue,
          'Objetivo não informado.',
        ),
      },
      {
        id: 'visit-diagnosis',
        title: 'Diagnóstico ou situação encontrada',
        critical: true,
        components: this.technicalNarrative(
          'visit-diagnosis',
          operation.technicalDiagnosis,
          'Diagnóstico técnico não registrado.',
        ),
      },
      {
        id: 'visit-activities',
        title: 'Atividades executadas',
        components: this.technicalNarrative(
          'visit-activities',
          operation.serviceDescription,
          'Atividades executadas não registradas.',
        ),
      },
      this.checklistSection(operation, 'Checklist complementar'),
      {
        id: 'visit-recommendations',
        title: 'Recomendações técnicas',
        components: this.technicalNarrative(
          'visit-recommendations',
          operation.technicalRecommendations,
          'Não foram registradas recomendações técnicas.',
        ),
      },
      this.materialsSection(operation),
      ...(operation.photos.length > 0
        ? [this.photosSection(context, 'Evidências fotográficas')]
        : []),
      this.observationSection(operation, 'Observações finais'),
    ].filter((section): section is DocumentSection => Boolean(section));
    return sections;
  }

  private executionReportSections(context: DocumentContext): DocumentSection[] {
    const { operation } = context;
    return [
      {
        id: 'execution-timeline',
        title: 'Linha de execução',
        critical: true,
        components: [
          this.metadata('execution-timeline-metadata', [
            ['Atribuído para', operation.assignment?.assignee.name ?? operation.operator.name],
            ['Atribuído por', operation.assignment?.assigner.name ?? '—'],
            ['Aceito em', this.date(operation.assignment?.acceptedAt ?? null)],
            [
              'Iniciado em',
              this.date(operation.startedAt ?? operation.assignment?.startedAt ?? null),
            ],
            [
              'Concluído em',
              this.date(operation.completedAt ?? operation.assignment?.completedAt ?? null),
            ],
          ]),
        ],
      },
      this.assignmentHistorySection(operation),
      this.checklistSection(operation, 'Atividades executadas'),
      this.materialsSection(operation),
      this.observationSection(operation, 'Resultado operacional'),
    ].filter((section): section is DocumentSection => Boolean(section));
  }

  private legacyReportSections(context: DocumentContext): DocumentSection[] {
    return [
      {
        id: 'legacy-report-compatibility',
        title: 'Relatório legado',
        critical: true,
        components: [
          {
            id: 'legacy-report-note',
            kind: 'observation',
            text: this.clean(
              'Documento REPORT preservado para compatibilidade histórica. Novas emissões analíticas devem usar Laudo Técnico (TECHNICAL_OPINION).',
            ),
            keepTogether: true,
          },
        ],
      },
      ...this.executionReportSections(context),
    ];
  }

  private technicalOpinionSections(context: DocumentContext): DocumentSection[] {
    const { operation } = context;
    return [
      {
        id: 'technical-opinion-object',
        title: 'Objeto da avaliação técnica',
        critical: true,
        components: [
          this.metadata('technical-opinion-object-metadata', [
            ['Operação analisada', String(operation.number).padStart(6, '0')],
            ['Cliente', operation.customer.tradeName ?? operation.customer.name],
            ['Equipamento avaliado', operation.equipment?.name ?? '—'],
            ['Responsável pela inspeção', operation.operator.name],
            [
              'Período observado',
              `${this.date(operation.startedAt)} → ${this.date(operation.completedAt)}`,
            ],
          ]),
        ],
      },
      {
        id: 'technical-opinion-findings',
        title: 'Diagnóstico',
        components: [
          {
            id: 'technical-opinion-findings-text',
            kind: 'observation',
            text: this.clean(operation.reportedIssue || 'Diagnóstico técnico não registrado.'),
            keepTogether: true,
          },
        ],
      },
      this.checklistSection(operation, 'Evidências e verificações consideradas'),
      this.materialsSection(operation),
      {
        id: 'technical-opinion-analysis',
        title: 'Análise técnica',
        components: [
          {
            id: 'technical-opinion-analysis-text',
            kind: 'paragraph',
            text: this.clean(
              operation.serviceDescription ||
                'Análise baseada nos dados registrados na Operation, checklist, materiais e evidências anexadas.',
            ),
            keepTogether: true,
          },
        ],
      },
      {
        id: 'technical-opinion-conclusion',
        title: 'Conclusão',
        critical: true,
        components: [
          {
            id: 'technical-opinion-conclusion-text',
            kind: 'observation',
            text: this.clean(
              operation.observations ||
                (operation.status === 'COMPLETED'
                  ? 'Atendimento concluído conforme registros operacionais disponíveis.'
                  : `Operation em status ${operation.status}; conclusão técnica definitiva não registrada.`),
            ),
            keepTogether: true,
          },
        ],
      },
    ].filter((section): section is DocumentSection => Boolean(section));
  }

  private pmocReportSections(context: DocumentContext): DocumentSection[] {
    const { operation } = context;
    const pmoc = operation.maintenanceExecution?.plan.pmocPlan ?? null;
    const sections: DocumentSection[] = [
      {
        id: 'pmoc-compliance-context',
        title: 'Contexto PMOC disponível',
        critical: true,
        components: [
          this.metadata('pmoc-context-metadata', [
            ['Plano PMOC', pmoc ? pmoc.id : 'PMOC não vinculado à execução'],
            ['Responsável técnico', pmoc?.responsibleTechnician ?? '—'],
            ['Contrato', pmoc?.contractNumber ?? '—'],
            ['ART', pmoc?.artNumber ?? '—'],
            ['Vigência inicial', this.date(pmoc?.startDate ?? null)],
            ['Vigência final', this.date(pmoc?.endDate ?? null)],
            ['Status do plano', pmoc ? (pmoc.active ? 'Ativo' : 'Inativo') : '—'],
          ]),
        ],
      },
      this.maintenanceSection(operation),
      this.pmocEnvironmentsSection(operation),
      ...(operation.serviceDescription
        ? [
            {
              id: 'pmoc-measurements',
              title: 'Medições',
              components: [
                {
                  id: 'pmoc-measurements-text',
                  kind: 'observation' as const,
                  text: this.clean(operation.serviceDescription),
                  keepTogether: true,
                },
              ],
            },
          ]
        : []),
      this.checklistSection(operation, 'Execução PMOC registrada'),
      this.observationSection(operation, 'Pendências e conclusão'),
    ].filter((section): section is DocumentSection => Boolean(section));
    return sections;
  }

  private receiptSections(context: DocumentContext): DocumentSection[] {
    const { operation } = context;
    return [
      {
        id: 'receipt-confirmation',
        title: 'Confirmação de atendimento',
        critical: true,
        components: [
          this.metadata('receipt-confirmation-metadata', [
            ['Cliente', operation.customer.tradeName ?? operation.customer.name],
            ['Operação', String(operation.number).padStart(6, '0')],
            ['Operador', operation.operator.name],
            ['Concluído em', this.date(operation.completedAt)],
            ['Assinado em', this.date(operation.signedAt)],
            ['Status', operation.status],
          ]),
        ],
      },
      {
        id: 'receipt-reference',
        title: 'Referência e recebimento',
        critical: true,
        components: [
          this.metadata('receipt-reference-metadata', [
            ['Referência', operation.reportedIssue ?? '—'],
            ['Detalhes do recebimento', operation.serviceDescription ?? '—'],
          ]),
        ],
      },
      this.materialsSection(operation),
      this.observationSection(operation, 'Observações do recibo'),
    ].filter((section): section is DocumentSection => Boolean(section));
  }

  private operationQuoteSections(context: DocumentContext): DocumentSection[] {
    const { operation } = context;
    return [
      {
        id: 'quote-origin',
        title: 'Origem do orçamento operacional',
        critical: true,
        components: [
          this.metadata('quote-origin-metadata', [
            ['Operação de origem', String(operation.number).padStart(6, '0')],
            ['Cliente', operation.customer.tradeName ?? operation.customer.name],
            ['Equipamento', operation.equipment?.name ?? '—'],
            ['Observação', 'Valores comerciais oficiais devem ser emitidos pelo domínio Budget.'],
          ]),
        ],
      },
      this.observationSection(operation, 'Necessidade identificada'),
    ].filter((section): section is DocumentSection => Boolean(section));
  }

  private evidenceAndRelatedSections(context: DocumentContext): DocumentSection[] {
    const { operation } = context;
    const sections: DocumentSection[] = [];
    if (
      context.configuration.type !== DocumentTemplateType.TECHNICAL_REPORT &&
      operation.photos.length > 0
    ) {
      sections.push(this.photosSection(context, 'Evidências fotográficas'));
    }
    const relatedDocuments = operation.documents.filter(
      (document) => document.type !== context.configuration.type,
    );
    if (relatedDocuments.length > 0) {
      sections.push({
        id: 'related-documents',
        title: 'Documentos relacionados',
        components: [
          {
            id: 'related-documents-list',
            kind: 'list',
            items: relatedDocuments
              .map((doc) => `${doc.number} · ${doc.type} · ${doc.status}`)
              .map((item) => this.clean(item)),
          },
        ],
      });
    }
    return sections;
  }

  private equipmentSection(context: DocumentContext): DocumentSection {
    const { operation } = context;
    const equipment = operation.equipment;
    if (!equipment) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_RENDER_FAILED,
        'Equipment section requested without equipment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    const qrCode = context.assets.qrCode;
    if (!qrCode) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_RENDER_FAILED,
        'Equipment QR image could not be resolved',
        HttpStatus.CONFLICT,
      );
    }
    return {
      id: 'equipment',
      title: 'Equipamento',
      critical: true,
      components: [
        this.metadata('equipment-metadata', [
          ['Nome', equipment.name],
          ['Tag', equipment.tag ?? '—'],
          ['Tipo', equipment.type],
          ['Fabricante', equipment.manufacturer ?? '—'],
          ['Modelo', equipment.model ?? '—'],
          ['Nº de série', equipment.serialNumber ?? '—'],
          ['QR Code', equipment.qrCode],
        ]),
        {
          id: 'equipment-qr',
          kind: 'qrCode',
          label: 'QR do equipamento',
          value: equipment.qrCode,
          image: {
            mimeType: 'image/png',
            fileSize: qrCode.fileSize,
            contentBase64: qrCode.contentBase64,
          },
          keepTogether: true,
        },
      ],
    };
  }

  private technicalReportEquipmentSections(context: DocumentContext): DocumentSection[] {
    const equipment = this.equipmentSection(context);
    return [
      {
        id: 'technical-report-equipment',
        title: 'Equipamento',
        critical: true,
        pageBreakAfter: true,
        components: equipment.components.filter((component) => component.kind === 'metadata'),
      },
      {
        id: 'technical-report-equipment-qr',
        title: 'Identificação digital do equipamento',
        components: equipment.components.filter((component) => component.kind === 'qrCode'),
      },
    ];
  }

  private checklistSection(
    operation: DocumentContext['operation'],
    title: string,
  ): DocumentSection {
    return {
      id: `checklist-${this.slug(title)}`,
      title,
      components: [
        {
          id: 'operation-checklist',
          kind: 'checklist',
          items: this.checklist(operation.checklist),
        },
      ],
    };
  }

  private observationSection(
    operation: DocumentContext['operation'],
    title: string,
  ): DocumentSection | null {
    if (!operation.observations) return null;
    return {
      id: `observations-${this.slug(title)}`,
      title,
      components: [
        {
          id: 'operation-observations',
          kind: 'observation',
          text: this.clean(operation.observations),
        },
      ],
    };
  }

  private materialsSection(operation: DocumentContext['operation']): DocumentSection | null {
    if (operation.parts.length === 0) return null;
    return {
      id: 'materials-consumed',
      title: 'Materiais utilizados',
      critical: true,
      components: [
        {
          id: 'materials-table',
          kind: 'table',
          columns: [
            { key: 'sku', label: 'SKU', width: 0.18 },
            { key: 'item', label: 'Material', width: 0.36 },
            { key: 'quantity', label: 'Qtd.', width: 0.14 },
            { key: 'location', label: 'Origem', width: 0.18 },
            { key: 'notes', label: 'Obs.', width: 0.14 },
          ],
          rows: operation.parts.map((part) => ({
            sku: this.clean(part.product.sku),
            item: this.clean(part.product.name),
            quantity: `${this.decimal(part.quantity)} ${this.clean(part.product.unit)}`,
            location: this.clean(part.inventoryItem.location ?? '—'),
            notes: this.clean(part.notes ?? '—'),
          })),
        },
      ],
    };
  }

  private assignmentHistorySection(
    operation: DocumentContext['operation'],
  ): DocumentSection | null {
    const history = operation.assignment?.history ?? [];
    if (history.length === 0) return null;
    return {
      id: 'assignment-history',
      title: 'Histórico da execução',
      components: [
        {
          id: 'assignment-history-table',
          kind: 'table',
          columns: [
            { key: 'date', label: 'Data', width: 0.24 },
            { key: 'event', label: 'Evento', width: 0.22 },
            { key: 'actor', label: 'Usuário', width: 0.24 },
            { key: 'status', label: 'Status', width: 0.16 },
            { key: 'notes', label: 'Notas', width: 0.14 },
          ],
          rows: history.map((item) => ({
            date: this.date(item.createdAt),
            event: this.clean(item.event),
            actor: this.clean(item.actor.name),
            status: this.clean(item.newStatus),
            notes: this.clean(item.notes ?? '—'),
          })),
        },
      ],
    };
  }

  private maintenanceSection(operation: DocumentContext['operation']): DocumentSection | null {
    const execution = operation.maintenanceExecution;
    if (!execution) return null;
    return {
      id: 'maintenance-execution',
      title: 'Planejamento de manutenção',
      critical: true,
      components: [
        this.metadata('maintenance-execution-metadata', [
          ['Plano', execution.plan.name],
          ['Tipo', execution.plan.type],
          ['Prioridade', execution.plan.priority],
          ['Execução prevista', this.date(execution.scheduledAt)],
          ['Execução realizada', this.date(execution.executedAt)],
          ['Status da execução', execution.status],
          ['Próxima execução', this.date(execution.plan.nextExecution)],
          ['Observações', execution.notes ?? execution.plan.description ?? '—'],
        ]),
      ],
    };
  }

  private pmocEnvironmentsSection(operation: DocumentContext['operation']): DocumentSection | null {
    const pmoc = operation.maintenanceExecution?.plan.pmocPlan ?? null;
    if (!pmoc || pmoc.environments.length === 0) return null;
    return {
      id: 'pmoc-environments',
      title: 'Ambientes monitorados',
      components: [
        {
          id: 'pmoc-environments-table',
          kind: 'table',
          columns: [
            { key: 'name', label: 'Ambiente', width: 0.3 },
            { key: 'area', label: 'Área', width: 0.16 },
            { key: 'occupancy', label: 'Ocupação', width: 0.16 },
            { key: 'equipments', label: 'Equipamentos', width: 0.38 },
          ],
          rows: pmoc.environments.map((environment) => ({
            name: this.clean(environment.name),
            area: this.clean(environment.area ?? '—'),
            occupancy: environment.occupancy != null ? String(environment.occupancy) : '—',
            equipments: this.clean(
              environment.equipments.map((item) => item.equipment.name).join(', ') || '—',
            ),
          })),
        },
      ],
    };
  }

  private photosSection(context: DocumentContext, title: string): DocumentSection {
    const { operation } = context;
    return {
      id: `photos-${this.slug(title)}`,
      title,
      components: operation.photos.map((photo) => ({
        id: `photo-${photo.id}`,
        kind: 'image',
        sourceId: photo.id,
        caption: photo.caption ? this.clean(photo.caption) : null,
        mimeType: photo.mimeType,
        fileSize: photo.fileSize,
        image: this.imageForPhoto(context, photo.id),
        keepTogether: true,
      })),
    };
  }

  private imageForPhoto(
    context: DocumentContext,
    photoId: string,
  ): { mimeType: string; fileSize: number; contentBase64: string } | null {
    const photo = context.operation.photos.find((item) => item.id === photoId);
    const resolved = photo
      ? context.assets.images.find((image) => image.storageKey === photo.storageKey)
      : null;
    return resolved
      ? {
          mimeType: resolved.mimeType,
          fileSize: resolved.fileSize,
          contentBase64: resolved.contentBase64,
        }
      : null;
  }

  private purposeTitle(type: DocumentTemplateType): string {
    const titles: Record<DocumentTemplateType, string> = {
      BUDGET: 'Finalidade do documento',
      QUOTE: 'Origem do orçamento operacional',
      WORK_ORDER: 'Ordem de serviço',
      RECEIPT: 'Recibo de atendimento',
      REPORT: 'Relatório legado',
      TECHNICAL_REPORT: 'Relatório de visita técnica',
      TECHNICAL_OPINION: 'Laudo técnico',
      PMOC: 'Relatório PMOC',
    };
    return titles[type];
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
                : (budget.customer.phone ?? '—'),
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
        components: [
          {
            id: 'budget-header-content',
            kind: 'paragraph',
            text: this.clean(template.headerContent),
          },
        ],
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
            text: this.clean(
              [budget.description, budget.observations, template?.observations]
                .filter(Boolean)
                .join('\n'),
            ),
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
    for (const institutional of signature.institutionalSignatures) {
      signatures.push({
        id: institutional.id,
        role: 'fixed',
        label: 'Responsável técnico',
        name: this.clean(institutional.name),
        title: this.clean(
          [institutional.title, institutional.professionalCouncil, institutional.department]
            .filter(Boolean)
            .join(' · '),
        ),
        signedAt: null,
        caption: 'Responsável técnico',
        image: {
          mimeType: institutional.image.mimeType,
          fileSize: institutional.image.fileSize,
          contentBase64: institutional.image.contentBase64,
        },
      });
    }
    for (const execution of signature.executionSignatures) {
      signatures.push({
        id: `execution-signature-${execution.role}`,
        role: 'collected',
        label: this.clean(execution.label),
        name: execution.name ? this.clean(execution.name) : null,
        title: execution.title ? this.clean(execution.title) : null,
        signedAt: execution.signedAt,
        caption: execution.caption ? this.clean(execution.caption) : 'Assinatura coletada em campo',
        image: execution.image
          ? {
              mimeType: execution.image.mimeType,
              fileSize: execution.image.fileSize,
              contentBase64: execution.image.contentBase64,
            }
          : null,
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

  private organizationAddress(organization: {
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    district?: string | null;
    city: string;
    state: string;
    zipCode?: string | null;
  }): string {
    return this.clean(
      [
        [organization.street, organization.number].filter(Boolean).join(', '),
        organization.complement,
        organization.district,
        `${organization.city}/${organization.state}`,
        organization.zipCode ? `CEP ${organization.zipCode}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    );
  }

  private visualStyle(primary: string): DocumentVisualStyle {
    return {
      colors: {
        primary,
        text: '#0f172a',
        muted: '#64748b',
        border: '#e2e8f0',
        surface: '#f8fafc',
        background: '#ffffff',
      },
      typography: { title: 16, section: 13, body: 10, label: 9, caption: 8 },
      spacing: { section: 8, component: 12, cardPadding: 8 },
    };
  }

  /**
   * Converts persisted technical prose into Blueprint-native paragraphs and lists.
   * The renderer remains document-agnostic and receives no TECHNICAL_REPORT rules.
   */
  private technicalNarrative(
    id: string,
    value: string | null,
    fallback: string,
  ): DocumentBlueprintComponent[] {
    const source = value?.trim() || fallback;
    const components: DocumentBlueprintComponent[] = [];
    let list: string[] = [];
    let sequence = 0;
    const flushList = (): void => {
      if (list.length === 0) return;
      components.push({ id: `${id}-list-${sequence++}`, kind: 'list', items: list });
      list = [];
    };

    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) {
        flushList();
        continue;
      }
      const bullet = line.match(/^(?:[-*•✓✔]|\d+[.)])\s*(.+)$/u);
      if (bullet) {
        list.push(this.clean(bullet[1]));
        continue;
      }
      flushList();
      components.push({
        id: `${id}-paragraph-${sequence++}`,
        kind: 'paragraph',
        text: this.clean(line),
        keepTogether: true,
      });
    }
    flushList();
    return components;
  }

  private lines(value: string | null): string[] {
    if (!value) return [];
    return value
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
      .filter(Boolean)
      .map((line) => this.clean(line));
  }

  private date(value: Date | string | null): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Recife',
    }).format(new Date(value));
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
      REPORT: 'Relatório legado',
      TECHNICAL_REPORT: 'Relatório de Visita Técnica',
      TECHNICAL_OPINION: 'Laudo Técnico',
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

  private slug(input: string): string {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
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
