"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Building2, Wrench } from "lucide-react";
import { customersApi, equipmentsApi } from "@/lib/api";
import { getAccessToken } from "@/lib/api";

type Ctx = { open: () => void; close: () => void; isOpen: boolean };
const CommandPaletteCtx = createContext<Ctx | null>(null);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteCtx);
  if (!ctx) throw new Error("CommandPaletteProvider missing");
  return ctx;
}

type Result = { id: string; label: string; kind: "Cliente" | "Equipamento"; href: string };

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isOpen, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => { setOpen(false); setQ(""); setResults([]); }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced real search against the production APIs.
  useEffect(() => {
    if (!isOpen) return;
    const term = q.trim();
    if (term.length < 2 || !getAccessToken()) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const [customers, equipments] = await Promise.all([
          customersApi.listCustomers({ limit: 5, search: term, signal: controller.signal }).catch(() => null),
          equipmentsApi.listEquipments({ limit: 5, search: term, signal: controller.signal }).catch(() => null),
        ]);
        const merged: Result[] = [
          ...(customers?.items ?? []).map((c) => ({ id: c.id, label: c.name, kind: "Cliente" as const, href: `/clientes/${c.id}` })),
          ...(equipments?.items ?? []).map((e) => ({ id: e.id, label: e.name, kind: "Equipamento" as const, href: `/equipamentos/${e.id}` })),
        ];
        setResults(merged);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { controller.abort(); clearTimeout(id); };
  }, [q, isOpen]);

  function go(href: string) {
    router.push(href);
    close();
  }

  const hint = useMemo(() => q.trim().length < 2, [q]);

  return (
    <CommandPaletteCtx.Provider value={{ open, close, isOpen }}>
      {children}
      {isOpen && (
        <div role="dialog" aria-modal="true" aria-label="Busca global" className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 pt-[15vh] animate-fade-in" onClick={close}>
          <div onClick={(e) => e.stopPropagation()} className="mx-auto max-w-xl rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-floating)] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3">
              <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar clientes e equipamentos…" className="flex-1 bg-transparent py-3 text-sm outline-none" />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-[var(--color-muted-foreground)]" />}
              <button type="button" onClick={close} aria-label="Fechar" className="h-7 w-7 grid place-items-center rounded hover:bg-[var(--color-muted)]"><X className="h-4 w-4" /></button>
            </div>
            <ul className="max-h-[50vh] overflow-auto p-2">
              {hint ? (
                <li className="p-4 text-sm text-[var(--color-muted-foreground)] text-center">Digite ao menos 2 caracteres.</li>
              ) : results.length === 0 && !loading ? (
                <li className="p-4 text-sm text-[var(--color-muted-foreground)] text-center">Nenhum resultado.</li>
              ) : (
                results.map((r) => (
                  <li key={`${r.kind}-${r.id}`}>
                    <button type="button" onClick={() => go(r.href)} className="w-full text-left flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 hover:bg-[var(--color-muted)]">
                      {r.kind === "Cliente" ? <Building2 className="h-4 w-4 text-[var(--color-muted-foreground)]" /> : <Wrench className="h-4 w-4 text-[var(--color-muted-foreground)]" />}
                      <span className="text-sm flex-1 truncate">{r.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">{r.kind}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-[var(--color-border)] px-3 py-2 text-[11px] text-[var(--color-muted-foreground)] flex justify-between">
              <span>Busca em tempo real</span>
              <span><kbd className="font-mono">Esc</kbd> fechar</span>
            </div>
          </div>
        </div>
      )}
    </CommandPaletteCtx.Provider>
  );
}
