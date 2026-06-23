import { Plus } from "lucide-react";
import { PageHeader } from "@/components/platform/page-header";
import { FilterBar } from "@/components/platform/filter-bar";
import { DataTable, type Column } from "@/components/platform/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { clients, type Client } from "@/mocks/data";

const columns: Column<Client>[] = [
  {
    key: "name",
    header: "Cliente",
    cell: (c) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{c.name}</div>
        <div className="text-caption truncate">{c.contact}</div>
      </div>
    ),
  },
  { key: "segment", header: "Segmento", className: "w-[150px]", cell: (c) => <span className="text-sm">{c.segment}</span> },
  { key: "city", header: "Cidade", className: "w-[180px]", cell: (c) => <span className="text-sm">{c.city}</span> },
  {
    key: "open",
    header: "Em aberto",
    className: "w-[110px]",
    cell: (c) => (
      <span className={c.openServices > 0 ? "font-medium" : "text-[var(--color-muted-foreground)]"}>
        {c.openServices}
      </span>
    ),
  },
  { key: "equipments", header: "Equipamentos", className: "w-[130px]", cell: (c) => <span className="font-mono text-sm">{c.equipments}</span> },
  { key: "status", header: "Status", className: "w-[140px]", cell: (c) => <StatusPill status={c.status} /> },
];

export default function ClientesPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Cadastros"
        title="Clientes"
        description="Carteira ativa e histórico operacional por cliente."
        actions={
          <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]">
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        }
      />

      <FilterBar
        placeholder="Buscar por nome, contato ou cidade…"
        chips={["Todos", "Ativos", "Críticos", "Sem atendimentos"]}
      />

      <DataTable columns={columns} rows={clients} rowHref={(c) => `/clientes/${c.id}`} />
    </div>
  );
}
