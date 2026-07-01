"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, ClipboardCheck, FileText, Package, PenLine, Play, XCircle } from "lucide-react";
import { SkeletonCard, SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { StatusPill } from "@erp/ui/status-pill";
import { assignmentsApi, useQuery, type Assignment } from "@erp/api";
import {
  ASSIGNMENT_STATUS_LABEL,
  ASSIGNMENT_STATUS_PILL,
  assignmentTime,
} from "@erp/ui/assignments/assignment-shared";

const workflow = [
  { label: "Aceitar", icon: CheckCircle2 },
  { label: "Checklist", icon: ClipboardCheck },
  { label: "Fotos", icon: Camera },
  { label: "Materiais", icon: Package },
  { label: "Documentos", icon: FileText },
  { label: "Assinatura", icon: PenLine },
  { label: "Concluir", icon: CheckCircle2 },
];

export default function OperatorServiceDetail() {
  const params = useParams<{ id: string }>();
  const assignment = useQuery((signal) => assignmentsApi.getAssignment(params.id, { signal }), [params.id]);
  const history = useQuery(
    (signal) => assignment.data ? assignmentsApi.getAssignmentHistory(assignment.data.operationId, { signal }) : Promise.resolve([]),
    [assignment.data?.operationId],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "accept" | "start" | "complete" | "reject") {
    if (!assignment.data) return;
    setBusy(action);
    setError(null);
    try {
      if (action === "accept") await assignmentsApi.acceptAssignment(assignment.data.id);
      if (action === "start") await assignmentsApi.startAssignment(assignment.data.id);
      if (action === "complete") await assignmentsApi.completeAssignment(assignment.data.id, "Concluído pelo Operator PWA");
      if (action === "reject") await assignmentsApi.rejectAssignment(assignment.data.id, "Recusado pelo operador");
      assignment.refetch();
      history.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a Assignment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-5">
      <Link href="/operator/services" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
        <ArrowLeft className="h-4 w-4" /> Minhas ordens
      </Link>

      {assignment.loading && !assignment.data ? (
        <SkeletonCard />
      ) : assignment.error && !assignment.data ? (
        <ErrorState error={assignment.error} onRetry={assignment.refetch} />
      ) : !assignment.data ? (
        <EmptyState icon={ClipboardCheck} title="Assignment não encontrada" description="A ordem não está mais disponível." />
      ) : (
        <AssignmentWorkflow
          assignment={assignment.data}
          history={history.data ?? []}
          historyLoading={history.loading}
          error={error}
          busy={busy}
          onAction={run}
        />
      )}
    </div>
  );
}

function AssignmentWorkflow({
  assignment,
  history,
  historyLoading,
  error,
  busy,
  onAction,
}: {
  assignment: Assignment;
  history: Awaited<ReturnType<typeof assignmentsApi.getAssignmentHistory>>;
  historyLoading: boolean;
  error: string | null;
  busy: string | null;
  onAction: (action: "accept" | "start" | "complete" | "reject") => void;
}) {
  const op = assignment.operation;
  return (
    <>
      <header className="space-y-3">
        <StatusPill status={ASSIGNMENT_STATUS_PILL[assignment.status]} label={ASSIGNMENT_STATUS_LABEL[assignment.status]} />
        <div>
          <h1 className="text-section-title leading-tight">{op.customer?.name ?? "Cliente não informado"}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            OP-{String(op.number).padStart(6, "0")} · {op.equipment?.name ?? "Sem equipamento"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{assignmentTime(op.scheduledFor ?? assignment.assignedAt)}</p>
        </div>
      </header>

      {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}

      <section className="grid gap-2">
        {assignment.status === "ASSIGNED" && (
          <>
            <BigButton icon={CheckCircle2} label="Aceitar ordem" busy={busy === "accept"} onClick={() => onAction("accept")} />
            <button onClick={() => onAction("reject")} disabled={busy === "reject"} className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-danger)]/30 text-sm font-semibold text-[var(--color-danger)] disabled:opacity-50">
              <XCircle className="h-5 w-5" /> Recusar
            </button>
          </>
        )}
        {assignment.status === "ACCEPTED" && <BigButton icon={Play} label="Iniciar execução" busy={busy === "start"} onClick={() => onAction("start")} />}
        {assignment.status === "STARTED" && <BigButton icon={CheckCircle2} label="Concluir atendimento" busy={busy === "complete"} onClick={() => onAction("complete")} />}
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Fluxo operacional</h2>
        <div className="grid grid-cols-2 gap-2">
          {workflow.map(({ label, icon: Icon }) => (
            <div key={label} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
              <Icon className="mb-2 h-5 w-5 text-[var(--color-primary)]" />
              <div className="text-sm font-medium">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Checklist, fotos, materiais, documentos e assinatura continuam sendo registrados na Operation principal.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Timeline da Assignment</h2>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          {historyLoading && history.length === 0 ? (
            <SkeletonList rows={3} />
          ) : history.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Sem eventos registrados.</p>
          ) : (
            <ol className="space-y-3">
              {history.map((item) => (
                <li key={item.id} className="flex gap-3 text-sm">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                  <span>
                    <span className="font-medium">{item.event}</span>
                    <span className="block text-xs text-[var(--color-muted-foreground)]">
                      {item.actor.name} · {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </span>
                    {item.notes && <span className="block text-xs text-[var(--color-muted-foreground)]">{item.notes}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </>
  );
}

function BigButton({ icon: Icon, label, busy, onClick }: { icon: typeof CheckCircle2; label: string; busy: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={busy} className="inline-flex h-14 items-center justify-center gap-2 rounded-[var(--radius-xl)] bg-[var(--color-primary)] px-4 text-base font-semibold text-white shadow-[var(--shadow-hover)] disabled:opacity-50">
      <Icon className="h-5 w-5" /> {busy ? "Atualizando…" : label}
    </button>
  );
}
