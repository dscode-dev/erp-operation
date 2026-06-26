"use client";

import type { ReactNode } from "react";
import { cn } from "@erp/utils";
import { SearchInput } from "./search-input";

/**
 * FilterBar — composable list toolbar: search + filter controls + right slot.
 * Controlled; pair the search value with useDebounce in the page.
 */
export function FilterBar({
  search,
  onSearch,
  searchPlaceholder = "Buscar…",
  children,
  right,
  className,
}: {
  search?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  /** Filter controls (chips, selects). */
  children?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-center", className)}>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {onSearch !== undefined && (
          <SearchInput value={search ?? ""} onChange={onSearch} placeholder={searchPlaceholder} className="w-full max-w-[360px]" />
        )}
        {children}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

/** Pill-style filter chip used inside FilterBar. */
export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-xs whitespace-nowrap transition-colors",
        active
          ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
          : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]",
      )}
    >
      {children}
    </button>
  );
}
