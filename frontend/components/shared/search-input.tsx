"use client";

import { Search, X } from "lucide-react";

/** Controlled search input with icon and clear button. Debounce via useDebounce. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 h-9 ${className}`}>
      <Search className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--color-muted-foreground)]"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Limpar busca" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
