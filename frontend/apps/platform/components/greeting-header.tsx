"use client";

import { Calendar, CheckCircle2 } from "lucide-react";
import { formatLongDate } from "@erp/utils";

export function GreetingHeader({ name, pending }: { name: string; pending: number }) {
  const dateLabel = formatLongDate();
  return (
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1 min-w-0">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
          <Calendar className="h-3 w-3" /> {dateLabel}
        </p>
        <h1 className="text-page-title">Olá, {name}.</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {pending > 0 ? (
            <>Você possui <span className="font-medium text-[var(--color-foreground)]">{pending} atividades pendentes</span> hoje.</>
          ) : (
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-success)]" /> Tudo em dia por aqui.</span>
          )}
        </p>
      </div>
    </header>
  );
}
