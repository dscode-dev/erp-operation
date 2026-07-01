import { api } from "./client";
import type {
  Assignment,
  AssignmentHistoryItem,
  AssignmentStatus,
  CreateAssignmentPayload,
  Paginated,
  ReassignAssignmentPayload,
} from "@erp/types";

export type ListAssignmentsParams = {
  page?: number;
  limit?: number;
  operationId?: string;
  assignedTo?: string;
  customerId?: string;
  equipmentId?: string;
  status?: AssignmentStatus;
  signal?: AbortSignal;
};

export function listAssignments(params?: ListAssignmentsParams): Promise<Paginated<Assignment>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<Assignment>>("/assignments", { query, signal });
}

export function listMyAssignments(params?: Omit<ListAssignmentsParams, "assignedTo">): Promise<Paginated<Assignment>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<Assignment>>("/assignments/my", { query, signal });
}

export function getAssignment(id: string, opts?: { signal?: AbortSignal }): Promise<Assignment> {
  return api.get<Assignment>(`/assignments/${id}`, opts);
}

export function getAssignmentHistory(operationId: string, opts?: { signal?: AbortSignal }): Promise<AssignmentHistoryItem[]> {
  return api.get<AssignmentHistoryItem[]>(`/assignments/history/${operationId}`, opts);
}

export function createAssignment(payload: CreateAssignmentPayload): Promise<Assignment> {
  return api.post<Assignment>("/assignments", payload);
}

export function reassignAssignment(id: string, payload: ReassignAssignmentPayload): Promise<Assignment> {
  return api.patch<Assignment>(`/assignments/${id}/reassign`, payload);
}

export function acceptAssignment(id: string): Promise<Assignment> {
  return api.patch<Assignment>(`/assignments/${id}/accept`, {});
}

export function rejectAssignment(id: string, rejectionReason: string): Promise<Assignment> {
  return api.patch<Assignment>(`/assignments/${id}/reject`, { rejectionReason });
}

export function startAssignment(id: string): Promise<Assignment> {
  return api.patch<Assignment>(`/assignments/${id}/start`, {});
}

export function completeAssignment(id: string, notes?: string | null): Promise<Assignment> {
  return api.patch<Assignment>(`/assignments/${id}/complete`, { notes: notes ?? null });
}
