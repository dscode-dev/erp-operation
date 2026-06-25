import { AlertTriangle, Info } from "lucide-react";

export function AlertCard({
  title,
  detail,
  severity,
}: {
  title: string;
  detail: string;
  severity: "danger" | "warning" | "info";
}) {
  const tone =
    severity === "danger"
      ? { ring: "ring-[var(--color-danger)]/30", dot: "bg-[var(--color-danger)]", text: "text-[var(--color-danger)]" }
      : severity === "warning"
        ? { ring: "ring-[var(--color-warning)]/30", dot: "bg-[var(--color-warning)]", text: "text-[var(--color-warning)]" }
        : { ring: "ring-[var(--color-info)]/30", dot: "bg-[var(--color-info)]", text: "text-[var(--color-info)]" };
  const Icon = severity === "info" ? Info : AlertTriangle;
  return (
    <li
      className={`relative flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card)] ring-1 ${tone.ring}`}
    >
      <div className={`mt-0.5 h-7 w-7 rounded-full grid place-items-center bg-[var(--color-muted)]/60 ${tone.text}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight">{title}</div>
        <div className="text-caption truncate mt-0.5">{detail}</div>
      </div>
      <span className={`h-2 w-2 rounded-full ${tone.dot} mt-2`} />
    </li>
  );
}
