/**
 * Financial data.
 *
 * No production finance domain exists yet (OWNER-gated, future scope). Sprint 1
 * consumes the development demo snapshot. When the bridge is off the screen must
 * render an honest coming-soon state.
 */
import { getDemoDataset, isDemoDisabled } from "./demo";
import type { DemoDataset } from "@erp/types";

export type FinancialData = {
  finance: DemoDataset["demo.finance.v1"] | null;
  disabled: boolean;
};

export async function getFinancial(opts?: { signal?: AbortSignal }): Promise<FinancialData> {
  try {
    const dataset = await getDemoDataset(opts);
    return { finance: dataset["demo.finance.v1"], disabled: false };
  } catch (err) {
    return { finance: null, disabled: isDemoDisabled(err) };
  }
}

export type ScheduleData = {
  items: DemoDataset["demo.schedule.v1"]["items"];
  disabled: boolean;
};

/** Schedule (agenda) snapshot — Scheduling Domain does not exist yet. */
export async function getSchedule(opts?: { signal?: AbortSignal }): Promise<ScheduleData> {
  try {
    const dataset = await getDemoDataset(opts);
    return { items: dataset["demo.schedule.v1"].items, disabled: false };
  } catch (err) {
    return { items: [], disabled: isDemoDisabled(err) };
  }
}

/**
 * Schedule filtered by an inclusive date range [from, to].
 *
 * Every calendar navigation calls the backend (the dataset is re-fetched) and
 * the range filter is applied to `startsAt`. When the real Scheduling domain
 * ships, this maps to `GET /schedule?from=&to=` with no UI change — the
 * `from`/`to` arguments are already the contract.
 */
export async function getScheduleRange(
  from: Date,
  to: Date,
  opts?: { signal?: AbortSignal },
): Promise<ScheduleData> {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  try {
    const dataset = await getDemoDataset(opts);
    const items = dataset["demo.schedule.v1"].items.filter((it) => {
      const t = new Date(it.startsAt).getTime();
      return !Number.isNaN(t) && t >= fromMs && t <= toMs;
    });
    return { items, disabled: false };
  } catch (err) {
    return { items: [], disabled: isDemoDisabled(err) };
  }
}
