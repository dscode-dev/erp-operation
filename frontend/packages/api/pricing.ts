/** Pricing domain — production API (no mocks). */
import { api } from "./client";
import type {
  Paginated,
  PricingStats,
  ProductPricing,
  ProductPricingPayload,
  ResolvedProductPricing,
} from "@erp/types";

export function getPricingStats(params?: { at?: string; signal?: AbortSignal }): Promise<PricingStats> {
  const { signal, ...query } = params ?? {};
  return api.get<PricingStats>("/pricing/stats", { query, signal });
}

export function listPricing(params?: {
  page?: number;
  limit?: number;
  productId?: string;
  active?: boolean;
  at?: string;
  expired?: boolean;
  search?: string;
  signal?: AbortSignal;
}): Promise<Paginated<ProductPricing>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<ProductPricing>>("/pricing", { query, signal });
}

export function getPricing(id: string, opts?: { signal?: AbortSignal }): Promise<ProductPricing> {
  return api.get<ProductPricing>(`/pricing/${id}`, opts);
}

export function getProductPricing(productId: string, opts?: { signal?: AbortSignal }): Promise<ResolvedProductPricing> {
  return api.get<ResolvedProductPricing>(`/products/${productId}/pricing`, opts);
}

export function createProductPricing(productId: string, payload: ProductPricingPayload): Promise<ProductPricing> {
  return api.post<ProductPricing>(`/products/${productId}/pricing`, payload);
}

export function revisePricing(pricingId: string, payload: Partial<ProductPricingPayload>): Promise<ProductPricing> {
  return api.patch<ProductPricing>(`/pricing/${pricingId}`, payload);
}

export function getPricingHistory(
  productId: string,
  params?: { page?: number; limit?: number; signal?: AbortSignal },
): Promise<Paginated<ProductPricing>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<ProductPricing>>(`/pricing/history/${productId}`, { query, signal });
}
