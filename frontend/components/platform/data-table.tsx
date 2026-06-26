"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
  /** Provide to make the column sortable (client-side, current page). */
  sortAccessor?: (row: T) => string | number;
};

type SortState = { key: string; dir: "asc" | "desc" } | null;

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  rowHref,
  onRowClick,
  selectable = false,
  selectedIds,
  onSelectedChange,
}: {
  columns: Column<T>[];
  rows: T[];
  rowHref?: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Enables a leading checkbox column for bulk selection. */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectedChange?: (ids: string[]) => void;
}) {
  const [sort, setSort] = useState<SortState>(null);
  const clickable = Boolean(onRowClick);
  const selected = useMemo(() => new Set(selectedIds ?? []), [selectedIds]);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortAccessor) return rows;
    const accessor = col.sortAccessor;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sort, columns]);

  function toggleSort(key: string) {
    setSort((s) =>
      s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" },
    );
  }

  function toggleRow(id: string) {
    if (!onSelectedChange) return;
    onSelectedChange(selected.has(id) ? [...selected].filter((x) => x !== id) : [...selected, id]);
  }

  function toggleAll() {
    if (!onSelectedChange) return;
    const allIds = rows.map((r) => r.id);
    const allSelected = allIds.every((id) => selected.has(id));
    onSelectedChange(allSelected ? [] : allIds);
  }

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/40 text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" aria-label="Selecionar todos" checked={allSelected} onChange={toggleAll} className="accent-[var(--color-primary)]" />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={"text-left font-medium px-4 py-2.5 " + (c.className ?? "")}>
                  {c.sortAccessor ? (
                    <button type="button" onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-[var(--color-foreground)]">
                      {c.header}
                      {sort?.key === c.key ? (
                        sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const href = rowHref?.(row);
              const isSelected = selected.has(row.id);
              return (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={
                    "border-b last:border-0 border-[var(--color-border)] transition-colors " +
                    (isSelected ? "bg-[var(--color-primary)]/5 " : "hover:bg-[var(--color-muted)]/40 ") +
                    (clickable ? "cursor-pointer" : "")
                  }
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Selecionar ${row.id}`} checked={isSelected} onChange={() => toggleRow(row.id)} className="accent-[var(--color-primary)]" />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={"align-middle " + (c.className ?? "")}>
                      {href ? (
                        <Link href={href} className="block px-4 py-3 focus:outline-none focus-visible:bg-[var(--color-muted)]/60">
                          {c.cell(row)}
                        </Link>
                      ) : (
                        <div className="px-4 py-3">{c.cell(row)}</div>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
