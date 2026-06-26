"use client";

import { Bell } from "lucide-react";
import { formatLongDate } from "@/lib/format";

export function OperatorHeader({ name }: { name: string }) {
  return (
    <header className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">{formatLongDate()}</p>
        <h1 className="text-[22px] font-semibold tracking-tight leading-tight">Olá, {name}.</h1>
      </div>
      <button
        type="button"
        aria-label="Notificações"
        className="relative h-11 w-11 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] grid place-items-center shadow-[var(--shadow-card)]"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-danger)]" />
      </button>
    </header>
  );
}
