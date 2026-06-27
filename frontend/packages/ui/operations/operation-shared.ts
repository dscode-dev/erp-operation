/**
 * Shared labels/tones for the Operation domain. Single source of truth reused by
 * the operator wizard, the platform Operações screen and every produced document.
 */
import type {
  OperationDocumentStatus,
  OperationStatus,
  OperationType,
  OperationSummary,
} from "@erp/types";
import type { ChipTone } from "../status-chip";
import type { TimelineEvent, TimelineKind } from "../timeline";

export const OPERATION_TYPE_LABEL: Record<OperationType, string> = {
  PREVENTIVA: "Preventiva",
  CORRETIVA: "Corretiva",
  INSTALACAO: "Instalação",
  PROJETO: "Projeto / Visita",
};

export const OPERATION_STATUS: Record<OperationStatus, { tone: ChipTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Rascunho" },
  IN_PROGRESS: { tone: "primary", label: "Em andamento" },
  COMPLETED: { tone: "success", label: "Concluída" },
  CANCELED: { tone: "danger", label: "Cancelada" },
};

export const OPERATION_DOC_STATUS: Record<OperationDocumentStatus, { tone: ChipTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Rascunho" },
  READY: { tone: "info", label: "Pronto" },
  VALIDATED: { tone: "success", label: "Validado" },
  SENT: { tone: "primary", label: "Enviado" },
};

const TYPE_TO_TIMELINE_KIND: Record<OperationType, TimelineKind> = {
  PREVENTIVA: "MAINTENANCE",
  CORRETIVA: "MAINTENANCE",
  INSTALACAO: "INSTALL",
  PROJETO: "VISIT",
};

/** Format the sequential Operation number as `OP-000001`. */
export function operationCode(n: number): string {
  return `OP-${String(n).padStart(6, "0")}`;
}

/** Build timeline events from operations (newest first), for equipment/customer history. */
export function operationsToTimeline(operations: OperationSummary[]): TimelineEvent[] {
  return operations.map((op) => ({
    id: op.id,
    at: op.completedAt ?? op.startedAt ?? op.createdAt,
    kind: TYPE_TO_TIMELINE_KIND[op.type],
    label: `${operationCode(op.number)} · ${OPERATION_TYPE_LABEL[op.type]}`,
    meta: [op.operator?.name, op.equipment?.name, OPERATION_STATUS[op.status].label]
      .filter(Boolean)
      .join(" · "),
  }));
}
