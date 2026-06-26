"use client";

import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { ServiceCard } from "@operator/components/service-card";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { financialApi, useQuery, type DemoScheduleState, type ScheduleData } from "@erp/api";
import type { Status } from "@erp/ui/status-pill";

const STATE_PILL: Record<DemoScheduleState, Status> = {
  OVERDUE: "danger",
  IN_PROGRESS: "in_progress",
  SCHEDULED: "scheduled",
};

export default function OperatorServices() {
  const sched = useQuery<ScheduleData>((signal) => financialApi.getSchedule({ signal }), []);
  const items = sched.data?.items ?? [];
  const ongoing = items.filter((i) => i.state === "IN_PROGRESS");
  const scheduled = items.filter((i) => i.state !== "IN_PROGRESS");

  function fmtTime(iso: string) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Atendimentos</h1>
          <p className="text-[var(--color-muted-foreground)] text-sm">Sua fila de campo.</p>
        </div>
        <Link href="/operator/atendimento" className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white px-3 h-10 text-sm font-semibold active:scale-[0.98] shrink-0">
          <Plus className="h-4 w-4" /> Novo
        </Link>
      </header>

      {sched.loading && !sched.data ? (
        <SkeletonList rows={4} />
      ) : sched.error && !sched.data ? (
        <ErrorState error={sched.error} onRetry={sched.refetch} />
      ) : sched.data?.disabled ? (
        <ComingSoonState title="Sem dados" description="Ative o Demo Dataset para visualizar atendimentos." />
      ) : items.length === 0 ? (
        <EmptyState icon={Briefcase} title="Fila vazia" description="Nenhum atendimento atribuído." />
      ) : (
        <>
          {ongoing.length > 0 && (
            <section>
              <h2 className="text-caption uppercase tracking-wider mb-2">Em andamento</h2>
              <div className="space-y-2">
                {ongoing.map((s) => (
                  <ServiceCard key={s.id} id={s.id} title={s.title} client={s.customer} time={fmtTime(s.startsAt)} status={STATE_PILL[s.state]} />
                ))}
              </div>
            </section>
          )}
          {scheduled.length > 0 && (
            <section>
              <h2 className="text-caption uppercase tracking-wider mb-2">Agendados</h2>
              <div className="space-y-2">
                {scheduled.map((s) => (
                  <ServiceCard key={s.id} id={s.id} title={s.title} client={s.customer} time={fmtTime(s.startsAt)} status={STATE_PILL[s.state]} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
