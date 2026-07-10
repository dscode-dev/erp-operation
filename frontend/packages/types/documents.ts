import type { DocumentTemplateType } from "./index";

export type DocumentKind = DocumentTemplateType;

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  BUDGET: "Orçamento",
  QUOTE: "Orçamento",
  WORK_ORDER: "Ordem de Serviço",
  RECEIPT: "Recibo",
  REPORT: "Relatório legado",
  TECHNICAL_REPORT: "Relatório de Visita Técnica",
  TECHNICAL_OPINION: "Laudo Técnico",
  PMOC: "PMOC",
};

export type DocumentComponent =
  | { id: string; kind: "metadata"; items: Array<{ label: string; value: string }>; keepTogether?: boolean }
  | { id: string; kind: "paragraph"; text: string; emphasis?: "normal" | "strong"; keepTogether?: boolean }
  | {
      id: string;
      kind: "table";
      columns: Array<{ key: string; label: string; width?: number }>;
      rows: Array<Record<string, string>>;
      keepTogether?: boolean;
    }
  | { id: string; kind: "list"; items: string[]; keepTogether?: boolean }
  | {
      id: string;
      kind: "image";
      sourceId: string;
      caption: string | null;
      mimeType: string;
      fileSize: number;
      keepTogether?: boolean;
    }
  | { id: string; kind: "qrCode"; label: string; value: string; keepTogether?: boolean }
  | {
      id: string;
      kind: "checklist";
      items: Array<{ label: string; done: boolean; note: string | null }>;
      keepTogether?: boolean;
    }
  | {
      id: string;
      kind: "signaturePlaceholder";
      label: string;
      strategy: "none" | "fixed" | "collected" | "hybrid";
      signedAt: string | null;
      keepTogether?: boolean;
    }
  | {
      id: string;
      kind: "signature";
      mode: "NONE" | "FIXED" | "COLLECTED" | "HYBRID";
      signatures: Array<{
        id: string;
        role: "fixed" | "collected";
        label: string;
        name: string | null;
        title: string | null;
        signedAt: string | null;
        caption: string | null;
        image?: { mimeType: string; fileSize: number; contentBase64: string } | null;
      }>;
      keepTogether?: boolean;
    }
  | { id: string; kind: "observation"; text: string; keepTogether?: boolean };

export type DocumentBlueprint = {
  version: "1.0";
  metadata: {
    operationId: string | null;
    budgetId?: string | null;
    documentId: string | null;
    documentType: DocumentKind;
    documentNumber: string;
    generatedAt: string;
    locale: "pt-BR";
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
  };
  header: {
    title: string;
    subtitle?: string;
    organizationName: string;
    documentNumber: string;
  };
  footer: { content: string; generatedAt: string };
  sections: Array<{
    id: string;
    title: string;
    critical?: boolean;
    components: DocumentComponent[];
  }>;
};

export type DocumentRenderResult = {
  id: string;
  operationId: string | null;
  budgetId?: string | null;
  type: DocumentKind;
  number: string;
  status: "DRAFT" | "READY" | "VALIDATED" | "SENT";
  mimeType: string | null;
  fileSize: number | null;
  renderedAt: string | null;
  renderMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  downloadReady: boolean;
};

export type DocumentDownloadResult = DocumentRenderResult & {
  contentBase64: string;
};

export function documentDataUrl(download: DocumentDownloadResult): string {
  return `data:${download.mimeType ?? "application/pdf"};base64,${download.contentBase64}`;
}
