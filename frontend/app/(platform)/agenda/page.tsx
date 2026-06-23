import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/platform/page-header";
import { StatusPill } from "@/components/shared/status-pill";
import { weekAgenda, weekDays } from "@/mocks/data";

export default function AgendaPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Planejamento"
        title="Agenda"
        description="Visão semanal de atendimentos e compromissos da operação."
        actions={
          <>
            <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
              <button className="h-9 w-9 grid place-items-center hover:bg-[var(--color-muted)]" aria-label="Semana anterior">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="px-3 text-sm font-medium border-x border-[var(--color-border)] h-9 grid place-items-center">
                22 — 28 jun, 2026
              </div>
              <button className="h-9 w-9 grid place-items-center hover:bg-[var(--color-muted)]" aria-label="Próxima semana">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]">
              <Plus className="h-4 w-4" /> Agendar
            </button>
          </>
        }
      />

      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-3 min-w-[980px]">
          {weekDays.map((d) => {
            const events = weekAgenda.filter((e) => e.day === d.d);
            const isToday = d.d === 1;
            return (
              <div
                key={d.d}
                className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden"
              >
                <div
                  className={
                    "px-3 py-2 border-b border-[var(--color-border)] flex items-center justify-between " +
                    (isToday ? "bg-[var(--color-primary)]/10" : "")
                  }
                >
                  <div>
                    <div className="text-caption uppercase tracking-wider">{d.label}</div>
                    <div className={"text-sm font-semibold " + (isToday ? "text-[var(--color-primary)]" : "")}>
                      {d.date}
                    </div>
                  </div>
                  <span className="text-caption">{events.length}</span>
                </div>
                <ul className="flex-1 p-2 space-y-2 min-h-[360px]">
                  {events.length === 0 ? (
                    <li className="text-caption text-center py-6 text-[var(--color-muted-foreground)]">
                      sem eventos
                    </li>
                  ) : (
                    events.map((e) => (
                      <li
                        key={e.id}
                        className="rounded-[var(--radius-md)] border-l-2 border-[var(--color-primary)] bg-[var(--color-muted)]/50 p-2 hover:bg-[var(--color-muted)] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-xs">{e.time}</span>
                          <StatusPill status={e.status} />
                        </div>
                        <div className="text-sm font-medium leading-tight">{e.title}</div>
                        <div className="text-caption truncate mt-0.5">
                          {e.client} · {e.operator}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
