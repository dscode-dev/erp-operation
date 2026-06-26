"use client";

/**
 * Declarative RBAC gate for hiding menus, buttons and actions.
 *
 * Usage:
 *   <Gate roles={["OWNER", "MANAGER"]}>...</Gate>
 *   <Gate permission="canFinancial">...</Gate>
 *
 * Visual only — the backend enforces access. Renders `fallback` (default null)
 * when the current session does not satisfy the requirement.
 */
import type { ReactNode } from "react";
import { useAuth } from "./auth-provider";
import type { Role, UserPermissions } from "@erp/api";

export function Gate({
  roles,
  permission,
  fallback = null,
  children,
}: {
  roles?: Role[];
  permission?: keyof UserPermissions;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasRole, can, status } = useAuth();
  if (status !== "authenticated") return <>{fallback}</>;

  const roleOk = !roles || roles.length === 0 || hasRole(...roles);
  const permissionOk = !permission || can(permission);

  return roleOk && permissionOk ? <>{children}</> : <>{fallback}</>;
}
