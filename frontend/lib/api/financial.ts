/**
 * Financial data.
 *
 * No production finance domain exists yet (OWNER-gated, future scope). Sprint 1
 * consumes the development demo snapshot. When the bridge is off the screen must
 * render an honest coming-soon state.
 */
import { getDemoDataset, isDemoDisabled } from "./demo";
import type { DemoDataset } from "./types";

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
