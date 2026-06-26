import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Card with optional icon/title header, action slot and body padding control. */
export function SectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  bodyClassName = "p-4",
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && (
              <span className="h-8 w-8 rounded-[var(--radius-md)] bg-[var(--color-muted)]/60 grid place-items-center text-[var(--color-muted-foreground)] shrink-0">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-card-title truncate">{title}</h2>}
              {description && <p className="text-caption truncate">{description}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
