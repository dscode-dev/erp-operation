import { Injectable } from '@nestjs/common';

export interface TextMeasureInput {
  text: string;
  width: number;
  fontSize: number;
  lineHeight?: number;
}

@Injectable()
export class DocumentMeasureService {
  measureText(input: TextMeasureInput): { lineCount: number; height: number; lines: string[] } {
    const lineHeight = input.lineHeight ?? input.fontSize * 1.3;
    const lines = this.wrap(input.text, input.width, input.fontSize);
    return { lineCount: lines.length, height: lines.length * lineHeight, lines };
  }

  measureTable(rowCount: number, rowHeight: number, headerHeight: number): number {
    return headerHeight + Math.max(1, rowCount) * rowHeight;
  }

  measureImage(maxHeight: number): number {
    return maxHeight;
  }

  measureList(itemCount: number, lineHeight: number): number {
    return Math.max(1, itemCount) * lineHeight;
  }

  measureChecklist(itemCount: number, itemHeight: number): number {
    return Math.max(1, itemCount) * itemHeight;
  }

  wrap(text: string, width: number, fontSize: number): string[] {
    const maxChars = Math.max(4, Math.floor(width / (fontSize * 0.52)));
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const sourceWord of words) {
      let word = sourceWord;
      if (word.length > maxChars) {
        if (current) {
          lines.push(current);
          current = '';
        }
        while (word.length > maxChars) {
          lines.push(word.slice(0, maxChars));
          word = word.slice(maxChars);
        }
        if (!word) continue;
      }
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [''];
  }
}
