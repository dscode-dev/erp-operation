"use client";

/**
 * Operator QR flow. Câmera real (PWA) via QrScanner → GET /equipments/lookup/:qrCode.
 * Alternativas: colar código (qrCode/qrToken) ou selecionar equipamento.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, ScanLine, Wrench, ClipboardPaste, Loader2, ChevronRight } from "lucide-react";
import { SearchInput } from "@erp/ui/search-input";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { StatusPill } from "@erp/ui/status-pill";
import { QrScanner } from "@erp/ui/qr-scanner";
import { equipmentsApi, useQuery, ApiClientError } from "@erp/api";
import { useDebounce } from "@erp/utils";
import { EQUIPMENT_STATUS_LABEL, EQUIPMENT_STATUS_PILL } from "@platform/equipment-display";

export default function OperatorQrPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const [code, setCode] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  const list = useQuery(
    (signal) => equipmentsApi.listEquipments({ limit: 20, search: debounced || undefined, signal }),
    [debounced],
  );

  function open(id: string) {
    router.push(`/operator/equipamentos/${id}`);
  }

  function mapError(err: unknown): string {
    if (err instanceof ApiClientError && err.code === "EQUIPMENT_NOT_FOUND") return "Nenhum equipamento encontrado para este QR Code.";
    if (err instanceof ApiClientError && err.status === 400) return "QR Code inválido.";
    return "Falha ao resolver o código.";
  }

  // Real camera read → backend lookup → open equipment.
  async function handleScan(text: string) {
    setScanOpen(false);
    setResolving(true);
    setResolveError(null);
    try {
      const eq = await equipmentsApi.lookupByQr(text.trim());
      open(eq.id);
    } catch (err) {
      setResolveError(mapError(err));
    } finally {
      setResolving(false);
    }
  }

  // Resolve a pasted code (qrCode/qrToken) via the backend lookup endpoint.
  async function resolveCode() {
    const value = code.trim();
    if (!value) return;
    setResolving(true);
    setResolveError(null);
    try {
      const eq = await equipmentsApi.lookupByQr(value);
      open(eq.id);
    } catch (err) {
      setResolveError(mapError(err));
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-5">
      <header className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-[var(--color-primary)]" />
        <h1 className="text-[22px] font-semibold tracking-tight">Escanear QR</h1>
      </header>

      {/* Escanear com a câmera */}
      <button
        type="button"
        onClick={() => { setResolveError(null); setScanOpen(true); }}
        disabled={resolving}
        className="w-full flex items-center gap-3 rounded-[var(--radius-xl)] bg-[var(--color-primary)] text-white p-4 shadow-[var(--shadow-hover)] active:scale-[0.99] transition-transform disabled:opacity-50"
      >
        <span className="h-11 w-11 rounded-[var(--radius-lg)] bg-white/20 grid place-items-center">
          {resolving ? <Loader2 className="h-6 w-6 animate-spin" /> : <ScanLine className="h-6 w-6" />}
        </span>
        <span className="flex-1 text-left">
          <span className="block font-semibold">Escanear QR Code</span>
          <span className="block text-[12px] opacity-90">Use a câmera do dispositivo</span>
        </span>
        <ChevronRight className="h-5 w-5 opacity-90" />
      </button>
      {resolveError && <p className="text-[12px] text-[var(--color-danger)] -mt-2">{resolveError}</p>}

      <QrScanner open={scanOpen} onClose={() => setScanOpen(false)} onResult={handleScan} />

      {/* Colar código */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] space-y-2">
        <div className="flex items-center gap-2 text-caption uppercase tracking-wider"><ClipboardPaste className="h-3.5 w-3.5" /> Colar código</div>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="qrCode ou qrToken…" className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-11 text-sm font-mono outline-none focus:border-[var(--color-primary)]" />
          <button type="button" onClick={resolveCode} disabled={!code.trim() || resolving} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white px-4 h-11 text-sm font-semibold disabled:opacity-50">
            {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Abrir"}
          </button>
        </div>
        {resolveError && <p className="text-[11px] text-[var(--color-danger)]">{resolveError}</p>}
      </section>

      {/* Selecionar equipamento cadastrado */}
      <section className="space-y-2">
        <div className="text-caption uppercase tracking-wider">Selecionar equipamento</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar equipamento…" className="w-full" />
        {list.loading && !list.data ? (
          <SkeletonList rows={5} />
        ) : list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : (list.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={Wrench} title="Nenhum equipamento" />
        ) : (
          <ul className="space-y-2">
            {(list.data?.items ?? []).map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => open(e.id)} className="w-full text-left flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 active:scale-[0.99] transition-transform">
                  <span className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-muted)] grid place-items-center text-[var(--color-muted-foreground)] shrink-0"><QrCode className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium truncate">{e.name}</span>
                    <span className="block text-caption truncate">{e.customer?.name ?? e.tag ?? "—"}</span>
                  </span>
                  <StatusPill status={EQUIPMENT_STATUS_PILL[e.status]} label={EQUIPMENT_STATUS_LABEL[e.status]} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
