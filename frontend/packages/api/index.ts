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
export * as procurementApi from "./procurement";
export * as demoApi from "./demo";

export * as operationsApi from "./operations";
export * as operationApi from "./operation";
export * as documentsApi from "./documents";
export * as signaturesApi from "./signatures";
export * as assetLifecycleApi from "./asset-lifecycle";
export * as assignmentsApi from "./assignments";
export * as inventoryApi from "./inventory";
export * as pricingApi from "./pricing";
export * as budgetsApi from "./budgets";

export { isDemoDisabled, DemoUnavailableError } from "./demo";
export type { DashboardData } from "./dashboard";
export type {
  ListFinancialAccountsParams,
  ListFinancialCategoriesParams,
  ListFinancialEntriesParams,
} from "./financial";
export type { ListPurchaseOrdersParams } from "./procurement";
export type { OrdersData, ProductsData, ServicesData } from "./operations";
export type { OperationPhotoContent } from "./operation";
export type { ListSignaturesParams, SignaturePayload } from "./signatures";
export type { ListAssetLifecycleParams } from "./asset-lifecycle";
export type { ListAssignmentsParams } from "./assignments";
export type { ListBudgetsParams } from "./budgets";
