"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PmocDashboardExecution } from "@erp/api";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const INDICATOR_STYLE: Record<PmocDashboardExecution["indicator"], string> = {
  ON_TIME: "border-l-emerald-500 bg-emerald-500/10 text-emerald-800",
  DUE_SOON: "border-l-amber-500 bg-amber-500/10 text-amber-800",
  OVERDUE: "border-l-red-500 bg-red-500/10 text-red-800",
  COMPLETED: "border-l-blue-500 bg-blue-500/10 text-blue-800",
  CANCELLED: "border-l-slate-400 bg-slate-500/10 text-slate-700",
  FAILED: "border-l-red-700 bg-red-700/10 text-red-800",
};

export function PmocOperationalCalendar({
  cursor,
  items,
  loading,
  onMonthChange,
}: {
  cursor: Date;
  items: PmocDashboardExecution[];
  loading: boolean;
  onMonthChange: (date: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
  const byDay = new Map<string, PmocDashboardExecution[]>();
  for (const item of items) {
    const key = dayKey(new Date(item.scheduledFor));
    const current = byDay.get(key) ?? [];
    current.push(item);
    byDay.set(key, current);
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <h2 className="font-semibold">Calendário operacional</h2>
          <p className="text-caption">Execution Requests oficiais · {items.length} no período</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Mês anterior" className={navButton} onClick={() => onMonthChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-36 text-center text-sm font-medium">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</span>
          <button type="button" aria-label="Próximo mês" className={navButton} onClick={() => onMonthChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></button>
        </div>
      </header>
      <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-muted)]/40">
        {WEEKDAYS.map((weekday) => <div key={weekday} className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">{weekday}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date) => {
          const events = byDay.get(dayKey(date)) ?? [];
          const inMonth = date.getMonth() === cursor.getMonth();
          return (
            <div key={dayKey(date)} className={`min-h-28 border-b border-r border-[var(--color-border)] p-1.5 ${inMonth ? "" : "bg-[var(--color-muted)]/20"}`}>
              <span className={`text-xs tabular-nums ${inMonth ? "" : "text-[var(--color-muted-foreground)]"}`}>{date.getDate()}</span>
              <div className="mt-1 space-y-1">
                {loading ? <div className="skeleton h-5" /> : events.slice(0, 3).map((event) => (
                  <Link key={event.id} href={`/pmoc/${event.pmocPlanId}?execution=${event.id}`} title={`${event.customer.tradeName ?? event.customer.name} · Execução ${event.executionNumber}`} className={`block truncate rounded border-l-2 px-1.5 py-1 text-[10px] font-medium ${INDICATOR_STYLE[event.indicator]}`}>
                    {String(event.executionNumber).padStart(3, "0")} · {event.customer.tradeName ?? event.customer.name}
                  </Link>
                ))}
                {events.length > 3 && <Link href={`/pmoc/${events[0].pmocPlanId}`} className="block text-[10px] text-[var(--color-primary)]">+{events.length - 3} execuções</Link>}
              </div>
            </div>
          );
        })}
      </div>
      <footer className="flex flex-wrap gap-3 border-t border-[var(--color-border)] px-4 py-3 text-[11px] text-[var(--color-muted-foreground)]">
        <Legend color="bg-emerald-500" label="Em dia" /><Legend color="bg-amber-500" label="Próximo do vencimento" /><Legend color="bg-red-500" label="Atrasado/falha" /><Legend color="bg-blue-500" label="Concluído" />
      </footer>
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

const navButton = "grid h-8 w-8 place-items-center rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]";
