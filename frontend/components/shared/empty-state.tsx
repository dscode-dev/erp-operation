import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-muted)] grid place-items-center">
        <Icon className="h-5 w-5 text-[var(--color-muted-foreground)]" />
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
