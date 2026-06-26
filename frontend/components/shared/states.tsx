"use client";

/**
 * Shared async UI states: error, coming-soon and an <AsyncBoundary> that
 * renders loading skeletons, an error panel with retry, or the data.
 *
 * Every integrated screen wires loading / empty / error through these so the
 * UX (skeletons, honest empty states, retryable errors) stays consistent.
 */
import type { ReactNode } from "react";
import { AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { ApiClientError, errorMessage } from "@/lib/api";

export function ErrorState({
  error,
  onRetry,
  title = "Não foi possível carregar",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const forbidden = error instanceof ApiClientError && error.isForbidden;
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 p-8 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-danger)]/10 grid place-items-center">
        <AlertTriangle className="h-5 w-5 text-[var(--color-danger)]" />
      </div>
      <h3 className="mt-3 font-semibold">{forbidden ? "Sem permissão" : title}</h3>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)] max-w-md mx-auto">
        {forbidden
          ? "Seu perfil não tem acesso a este recurso."
          : errorMessage(error)}
      </p>
      {onRetry && !forbidden && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]"
        >
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      )}
    </div>
  );
}

export function ComingSoonState({
  title = "Em preparação",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-muted)] grid place-items-center">
        <Clock className="h-5 w-5 text-[var(--color-muted-foreground)]" />
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)] max-w-md mx-auto">{description}</p>
      )}
    </div>
  );
}

/** Renders loading/error/data for a query-like state. */
export function AsyncBoundary<T>({
  loading,
  error,
  data,
  onRetry,
  skeleton,
  children,
}: {
  loading: boolean;
  error: unknown;
  data: T | null;
  onRetry?: () => void;
  skeleton: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (loading && data === null) return <>{skeleton}</>;
  if (error && data === null) return <ErrorState error={error} onRetry={onRetry} />;
  if (data === null) return <>{skeleton}</>;
  return <>{children(data)}</>;
}
