import { api } from './client';
import type {
  OperationMaintenanceType,
  Paginated,
  TechnicalCatalog,
  TechnicalCatalogArea,
  TechnicalCatalogTaxonomy,
  TechnicalCatalogType,
  TechnicalCatalogTypeDescriptor,
  TechnicalCatalogWorkflow,
} from '@erp/types';

export type ListTechnicalCatalogsParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: TechnicalCatalogType;
  maintenanceType?: OperationMaintenanceType;
  areas?: TechnicalCatalogArea[];
  workflow?: TechnicalCatalogWorkflow;
  includeGeneral?: boolean;
  active?: boolean;
  sortBy?: 'sortOrder' | 'title' | 'updatedAt';
  order?: 'asc' | 'desc';
  signal?: AbortSignal;
};

export type TechnicalCatalogPayload = {
  type: TechnicalCatalogType;
  title: string;
  description?: string | null;
  tags?: string[];
  areas: TechnicalCatalogArea[];
  workflows: TechnicalCatalogWorkflow[];
  maintenanceType?: OperationMaintenanceType | null;
  sortOrder?: number;
  active?: boolean;
};

export function list(
  params: ListTechnicalCatalogsParams = {},
): Promise<Paginated<TechnicalCatalog>> {
  const { signal, areas, ...query } = params;
  return api.get<Paginated<TechnicalCatalog>>('/technical-catalogs', {
    query: { ...query, areas: areas?.join(',') },
    signal,
  });
}

export function taxonomy(opts?: { signal?: AbortSignal }): Promise<TechnicalCatalogTaxonomy> {
  return api.get<TechnicalCatalogTaxonomy>('/technical-catalogs/taxonomy', opts);
}

export function types(opts?: { signal?: AbortSignal }): Promise<TechnicalCatalogTypeDescriptor[]> {
  return api.get<TechnicalCatalogTypeDescriptor[]>('/technical-catalogs/types', opts);
}

export function get(id: string, opts?: { signal?: AbortSignal }): Promise<TechnicalCatalog> {
  return api.get<TechnicalCatalog>(`/technical-catalogs/${id}`, opts);
}

export function create(payload: TechnicalCatalogPayload): Promise<TechnicalCatalog> {
  return api.post<TechnicalCatalog>('/technical-catalogs', payload);
}

export function update(
  id: string,
  payload: Partial<Omit<TechnicalCatalogPayload, 'type'>>,
): Promise<TechnicalCatalog> {
  return api.patch<TechnicalCatalog>(`/technical-catalogs/${id}`, payload);
}

export function reorder(
  type: TechnicalCatalogType,
  items: Array<{ id: string; sortOrder: number }>,
): Promise<{ reordered: number }> {
  return api.patch<{ reordered: number }>('/technical-catalogs/reorder', { type, items });
}

export function remove(id: string): Promise<{ deleted: true }> {
  return api.delete<{ deleted: true }>(`/technical-catalogs/${id}`);
}
