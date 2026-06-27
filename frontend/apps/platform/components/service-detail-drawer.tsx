"use client";

/**
 * ServiceDetailDrawer — standardized detail for an atendimento.
 *
 * The Service/Work-Order domain has no production endpoint yet, so the data
 * comes from the demo schedule snapshot passed in. Includes the prepared
 * document view (draft) reusing the Sprint 1 document architecture.
 */
import { Drawer } from "@erp/ui/drawer";
import { StatusChip } from "@erp/ui/status-chip";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { User, Clock, Building2 } from "lucide-react";
import type { DemoScheduleState } from "@erp/api";
import type { GeneratedDocument } from "@erp/types";

export type ServiceItem = {
  id: string;
  title: string;
  customer: string;
  operator: string;
  startsAt: string;
  state: DemoScheduleState;
};

const STATE: Record<DemoScheduleState, { tone: "danger" | "info" | "primary" | "success"; label: string }> = {
  OVERDUE: { tone: "danger", label: "Atrasado" },
  IN_PROGRESS: { tone: "primary", label: "Em andamento" },
  SCHEDULED: { tone: "info", label: "Agendado" },
  DONE: { tone: "success", label: "Concluído" },
};

export function ServiceDetailDrawer({
  service,
  open,
  onClose,
}: {
  service: ServiceItem | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!service) return null;
  const s = STATE[service.state];
  const doc: GeneratedDocument = {
    id: `os-${service.id}`,
    kind: "WORK_ORDER",
    title: `OS — ${service.title}`,
    status: "draft",
  };

  return (
    <Drawer open={open} onClose={onClose} eyebrow="Atendimento" title={service.title} width="max-w-2xl">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={s.tone} dot>{s.label}</StatusChip>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2">
          <Row icon={<Building2 className="h-4 w-4" />} label="Cliente" value={service.customer} />
          <Row icon={<User className="h-4 w-4" />} label="Operador" value={service.operator} />
          <Row icon={<Clock className="h-4 w-4" />} label="Início" value={new Date(service.startsAt).toLocaleString("pt-BR")} />
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2">Documento</h3>
          <DocumentViewer
            document={doc}
            reviewFields={[
              { label: "Cliente", value: service.customer },
              { label: "Operador", value: service.operator },
              { label: "Status", value: s.label },
            ]}
          />
        </div>
      </div>
    </Drawer>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="inline-flex items-center gap-2 text-caption">{icon}{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
