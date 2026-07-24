"use client";

/**
 * Minimal data-fetching hook for client components.
 *
 * Wraps an async loader (typically a `lib/api/*` call), tracks loading/error
 * state, supports abort on unmount/refetch, and exposes a `refetch`. Keeps the
 * dependency-light spirit of the project (no react-query).
 *
 * Near-realtime: pass `options.refetchInterval` to poll in the background and/or
 * `options.refetchOnFocus` to silently refresh when the tab regains focus /
 * becomes visible / the network reconnects. Background refreshes keep the last
 * data on screen (no skeleton flash) and surface through `refreshing`, not
 * `loading`.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError } from "./client";

export type QueryOptions = {
  /** Poll interval in ms. Background refetch runs only while the tab is visible. */
  refetchInterval?: number;
  /** Silently refetch on window focus, tab visibility and network reconnection. Defaults to true when `refetchInterval` is set. */
  refetchOnFocus?: boolean;
};

export type QueryState<T> = {
  data: T | null;
  /** True during the initial load and explicit `refetch()` calls. */
  loading: boolean;
  /** True during background polls / focus refreshes (data stays on screen). */
  refreshing: boolean;
  error: ApiClientError | Error | null;
  /** Re-run the loader as a foreground load (shows `loading`). */
  refetch: () => void;
};

export function useQuery<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
  options: QueryOptions = {},
): QueryState<T> {
  const { refetchInterval, refetchOnFocus = Boolean(refetchInterval) } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiClientError | Error | null>(null);
  const [tick, setTick] = useState(0);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const primaryInFlight = useRef(false);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  // Primary (foreground) load — mount, deps change, explicit refetch.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    primaryInFlight.current = true;
    setLoading(true);
    setError(null);

    loaderRef
      .current(controller.signal)
      .then((result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      })
      .finally(() => {
        if (active) primaryInFlight.current = false;
      });

    return () => {
      active = false;
      primaryInFlight.current = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  // Background (silent) refresh — polling + focus/visibility/reconnect.
  useEffect(() => {
    if (!refetchInterval && !refetchOnFocus) return;
    let active = true;
    let inFlight: AbortController | null = null;

    const silent = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (inFlight || primaryInFlight.current) return; // avoid overlap / stale clobber
      const controller = new AbortController();
      inFlight = controller;
      setRefreshing(true);
      loaderRef
        .current(controller.signal)
        .then((result) => {
          if (active) {
            setData(result);
            setError(null);
          }
        })
        .catch(() => {
          // Swallow background errors: keep the last good data on screen.
        })
        .finally(() => {
          if (active) setRefreshing(false);
          inFlight = null;
        });
    };

    const intervalId = refetchInterval ? window.setInterval(silent, refetchInterval) : undefined;
    const onFocus = () => silent();
    const onVisible = () => {
      if (document.visibilityState === "visible") silent();
    };
    if (refetchOnFocus) {
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("online", onFocus);
    }

    return () => {
      active = false;
      if (inFlight) inFlight.abort();
      if (intervalId) window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchInterval, refetchOnFocus, ...deps]);

  return { data, loading, refreshing, error, refetch };
}

/** Human-friendly message for an unknown thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return "Erro inesperado.";
}
