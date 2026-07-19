"use client";

/**
 * OperatorShell — the field-app chrome (NOT an admin dashboard).
 *
 * Mobile-first: a slim brand bar + content + bottom navigation. Deliberately
 * different from the Platform layout; the two apps share only the design system.
 */
import type { ReactNode } from "react";
import { OperatorBottomNav } from "@operator/components/bottom-nav";
import { useAssignmentAlerts } from "@operator/lib/assignment-alerts";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { BrandLogo } from "@erp/ui/brand";
import { firstName } from "@erp/utils";

function OperatorTopBar() {
  const { session } = useAuth();
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] px-4">
      <BrandLogo height={24} />
      <span className="ml-auto text-[11px] font-medium text-[var(--color-muted-foreground)] truncate">
        {session ? firstName(session.user.name) : "Campo"}
      </span>
    </header>
  );
}

export function OperatorShell({ children }: { children: ReactNode }) {
  // Alerta de novos atendimentos atribuídos (notificação local + polling).
  useAssignmentAlerts();
  return (
    <div className="min-h-dvh flex flex-col bg-[var(--color-background)] text-[var(--color-foreground)] max-w-[640px] mx-auto">
      <OperatorTopBar />
      <main className="flex-1 pb-24 animate-fade-in">{children}</main>
      <OperatorBottomNav />
    </div>
  );
}
