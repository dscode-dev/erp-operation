import type { DocumentTemplateType } from '@prisma/client';
import type { SignatureMode } from '@prisma/client';

export type DocumentComponentKind =
  | 'metadata'
  | 'paragraph'
  | 'table'
  | 'list'
  | 'image'
  | 'qrCode'
  | 'checklist'
  | 'signature'
  | 'signaturePlaceholder'
  | 'observation';

export interface DocumentMetadata {
  operationId: string;
  documentId: string | null;
  documentType: DocumentTemplateType;
  documentNumber: string;
  generatedAt: string;
  locale: 'pt-BR';
  timezone: string;
  currency: string;
  organization: {
    legalName: string;
    tradeName: string;
    cnpj: string;
    email: string;
    phone: string;
    city: string;
    state: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

export interface DocumentHeader {
  title: string;
  subtitle?: string;
  organizationName: string;
  documentNumber: string;
}

export interface DocumentFooter {
  content: string;
  generatedAt: string;
}

export interface BlueprintBaseComponent {
  id: string;
  kind: DocumentComponentKind;
  keepTogether?: boolean;
}

export interface MetadataComponent extends BlueprintBaseComponent {
  kind: 'metadata';
  items: Array<{ label: string; value: string }>;
}

export interface ParagraphComponent extends BlueprintBaseComponent {
  kind: 'paragraph';
  text: string;
  emphasis?: 'normal' | 'strong';
}

export interface TableComponent extends BlueprintBaseComponent {
  kind: 'table';
  columns: Array<{ key: string; label: string; width?: number }>;
  rows: Array<Record<string, string>>;
}

export interface ListComponent extends BlueprintBaseComponent {
  kind: 'list';
  items: string[];
}

export interface ImageComponent extends BlueprintBaseComponent {
  kind: 'image';
  sourceId: string;
  caption: string | null;
  mimeType: string;
  fileSize: number;
}

export interface QrCodeComponent extends BlueprintBaseComponent {
  kind: 'qrCode';
  label: string;
  value: string;
}

export interface ChecklistComponent extends BlueprintBaseComponent {
  kind: 'checklist';
  items: Array<{ label: string; done: boolean; note: string | null }>;
}

export interface SignaturePlaceholderComponent extends BlueprintBaseComponent {
  kind: 'signaturePlaceholder';
  label: string;
  strategy: 'none' | 'fixed' | 'collected' | 'hybrid';
  signedAt: string | null;
}

export interface SignatureComponent extends BlueprintBaseComponent {
  kind: 'signature';
  mode: SignatureMode;
  signatures: Array<{
    id: string;
    role: 'fixed' | 'collected';
    label: string;
    name: string | null;
    title: string | null;
    signedAt: string | null;
    caption: string | null;
    image?: {
      mimeType: string;
      fileSize: number;
      contentBase64: string;
    } | null;
  }>;
}

export interface ObservationComponent extends BlueprintBaseComponent {
  kind: 'observation';
  text: string;
}

export type DocumentBlueprintComponent =
  | MetadataComponent
  | ParagraphComponent
  | TableComponent
  | ListComponent
  | ImageComponent
  | QrCodeComponent
  | ChecklistComponent
  | SignatureComponent
  | SignaturePlaceholderComponent
  | ObservationComponent;

export interface DocumentSection {
  id: string;
  title: string;
  critical?: boolean;
  components: DocumentBlueprintComponent[];
}

export interface DocumentBlueprint {
  version: '1.0';
  metadata: DocumentMetadata;
  header: DocumentHeader;
  footer: DocumentFooter;
  sections: DocumentSection[];
}
