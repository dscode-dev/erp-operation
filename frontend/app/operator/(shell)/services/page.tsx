"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Filter, Plus } from "lucide-react";
import { AssignmentCard } from "@operator/components/assignment-card";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { assignmentsApi, useQuery, type Assignment } from "@erp/api";

export default function OperatorServices() {
  const assignments = useQuery((signal) => assignmentsApi.listMyAssignments({ limit: 100, signal }), []);
  const [status, setStatus] = useState<"ALL" | "PENDING" | "STARTED" | "COMPLETED">("ALL");
  const [scheduledDate, setScheduledDate] = useState("");
  const items = useMemo(
    () =>
      [...(assignments.data?.items ?? [])]
        .filter((item) => {
          if (
            status === "PENDING" &&
            item.status !== "ASSIGNED" &&
            item.status !== "ACCEPTED"
          ) return false;
          if (status === "STARTED" && item.status !== "STARTED") return false;
          if (status === "COMPLETED" && item.status !== "COMPLETED") return false;
          if (
            scheduledDate &&
            (!item.operation.scheduledFor ||
              localDateKey(item.operation.scheduledFor) !== scheduledDate)
          ) return false;
          return true;
        })
        .sort(compareAssignments),
    [assignments.data?.items, scheduledDate, status],
  );
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

      <section className="grid gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium">
          <span className="inline-flex items-center gap-1 text-[var(--color-muted-foreground)]"><Filter className="h-3.5 w-3.5" /> Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm">
            <option value="ALL">Todos</option>
            <option value="PENDING">Aguardando ação</option>
            <option value="STARTED">Em andamento</option>
            <option value="COMPLETED">Concluídos</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-medium">
          <span className="text-[var(--color-muted-foreground)]">Data agendada</span>
          <input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm" />
        </label>
      </section>

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

function compareAssignments(left: Assignment, right: Assignment): number {
  const leftCompleted = left.status === "COMPLETED" ? 1 : 0;
  const rightCompleted = right.status === "COMPLETED" ? 1 : 0;
  if (leftCompleted !== rightCompleted) return leftCompleted - rightCompleted;
  const byOperation = Number(right.operation.number ?? 0) - Number(left.operation.number ?? 0);
  if (byOperation !== 0) return byOperation;
  const leftSchedule = left.operation.scheduledFor
    ? new Date(left.operation.scheduledFor).getTime()
    : 0;
  const rightSchedule = right.operation.scheduledFor
    ? new Date(right.operation.scheduledFor).getTime()
    : 0;
  return rightSchedule - leftSchedule || right.assignedAt.localeCompare(left.assignedAt);
}

function localDateKey(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
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
