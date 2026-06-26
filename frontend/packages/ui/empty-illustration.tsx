import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

/**
 * EmptyIllustration — richer empty state with a soft illustration backdrop.
 * Use for primary empty surfaces; EmptyState remains the compact variant.
 */
export function EmptyIllustration({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center">
      <div className="relative mx-auto h-20 w-20">
        <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/5" />
        <div className="absolute inset-2 rounded-full bg-[var(--color-primary)]/10" />
        <div className="absolute inset-0 grid place-items-center">
          <Icon className="h-8 w-8 text-[var(--color-primary)]" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="mt-4 font-semibold text-[15px]">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)] max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
