"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";
import { commandPaletteItems } from "@/mocks/data";

type Ctx = { open: () => void; close: () => void; isOpen: boolean };
const CommandPaletteCtx = createContext<Ctx | null>(null);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteCtx);
  if (!ctx) throw new Error("CommandPaletteProvider missing");
  return ctx;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => { setOpen(false); setQ(""); }, []);

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

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commandPaletteItems.slice(0, 10);
    return commandPaletteItems.filter(
      (i) => i.label.toLowerCase().includes(s) || i.kind.toLowerCase().includes(s),
    ).slice(0, 20);
  }, [q]);

  return (
    <CommandPaletteCtx.Provider value={{ open, close, isOpen }}>
      {children}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Busca global"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm p-4 pt-[15vh] animate-fade-in"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="mx-auto max-w-xl rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-floating)] overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3">
              <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar clientes, equipamentos, atendimentos…"
                className="flex-1 bg-transparent py-3 text-sm outline-none"
              />
              <button type="button" onClick={close} aria-label="Fechar" className="h-7 w-7 grid place-items-center rounded hover:bg-[var(--color-muted)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="max-h-[50vh] overflow-auto p-2">
              {filtered.length === 0 ? (
                <li className="p-4 text-sm text-[var(--color-muted-foreground)] text-center">Nenhum resultado.</li>
              ) : (
                filtered.map((i) => (
                  <li key={i.id}>
                    <button className="w-full text-left flex items-center justify-between gap-3 rounded-[var(--radius-md)] px-3 py-2 hover:bg-[var(--color-muted)]">
                      <span className="text-sm">{i.label}</span>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">{i.kind}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="border-t border-[var(--color-border)] px-3 py-2 text-[11px] text-[var(--color-muted-foreground)] flex justify-between">
              <span>Mockado · sem backend</span>
              <span><kbd className="font-mono">Esc</kbd> fechar</span>
            </div>
          </div>
        </div>
      )}
    </CommandPaletteCtx.Provider>
  );
}
