import { cn } from "@/lib/utils";

export type ChipTone = "success" | "warning" | "danger" | "info" | "neutral" | "primary";

const TONE: Record<ChipTone, string> = {
  success: "bg-[var(--color-success)]/12 text-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  danger: "bg-[var(--color-danger)]/12 text-[var(--color-danger)]",
  info: "bg-[var(--color-info)]/12 text-[var(--color-info)]",
  primary: "bg-[var(--color-primary)]/12 text-[var(--color-primary)]",
  neutral: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
};

/** Generic semantic chip (use StatusPill for domain statuses with a dot). */
export function StatusChip({
  tone = "neutral",
  children,
  dot = false,
  className,
}: {
  tone?: ChipTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", TONE[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
