/**
 * API layer barrel.
 *
 * The single entry point for backend access. Components import from
 * `@erp/api` and never call `fetch` or hit endpoints directly.
 */
export * from "@erp/types";
export { api, apiRequest, ApiClientError, API_BASE_URL, DEMO_BRIDGE_ENABLED, onSessionInvalid } from "./client";
export { useQuery, errorMessage, type QueryState } from "./use-query";
export {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  hasSession,
  setSessionScope,
  getSessionScope,
  type SessionScope,
} from "./tokens";

export * as authApi from "./auth";
export * as usersApi from "./users";
export * as organizationApi from "./organization";
export * as customersApi from "./customers";
export * as equipmentsApi from "./equipments";
export * as dashboardApi from "./dashboard";
export * as financialApi from "./financial";
export * as demoApi from "./demo";

export * as operationsApi from "./operations";

export { isDemoDisabled, DemoUnavailableError } from "./demo";
export type { DashboardData } from "./dashboard";
export type { FinancialData, ScheduleData } from "./financial";
export type { OrdersData, ProductsData, DocumentsData, ServicesData } from "./operations";
