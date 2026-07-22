import { api } from './client';
import type { Paginated, Sale, SalePayload, SaleReceiptPrefill, SaleStatus } from '@erp/types';

export function listSales(params?: {
  page?: number;
  limit?: number;
  customerId?: string;
  status?: SaleStatus;
  search?: string;
  from?: string;
  to?: string;
  signal?: AbortSignal;
}): Promise<Paginated<Sale>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<Sale>>('/sales', { query, signal });
}
export function getSale(id: string, opts?: { signal?: AbortSignal }): Promise<Sale> {
  return api.get<Sale>(`/sales/${id}`, opts);
}
export function createSale(payload: SalePayload): Promise<Sale> {
  return api.post<Sale>('/sales', payload);
}
export function updateSale(id: string, payload: Partial<SalePayload>): Promise<Sale> {
  return api.patch<Sale>(`/sales/${id}`, payload);
}
export function completeSale(id: string): Promise<Sale> {
  return api.patch<Sale>(`/sales/${id}/complete`);
}
export function cancelSale(id: string): Promise<Sale> {
  return api.delete<Sale>(`/sales/${id}`);
}
export function getReceiptPrefill(
  id: string,
  opts?: { signal?: AbortSignal },
): Promise<SaleReceiptPrefill> {
  return api.get<SaleReceiptPrefill>(`/sales/${id}/receipt-prefill`, opts);
}
