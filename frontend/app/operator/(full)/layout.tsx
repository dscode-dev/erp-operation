import type { ReactNode } from "react";
import { RequireAuth } from "@erp/ui/auth/require-auth";

/**
 * Full-screen operator flows (wizard) — authenticated, but without the bottom
 * navigation/shell so the flow owns the whole viewport.
 */
export default function OperatorFullLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="max-w-[640px] mx-auto min-h-dvh bg-[var(--color-background)] text-[var(--color-foreground)]">
        {children}
      </div>
    </RequireAuth>
  );
}
