import { HttpStatus, Injectable } from '@nestjs/common';
import { deflateSync, inflateSync } from 'node:zlib';
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
      const imageResources: Array<{ name: string; objectId: number }> = [];
      page.elements
        .filter((element) => element.type === 'image')
        .forEach((element, index) => {
          imageResources.push({
            name: `Im${index + 1}`,
            objectId: this.add(objects, this.imageObject(element.mimeType, element.contentBase64)),
          });
        });
      const content = this.contentStream(page.elements, imageResources.map((resource) => resource.name));
      const contentId = this.add(
        objects,
        `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`,
      );
      const xObjects =
        imageResources.length > 0
          ? `/XObject << ${imageResources.map((resource) => `/${resource.name} ${resource.objectId} 0 R`).join(' ')} >>`
          : '';
      const pageId = this.add(
        objects,
        [
          '<< /Type /Page',
          '/Parent 2 0 R',
          `/MediaBox [0 0 ${DOCUMENT_PAGE.width.toFixed(2)} ${DOCUMENT_PAGE.height.toFixed(2)}]`,
          `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> ${xObjects} >>`,
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
    const buffer = Buffer.from(pdf, 'latin1');
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

  private contentStream(elements: RenderedElement[], imageNames: string[]): string {
    const commands: string[] = ['q', '0.35 w'];
    let imageIndex = 0;
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
      } else if (element.type === 'rect') {
        commands.push(
          `${this.n(element.x)} ${this.n(element.y)} ${this.n(element.width)} ${this.n(element.height)} re S`,
        );
      } else {
        const name = imageNames[imageIndex] ?? `Im${imageIndex + 1}`;
        imageIndex += 1;
        commands.push(
          'q',
          `${this.n(element.width)} 0 0 ${this.n(element.height)} ${this.n(element.x)} ${this.n(element.y)} cm`,
          `/${name} Do`,
          'Q',
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
      offsets.push(Buffer.byteLength(output, 'latin1'));
      output += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(output, 'latin1');
    output += `xref\n0 ${objects.length + 1}\n`;
    output += '0000000000 65535 f \n';
    for (let index = 1; index < offsets.length; index += 1) {
      output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }
    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return output;
  }

  private escape(value: string): string {
    return this.toPdfLatin1Text(value)
      .split('')
      .filter((char) => {
        const code = char.charCodeAt(0);
        return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127 && code <= 255);
      })
      .join('')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private toPdfLatin1Text(value: string): string {
    const replacements: Record<string, string> = {
      '—': '-',
      '–': '-',
      '−': '-',
      '“': '"',
      '”': '"',
      '‘': "'",
      '’': "'",
      '…': '...',
      '•': '-',
      '™': 'TM',
      '®': '(R)',
      '©': '(C)',
    };
    return value
      .normalize('NFKC')
      .split('')
      .map((char) => {
        if (replacements[char]) return replacements[char];
        const code = char.charCodeAt(0);
        if (code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127 && code <= 255)) return char;
        return '?';
      })
      .join('');
  }

  private n(value: number): string {
    return value.toFixed(2);
  }

  private imageObject(mimeType: string, contentBase64: string): string {
    const buffer = Buffer.from(contentBase64, 'base64');
    if (mimeType === 'image/jpeg') return this.jpegObject(buffer);
    if (mimeType === 'image/png') return this.pngObject(buffer);
    throw new ApplicationException(
      ERROR_CODES.UPLOAD_INVALID_MIME_TYPE,
      'Document image MIME type is not supported by the PDF engine',
      HttpStatus.BAD_REQUEST,
    );
  }

  private jpegObject(buffer: Buffer): string {
    const dimensions = this.jpegDimensions(buffer);
    return [
      '<< /Type /XObject /Subtype /Image',
      `/Width ${dimensions.width}`,
      `/Height ${dimensions.height}`,
      '/ColorSpace /DeviceRGB',
      '/BitsPerComponent 8',
      '/Filter /DCTDecode',
      `/Length ${buffer.length} >>`,
      'stream',
      buffer.toString('latin1'),
      'endstream',
    ].join('\n');
  }

  private pngObject(buffer: Buffer): string {
    const png = this.decodePng(buffer);
    const compressed = deflateSync(png.rgb);
    return [
      '<< /Type /XObject /Subtype /Image',
      `/Width ${png.width}`,
      `/Height ${png.height}`,
      '/ColorSpace /DeviceRGB',
      '/BitsPerComponent 8',
      '/Filter /FlateDecode',
      `/Length ${compressed.length} >>`,
      'stream',
      compressed.toString('latin1'),
      'endstream',
    ].join('\n');
  }

  private jpegDimensions(buffer: Buffer): { width: number; height: number } {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
    throw new ApplicationException(
      ERROR_CODES.DOCUMENT_RENDER_FAILED,
      'Unable to read JPEG signature dimensions',
      HttpStatus.BAD_REQUEST,
    );
  }

  private decodePng(buffer: Buffer): { width: number; height: number; rgb: Buffer } {
    if (!buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      throw new ApplicationException(
        ERROR_CODES.DOCUMENT_RENDER_FAILED,
        'Invalid PNG signature asset',
        HttpStatus.BAD_REQUEST,
      );
    }
    let offset = 8;
    let width = 0;
    let height = 0;
    let colorType = 0;
    const idat: Buffer[] = [];
    while (offset < buffer.length) {
      const length = buffer.readUInt32BE(offset);
      const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
      const data = buffer.subarray(offset + 8, offset + 8 + length);
      if (type === 'IHDR') {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        const bitDepth = data[8];
        colorType = data[9];
        if (bitDepth !== 8 || ![0, 2, 4, 6].includes(colorType)) {
          throw new ApplicationException(
            ERROR_CODES.DOCUMENT_RENDER_FAILED,
            'Unsupported PNG signature format',
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (type === 'IDAT') {
        idat.push(data);
      } else if (type === 'IEND') {
        break;
      }
      offset += 12 + length;
    }
    const channels = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
    const inflated = inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const rows: Buffer[] = [];
    let cursor = 0;
    let previous: Buffer<ArrayBufferLike> = Buffer.alloc(stride);
    for (let row = 0; row < height; row += 1) {
      const filter = inflated[cursor];
      const scanline = Buffer.from(inflated.subarray(cursor + 1, cursor + 1 + stride));
      const recon = this.unfilterPngRow(filter, scanline, previous, channels);
      rows.push(recon);
      previous = recon;
      cursor += 1 + stride;
    }
    const rgb = Buffer.alloc(width * height * 3);
    rows.forEach((row, rowIndex) => {
      for (let col = 0; col < width; col += 1) {
        const source = col * channels;
        const target = (rowIndex * width + col) * 3;
        if (colorType === 0 || colorType === 4) {
          rgb[target] = row[source];
          rgb[target + 1] = row[source];
          rgb[target + 2] = row[source];
        } else {
          rgb[target] = row[source];
          rgb[target + 1] = row[source + 1];
          rgb[target + 2] = row[source + 2];
        }
      }
    });
    return { width, height, rgb };
  }

  private unfilterPngRow(filter: number, row: Buffer, previous: Buffer, bytesPerPixel: number): Buffer {
    const output = Buffer.alloc(row.length);
    for (let index = 0; index < row.length; index += 1) {
      const left = index >= bytesPerPixel ? output[index - bytesPerPixel] : 0;
      const up = previous[index] ?? 0;
      const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
      const value = row[index];
      if (filter === 0) output[index] = value;
      else if (filter === 1) output[index] = (value + left) & 0xff;
      else if (filter === 2) output[index] = (value + up) & 0xff;
      else if (filter === 3) output[index] = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) output[index] = (value + this.paeth(left, up, upLeft)) & 0xff;
      else
        throw new ApplicationException(
          ERROR_CODES.DOCUMENT_RENDER_FAILED,
          'Unsupported PNG filter',
          HttpStatus.BAD_REQUEST,
        );
    }
    return output;
  }

  private paeth(left: number, up: number, upLeft: number): number {
    const estimate = left + up - upLeft;
    const distanceLeft = Math.abs(estimate - left);
    const distanceUp = Math.abs(estimate - up);
    const distanceUpLeft = Math.abs(estimate - upLeft);
    if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
    if (distanceUp <= distanceUpLeft) return up;
    return upLeft;
  }
}
