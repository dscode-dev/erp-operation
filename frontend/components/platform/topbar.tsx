"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Building2, ChevronDown, LogOut, Search, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useCommandPalette } from "@/components/shared/command-palette";
import { useAuth } from "@/components/auth/auth-provider";
import { initials } from "@/lib/format";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gestor",
  OPERATOR: "Operador",
  VIEWER: "Visualizador",
};

export function PlatformTopbar() {
  const { open } = useCommandPalette();
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const orgName = session?.organization.tradeName ?? session?.organization.legalName ?? "Empresa";
  const userName = session?.user.name ?? "Usuário";
  const roleLabel = session ? ROLE_LABEL[session.role] ?? session.role : "";

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)]/80 px-4 lg:px-6 backdrop-blur">
      <div
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-2 py-1.5 text-sm text-[var(--color-muted-foreground)]"
      >
        <Building2 className="h-4 w-4" />
        <span className="hidden sm:inline max-w-[180px] truncate">{orgName}</span>
      </div>

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

        <div className="relative ml-1" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu do usuário"
            aria-haspopup="menu"
            aria-expanded={menuOpen ? "true" : "false"}
            className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-[var(--color-muted)]"
          >
            <span className="h-7 w-7 rounded-full bg-[var(--color-accent)] text-white grid place-items-center text-[11px] font-semibold">
              {initials(userName)}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-floating)] p-1.5 animate-slide-up"
            >
              <div className="px-3 py-2.5 border-b border-[var(--color-border)]">
                <div className="text-sm font-medium truncate">{userName}</div>
                <div className="text-caption truncate">{session?.user.email}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--color-primary)]">
                  <ShieldCheck className="h-3 w-3" /> {roleLabel}
                </div>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => logout()}
                className="mt-1 w-full inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
