"use client";

/**
 * Route guard for the authenticated shells (platform + operator).
 *
 * - `loading`         → full-screen spinner;
 * - `unauthenticated` → redirect to /login;
 * - `password-change` → redirect to the mandatory password screen;
 * - role mismatch     → redirect home (defense in depth on top of the backend).
 */
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "./auth-provider";
import type { Role } from "@/lib/api";

function FullScreenLoader() {
  return (
    <div className="min-h-dvh grid place-items-center bg-[var(--color-background)] text-[var(--color-muted-foreground)]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
        <span className="text-sm">Carregando sessão…</span>
      </div>
    </div>
  );
}

export function RequireAuth({
  children,
  roles,
  /** Where to send a user whose role is not allowed here. */
  fallbackPath = "/",
}: {
  children: ReactNode;
  roles?: Role[];
  fallbackPath?: string;
}) {
  const { status, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    } else if (status === "password-change") {
      router.replace("/trocar-senha");
    } else if (status === "authenticated" && roles && role && !roles.includes(role)) {
      router.replace(fallbackPath);
    }
  }, [status, role, roles, router, pathname, fallbackPath]);

  if (status !== "authenticated") return <FullScreenLoader />;
  if (roles && role && !roles.includes(role)) return <FullScreenLoader />;

  return <>{children}</>;
}
