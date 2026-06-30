"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, User, Clock, FileText } from "lucide-react";
import { SkeletonCard } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { StatusPill, type Status } from "@erp/ui/status-pill";
import { financialApi, useQuery, type DemoScheduleState, type ScheduleData } from "@erp/api";

const STATE_PILL: Record<DemoScheduleState, Status> = {
  OVERDUE: "danger",
  IN_PROGRESS: "in_progress",
  SCHEDULED: "scheduled",
  DONE: "done",
};
const STATE_LABEL: Record<DemoScheduleState, string> = {
  OVERDUE: "Atrasado",
  IN_PROGRESS: "Em andamento",
  SCHEDULED: "Agendado",
  DONE: "Concluído",
};

export default function OperatorServiceDetail() {
  const params = useParams<{ id: string }>();
  const sched = useQuery<ScheduleData>((signal) => financialApi.getSchedule({ signal }), []);
  const item = useMemo(() => (sched.data?.items ?? []).find((i) => i.id === params.id) ?? null, [sched.data, params.id]);

  return (
    <div className="px-4 pt-4 pb-24 space-y-5">
      <Link href="/operator/services" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
        <ArrowLeft className="h-4 w-4" /> Atendimentos
      </Link>

      {sched.loading && !sched.data ? (
        <SkeletonCard />
      ) : sched.error && !sched.data ? (
        <ErrorState error={sched.error} onRetry={sched.refetch} />
      ) : !item ? (
        <EmptyState icon={Clock} title="Atendimento não encontrado" description="O atendimento não está mais na fila." />
      ) : (
        <>
          <header className="space-y-2">
            <StatusPill status={STATE_PILL[item.state]} label={STATE_LABEL[item.state]} />
            <h1 className="text-section-title leading-tight">{item.title}</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">{item.customer}</p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" /> {item.operator}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> {new Date(item.startsAt).toLocaleString("pt-BR")}</span>
            </div>
          </header>

          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Documento</h2>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm text-[var(--color-muted-foreground)]">
              <FileText className="mb-2 h-5 w-5" />
              Ao concluir uma Operation real, o documento oficial fica disponível em Documentos e é consumido pelo Document Engine.
            </div>
          </section>
        </>
      )}
    </div>
  );
}
