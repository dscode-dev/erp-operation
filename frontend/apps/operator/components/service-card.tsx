import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusPill, type Status } from "@erp/ui/status-pill";

export type ServiceCardProps = {
  id: string;
  title: string;
  client: string;
  time: string;
  status: Status;
  priority?: "alta" | "média" | "baixa";
};

export function ServiceCard({ id, title, client, time, status, priority }: ServiceCardProps) {
  return (
    <Link
      href={`/operator/services/${id}`}
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] active:scale-[0.99] transition-transform"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{title}</h3>
          {priority === "alta" && (
            <span className="text-[10px] font-bold uppercase rounded px-1.5 py-0.5 bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
              urgente
            </span>
          )}
        </div>
        <p className="text-caption truncate">{client} · {time}</p>
        <div className="mt-2"><StatusPill status={status} /></div>
      </div>
      <ChevronRight className="h-5 w-5 text-[var(--color-muted-foreground)]" />
    </Link>
  );
}
