import { HttpStatus, Injectable } from '@nestjs/common';
import {
  DOCUMENT_MAX_PAGES,
  DOCUMENT_PAGE,
} from '../../../shared/constants/document-engine.constants';
import { ERROR_CODES } from '../../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../../shared/exceptions/application.exception';
import type {
  ChecklistComponent,
  DocumentBlueprint,
  DocumentBlueprintComponent,
  ImageComponent,
  ListComponent,
  MetadataComponent,
  ObservationComponent,
  ParagraphComponent,
  QrCodeComponent,
  SignatureComponent,
  SignaturePlaceholderComponent,
  TableComponent,
} from '../blueprint/document-blueprint.types';
import type {
  LayoutBlock,
  RenderedDocument,
  RenderedElement,
  RenderedPage,
} from './document-renderer.types';
import { LayoutEngine } from '../layout/layout-engine.service';

const LINE_HEIGHT = 13;
const SMALL_LINE_HEIGHT = 11;
const SECTION_TITLE_HEIGHT = 24;

@Injectable()
export class DocumentRendererService {
  constructor(private readonly layout: LayoutEngine) {}

  render(blueprint: DocumentBlueprint): RenderedDocument {
    const pages: RenderedPage[] = [];
    let current = this.newPage(blueprint, 1);
    pages.push(current);
    let y = this.layout.contentTop();
    const x = DOCUMENT_PAGE.marginLeft;
    const width = this.layout.contentWidth();

    for (const section of blueprint.sections) {
      const sectionHeader = this.sectionHeader(section.title);
      if (this.layout.shouldBreak(y, sectionHeader.height)) {
        current = this.newPage(blueprint, pages.length + 1);
        pages.push(current);
        y = this.layout.contentTop();
      }
      current.elements.push(...sectionHeader.draw(x, y, width));
      y -= sectionHeader.height;

      for (const component of section.components) {
        const blocks = this.blocks(component, width);
        for (const block of blocks) {
          if (block.height > this.layout.availableHeight()) {
            throw new ApplicationException(
              ERROR_CODES.DOCUMENT_SIZE_LIMIT_EXCEEDED,
              'A document block exceeds the available page height',
              HttpStatus.BAD_REQUEST,
            );
          }
          if (this.layout.shouldBreak(y, block.height)) {
            current = this.newPage(blueprint, pages.length + 1);
            pages.push(current);
            y = this.layout.contentTop();
          }
          current.elements.push(...block.draw(x, y, width));
          y -= block.height;
        }
      }
      y -= 8;
    }

    if (pages.length > DOCUMENT_MAX_PAGES) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_SIZE_LIMIT_EXCEEDED,
        'Document exceeds the maximum number of pages',
        HttpStatus.BAD_REQUEST,
      );
    }

    return { blueprint, pages };
  }

  private blocks(component: DocumentBlueprintComponent, width: number): LayoutBlock[] {
    switch (component.kind) {
      case 'metadata':
        return [this.metadataBlock(component)];
      case 'paragraph':
        return [this.paragraphBlock(component, width)];
      case 'observation':
        return [this.observationBlock(component, width)];
      case 'list':
        return [this.listBlock(component, width)];
      case 'checklist':
        return this.checklistBlocks(component);
      case 'table':
        return this.tableBlocks(component);
      case 'image':
        return [this.imageBlock(component)];
      case 'qrCode':
        return [this.qrBlock(component)];
      case 'signature':
        return [this.signatureComponentBlock(component)];
      case 'signaturePlaceholder':
        return [this.signatureBlock(component)];
    }
  }

  private sectionHeader(title: string): LayoutBlock {
    return {
      component: { id: `section-${title}`, kind: 'paragraph', text: title },
      height: SECTION_TITLE_HEIGHT,
      draw: (x, y, width) => [
        { type: 'text', x, y, text: title, size: 13, bold: true },
        { type: 'line', x1: x, y1: y - 8, x2: x + width, y2: y - 8 },
      ],
    };
  }

  private metadataBlock(component: MetadataComponent): LayoutBlock {
    const height = 10 + component.items.length * LINE_HEIGHT;
    return {
      component,
      height,
      draw: (x, y, width): RenderedElement[] => {
        const elements: RenderedElement[] = [{ type: 'rect', x, y: y - height + 4, width, height }];
        component.items.forEach((item, index) => {
          const lineY = y - 13 - index * LINE_HEIGHT;
          elements.push({
            type: 'text',
            x: x + 8,
            y: lineY,
            text: `${item.label}:`,
            size: 9,
            bold: true,
          });
          elements.push({ type: 'text', x: x + 120, y: lineY, text: item.value, size: 9 });
        });
        return elements;
      },
    };
  }

  private paragraphBlock(component: ParagraphComponent, width: number): LayoutBlock {
    const lines = this.wrap(component.text, width, 10);
    return {
      component,
      height: 8 + lines.length * LINE_HEIGHT,
      draw: (x, y) =>
        lines.map((line, index) => ({
          type: 'text',
          x,
          y: y - index * LINE_HEIGHT,
          text: line,
          size: 10,
          bold: component.emphasis === 'strong',
        })),
    };
  }

  private observationBlock(component: ObservationComponent, width: number): LayoutBlock {
    const lines = this.wrap(component.text, width - 16, 10);
    const height = 18 + lines.length * LINE_HEIGHT;
    return {
      component,
      height,
      draw: (x, y, blockWidth) => [
        { type: 'rect', x, y: y - height + 4, width: blockWidth, height },
        ...lines.map((line, index) => ({
          type: 'text' as const,
          x: x + 8,
          y: y - 14 - index * LINE_HEIGHT,
          text: line,
          size: 10,
        })),
      ],
    };
  }

  private listBlock(component: ListComponent, width: number): LayoutBlock {
    const items = component.items.length > 0 ? component.items : ['Nenhum documento relacionado.'];
    const lines = items.flatMap((item) => this.wrap(`• ${item}`, width, 10));
    return {
      component,
      height: 8 + lines.length * LINE_HEIGHT,
      draw: (x, y) =>
        lines.map((line, index) => ({
          type: 'text',
          x,
          y: y - index * LINE_HEIGHT,
          text: line,
          size: 10,
        })),
    };
  }

  private checklistBlocks(component: ChecklistComponent): LayoutBlock[] {
    const items =
      component.items.length > 0
        ? component.items
        : [{ label: 'Nenhum checklist informado.', done: false, note: null }];
    return items.map((item, index) => ({
      component,
      height: item.note ? 30 : 18,
      draw: (x, y, width) => [
        { type: 'rect', x, y: y - 12, width: 9, height: 9 },
        ...(item.done
          ? [
              { type: 'line' as const, x1: x + 2, y1: y - 8, x2: x + 4, y2: y - 11 },
              { type: 'line' as const, x1: x + 4, y1: y - 11, x2: x + 8, y2: y - 3 },
            ]
          : []),
        {
          type: 'text' as const,
          x: x + 16,
          y: y - 9,
          text: `${index + 1}. ${item.label}`,
          size: 10,
        },
        ...(item.note
          ? this.wrap(item.note, width - 24, 8).map((line, lineIndex) => ({
              type: 'text' as const,
              x: x + 24,
              y: y - 22 - lineIndex * SMALL_LINE_HEIGHT,
              text: line,
              size: 8,
            }))
          : []),
      ],
    }));
  }

  private tableBlocks(component: TableComponent): LayoutBlock[] {
    const headerHeight = 18;
    const rowHeight = 17;
    const rowsPerBlock = this.layout.rowsPerTableBlock(headerHeight, rowHeight);
    const chunks = component.rows.length > 0 ? this.chunk(component.rows, rowsPerBlock) : [[]];
    return chunks.map((rows) => ({
      component,
      height: headerHeight + Math.max(1, rows.length) * rowHeight + 6,
      draw: (x, y, width) =>
        this.tableElements(component, rows, x, y, width, headerHeight, rowHeight),
    }));
  }

  private tableElements(
    component: TableComponent,
    rows: Array<Record<string, string>>,
    x: number,
    y: number,
    width: number,
    headerHeight: number,
    rowHeight: number,
  ): RenderedElement[] {
    const elements: RenderedElement[] = [];
    const widths = component.columns.map((column) =>
      Math.floor(width * (column.width ?? 1 / component.columns.length)),
    );
    const totalWidth = widths.reduce((sum, value) => sum + value, 0);
    widths[widths.length - 1] += width - totalWidth;
    let cursor = x;
    elements.push({ type: 'rect', x, y: y - headerHeight + 4, width, height: headerHeight });
    component.columns.forEach((column, index) => {
      elements.push({
        type: 'text',
        x: cursor + 4,
        y: y - 9,
        text: column.label,
        size: 8,
        bold: true,
      });
      cursor += widths[index];
    });
    const dataRows =
      rows.length > 0
        ? rows
        : [Object.fromEntries(component.columns.map((column) => [column.key, '—']))];
    dataRows.forEach((row, rowIndex) => {
      const rowY = y - headerHeight - rowIndex * rowHeight;
      elements.push({ type: 'line', x1: x, y1: rowY, x2: x + width, y2: rowY });
      cursor = x;
      component.columns.forEach((column, columnIndex) => {
        elements.push({
          type: 'text',
          x: cursor + 4,
          y: rowY - 11,
          text: row[column.key] ?? '—',
          size: 8,
        });
        cursor += widths[columnIndex];
      });
    });
    return elements;
  }

  private imageBlock(component: ImageComponent): LayoutBlock {
    const height = component.image ? 172 : 96;
    return {
      component,
      height,
      draw: (x, y, width): RenderedElement[] => {
        const elements: RenderedElement[] = [
          { type: 'rect', x, y: y - height + 4, width, height },
          {
            type: 'text',
            x: x + 8,
            y: y - 18,
            text: `Imagem: ${component.caption ?? component.sourceId}`,
            size: 10,
            bold: true,
          },
          {
            type: 'text',
            x: x + 8,
            y: y - 34,
            text: `${component.mimeType} · ${component.fileSize} bytes`,
            size: 8,
          },
        ];
        if (component.image) {
          elements.push({
            type: 'image',
            x: x + 8,
            y: y - 160,
            width: Math.min(width - 16, 260),
            height: 112,
            mimeType: component.image.mimeType,
            contentBase64: component.image.contentBase64,
          });
        } else {
          elements.push({
            type: 'text',
            x: x + 8,
            y: y - 52,
            text: 'Conteúdo binário protegido no storage.',
            size: 8,
          });
        }
        return elements;
      },
    };
  }

  private qrBlock(component: QrCodeComponent): LayoutBlock {
    const height = 78;
    return {
      component,
      height,
      draw: (x, y) => [
        { type: 'rect', x, y: y - 66, width: 62, height: 62 },
        { type: 'text', x: x + 74, y: y - 14, text: component.label, size: 10, bold: true },
        { type: 'text', x: x + 74, y: y - 30, text: component.value, size: 8 },
        {
          type: 'text',
          x: x + 74,
          y: y - 46,
          text: 'QR Code lógico preparado no Blueprint.',
          size: 8,
        },
      ],
    };
  }

  private signatureBlock(component: SignaturePlaceholderComponent): LayoutBlock {
    const height = 78;
    return {
      component,
      height,
      draw: (x, y, width) => [
        { type: 'line', x1: x + 60, y1: y - 48, x2: x + width - 60, y2: y - 48 },
        { type: 'text', x: x + 60, y: y - 62, text: component.label, size: 9 },
        {
          type: 'text',
          x: x + 60,
          y: y - 74,
          text: `Estratégia preparada: ${component.strategy}${component.signedAt ? ` · ${component.signedAt}` : ''}`,
          size: 8,
        },
      ],
    };
  }

  private signatureComponentBlock(component: SignatureComponent): LayoutBlock {
    const itemHeight = 96;
    const height = 18 + Math.max(1, component.signatures.length) * itemHeight;
    return {
      component,
      height,
      draw: (x, y, width): RenderedElement[] => {
        const elements: RenderedElement[] = [];
        elements.push({
          type: 'text',
          x,
          y: y - 4,
          text: `Modo de assinatura: ${component.mode}`,
          size: 8,
        });
        component.signatures.forEach((signature, index) => {
          const top = y - 18 - index * itemHeight;
          const centerX = x + width / 2;
          if (signature.image) {
            elements.push({
              type: 'image',
              x: centerX - 95,
              y: top - 42,
              width: 190,
              height: 44,
              mimeType: signature.image.mimeType,
              contentBase64: signature.image.contentBase64,
            });
          } else {
            elements.push({
              type: 'text',
              x: centerX - 80,
              y: top - 28,
              text: 'Assinatura coletada manualmente',
              size: 8,
            });
          }
          elements.push({
            type: 'line',
            x1: x + 70,
            y1: top - 54,
            x2: x + width - 70,
            y2: top - 54,
          });
          elements.push({
            type: 'text',
            x: x + 70,
            y: top - 68,
            text: signature.name ?? signature.label,
            size: 9,
            bold: true,
          });
          elements.push({
            type: 'text',
            x: x + 70,
            y: top - 81,
            text: [
              signature.title,
              signature.caption,
              signature.signedAt ? `Data: ${signature.signedAt}` : null,
            ]
              .filter(Boolean)
              .join(' · '),
            size: 8,
          });
        });
        return elements;
      },
    };
  }

  private newPage(blueprint: DocumentBlueprint, pageNumber: number): RenderedPage {
    return {
      pageNumber,
      elements: [
        {
          type: 'text',
          x: DOCUMENT_PAGE.marginLeft,
          y: DOCUMENT_PAGE.height - 34,
          text: blueprint.header.organizationName,
          size: 11,
          bold: true,
        },
        {
          type: 'text',
          x: DOCUMENT_PAGE.marginLeft,
          y: DOCUMENT_PAGE.height - 50,
          text: blueprint.header.title,
          size: 16,
          bold: true,
        },
        {
          type: 'text',
          x: DOCUMENT_PAGE.width - 190,
          y: DOCUMENT_PAGE.height - 50,
          text: blueprint.header.documentNumber,
          size: 10,
          bold: true,
        },
        {
          type: 'line',
          x1: DOCUMENT_PAGE.marginLeft,
          y1: DOCUMENT_PAGE.height - DOCUMENT_PAGE.headerHeight,
          x2: DOCUMENT_PAGE.width - DOCUMENT_PAGE.marginRight,
          y2: DOCUMENT_PAGE.height - DOCUMENT_PAGE.headerHeight,
        },
        {
          type: 'line',
          x1: DOCUMENT_PAGE.marginLeft,
          y1: DOCUMENT_PAGE.marginBottom,
          x2: DOCUMENT_PAGE.width - DOCUMENT_PAGE.marginRight,
          y2: DOCUMENT_PAGE.marginBottom,
        },
        {
          type: 'text',
          x: DOCUMENT_PAGE.marginLeft,
          y: DOCUMENT_PAGE.marginBottom - 18,
          text: blueprint.footer.content,
          size: 8,
        },
        {
          type: 'text',
          x: DOCUMENT_PAGE.width - 92,
          y: DOCUMENT_PAGE.marginBottom - 18,
          text: `Página ${pageNumber}`,
          size: 8,
        },
      ],
    };
  }

  private wrap(text: string, width: number, fontSize: number): string[] {
    return this.layout.wrapText(text, width, fontSize);
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size)
      chunks.push(items.slice(index, index + size));
    return chunks;
  }
}
