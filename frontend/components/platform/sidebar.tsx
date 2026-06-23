"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Headset,
  ClipboardList,
  Users,
  Wrench,
  Package,
  Tags,
  BarChart3,
  Wallet,
  UserCog,
  Settings,
  CircleUserRound,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { label: string; href: string; icon: LucideIcon };
type NavGroup = { id: string; label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    id: "operacao",
    label: "Operação",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
      { label: "Agenda", href: "/agenda", icon: CalendarDays },
      { label: "Atendimentos", href: "/servicos", icon: Headset },
      { label: "Ordens de Serviço", href: "/ordens", icon: ClipboardList },
    ],
  },
  {
    id: "cadastros",
    label: "Cadastros",
    items: [
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Equipamentos", href: "/equipamentos", icon: Wrench },
      { label: "Produtos", href: "/produtos", icon: Package },
      { label: "Serviços", href: "/catalogo", icon: Tags },
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    items: [
      { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
      { label: "Financeiro", href: "/financial", icon: Wallet },
      { label: "Usuários", href: "/usuarios", icon: UserCog },
    ],
  },
  {
    id: "sistema",
    label: "Sistema",
    items: [
      { label: "Configurações", href: "/configuracoes", icon: Settings },
      { label: "Perfil", href: "/perfil", icon: CircleUserRound },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function PlatformSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: string) =>
    setClosed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] transition-[width] duration-200 sticky top-0 h-dvh",
        collapsed ? "w-[68px]" : "w-[248px]",
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[var(--color-border)] shrink-0">
        <div className="h-8 w-8 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] grid place-items-center text-[var(--color-primary-foreground)] shadow-[var(--shadow-card)]">
          <Zap className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="font-semibold tracking-tight truncate">Operacional</div>
            <div className="text-[10px] text-[var(--color-muted-foreground)] truncate">
              Gestão de campo
            </div>
          </div>
        )}
      </div>

      {/* Navegação agrupada */}
      <nav className="flex-1 overflow-y-auto scroll-thin px-2 py-3 space-y-4">
        {groups.map((group) => {
          const isClosed = !collapsed && closed[group.id];
          return (
            <div key={group.id}>
              {collapsed ? (
                <div className="mx-3 mb-1 h-px bg-[var(--color-border)]" />
              ) : (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="group flex w-full items-center justify-between px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isClosed && "-rotate-90",
                    )}
                  />
                </button>
              )}

              {!isClosed && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map(({ label, href, icon: Icon }) => {
                    const active = isActive(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        title={collapsed ? label : undefined}
                        aria-label={label}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm transition-colors",
                          collapsed && "justify-center px-0",
                          active
                            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium"
                            : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-[var(--color-primary)]" />
                        )}
                        <Icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span className="truncate">{label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Recolher */}
      <div className="border-t border-[var(--color-border)] p-2 shrink-0">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : undefined}
          className={cn(
            "inline-flex w-full items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors",
            collapsed && "justify-center px-0",
          )}
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
