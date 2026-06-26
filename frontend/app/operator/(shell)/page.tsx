"use client";

import { QrCode, FileText, Plus, Play, Briefcase } from "lucide-react";
import Link from "next/link";
import { OperatorHeader } from "@operator/components/operator-header";
import { QuickAction } from "@operator/components/quick-action";
import { ServiceCard } from "@operator/components/service-card";
import { SkeletonCard } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { financialApi, useQuery, type DemoScheduleState, type ScheduleData } from "@erp/api";
import { firstName } from "@erp/utils";
import type { Status } from "@erp/ui/status-pill";

const STATE_PILL: Record<DemoScheduleState, Status> = {
  OVERDUE: "danger",
  IN_PROGRESS: "in_progress",
  SCHEDULED: "scheduled",
};

export default function OperatorHome() {
  const { session } = useAuth();
  const sched = useQuery<ScheduleData>((signal) => financialApi.getSchedule({ signal }), []);

  const items = sched.data?.items ?? [];
  const ongoing = items.filter((i) => i.state === "IN_PROGRESS");
  const upcoming = items.filter((i) => i.state !== "IN_PROGRESS");
  const next = upcoming[0] ?? ongoing[0] ?? null;

  function fmtTime(iso: string) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-6">
      <OperatorHeader name={firstName(session?.user.name ?? "Operador")} />

      {next && (
        <section className="relative rounded-[var(--radius-xl)] overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-[color-mix(in_oklab,var(--color-primary)_70%,var(--color-accent))] to-[var(--color-accent)] p-5 text-white shadow-[var(--shadow-hover)]">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <p className="text-[10px] uppercase tracking-[0.12em] opacity-80">Próximo atendimento</p>
          <h2 className="mt-1 text-[20px] font-semibold leading-tight">{next.title}</h2>
          <p className="opacity-90 text-sm mt-1">{next.customer}</p>
          <div className="mt-2 text-[12px] opacity-90">{fmtTime(next.startsAt)} · {next.operator}</div>
          <div className="mt-4 flex gap-2">
            <Link href="/operator/services" className="flex-1 inline-flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-white text-[var(--color-primary)] py-3 text-sm font-semibold active:scale-[0.98]">
              <Play className="h-4 w-4" /> Ver fila
            </Link>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2.5">Ações rápidas</h3>
        <div className="grid grid-cols-3 gap-2.5">
          <QuickAction icon={QrCode} label="Escanear QR" tone="primary" href="/operator/qr" />
          <QuickAction icon={FileText} label="Atendimentos" tone="accent" href="/operator/services" />
          <QuickAction icon={Plus} label="Documentos" tone="success" href="/operator/documents" />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Em andamento</h3>
          {ongoing.length > 0 && <span className="text-[10px] rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 font-medium">{ongoing.length}</span>}
        </div>
        {sched.loading && !sched.data ? (
          <SkeletonCard />
        ) : sched.error && !sched.data ? (
          <ErrorState error={sched.error} onRetry={sched.refetch} />
        ) : sched.data?.disabled ? (
          <ComingSoonState title="Sem dados" description="Ative o Demo Dataset para visualizar atendimentos." />
        ) : ongoing.length === 0 ? (
          <EmptyState icon={Briefcase} title="Nada em andamento" />
        ) : (
          <div className="space-y-2">
            {ongoing.map((s) => (
              <ServiceCard key={s.id} id={s.id} title={s.title} client={s.customer} time={fmtTime(s.startsAt)} status={STATE_PILL[s.state]} />
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2.5">Próximos</h3>
          <div className="space-y-2">
            {upcoming.map((s) => (
              <ServiceCard key={s.id} id={s.id} title={s.title} client={s.customer} time={fmtTime(s.startsAt)} status={STATE_PILL[s.state]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
