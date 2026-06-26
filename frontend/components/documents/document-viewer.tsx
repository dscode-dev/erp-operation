"use client";

/**
 * DocumentViewer — the reusable shell for the future document flow:
 *   review (metadata + fields) → preview (PDF) → download.
 *
 * Sprint 1 wires the architecture; the backend will supply the rendered PDF.
 * `reviewFields` lets a caller surface the data that fed the document so the
 * user can review before/after generation.
 */
import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import type { GeneratedDocument } from "@/lib/documents/types";
import { DOCUMENT_KIND_LABEL } from "@/lib/documents/types";
import { DocumentPreview } from "./document-preview";
import { DocumentDownload } from "./document-download";

const STATUS_LABEL: Record<GeneratedDocument["status"], { label: string; cls: string }> = {
  draft: { label: "Rascunho", cls: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]" },
  pending_signature: { label: "Aguardando assinatura", cls: "bg-[var(--color-pending)]/15 text-[var(--color-pending)]" },
  generating: { label: "Gerando", cls: "bg-[var(--color-info)]/12 text-[var(--color-info)]" },
  ready: { label: "Pronto", cls: "bg-[var(--color-success)]/12 text-[var(--color-success)]" },
  error: { label: "Erro", cls: "bg-[var(--color-danger)]/12 text-[var(--color-danger)]" },
};

export type ReviewField = { label: string; value: ReactNode };

export function DocumentViewer({
  document: doc,
  reviewFields,
  actions,
}: {
  document: GeneratedDocument;
  reviewFields?: ReviewField[];
  actions?: ReactNode;
}) {
  const status = STATUS_LABEL[doc.status];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Preview */}
      <div className="order-2 lg:order-1">
        <DocumentPreview document={doc} />
      </div>

      {/* Review panel */}
      <aside className="order-1 lg:order-2 space-y-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 grid place-items-center text-[var(--color-primary)]">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-caption uppercase tracking-wider">{DOCUMENT_KIND_LABEL[doc.kind]}</div>
              <div className="font-medium truncate">{doc.title}</div>
            </div>
          </div>
          <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${status.cls}`}>
            {status.label}
          </span>

          {reviewFields && reviewFields.length > 0 && (
            <dl className="mt-4 space-y-2">
              {reviewFields.map((f) => (
                <div key={f.label} className="flex items-start justify-between gap-4 text-sm">
                  <dt className="text-caption">{f.label}</dt>
                  <dd className="text-right">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <DocumentDownload document={doc} />
          {actions}
        </div>

        <p className="text-[11px] text-[var(--color-muted-foreground)]">
          A geração do documento é realizada exclusivamente pelo backend. Esta tela apenas
          revisa, pré-visualiza e disponibiliza o download.
        </p>
      </aside>
    </div>
  );
}
