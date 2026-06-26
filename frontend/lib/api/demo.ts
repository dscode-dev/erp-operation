/**
 * Development demo bridge.
 *
 * Dashboard / schedule / finance have no production domain API yet, so the
 * backend exposes a temporary `/internal/demo/dataset` snapshot (OWNER-only,
 * development flags required). When the bridge is disabled the call returns
 * 404 `DEMO_ENDPOINT_DISABLED` — callers must render honest empty/coming-soon
 * states rather than treat the snapshot as a permanent contract.
 */
import { api, ApiClientError, DEMO_BRIDGE_ENABLED } from "./client";
import type { DemoDataset } from "./types";

export class DemoUnavailableError extends Error {
  constructor() {
    super("Demo dataset bridge is disabled.");
    this.name = "DemoUnavailableError";
  }
}

/** True when the failure means the bridge is simply off (not a real error). */
export function isDemoDisabled(err: unknown): boolean {
  if (err instanceof DemoUnavailableError) return true;
  return (
    err instanceof ApiClientError &&
    (err.code === "DEMO_ENDPOINT_DISABLED" || err.isForbidden || err.status === 404)
  );
}

export async function getDemoDataset(opts?: { signal?: AbortSignal }): Promise<DemoDataset> {
  if (!DEMO_BRIDGE_ENABLED) throw new DemoUnavailableError();
  return api.get<DemoDataset>("/internal/demo/dataset", opts);
}
