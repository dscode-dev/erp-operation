"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Video } from "lucide-react";
import { PageHeader } from "@/components/platform/page-header";
import { SkeletonCard } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { ComingSoonState, ErrorState } from "@/components/shared/states";
import { financialApi, useQuery, type DemoScheduleState, type ScheduleData } from "@/lib/api";

/* Visual mapping from the demo schedule state to the agenda event style. */
const STATE_STYLE: Record<DemoScheduleState, { bar: string; bg: string; text: string; label: string }> = {
  IN_PROGRESS: {
    bar: "var(--color-event-atendimento)",
    bg: "color-mix(in srgb, var(--color-event-atendimento) 14%, var(--color-card))",
    text: "var(--color-event-atendimento)",
    label: "Em andamento",
  },
  SCHEDULED: {
    bar: "var(--color-event-visita)",
    bg: "color-mix(in srgb, var(--color-event-visita) 14%, var(--color-card))",
    text: "var(--color-event-visita)",
    label: "Agendado",
  },
  OVERDUE: {
    bar: "var(--color-event-urgencia)",
    bg: "color-mix(in srgb, var(--color-event-urgencia) 18%, var(--color-card))",
    text: "var(--color-event-urgencia)",
    label: "Atrasado",
  },
};

const HOUR_START = 7;
const HOUR_END = 19;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const SLOT_PX = 56;
const DEFAULT_DURATION_MIN = 90;

/** Monday-based weekday index (1..7) from a Date. */
function isoWeekday(d: Date): number {
  const wd = d.getDay(); // 0=Sun..6=Sat
  return wd === 0 ? 7 : wd;
}

function startOfWeek(base = new Date()): Date {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (isoWeekday(d) - 1));
  return d;
}

export default function AgendaPage() {
  const sched = useQuery<ScheduleData>((signal) => financialApi.getSchedule({ signal }), []);

  const now = new Date();
  const weekStart = useMemo(() => startOfWeek(now), []); // eslint-disable-line react-hooks/exhaustive-deps
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        return {
          d: i + 1,
          label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
          dayNum: date.getDate(),
          isToday: date.toDateString() === now.toDateString(),
        };
      }),
    [weekStart], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const events = useMemo(() => {
    return (sched.data?.items ?? []).map((item) => {
      const at = new Date(item.startsAt);
      const startMin = at.getHours() * 60 + at.getMinutes();
      return {
        id: item.id,
        day: isoWeekday(at),
        startMin,
        endMin: startMin + DEFAULT_DURATION_MIN,
        title: item.title,
        customer: item.customer,
        operator: item.operator,
        state: item.state,
        time: at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };
    });
  }, [sched.data]);

  const dayStart = HOUR_START * 60;
  const span = (HOUR_END - HOUR_START) * 60;
  const totalHeight = HOURS.length * SLOT_PX;
  const monthLabel = weekStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5 max-w-[1600px]">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> Planejamento</span>}
        title="Agenda"
        description="Visão semanal consumida do Demo Dataset (domínio de Agendamento é escopo futuro)."
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 shadow-[var(--shadow-card)]">
        <button type="button" className="h-8 px-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-muted)]">Hoje</button>
        <div className="flex items-center">
          <button type="button" className="h-8 w-8 grid place-items-center rounded-[var(--radius-sm)] hover:bg-[var(--color-muted)]" aria-label="Semana anterior"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" className="h-8 w-8 grid place-items-center rounded-[var(--radius-sm)] hover:bg-[var(--color-muted)]" aria-label="Próxima semana"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="text-base font-semibold tracking-tight ml-1 capitalize">{monthLabel}</div>
      </div>

      {sched.loading && !sched.data ? (
        <div className="grid gap-3 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : sched.error && !sched.data ? (
        <ErrorState error={sched.error} onRetry={sched.refetch} />
      ) : sched.data?.disabled ? (
        <ComingSoonState title="Agenda em breve" description="O domínio de Agendamento ainda não existe na API. Ative o Demo Dataset para visualizar dados de desenvolvimento." />
      ) : events.length === 0 ? (
        <EmptyState icon={CalendarIcon} title="Sem compromissos" description="Nenhum agendamento para esta semana." />
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
          {/* Header de dias */}
          <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-[var(--color-border)] sticky top-0 z-10 bg-[var(--color-card)]">
            <div className="border-r border-[var(--color-border)]" />
            {weekDays.map((d) => (
              <div key={d.d} className="px-3 py-2.5 text-center border-r last:border-r-0 border-[var(--color-border)]">
                <div className="text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)]">{d.label}</div>
                <div className="mt-0.5 flex items-center justify-center">
                  <span className={d.isToday
                    ? "inline-grid place-items-center h-8 w-8 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-semibold tabular-nums"
                    : "text-lg font-semibold tabular-nums"}>
                    {d.dayNum}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Grade horária */}
          <div className="relative grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
            <div className="border-r border-[var(--color-border)]">
              {HOURS.map((h) => (
                <div key={h} style={{ height: SLOT_PX }} className="relative -mt-2 first:mt-0">
                  <div className="absolute -top-2 right-2 text-[10px] font-mono tabular-nums text-[var(--color-muted-foreground)] bg-[var(--color-card)] px-1">
                    {h === HOUR_START ? "" : `${String(h).padStart(2, "0")}:00`}
                  </div>
                </div>
              ))}
            </div>

            {weekDays.map((d) => {
              const dayEvents = events.filter((e) => e.day === d.d);
              return (
                <div key={d.d} className={`relative border-r last:border-r-0 border-[var(--color-border)] ${d.isToday ? "bg-[var(--color-primary)]/[0.03]" : ""}`}>
                  {HOURS.map((h) => (
                    <div key={h} style={{ height: SLOT_PX }} className="border-b border-[var(--color-border)] relative">
                      <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-[var(--color-border)]/60" />
                    </div>
                  ))}

                  {d.isToday && (() => {
                    const nowMin = now.getHours() * 60 + now.getMinutes();
                    const top = ((nowMin - dayStart) / span) * totalHeight;
                    if (top < 0 || top > totalHeight) return null;
                    return (
                      <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
                        <div className="relative h-0">
                          <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-[var(--color-danger)] ring-2 ring-[var(--color-card)]" />
                          <div className="border-t-2 border-[var(--color-danger)]" />
                        </div>
                      </div>
                    );
                  })()}

                  {dayEvents.map((e) => {
                    const top = ((e.startMin - dayStart) / span) * totalHeight;
                    const height = Math.max(34, ((e.endMin - e.startMin) / span) * totalHeight - 2);
                    const tone = STATE_STYLE[e.state];
                    const isCompact = height < 56;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        className="group absolute left-1 right-1 z-10 rounded-[6px] overflow-hidden text-left transition-all hover:shadow-[var(--shadow-hover)] hover:-translate-y-px"
                        style={{ top, height, background: tone.bg, boxShadow: `inset 3px 0 0 0 ${tone.bar}, var(--shadow-card)` }}
                      >
                        <div className="px-2 py-1 h-full flex flex-col">
                          <div className={`font-semibold leading-tight truncate ${isCompact ? "text-[11px]" : "text-[12.5px]"}`} style={{ color: tone.text }}>
                            {e.title}
                          </div>
                          {!isCompact && (
                            <>
                              <div className="mt-0.5 text-[11px] text-[var(--color-foreground)]/80 truncate">{e.customer}</div>
                              <div className="mt-auto pt-1 flex items-center gap-2 text-[10px] text-[var(--color-muted-foreground)] font-mono tabular-nums">
                                <span>{e.time}</span>
                                <span className="ml-auto inline-flex items-center gap-1">
                                  {e.state === "SCHEDULED" ? <Video className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                                  <span className="truncate max-w-[60px]">{e.operator}</span>
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5 border-t border-[var(--color-border)] bg-[var(--color-muted)]/30 text-[11px] text-[var(--color-muted-foreground)]">
            {(Object.keys(STATE_STYLE) as DemoScheduleState[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: STATE_STYLE[k].bar }} />
                {STATE_STYLE[k].label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 ml-auto">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-danger)]" /> Agora
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
