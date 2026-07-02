/** Financial domain — production API (no mocks, no demo bridge). */
import { api } from "./client";
import type {
  FinancialAccount,
  FinancialAccountPayload,
  FinancialAccountType,
  FinancialCategory,
  FinancialCategoryPayload,
  FinancialCategoryType,
  FinancialEntry,
  FinancialEntryOrigin,
  FinancialEntryPayload,
  FinancialEntryStatus,
  FinancialEntryType,
  FinancialHistory,
  FinancialStats,
  Paginated,
} from "@erp/types";

export type ListFinancialAccountsParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: FinancialAccountType;
  active?: boolean;
  signal?: AbortSignal;
};

export type ListFinancialCategoriesParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: FinancialCategoryType;
  active?: boolean;
  signal?: AbortSignal;
};

export type ListFinancialEntriesParams = {
  page?: number;
  limit?: number;
  search?: string;
  accountId?: string;
  categoryId?: string;
  type?: FinancialEntryType;
  origin?: FinancialEntryOrigin;
  status?: FinancialEntryStatus;
  from?: string;
  to?: string;
  signal?: AbortSignal;
};

export function listAccounts(params?: ListFinancialAccountsParams): Promise<Paginated<FinancialAccount>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<FinancialAccount>>("/financial/accounts", { query, signal });
}

export function createAccount(payload: FinancialAccountPayload): Promise<FinancialAccount> {
  return api.post<FinancialAccount>("/financial/accounts", payload);
}

export function updateAccount(id: string, payload: FinancialAccountPayload): Promise<FinancialAccount> {
  return api.patch<FinancialAccount>(`/financial/accounts/${id}`, payload);
}

export function deleteAccount(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/financial/accounts/${id}`);
}

export function listCategories(params?: ListFinancialCategoriesParams): Promise<Paginated<FinancialCategory>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<FinancialCategory>>("/financial/categories", { query, signal });
}

export function createCategory(payload: FinancialCategoryPayload): Promise<FinancialCategory> {
  return api.post<FinancialCategory>("/financial/categories", payload);
}

export function updateCategory(id: string, payload: FinancialCategoryPayload): Promise<FinancialCategory> {
  return api.patch<FinancialCategory>(`/financial/categories/${id}`, payload);
}

export function deleteCategory(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/financial/categories/${id}`);
}

export function listEntries(params?: ListFinancialEntriesParams): Promise<Paginated<FinancialEntry>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<FinancialEntry>>("/financial/entries", { query, signal });
}

export function getEntry(id: string, opts?: { signal?: AbortSignal }): Promise<FinancialEntry> {
  return api.get<FinancialEntry>(`/financial/entries/${id}`, opts);
}

export function createEntry(payload: FinancialEntryPayload): Promise<FinancialEntry> {
  return api.post<FinancialEntry>("/financial/entries", payload);
}

export function updateEntry(id: string, payload: FinancialEntryPayload): Promise<FinancialEntry> {
  return api.patch<FinancialEntry>(`/financial/entries/${id}`, payload);
}

export function payEntry(id: string, payload?: { paidAt?: string; notes?: string | null }): Promise<FinancialEntry> {
  return api.patch<FinancialEntry>(`/financial/entries/${id}/pay`, payload ?? {});
}

export function cancelEntry(id: string, payload?: { reason?: string | null }): Promise<FinancialEntry> {
  return api.patch<FinancialEntry>(`/financial/entries/${id}/cancel`, payload ?? {});
}

export function getStats(opts?: { signal?: AbortSignal }): Promise<FinancialStats> {
  return api.get<FinancialStats>("/financial/stats", opts);
}

export function getHistory(
  id: string,
  params?: { page?: number; limit?: number; signal?: AbortSignal },
): Promise<Paginated<FinancialHistory>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<FinancialHistory>>(`/financial/history/${id}`, { query, signal });
}
