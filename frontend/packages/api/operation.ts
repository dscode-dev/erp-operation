/**
 * Operation domain — production API (no mocks).
 *
 * An Operation is the central field-service record reused by every produced
 * document (OS, PMOC, Laudo, Relatório, Orçamento, Recibo). Creating one also
 * generates a Work Order (OS) in DRAFT on the backend.
 *
 */
import { api } from './client';
import type {
  CreateOperationPayload,
  OperationDetail,
  OperationStats,
  OperationSummary,
  OperationStatus,
  OperationType,
  Paginated,
} from '@erp/types';

export type OperationPhotoContent = {
  id: string;
  caption: string | null;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  createdBy: { id: string; name: string; role: string } | null;
  contentBase64: string;
};

export function listOperations(params?: {
  page?: number;
  limit?: number;
  search?: string;
  customerId?: string;
  equipmentId?: string;
  operatorId?: string;
  type?: OperationType;
  status?: OperationStatus;
  signal?: AbortSignal;
}): Promise<Paginated<OperationSummary>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<OperationSummary>>('/operations', { query, signal });
}

export function exportOperationsPdf(params?: {
  search?: string;
  customerId?: string;
  equipmentId?: string;
  operatorId?: string;
  type?: OperationType;
  status?: OperationStatus;
  signal?: AbortSignal;
}): Promise<{ blob: Blob; filename: string | null }> {
  const { signal, ...query } = params ?? {};
  return api.blob('/operations/export', { query, signal });
}

export function getOperationStats(opts?: { signal?: AbortSignal }): Promise<OperationStats> {
  return api.get<OperationStats>('/operations/stats', opts);
}

export function getOperation(
  id: string,
  opts?: { signal?: AbortSignal },
): Promise<OperationDetail> {
  return api.get<OperationDetail>(`/operations/${id}`, opts);
}

export function createOperation(payload: CreateOperationPayload): Promise<OperationDetail> {
  return api.post<OperationDetail>('/operations', payload);
}

export function updateOperation(
  id: string,
  payload: Partial<
    Pick<
      CreateOperationPayload,
      | 'status'
      | 'startedAt'
      | 'completedAt'
      | 'checklist'
      | 'observations'
      | 'reportedIssue'
      | 'serviceDescription'
      | 'receiptNumber'
      | 'receiptIssuedAt'
      | 'receiptAmount'
      | 'receiptAmountInWords'
      | 'receiptService'
      | 'receiptDescription'
      | 'receiptWarrantyDays'
      | 'receiptDeclaration'
      | 'technicalDiagnosis'
      | 'technicalRecommendations'
      | 'technicalOpinionObjective'
      | 'technicalOpinionObjectiveItems'
      | 'technicalOpinionConditions'
      | 'technicalOpinionAnalysis'
      | 'technicalOpinionConclusion'
      | 'technicalOpinionConclusionItems'
      | 'technicalOpinionRecommendations'
      | 'technicalOpinionResponsible'
      | 'technicalOpinionCrea'
      | 'referenceMonth'
      | 'referenceYear'
      | 'maintenanceType'
      | 'maintenanceChecklist'
      | 'inspectedEquipments'
      | 'signatureData'
      | 'customerSignerName'
      | 'customerSignerRole'
      | 'signedAt'
      | 'photos'
    >
  >,
): Promise<OperationDetail> {
  return api.patch<OperationDetail>(`/operations/${id}`, payload);
}

export function getOperationPhoto(
  photoId: string,
  opts?: { signal?: AbortSignal },
): Promise<OperationPhotoContent> {
  return api.get<OperationPhotoContent>(`/operations/photos/${photoId}`, opts);
}

export function updateOperationPhoto(photoId: string, caption: string): Promise<OperationDetail> {
  return api.patch<OperationDetail>(`/operations/photos/${photoId}`, { caption });
}

export function deleteOperationPhoto(photoId: string): Promise<OperationDetail> {
  return api.delete<OperationDetail>(`/operations/photos/${photoId}`);
}
