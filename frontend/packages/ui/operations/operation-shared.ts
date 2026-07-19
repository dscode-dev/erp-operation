/**
 * Shared labels/tones for the Operation domain. Single source of truth reused by
 * the operator wizard, the platform Operações screen and every produced document.
 */
import type {
  OperationDocumentStatus,
  OperationStatus,
  OperationType,
} from "@erp/types";
import type { ChipTone } from "../status-chip";

export const OPERATION_TYPE_LABEL: Record<OperationType, string> = {
  PREVENTIVA: "Preventiva",
  CORRETIVA: "Corretiva",
  INSTALACAO: "Instalação",
  PROJETO: "Projeto / Visita",
};

export const OPERATION_STATUS: Record<OperationStatus, { tone: ChipTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Rascunho" },
  PENDING: { tone: "warning", label: "Pendente" },
  IN_PROGRESS: { tone: "primary", label: "Em andamento" },
  REVIEW: { tone: "info", label: "Revisão" },
  COMPLETED: { tone: "success", label: "Concluída" },
  CANCELED: { tone: "danger", label: "Cancelada" },
};

export const OPERATION_DOC_STATUS: Record<OperationDocumentStatus, { tone: ChipTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Rascunho" },
  READY: { tone: "info", label: "Pronto" },
  VALIDATED: { tone: "success", label: "Validado" },
  SENT: { tone: "primary", label: "Enviado" },
};

/** Format the sequential Operation number as `OP-000001`. */
export function operationCode(n: number): string {
  return `OP-${String(n).padStart(6, "0")}`;
}
