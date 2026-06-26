"use client";

/**
 * AppProviders — selects the correct application context by route.
 *
 * Platform and Operator are independent apps that share only the backend and
 * design system. Here they are served from one Next.js runtime, so the active
 * app is chosen by pathname and gets its OWN scoped AuthProvider (separate
 * session, separate localStorage namespace). State is never shared between them.
 *
 * The CommandPalette (global search) belongs to the Platform only.
 */
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AuthProvider } from "@erp/ui/auth/auth-provider";
import { CommandPaletteProvider } from "@platform/components/command-palette";

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOperator = pathname?.startsWith("/operator") ?? false;

  if (isOperator) {
    return <AuthProvider scope="operator">{children}</AuthProvider>;
  }

  return (
    <AuthProvider scope="platform">
      <CommandPaletteProvider>{children}</CommandPaletteProvider>
    </AuthProvider>
  );
}
