/**
 * Atendimento (field service) draft model + submission.
 *
 * Finalizing the wizard now creates a real Operation in the backend (the central
 * operational domain), which also generates a Work Order (OS) draft. Reading data
 * (clients, equipments) and writing the Operation both use the production API.
 */
import { operationApi } from "@erp/api";
import type { CreateOperationPayload, OperationDetail } from "@erp/api";
import type { CapturedPhoto } from "@erp/ui/photo-input";
import type { ServiceTypeKey } from "./service-types";

export type AtendimentoDraft = {
  customerId: string | null;
  addressId: string | null;
  equipmentId: string | null;
  /** ServiceTypeKey maps 1:1 to the backend OperationType. */
  serviceType: ServiceTypeKey | null;
  checklist: { label: string; done: boolean }[];
  notes: string;
  photos: CapturedPhoto[];
  signature: string | null;
  startedAt: string | null;
};

/** Read a captured File into a data URL for the create payload. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read error"));
    reader.readAsDataURL(file);
  });
}

/** Find the generated Work Order number on a created operation, if any. */
export function workOrderNumber(operation: OperationDetail): string | null {
  return operation.documents.find((d) => d.type === "WORK_ORDER")?.number ?? null;
}

export async function createOperationFromDraft(draft: AtendimentoDraft): Promise<OperationDetail> {
  if (!draft.customerId) throw new Error("Cliente é obrigatório");
  if (!draft.serviceType) throw new Error("Tipo de atendimento é obrigatório");

  const photos = await Promise.all(
    draft.photos.map(async (p) => ({ dataUrl: await fileToDataUrl(p.file), caption: p.name })),
  );

  const now = new Date().toISOString();
  const payload: CreateOperationPayload = {
    customerId: draft.customerId,
    addressId: draft.addressId,
    equipmentId: draft.equipmentId,
    type: draft.serviceType,
    status: "COMPLETED",
    startedAt: draft.startedAt ?? now,
    completedAt: now,
    checklist: draft.checklist,
    serviceDescription: draft.notes.trim() || null,
    signatureData: draft.signature,
    signedAt: draft.signature ? now : null,
    photos,
  };

  return operationApi.createOperation(payload);
}
