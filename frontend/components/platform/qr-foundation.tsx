"use client";

/**
 * QrFoundation — visual QR foundation for an equipment.
 *
 * Renders a deterministic dot-matrix derived from `qrCode` plus the stable
 * identifier. This is the foundation only: `qrToken`/`qrCode` are stable IDs,
 * NOT authentication, and public scan resolution is backend/future scope. A
 * real QR encoder library can later replace `<MatrixVisual>` without changing
 * the surrounding contract.
 */
import { QrCode } from "lucide-react";

function hashToMatrix(input: string, size = 21): boolean[][] {
  // Simple deterministic fill — visual placeholder, not a scannable QR.
  const cells: boolean[][] = [];
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      h ^= (x * 73856093) ^ (y * 19349663);
      h = Math.imul(h, 16777619);
      row.push((h >>> 0) % 2 === 0);
    }
    cells.push(row);
  }
  return cells;
}

function MatrixVisual({ value }: { value: string }) {
  const size = 21;
  const matrix = hashToMatrix(value, size);
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-36 w-36" role="img" aria-label="QR do equipamento">
      <rect width={size} height={size} fill="white" />
      {matrix.flatMap((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="black" /> : null,
        ),
      )}
      {/* finder-pattern corners for a QR-like silhouette */}
      {[
        [0, 0],
        [size - 7, 0],
        [0, size - 7],
      ].map(([fx, fy]) => (
        <g key={`${fx}-${fy}`}>
          <rect x={fx} y={fy} width={7} height={7} fill="black" />
          <rect x={fx + 1} y={fy + 1} width={5} height={5} fill="white" />
          <rect x={fx + 2} y={fy + 2} width={3} height={3} fill="black" />
        </g>
      ))}
    </svg>
  );
}

export function QrFoundation({ qrCode, qrToken }: { qrCode: string; qrToken: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-3">
        <QrCode className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h3 className="text-sm font-semibold">QR do equipamento</h3>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-2">
          <MatrixVisual value={qrCode} />
        </div>
        <div className="w-full space-y-1 text-center">
          <code className="block font-mono text-[11px] break-all text-[var(--color-muted-foreground)]">{qrCode}</code>
          <p className="text-[11px] text-[var(--color-muted-foreground)]">
            Identificador estável · não é credencial de acesso.
          </p>
        </div>
      </div>
      <span className="sr-only">{qrToken}</span>
    </div>
  );
}
