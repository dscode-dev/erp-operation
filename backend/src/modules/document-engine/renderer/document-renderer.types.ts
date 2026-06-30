import type {
  DocumentBlueprint,
  DocumentBlueprintComponent,
} from '../blueprint/document-blueprint.types';

export interface RenderedTextLine {
  type: 'text';
  text: string;
  x: number;
  y: number;
  size: number;
  bold?: boolean;
}

export interface RenderedRect {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderedLine {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RenderedImage {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  mimeType: string;
  contentBase64: string;
}

export type RenderedElement = RenderedTextLine | RenderedRect | RenderedLine | RenderedImage;

export interface RenderedPage {
  pageNumber: number;
  elements: RenderedElement[];
}

export interface RenderedDocument {
  blueprint: DocumentBlueprint;
  pages: RenderedPage[];
}

export interface LayoutBlock {
  component: DocumentBlueprintComponent;
  height: number;
  draw: (x: number, y: number, width: number) => RenderedElement[];
  splittable?: boolean;
}
