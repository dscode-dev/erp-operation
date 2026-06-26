/**
 * Atendimento (field service) draft model + submission.
 *
 * Reading data (clients, equipments) uses the real backend. There is no Service
 * domain endpoint yet, so submission is enqueued in the offline outbox
 * (offline-ready). When Backend Sprint 6 ships the endpoint, `submitAtendimento`
 * becomes a real POST + sync — no UI refactor required.
 */
import { enqueue } from "./offline-queue";
import type { ServiceTypeKey } from "./service-types";

/** Photos/signature are kept as data only here; upload is backend scope. */
export type AtendimentoDraft = {
  customerId: string | null;
  customerName: string;
  addressId: string | null;
  addressLabel: string;
  equipmentId: string | null;
  equipmentName: string;
  serviceType: ServiceTypeKey | null;
  checklist: { label: string; done: boolean }[];
  notes: string;
  photoCount: number;
  signedAt: string | null;
};

export function emptyDraft(): AtendimentoDraft {
  return {
    customerId: null,
    customerName: "",
    addressId: null,
    addressLabel: "",
    equipmentId: null,
    equipmentName: "",
    serviceType: null,
    checklist: [],
    notes: "",
    photoCount: 0,
    signedAt: null,
  };
}

/** Serializable summary persisted to the outbox (no binary blobs in Sprint 3). */
export type AtendimentoSubmission = Omit<AtendimentoDraft, "checklist"> & {
  checklist: { label: string; done: boolean }[];
  submittedAt: string;
};

export function submitAtendimento(draft: AtendimentoDraft): { id: string; queued: true } {
  const submission: AtendimentoSubmission = { ...draft, submittedAt: new Date().toISOString() };
  const item = enqueue("atendimento", submission);
  return { id: item.id, queued: true };
}
