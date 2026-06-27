"use client";

/**
 * AgendaEventDrawer — lateral (não modal) com os detalhes do evento da agenda.
 *
 * Consome um item do schedule (Demo Dataset; pronto para o domínio real de
 * Agendamento). Edição/reagendamento são escopo futuro e ficam gated por RBAC.
 */
import { Building2, Wrench, User, Clock, ClipboardList, StickyNote, CalendarClock, Pencil } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import { StatusChip, type ChipTone } from "@erp/ui/status-chip";
import { Gate } from "@erp/ui/auth/gate";
import type { DemoScheduleItem, DemoScheduleState, DemoOrderType } from "@erp/api";

const STATE: Record<DemoScheduleState, { tone: ChipTone; label: string }> = {
  OVERDUE: { tone: "danger", label: "Atrasado" },
  IN_PROGRESS: { tone: "primary", label: "Em andamento" },
  SCHEDULED: { tone: "info", label: "Agendado" },
  DONE: { tone: "success", label: "Concluído" },
};

const TYPE_LABEL: Record<DemoOrderType, string> = {
  PREVENTIVA: "Manutenção preventiva",
  CORRETIVA: "Manutenção corretiva",
  INSTALACAO: "Instalação",
  PROJETO: "Projeto / Visita técnica",
};

function dateLabel(item: DemoScheduleItem): string {
  const start = new Date(item.startsAt);
  if (Number.isNaN(start.getTime())) return "—";
  const dia = start.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const hi = start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const end = item.endsAt ? new Date(item.endsAt) : null;
  const hf = end && !Number.isNaN(end.getTime()) ? ` – ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "";
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} · ${hi}${hf}`;
}

export function AgendaEventDrawer({
  event,
  open,
  onClose,
}: {
  event: DemoScheduleItem | null;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} eyebrow="Agenda" title={event?.title ?? ""} width="max-w-md">
      {event && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={STATE[event.state].tone} dot>{STATE[event.state].label}</StatusChip>
            {event.serviceType && <StatusChip tone="neutral">{TYPE_LABEL[event.serviceType]}</StatusChip>}
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] divide-y divide-[var(--color-border)]/60">
            <Row icon={<Building2 className="h-4 w-4" />} label="Cliente" value={event.customer} />
            <Row icon={<Wrench className="h-4 w-4" />} label="Equipamento" value={event.equipment ?? "—"} />
            <Row icon={<User className="h-4 w-4" />} label="Operador" value={event.operator} />
            <Row icon={<ClipboardList className="h-4 w-4" />} label="Tipo" value={event.serviceType ? TYPE_LABEL[event.serviceType] : "—"} />
            <Row icon={<Clock className="h-4 w-4" />} label="Data e horário" value={dateLabel(event)} />
          </div>

          {event.notes ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="flex items-center gap-1.5 text-caption uppercase tracking-wider mb-1.5"><StickyNote className="h-3.5 w-3.5" /> Observações</div>
              <p className="text-sm">{event.notes}</p>
            </div>
          ) : null}

          {/* Ações conforme RBAC — edição/reagendamento são escopo do domínio de Agenda. */}
          <Gate roles={["OWNER", "MANAGER"]}>
            <div className="space-y-2">
              <button type="button" disabled title="Disponível com o domínio de Agenda (em breve)." className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] h-10 text-sm opacity-60 cursor-not-allowed">
                <CalendarClock className="h-4 w-4" /> Reagendar
              </button>
              <button type="button" disabled title="Disponível com o domínio de Agenda (em breve)." className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] h-10 text-sm opacity-60 cursor-not-allowed">
                <Pencil className="h-4 w-4" /> Editar agendamento
              </button>
              <p className="text-[11px] text-[var(--color-muted-foreground)] text-center">Edição e criação chegam com o domínio operacional de Agenda.</p>
            </div>
          </Gate>
        </div>
      )}
    </Drawer>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="inline-flex items-center gap-2 text-caption shrink-0">{icon}{label}</span>
      <span className="text-sm text-right">{value || "—"}</span>
    </div>
  );
}
