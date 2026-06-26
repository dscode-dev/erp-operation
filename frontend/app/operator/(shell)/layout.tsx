import type { ReactNode } from "react";
import { RequireAuth } from "@erp/ui/auth/require-auth";
import { OperatorShell } from "@operator/shell/operator-shell";

/** Authenticated operator app: guard + field chrome. */
export default function OperatorShellLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <OperatorShell>{children}</OperatorShell>
    </RequireAuth>
  );
}
