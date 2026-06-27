"use client";

/**
 * QrScanner — leitura real de QR Code pela câmera do dispositivo (PWA).
 *
 * Usa @zxing/browser (BrowserQRCodeReader — apenas QR). Câmera traseira por
 * padrão, troca de câmera quando há mais de uma, cancelar, loading e tratamento
 * de permissão negada / câmera indisponível. Reporta o texto lido via onResult.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera, SwitchCamera, Loader2, AlertTriangle, RefreshCw } from "lucide-react";

type Status = "starting" | "scanning" | "denied" | "unavailable" | "error";

type Controls = { stop: () => void };

export function QrScanner({
  open,
  onClose,
  onResult,
  title = "Escanear QR Code",
}: {
  open: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
  title?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<Controls | null>(null);
  const readerRef = useRef<{ listVideoInputDevices: () => Promise<MediaDeviceInfo[]> } | null>(null);
  const handledRef = useRef(false);

  const [status, setStatus] = useState<Status>("starting");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIndex, setDeviceIndex] = useState(0);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  const start = useCallback(
    async (deviceId?: string) => {
      handledRef.current = false;
      setStatus("starting");
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        readerRef.current = reader as unknown as { listVideoInputDevices: () => Promise<MediaDeviceInfo[]> };
        const video = videoRef.current;
        if (!video) return;

        const onDecode = (result: { getText: () => string } | undefined) => {
          if (result && !handledRef.current) {
            handledRef.current = true;
            const text = result.getText();
            stop();
            onResult(text);
          }
        };

        // Back camera by default; specific device when switching.
        const controls = deviceId
          ? await reader.decodeFromVideoDevice(deviceId, video, onDecode)
          : await reader.decodeFromConstraints(
              { video: { facingMode: { ideal: "environment" } } },
              video,
              onDecode,
            );
        controlsRef.current = controls as Controls;
        setStatus("scanning");

        // Enumerate cameras (labels available after permission) to enable switching.
        try {
          const list = await (reader as unknown as {
            listVideoInputDevices: () => Promise<MediaDeviceInfo[]>;
          }).listVideoInputDevices();
          setDevices(list);
        } catch {
          /* enumeration optional */
        }
      } catch (err) {
        const name = (err as { name?: string })?.name ?? "";
        if (name === "NotAllowedError" || name === "SecurityError") setStatus("denied");
        else if (name === "NotFoundError" || name === "OverconstrainedError") setStatus("unavailable");
        else setStatus("error");
      }
    },
    [onResult, stop],
  );

  useEffect(() => {
    if (!open) return;
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function switchCamera() {
    if (devices.length < 2) return;
    const next = (deviceIndex + 1) % devices.length;
    setDeviceIndex(next);
    stop();
    start(devices[next].deviceId);
  }

  function retry() {
    stop();
    start(devices[deviceIndex]?.deviceId);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black animate-fade-in flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14 text-white">
        <span className="text-sm font-semibold">{title}</span>
        <button type="button" onClick={onClose} aria-label="Cancelar" className="h-10 w-10 grid place-items-center rounded-full bg-white/15 active:scale-95">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Camera */}
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline autoPlay />

        {/* Framing guide */}
        {status === "scanning" && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="relative h-60 w-60 max-w-[72vw] max-h-[72vw]">
              <Corner className="top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl" />
              <Corner className="top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl" />
              <Corner className="bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl" />
              <Corner className="bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl" />
              <div className="absolute left-2 right-2 h-0.5 bg-[var(--color-primary)] shadow-[0_0_12px_var(--color-primary)] animate-scanline" />
            </div>
          </div>
        )}

        {/* States */}
        {status === "starting" && (
          <Overlay>
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm">Abrindo câmera…</p>
          </Overlay>
        )}
        {status === "denied" && (
          <Overlay>
            <AlertTriangle className="h-8 w-8 text-[var(--color-warning)]" />
            <p className="mt-3 text-sm font-medium">Permissão de câmera negada</p>
            <p className="mt-1 text-xs opacity-80 max-w-xs">Autorize o acesso à câmera nas configurações do navegador e tente novamente.</p>
            <RetryButton onClick={retry} />
          </Overlay>
        )}
        {status === "unavailable" && (
          <Overlay>
            <Camera className="h-8 w-8" />
            <p className="mt-3 text-sm font-medium">Câmera indisponível</p>
            <p className="mt-1 text-xs opacity-80 max-w-xs">Nenhuma câmera foi encontrada neste dispositivo.</p>
            <RetryButton onClick={retry} />
          </Overlay>
        )}
        {status === "error" && (
          <Overlay>
            <AlertTriangle className="h-8 w-8 text-[var(--color-danger)]" />
            <p className="mt-3 text-sm font-medium">Falha ao iniciar a leitura</p>
            <RetryButton onClick={retry} />
          </Overlay>
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-4 px-4 py-5 text-white">
        {status === "scanning" && (
          <span className="inline-flex items-center gap-2 text-xs opacity-90">
            <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] animate-pulse" /> Aponte para o QR do equipamento
          </span>
        )}
        {devices.length > 1 && (
          <button type="button" onClick={switchCamera} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 h-10 text-sm active:scale-95">
            <SwitchCamera className="h-4 w-4" /> Trocar câmera
          </button>
        )}
      </div>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return <span className={`absolute h-7 w-7 border-white/90 ${className}`} />;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/70 text-white text-center p-6">
      <div className="flex flex-col items-center">{children}</div>
    </div>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-white text-black px-4 h-10 text-sm font-semibold active:scale-95">
      <RefreshCw className="h-4 w-4" /> Tentar novamente
    </button>
  );
}
