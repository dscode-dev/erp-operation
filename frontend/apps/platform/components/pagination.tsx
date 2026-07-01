"use client";

import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import type { Pagination as PaginationMeta } from "@erp/api";

export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (limit: number) => void;
  pageSizeOptions?: number[];
}) {
  const { page, totalPages, total, limit } = pagination;
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const safeTotalPages = Math.max(totalPages, 1);
  const buttonCls =
    "inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] transition disabled:opacity-40 hover:bg-[var(--color-muted)]";

  return (
    <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-caption">
        {from}–{to} de {total} · página {page} de {safeTotalPages}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange && (
          <label className="inline-flex items-center gap-2 text-caption">
            Linhas
            <select
              value={limit}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-sm outline-none focus:border-[var(--color-primary)]"
              aria-label="Tamanho da página"
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => onPageChange(1)} disabled={page <= 1} aria-label="Primeira página" className={buttonCls}>
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Página anterior" className={buttonCls}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-16 px-2 text-center text-caption tabular-nums">
            {page} / {safeTotalPages}
          </span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= safeTotalPages} aria-label="Próxima página" className={buttonCls}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => onPageChange(safeTotalPages)} disabled={page >= safeTotalPages} aria-label="Última página" className={buttonCls}>
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
