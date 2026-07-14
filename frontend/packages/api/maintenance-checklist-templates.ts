import type {
  MaintenanceChecklistTemplate,
  OperationMaintenanceType,
  Paginated,
} from '@erp/types';
import { api } from './client';

export type ListMaintenanceChecklistTemplatesParams = {
  page?: number;
  limit?: number;
  search?: string;
  maintenanceType?: OperationMaintenanceType;
  active?: boolean;
  signal?: AbortSignal;
};

export type MaintenanceChecklistTemplatePayload = {
  maintenanceType: OperationMaintenanceType;
  description: string;
  active?: boolean;
};

export function list(
  params?: ListMaintenanceChecklistTemplatesParams,
): Promise<Paginated<MaintenanceChecklistTemplate>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<MaintenanceChecklistTemplate>>('/maintenance-checklist-templates', {
    query,
    signal,
  });
}

export function create(
  payload: MaintenanceChecklistTemplatePayload,
): Promise<MaintenanceChecklistTemplate> {
  return api.post<MaintenanceChecklistTemplate>('/maintenance-checklist-templates', payload);
}

export function update(
  id: string,
  payload: Partial<MaintenanceChecklistTemplatePayload>,
): Promise<MaintenanceChecklistTemplate> {
  return api.patch<MaintenanceChecklistTemplate>(`/maintenance-checklist-templates/${id}`, payload);
}

export function deactivate(id: string): Promise<{ deactivated: true }> {
  return api.delete<{ deactivated: true }>(`/maintenance-checklist-templates/${id}`);
}
