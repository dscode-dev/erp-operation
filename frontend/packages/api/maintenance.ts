/** Maintenance Planning domain — production API. */
import { api } from "./client";
import type {
  MaintenanceExecution,
  MaintenanceExecutionStatus,
  MaintenancePlan,
  MaintenancePlanType,
  MaintenancePriority,
  MaintenanceStats,
  Paginated,
} from "@erp/types";

export type ListMaintenancePlansParams = {
  page?: number;
  limit?: number;
  equipmentId?: string;
  type?: MaintenancePlanType;
  priority?: MaintenancePriority;
  active?: boolean;
  signal?: AbortSignal;
};

export type ListMaintenanceExecutionsParams = {
  page?: number;
  limit?: number;
  status?: MaintenanceExecutionStatus;
  from?: string;
  to?: string;
  signal?: AbortSignal;
};

export function getMaintenanceStats(opts?: { signal?: AbortSignal }): Promise<MaintenanceStats> {
  return api.get<MaintenanceStats>("/maintenance-plans/stats", opts);
}

export function listMaintenancePlans(params?: ListMaintenancePlansParams): Promise<Paginated<MaintenancePlan>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<MaintenancePlan>>("/maintenance-plans", { query, signal });
}

export function getMaintenancePlan(id: string, opts?: { signal?: AbortSignal }): Promise<MaintenancePlan> {
  return api.get<MaintenancePlan>(`/maintenance-plans/${id}`, opts);
}

export function listMaintenanceExecutions(
  planId: string,
  params?: ListMaintenanceExecutionsParams,
): Promise<Paginated<MaintenanceExecution>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<MaintenanceExecution>>(`/maintenance-plans/${planId}/executions`, { query, signal });
}
