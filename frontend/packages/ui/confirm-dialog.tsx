"use client";

/**
 * ConfirmDialog — promise-friendly confirmation modal.
 *
 * Controlled via `open`; `onConfirm` may be async (shows a spinner and closes
 * on success). Use the `danger` variant for destructive actions.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) setLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;

  async function handleConfirm() {
    try {
      setLoading(true);
      await onConfirm();
      onClose();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !loading && onClose()} />
      <div role="alertdialog" aria-modal="true" aria-label={title} className="relative w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-floating)] p-5 animate-slide-up">
        <div className="flex items-start gap-3">
          {danger && (
            <span className="h-9 w-9 rounded-full bg-[var(--color-danger)]/10 grid place-items-center text-[var(--color-danger)] shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold">{title}</h3>
            {description && <div className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</div>}
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)] disabled:opacity-50">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 h-9 text-sm font-medium text-white disabled:opacity-50 ${danger ? "bg-[var(--color-danger)]" : "bg-[var(--color-primary)]"}`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
