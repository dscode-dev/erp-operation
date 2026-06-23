import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

export type Metric = {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  icon?: keyof typeof Icons;
};

export function MetricCard({ label, value, delta, trend = "flat", icon }: Metric) {
  const Icon = (icon ? (Icons[icon] as LucideIcon) : Icons.Activity) as LucideIcon;
  const tone =
    trend === "up"
      ? "text-[var(--color-success)]"
      : trend === "down"
        ? "text-[var(--color-danger)]"
        : "text-[var(--color-muted-foreground)]";

  return (
    <div className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-hover)]">
      <div className="flex items-center justify-between">
        <span className="text-caption">{label}</span>
        <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {delta && <div className={cn("mt-1 text-xs font-medium", tone)}>{delta}</div>}
    </div>
  );
}
