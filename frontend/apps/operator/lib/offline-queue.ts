/**
 * Offline-ready outbox (architecture only — Sprint 3).
 *
 * The Operator collects data in the field where connectivity is unreliable.
 * This module is the foundation for a local queue + background sync + retry:
 * submissions are persisted locally and marked `pending`; a future sync worker
 * will flush them to the backend when the Service domain exists (Backend Sprint 6).
 *
 * Sprint 3 does NOT implement automatic sync. It only persists/reads the queue
 * so the UI can show pending/sent status honestly.
 */
export type OutboxStatus = "pending" | "syncing" | "sent" | "error";

export type OutboxItem<T = unknown> = {
  id: string;
  kind: string; // e.g. "atendimento"
  createdAt: string;
  status: OutboxStatus;
  /** Number of sync attempts (for future retry/backoff). */
  attempts: number;
  payload: T;
};

const KEY = "erp.operator.outbox";

function read(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as OutboxItem[];
  } catch {
    return [];
  }
}

function write(items: OutboxItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueue<T>(kind: string, payload: T): OutboxItem<T> {
  const item: OutboxItem<T> = {
    id: `${kind}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind,
    createdAt: new Date().toISOString(),
    status: "pending",
    attempts: 0,
    payload,
  };
  write([...read(), item as OutboxItem]);
  return item;
}

export function listOutbox(): OutboxItem[] {
  return read();
}

export function pendingCount(): number {
  return read().filter((i) => i.status === "pending" || i.status === "error").length;
}

export function removeFromOutbox(id: string): void {
  write(read().filter((i) => i.id !== id));
}

/**
 * Flush placeholder. When the backend Service endpoint exists, replace the body
 * with real POSTs + status transitions (syncing → sent/error) and retry/backoff.
 */
export async function flushOutbox(): Promise<{ flushed: number }> {
  // No backend Service domain yet — items remain pending until Backend Sprint 6.
  return { flushed: 0 };
}
