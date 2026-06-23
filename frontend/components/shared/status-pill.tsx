import { cn } from "@/lib/utils";

export type Status =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "pending"
  | "offline"
  | "in_progress"
  | "done"
  | "scheduled";

const map: Record<Status, { label: string; cls: string }> = {
  success:     { label: "Concluído",   cls: "bg-[var(--color-success)]/12 text-[var(--color-success)]" },
  done:        { label: "Concluído",   cls: "bg-[var(--color-success)]/12 text-[var(--color-success)]" },
  warning:     { label: "Atenção",     cls: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]" },
  danger:      { label: "Crítico",     cls: "bg-[var(--color-danger)]/12 text-[var(--color-danger)]" },
  info:        { label: "Info",        cls: "bg-[var(--color-info)]/12 text-[var(--color-info)]" },
  pending:     { label: "Pendente",    cls: "bg-[var(--color-pending)]/15 text-[var(--color-pending)]" },
  scheduled:   { label: "Agendado",    cls: "bg-[var(--color-info)]/12 text-[var(--color-info)]" },
  in_progress: { label: "Em andamento",cls: "bg-[var(--color-primary)]/12 text-[var(--color-primary)]" },
  offline:     { label: "Offline",     cls: "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]" },
};

export function StatusPill({ status, label }: { status: Status; label?: string }) {
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", s.cls)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? s.label}
    </span>
  );
}
