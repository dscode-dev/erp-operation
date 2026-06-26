/**
 * Token storage.
 *
 * Sprint 1 keeps tokens in localStorage so the SPA-style shell (client components)
 * can attach the bearer token to every protected call. Reads are guarded for SSR.
 */
import type { AuthTokens } from "./types";

const ACCESS_KEY = "erp.accessToken";
const REFRESH_KEY = "erp.refreshToken";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: Pick<AuthTokens, "accessToken" | "refreshToken">): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export function hasSession(): boolean {
  return Boolean(getAccessToken());
}
