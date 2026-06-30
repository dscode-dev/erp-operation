/** Signature domain API. */
import { api } from "./client";
import type { Paginated, Signature, SignatureImage } from "@erp/types";

export type ListSignaturesParams = {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  signal?: AbortSignal;
};

export type SignaturePayload = {
  name: string;
  title: string;
  active?: boolean;
};

export function listSignatures(params?: ListSignaturesParams): Promise<Paginated<Signature>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<Signature>>("/signatures", { query, signal });
}

export function getSignature(id: string, opts?: { signal?: AbortSignal }): Promise<Signature> {
  return api.get<Signature>(`/signatures/${id}`, opts);
}

export function createSignature(payload: SignaturePayload): Promise<Signature> {
  return api.post<Signature>("/signatures", payload);
}

export function updateSignature(id: string, payload: Partial<SignaturePayload>): Promise<Signature> {
  return api.patch<Signature>(`/signatures/${id}`, payload);
}

export function deleteSignature(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/signatures/${id}`);
}

export function uploadSignatureImage(id: string, file: File): Promise<Signature> {
  const form = new FormData();
  form.append("file", file);
  return api.upload<Signature>(`/signatures/${id}/upload`, form);
}

export function downloadSignatureImage(id: string, opts?: { signal?: AbortSignal }): Promise<SignatureImage> {
  return api.get<SignatureImage>(`/signatures/${id}/download`, opts);
}
