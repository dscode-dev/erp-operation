import { DocumentTemplateType } from '@prisma/client';
import { DocumentRendererService } from '../src/modules/document-engine/renderer/document-renderer.service';
import { PdfEngineService } from '../src/modules/document-engine/pdf/pdf-engine.service';
import type { DocumentBlueprint } from '../src/modules/document-engine/blueprint/document-blueprint.types';
import { LayoutEngine } from '../src/modules/document-engine/layout/layout-engine.service';
import { DocumentMeasureService } from '../src/modules/document-engine/measurement/document-measure.service';
import { DocumentBuilderService } from '../src/modules/document-engine/builder/document-builder.service';
import { DocumentContextService } from '../src/modules/document-engine/context/document-context.service';
import { OperationsService } from '../src/modules/operations/operations.service';

const ONE_PIXEL_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

function blueprint(rowCount: number): DocumentBlueprint {
  return {
    version: '1.0',
    metadata: {
      operationId: '7db71471-0cf4-4414-8d06-83eb9c1917c9',
      documentId: null,
      documentType: DocumentTemplateType.WORK_ORDER,
      documentNumber: 'OS-000001',
      generatedAt: '2026-06-29T10:00:00.000Z',
      locale: 'pt-BR',
      timezone: 'America/Recife',
      currency: 'BRL',
      organization: {
        legalName: 'ERP Operation',
        tradeName: 'ERP Operation',
        cnpj: '00.000.000/0001-00',
        email: 'contato@example.com',
        phone: '+55 81 99999-9999',
        city: 'Recife',
        state: 'PE',
        primaryColor: '#111827',
        secondaryColor: '#2563EB',
      },
    },
    header: {
      title: 'Ordem de Serviço',
      organizationName: 'ERP Operation',
      documentNumber: 'OS-000001',
    },
    footer: {
      content: 'Gerado por ERP Operation',
      generatedAt: '2026-06-29T10:00:00.000Z',
    },
    sections: [
      {
        id: 'summary',
        title: 'Resumo',
        critical: true,
        components: [
          {
            id: 'metadata',
            kind: 'metadata',
            keepTogether: true,
            items: [
              { label: 'Cliente', value: 'Hospital Santa Clara' },
              { label: 'Operador', value: 'João Técnico' },
            ],
          },
        ],
      },
      {
        id: 'table',
        title: 'Tabela longa',
        components: [
          {
            id: 'rows',
            kind: 'table',
            columns: [
              { key: 'idx', label: '#', width: 0.12 },
              { key: 'name', label: 'Item', width: 0.58 },
              { key: 'status', label: 'Status', width: 0.3 },
            ],
            rows: Array.from({ length: rowCount }).map((_, index) => ({
              idx: String(index + 1),
              name: `Item ${index + 1}`,
              status: index % 2 === 0 ? 'OK' : 'Pendente',
            })),
          },
        ],
      },
    ],
  };
}

describe('DocumentEngine foundation', () => {
  const renderer = (): DocumentRendererService =>
    new DocumentRendererService(new LayoutEngine(new DocumentMeasureService()));

  it('paginates long tables without producing empty pages', () => {
    const rendered = renderer().render(blueprint(95));
    expect(rendered.pages.length).toBeGreaterThan(1);
    expect(rendered.pages.every((page) => page.elements.length > 0)).toBe(true);
  });

  it('generates a direct PDF buffer with PDF header and pages', () => {
    const rendered = renderer().render(blueprint(12));
    const result = new PdfEngineService().create(rendered);
    expect(result.pageCount).toBe(rendered.pages.length);
    expect(result.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(result.buffer.toString('latin1')).toContain('/Type /Page');
  });

  it('sanitizes unsupported unicode punctuation before writing PDF literal strings', () => {
    const result = new PdfEngineService().create({
      blueprint: {
        version: '1.0',
        metadata: {
          operationId: 'unicode-punctuation',
          documentId: 'unicode-punctuation',
          documentNumber: 'DOC-UNICODE',
          documentType: 'REPORT',
          generatedAt: new Date('2026-07-10T12:00:00.000Z').toISOString(),
          locale: 'pt-BR',
          timezone: 'America/Recife',
          currency: 'BRL',
          organization: {
            legalName: 'Orbit ERP',
            tradeName: 'Orbit ERP',
            cnpj: '',
            email: '',
            phone: '',
            city: '',
            state: '',
            primaryColor: '#000000',
            secondaryColor: '#000000',
          },
        },
        header: {
          title: 'Exportação — “produção”',
          subtitle: 'PDF-safe',
          organizationName: 'Orbit ERP',
          documentNumber: 'DOC-UNICODE',
        },
        footer: {
          content: 'Footer',
          generatedAt: new Date('2026-07-10T12:00:00.000Z').toISOString(),
        },
        sections: [],
      },
      pages: [
        {
          pageNumber: 1,
          elements: [
            {
              type: 'text',
              text: 'Cliente — operação “crítica” não deve corromper o PDF',
              x: 40,
              y: 760,
              size: 10,
            },
          ],
        },
      ],
    });
    const latin1 = result.buffer.toString('latin1');
    expect(latin1).toContain('%PDF-');
    expect(latin1).toContain('Exportação - "produção"');
    expect(latin1).not.toContain('\x14');
  });

  it('measures text and computes printable layout boundaries', () => {
    const measure = new DocumentMeasureService();
    const layout = new LayoutEngine(measure);
    const wrapped = layout.wrapText('texto operacional para medição de layout', 90, 10);

    expect(measure.measureText({ text: 'ERP', width: 80, fontSize: 10 }).height).toBeGreaterThan(0);
    expect(layout.contentWidth()).toBeGreaterThan(400);
    expect(layout.availableHeight()).toBeGreaterThan(600);
    expect(wrapped.length).toBeGreaterThan(1);
  });

  it('keeps signature blocks together and embeds fixed signature images in the PDF', () => {
    const doc = blueprint(55);
    doc.sections.push({
      id: 'signature',
      title: 'Assinatura',
      critical: true,
      components: [
        {
          id: 'document-signature',
          kind: 'signature',
          mode: 'HYBRID',
          keepTogether: true,
          signatures: [
            {
              id: 'fixed',
              role: 'fixed',
              label: 'Assinatura fixa',
              name: 'Responsável Técnico',
              title: 'Eng. Mecânico',
              signedAt: null,
              caption: 'Assinatura cadastrada',
              image: {
                mimeType: 'image/png',
                fileSize: Buffer.from(ONE_PIXEL_PNG, 'base64').length,
                contentBase64: ONE_PIXEL_PNG,
              },
            },
            {
              id: 'collected',
              role: 'collected',
              label: 'Assinatura do cliente',
              name: null,
              title: null,
              signedAt: null,
              caption: 'Assinatura coletada em campo',
              image: null,
            },
          ],
        },
      ],
    });

    const rendered = renderer().render(doc);
    const signaturePages = rendered.pages.filter((page) =>
      page.elements.some((element) => element.type === 'image'),
    );
    const result = new PdfEngineService().create(rendered);

    expect(signaturePages).toHaveLength(1);
    expect(result.buffer.toString('latin1')).toContain('/Subtype /Image');
    expect(result.buffer.toString('latin1')).toContain('/XObject');
  });

  it('builds semantically different Technical Report and Technical Opinion blueprints', () => {
    const builder = new DocumentBuilderService({} as never);
    const base = operationContext(DocumentTemplateType.TECHNICAL_REPORT);
    const report = (builder as unknown as { buildFromContext: (ctx: unknown) => DocumentBlueprint }).buildFromContext(base);
    const opinion = (builder as unknown as { buildFromContext: (ctx: unknown) => DocumentBlueprint }).buildFromContext({
      ...base,
      configuration: { ...base.configuration, type: DocumentTemplateType.TECHNICAL_OPINION },
    });

    const reportSectionIds = report.sections.map((section) => section.id);
    const opinionSectionIds = opinion.sections.map((section) => section.id);

    expect(report.metadata.documentType).toBe(DocumentTemplateType.TECHNICAL_REPORT);
    expect(opinion.metadata.documentType).toBe(DocumentTemplateType.TECHNICAL_OPINION);
    expect(reportSectionIds).toContain('visit-timing');
    expect(opinionSectionIds).toContain('technical-opinion-object');
    expect(opinionSectionIds).toContain('technical-opinion-conclusion');
    expect(opinionSectionIds).not.toEqual(reportSectionIds);
  });

  it('hydrates collected execution signatures into the official document context', async () => {
    const now = new Date('2026-07-10T12:00:00.000Z');
    const operation = (operationContext(DocumentTemplateType.WORK_ORDER) as unknown as { operation: Record<string, unknown> }).operation;
    operation.signatureData = `data:image/png;base64,${ONE_PIXEL_PNG}`;
    operation.signedAt = now;
    operation.documents = [];

    const context = new DocumentContextService(
      {
        operation: {
          findUnique: jest.fn().mockResolvedValue(operation),
        },
      } as never,
      {
        getConfigurationForType: jest.fn().mockResolvedValue({
          type: DocumentTemplateType.WORK_ORDER,
          organization: {
            legalName: 'ERP Operation LTDA',
            tradeName: 'Orbit',
            cnpj: '00.000.000/0001-00',
            email: 'contato@orbit.local',
            phone: '+55 81 99999-9999',
            city: 'Recife',
            state: 'PE',
            primaryColor: '#111827',
            secondaryColor: '#2563EB',
          },
          settings: { timezone: 'America/Recife', currency: 'BRL' },
          defaultTemplate: {
            id: 'template-work-order',
            organizationId: 'organization-id',
            type: DocumentTemplateType.WORK_ORDER,
            name: 'OS padrão',
            headerContent: '',
            footerContent: '',
            observations: '',
            isDefault: true,
            isSystem: true,
            isActive: true,
            requiresSignature: false,
            signatureMode: 'NONE',
            signatureId: null,
            createdAt: now,
            updatedAt: now,
            signature: null,
          },
        }),
      } as never,
      {} as never,
    );

    const created = await context.create('operation-id', DocumentTemplateType.WORK_ORDER);
    const builder = new DocumentBuilderService({} as never);
    const blueprint = (builder as unknown as { buildFromContext: (ctx: unknown) => DocumentBlueprint }).buildFromContext(created);
    const signature = blueprint.sections
      .flatMap((section) => section.components)
      .find((component) => component.kind === 'signature');

    expect(created.signature.requiresSignature).toBe(true);
    expect(created.signature.signatureMode).toBe('COLLECTED');
    expect(created.signature.collectedSignature?.image?.contentBase64).toBe(ONE_PIXEL_PNG);
    expect(signature).toBeDefined();
    expect(signature && 'signatures' in signature ? signature.signatures[0]?.image?.contentBase64 : null).toBe(ONE_PIXEL_PNG);
  });

  it('hydrates persisted operation photos into image blueprint components', async () => {
    const now = new Date('2026-07-10T12:00:00.000Z');
    const operation = (operationContext(DocumentTemplateType.TECHNICAL_REPORT) as unknown as { operation: Record<string, unknown> }).operation;
    operation.photos = [
      {
        id: 'photo-id',
        operationId: operation.id,
        storageKey: 'operations/op/photos/photo.png',
        caption: 'Condensadora antes da manutenção',
        mimeType: 'image/png',
        fileSize: Buffer.from(ONE_PIXEL_PNG, 'base64').length,
        createdAt: now,
      },
    ];
    operation.documents = [];

    const context = new DocumentContextService(
      {
        operation: {
          findUnique: jest.fn().mockResolvedValue(operation),
        },
      } as never,
      {
        getConfigurationForType: jest.fn().mockResolvedValue({
          type: DocumentTemplateType.TECHNICAL_REPORT,
          organization: {
            legalName: 'ERP Operation LTDA',
            tradeName: 'Orbit',
            cnpj: '00.000.000/0001-00',
            email: 'contato@orbit.local',
            phone: '+55 81 99999-9999',
            city: 'Recife',
            state: 'PE',
            primaryColor: '#111827',
            secondaryColor: '#2563EB',
          },
          settings: { timezone: 'America/Recife', currency: 'BRL' },
          defaultTemplate: null,
        }),
      } as never,
      {
        resolveDocumentImage: jest.fn().mockResolvedValue({
          storageKey: 'operations/op/photos/photo.png',
          mimeType: 'image/png',
          fileSize: Buffer.from(ONE_PIXEL_PNG, 'base64').length,
          contentBase64: ONE_PIXEL_PNG,
        }),
      } as never,
    );

    const created = await context.create('operation-id', DocumentTemplateType.TECHNICAL_REPORT);
    const builder = new DocumentBuilderService({} as never);
    const blueprint = (builder as unknown as { buildFromContext: (ctx: unknown) => DocumentBlueprint }).buildFromContext(created);
    const image = blueprint.sections
      .flatMap((section) => section.components)
      .find((component) => component.kind === 'image');

    expect(created.assets.images[0]?.contentBase64).toBe(ONE_PIXEL_PNG);
    expect(image).toBeDefined();
    expect(image && 'image' in image ? image.image?.contentBase64 : null).toBe(ONE_PIXEL_PNG);
  });

  it('rejects invalid collected signature payloads before persistence', () => {
    const service = new OperationsService({} as never, {} as never, {} as never, {} as never, {} as never);
    const normalize = (service as unknown as { normalizeSignatureData: (value?: string) => string | null }).normalizeSignatureData.bind(service);

    expect(() => normalize(`data:image/png;base64,${Buffer.from('bad').toString('base64')}`)).toThrow('Signature binary is invalid');
  });
});

function operationContext(type: DocumentTemplateType): Record<string, unknown> & { configuration: Record<string, unknown> } {
  const now = new Date('2026-07-10T12:00:00.000Z');
  return {
    kind: 'operation',
    configuration: {
      type,
      organization: {
        legalName: 'ERP Operation LTDA',
        tradeName: 'Orbit',
        cnpj: '00.000.000/0001-00',
        email: 'contato@orbit.local',
        phone: '+55 81 99999-9999',
        city: 'Recife',
        state: 'PE',
        primaryColor: '#111827',
        secondaryColor: '#2563EB',
      },
      settings: { timezone: 'America/Recife', currency: 'BRL' },
    },
    template: null,
    signature: { requiresSignature: false, signatureMode: 'NONE', signatureId: null, fixedSignature: null, collectedSignature: null },
    assets: { signature: null, logo: null, watermark: null, qrCode: null, images: [] },
    operation: {
      id: '7db71471-0cf4-4414-8d06-83eb9c1917c9',
      number: 42,
      type: 'PREVENTIVA',
      status: 'COMPLETED',
      scheduledFor: now,
      startedAt: now,
      completedAt: now,
      signedAt: now,
      checklist: [{ label: 'Inspeção visual', done: true, note: 'Sem avarias aparentes' }],
      observations: 'Equipamento inspecionado e operando conforme registros do atendimento.',
      customer: {
        name: 'Hospital Santa Clara',
        tradeName: 'Hospital Santa Clara',
        cnpj: '00.000.000/0001-00',
        cpf: null,
        phone: '+55 81 3000-0000',
        addresses: [{ name: 'Matriz', street: 'Rua A', number: '100', district: 'Boa Viagem', city: 'Recife', state: 'PE' }],
        contacts: [{ name: 'Ana', phone: '+55 81 98888-0000' }],
      },
      address: null,
      equipment: {
        name: 'Chiller 01',
        tag: 'CH-01',
        type: 'CHILLER',
        manufacturer: 'York',
        model: 'YCAL',
        serialNumber: 'SN-123',
        qrCode: 'equipment:7db71471-0cf4-4414-8d06-83eb9c1917c9',
        metrics: [],
        attachments: [],
      },
      operator: { name: 'João Técnico', jobTitle: 'Técnico' },
      assignment: null,
      maintenanceExecution: null,
      parts: [],
      photos: [],
      documents: [],
    },
  };
}
