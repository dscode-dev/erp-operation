"use client";

import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { AssignmentCard } from "@operator/components/assignment-card";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { assignmentsApi, useQuery, type Assignment } from "@erp/api";

export default function OperatorServices() {
  const assignments = useQuery((signal) => assignmentsApi.listMyAssignments({ limit: 100, signal }), []);
  const items = assignments.data?.items ?? [];
  const ongoing = items.filter((item) => item.status === "STARTED");
  const pending = items.filter((item) => item.status === "ASSIGNED" || item.status === "ACCEPTED");
  const done = items.filter((item) => item.status === "COMPLETED");

  return (
    <div className="px-4 pt-4 pb-24 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div><h1 className="text-[22px] font-semibold tracking-tight">Meus atendimentos</h1>
        <p className="text-[var(--color-muted-foreground)] text-sm">Atividades atribuídas e iniciadas por você.</p></div>
        <Link href="/operator/atendimento" className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-semibold text-[var(--color-primary-foreground)]"><Plus className="h-4 w-4" /> Novo</Link>
      </header>

      {assignments.loading && !assignments.data ? (
        <SkeletonList rows={4} />
      ) : assignments.error && !assignments.data ? (
        <ErrorState error={assignments.error} onRetry={assignments.refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon={Briefcase} title="Fila vazia" description="Inicie um atendimento ou aguarde uma atividade da gestão." />
      ) : (
        <div className="space-y-6">
          {ongoing.length > 0 && <Group title="Em andamento" items={ongoing} />}
          {pending.length > 0 && <Group title="Aguardando ação" items={pending} />}
          {done.length > 0 && <Group title="Concluídas" items={done.slice(0, 8)} />}
        </div>
      )}
    </div>
  );
}

function Group({ title, items }: { title: string; items: Assignment[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-caption uppercase tracking-wider">{title}</h2>
      <div className="space-y-3">
        {items.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}
      </div>
    </section>
  );
}
