/**
 * Dashboard aggregation.
 *
 * Combines real domain stats (customers, equipments) with the development demo
 * snapshot for operational counters and schedule. Each part degrades
 * independently so the dashboard renders honest partial data.
 */
import { getCustomerStats } from "./customers";
import { getEquipmentStats } from "./equipments";
import { getDemoDataset, isDemoDisabled } from "./demo";
import type { CustomerStats, DemoDataset, EquipmentStats } from "./types";

export type DashboardData = {
  customers: CustomerStats | null;
  equipments: EquipmentStats | null;
  /** Operational counters + schedule from the demo bridge; null when disabled. */
  demo: DemoDataset | null;
  demoDisabled: boolean;
};

export async function getDashboard(opts?: { signal?: AbortSignal }): Promise<DashboardData> {
  const [customers, equipments, demoResult] = await Promise.all([
    getCustomerStats(opts).catch(() => null),
    getEquipmentStats(opts).catch(() => null),
    getDemoDataset(opts)
      .then((demo) => ({ demo, disabled: false }))
      .catch((err) => ({ demo: null, disabled: isDemoDisabled(err) })),
  ]);

  return {
    customers,
    equipments,
    demo: demoResult.demo,
    demoDisabled: demoResult.disabled,
  };
}
