"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { StatusPill, type Status } from "@erp/ui/status-pill";
import { financialApi, useQuery, type DemoScheduleState, type ScheduleData } from "@erp/api";

const STATE_PILL: Record<DemoScheduleState, Status> = {
  OVERDUE: "danger",
  IN_PROGRESS: "in_progress",
  SCHEDULED: "scheduled",
};

export default function OperatorAgendaPage() {
  const sched = useQuery<ScheduleData>((signal) => financialApi.getSchedule({ signal }), []);

  const groups = useMemo(() => {
    const items = [...(sched.data?.items ?? [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const map = new Map<string, typeof items>();
    for (const it of items) {
      const d = new Date(it.startsAt);
      const key = Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [sched.data]);

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Agenda</h1>
        <p className="text-caption">Seus compromissos (Demo Dataset).</p>
      </header>

      {sched.loading && !sched.data ? (
        <SkeletonList rows={5} />
      ) : sched.error && !sched.data ? (
        <ErrorState error={sched.error} onRetry={sched.refetch} />
      ) : sched.data?.disabled ? (
        <ComingSoonState title="Agenda em breve" description="O domínio de Agendamento será integrado na Sprint 6 do backend." />
      ) : groups.length === 0 ? (
        <EmptyState icon={Calendar} title="Sem compromissos" description="Nenhum atendimento agendado." />
      ) : (
        <div className="space-y-5">
          {groups.map(([day, items]) => (
            <section key={day} className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] capitalize">{day}</h2>
              <ul className="space-y-2">
                {items.map((s) => {
                  const at = new Date(s.startsAt);
                  return (
                    <li key={s.id}>
                      <Link href={`/operator/services/${s.id}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 active:scale-[0.99] transition-transform">
                        <span className="font-mono text-sm text-[var(--color-muted-foreground)] w-14 shrink-0">{Number.isNaN(at.getTime()) ? "—" : at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium truncate">{s.title}</span>
                          <span className="block text-caption truncate">{s.customer} · {s.operator}</span>
                        </span>
                        <StatusPill status={STATE_PILL[s.state]} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
