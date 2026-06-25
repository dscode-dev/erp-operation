import Link from "next/link";
import { Download, Plus, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/platform/page-header";
import { FilterBar } from "@/components/platform/filter-bar";
import { DataTable, type Column } from "@/components/platform/data-table";
import { MetricCard } from "@/components/platform/metric-card";
import { StatusPill } from "@/components/shared/status-pill";
import { workOrders, workOrderMetrics, type WorkOrder, type WorkOrderType } from "@/mocks/data";

const typeLabel: Record<WorkOrderType, string> = {
  corretiva: "Corretiva",
  preventiva: "Preventiva",
  instalacao: "Instalação",
  diagnostico: "Diagnóstico",
};

const typeTone: Record<WorkOrderType, string> = {
  corretiva:   "bg-[var(--color-danger)]/10  text-[var(--color-danger)]",
  preventiva:  "bg-[var(--color-success)]/12 text-[var(--color-success)]",
  instalacao:  "bg-[var(--color-info)]/12    text-[var(--color-info)]",
  diagnostico: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
};

const slaTone: Record<"ok" | "warn" | "late", string> = {
  ok:   "text-[var(--color-success)] bg-[var(--color-success)]/10",
  warn: "text-[var(--color-warning)] bg-[var(--color-warning)]/15",
  late: "text-[var(--color-danger)]  bg-[var(--color-danger)]/12",
};

const columns: Column<WorkOrder>[] = [
  {
    key: "number",
    header: "Nº",
    className: "w-[110px]",
    cell: (w) => <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{w.number}</span>,
  },
  {
    key: "title",
    header: "Ordem de serviço",
    cell: (w) => (
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{w.title}</span>
          {w.priority === "alta" && (
            <span className="text-[10px] font-bold uppercase rounded px-1.5 py-0.5 bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
              urgente
            </span>
          )}
        </div>
        <div className="text-caption truncate">
          {w.client} · <span className="font-mono">{w.equipmentTag}</span>
        </div>
      </div>
    ),
  },
  {
    key: "type",
    header: "Tipo",
    className: "w-[120px]",
    cell: (w) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${typeTone[w.type]}`}>
        {typeLabel[w.type]}
      </span>
    ),
  },
  { key: "operator",   header: "Operador",  className: "w-[130px]", cell: (w) => <span className="text-sm">{w.operator}</span> },
  { key: "scheduled",  header: "Agendada",  className: "w-[150px]", cell: (w) => <span className="font-mono text-xs">{w.scheduledFor}</span> },
  {
    key: "sla",
    header: "SLA",
    className: "w-[130px]",
    cell: (w) => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${slaTone[w.sla.tone]}`}>
        {w.sla.label}
      </span>
    ),
  },
  { key: "value",      header: "Valor",     className: "w-[110px]", cell: (w) => <span className="font-mono text-sm tabular-nums">{w.value}</span> },
  { key: "status",     header: "Status",    className: "w-[140px]", cell: (w) => <StatusPill status={w.status} /> },
  {
    key: "actions",
    header: "",
    className: "w-[40px]",
    cell: () => <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />,
  },
];

export default function OrdensPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Operação"
        title="Ordens de Serviço"
        description="Visão executiva das OS abertas, em execução, atrasadas e fechadas."
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
              <Download className="h-4 w-4" /> Exportar
            </button>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]">
              <Plus className="h-4 w-4" /> Nova OS
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {workOrderMetrics.map((m) => <MetricCard key={m.label} {...m} />)}
      </div>

      <FilterBar
        placeholder="Buscar por nº, cliente, equipamento ou operador…"
        chips={["Todas", "Em execução", "Aguardando peça", "Agendadas", "Atrasadas", "Concluídas"]}
      />

      <DataTable columns={columns} rows={workOrders} rowHref={(w) => `/ordens/${w.id}`} />

      <p className="text-caption">
        Atalho: <Link href="/servicos" className="underline hover:text-[var(--color-foreground)]">ver fila operacional do dia</Link>.
      </p>
    </div>
  );
}
