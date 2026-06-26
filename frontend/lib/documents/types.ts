/**
 * Document model — architecture only (Sprint 1).
 *
 * Generation is the backend's exclusive responsibility. The frontend prepares
 * the reusable view layer for the future flow:
 *
 *   Operador → preenche formulário → assinatura → backend monta documento
 *           → frontend recebe PDF → preview → download
 *
 * Nothing here generates a document. These types describe what the frontend
 * will receive and render once the backend document endpoints exist.
 */
import type { DocumentTemplateType } from "@/lib/api";

/** Mirrors the backend DocumentTemplateType (PMOC, Orçamento, Recibo, Laudo…). */
export type DocumentKind = DocumentTemplateType;

export const DOCUMENT_KIND_LABEL: Record<DocumentKind, string> = {
  QUOTE: "Orçamento",
  WORK_ORDER: "Ordem de Serviço",
  RECEIPT: "Recibo",
  REPORT: "Relatório",
  TECHNICAL_REPORT: "Laudo Técnico",
  PMOC: "PMOC",
};

/** Lifecycle of a document as seen by the frontend. */
export type DocumentStatus =
  | "draft" // form not yet submitted
  | "pending_signature" // awaiting in-field signature
  | "generating" // backend is assembling the PDF
  | "ready" // PDF received, can preview/download
  | "error"; // generation failed

/**
 * A document produced (or to be produced) by the backend.
 * `content` carries the rendered file once `status === "ready"`. The frontend
 * never fills `content` itself — it only renders what the backend returns.
 */
export type GeneratedDocument = {
  id: string;
  kind: DocumentKind;
  title: string;
  status: DocumentStatus;
  /** ISO timestamp of generation, when available. */
  generatedAt?: string | null;
  /** Rendered file payload (provided by the backend when ready). */
  content?: {
    mimeType: string; // typically application/pdf
    /** base64 of the rendered file, or a fetchable URL — backend's choice. */
    base64?: string;
    url?: string;
    fileName: string;
  } | null;
  /** Reason when status === "error". */
  error?: string | null;
};

/** Build a browser data URL from a ready document's base64 content. */
export function toDataUrl(doc: GeneratedDocument): string | null {
  if (doc.content?.url) return doc.content.url;
  if (doc.content?.base64 && doc.content.mimeType) {
    return `data:${doc.content.mimeType};base64,${doc.content.base64}`;
  }
  return null;
}
