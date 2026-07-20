/**
 * Interpretação tolerante de limites de intervalo de datas vindos da query.
 *
 * Aceita tanto data-only (`YYYY-MM-DD`) quanto timestamp ISO completo:
 * - início: usado como está (data-only vira meia-noite UTC);
 * - fim: data-only vira fim do dia (23:59:59.999 UTC); timestamp completo é
 *   usado como está, sem anexar sufixo (evita `...ZT23:59:59.999Z` = Invalid Date).
 *
 * Retorna `undefined` para valores inválidos, para nunca passar `Invalid Date`
 * ao Prisma.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toValidDate(iso: string): Date | undefined {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function parseRangeStart(value?: string | null): Date | undefined {
  if (!value) return undefined;
  return toValidDate(value.trim());
}

export function parseRangeEnd(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return toValidDate(DATE_ONLY.test(trimmed) ? `${trimmed}T23:59:59.999Z` : trimmed);
}

/** Monta um filtro `{ gte?, lte? }` de datas, omitindo limites ausentes/inválidos. */
export function dateRangeFilter(from?: string | null, to?: string | null): { gte?: Date; lte?: Date } {
  const gte = parseRangeStart(from);
  const lte = parseRangeEnd(to);
  return { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
}
