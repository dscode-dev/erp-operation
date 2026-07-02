/** Procurement / Purchasing domain — production API (no mocks). */
import { api } from "./client";
import type {
  Paginated,
  PurchaseHistory,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderItemPayload,
  PurchaseOrderPayload,
  PurchaseOrderStats,
  PurchaseOrderStatus,
  PurchaseReceipt,
  PurchaseReceiptPayload,
} from "@erp/types";

export type ListPurchaseOrdersParams = {
  page?: number;
  limit?: number;
  search?: string;
  supplierId?: string;
  status?: PurchaseOrderStatus;
  from?: string;
  to?: string;
  signal?: AbortSignal;
};

export function listPurchaseOrders(params?: ListPurchaseOrdersParams): Promise<Paginated<PurchaseOrder>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<PurchaseOrder>>("/purchase-orders", { query, signal });
}

export function getPurchaseOrder(id: string, opts?: { signal?: AbortSignal }): Promise<PurchaseOrder> {
  return api.get<PurchaseOrder>(`/purchase-orders/${id}`, opts);
}

export function createPurchaseOrder(payload: PurchaseOrderPayload): Promise<PurchaseOrder> {
  return api.post<PurchaseOrder>("/purchase-orders", payload);
}

export function updatePurchaseOrder(id: string, payload: PurchaseOrderPayload): Promise<PurchaseOrder> {
  return api.patch<PurchaseOrder>(`/purchase-orders/${id}`, payload);
}

export function sendPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return api.patch<PurchaseOrder>(`/purchase-orders/${id}/send`, {});
}

export function cancelPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return api.patch<PurchaseOrder>(`/purchase-orders/${id}/cancel`, {});
}

export function listPurchaseOrderItems(id: string, opts?: { signal?: AbortSignal }): Promise<PurchaseOrderItem[]> {
  return api.get<PurchaseOrderItem[]>(`/purchase-orders/${id}/items`, opts);
}

export function createPurchaseOrderItem(id: string, payload: PurchaseOrderItemPayload): Promise<PurchaseOrderItem> {
  return api.post<PurchaseOrderItem>(`/purchase-orders/${id}/items`, payload);
}

export function updatePurchaseOrderItem(id: string, payload: PurchaseOrderItemPayload): Promise<PurchaseOrderItem> {
  return api.patch<PurchaseOrderItem>(`/purchase-order-items/${id}`, payload);
}

export function deletePurchaseOrderItem(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/purchase-order-items/${id}`);
}

export function listPurchaseReceipts(id: string, opts?: { signal?: AbortSignal }): Promise<PurchaseReceipt[]> {
  return api.get<PurchaseReceipt[]>(`/purchase-orders/${id}/receipts`, opts);
}

export function createPurchaseReceipt(
  id: string,
  payload: PurchaseReceiptPayload,
): Promise<{ receipt: PurchaseReceipt; purchaseOrder: PurchaseOrder }> {
  return api.post<{ receipt: PurchaseReceipt; purchaseOrder: PurchaseOrder }>(`/purchase-orders/${id}/receipts`, payload);
}

export function getPurchaseOrderStats(opts?: { signal?: AbortSignal }): Promise<PurchaseOrderStats> {
  return api.get<PurchaseOrderStats>("/purchase-orders/stats", opts);
}

export function getPurchaseOrderHistory(
  id: string,
  params?: { page?: number; limit?: number; signal?: AbortSignal },
): Promise<Paginated<PurchaseHistory>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<PurchaseHistory>>(`/purchase-orders/history/${id}`, { query, signal });
}
