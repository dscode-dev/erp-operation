"use client";

import { useMemo } from "react";
import { Calendar } from "lucide-react";
import { AssignmentCard } from "@operator/components/assignment-card";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { assignmentsApi, useQuery } from "@erp/api";

export default function OperatorAgendaPage() {
  const assignments = useQuery((signal) => assignmentsApi.listMyAssignments({ limit: 100, signal }), []);

  const groups = useMemo(() => {
    const items = [...(assignments.data?.items ?? [])].sort((a, b) =>
      (a.operation.scheduledFor ?? a.assignedAt).localeCompare(b.operation.scheduledFor ?? b.assignedAt),
    );
    const map = new Map<string, typeof items>();
    for (const it of items) {
      const d = new Date(it.operation.scheduledFor ?? it.assignedAt);
      const key = Number.isNaN(d.getTime()) ? "Sem data" : d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [assignments.data]);

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Agenda de campo</h1>
        <p className="text-caption">Visão cronológica das suas Assignments reais.</p>
      </header>

      {assignments.loading && !assignments.data ? (
        <SkeletonList rows={5} />
      ) : assignments.error && !assignments.data ? (
        <ErrorState error={assignments.error} onRetry={assignments.refetch} />
      ) : groups.length === 0 ? (
        <EmptyState icon={Calendar} title="Sem compromissos" description="Nenhuma Assignment agendada." />
      ) : (
        <div className="space-y-5">
          {groups.map(([day, items]) => (
            <section key={day} className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] capitalize">{day}</h2>
              <div className="space-y-3">
                {items.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
