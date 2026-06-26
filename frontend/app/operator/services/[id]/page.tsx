"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, User, Clock, PenLine } from "lucide-react";
import { SkeletonCard } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/states";
import { StatusPill, type Status } from "@/components/shared/status-pill";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { financialApi, useQuery, type DemoScheduleState, type ScheduleData } from "@/lib/api";
import type { GeneratedDocument } from "@/lib/documents/types";

const STATE_PILL: Record<DemoScheduleState, Status> = {
  OVERDUE: "danger",
  IN_PROGRESS: "in_progress",
  SCHEDULED: "scheduled",
};
const STATE_LABEL: Record<DemoScheduleState, string> = {
  OVERDUE: "Atrasado",
  IN_PROGRESS: "Em andamento",
  SCHEDULED: "Agendado",
};

export default function OperatorServiceDetail() {
  const params = useParams<{ id: string }>();
  const sched = useQuery<ScheduleData>((signal) => financialApi.getSchedule({ signal }), []);
  const item = useMemo(() => (sched.data?.items ?? []).find((i) => i.id === params.id) ?? null, [sched.data, params.id]);

  // Future flow architecture: the document is a draft until the operator fills
  // the form, signs in the field and the backend assembles the PDF.
  const draftDocument: GeneratedDocument = {
    id: `doc-${params.id}`,
    kind: "WORK_ORDER",
    title: item ? `OS — ${item.title}` : "Ordem de Serviço",
    status: "draft",
  };

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

          {/* Documento (arquitetura do fluxo futuro: formulário → assinatura → backend → PDF) */}
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Documento</h2>
            <DocumentViewer
              document={draftDocument}
              reviewFields={[
                { label: "Cliente", value: item.customer },
                { label: "Operador", value: item.operator },
                { label: "Status", value: STATE_LABEL[item.state] },
              ]}
              actions={
                <button
                  type="button"
                  disabled
                  title="Assinatura e geração são responsabilidade do backend (escopo futuro)."
                  className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm opacity-60 cursor-not-allowed"
                >
                  <PenLine className="h-4 w-4" /> Coletar assinatura
                </button>
              }
            />
          </section>
        </>
      )}
    </div>
  );
}
