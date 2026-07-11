import Link from "next/link";
import { ChevronRight, Clock, MapPin, Wrench } from "lucide-react";
import type { Assignment } from "@erp/types";
import { StatusPill } from "@erp/ui/status-pill";
import {
  ASSIGNMENT_STATUS_LABEL,
  ASSIGNMENT_STATUS_PILL,
  assignmentPrimaryAction,
  assignmentTime,
} from "@erp/ui/assignments/assignment-shared";

export function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const op = assignment.operation;
  const address = op.address
    ? `${op.address.street}, ${op.address.number} · ${op.address.city}/${op.address.state}`
    : "Endereço não informado";
  return (
    <Link
      href={`/operator/services/${assignment.id}`}
      className="block rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] active:scale-[0.99] transition-transform"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
            OP-{String(op.number).padStart(6, "0")}
          </div>
          <h3 className="mt-1 text-base font-semibold leading-tight truncate">
            {op.customer?.name ?? "Cliente não informado"}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)] truncate">
            {op.equipment?.name ?? "Sem equipamento vinculado"}
          </p>
        </div>
        <StatusPill status={ASSIGNMENT_STATUS_PILL[assignment.status]} label={ASSIGNMENT_STATUS_LABEL[assignment.status]} />
      </div>
      <div className="mt-3 grid gap-2 text-sm text-[var(--color-muted-foreground)]">
        <span className="inline-flex items-center gap-2">
          <Clock className="h-4 w-4" /> {op.scheduledFor ? assignmentTime(op.scheduledFor) : "Não agendado"}
        </span>
        <span className="inline-flex items-center gap-2 truncate">
          <MapPin className="h-4 w-4 shrink-0" /> {address}
        </span>
        <span className="inline-flex items-center gap-2">
          <Wrench className="h-4 w-4" /> Prioridade operacional padrão
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-muted)] px-3 py-2 text-sm font-semibold">
        {assignmentPrimaryAction(assignment.status)}
        <ChevronRight className="h-4 w-4" />
      </div>
    </Link>
  );
}
