"use client";

/**
 * Serviços — histórico operacional (timeline). Cada serviço reúne cliente,
 * equipamento, operador, tipo, data, documentos e histórico de eventos.
 * Consome o Demo Dataset; preparado para a futura Ordem de Serviço.
 */
import { useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { ExportButton } from "@platform/components/export-button";
import { Pagination } from "@platform/components/pagination";
import { FilterBar, FilterChip } from "@erp/ui/filter-bar";
import { StatusChip, type ChipTone } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { Drawer } from "@erp/ui/drawer";
import { operationsApi, useQuery, type DemoService, type DemoServiceStatus, type DemoOrderType, type ServicesData } from "@erp/api";
import { formatDate } from "@erp/utils";

const STATUS: Record<DemoServiceStatus, { tone: ChipTone; label: string }> = {
  SCHEDULED: { tone: "info", label: "Agendado" },
  IN_PROGRESS: { tone: "primary", label: "Em andamento" },
  DONE: { tone: "success", label: "Concluído" },
};
const TYPE_LABEL: Record<DemoOrderType, string> = {
  PREVENTIVA: "Preventiva",
  CORRETIVA: "Corretiva",
  INSTALACAO: "Instalação",
  PROJETO: "Projeto",
};

export default function ServicosPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | DemoServiceStatus>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [detail, setDetail] = useState<DemoService | null>(null);
  const services = useQuery<ServicesData>((s) => operationsApi.getServices({ signal: s }), []);

  const rows = useMemo(() => {
    let items = services.data?.items ?? [];
    if (status !== "all") items = items.filter((s) => s.status === status);
    const q = search.trim().toLowerCase();
    if (q) items = items.filter((s) => [s.customer, s.equipment, s.operator].join(" ").toLowerCase().includes(q));
    return items;
  }, [services.data, status, search]);
  const paginatedRows = useMemo(() => rows.slice((page - 1) * limit, page * limit), [rows, page, limit]);

  const columns: Column<DemoService>[] = [
    {
      key: "customer", header: "Cliente", sortAccessor: (s) => s.customer,
      cell: (s) => <div className="min-w-0"><div className="font-medium truncate">{s.customer}</div><div className="text-caption truncate">{s.equipment}</div></div>,
    },
    { key: "type", header: "Tipo", className: "w-[130px]", cell: (s) => <span className="text-sm">{TYPE_LABEL[s.type]}</span> },
    { key: "operator", header: "Operador", className: "w-[150px]", cell: (s) => <span className="text-sm">{s.operator}</span> },
    { key: "date", header: "Data", className: "w-[120px]", sortAccessor: (s) => s.date, cell: (s) => <span className="font-mono text-xs">{formatDate(s.date)}</span> },
    { key: "status", header: "Status", className: "w-[140px]", sortAccessor: (s) => s.status, cell: (s) => <StatusChip tone={STATUS[s.status].tone} dot>{STATUS[s.status].label}</StatusChip> },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Operação"
        title="Serviços"
        description="Histórico operacional consolidado (Demo Dataset). Base para a futura Ordem de Serviço."
        actions={
          <ExportButton
            label="Exportar"
            fileName="servicos"
              rows={rows.map((s) => ({ cliente: s.customer, equipamento: s.equipment, tipo: TYPE_LABEL[s.type], operador: s.operator, data: formatDate(s.date), status: STATUS[s.status].label }))}
          />
        }
      />

      <FilterBar search={search} onSearch={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Buscar por cliente, equipamento, operador…">
        <FilterChip active={status === "all"} onClick={() => { setStatus("all"); setPage(1); }}>Todos</FilterChip>
        <FilterChip active={status === "IN_PROGRESS"} onClick={() => { setStatus("IN_PROGRESS"); setPage(1); }}>Em andamento</FilterChip>
        <FilterChip active={status === "SCHEDULED"} onClick={() => { setStatus("SCHEDULED"); setPage(1); }}>Agendados</FilterChip>
        <FilterChip active={status === "DONE"} onClick={() => { setStatus("DONE"); setPage(1); }}>Concluídos</FilterChip>
      </FilterBar>

      {services.loading && !services.data ? (
        <SkeletonList rows={6} />
      ) : services.error && !services.data ? (
        <ErrorState error={services.error} onRetry={services.refetch} />
      ) : services.data?.disabled ? (
        <ComingSoonState title="Serviços em breve" description="Ative o Demo Dataset para visualizar o histórico operacional." />
      ) : rows.length === 0 ? (
        <EmptyState icon={Briefcase} title="Nenhum serviço" description="Ajuste os filtros." />
      ) : (
        <div className="space-y-3">
          <DataTable columns={columns} rows={paginatedRows} onRowClick={(s) => setDetail(s)} />
          <Pagination pagination={pageMeta(page, limit, rows.length)} onPageChange={setPage} onPageSizeChange={(next) => { setLimit(next); setPage(1); }} />
        </div>
      )}

      <Drawer open={detail !== null} onClose={() => setDetail(null)} eyebrow="Serviço" title={detail ? `${detail.customer}` : ""} width="max-w-xl">
        {detail && <ServiceDetail service={detail} />}
      </Drawer>
    </div>
  );
}

function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

function ServiceDetail({ service }: { service: DemoService }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone="primary">{TYPE_LABEL[service.type]}</StatusChip>
        <StatusChip tone={STATUS[service.status].tone} dot>{STATUS[service.status].label}</StatusChip>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2">
        <Row label="Equipamento" value={service.equipment} />
        <Row label="Operador" value={service.operator} />
        <Row label="Data" value={formatDate(service.date)} />
        <Row label="Documentos" value={`${service.documents.length}`} />
      </div>
      <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4 text-sm text-[var(--color-muted-foreground)]">
        O histórico oficial do ativo agora é exibido nas telas de Cliente e Equipamento via Asset Lifecycle.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b last:border-0 border-[var(--color-border)]/60">
      <span className="text-caption">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
