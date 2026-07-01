import type { AssignmentStatus } from "@erp/types";
import type { Status } from "@erp/ui/status-pill";

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  ASSIGNED: "Agendado",
  ACCEPTED: "Aceito",
  STARTED: "Em execução",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
  REJECTED: "Recusado",
};

export const ASSIGNMENT_STATUS_PILL: Record<AssignmentStatus, Status> = {
  ASSIGNED: "scheduled",
  ACCEPTED: "scheduled",
  STARTED: "in_progress",
  PAUSED: "warning",
  COMPLETED: "done",
  CANCELED: "danger",
  REJECTED: "danger",
};

export function assignmentPrimaryAction(status: AssignmentStatus): "Aceitar" | "Iniciar" | "Continuar" | "Concluído" {
  if (status === "ASSIGNED") return "Aceitar";
  if (status === "ACCEPTED") return "Iniciar";
  if (status === "STARTED" || status === "PAUSED") return "Continuar";
  return "Concluído";
}

export function assignmentTime(iso: string | null | undefined): string {
  if (!iso) return "Sem horário";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Sem horário";
  return date.toLocaleString("pt-BR", { weekday: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
