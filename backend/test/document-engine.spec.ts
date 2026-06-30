import { DocumentTemplateType } from '@prisma/client';
import { DocumentRendererService } from '../src/modules/document-engine/renderer/document-renderer.service';
import { PdfEngineService } from '../src/modules/document-engine/pdf/pdf-engine.service';
import type { DocumentBlueprint } from '../src/modules/document-engine/blueprint/document-blueprint.types';
import { LayoutEngine } from '../src/modules/document-engine/layout/layout-engine.service';
import { DocumentMeasureService } from '../src/modules/document-engine/measurement/document-measure.service';

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
});
