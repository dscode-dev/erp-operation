import { Download } from "lucide-react";
import { PageHeader } from "@/components/platform/page-header";
import { FilterBar } from "@/components/platform/filter-bar";
import { DataTable, type Column } from "@/components/platform/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { NewServiceButton } from "@/components/platform/new-service-button";
import { todayServices, type ServiceRow } from "@/mocks/data";

const columns: Column<ServiceRow>[] = [
  {
    key: "code",
    header: "Código",
    className: "w-[110px]",
    cell: (s) => <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{s.code}</span>,
  },
  {
    key: "title",
    header: "Atendimento",
    cell: (s) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{s.title}</div>
        <div className="text-caption truncate">{s.client}</div>
      </div>
    ),
  },
  { key: "operator", header: "Operador", className: "w-[140px]", cell: (s) => <span className="text-sm">{s.operator}</span> },
  { key: "time", header: "Horário", className: "w-[90px]", cell: (s) => <span className="font-mono text-sm">{s.time}</span> },
  {
    key: "priority",
    header: "Prioridade",
    className: "w-[110px]",
    cell: (s) =>
      s.priority === "alta" ? (
        <span className="text-[10px] font-bold uppercase rounded px-1.5 py-0.5 bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
          urgente
        </span>
      ) : (
        <span className="text-caption">—</span>
      ),
  },
  { key: "status", header: "Status", className: "w-[140px]", cell: (s) => <StatusPill status={s.status} /> },
];

export default function ServicosPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Operação"
        title="Serviços"
        description="Fila completa de atendimentos do dia, ativos e agendados."
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
              <Download className="h-4 w-4" /> Exportar
            </button>
            <NewServiceButton />
          </>
        }
      />

      <FilterBar
        placeholder="Buscar por código, cliente ou operador…"
        chips={["Todos", "Em andamento", "Agendados", "Pendentes", "Concluídos"]}
      />

      <DataTable columns={columns} rows={todayServices} />
    </div>
  );
}
