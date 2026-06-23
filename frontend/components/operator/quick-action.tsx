"use client";

import type { LucideIcon } from "lucide-react";

export function QuickAction({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      className="flex flex-col items-center gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] py-4 shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform"
    >
      <Icon className="h-6 w-6 text-[var(--color-primary)]" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
