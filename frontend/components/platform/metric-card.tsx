import type { LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
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
      ? "text-[var(--color-success)] bg-[var(--color-success)]/10"
      : trend === "down"
        ? "text-[var(--color-danger)] bg-[var(--color-danger)]/10"
        : "text-[var(--color-muted-foreground)] bg-[var(--color-muted)]";
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  return (
    <div className="group relative rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">{label}</span>
        <div className="h-7 w-7 rounded-[var(--radius-sm)] bg-[var(--color-muted)]/60 grid place-items-center text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)] transition-colors">
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="mt-2 text-[22px] font-semibold tracking-tight tabular-nums leading-none">{value}</div>
      {delta && (
        <div className={cn("mt-2 inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-1.5 py-0.5", tone)}>
          <TrendIcon className="h-3 w-3" />
          {delta}
        </div>
      )}
    </div>
  );
}
