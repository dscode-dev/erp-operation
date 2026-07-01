/** Production Document Engine API. */
import { api } from "./client";
import type {
  DocumentBlueprint,
  DocumentConfiguration,
  DocumentDownloadResult,
  DocumentKind,
  DocumentRenderResult,
} from "@erp/types";

export function previewOperationDocument(
  operationId: string,
  type: DocumentKind,
  opts?: { signal?: AbortSignal },
): Promise<DocumentBlueprint> {
  return api.get<DocumentBlueprint>(`/documents/operations/${operationId}/${type}/preview`, opts);
}

export function renderOperationDocument(
  operationId: string,
  type: DocumentKind,
): Promise<DocumentRenderResult> {
  return api.post<DocumentRenderResult>(`/documents/operations/${operationId}/${type}/render`);
}

export function previewDocument(documentId: string, opts?: { signal?: AbortSignal }): Promise<DocumentBlueprint> {
  return api.get<DocumentBlueprint>(`/documents/${documentId}/preview`, opts);
}

export function previewTemplateDocument(templateId: string, opts?: { signal?: AbortSignal }): Promise<DocumentBlueprint> {
  return api.get<DocumentBlueprint>(`/documents/templates/${templateId}/preview`, opts);
}

export function renderDocument(documentId: string): Promise<DocumentRenderResult> {
  return api.post<DocumentRenderResult>(`/documents/${documentId}/render`);
}

export function downloadDocument(documentId: string, opts?: { signal?: AbortSignal }): Promise<DocumentDownloadResult> {
  return api.get<DocumentDownloadResult>(`/documents/${documentId}/download`, opts);
}

export function listConfiguration(opts?: { signal?: AbortSignal }): Promise<DocumentConfiguration[]> {
  return api.get<DocumentConfiguration[]>("/documents/configuration", opts);
}

export function getConfigurationByType(
  type: DocumentKind,
  opts?: { signal?: AbortSignal },
): Promise<DocumentConfiguration> {
  return api.get<DocumentConfiguration>(`/documents/configuration/types/${type}`, opts);
}

export function getConfigurationByTemplate(
  templateId: string,
  opts?: { signal?: AbortSignal },
): Promise<DocumentConfiguration> {
  return api.get<DocumentConfiguration>(`/documents/configuration/templates/${templateId}`, opts);
}
