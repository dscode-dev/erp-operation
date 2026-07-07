"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, ClipboardList, Users, User } from "lucide-react";
import { cn } from "@erp/utils";

const items = [
  { href: "/operator", icon: Home, label: "Início" },
  //{ href: "/operator/agenda", icon: Calendar, label: "Agenda" },
  { href: "/operator/services", icon: ClipboardList, label: "Atend." },
  { href: "/operator/clientes", icon: Users, label: "Clientes" },
  { href: "/operator/profile", icon: User, label: "Perfil" },
];

export function OperatorBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 mx-auto max-w-[640px] border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[var(--shadow-floating)]"
    >
      <ul className="grid grid-cols-4 gap-1">
        {items.map(({ href, icon: Icon, label }) => {
          const active = href === "/operator" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] py-2 min-h-[52px] text-[11px] font-medium transition-colors",
                  active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110 transition-transform")} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
