"use client";

/**
 * Minimal data-fetching hook for client components.
 *
 * Wraps an async loader (typically a `lib/api/*` call), tracks loading/error
 * state, supports abort on unmount/refetch, and exposes a `refetch`. Keeps the
 * dependency-light spirit of the project (no react-query).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiClientError } from "./client";

export type QueryState<T> = {
  data: T | null;
  loading: boolean;
  error: ApiClientError | Error | null;
  /** Re-run the loader. */
  refetch: () => void;
};

export function useQuery<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown> = [],
): QueryState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiClientError | Error | null>(null);
  const [tick, setTick] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
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
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, refetch };
}

/** Human-friendly message for an unknown thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return "Erro inesperado.";
}
