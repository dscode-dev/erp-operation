import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { PageHeader } from "@/components/platform/page-header";
import { StatusPill } from "@/components/shared/status-pill";
import { weekAgenda, weekDays } from "@/mocks/data";
import type { AgendaEventKind } from "@/mocks/data";

const KIND_TONE: Record<AgendaEventKind, { border: string; bg: string; chip: string; label: string }> = {
  atendimento: { border: "border-l-[var(--color-event-atendimento)]", bg: "bg-[var(--color-event-atendimento)]/8",  chip: "text-[var(--color-event-atendimento)] bg-[var(--color-event-atendimento)]/10",  label: "Atendimento" },
  manutencao:  { border: "border-l-[var(--color-event-manutencao)]",  bg: "bg-[var(--color-event-manutencao)]/8",   chip: "text-[var(--color-event-manutencao)] bg-[var(--color-event-manutencao)]/10",   label: "Manutenção"  },
  visita:      { border: "border-l-[var(--color-event-visita)]",      bg: "bg-[var(--color-event-visita)]/8",       chip: "text-[var(--color-event-visita)] bg-[var(--color-event-visita)]/10",           label: "Visita"      },
  urgencia:    { border: "border-l-[var(--color-event-urgencia)]",    bg: "bg-[var(--color-event-urgencia)]/10",    chip: "text-[var(--color-event-urgencia)] bg-[var(--color-event-urgencia)]/15",       label: "Urgência"    },
};

const HOURS = Array.from({ length: 11 }, (_, i) => 7 + i); // 07h–17h

function minutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function AgendaPage() {
  const dayStart = 7 * 60;
  const dayEnd = 18 * 60;
  const span = dayEnd - dayStart;

  const upcoming = [...weekAgenda]
    .filter((e) => e.status !== "done")
    .sort((a, b) => (a.day - b.day) * 10000 + (minutes(a.time) - minutes(b.time)))
    .slice(0, 6);

  return (
    <div className="space-y-6 max-w-[1600px]">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> Planejamento</span>}
        title="Agenda"
        description="Visão semanal de atendimentos e compromissos da operação."
        actions={
          <>
            <div className="inline-flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-0.5 text-xs">
              {(["Dia","Semana","Mês"] as const).map((v, i) => (
                <button key={v} className={`px-3 py-1.5 rounded-[var(--radius-sm)] ${i===1 ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"}`}>{v}</button>
              ))}
            </div>
            <div className="flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
              <button className="h-9 w-9 grid place-items-center hover:bg-[var(--color-muted)]" aria-label="Semana anterior"><ChevronLeft className="h-4 w-4" /></button>
              <div className="px-3 text-sm font-medium border-x border-[var(--color-border)] h-9 grid place-items-center tabular-nums">22 — 28 jun</div>
              <button className="h-9 w-9 grid place-items-center hover:bg-[var(--color-muted)]" aria-label="Próxima semana"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]">
              <Plus className="h-4 w-4" /> Agendar
            </button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Semana */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
          {/* header dias */}
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
            <div />
            {weekDays.map((d) => {
              const isToday = d.d === 1;
              return (
                <div key={d.d} className={`px-3 py-2.5 text-center ${isToday ? "bg-[var(--color-primary)]/8" : ""}`}>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">{d.label}</div>
                  <div className={`text-sm font-semibold tabular-nums ${isToday ? "text-[var(--color-primary)]" : ""}`}>{d.date.split("/")[0]}</div>
                </div>
              );
            })}
          </div>

          {/* grade horária */}
          <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))] overflow-x-auto">
            {/* coluna horas */}
            <div className="relative">
              {HOURS.map((h) => (
                <div key={h} className="h-14 px-2 py-1 text-right text-[10px] font-mono text-[var(--color-muted-foreground)] border-b border-[var(--color-border)]">
                  {String(h).padStart(2,"0")}:00
                </div>
              ))}
            </div>
            {/* colunas dias */}
            {weekDays.map((d) => {
              const events = weekAgenda.filter((e) => e.day === d.d);
              return (
                <div key={d.d} className="relative border-l border-[var(--color-border)]">
                  {HOURS.map((h) => (
                    <div key={h} className="h-14 border-b border-[var(--color-border)]" />
                  ))}
                  {events.map((e) => {
                    const top = ((minutes(e.time) - dayStart) / span) * (HOURS.length * 56);
                    const height = Math.max(28, ((minutes(e.endTime) - minutes(e.time)) / span) * (HOURS.length * 56));
                    const tone = KIND_TONE[e.kind];
                    return (
                      <button
                        key={e.id}
                        type="button"
                        className={`absolute left-1 right-1 rounded-[var(--radius-sm)] border-l-2 ${tone.border} ${tone.bg} backdrop-blur-sm p-1.5 text-left overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow`}
                        style={{ top, height }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] tabular-nums">{e.time}</span>
                          <span className={`text-[9px] uppercase tracking-wider rounded px-1 ${tone.chip}`}>{tone.label}</span>
                        </div>
                        <div className="text-[12px] font-medium leading-tight mt-0.5 truncate">{e.title}</div>
                        <div className="text-[10px] text-[var(--color-muted-foreground)] truncate">{e.client}</div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar próximos */}
        <aside className="space-y-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-4">
            <h3 className="text-sm font-semibold mb-3">Próximos eventos</h3>
            <ul className="space-y-2.5">
              {upcoming.map((e) => {
                const tone = KIND_TONE[e.kind];
                const day = weekDays.find((d) => d.d === e.day);
                return (
                  <li key={e.id} className={`flex gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] border-l-2 ${tone.border} p-2.5 hover:bg-[var(--color-muted)]/40 transition-colors`}>
                    <div className="flex flex-col items-center justify-center w-12 shrink-0">
                      <span className="text-[10px] uppercase text-[var(--color-muted-foreground)]">{day?.label}</span>
                      <span className="font-mono text-sm font-semibold tabular-nums">{e.time}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{e.title}</div>
                      <div className="text-caption truncate">{e.client} · {e.operator}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`text-[9px] uppercase tracking-wider rounded px-1 py-0.5 ${tone.chip}`}>{tone.label}</span>
                        <StatusPill status={e.status} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-4">
            <h3 className="text-sm font-semibold mb-3">Tipos</h3>
            <ul className="space-y-2 text-xs">
              {(["atendimento","manutencao","visita","urgencia"] as AgendaEventKind[]).map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-sm`} style={{ background: `var(--color-event-${k})` }} />
                  <span>{KIND_TONE[k].label}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
