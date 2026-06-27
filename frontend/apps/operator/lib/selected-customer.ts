"use client";

/**
 * Cliente selecionado no app do operador. Persistido em localStorage para que a
 * escolha acompanhe o operador entre as abas (Equipamentos, Documentos…) e
 * sobreviva a recarregamentos. As listagens passam a ser sempre por cliente.
 */
import { useCallback, useEffect, useState } from "react";

export type SelectedCustomer = { id: string; name: string };

const KEY = "operator.selectedCustomer";
const EVENT = "operator:selected-customer";

function read(): SelectedCustomer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SelectedCustomer) : null;
  } catch {
    return null;
  }
}

export function useSelectedCustomer(): [SelectedCustomer | null, (c: SelectedCustomer | null) => void] {
  const [selected, setSelected] = useState<SelectedCustomer | null>(null);

  // Hydrate after mount (avoids SSR/client mismatch) and keep tabs in sync.
  useEffect(() => {
    setSelected(read());
    const sync = () => setSelected(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((c: SelectedCustomer | null) => {
    if (typeof window !== "undefined") {
      if (c) window.localStorage.setItem(KEY, JSON.stringify(c));
      else window.localStorage.removeItem(KEY);
      window.dispatchEvent(new Event(EVENT));
    }
    setSelected(c);
  }, []);

  return [selected, update];
}
