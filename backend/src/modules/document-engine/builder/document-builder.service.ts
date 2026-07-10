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
    const sections = this.sharedIdentitySections(context);

    switch (context.configuration.type) {
      case DocumentTemplateType.WORK_ORDER:
        sections.push(...this.workOrderSections(context));
        break;
      case DocumentTemplateType.TECHNICAL_REPORT:
        sections.push(...this.visitReportSections(context));
        break;
      case DocumentTemplateType.REPORT:
        sections.push(...this.executionReportSections(context));
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
                : operation.customer.phone ?? '—',
            ],
            ['Endereço', address ? this.address(address) : '—'],
          ]),
        ],
      },
    ];

    if (operation.equipment) sections.push(this.equipmentSection(operation));
    return sections;
  }

  private workOrderSections(context: DocumentContext): DocumentSection[] {
    const { operation } = context;
    return [
      {
        id: 'work-order-execution',
        title: 'Programação e responsável',
        critical: true,
        components: [
          this.metadata('work-order-execution-metadata', [
            ['Operador responsável', operation.operator.name],
            ['Cargo', operation.operator.jobTitle ?? '—'],
            ['Atribuição', operation.assignment?.status ?? 'Sem assignment'],
            ['Aceite', this.date(operation.assignment?.acceptedAt ?? null)],
            ['Início previsto', this.date(operation.scheduledFor)],
            ['Início real', this.date(operation.startedAt)],
          ]),
        ],
      },
      this.checklistSection(operation, 'Escopo/checklist da OS'),
      this.observationSection(operation, 'Orientações da OS'),
    ].filter((section): section is DocumentSection => Boolean(section));
  }

  private visitReportSections(context: DocumentContext): DocumentSection[] {
    const { operation } = context;
    const sections: DocumentSection[] = [
      {
        id: 'visit-timing',
        title: 'Dados da visita',
        critical: true,
        components: [
          this.metadata('visit-timing-metadata', [
            ['Operador em campo', operation.operator.name],
            ['Agendamento', this.date(operation.scheduledFor)],
            ['Chegada/Início', this.date(operation.startedAt)],
            ['Saída/Conclusão', this.date(operation.completedAt)],
            ['Assinado em', this.date(operation.signedAt)],
          ]),
        ],
      },
      this.checklistSection(operation, 'Atividades verificadas'),
      this.materialsSection(operation),
      this.observationSection(operation, 'Diagnóstico e observações da visita'),
    ].filter((section): section is DocumentSection => Boolean(section));
    if (operation.photos.length > 0) sections.push(this.photosSection(operation, 'Evidências da visita'));
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
            ['Iniciado em', this.date(operation.startedAt ?? operation.assignment?.startedAt ?? null)],
            ['Concluído em', this.date(operation.completedAt ?? operation.assignment?.completedAt ?? null)],
          ]),
        ],
      },
      this.assignmentHistorySection(operation),
      this.checklistSection(operation, 'Atividades executadas'),
      this.materialsSection(operation),
      this.observationSection(operation, 'Resultado operacional'),
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
      this.checklistSection(operation, 'Execução PMOC registrada'),
      this.observationSection(operation, 'Observações PMOC'),
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
    if (context.configuration.type !== DocumentTemplateType.TECHNICAL_REPORT && operation.photos.length > 0) {
      sections.push(this.photosSection(operation, 'Evidências fotográficas'));
    }
    if (operation.documents.length > 0) {
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
    }
    return sections;
  }

  private equipmentSection(operation: DocumentContext['operation']): DocumentSection {
    const equipment = operation.equipment;
    if (!equipment) {
      throw new ApplicationException(ERROR_CODES.DOCUMENT_RENDER_FAILED, 'Equipment section requested without equipment', HttpStatus.INTERNAL_SERVER_ERROR);
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
          keepTogether: true,
        },
      ],
    };
  }

  private checklistSection(operation: DocumentContext['operation'], title: string): DocumentSection {
    return {
      id: `checklist-${this.slug(title)}`,
      title,
      components: [{ id: 'operation-checklist', kind: 'checklist', items: this.checklist(operation.checklist) }],
    };
  }

  private observationSection(operation: DocumentContext['operation'], title: string): DocumentSection | null {
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

  private assignmentHistorySection(operation: DocumentContext['operation']): DocumentSection | null {
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
            equipments: this.clean(environment.equipments.map((item) => item.equipment.name).join(', ') || '—'),
          })),
        },
      ],
    };
  }

  private photosSection(operation: DocumentContext['operation'], title: string): DocumentSection {
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
        keepTogether: true,
      })),
    };
  }

  private purposeTitle(type: DocumentTemplateType): string {
    const titles: Record<DocumentTemplateType, string> = {
      BUDGET: 'Finalidade do documento',
      QUOTE: 'Origem do orçamento operacional',
      WORK_ORDER: 'Ordem de serviço',
      RECEIPT: 'Recibo de atendimento',
      REPORT: 'Relatório de execução',
      TECHNICAL_REPORT: 'Relatório de visita técnica',
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
