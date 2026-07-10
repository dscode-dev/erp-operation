/**
 * Core HTTP client for the ERP backend.
 *
 * Responsibilities:
 * - prefix every request with the configured base URL (`/api/v1`);
 * - attach `Authorization: Bearer <accessToken>` and a fresh `X-Request-Id`;
 * - unwrap the `{ success, data }` envelope and raise a typed `ApiClientError`;
 * - on 401, attempt a single-flight refresh and replay the request once;
 * - notify the session layer when the session is irrecoverable.
 *
 * Components must never call `fetch` directly — always go through the domain
 * modules in `lib/api/*`, which build on this client.
 */
import type { ApiErrorBody } from "@erp/types";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./tokens";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env.NODE_ENV === "production" ? "/api/v1" : "http://localhost:3000/api/v1")
).replace(/\/$/, "");

/** Whether the development demo bridge (dashboard/schedule/finance) is enabled. */
export const DEMO_BRIDGE_ENABLED =
  (process.env.NEXT_PUBLIC_ENABLE_DEMO ?? "false").toLowerCase() === "true";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown>;
  readonly requestId: string | null;

  constructor(args: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
    requestId?: string | null;
  }) {
    super(args.message);
    this.name = "ApiClientError";
    this.code = args.code;
    this.status = args.status;
    this.details = args.details ?? {};
    this.requestId = args.requestId ?? null;
  }

  /** True when the session can no longer recover and the user must re-login. */
  get isSessionFatal(): boolean {
    return (
      this.status === 401 ||
      this.code === "AUTH_SESSION_REVOKED" ||
      this.code === "AUTH_USER_INACTIVE" ||
      this.code === "AUTH_INVALID_TOKEN"
    );
  }

  get isForbidden(): boolean {
    return this.status === 403 && this.code !== "PASSWORD_CHANGE_REQUIRED";
  }

  get requiresPasswordChange(): boolean {
    return this.code === "PASSWORD_CHANGE_REQUIRED";
  }
}

/** Listeners invoked when the session becomes invalid (used by the auth provider). */
type SessionListener = (reason: "expired" | "password-change") => void;
const sessionListeners = new Set<SessionListener>();

export function onSessionInvalid(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

function emitSessionInvalid(reason: "expired" | "password-change") {
  sessionListeners.forEach((l) => l(reason));
}

function requestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ---------- single-flight refresh ---------- */

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Request-Id": requestId() },
          body: JSON.stringify({ refreshToken }),
        });
        const body = (await res.json().catch(() => null)) as
          | { success: true; data: { accessToken: string; refreshToken: string } }
          | ApiErrorBody
          | null;
        if (res.ok && body && body.success) {
          setTokens({
            accessToken: body.data.accessToken,
            refreshToken: body.data.refreshToken,
          });
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        // Cleared on the next tick so concurrent callers share this resolution.
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }

  return refreshInFlight;
}

/* ---------- request core ---------- */

export type RequestOptions = {
  method?: string;
  body?: unknown;
  /** multipart/form-data body; Content-Type is left to the browser. */
  form?: FormData;
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Skip the bearer token (public endpoints such as /auth/login, /health). */
  auth?: boolean;
  /** Skip the automatic refresh+replay on 401 (used by the refresh call itself). */
  retryOnUnauthorized?: boolean;
  signal?: AbortSignal;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const requestPath = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_ORIGIN ?? "http://localhost";
  const url = new URL(requestPath, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function rawRequest<T>(path: string, opts: RequestOptions): Promise<T> {
  const { method = "GET", body, form, query, auth = true, signal } = opts;

  const headers: Record<string, string> = { "X-Request-Id": requestId() };
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined && !form) headers["Content-Type"] = "application/json";

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    signal,
  });

  const responseRequestId = res.headers.get("X-Request-Id");

  // 204 / empty body
  if (res.status === 204) return undefined as T;

  const payload = (await res.json().catch(() => null)) as
    | { success: true; data: T }
    | ApiErrorBody
    | null;

  if (res.ok && payload && payload.success) {
    return payload.data;
  }

  const error = payload && !payload.success ? payload.error : null;
  throw new ApiClientError({
    code: error?.code ?? "UNKNOWN_ERROR",
    message: error?.message ?? `Request failed with status ${res.status}`,
    status: res.status,
    details: error?.details ?? {},
    requestId: responseRequestId,
  });
}

async function rawBlobRequest(path: string, opts: RequestOptions): Promise<{ blob: Blob; filename: string | null }> {
  const { method = "GET", query, auth = true, signal } = opts;
  const headers: Record<string, string> = { "X-Request-Id": requestId() };
  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(buildUrl(path, query), { method, headers, signal });
  const responseRequestId = res.headers.get("X-Request-Id");
  if (res.ok) {
    const disposition = res.headers.get("Content-Disposition");
    return { blob: await res.blob(), filename: filenameFromDisposition(disposition) };
  }
  const payload = (await res.json().catch(() => null)) as ApiErrorBody | null;
  const error = payload && !payload.success ? payload.error : null;
  throw new ApiClientError({
    code: error?.code ?? "UNKNOWN_ERROR",
    message: error?.message ?? `Request failed with status ${res.status}`,
    status: res.status,
    details: error?.details ?? {},
    requestId: responseRequestId,
  });
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, opts);
  } catch (err) {
    if (!(err instanceof ApiClientError)) throw err;

    // Password change gate — surface to the session layer and re-throw.
    if (err.requiresPasswordChange) {
      emitSessionInvalid("password-change");
      throw err;
    }

    // Attempt one transparent refresh + replay on 401.
    const canRetry = opts.auth !== false && opts.retryOnUnauthorized !== false;
    if (err.status === 401 && canRetry) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return rawRequest<T>(path, { ...opts, retryOnUnauthorized: false });
      }
      clearTokens();
      emitSessionInvalid("expired");
    }

    throw err;
  }
}

export async function apiBlobRequest(path: string, opts: RequestOptions = {}): Promise<{ blob: Blob; filename: string | null }> {
  try {
    return await rawBlobRequest(path, opts);
  } catch (err) {
    if (!(err instanceof ApiClientError)) throw err;
    if (err.requiresPasswordChange) {
      emitSessionInvalid("password-change");
      throw err;
    }
    const canRetry = opts.auth !== false && opts.retryOnUnauthorized !== false;
    if (err.status === 401 && canRetry) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return rawBlobRequest(path, { ...opts, retryOnUnauthorized: false });
      }
      clearTokens();
      emitSessionInvalid("expired");
    }
    throw err;
  }
}

function filenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : null;
}

/* ---------- convenience verbs ---------- */

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
  upload: <T>(path: string, form: FormData, opts?: Omit<RequestOptions, "method" | "form">) =>
    apiRequest<T>(path, { ...opts, method: "POST", form }),
  blob: (path: string, opts?: Omit<RequestOptions, "method" | "body" | "form">) =>
    apiBlobRequest(path, { ...opts, method: "GET" }),
};
