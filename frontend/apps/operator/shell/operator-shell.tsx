"use client";

/**
 * OperatorShell — the field-app chrome (NOT an admin dashboard).
 *
 * Mobile-first: a slim brand bar + content + bottom navigation. Deliberately
 * different from the Platform layout; the two apps share only the design system.
 */
import type { ReactNode } from "react";
import { HardHat } from "lucide-react";
import { OperatorBottomNav } from "@operator/components/bottom-nav";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { firstName } from "@erp/utils";

function OperatorTopBar() {
  const { session } = useAuth();
  const org = session?.organization.tradeName || session?.organization.legalName || "Operação";
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-primary)] px-4 text-white">
      <HardHat className="h-4 w-4" />
      <span className="text-sm font-semibold truncate">{org}</span>
      <span className="ml-auto text-[11px] opacity-90 truncate">
        {session ? firstName(session.user.name) : "Campo"}
      </span>
    </header>
  );
}

export function OperatorShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)] max-w-[640px] mx-auto">
      <OperatorTopBar />
      <main className="flex-1 pb-24 animate-fade-in">{children}</main>
      <OperatorBottomNav />
    </div>
  );
}
