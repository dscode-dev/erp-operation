import { DocumentTemplateType, Role } from '@prisma/client';
import { DocumentRendererService } from '../src/modules/document-engine/renderer/document-renderer.service';
import { PdfEngineService } from '../src/modules/document-engine/pdf/pdf-engine.service';
import type { DocumentBlueprint } from '../src/modules/document-engine/blueprint/document-blueprint.types';
import { LayoutEngine } from '../src/modules/document-engine/layout/layout-engine.service';
import { DocumentMeasureService } from '../src/modules/document-engine/measurement/document-measure.service';
import { DocumentBuilderService } from '../src/modules/document-engine/builder/document-builder.service';
import { DocumentContextService } from '../src/modules/document-engine/context/document-context.service';
import { OperationsService } from '../src/modules/operations/operations.service';
import { DocumentEngineService } from '../src/modules/document-engine/document-engine.service';
import type { RenderedDocument } from '../src/modules/document-engine/renderer/document-renderer.types';
import { DocumentAssetResolver } from '../src/modules/document-engine/assets/document-asset-resolver.service';
import { PNG } from 'pngjs';
import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library';

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
        website: 'https://orbit.local',
        address: 'Rua Orbit, 100 · Recife/PE',
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

  it('generates a direct PDF buffer with PDF header and pages', async () => {
    const rendered = renderer().render(blueprint(12));
    const result = await new PdfEngineService().create(rendered);
    expect(result.pageCount).toBe(rendered.pages.length);
    expect(result.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(result.buffer.toString('latin1')).toContain('/Type /Page');
  });

  it('generates a scannable equipment QR and preserves the same image in Blueprint and PDF', async () => {
    const payload = 'equipment:7de712a5-692a-481f-b080-189e518628c0';
    const asset = await new DocumentAssetResolver({} as never).generateQrCode(payload);
    const png = PNG.sync.read(Buffer.from(asset.contentBase64, 'base64'));
    const luminance = new Uint8ClampedArray(png.width * png.height);
    for (let index = 0; index < luminance.length; index += 1) {
      const offset = index * 4;
      luminance[index] = Math.round((png.data[offset] + 2 * png.data[offset + 1] + png.data[offset + 2]) / 4);
    }
    const source = new RGBLuminanceSource(luminance, png.width, png.height);
    const decoded = new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(source))).getText();
    expect(decoded).toBe(payload);
    const doc = blueprint(1);
    doc.sections.push({ id: 'qr', title: 'QR', components: [{ id: 'equipment-qr', kind: 'qrCode', label: 'QR do equipamento', value: payload, image: { mimeType: 'image/png', fileSize: asset.fileSize, contentBase64: asset.contentBase64 } }] });
    const rendered = renderer().render(doc);
    const pdf = await new PdfEngineService().create(rendered);
    const qr = doc.sections.at(-1)?.components[0];
    expect(qr?.kind === 'qrCode' ? qr.image.contentBase64 : null).toBe(asset.contentBase64);
    expect(rendered.pages.flatMap((page) => page.elements).some((element) => element.type === 'image' && element.contentBase64 === asset.contentBase64)).toBe(true);
    expect(pdf.buffer.toString('latin1')).toContain('/Subtype /Image');
  });

  it('embeds a Unicode font without stripping Portuguese text and punctuation', async () => {
    const unicodeSample = 'á à â ã é ê í ó ô õ ú ç Á É Í Ó Ú Ç º ª – — R$';
    const rendered: RenderedDocument = {
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
            website: '',
            address: '',
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
              text: unicodeSample,
              x: 40,
              y: 760,
              size: 10,
            },
          ],
        },
      ],
    };
    const result = await new PdfEngineService().create(rendered);
    const latin1 = result.buffer.toString('latin1');
    expect(rendered.pages[0]?.elements[0]).toMatchObject({ text: unicodeSample });
    expect(latin1).toContain('%PDF-');
    expect(latin1).toContain('/ToUnicode');
    expect(latin1).toContain('/FontFile');
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

  it('keeps signature blocks together and embeds fixed signature images in the PDF', async () => {
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
    const result = await new PdfEngineService().create(rendered);

    expect(signaturePages).toHaveLength(1);
    expect(result.buffer.toString('latin1')).toContain('/Subtype /Image');
    expect(result.buffer.toString('latin1')).toContain('/XObject');
  });

  it('builds multiple institutional signatures together with an execution signature', () => {
    const context = operationContext(DocumentTemplateType.WORK_ORDER);
    context.signature = {
      requiresSignature: true,
      signatureMode: 'HYBRID',
      signatureId: 'institutional-1',
      fixedSignature: null,
      institutionalSignatures: [
        { id: 'institutional-1', name: 'Ana', title: 'Responsável técnica', professionalCouncil: 'CREA 123', department: 'Engenharia', image: { storageKey: 'a', mimeType: 'image/png', fileSize: 68, contentBase64: ONE_PIXEL_PNG } },
        { id: 'institutional-2', name: 'Bruno', title: 'Diretor técnico', professionalCouncil: null, department: 'Diretoria', image: { storageKey: 'b', mimeType: 'image/png', fileSize: 68, contentBase64: ONE_PIXEL_PNG } },
      ],
      collectedSignature: null,
      executionSignatures: [{ role: 'client', label: 'Assinatura do cliente', name: null, title: null, signedAt: null, caption: 'Coletada na execução', image: null }],
    };
    const builder = new DocumentBuilderService({} as never);
    const built = (builder as unknown as { buildFromContext: (ctx: unknown) => DocumentBlueprint }).buildFromContext(context);
    const component = built.sections.flatMap((section) => section.components).find((item) => item.kind === 'signature');
    expect(component && 'signatures' in component ? component.signatures : []).toHaveLength(3);
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

  it.each([
    [DocumentTemplateType.WORK_ORDER, 'work-order-identification'],
    [DocumentTemplateType.TECHNICAL_REPORT, 'visit-objective'],
    [DocumentTemplateType.TECHNICAL_OPINION, 'technical-opinion-findings'],
    [DocumentTemplateType.PMOC, 'pmoc-compliance-context'],
    [DocumentTemplateType.RECEIPT, 'receipt-reference'],
  ])('builds and renders the official report-center workflow %s', async (type, expectedSection) => {
    const context = operationContext(type);
    const operation = context.operation as Record<string, unknown>;
    operation.reportedIssue = 'Objetivo, diagnóstico ou referência oficial';
    operation.serviceDescription = 'Análise, medição ou valor recebido oficial';
    operation.observations = 'Conclusão e observações persistidas';
    const built = (new DocumentBuilderService({} as never) as unknown as { buildFromContext: (ctx: unknown) => DocumentBlueprint }).buildFromContext(context);
    const rendered = renderer().render(built);
    const pdf = await new PdfEngineService().create(rendered);
    expect(built.sections.map((section) => section.id)).toContain(expectedSection);
    expect(rendered.blueprint).toBe(built);
    expect(pdf.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('certifies Work Order semantic order and keeps the same Blueprint for preview and PDF render', async () => {
    const context = operationContext(DocumentTemplateType.WORK_ORDER);
    const operation = context.operation as Record<string, unknown>;
    operation.reportedIssue = 'Cliente relata temperatura elevada — equipamento sem rendimento.';
    operation.serviceDescription = 'Inspeção técnica completa\n- Correção do vazamento\nRecarga de fluido refrigerante';
    (context.assets as Record<string, unknown>).logo = { storageKey: 'organization/logo.png', mimeType: 'image/png', fileSize: 68, contentBase64: ONE_PIXEL_PNG };
    const builder = new DocumentBuilderService({} as never);
    const workOrder = (builder as unknown as { buildFromContext: (ctx: unknown) => DocumentBlueprint }).buildFromContext(context);
    const ids = workOrder.sections.map((section) => section.id);
    expect(ids).toEqual([
      'work-order-identification', 'work-order-customer', 'equipment', 'work-order-reported-issue',
      'work-order-services', 'checklist-checklist-da-execucao', 'observations-observacoes-e-resultado-operacional',
    ]);
    expect(workOrder.sections.find((section) => section.id === 'equipment')?.pageBreakAfter).toBe(true);
    const rendered = renderer().render(workOrder);
    const pdf = await new PdfEngineService().create(rendered);
    expect(rendered.blueprint).toBe(workOrder);
    expect(rendered.pages[0]?.elements.some((element) => element.type === 'image')).toBe(true);
    const checklistPage = rendered.pages.find((page) => page.elements.some((element) => element.type === 'text' && element.text === 'Checklist da execução'));
    expect(checklistPage?.elements.some((element) => element.type === 'text' && element.text.includes('Inspeção visual'))).toBe(true);
    expect(checklistPage?.elements.filter((element) => element.type === 'line' && element.color === '#0f766e')).toHaveLength(4);
    expect(rendered.pages[0]?.elements.some((element) => element.type === 'text' && element.text === 'Defeito ou solicitação informada')).toBe(false);
    expect(rendered.pages[1]?.elements.some((element) => element.type === 'text' && element.text === 'Defeito ou solicitação informada')).toBe(true);
    expect(pdf.buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(JSON.stringify(workOrder)).toContain('temperatura elevada — equipamento');
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
        brandAsset: { findFirst: jest.fn().mockResolvedValue(null) },
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
      { generateQrCode: jest.fn().mockResolvedValue({ storageKey: 'generated:qr', mimeType: 'image/png', fileSize: 68, contentBase64: ONE_PIXEL_PNG }) } as never,
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

  it('resolves the exact institutional signature configured by the WORK_ORDER template', async () => {
    const base = operationContext(DocumentTemplateType.WORK_ORDER);
    const operation = base.operation as Record<string, unknown>;
    operation.signatureData = `data:image/png;base64,${ONE_PIXEL_PNG}`;
    operation.signedAt = new Date();
    const institutional = { id: '7db71471-0cf4-4414-8d06-83eb9c1917c1', name: 'Responsável Técnica', title: 'Engenheira Mecânica', professionalCouncil: 'CREA-PE 123', department: 'Engenharia', imageStorageKey: 'signatures/technical.png', mimeType: 'image/png', fileSize: 68, active: true, deletedAt: null };
    const configuration = { ...base.configuration, defaultTemplate: { id: 'template', organizationId: 'organization', type: 'WORK_ORDER', name: 'OS', headerContent: '', footerContent: '', observations: '', isDefault: true, isSystem: true, isActive: true, requiresSignature: true, signatureMode: 'FIXED', signatureId: institutional.id, executionSignatureClient: true, executionSignatureTechnician: true, executionSignatureOperator: true, createdAt: new Date(), updatedAt: new Date(), signature: institutional, institutionalSignatures: [{ position: 0, signature: institutional }] } };
    const context = new DocumentContextService(
      { operation: { findUnique: jest.fn().mockResolvedValue(operation) }, brandAsset: { findFirst: jest.fn().mockResolvedValue(null) } } as never,
      { getConfigurationForType: jest.fn().mockResolvedValue(configuration) } as never,
      { generateQrCode: jest.fn().mockResolvedValue((base.assets as { qrCode: unknown }).qrCode), resolveSignature: jest.fn().mockResolvedValue({ storageKey: institutional.imageStorageKey, mimeType: 'image/png', fileSize: 68, contentBase64: ONE_PIXEL_PNG }) } as never,
    );
    const created = await context.create('operation', DocumentTemplateType.WORK_ORDER);
    const built = (new DocumentBuilderService({} as never) as unknown as { buildFromContext: (ctx: unknown) => DocumentBlueprint }).buildFromContext(created);
    const component = built.sections.flatMap((section) => section.components).find((item) => item.kind === 'signature');
    expect(created.signature.institutionalSignatures[0]?.id).toBe(institutional.id);
    expect(created.signature.executionSignatures).toHaveLength(0);
    expect(component && 'signatures' in component ? component.signatures[0] : null).toMatchObject({ id: institutional.id, label: 'Responsável técnico', name: institutional.name });
    expect(component && 'signatures' in component ? component.signatures : []).toHaveLength(1);
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
        brandAsset: { findFirst: jest.fn().mockResolvedValue(null) },
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
        generateQrCode: jest.fn().mockResolvedValue({ storageKey: 'generated:qr', mimeType: 'image/png', fileSize: 68, contentBase64: ONE_PIXEL_PNG }),
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

  it('waits for signature/photo persistence and returns the authoritative Operation after update', async () => {
    const operation = { id: '7db71471-0cf4-4414-8d06-83eb9c1917c9', signatureData: null, signedAt: null, photos: [] };
    const transactionOperationUpdate = jest.fn().mockResolvedValue(operation);
    const operationFindUnique = jest.fn().mockResolvedValue(operation);
    const photoCreate = jest.fn().mockResolvedValue({ id: 'photo-id' });
    const prisma = {
      operation: { findUnique: operationFindUnique },
      operationPhoto: { create: photoCreate },
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<void>) => callback({
        operation: { update: transactionOperationUpdate },
        auditLog: { create: jest.fn() },
      })),
    };
    const storageSave = jest.fn().mockResolvedValue(undefined);
    const service = new OperationsService(
      prisma as never,
      { save: storageSave, delete: jest.fn() } as never,
      { publishOperationCompletedTx: jest.fn() } as never,
      { syncOperationCompletedTx: jest.fn() } as never,
      {} as never,
    );

    const result = await service.update(
      operation.id,
      {
        signatureData: `data:image/png;base64,${ONE_PIXEL_PNG}`,
        signedAt: '2026-07-11T10:00:00.000Z',
        photos: [{ dataUrl: `data:image/png;base64,${ONE_PIXEL_PNG}`, caption: 'Evidência' }],
      },
      { id: 'actor-id', role: Role.OWNER } as never,
      { requestId: 'request-id', ip: null, userAgent: null },
    );

    expect(transactionOperationUpdate).toHaveBeenCalled();
    expect(storageSave).toHaveBeenCalled();
    expect(photoCreate).toHaveBeenCalled();
    expect(operationFindUnique).toHaveBeenCalledTimes(2);
    expect(result).toBe(operation);
  });

  it('detects a previously rendered Work Order as stale after its signature changes', async () => {
    const current = blueprint(1);
    current.sections.push({
      id: 'signature',
      title: 'Assinatura',
      critical: true,
      components: [{
        id: 'execution-signature',
        kind: 'signature',
        mode: 'COLLECTED',
        signatures: [{
          id: 'collected',
          role: 'collected',
          label: 'Assinatura do cliente',
          name: null,
          title: null,
          signedAt: '2026-07-11T10:00:00.000Z',
          caption: 'Assinatura coletada na execução',
          image: { mimeType: 'image/png', fileSize: 68, contentBase64: ONE_PIXEL_PNG },
        }],
      }],
    });
    const document = {
      id: 'f50e8e28-0ee0-4cd1-b9e3-3f22f1d744f5',
      operationId: current.metadata.operationId,
      budgetId: null,
      type: DocumentTemplateType.WORK_ORDER,
      number: 'OS-000001',
      status: 'READY',
      storageKey: 'documents/old.pdf',
      mimeType: 'application/pdf',
      fileSize: 100,
      renderedAt: new Date('2026-07-11T09:00:00.000Z'),
      renderMetadata: { sourceFingerprint: 'a'.repeat(64) },
      createdAt: new Date('2026-07-11T09:00:00.000Z'),
      updatedAt: new Date('2026-07-11T09:00:00.000Z'),
    };
    const getDocumentPdf = jest.fn();
    const service = new DocumentEngineService(
      { operationDocument: { findUnique: jest.fn().mockResolvedValue(document) } } as never,
      { buildFromOperation: jest.fn().mockResolvedValue(current) } as never,
      {} as never,
      {} as never,
      {} as never,
      { getDocumentPdf } as never,
      {} as never,
    );

    await expect(service.downloadDocument(
      document.id,
      { id: 'actor-id', role: Role.OWNER } as never,
      { requestId: 'request-id', ip: null, userAgent: null },
    )).rejects.toMatchObject({ code: 'DOCUMENT_STALE' });
    expect(getDocumentPdf).not.toHaveBeenCalled();
  });

  it('keeps source fingerprints stable across preview timestamps and changes them for semantic content', () => {
    const service = new DocumentEngineService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    const fingerprint = (value: DocumentBlueprint): string | undefined => (service as unknown as {
      withSourceFingerprint: (blueprint: DocumentBlueprint) => DocumentBlueprint;
    }).withSourceFingerprint(value).metadata.sourceFingerprint;
    const first = blueprint(1);
    const regenerated = { ...first, metadata: { ...first.metadata, generatedAt: '2026-07-11T12:00:00.000Z' }, footer: { ...first.footer, generatedAt: '2026-07-11T12:00:00.000Z' } };
    const changed = structuredClone(first);
    const metadata = changed.sections[0]?.components[0];
    if (metadata?.kind === 'metadata' && metadata.items[0]) metadata.items[0].value = 'Outro cliente';

    expect(fingerprint(first)).toBe(fingerprint(regenerated));
    expect(fingerprint(changed)).not.toBe(fingerprint(first));
  });

  it('lists the official repository with server-side filters and pagination', async () => {
    const now = new Date('2026-07-11T12:00:00.000Z');
    const findMany = jest.fn(); const count = jest.fn();
    const prisma = { operationDocument: { findMany, count }, $transaction: jest.fn().mockResolvedValue([[{
      id: 'doc', number: 'OS-1', type: 'WORK_ORDER', status: 'READY', budgetId: null, operationId: 'op',
      renderedAt: now, createdAt: now, updatedAt: now, fileSize: 100, renderMetadata: { blueprintVersion: '1.0' }, budget: null,
      operation: { id: 'op', number: 1, customer: { id: 'c', name: 'Cliente' }, equipment: { id: 'e', name: 'Equipamento', tag: 'EQ' }, operator: { id: 'u', name: 'Operador' } },
    }], 1]) };
    const service = new DocumentEngineService(prisma as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    const result = await service.listDocuments({ page: 1, limit: 20, search: 'OS', customerId: '00000000-0000-4000-8000-000000000001' }, { id: 'owner', role: Role.OWNER } as never) as { items: Array<{ number: string; origin: string }>; pagination: { total: number } };
    expect(result.items[0]).toMatchObject({ number: 'OS-1', origin: 'OPERATION' });
    expect(result.pagination.total).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalled();
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
        website: 'https://orbit.local',
        zipCode: '50000-000',
        street: 'Rua Orbit',
        number: '100',
        complement: null,
        district: 'Centro',
        city: 'Recife',
        state: 'PE',
        primaryColor: '#111827',
        secondaryColor: '#2563EB',
      },
      settings: { timezone: 'America/Recife', currency: 'BRL' },
    },
    template: null,
    signature: { requiresSignature: false, signatureMode: 'NONE', signatureId: null, fixedSignature: null, institutionalSignatures: [], collectedSignature: null, executionSignatures: [] },
    assets: { signature: null, logo: null, watermark: null, qrCode: { storageKey: 'generated:qr', mimeType: 'image/png', fileSize: 68, contentBase64: ONE_PIXEL_PNG }, images: [] },
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
      reportedIssue: null,
      serviceDescription: null,
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
