/** PMOC Compliance domain — production API. */
import { api } from "./client";
import type {
  CreateOperationPayload,
  Paginated,
  OperationType,
  PmocExecutionRequest,
  PmocExecutionRequestStatus,
  PmocGenerationMode,
  PmocHistoryItem,
  PmocPeriodicity,
  PmocPlan,
  PmocStats,
} from "@erp/types";

export type CreatePmocPayload = {
  name?: string;
  customerId: string;
  equipmentId: string;
  equipmentIds?: string[];
  scopeCatalogIds?: string[];
  coverage?: string;
  periodicity?: PmocPeriodicity;
  generationMode?: PmocGenerationMode;
  defaultOperatorId?: string;
  defaultTechnicianId?: string;
  defaultAddressId?: string;
  defaultOperationType?: OperationType;
  serviceTypes?: OperationType[];
  defaultEstimatedDurationMinutes?: number;
  defaultOperationObservations?: string;
  signatureOverrideId?: string;
  responsibleTechnician: string;
  artNumber?: string;
  contractNumber?: string;
  startDate: string;
  endDate: string;
  observations?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recurrenceRule?: {
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "INTERVAL_DAYS" | "INTERVAL_MONTHS";
    interval?: number;
  };
  active?: boolean;
};

export type UpdatePmocPayload = Partial<
  Pick<
    CreatePmocPayload,
    | "equipmentIds"
    | "scopeCatalogIds"
    | "responsibleTechnician"
    | "startDate"
    | "endDate"
    | "priority"
    | "recurrenceRule"
    | "active"
    | "periodicity"
    | "generationMode"
    | "name"
    | "defaultAddressId"
    | "defaultOperationType"
    | "serviceTypes"
    | "defaultEstimatedDurationMinutes"
    | "defaultOperationObservations"
  >
> & {
  artNumber?: string | null;
  contractNumber?: string | null;
  observations?: string | null;
  coverage?: string | null;
  defaultOperatorId?: string | null;
  defaultTechnicianId?: string | null;
  signatureOverrideId?: string | null;
  applyDefaultsToPendingExecutions?: boolean;
};

export type ListPmocParams = {
  page?: number;
  limit?: number;
  customerId?: string;
  equipmentId?: string;
  active?: boolean;
  signal?: AbortSignal;
};

export function getPmocStats(opts?: {
  from?: string;
  to?: string;
  signal?: AbortSignal;
}): Promise<PmocStats> {
  const { signal, ...query } = opts ?? {};
  return api.get<PmocStats>("/pmoc/stats", { query, signal });
}

export function listPmoc(params?: ListPmocParams): Promise<Paginated<PmocPlan>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<PmocPlan>>("/pmoc", { query, signal });
}

export function getPmoc(id: string, opts?: { signal?: AbortSignal }): Promise<PmocPlan> {
  return api.get<PmocPlan>(`/pmoc/${id}`, opts);
}

export function getNameSuggestion(
  customerId: string,
  opts?: { signal?: AbortSignal },
): Promise<{ name: string; provisionalNumber: number }> {
  return api.get('/pmoc/name-suggestion', { query: { customerId }, signal: opts?.signal });
}

export function createPmoc(payload: CreatePmocPayload): Promise<PmocPlan> {
  return api.post<PmocPlan>("/pmoc", payload);
}

export function updatePmoc(id: string, payload: UpdatePmocPayload): Promise<PmocPlan> {
  return api.patch<PmocPlan>(`/pmoc/${id}`, payload);
}

export function deletePmoc(id: string): Promise<{ deleted: true }> {
  return api.delete<{ deleted: true }>(`/pmoc/${id}`);
}

export function listExecutionRequests(
  pmocId: string,
  params?: { page?: number; limit?: number; status?: PmocExecutionRequestStatus; signal?: AbortSignal },
): Promise<Paginated<PmocExecutionRequest>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<PmocExecutionRequest>>(`/pmoc/${pmocId}/execution-requests`, { query, signal });
}

export function createExecutionRequest(
  pmocId: string,
  payload: { scheduledFor?: string; notes?: string } = {},
): Promise<PmocExecutionRequest> {
  return api.post<PmocExecutionRequest>(`/pmoc/${pmocId}/execution-requests`, payload);
}

export function getExecutionRequestPrefill(id: string): Promise<CreateOperationPayload> {
  return api.get<CreateOperationPayload>(`/pmoc/execution-requests/${id}/prefill`);
}

export function generateWorkOrder(
  id: string,
  operation: CreateOperationPayload,
): Promise<PmocExecutionRequest> {
  return api.post<PmocExecutionRequest>(`/pmoc/execution-requests/${id}/generate-work-order`, { operation });
}

export function cancelExecutionRequest(id: string): Promise<PmocExecutionRequest> {
  return api.patch<PmocExecutionRequest>(`/pmoc/execution-requests/${id}/cancel`, {});
}

export function rescheduleExecutionRequest(
  id: string,
  payload: { scheduledFor: string; notes?: string },
): Promise<PmocExecutionRequest> {
  return api.patch<PmocExecutionRequest>(`/pmoc/execution-requests/${id}/reschedule`, payload);
}

export function getHistory(pmocId: string): Promise<PmocHistoryItem[]> {
  return api.get<PmocHistoryItem[]>(`/pmoc/${pmocId}/history`);
}

export function runScheduler(limit = 25): Promise<{ recovered: number; attempted: number; generated: number; failed: number; manualPending: number }> {
  return api.post(`/pmoc/scheduler/run?limit=${limit}`, {});
}
