import { api } from './client';
import type {
  DocumentTemplateType,
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

/** Mapeia o tipo de documento do atendimento para o workflow do catálogo. */
export function documentWorkflow(type: DocumentTemplateType): TechnicalCatalogWorkflow {
  switch (type) {
    case 'WORK_ORDER':
      return 'WORK_ORDER';
    case 'TECHNICAL_REPORT':
      return 'TECHNICAL_REPORT';
    case 'TECHNICAL_OPINION':
      return 'TECHNICAL_OPINION';
    case 'PMOC':
      return 'PMOC';
    default:
      return 'GENERAL';
  }
}

/**
 * Itens de checklist ATIVOS registrados em Catálogos Técnicos para um workflow
 * (inclui os itens GERAIS). Fonte única dos "checks de atendimento" usados pelo
 * wizard do operador e pelo drawer de nova operação — sem mocks.
 */
export function listChecklistItems(
  workflow: TechnicalCatalogWorkflow,
  opts?: { maintenanceType?: OperationMaintenanceType; signal?: AbortSignal },
): Promise<TechnicalCatalog[]> {
  return list({
    type: 'CHECKLIST',
    workflow,
    includeGeneral: true,
    active: true,
    maintenanceType: opts?.maintenanceType,
    sortBy: 'sortOrder',
    order: 'asc',
    limit: 100,
    signal: opts?.signal,
  }).then((page) => page.items);
}
