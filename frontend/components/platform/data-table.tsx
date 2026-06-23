import Link from "next/link";
import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  rowHref,
}: {
  columns: Column<T>[];
  rows: T[];
  rowHref?: (row: T) => string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/40 text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
              {columns.map((c) => (
                <th key={c.key} className={"text-left font-medium px-4 py-2.5 " + (c.className ?? "")}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = rowHref?.(row);
              return (
                <tr
                  key={row.id}
                  className="border-b last:border-0 border-[var(--color-border)] hover:bg-[var(--color-muted)]/40 transition-colors"
                >
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
