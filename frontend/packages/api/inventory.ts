/** Inventory & Materials domain — production API (no mocks). */
import { api } from "./client";
import type {
  InventoryItem,
  InventoryStats,
  InventoryUpdatePayload,
  OperationMaterialPayload,
  OperationPart,
  Paginated,
  Product,
  ProductPayload,
  StockMovement,
  StockMovementPayload,
  StockMovementType,
  Supplier,
  SupplierPayload,
} from "@erp/types";

export function listProducts(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  active?: boolean;
  purchasable?: boolean;
  sellable?: boolean;
  signal?: AbortSignal;
}): Promise<Paginated<Product>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<Product>>("/products", { query, signal });
}

export function getProduct(id: string, opts?: { signal?: AbortSignal }): Promise<Product> {
  return api.get<Product>(`/products/${id}`, opts);
}

export function createProduct(payload: ProductPayload): Promise<Product> {
  return api.post<Product>("/products", payload);
}

export function updateProduct(id: string, payload: ProductPayload): Promise<Product> {
  return api.patch<Product>(`/products/${id}`, payload);
}

export function deleteProduct(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/products/${id}`);
}

export function listInventory(params?: {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
  location?: string;
  critical?: boolean;
  active?: boolean;
  signal?: AbortSignal;
}): Promise<Paginated<InventoryItem>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<InventoryItem>>("/inventory", { query, signal });
}

export function getInventoryItem(id: string, opts?: { signal?: AbortSignal }): Promise<InventoryItem> {
  return api.get<InventoryItem>(`/inventory/${id}`, opts);
}

export function updateInventoryItem(id: string, payload: InventoryUpdatePayload): Promise<InventoryItem> {
  return api.patch<InventoryItem>(`/inventory/${id}`, payload);
}

export function getInventoryStats(opts?: { signal?: AbortSignal }): Promise<InventoryStats> {
  return api.get<InventoryStats>("/inventory/stats", opts);
}

export function createStockMovement(payload: StockMovementPayload): Promise<StockMovement> {
  return api.post<StockMovement>("/inventory/movements", payload);
}

export function listStockMovements(params?: {
  page?: number;
  limit?: number;
  inventoryItemId?: string;
  productId?: string;
  operationId?: string;
  type?: StockMovementType;
  from?: string;
  to?: string;
  signal?: AbortSignal;
}): Promise<Paginated<StockMovement>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<StockMovement>>("/inventory/movements", { query, signal });
}

export function listSuppliers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  signal?: AbortSignal;
}): Promise<Paginated<Supplier>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<Supplier>>("/suppliers", { query, signal });
}

export function createSupplier(payload: SupplierPayload): Promise<Supplier> {
  return api.post<Supplier>("/suppliers", payload);
}

export function updateSupplier(id: string, payload: SupplierPayload): Promise<Supplier> {
  return api.patch<Supplier>(`/suppliers/${id}`, payload);
}

export function deleteSupplier(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/suppliers/${id}`);
}

export function listOperationMaterials(operationId: string, opts?: { signal?: AbortSignal }): Promise<OperationPart[]> {
  return api.get<OperationPart[]>(`/operations/${operationId}/materials`, opts);
}

export function addOperationMaterial(operationId: string, payload: OperationMaterialPayload): Promise<OperationPart> {
  return api.post<OperationPart>(`/operations/${operationId}/materials`, payload);
}

export function deleteOperationMaterial(operationId: string, materialId: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/operations/${operationId}/materials/${materialId}`);
}
