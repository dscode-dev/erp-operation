/** Asset Lifecycle domain — production API. */
import { api } from "./client";
import type {
  AssetLifecycleEvent,
  AssetLifecycleEventType,
  AssetLifecycleStats,
  PaginatedTimeline,
} from "@erp/types";

export type ListAssetLifecycleParams = {
  page?: number;
  limit?: number;
  customerId?: string;
  equipmentId?: string;
  operationId?: string;
  type?: AssetLifecycleEventType;
  performedBy?: string;
  from?: string;
  to?: string;
  signal?: AbortSignal;
};

export function listLifecycle(params?: ListAssetLifecycleParams): Promise<PaginatedTimeline<AssetLifecycleEvent>> {
  const { signal, ...query } = params ?? {};
  return api.get<PaginatedTimeline<AssetLifecycleEvent>>("/asset-lifecycle", { query, signal });
}

export function getLifecycleEvent(id: string, opts?: { signal?: AbortSignal }): Promise<AssetLifecycleEvent> {
  return api.get<AssetLifecycleEvent>(`/asset-lifecycle/${id}`, opts);
}

export function listEquipmentLifecycle(
  equipmentId: string,
  params?: Omit<ListAssetLifecycleParams, "equipmentId" | "customerId">,
): Promise<PaginatedTimeline<AssetLifecycleEvent>> {
  const { signal, ...query } = params ?? {};
  return api.get<PaginatedTimeline<AssetLifecycleEvent>>(`/equipments/${equipmentId}/lifecycle`, { query, signal });
}

export function getEquipmentLifecycleStats(equipmentId: string, opts?: { signal?: AbortSignal }): Promise<AssetLifecycleStats> {
  return api.get<AssetLifecycleStats>(`/equipments/${equipmentId}/lifecycle/stats`, opts);
}
