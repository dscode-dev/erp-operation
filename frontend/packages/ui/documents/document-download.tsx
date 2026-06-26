"use client";

/**
 * DocumentDownload — downloads a backend-generated document. Disabled until the
 * document is `ready`. Handles both base64 payloads and direct URLs.
 */
import { Download } from "lucide-react";
import type { GeneratedDocument } from "@erp/types";
import { toDataUrl } from "@erp/types";

export function DocumentDownload({
  document: doc,
  label = "Baixar PDF",
  variant = "primary",
}: {
  document: GeneratedDocument;
  label?: string;
  variant?: "primary" | "ghost";
}) {
  const ready = doc.status === "ready";
  const href = ready ? toDataUrl(doc) : null;
  const fileName = doc.content?.fileName ?? `${doc.title}.pdf`;

  const base = "inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 h-9 text-sm font-medium transition-shadow disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]"
      : "border border-[var(--color-border)] hover:bg-[var(--color-muted)]";

  function handleDownload() {
    if (!href) return;
    const a = window.document.createElement("a");
    a.href = href;
    a.download = fileName;
    a.click();
  }

  return (
    <button type="button" onClick={handleDownload} disabled={!ready} className={`${base} ${styles}`}>
      <Download className="h-4 w-4" />
      {label}
    </button>
  );
}
