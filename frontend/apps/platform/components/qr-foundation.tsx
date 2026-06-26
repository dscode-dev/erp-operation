"use client";

/**
 * QrFoundation — QR card for an equipment (Platform).
 *
 * Renders a deterministic dot-matrix derived from `qrCode` (visual foundation;
 * a real QR encoder can replace `MatrixSvg` later) and offers copy + download.
 * `qrToken`/`qrCode` are stable identifiers, NOT authentication; public scan
 * resolution is backend/future scope.
 */
import { useRef, useState } from "react";
import { QrCode, Copy, Check, Download } from "lucide-react";

const SIZE = 21;

function hashToMatrix(input: string): boolean[][] {
  const cells: boolean[][] = [];
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let y = 0; y < SIZE; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < SIZE; x++) {
      h ^= (x * 73856093) ^ (y * 19349663);
      h = Math.imul(h, 16777619);
      row.push((h >>> 0) % 2 === 0);
    }
    cells.push(row);
  }
  return cells;
}

function MatrixSvg({ value, svgRef }: { value: string; svgRef?: React.Ref<SVGSVGElement> }) {
  const matrix = hashToMatrix(value);
  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-36 w-36" role="img" aria-label="QR do equipamento">
      <rect width={SIZE} height={SIZE} fill="white" />
      {matrix.flatMap((row, y) => row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="black" /> : null)))}
      {[[0, 0], [SIZE - 7, 0], [0, SIZE - 7]].map(([fx, fy]) => (
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
  const svgRef = useRef<SVGSVGElement>(null);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(qrCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function downloadPng() {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svgUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `qr-${qrCode}.png`;
      a.click();
    };
    img.src = svgUrl;
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 mb-3">
        <QrCode className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h3 className="text-sm font-semibold">QR do equipamento</h3>
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white p-2">
          <MatrixSvg value={qrCode} svgRef={svgRef} />
        </div>
        <code className="block w-full font-mono text-[11px] break-all text-center text-[var(--color-muted-foreground)]">{qrCode}</code>
        <div className="grid grid-cols-2 gap-2 w-full">
          <button type="button" onClick={copy} className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] h-9 text-sm hover:bg-[var(--color-muted)]">
            {copied ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button type="button" onClick={downloadPng} className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] h-9 text-sm hover:bg-[var(--color-muted)]">
            <Download className="h-4 w-4" /> Baixar
          </button>
        </div>
        <p className="text-[11px] text-[var(--color-muted-foreground)] text-center">Identificador estável · não é credencial de acesso.</p>
      </div>
      <span className="sr-only">{qrToken}</span>
    </div>
  );
}
