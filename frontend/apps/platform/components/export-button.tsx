"use client";

/**
 * ExportButton — exports the current on-screen rows.
 *
 * CSV is produced client-side now. PDF is listed as "via backend" because
 * formatted document generation is the backend's responsibility (Sprint 2+);
 * the option is present so the flow is wired and discoverable.
 */
import { useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { exportCsv } from "@erp/utils";

export function ExportButton<T extends Record<string, unknown>>({
  rows,
  fileName,
  columns,
  label = "Exportar",
  disabled = false,
}: {
  rows: T[];
  fileName: string;
  columns?: string[];
  label?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function handleCsv() {
    exportCsv(rows as Array<Record<string, unknown>>, fileName, columns);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || rows.length === 0}
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 h-9 text-sm hover:bg-[var(--color-muted)] disabled:opacity-50"
      >
        <Download className="h-4 w-4" /> {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-floating)] p-1.5 z-20 animate-slide-up">
          <button
            type="button"
            onClick={handleCsv}
            className="w-full inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm hover:bg-[var(--color-muted)]"
          >
            <FileSpreadsheet className="h-4 w-4" /> Planilha (CSV)
          </button>
          <button
            type="button"
            disabled
            title="A geração de PDF é feita pelo backend (em breve)."
            className="w-full inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-muted-foreground)] opacity-60 cursor-not-allowed"
          >
            <FileText className="h-4 w-4" /> PDF
            <span className="ml-auto text-[9px] uppercase tracking-wider rounded bg-[var(--color-muted)] px-1.5 py-0.5">backend</span>
          </button>
        </div>
      )}
    </div>
  );
}
