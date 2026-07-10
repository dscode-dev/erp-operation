"use client";

/**
 * Operações — domínio operacional central. Cada item é uma Operation (atendimento
 * em campo) que origina a Ordem de Serviço e os demais documentos. Substitui
 * gradualmente a visão de Serviços. Consome a API real `/operations`.
 */
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { Pagination } from "@platform/components/pagination";
import { ExportButton } from "@platform/components/export-button";
import { FilterBar, FilterChip } from "@erp/ui/filter-bar";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { OperationDetailDrawer } from "@platform/components/operation-detail-drawer";
import { OperationCreationDrawer } from "@platform/components/operation-creation-drawer";
import { Gate } from "@erp/ui/auth/gate";
import { OPERATION_STATUS, OPERATION_TYPE_LABEL, operationCode } from "@erp/ui/operations/operation-shared";
import { operationApi, useQuery, type OperationSummary, type OperationStatus } from "@erp/api";
import { useDebounce, formatDate } from "@erp/utils";

const STATUS_FILTERS: Array<{ key: "all" | OperationStatus; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "IN_PROGRESS", label: "Em andamento" },
  { key: "COMPLETED", label: "Concluídas" },
  { key: "DRAFT", label: "Rascunho" },
  { key: "CANCELED", label: "Canceladas" },
];

function OperacoesInner() {
  const params = useSearchParams();
  const customerId = params.get("customerId") ?? undefined;
  const equipmentId = params.get("equipmentId") ?? undefined;
  const initialStatus = parseStatus(params.get("status"));

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | OperationStatus>(initialStatus);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const debounced = useDebounce(search, 300);

  const list = useQuery(
    (signal) =>
      operationApi.listOperations({
        page,
        limit,
        search: debounced || undefined,
        status: status === "all" ? undefined : status,
        customerId,
        equipmentId,
        signal,
      }),
    [page, limit, debounced, status, customerId, equipmentId],
  );

  const columns = useMemo<Column<OperationSummary>[]>(
    () => [
      { key: "number", header: "Número", className: "w-[120px]", cell: (o) => <span className="font-mono text-xs">{operationCode(o.number)}</span> },
      {
        key: "customer", header: "Cliente",
        cell: (o) => <div className="min-w-0"><div className="font-medium truncate">{o.customer?.name ?? "—"}</div><div className="text-caption truncate">{o.equipment?.name ?? "Sem equipamento"}</div></div>,
      },
      { key: "operator", header: "Operador", className: "w-[150px]", cell: (o) => <span className="text-sm truncate">{o.operator?.name ?? "—"}</span> },
      { key: "type", header: "Tipo", className: "w-[140px]", cell: (o) => <span className="text-sm">{OPERATION_TYPE_LABEL[o.type]}</span> },
      { key: "date", header: "Data", className: "w-[120px]", cell: (o) => <span className="font-mono text-xs">{formatDate(o.completedAt ?? o.createdAt)}</span> },
      { key: "status", header: "Status", className: "w-[150px]", cell: (o) => <StatusChip tone={OPERATION_STATUS[o.status].tone} dot>{OPERATION_STATUS[o.status].label}</StatusChip> },
    ],
    [],
  );

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Operação"
        title="Operações"
        description="Domínio operacional central. Cada operação origina a Ordem de Serviço e os documentos relacionados."
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              label="Exportar"
              fileName="operacoes"
              onPdf={() =>
                operationApi.exportOperationsPdf({
                  search: debounced || undefined,
                  status: status === "all" ? undefined : status,
                  customerId,
                  equipmentId,
                })
              }
              rows={(list.data?.items ?? []).map((o) => ({
                numero: operationCode(o.number),
                cliente: o.customer?.name ?? "",
                equipamento: o.equipment?.name ?? "",
                operador: o.operator?.name ?? "",
                tipo: OPERATION_TYPE_LABEL[o.type],
                data: formatDate(o.completedAt ?? o.createdAt),
                status: OPERATION_STATUS[o.status].label,
              }))}
            />
            <Gate roles={["OWNER", "MANAGER", "OPERATOR"]}>
              <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium">
                <Plus className="h-4 w-4" /> Nova operação
              </button>
            </Gate>
          </div>
        }
      />

      <FilterBar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="Buscar por cliente, equipamento, operador…">
        {STATUS_FILTERS.map((f) => (
          <FilterChip key={f.key} active={status === f.key} onClick={() => { setStatus(f.key); setPage(1); }}>{f.label}</FilterChip>
        ))}
      </FilterBar>

      {list.loading && !list.data ? (
        <SkeletonList rows={6} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.data && list.data.items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhuma operação" description={debounced || status !== "all" ? "Ajuste os filtros." : "As operações criadas pelos operadores aparecerão aqui."} />
      ) : list.data ? (
        <div className="space-y-3">
          <DataTable columns={columns} rows={list.data.items} onRowClick={(o) => setDetailId(o.id)} />
          <Pagination
            pagination={list.data.pagination}
            onPageChange={setPage}
            onPageSizeChange={(next) => { setLimit(next); setPage(1); }}
          />
        </div>
      ) : null}

      <OperationDetailDrawer operationId={detailId} open={detailId !== null} onClose={() => setDetailId(null)} />
      <OperationCreationDrawer open={createOpen} mode="operation" onClose={() => setCreateOpen(false)} onCreated={(op) => { setDetailId(op.id); list.refetch(); }} />
    </div>
  );
}

export default function OperacoesPage() {
  return (
    <Suspense fallback={null}>
      <OperacoesInner />
    </Suspense>
  );
}

function parseStatus(value: string | null): "all" | OperationStatus {
  return value === "DRAFT" || value === "IN_PROGRESS" || value === "COMPLETED" || value === "CANCELED" ? value : "all";
}
