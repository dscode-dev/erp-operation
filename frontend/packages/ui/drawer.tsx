"use client";

/**
 * Drawer — generic right-side sheet shell.
 *
 * Shared base for detail/form drawers (customers, equipments, documents…).
 * Handles overlay click, Escape, scroll lock and the slide-in animation.
 */
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative ml-auto h-full w-full ${width} bg-[var(--color-background)] border-l border-[var(--color-border)] shadow-2xl flex flex-col animate-slide-up`}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-border)]">
          <div className="min-w-0">
            {eyebrow && <p className="text-caption uppercase tracking-wider">{eyebrow}</p>}
            <h2 className="text-section-title truncate">{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-md p-2 hover:bg-[var(--color-muted)] shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="border-t border-[var(--color-border)] p-4 flex items-center justify-end gap-2">{footer}</div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
