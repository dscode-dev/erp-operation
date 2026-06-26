"use client";

import { ChevronLeft, X } from "lucide-react";
import { Stepper } from "./stepper";

/** Sticky header for a wizard: back/close + step counter + segmented progress. */
export function WizardProgressHeader({
  title,
  current,
  total,
  onBack,
  onClose,
}: {
  title: string;
  current: number;
  total: number;
  onBack?: () => void;
  onClose?: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 bg-[var(--color-card)]/95 backdrop-blur border-b border-[var(--color-border)] px-4 py-3 space-y-2.5">
      <div className="flex items-center gap-2">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Voltar" className="h-9 w-9 -ml-1 grid place-items-center rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]">
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="h-9 w-9 -ml-1" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)]">Etapa {current + 1} de {total}</div>
          <h1 className="text-card-title truncate leading-tight">{title}</h1>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Fechar" className="h-9 w-9 -mr-1 grid place-items-center rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <Stepper total={total} current={current} />
    </header>
  );
}
