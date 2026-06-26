import { cn } from "@erp/utils";

/** Compact segmented progress for a multi-step flow (mobile-first). */
export function Stepper({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors",
            i < current ? "bg-[var(--color-primary)]" : i === current ? "bg-[var(--color-primary)]" : "bg-[var(--color-muted)]",
          )}
        />
      ))}
    </div>
  );
}
