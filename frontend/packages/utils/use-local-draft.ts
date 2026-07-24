"use client";

/**
 * useLocalDraft — rascunho local (localStorage) para formulários longos.
 *
 * Protege o usuário de perder dados já digitados: o formulário pode ser salvo
 * como rascunho no navegador e restaurado ao reabrir o mesmo fluxo. Não cria
 * nada no servidor — some quando o registro é de fato criado (chame `clear`).
 */
import { useCallback, useState } from "react";

export type StoredDraft<T> = { value: T; savedAt: string };

export type LocalDraft<T> = {
  /** Lê o rascunho persistido (valor + timestamp ISO) ou null. */
  read: () => StoredDraft<T> | null;
  /** Persiste `value` imediatamente e atualiza `savedAt`. */
  save: (value: T) => void;
  /** Remove o rascunho persistido. */
  clear: () => void;
  /** Timestamp ISO do save/restore mais recente nesta sessão (para a UI). */
  savedAt: string | null;
  /** Semeia `savedAt` (usado ao restaurar um rascunho já existente). */
  markSavedAt: (iso: string | null) => void;
};

const PREFIX = "erp:draft:";

export function useLocalDraft<T>(key: string, enabled = true): LocalDraft<T> {
  const storageKey = `${PREFIX}${key}`;
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const read = useCallback((): StoredDraft<T> | null => {
    if (!enabled || typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredDraft<T>;
      return parsed && typeof parsed.savedAt === "string" ? parsed : null;
    } catch {
      return null;
    }
  }, [storageKey, enabled]);

  const save = useCallback(
    (value: T) => {
      if (!enabled || typeof window === "undefined") return;
      const iso = new Date().toISOString();
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ value, savedAt: iso }));
        setSavedAt(iso);
      } catch {
        /* storage indisponível / cota estourada — rascunho é best-effort */
      }
    },
    [storageKey, enabled],
  );

  const clear = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setSavedAt(null);
  }, [storageKey]);

  return { read, save, clear, savedAt, markSavedAt: setSavedAt };
}
