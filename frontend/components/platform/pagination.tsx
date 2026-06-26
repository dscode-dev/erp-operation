"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as PaginationMeta } from "@/lib/api";

export function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
}) {
  const { page, totalPages, total, limit } = pagination;
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-caption">
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-muted)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 text-caption tabular-nums">{page} / {Math.max(totalPages, 1)}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Próxima página"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-muted)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
