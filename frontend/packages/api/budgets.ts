/** Budget domain — production API (no mocks, no local commercial rules). */
import { api } from "./client";
import type {
  Budget,
  BudgetHistory,
  BudgetPayload,
  BudgetStats,
  BudgetStatus,
  DocumentBlueprint,
  DocumentDownloadResult,
  DocumentRenderResult,
  Paginated,
} from "@erp/types";

export type ListBudgetsParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: BudgetStatus;
  customerId?: string;
  equipmentId?: string;
  operationId?: string;
  from?: string;
  to?: string;
  expired?: boolean;
  signal?: AbortSignal;
};

export function listBudgets(params?: ListBudgetsParams): Promise<Paginated<Budget>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<Budget>>("/budgets", { query, signal });
}

export function getBudget(id: string, opts?: { signal?: AbortSignal }): Promise<Budget> {
  return api.get<Budget>(`/budgets/${id}`, opts);
}

export function listOperationBudgets(
  operationId: string,
  params?: Omit<ListBudgetsParams, "operationId">,
): Promise<Paginated<Budget>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<Budget>>(`/operations/${operationId}/budgets`, { query, signal });
}

export function createBudget(payload: BudgetPayload): Promise<Budget> {
  return api.post<Budget>("/budgets", payload);
}

export function updateBudget(id: string, payload: Partial<BudgetPayload>): Promise<Budget> {
  return api.patch<Budget>(`/budgets/${id}`, payload);
}

export function approveBudget(id: string, payload?: { observation?: string | null }): Promise<Budget> {
  return api.patch<Budget>(`/budgets/${id}/approve`, payload ?? {});
}

export function rejectBudget(id: string, payload?: { observation?: string | null }): Promise<Budget> {
  return api.patch<Budget>(`/budgets/${id}/reject`, payload ?? {});
}

export function cancelBudget(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/budgets/${id}`);
}

export function getBudgetStats(params?: ListBudgetsParams): Promise<BudgetStats> {
  const { signal, ...query } = params ?? {};
  return api.get<BudgetStats>("/budgets/stats", { query, signal });
}

export function getBudgetHistory(
  id: string,
  params?: { page?: number; limit?: number; signal?: AbortSignal },
): Promise<Paginated<BudgetHistory>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<BudgetHistory>>(`/budgets/history/${id}`, { query, signal });
}

export type BudgetRenderResult = {
  documentId: string;
  preview: DocumentBlueprint;
  download: string;
  status: DocumentRenderResult["status"];
  document: DocumentRenderResult;
};

export function renderBudget(id: string): Promise<BudgetRenderResult> {
  return api.post<BudgetRenderResult>(`/budgets/${id}/render`, {});
}

export function downloadBudget(id: string, opts?: { signal?: AbortSignal }): Promise<DocumentDownloadResult> {
  return api.blob(`/budgets/${id}/download`, opts);
}
