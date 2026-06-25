"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Calendar,
  Briefcase,
  ClipboardList,
  Users,
  Wrench,
  Package,
  Sparkles,
  BarChart3,
  Wallet,
  Shield,
  Settings,
  User,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  soon?: boolean;
};
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Operação",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Agenda", href: "/agenda", icon: Calendar },
      { label: "Atendimentos", href: "/servicos", icon: Briefcase },
      { label: "Ordens de Serviço", href: "/ordens", icon: ClipboardList },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Equipamentos", href: "/equipamentos", icon: Wrench },
      { label: "Produtos", href: "#", icon: Package, soon: true },
      { label: "Serviços", href: "#", icon: Sparkles, soon: true },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Relatórios", href: "#", icon: BarChart3, soon: true },
      { label: "Financeiro", href: "/financial", icon: Wallet },
      { label: "Usuários", href: "#", icon: Shield, soon: true },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Configurações", href: "#", icon: Settings, soon: true },
      { label: "Perfil", href: "#", icon: User, soon: true },
    ],
  },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(groups.map((g) => [g.label, true])),
  );

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[244px]",
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[var(--color-border)]">
        <div className="h-8 w-8 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] grid place-items-center text-white shadow-[var(--shadow-card)]">
          <Zap className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight leading-tight">Operacional</div>
            <div className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">ERP de campo</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {groups.map((group, idx) => {
          const isOpen = openGroups[group.label] ?? true;
          return (
            <div key={group.label} className="px-2">
              {!collapsed ? (
                <button
                  type="button"
                  onClick={() => setOpenGroups((s) => ({ ...s, [group.label]: !isOpen }))}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn("h-3 w-3 transition-transform", !isOpen && "-rotate-90")}
                  />
                </button>
              ) : (
                idx > 0 && <div className="mx-2 mb-2 border-t border-[var(--color-border)]" />
              )}

              {(collapsed || isOpen) && (
                <ul className="mt-1 space-y-0.5">
                  {group.items.map(({ label, href, icon: Icon, soon }) => {
                    const active = href !== "#" && (pathname === href || (href !== "/" && pathname.startsWith(href)));
                    const content = (
                      <span
                        title={collapsed ? label : undefined}
                        aria-label={label}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2 text-[13px] transition-colors",
                          active
                            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                            : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                          soon && "opacity-60 cursor-not-allowed",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[var(--color-primary)]" />
                        )}
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="truncate flex-1">{label}</span>
                            {soon && (
                              <span className="text-[9px] uppercase tracking-wider rounded-sm bg-[var(--color-muted)] px-1 py-0.5 text-[var(--color-muted-foreground)]">
                                em breve
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    );
                    return (
                      <li key={label}>
                        {soon ? (
                          <div className="px-0">{content}</div>
                        ) : (
                          <Link href={href}>{content}</Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--color-border)] p-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-2 py-2 text-[11px] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" /> Recolher
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
