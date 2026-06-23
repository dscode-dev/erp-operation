"use client";

import { Search } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilterBar({
  placeholder = "Buscar…",
  chips,
  right,
}: {
  placeholder?: string;
  chips?: string[];
  right?: ReactNode;
}) {
  const [active, setActive] = useState(chips?.[0] ?? "");
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 h-9 w-full max-w-[360px]">
          <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--color-muted-foreground)]"
          />
        </div>
        {chips && chips.length > 0 && (
          <div className="hidden md:flex items-center gap-1">
            {chips.map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={cn(
                  "h-8 rounded-full border px-3 text-xs transition-colors",
                  active === c
                    ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
