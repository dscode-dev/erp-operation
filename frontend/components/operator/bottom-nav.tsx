"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, QrCode, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/operator", icon: Home, label: "Início" },
  { href: "/operator/services", icon: ClipboardList, label: "Atendimentos" },
  { href: "/operator/qr", icon: QrCode, label: "QR", primary: true },
  { href: "/operator/documents", icon: FileText, label: "Docs" },
  { href: "/operator/profile", icon: User, label: "Perfil" },
];

export function OperatorBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 inset-x-0 mx-auto max-w-[640px] border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur px-2 pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-[var(--shadow-floating)]"
    >
      <ul className="grid grid-cols-5 gap-1">
        {items.map(({ href, icon: Icon, label, primary }) => {
          const active = pathname === href;
          if (primary) {
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-label={label}
                  className="-mt-6 h-14 w-14 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] grid place-items-center shadow-[var(--shadow-hover)] active:scale-95 transition-transform"
                >
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] py-2 min-h-12 text-[11px] transition-colors",
                  active
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
