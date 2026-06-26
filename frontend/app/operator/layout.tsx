import type { ReactNode } from "react";

/**
 * Operator root layout — minimal container. The session (operator scope) is
 * provided by AppProviders at the root based on the /operator path. Public
 * pages (login, troca de senha) render here directly; the authenticated app
 * lives under the (shell) route group with its own guard + chrome.
 */
export default function OperatorLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-[var(--color-background)] text-[var(--color-foreground)]">{children}</div>;
}
