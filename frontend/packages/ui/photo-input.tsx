"use client";

/**
 * PhotoInput — field photo capture: multiple images, preview, remove, reorder.
 *
 * Mobile-first (uses the camera via capture). Holds the File + an object URL so
 * the surrounding flow can later upload to the backend (offline-ready). Sprint 3
 * does not upload — generation/storage stays with the backend.
 */
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, X, ArrowLeft, ArrowRight, ImagePlus } from "lucide-react";

export type CapturedPhoto = {
  id: string;
  name: string;
  url: string; // object URL for preview
  file: File;
  caption?: string;
  status?: "pending" | "saving" | "error";
  error?: string;
};

export function PhotoInput({
  photos,
  onChange,
  max = 12,
  existingCount = 0,
  requiredMinimum,
  disabled = false,
}: {
  photos: CapturedPhoto[];
  onChange: (photos: CapturedPhoto[]) => void;
  max?: number;
  existingCount?: number;
  requiredMinimum?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  const [validationError, setValidationError] = useState<string | null>(null);
  photosRef.current = photos;

  useEffect(() => () => {
    photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url));
  }, []);

  function add(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const room = max - existingCount - photos.length;
    const accepted = files.filter((file) => {
      const valid = (file.type === "image/png" || file.type === "image/jpeg") && file.size > 0 && file.size <= 5 * 1024 * 1024;
      if (!valid) setValidationError("Use imagens PNG ou JPEG de até 5 MiB.");
      return valid;
    });
    const next = accepted.slice(0, Math.max(0, room)).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      url: URL.createObjectURL(file),
      file,
      caption: "",
      status: "pending" as const,
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

  function caption(id: string, value: string) {
    onChange(photos.map((photo) => photo.id === id ? { ...photo, caption: value } : photo));
  }

  const total = existingCount + photos.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((p, i) => (
          <div key={p.id} className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)]">
            <div className="relative group aspect-square bg-[var(--color-muted)]">
              <Image src={p.url} alt={p.name} fill sizes="160px" unoptimized className="object-contain" />
            <button
              type="button"
              onClick={() => remove(p.id)} disabled={disabled}
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
            <div className="space-y-1.5 p-2">
              <input value={p.caption ?? ""} onChange={(event) => caption(p.id, event.target.value)} disabled={disabled} maxLength={255} placeholder="Legenda opcional" className="h-8 w-full rounded border border-[var(--color-border)] bg-transparent px-2 text-xs" />
              <span className={`text-[10px] font-medium ${p.status === "error" ? "text-[var(--color-danger)]" : "text-[var(--color-muted-foreground)]"}`}>{p.status === "saving" ? "Salvando…" : p.status === "error" ? p.error ?? "Falha no envio" : "Pendente"}</span>
            </div>
          </div>
        ))}

        {total < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()} disabled={disabled}
            className="aspect-square rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] grid place-items-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] active:scale-[0.98]"
          >
            <span className="flex flex-col items-center gap-1">
              {photos.length === 0 ? <Camera className="h-6 w-6" /> : <ImagePlus className="h-6 w-6" />}
              <span className="text-[11px] font-medium">{photos.length === 0 ? "Câmera" : "Adicionar"}</span>
            </span>
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/png,image/jpeg" capture="environment" multiple onChange={add} className="hidden" aria-label="Adicionar fotos" />
      {validationError && <p className="text-xs text-[var(--color-danger)]">{validationError}</p>}
      <p className="text-[11px] text-[var(--color-muted-foreground)]">{total}/{max} imagens · PNG ou JPEG · até 5 MiB cada{requiredMinimum ? ` · mínimo ${requiredMinimum} para concluir e emitir` : ""}</p>
    </div>
  );
}
