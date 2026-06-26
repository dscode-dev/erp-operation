/**
 * Client-side export helpers.
 *
 * CSV is generated locally for the data already on screen. PDF / formatted
 * documents remain a backend responsibility (see lib/documents) and are not
 * generated here — the UI only prepares the trigger points.
 */

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/** Convert an array of flat records to a CSV string (semicolon-separated, pt-BR friendly). */
export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  if (rows.length === 0) return "";
  const keys = columns ?? Object.keys(rows[0]);
  const header = keys.map(escapeCsv).join(";");
  const body = rows.map((row) => keys.map((k) => escapeCsv(row[k])).join(";")).join("\n");
  return `${header}\n${body}`;
}

/** Trigger a browser download of a text payload. */
export function downloadText(content: string, fileName: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([`﻿${content}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(rows: Array<Record<string, unknown>>, fileName: string, columns?: string[]) {
  downloadText(toCsv(rows, columns), fileName.endsWith(".csv") ? fileName : `${fileName}.csv`);
}
