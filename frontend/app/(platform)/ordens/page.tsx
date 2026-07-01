"use client";

import { useMemo, useState } from "react";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { ExportButton } from "@platform/components/export-button";
import { Pagination } from "@platform/components/pagination";
import { FilterBar, FilterChip } from "@erp/ui/filter-bar";
import { StatusPill, type Status } from "@erp/ui/status-pill";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { Drawer } from "@erp/ui/drawer";
import { operationsApi, useQuery, type DemoOrder, type DemoOrderStatus, type OrdersData } from "@erp/api";
import { formatCurrencyBRL, formatDateTime } from "@erp/utils";

const STATUS_PILL: Record<DemoOrderStatus, Status> = {
  OVERDUE: "danger",
  IN_PROGRESS: "in_progress",
  SCHEDULED: "scheduled",
  DONE: "success",
};
const STATUS_LABEL: Record<DemoOrderStatus, string> = {
  OVERDUE: "Atrasada",
  IN_PROGRESS: "Em execução",
  SCHEDULED: "Agendada",
  DONE: "Concluída",
};
const TYPE_LABEL: Record<DemoOrder["type"], string> = {
  PREVENTIVA: "Preventiva",
  CORRETIVA: "Corretiva",
  INSTALACAO: "Instalação",
  PROJETO: "Projeto",
};

const FILTERS: Array<{ key: "all" | DemoOrderStatus; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "IN_PROGRESS", label: "Em execução" },
  { key: "SCHEDULED", label: "Agendadas" },
  { key: "OVERDUE", label: "Atrasadas" },
  { key: "DONE", label: "Concluídas" },
];

export default function OrdensPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | DemoOrderStatus>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [detail, setDetail] = useState<DemoOrder | null>(null);
  const orders = useQuery<OrdersData>((signal) => operationsApi.getOrders({ signal }), []);

  const rows = useMemo(() => {
    let items = orders.data?.items ?? [];
    if (filter !== "all") items = items.filter((o) => o.status === filter);
    const q = search.trim().toLowerCase();
    if (q) items = items.filter((o) => [o.number, o.title, o.customer, o.operator].join(" ").toLowerCase().includes(q));
    return items;
  }, [orders.data, filter, search]);
  const paginatedRows = useMemo(() => rows.slice((page - 1) * limit, page * limit), [rows, page, limit]);

  const columns: Column<DemoOrder>[] = [
    { key: "number", header: "OS", className: "w-[110px]", sortAccessor: (o) => o.number, cell: (o) => <span className="font-mono text-xs">{o.number}</span> },
    {
      key: "title", header: "Serviço", sortAccessor: (o) => o.title,
      cell: (o) => <div className="min-w-0"><div className="font-medium truncate">{o.title}</div><div className="text-caption truncate">{o.customer}</div></div>,
    },
    { key: "type", header: "Tipo", className: "w-[130px]", cell: (o) => <span className="text-sm">{TYPE_LABEL[o.type]}</span> },
    { key: "value", header: "Valor", className: "w-[120px]", sortAccessor: (o) => o.value, cell: (o) => <span className="font-mono text-sm tabular-nums">{formatCurrencyBRL(o.value)}</span> },
    { key: "status", header: "Status", className: "w-[140px]", sortAccessor: (o) => o.status, cell: (o) => <StatusPill status={STATUS_PILL[o.status]} label={STATUS_LABEL[o.status]} /> },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Operação"
        title="Ordens de Serviço"
        description="Acompanhamento das OS (Demo Dataset — domínio de OS é escopo futuro)."
        actions={
          <ExportButton
            label="Exportar"
            fileName="ordens-servico"
            rows={rows.map((o) => ({ os: o.number, servico: o.title, cliente: o.customer, tipo: TYPE_LABEL[o.type], valor: o.value, status: STATUS_LABEL[o.status] }))}
          />
        }
      />

      <FilterBar search={search} onSearch={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Buscar por OS, serviço, cliente…">
        {FILTERS.map((f) => (
          <FilterChip key={f.key} active={filter === f.key} onClick={() => { setFilter(f.key); setPage(1); }}>{f.label}</FilterChip>
        ))}
      </FilterBar>

      {orders.loading && !orders.data ? (
        <SkeletonList rows={6} />
      ) : orders.error && !orders.data ? (
        <ErrorState error={orders.error} onRetry={orders.refetch} />
      ) : orders.data?.disabled ? (
        <ComingSoonState title="Ordens em breve" description="Ative o Demo Dataset para visualizar as ordens de serviço." />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhuma OS" description="Ajuste os filtros." />
      ) : (
        <div className="space-y-3">
          <DataTable columns={columns} rows={paginatedRows} onRowClick={(o) => setDetail(o)} />
          <Pagination pagination={pageMeta(page, limit, rows.length)} onPageChange={setPage} onPageSizeChange={(next) => { setLimit(next); setPage(1); }} />
        </div>
      )}

      <Drawer open={detail !== null} onClose={() => setDetail(null)} eyebrow="Ordem de Serviço" title={detail ? `${detail.number} · ${detail.title}` : ""} width="max-w-2xl">
        {detail && <OrderDetail order={detail} />}
      </Drawer>
    </div>
  );
}

function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

function OrderDetail({ order }: { order: DemoOrder }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone="primary">{TYPE_LABEL[order.type]}</StatusChip>
        <StatusPill status={STATUS_PILL[order.status]} label={STATUS_LABEL[order.status]} />
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2">
        <Row label="Cliente" value={order.customer} />
        <Row label="Operador" value={order.operator} />
        <Row label="Agendada para" value={formatDateTime(order.scheduledFor)} />
        <Row label="Valor" value={formatCurrencyBRL(order.value)} />
      </div>
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2">Documento</h3>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4 text-sm text-[var(--color-muted-foreground)]">
          OS legadas do Demo Dataset não possuem preview local. Documentos oficiais ficam em /documentos após criação de Operation real.
        </div>
      </div>
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
