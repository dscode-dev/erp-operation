/** Equipment domain — production API (no mocks). */
import { api } from "./client";
import type {
  AssetWithContent,
  CreateEquipmentPayload,
  EquipmentDetail,
  EquipmentMetric,
  EquipmentStats,
  EquipmentStatus,
  EquipmentSummary,
  EquipmentType,
  Paginated,
} from "./types";

export function listEquipments(params?: {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  addressId?: string;
  status?: EquipmentStatus;
  type?: EquipmentType;
  signal?: AbortSignal;
}): Promise<Paginated<EquipmentSummary>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<EquipmentSummary>>("/equipments", { query, signal });
}

export function getEquipmentStats(opts?: { signal?: AbortSignal }): Promise<EquipmentStats> {
  return api.get<EquipmentStats>("/equipments/stats", opts);
}

export function getEquipment(id: string, opts?: { signal?: AbortSignal }): Promise<EquipmentDetail> {
  return api.get<EquipmentDetail>(`/equipments/${id}`, opts);
}

export function createEquipment(payload: CreateEquipmentPayload): Promise<EquipmentDetail> {
  return api.post<EquipmentDetail>("/equipments", payload);
}

export function updateEquipment(
  id: string,
  payload: Partial<CreateEquipmentPayload>,
): Promise<EquipmentDetail> {
  return api.patch<EquipmentDetail>(`/equipments/${id}`, payload);
}

export function disableEquipment(id: string): Promise<EquipmentDetail> {
  return api.patch<EquipmentDetail>(`/equipments/${id}/disable`);
}

export function enableEquipment(id: string): Promise<EquipmentDetail> {
  return api.patch<EquipmentDetail>(`/equipments/${id}/enable`);
}

export function deleteEquipment(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/equipments/${id}`);
}

/* ---------- Metrics ---------- */

export function listMetrics(equipmentId: string): Promise<EquipmentMetric[]> {
  return api.get<EquipmentMetric[]>(`/equipments/${equipmentId}/metrics`);
}

export function createMetric(
  equipmentId: string,
  payload: { key: string; value: number; unit?: string; recordedAt?: string },
): Promise<EquipmentMetric> {
  return api.post<EquipmentMetric>(`/equipments/${equipmentId}/metrics`, payload);
}

/* ---------- Attachments ---------- */

export function uploadEquipmentAttachment(
  equipmentId: string,
  category: "PHOTO" | "MANUAL" | "WARRANTY" | "DOCUMENT",
  file: File,
): Promise<{ id: string }> {
  const form = new FormData();
  form.append("category", category);
  form.append("file", file);
  return api.upload<{ id: string }>(`/equipments/${equipmentId}/attachments`, form);
}

export function getEquipmentAttachment(attachmentId: string): Promise<AssetWithContent> {
  return api.get<AssetWithContent>(`/equipments/attachments/${attachmentId}`);
}
