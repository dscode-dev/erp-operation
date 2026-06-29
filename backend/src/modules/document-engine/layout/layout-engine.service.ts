import { Injectable } from '@nestjs/common';
import { DOCUMENT_PAGE } from '../../../shared/constants/document-engine.constants';
import { DocumentMeasureService } from '../measurement/document-measure.service';

export interface PrintableArea {
  x: number;
  topY: number;
  bottomY: number;
  width: number;
  height: number;
}

@Injectable()
export class LayoutEngine {
  constructor(private readonly measure: DocumentMeasureService) {}

  printableArea(): PrintableArea {
    const x = DOCUMENT_PAGE.marginLeft;
    const topY = DOCUMENT_PAGE.height - DOCUMENT_PAGE.headerHeight - 24;
    const bottomY = DOCUMENT_PAGE.marginBottom + DOCUMENT_PAGE.footerHeight;
    return {
      x,
      topY,
      bottomY,
      width: DOCUMENT_PAGE.width - DOCUMENT_PAGE.marginLeft - DOCUMENT_PAGE.marginRight,
      height: topY - bottomY,
    };
  }

  contentTop(): number {
    return this.printableArea().topY;
  }

  contentBottom(): number {
    return this.printableArea().bottomY;
  }

  contentWidth(): number {
    return this.printableArea().width;
  }

  availableHeight(): number {
    return this.printableArea().height;
  }

  shouldBreak(currentY: number, blockHeight: number): boolean {
    return currentY - blockHeight < this.contentBottom();
  }

  rowsPerTableBlock(headerHeight: number, rowHeight: number): number {
    return Math.max(1, Math.floor((this.availableHeight() - headerHeight) / rowHeight));
  }

  wrapText(text: string, width: number, fontSize: number): string[] {
    return this.measure.wrap(text, width, fontSize);
  }
}
