"use client";

import type { LucideIcon } from "lucide-react";

export function QuickAction({
  icon: Icon,
  label,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  tone?: "primary" | "accent" | "success";
}) {
  const map = {
    primary: "from-[var(--color-primary)] to-[color-mix(in_oklab,var(--color-primary)_70%,var(--color-accent))]",
    accent:  "from-[var(--color-accent)] to-[color-mix(in_oklab,var(--color-accent)_70%,var(--color-primary))]",
    success: "from-[var(--color-success)] to-[color-mix(in_oklab,var(--color-success)_60%,var(--color-primary))]",
  } as const;
  return (
    <button
      type="button"
      className={`group relative flex flex-col items-center justify-center gap-2 rounded-[var(--radius-xl)] bg-gradient-to-br ${map[tone]} text-white py-5 px-3 shadow-[var(--shadow-card)] active:scale-[0.97] hover:shadow-[var(--shadow-hover)] transition-all min-h-[88px]`}
    >
      <Icon className="h-7 w-7" strokeWidth={1.75} />
      <span className="text-[12px] font-semibold tracking-tight">{label}</span>
    </button>
  );
}
