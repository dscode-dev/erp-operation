import { HttpStatus, Injectable } from '@nestjs/common';
import {
  DOCUMENT_MAX_PDF_BYTES,
  DOCUMENT_PAGE,
} from '../../../shared/constants/document-engine.constants';
import { ERROR_CODES } from '../../../shared/constants/error-codes.constants';
import { ApplicationException } from '../../../shared/exceptions/application.exception';
import type { RenderedDocument, RenderedElement } from '../renderer/document-renderer.types';

export interface PdfEngineResult {
  buffer: Buffer;
  pageCount: number;
}

@Injectable()
export class PdfEngineService {
  create(rendered: RenderedDocument): PdfEngineResult {
    const objects: string[] = [];
    const pageRefs: number[] = [];

    const catalogId = this.add(objects, '<< /Type /Catalog /Pages 2 0 R >>');
    void catalogId;
    this.add(objects, 'PAGES_PLACEHOLDER');
    const fontRegularId = this.add(
      objects,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    );
    const fontBoldId = this.add(
      objects,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    );

    for (const page of rendered.pages) {
      const content = this.contentStream(page.elements);
      const contentId = this.add(
        objects,
        `<< /Length ${Buffer.byteLength(content, 'binary')} >>\nstream\n${content}\nendstream`,
      );
      const pageId = this.add(
        objects,
        [
          '<< /Type /Page',
          '/Parent 2 0 R',
          `/MediaBox [0 0 ${DOCUMENT_PAGE.width.toFixed(2)} ${DOCUMENT_PAGE.height.toFixed(2)}]`,
          `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >>`,
          `/Contents ${contentId} 0 R`,
          '>>',
        ].join(' '),
      );
      pageRefs.push(pageId);
    }

    objects[1] = `<< /Type /Pages /Kids [${pageRefs.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageRefs.length} >>`;
    const infoId = this.add(
      objects,
      [
        '<<',
        `/Title (${this.escape(rendered.blueprint.header.title)})`,
        `/Author (${this.escape(rendered.blueprint.metadata.organization.tradeName)})`,
        `/Subject (${this.escape(rendered.blueprint.metadata.documentNumber)})`,
        `/Creator (ERP Operation Document Engine)`,
        `/Producer (ERP Operation Direct PDF Engine)`,
        '>>',
      ].join(' '),
    );

    const pdf = this.serialize(objects, infoId);
    const buffer = Buffer.from(pdf, 'binary');
    if (buffer.length > DOCUMENT_MAX_PDF_BYTES) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_SIZE_LIMIT_EXCEEDED,
        'Rendered PDF exceeds the maximum allowed size',
        HttpStatus.BAD_REQUEST,
      );
    }
    return { buffer, pageCount: rendered.pages.length };
  }

  private add(objects: string[], content: string): number {
    objects.push(content);
    return objects.length;
  }

  private contentStream(elements: RenderedElement[]): string {
    const commands: string[] = ['q', '0.35 w'];
    for (const element of elements) {
      if (element.type === 'text') {
        commands.push(
          'BT',
          `/${element.bold ? 'F2' : 'F1'} ${element.size} Tf`,
          `${this.n(element.x)} ${this.n(element.y)} Td`,
          `(${this.escape(element.text)}) Tj`,
          'ET',
        );
      } else if (element.type === 'line') {
        commands.push(
          `${this.n(element.x1)} ${this.n(element.y1)} m ${this.n(element.x2)} ${this.n(element.y2)} l S`,
        );
      } else {
        commands.push(
          `${this.n(element.x)} ${this.n(element.y)} ${this.n(element.width)} ${this.n(element.height)} re S`,
        );
      }
    }
    commands.push('Q');
    return commands.join('\n');
  }

  private serialize(objects: string[], infoId: number): string {
    let output = '%PDF-1.7\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(output, 'binary'));
      output += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(output, 'binary');
    output += `xref\n0 ${objects.length + 1}\n`;
    output += '0000000000 65535 f \n';
    for (let index = 1; index < offsets.length; index += 1) {
      output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }
    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return output;
  }

  private escape(value: string): string {
    return value
      .split('')
      .filter((char) => {
        const code = char.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
      })
      .join('')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private n(value: number): string {
    return value.toFixed(2);
  }
}
