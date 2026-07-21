import type { ReactNode } from "react";
import { cn } from "@erp/utils";

export function DashboardSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex min-h-[28px] items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]">
          {title}
        </h2>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
