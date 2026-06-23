"use client";

import { Bell, Building2, ChevronDown, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useCommandPalette } from "@/components/shared/command-palette";

export function PlatformTopbar() {
  const { open } = useCommandPalette();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)]/80 px-4 lg:px-6 backdrop-blur">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-2 py-1.5 text-sm text-[var(--color-muted-foreground)]"
        aria-label="Trocar empresa"
      >
        <Building2 className="h-4 w-4" />
        <span className="hidden sm:inline">Empresa Modelo</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={open}
        aria-label="Busca global (Ctrl+K)"
        className="flex-1 max-w-md inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-3 py-1.5 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar clientes, serviços, equipamentos…</span>
        <kbd className="font-mono text-[10px] rounded border border-[var(--color-border)] px-1.5 py-0.5">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          aria-label="Notificações"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--color-danger)]" />
        </button>
        <ThemeToggle />
        <button
          type="button"
          aria-label="Menu do usuário"
          className="ml-1 h-8 w-8 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] grid place-items-center text-xs font-semibold"
        >
          OP
        </button>
      </div>
    </header>
  );
}
