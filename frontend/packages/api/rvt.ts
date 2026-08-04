import type { OperationDetail, Paginated, RvtExecution, RvtExecutionPrefill, RvtExecutionStatus, RvtPlan, RvtPlanStatus } from '@erp/types';
import { api } from './client';

export type ListRvtPlansParams = {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  equipmentId?: string;
  status?: RvtPlanStatus;
  signal?: AbortSignal;
};

export type RvtPlanPayload = {
  customerId: string;
  addressId: string;
  name: string;
  maintenanceType: 'WEEKLY' | 'SEMIANNUAL';
  startDate: string;
  endDate: string;
  responsibleTechnicianId: string;
  defaultOperatorId?: string | null;
  equipmentIds: string[];
  checklistCatalogIds: string[];
  observations?: string | null;
};

export function listPlans(params?: ListRvtPlansParams): Promise<Paginated<RvtPlan>> {
  const { signal, ...query } = params ?? {};
  return api.get('/rvt-plans', { query, signal });
}

export function getPlan(id: string, options?: { signal?: AbortSignal }): Promise<RvtPlan> {
  return api.get(`/rvt-plans/${id}`, options);
}

export function createPlan(payload: RvtPlanPayload): Promise<RvtPlan> {
  return api.post('/rvt-plans', payload);
}

export function updatePlan(id: string, payload: Partial<Omit<RvtPlanPayload, 'customerId'>> & { status?: RvtPlanStatus }): Promise<RvtPlan> {
  return api.patch(`/rvt-plans/${id}`, payload);
}

export function cancelPlan(id: string): Promise<{ deleted: true }> {
  return api.delete(`/rvt-plans/${id}`);
}

export function listExecutions(id: string, params?: { page?: number; limit?: number; status?: RvtExecutionStatus; from?: string; to?: string; signal?: AbortSignal }): Promise<Paginated<RvtExecution>> {
  const { signal, ...query } = params ?? {};
  return api.get(`/rvt-plans/${id}/executions`, { query, signal });
}

export function getExecutionPrefill(id: string, options?: { signal?: AbortSignal }): Promise<RvtExecutionPrefill> {
  return api.get(`/rvt-executions/${id}/prefill`, options);
}

export function prepareExecution(id: string, operatorId?: string): Promise<OperationDetail> {
  return api.post(`/rvt-executions/${id}/prepare`, operatorId ? { operatorId } : {});
}

export function registerAdHoc(operationId: string): Promise<RvtPlan> {
  return api.post('/rvt-plans/ad-hoc', { operationId });
}
