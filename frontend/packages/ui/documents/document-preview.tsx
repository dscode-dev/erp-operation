"use client";

/**
 * DocumentPreview — renders a backend-generated PDF (or shows the appropriate
 * lifecycle placeholder). Reusable across Orçamento, Recibo, Laudo, PMOC, etc.
 *
 * Architecture only: this component never generates content. It renders what
 * the backend provides via `GeneratedDocument.content`.
 */
import { FileText, Loader2, AlertTriangle, PenLine } from "lucide-react";
import type { GeneratedDocument } from "@erp/types";
import { DOCUMENT_KIND_LABEL, toDataUrl } from "@erp/types";

export function DocumentPreview({
  document,
  className = "",
  height = 520,
}: {
  document: GeneratedDocument;
  className?: string;
  height?: number;
}) {
  const dataUrl = document.status === "ready" ? toDataUrl(document) : null;
  const kindLabel = DOCUMENT_KIND_LABEL[document.kind];

  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-muted)]/30 overflow-hidden ${className}`}
      style={{ height }}
    >
      {dataUrl ? (
        <object data={dataUrl} type={document.content?.mimeType ?? "application/pdf"} className="h-full w-full">
          <Placeholder
            icon={FileText}
            title="Pré-visualização indisponível"
            description="Seu navegador não conseguiu exibir o PDF. Use o botão de download."
          />
        </object>
      ) : (
        <PreviewPlaceholder document={document} kindLabel={kindLabel} />
      )}
    </div>
  );
}

function PreviewPlaceholder({
  document,
  kindLabel,
}: {
  document: GeneratedDocument;
  kindLabel: string;
}) {
  switch (document.status) {
    case "generating":
      return (
        <Placeholder
          icon={Loader2}
          spin
          title="Gerando documento…"
          description={`O backend está montando o ${kindLabel}. Isso leva alguns instantes.`}
        />
      );
    case "pending_signature":
      return (
        <Placeholder
          icon={PenLine}
          title="Aguardando assinatura"
          description="O documento será gerado após a coleta da assinatura em campo."
        />
      );
    case "error":
      return (
        <Placeholder
          icon={AlertTriangle}
          tone="danger"
          title="Falha na geração"
          description={document.error ?? "Não foi possível gerar o documento. Tente novamente."}
        />
      );
    default:
      return (
        <Placeholder
          icon={FileText}
          title={`${kindLabel} ainda não gerado`}
          description="A geração do documento é responsabilidade do backend e será disponibilizada aqui."
        />
      );
  }
}

function Placeholder({
  icon: Icon,
  title,
  description,
  spin = false,
  tone = "muted",
}: {
  icon: typeof FileText;
  title: string;
  description?: string;
  spin?: boolean;
  tone?: "muted" | "danger";
}) {
  const color = tone === "danger" ? "text-[var(--color-danger)]" : "text-[var(--color-muted-foreground)]";
  return (
    <div className="h-full w-full grid place-items-center p-8 text-center">
      <div>
        <Icon className={`mx-auto h-8 w-8 ${color} ${spin ? "animate-spin" : ""}`} />
        <h4 className="mt-3 font-medium">{title}</h4>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)] max-w-sm mx-auto">{description}</p>
        )}
      </div>
    </div>
  );
}
