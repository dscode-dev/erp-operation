"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Wrench } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { Pagination } from "@platform/components/pagination";
import { MetricCard } from "@erp/ui/metric-card";
import { ExportButton } from "@platform/components/export-button";
import { StatusPill } from "@erp/ui/status-pill";
import { SkeletonList, SkeletonCard } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { Gate } from "@erp/ui/auth/gate";
import { EquipmentDetailDrawer } from "@platform/components/equipment-detail-drawer";
import { EquipmentFormDrawer } from "@platform/components/equipment-form-drawer";
import { customersApi, equipmentsApi, useQuery, type EquipmentSummary, type EquipmentStatus, type EquipmentType } from "@erp/api";
import { useDebounce } from "@erp/utils";
import { cn } from "@erp/utils";
import {
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABEL,
  EQUIPMENT_STATUS_PILL,
  EQUIPMENT_TYPE_LABEL,
} from "@platform/equipment-display";

function EquipamentosInner() {
  const router = useRouter();
  const params = useSearchParams();
  const customerIdFromUrl = params.get("customerId") ?? "";

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EquipmentStatus | "">("");
  const [type] = useState<EquipmentType | "">("");
  const [customerId, setCustomerId] = useState(customerIdFromUrl);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const debounced = useDebounce(search, 300);

  useEffect(() => {
    setCustomerId(customerIdFromUrl);
    setPage(1);
  }, [customerIdFromUrl]);

  const list = useQuery(
    (signal) =>
      equipmentsApi.listEquipments({
        page,
        limit,
        search: debounced || undefined,
        status: status || undefined,
        type: type || undefined,
        customerId: customerId || undefined,
        signal,
      }),
    [page, limit, debounced, status, type, customerId],
  );
  const stats = useQuery((signal) => equipmentsApi.getEquipmentStats({ signal }), []);
  const customers = useQuery((signal) => customersApi.listCustomers({ page: 1, limit: 100, signal }), []);

  const columns = useMemo<Column<EquipmentSummary>[]>(
    () => [
      { key: "tag", header: "Tag", className: "w-[120px]", cell: (e) => <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{e.tag ?? "—"}</span> },
      {
        key: "name",
        header: "Equipamento",
        cell: (e) => (
          <div className="min-w-0">
            <div className="font-medium truncate">{e.name}</div>
            <div className="text-caption truncate">{[e.manufacturer, e.model].filter(Boolean).join(" · ") || EQUIPMENT_TYPE_LABEL[e.type]}</div>
          </div>
        ),
      },
      { key: "customer", header: "Cliente", className: "w-[200px]", cell: (e) => <span className="text-sm truncate">{e.customer?.name ?? "—"}</span> },
      { key: "type", header: "Tipo", className: "w-[150px]", cell: (e) => <span className="text-sm">{EQUIPMENT_TYPE_LABEL[e.type]}</span> },
      { key: "status", header: "Status", className: "w-[150px]", cell: (e) => <StatusPill status={EQUIPMENT_STATUS_PILL[e.status]} label={EQUIPMENT_STATUS_LABEL[e.status]} /> },
    ],
    [],
  );

  const s = stats.data;

  function changeCustomer(nextCustomerId: string) {
    setCustomerId(nextCustomerId);
    setPage(1);
    const query = new URLSearchParams(params.toString());
    if (nextCustomerId) query.set("customerId", nextCustomerId);
    else query.delete("customerId");
    const qs = query.toString();
    router.replace(qs ? `/equipamentos?${qs}` : "/equipamentos", { scroll: false });
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Ativos"
        title="Equipamentos"
        description="Inventário operacional consumido da API."
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              label="Exportar"
              fileName="equipamentos"
              onPdf={() =>
                equipmentsApi.exportEquipmentsPdf({
                  search: debounced || undefined,
                  status: status || undefined,
                  type: type || undefined,
                  customerId: customerId || undefined,
                })
              }
              rows={(list.data?.items ?? []).map((e) => ({
                tag: e.tag ?? "",
                nome: e.name,
                tipo: EQUIPMENT_TYPE_LABEL[e.type],
                cliente: e.customer?.name ?? "",
                status: EQUIPMENT_STATUS_LABEL[e.status],
              }))}
            />
            <Gate roles={["OWNER", "MANAGER"]}>
              <button
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]"
              >
                <Plus className="h-4 w-4" /> Novo equipamento
              </button>
            </Gate>
          </div>
        }
      />

      {/* Stats */}
      {stats.loading && !s ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : s ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Total" value={String(s.total)} icon="Boxes" />
          <MetricCard label="Ativos" value={String(s.active)} trend="flat" icon="CheckCircle2" />
          <MetricCard label="Em manutenção" value={String(s.maintenance)} trend={s.maintenance ? "up" : "flat"} icon="Wrench" />
          <MetricCard label="Inativos" value={String(s.inactive)} icon="PowerOff" />
          <MetricCard label="Baixados" value={String(s.retired)} icon="Archive" />
        </div>
      ) : null}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 h-9 w-full max-w-[360px]">
          <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por nome, tag, série, modelo…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--color-muted-foreground)]"
          />
        </div>
        <select
          value={customerId}
          onChange={(e) => changeCustomer(e.target.value)}
          className="h-9 w-full sm:w-[260px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
          aria-label="Filtrar por cliente"
          disabled={customers.loading && !customers.data}
        >
          <option value="">Todos os clientes</option>
          {(customers.data?.items ?? []).map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.tradeName || customer.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1 overflow-x-auto">
          <FilterChip active={status === ""} onClick={() => { setStatus(""); setPage(1); }}>Todos</FilterChip>
          {EQUIPMENT_STATUSES.map((st) => (
            <FilterChip key={st} active={status === st} onClick={() => { setStatus(st); setPage(1); }}>
              {EQUIPMENT_STATUS_LABEL[st]}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* List */}
      {list.loading && !list.data ? (
        <SkeletonList rows={6} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.data && list.data.items.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={debounced || status ? "Nenhum equipamento encontrado" : "Nenhum equipamento cadastrado"}
          description={debounced || status ? "Ajuste os filtros e tente novamente." : "Cadastre equipamentos para acompanhar o inventário."}
        />
      ) : list.data ? (
        <div className="space-y-3">
          <DataTable columns={columns} rows={list.data.items} onRowClick={(e) => setDetailId(e.id)} />
          <Pagination
            pagination={list.data.pagination}
            onPageChange={setPage}
            onPageSizeChange={(next) => { setLimit(next); setPage(1); }}
          />
        </div>
      ) : null}

      <EquipmentDetailDrawer equipmentId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} />
      <EquipmentFormDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => { list.refetch(); stats.refetch(); }}
        presetCustomerId={customerId || undefined}
      />
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-xs whitespace-nowrap transition-colors",
        active
          ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
          : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]",
      )}
    >
      {children}
    </button>
  );
}

export default function EquipamentosPage() {
  return (
    <Suspense fallback={null}>
      <EquipamentosInner />
    </Suspense>
  );
}
