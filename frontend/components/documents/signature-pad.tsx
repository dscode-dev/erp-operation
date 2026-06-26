"use client";

/**
 * SignaturePad — visual signature capture (architecture for the future flow).
 *
 * Captures strokes on a canvas and reports a data URL via `onChange`. Sprint 2
 * is visual only: the signature is NOT uploaded or embedded into a document —
 * that is backend responsibility in the document flow (Sprint 3).
 */
import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";

export function SignaturePad({ onChange }: { onChange?: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Scale for crisp lines.
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  function pos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    onChange?.(canvasRef.current!.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange?.(null);
  }

  return (
    <div>
      <div className="relative rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-36 w-full touch-none cursor-crosshair"
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-[var(--color-muted-foreground)]">
            <span className="inline-flex items-center gap-1.5 text-sm"><PenLine className="h-4 w-4" /> Assine aqui</span>
          </div>
        )}
      </div>
      <button type="button" onClick={clear} className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
        <Eraser className="h-3.5 w-3.5" /> Limpar assinatura
      </button>
    </div>
  );
}
