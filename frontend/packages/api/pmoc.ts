/** PMOC Compliance domain — production API. */
import { api } from "./client";
import type { Paginated, PmocPlan, PmocStats } from "@erp/types";

export type CreatePmocPayload = {
  sourceOperationId?: string;
  customerId: string;
  equipmentId: string;
  equipmentIds?: string[];
  responsibleTechnician: string;
  artNumber?: string;
  contractNumber?: string;
  startDate: string;
  endDate: string;
  observations?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recurrenceRule: {
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "INTERVAL_DAYS" | "INTERVAL_MONTHS";
    interval?: number;
  };
  active?: boolean;
};

export type ListPmocParams = {
  page?: number;
  limit?: number;
  customerId?: string;
  equipmentId?: string;
  active?: boolean;
  signal?: AbortSignal;
};

export function getPmocStats(opts?: { signal?: AbortSignal }): Promise<PmocStats> {
  return api.get<PmocStats>("/pmoc/stats", opts);
}

export function listPmoc(params?: ListPmocParams): Promise<Paginated<PmocPlan>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<PmocPlan>>("/pmoc", { query, signal });
}

export function getPmoc(id: string, opts?: { signal?: AbortSignal }): Promise<PmocPlan> {
  return api.get<PmocPlan>(`/pmoc/${id}`, opts);
}

export function createPmoc(payload: CreatePmocPayload): Promise<PmocPlan> {
  return api.post<PmocPlan>("/pmoc", payload);
}
