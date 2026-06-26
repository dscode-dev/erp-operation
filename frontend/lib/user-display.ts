import type { Role, UserPermissions } from "@/lib/api";
import type { ChipTone } from "@/components/shared/status-chip";

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gestor",
  OPERATOR: "Operador",
  VIEWER: "Visualizador",
};

export const ROLE_TONE: Record<Role, ChipTone> = {
  OWNER: "primary",
  MANAGER: "info",
  OPERATOR: "success",
  VIEWER: "neutral",
};

export const ROLES: Role[] = ["OWNER", "MANAGER", "OPERATOR", "VIEWER"];

export const PERMISSION_LABEL: Record<keyof UserPermissions, string> = {
  canFinancial: "Financeiro",
  canUsers: "Usuários",
  canReports: "Relatórios",
  canSchedules: "Agendamentos",
  canTemplates: "Modelos",
};

export const PERMISSION_KEYS: (keyof UserPermissions)[] = [
  "canFinancial",
  "canUsers",
  "canReports",
  "canSchedules",
  "canTemplates",
];
