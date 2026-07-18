/**
 * Atendimento (field service) draft model + submission.
 *
 * Finalizing the wizard now creates a real Operation in the backend (the central
 * operational domain), which also generates a Work Order (OS) draft. Reading data
 * (clients, equipments) and writing the Operation both use the production API.
 */
import { assignmentsApi, documentsApi, operationApi } from '@erp/api';
import type { CreateOperationPayload, DocumentHandoff, DocumentKind, OperationDetail } from '@erp/api';
import type { CapturedPhoto } from '@erp/ui/photo-input';
import type { ServiceTypeKey } from './service-types';

export type AtendimentoDraft = {
  documentType: DocumentKind;
  customerId: string | null;
  addressId: string | null;
  equipmentId: string | null;
  inspectedEquipments: Array<{ equipmentId: string; sector: string }>;
  /** ServiceTypeKey maps 1:1 to the backend OperationType. */
  serviceType: ServiceTypeKey | null;
  checklist: { label: string; done: boolean }[];
  notes: string;
  objective: string[];
  conditions: string[];
  recommendations: string[];
  conclusion: string[];
  photos: CapturedPhoto[];
  signature: string | null;
  startedAt: string | null;
};

export type AtendimentoSubmission = {
  operation: OperationDetail;
  handoff: DocumentHandoff;
};

/** Read a captured File into a data URL for the create payload. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read error'));
    reader.readAsDataURL(file);
  });
}

/** Find the generated Work Order number on a created operation, if any. */
export function workOrderNumber(operation: OperationDetail): string | null {
  return operation.documents.find((d) => d.type === 'WORK_ORDER')?.number ?? null;
}

export async function createOperationFromDraft(draft: AtendimentoDraft): Promise<AtendimentoSubmission> {
  if (!draft.customerId) throw new Error('Cliente é obrigatório');
  if (!draft.serviceType) throw new Error('Tipo de atendimento é obrigatório');

  const photos = await Promise.all(
    draft.photos.map(async (p) => ({ dataUrl: await fileToDataUrl(p.file), caption: p.name })),
  );

  const now = new Date().toISOString();
  const payload: CreateOperationPayload = {
    customerId: draft.customerId,
    addressId: draft.addressId,
    equipmentId: draft.equipmentId,
    inspectedEquipments: draft.inspectedEquipments,
    type: draft.serviceType,
    documentType: draft.documentType,
    status: 'DRAFT',
    checklist: draft.checklist,
    serviceDescription: draft.notes.trim() || null,
    technicalOpinionObjective: draft.objective.join('\n') || null,
    technicalOpinionConditions: draft.conditions.join('\n') || null,
    technicalOpinionRecommendations: draft.recommendations.join('\n') || null,
    technicalOpinionConclusion: draft.conclusion.join('\n') || null,
    signatureData: draft.signature,
    signedAt: draft.signature ? now : null,
    photos,
  };

  const created = await operationApi.createOperation(payload);
  const assignments = await assignmentsApi.listMyAssignments({ operationId: created.id, limit: 1 });
  const assignment = assignments.items[0];
  if (!assignment) throw new Error('O atendimento foi criado, mas sua execução não foi localizada.');

  await assignmentsApi.acceptAssignment(assignment.id);
  await assignmentsApi.startAssignment(assignment.id);
  await assignmentsApi.completeAssignment(assignment.id, 'Atendimento iniciado e executado pelo operador.');

  const draftDocument = await documentsApi.saveHandoffDraft(created.id, draft.documentType);
  const handoff = await documentsApi.submitHandoff(draftDocument.id);
  const operation = await operationApi.getOperation(created.id);
  return { operation, handoff };
}
