"use client";

/**
 * PhotoInput — field photo capture: multiple images, preview, remove, reorder.
 *
 * Mobile-first (uses the camera via capture). Holds the File + an object URL so
 * the surrounding flow can later upload to the backend (offline-ready). Sprint 3
 * does not upload — generation/storage stays with the backend.
 */
import { useRef } from "react";
import { Camera, X, ArrowLeft, ArrowRight, ImagePlus } from "lucide-react";

export type CapturedPhoto = {
  id: string;
  name: string;
  url: string; // object URL for preview
  file: File;
};

export function PhotoInput({
  photos,
  onChange,
  max = 12,
}: {
  photos: CapturedPhoto[];
  onChange: (photos: CapturedPhoto[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const room = max - photos.length;
    const next = files.slice(0, room).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      url: URL.createObjectURL(file),
      file,
    }));
    onChange([...photos, ...next]);
    e.target.value = "";
  }

  function remove(id: string) {
    const target = photos.find((p) => p.id === id);
    if (target) URL.revokeObjectURL(target.url);
    onChange(photos.filter((p) => p.id !== id));
  }

  function move(index: number, dir: -1 | 1) {
    const to = index + dir;
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p, i) => (
          <div key={p.id} className="relative group aspect-square rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)] bg-[var(--color-muted)]">
            <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(p.id)}
              aria-label="Remover foto"
              className="absolute top-1 right-1 h-7 w-7 grid place-items-center rounded-full bg-black/60 text-white active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para trás" className="h-7 w-7 grid place-items-center rounded-full bg-black/55 text-white disabled:opacity-30 active:scale-90">
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-[10px] font-mono text-white bg-black/55 rounded-full px-1.5">{i + 1}</span>
              <button type="button" onClick={() => move(i, 1)} disabled={i === photos.length - 1} aria-label="Mover para frente" className="h-7 w-7 grid place-items-center rounded-full bg-black/55 text-white disabled:opacity-30 active:scale-90">
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {photos.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] grid place-items-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] active:scale-[0.98]"
          >
            <span className="flex flex-col items-center gap-1">
              {photos.length === 0 ? <Camera className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
              <span className="text-[11px] font-medium">{photos.length === 0 ? "Câmera" : "Adicionar"}</span>
            </span>
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple onChange={add} className="hidden" aria-label="Adicionar fotos" />
      <p className="text-[11px] text-[var(--color-muted-foreground)]">{photos.length}/{max} fotos · toque para capturar ou enviar</p>
    </div>
  );
}
