"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

/** Sticky wizard footer with navigation controls (back + next/submit). */
export function WizardFooter({
  onBack,
  onNext,
  nextLabel = "Continuar",
  nextDisabled = false,
  loading = false,
  isLast = false,
  nextIcon,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  loading?: boolean;
  isLast?: boolean;
  nextIcon?: React.ReactNode;
}) {
  return (
    <footer className="sticky bottom-0 z-20 bg-[var(--color-card)]/95 backdrop-blur border-t border-[var(--color-border)] px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] flex items-center gap-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 h-12 text-sm font-medium hover:bg-[var(--color-muted)] active:scale-[0.98]"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || loading}
        className="flex-1 inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] h-12 text-sm font-semibold disabled:opacity-50 shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : nextIcon ?? (!isLast && <ChevronRight className="h-4 w-4 order-2" />)}
        <span>{nextLabel}</span>
      </button>
    </footer>
  );
}
