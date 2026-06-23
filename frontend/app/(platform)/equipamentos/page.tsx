import { Plus, QrCode } from "lucide-react";
import { PageHeader } from "@/components/platform/page-header";
import { FilterBar } from "@/components/platform/filter-bar";
import { DataTable, type Column } from "@/components/platform/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { equipments, type Equipment } from "@/mocks/data";

const columns: Column<Equipment>[] = [
  {
    key: "tag",
    header: "Tag",
    className: "w-[110px]",
    cell: (e) => <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{e.tag}</span>,
  },
  {
    key: "name",
    header: "Equipamento",
    cell: (e) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{e.name}</div>
        <div className="text-caption truncate">{e.location}</div>
      </div>
    ),
  },
  { key: "client", header: "Cliente", className: "w-[200px]", cell: (e) => <span className="text-sm truncate">{e.client}</span> },
  { key: "last", header: "Última", className: "w-[110px]", cell: (e) => <span className="font-mono text-xs">{e.lastService}</span> },
  { key: "next", header: "Próxima", className: "w-[110px]", cell: (e) => <span className="font-mono text-xs">{e.nextService}</span> },
  { key: "status", header: "Status", className: "w-[140px]", cell: (e) => <StatusPill status={e.status} /> },
];

export default function EquipamentosPage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Ativos"
        title="Equipamentos"
        description="Inventário operacional com status, manutenções e localização."
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
              <QrCode className="h-4 w-4" /> Gerar QR
            </button>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]">
              <Plus className="h-4 w-4" /> Cadastrar
            </button>
          </>
        }
      />

      <FilterBar
        placeholder="Buscar por tag, nome ou cliente…"
        chips={["Todos", "Críticos", "Atenção", "Em manutenção", "Offline"]}
      />

      <DataTable columns={columns} rows={equipments} rowHref={(e) => `/equipamentos/${e.id}`} />
    </div>
  );
}
