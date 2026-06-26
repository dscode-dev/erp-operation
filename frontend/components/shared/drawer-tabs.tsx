"use client";

/**
 * DrawerTabs — standardized tab bar for entity detail drawers
 * (Customer / Equipment / User / Service).
 */
export function DrawerTabs<T extends string>({
  tabs,
  active,
  onChange,
  counts,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
  counts?: Partial<Record<T, number>>;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-[var(--color-border)] overflow-x-auto">
      {tabs.map((t) => {
        const count = counts?.[t];
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`relative px-3 py-2 text-sm whitespace-nowrap transition-colors ${
              active === t
                ? "text-[var(--color-primary)] font-medium"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            }`}
          >
            {t}{typeof count === "number" ? ` (${count})` : ""}
            {active === t && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[var(--color-primary)]" />}
          </button>
        );
      })}
    </div>
  );
}
