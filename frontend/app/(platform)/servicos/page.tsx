"use client";

import { useMemo, useState } from "react";
import { Briefcase, Search } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { ExportButton } from "@platform/components/export-button";
import { StatusPill, type Status } from "@erp/ui/status-pill";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { NewServiceButton } from "@platform/components/new-service-button";
import { ServiceDetailDrawer } from "@platform/components/service-detail-drawer";
import { financialApi, useQuery, type DemoScheduleState, type ScheduleData } from "@erp/api";
import { cn } from "@erp/utils";

const STATE_PILL: Record<DemoScheduleState, Status> = {
  OVERDUE: "danger",
  IN_PROGRESS: "in_progress",
  SCHEDULED: "scheduled",
};
const STATE_LABEL: Record<DemoScheduleState, string> = {
  OVERDUE: "Atrasado",
  IN_PROGRESS: "Em andamento",
  SCHEDULED: "Agendado",
};

type ServiceItem = {
  id: string;
  title: string;
  customer: string;
  operator: string;
  startsAt: string;
  state: DemoScheduleState;
};

const FILTERS = ["Todos", "Em andamento", "Agendados", "Atrasados"] as const;

export default function ServicosPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Todos");
  const [detail, setDetail] = useState<ServiceItem | null>(null);
  const sched = useQuery<ScheduleData>((signal) => financialApi.getSchedule({ signal }), []);

  const rows = useMemo<ServiceItem[]>(() => {
    let items = (sched.data?.items ?? []) as ServiceItem[];
    if (filter === "Em andamento") items = items.filter((i) => i.state === "IN_PROGRESS");
    else if (filter === "Agendados") items = items.filter((i) => i.state === "SCHEDULED");
    else if (filter === "Atrasados") items = items.filter((i) => i.state === "OVERDUE");
    const q = search.trim().toLowerCase();
    if (q) items = items.filter((i) => [i.title, i.customer, i.operator].join(" ").toLowerCase().includes(q));
    return items;
  }, [sched.data, filter, search]);

  const columns: Column<ServiceItem>[] = [
    {
      key: "title",
      header: "Atendimento",
      cell: (s) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{s.title}</div>
          <div className="text-caption truncate">{s.customer}</div>
        </div>
      ),
    },
    { key: "operator", header: "Operador", className: "w-[160px]", cell: (s) => <span className="text-sm">{s.operator}</span> },
    {
      key: "time",
      header: "Horário",
      className: "w-[120px]",
      cell: (s) => {
        const at = new Date(s.startsAt);
        return <span className="font-mono text-xs">{Number.isNaN(at.getTime()) ? "—" : at.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>;
      },
    },
    { key: "status", header: "Status", className: "w-[150px]", cell: (s) => <StatusPill status={STATE_PILL[s.state]} label={STATE_LABEL[s.state]} /> },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Operação"
        title="Atendimentos"
        description="Fila de atendimentos consumida do Demo Dataset (domínio de Serviços é escopo futuro)."
        actions={
          <>
            <ExportButton
              label="Exportar"
              fileName="atendimentos"
              rows={rows.map((r) => ({ atendimento: r.title, cliente: r.customer, operador: r.operator, inicio: r.startsAt, status: STATE_LABEL[r.state] }))}
            />
            <NewServiceButton />
          </>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 h-9 w-full max-w-[360px]">
          <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por atendimento, cliente ou operador…" className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--color-muted-foreground)]" />
        </div>
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "h-8 rounded-full border px-3 text-xs whitespace-nowrap transition-colors",
                filter === f
                  ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {sched.loading && !sched.data ? (
        <SkeletonList rows={6} />
      ) : sched.error && !sched.data ? (
        <ErrorState error={sched.error} onRetry={sched.refetch} />
      ) : sched.data?.disabled ? (
        <ComingSoonState title="Atendimentos em breve" description="O domínio de Serviços ainda não existe na API. Ative o Demo Dataset para visualizar dados de desenvolvimento." />
      ) : rows.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nenhum atendimento" description={search || filter !== "Todos" ? "Ajuste os filtros." : "Sem atendimentos no período."} />
      ) : (
        <DataTable columns={columns} rows={rows} onRowClick={(s) => setDetail(s)} />
      )}

      <ServiceDetailDrawer service={detail} open={detail !== null} onClose={() => setDetail(null)} />
    </div>
  );
}
