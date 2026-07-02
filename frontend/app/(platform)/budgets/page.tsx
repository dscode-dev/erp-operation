"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BadgeCheck, Ban, Download, FileText, History, Plus, ReceiptText, RefreshCw, ShoppingCart, XCircle } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { Pagination } from "@platform/components/pagination";
import { Drawer } from "@erp/ui/drawer";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { EmptyState } from "@erp/ui/empty-state";
import { FilterBar, FilterChip } from "@erp/ui/filter-bar";
import { Gate } from "@erp/ui/auth/gate";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { AssetTimeline } from "@erp/ui/assets/asset-timeline";
import { MetricCard } from "@erp/ui/metric-card";
import { SkeletonCard, SkeletonList } from "@erp/ui/skeletons";
import { ErrorState } from "@erp/ui/states";
import { StatusChip } from "@erp/ui/status-chip";
import {
  ApiClientError,
  budgetsApi,
  customersApi,
  equipmentsApi,
  inventoryApi,
  pricingApi,
  useQuery,
  type Budget,
  type BudgetHistory as BudgetHistoryItem,
  type BudgetItemPayload,
  type BudgetPayload,
  type BudgetStatus,
  type Customer,
  type CustomerDetail,
  type DocumentDownloadResult,
  type EquipmentSummary,
  type Product,
  type ProductPricing,
} from "@erp/api";
import { formatCurrencyBRL, formatDateTime, formatNumber } from "@erp/utils";

type Feedback = { tone: "success" | "danger"; message: string } | null;
type DetailTab = "summary" | "items" | "history" | "approval" | "document" | "timeline";

const STATUS_LABEL: Record<BudgetStatus, string> = {
  DRAFT: "Rascunho",
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  EXPIRED: "Vencido",
  CANCELED: "Cancelado",
};

const STATUS_TONE: Record<BudgetStatus, "neutral" | "warning" | "success" | "danger" | "info"> = {
  DRAFT: "neutral",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  EXPIRED: "danger",
  CANCELED: "neutral",
};

export default function BudgetsPage() {
  const { hasRole } = useAuth();
  const canAccess = hasRole("OWNER", "MANAGER");
  const canWrite = hasRole("OWNER", "MANAGER");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BudgetStatus | "ALL">("ALL");
  const [customerId, setCustomerId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<Budget | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const budgets = useQuery(
    (signal) =>
      canAccess
        ? budgetsApi.listBudgets({
            page,
            limit,
            search,
            status: status === "ALL" ? undefined : status,
            customerId: customerId || undefined,
            equipmentId: equipmentId || undefined,
            from: from || undefined,
            to: to || undefined,
            signal,
          })
        : Promise.resolve(null),
    [canAccess, page, limit, search, status, customerId, equipmentId, from, to],
  );
  const stats = useQuery(
    (signal) =>
      canAccess
        ? budgetsApi.getBudgetStats({
            search,
            status: status === "ALL" ? undefined : status,
            customerId: customerId || undefined,
            equipmentId: equipmentId || undefined,
            from: from || undefined,
            to: to || undefined,
            signal,
          })
        : Promise.resolve(null),
    [canAccess, search, status, customerId, equipmentId, from, to],
  );
  const customers = useQuery((signal) => (canAccess ? customersApi.listCustomers({ limit: 100, signal }) : Promise.resolve(null)), [canAccess]);
  const equipments = useQuery(
    (signal) => (canAccess ? equipmentsApi.listEquipments({ limit: 100, customerId: customerId || undefined, signal }) : Promise.resolve(null)),
    [canAccess, customerId],
  );

  const columns: Column<Budget>[] = [
    { key: "number", header: "Número", className: "w-[110px]", sortAccessor: (b) => b.number, cell: (b) => <span className="font-mono text-xs">ORC-{String(b.number).padStart(6, "0")}</span> },
    { key: "customer", header: "Cliente", cell: (b) => <div><div className="font-medium">{b.customer?.tradeName || b.customer?.name || b.customerId}</div><div className="text-caption">{b.title}</div></div> },
    { key: "equipment", header: "Equipamento", cell: (b) => <span className="text-sm">{b.equipment?.name ?? "—"}</span> },
    { key: "status", header: "Status", className: "w-[130px]", cell: (b) => <BudgetStatusChip status={effectiveStatus(b)} /> },
    { key: "value", header: "Valor", className: "w-[130px]", sortAccessor: (b) => n(b.total), cell: (b) => money(b.total) },
    { key: "expiration", header: "Vencimento", className: "w-[140px]", sortAccessor: (b) => b.expirationDate, cell: (b) => <span className={isExpired(b) ? "text-[var(--color-danger)]" : ""}>{dateOnly(b.expirationDate)}</span> },
    { key: "owner", header: "Responsável", className: "w-[150px]", cell: (b) => <span className="text-sm">{b.creator?.name ?? "—"}</span> },
    { key: "updated", header: "Atualizado", className: "w-[150px]", sortAccessor: (b) => b.updatedAt, cell: (b) => <span className="text-xs">{formatDateTime(b.updatedAt)}</span> },
  ];

  function refresh(message?: string) {
    budgets.refetch();
    stats.refetch();
    if (message) setFeedback({ tone: "success", message });
  }

  if (!canAccess) {
    return <ErrorState error={new ApiClientError({ code: "FORBIDDEN", status: 403, message: "Sem permissão para acessar orçamentos.", details: {} })} />;
  }

  return (
    <div className="space-y-6 max-w-[1440px]">
      <PageHeader
        eyebrow="Comercial"
        title="Central de Orçamentos"
        description="Orçamentos comerciais reais, com snapshots de preço gerados pelo backend."
        actions={
          <Gate roles={["OWNER", "MANAGER"]}>
            <button onClick={() => setCreateOpen(true)} className={primaryBtn}>
              <Plus className="h-4 w-4" /> Novo orçamento
            </button>
          </Gate>
        }
      />

      {feedback && (
        <div className={`rounded-[var(--radius-md)] border px-3 py-2 text-sm ${feedback.tone === "success" ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]" : "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]"}`}>
          {feedback.message}
        </div>
      )}

      {stats.loading && !stats.data ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : stats.error && !stats.data ? (
        <ErrorState error={stats.error} onRetry={stats.refetch} title="Métricas indisponíveis" />
      ) : (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
          <MetricCard label="Total" value={formatNumber(stats.data?.total ?? 0)} icon="ReceiptText" />
          <MetricCard label="Pendentes" value={formatNumber(stats.data?.pending ?? 0)} trend={(stats.data?.pending ?? 0) > 0 ? "up" : "flat"} icon="Clock" />
          <MetricCard label="Aprovados" value={formatNumber(stats.data?.approved ?? 0)} trend="flat" icon="BadgeCheck" />
          <MetricCard label="Rejeitados" value={formatNumber(stats.data?.rejected ?? 0)} trend={(stats.data?.rejected ?? 0) > 0 ? "down" : "flat"} icon="XCircle" />
          <MetricCard label="Valor potencial" value={money(stats.data?.potentialRevenue ?? 0)} icon="WalletCards" />
          <MetricCard label="Ticket médio" value={money(stats.data?.averageTicket ?? 0)} icon="TrendingUp" />
        </div>
      )}

      <FilterBar search={search} onSearch={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Buscar por título, cliente…">
        <FilterChip active={status === "ALL"} onClick={() => { setStatus("ALL"); setPage(1); }}>Todos</FilterChip>
        {(["DRAFT", "PENDING", "APPROVED", "REJECTED", "EXPIRED", "CANCELED"] as BudgetStatus[]).map((s) => (
          <FilterChip key={s} active={status === s} onClick={() => { setStatus(s); setPage(1); }}>{STATUS_LABEL[s]}</FilterChip>
        ))}
        <select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setEquipmentId(""); setPage(1); }} className={selectCls}>
          <option value="">Todos os clientes</option>
          {customers.data?.items.map((customer) => <option key={customer.id} value={customer.id}>{customer.tradeName || customer.name}</option>)}
        </select>
        <select value={equipmentId} onChange={(event) => { setEquipmentId(event.target.value); setPage(1); }} className={selectCls}>
          <option value="">Todos os equipamentos</option>
          {equipments.data?.items.map((equipment) => <option key={equipment.id} value={equipment.id}>{equipment.name}</option>)}
        </select>
        <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className={selectCls} aria-label="Data inicial" />
        <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className={selectCls} aria-label="Data final" />
      </FilterBar>

      {budgets.loading && !budgets.data ? (
        <SkeletonList rows={8} />
      ) : budgets.error && !budgets.data ? (
        <ErrorState error={budgets.error} onRetry={budgets.refetch} />
      ) : (budgets.data?.items ?? []).length === 0 ? (
        <EmptyState icon={ReceiptText} title="Nenhum orçamento" description="Crie o primeiro orçamento usando produtos e preços reais." />
      ) : (
        <div className="space-y-3">
          <DataTable columns={columns} rows={budgets.data?.items ?? []} onRowClick={setSelected} />
          {budgets.data && <Pagination pagination={budgets.data.pagination} onPageChange={setPage} onPageSizeChange={(next) => { setLimit(next); setPage(1); }} />}
        </div>
      )}

      <BudgetDetailDrawer budget={selected} onClose={() => setSelected(null)} canWrite={canWrite} onChanged={(message) => { refresh(message); if (selected) budgetsApi.getBudget(selected.id).then(setSelected).catch(() => setSelected(null)); }} />
      <BudgetCreationDrawer open={createOpen} onClose={() => setCreateOpen(false)} onSaved={(budget) => { setCreateOpen(false); setSelected(budget); refresh("Orçamento criado."); }} />
    </div>
  );
}

function BudgetDetailDrawer({
  budget,
  onClose,
  canWrite,
  onChanged,
}: {
  budget: Budget | null;
  onClose: () => void;
  canWrite: boolean;
  onChanged: (message: string) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("summary");
  const [decisionNote, setDecisionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (budget) {
      setTab("summary");
      setDecisionNote("");
      setError(null);
    }
  }, [budget]);

  async function decide(action: "approve" | "reject" | "cancel") {
    if (!budget) return;
    const confirmation = action === "approve" ? "Aprovar este orçamento?" : action === "reject" ? "Rejeitar este orçamento?" : "Cancelar este orçamento?";
    if (!confirm(confirmation)) return;
    setSaving(true);
    setError(null);
    try {
      if (action === "approve") await budgetsApi.approveBudget(budget.id, { observation: decisionNote || null });
      if (action === "reject") await budgetsApi.rejectBudget(budget.id, { observation: decisionNote || null });
      if (action === "cancel") await budgetsApi.cancelBudget(budget.id);
      onChanged(action === "approve" ? "Orçamento aprovado." : action === "reject" ? "Orçamento rejeitado." : "Orçamento cancelado.");
      setDecisionNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível executar a ação.");
    } finally {
      setSaving(false);
    }
  }

  const final = budget ? isFinal(budget.status) : false;

  return (
    <Drawer open={budget !== null} onClose={onClose} eyebrow="Orçamento" title={budget ? `ORC-${String(budget.number).padStart(6, "0")}` : ""} width="max-w-[1180px]">
      {budget && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <BudgetStatusChip status={effectiveStatus(budget)} />
              <StatusChip tone="info">{money(budget.total)}</StatusChip>
              {budget.operationId && <StatusChip tone="neutral">Operation #{budget.operation?.number ?? budget.operationId}</StatusChip>}
            </div>
            <Gate roles={["OWNER", "MANAGER"]}>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => decide("approve")} disabled={saving || final || isExpired(budget)} className={successBtn}><BadgeCheck className="h-4 w-4" /> Aprovar</button>
                <button onClick={() => decide("reject")} disabled={saving || final} className={secondaryBtn}><XCircle className="h-4 w-4" /> Rejeitar</button>
                <button onClick={() => decide("cancel")} disabled={saving || final} className={dangerBtn}><Ban className="h-4 w-4" /> Cancelar</button>
              </div>
            </Gate>
          </div>

          {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}

          <div className="flex flex-wrap gap-2">
            <TabButton active={tab === "summary"} onClick={() => setTab("summary")}>Resumo</TabButton>
            <TabButton active={tab === "items"} onClick={() => setTab("items")}>Itens</TabButton>
            <TabButton active={tab === "history"} onClick={() => setTab("history")}>Histórico</TabButton>
            <TabButton active={tab === "approval"} onClick={() => setTab("approval")}>Aprovação</TabButton>
            <TabButton active={tab === "document"} onClick={() => setTab("document")}>Documento</TabButton>
            <TabButton active={tab === "timeline"} onClick={() => setTab("timeline")}>Timeline</TabButton>
          </div>

          {tab === "summary" && <BudgetSummary budget={budget} />}
          {tab === "items" && <BudgetItems budget={budget} />}
          {tab === "history" && <BudgetHistory budgetId={budget.id} />}
          {tab === "approval" && (
            <div className="space-y-4">
              <Field label="Observação da decisão">
                <textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} disabled={!canWrite || final} className={`${inputCls} min-h-24 py-2`} />
              </Field>
              <BudgetApprovals budget={budget} />
            </div>
          )}
          {tab === "document" && <BudgetDocumentPanel budget={budget} canWrite={canWrite} onRendered={onChanged} />}
          {tab === "timeline" && (
            budget.equipmentId ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                <p className="mb-3 text-sm text-[var(--color-muted-foreground)]">Eventos de orçamento aparecem na timeline oficial após aprovação ou rejeição.</p>
                <AssetTimeline equipmentId={budget.equipmentId} type={budget.status === "REJECTED" ? "BUDGET_REJECTED" : "BUDGET_APPROVED"} compact />
              </div>
            ) : (
              <EmptyState icon={History} title="Sem equipamento" description="A timeline de Asset Lifecycle exige orçamento vinculado a um equipamento." />
            )
          )}
        </div>
      )}
    </Drawer>
  );
}

function BudgetSummary({ budget }: { budget: Budget }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <InfoCard title="Cliente">
        <Info label="Nome" value={budget.customer?.tradeName || budget.customer?.name || "—"} />
        <Info label="E-mail" value={budget.customer?.email ?? "—"} />
        <Info label="Telefone" value={budget.customer?.phone ?? "—"} />
      </InfoCard>
      <InfoCard title="Orçamento">
        <Info label="Título" value={budget.title} />
        <Info label="Vencimento" value={dateOnly(budget.expirationDate)} />
        <Info label="Responsável" value={budget.creator?.name ?? "—"} />
      </InfoCard>
      <InfoCard title="Totais">
        <Info label="Subtotal" value={money(budget.subtotal)} />
        <Info label="Desconto" value={money(budget.discount)} />
        <Info label="Adicional" value={money(budget.additional)} />
        <Info label="Total" value={money(budget.total)} strong />
      </InfoCard>
      <div className="lg:col-span-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h3 className="text-sm font-semibold">Descrição e observações</h3>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)] whitespace-pre-wrap">{budget.description || budget.observations || "Sem observações."}</p>
      </div>
    </div>
  );
}

function BudgetItems({ budget }: { budget: Budget }) {
  if (budget.items.length === 0) return <EmptyState icon={ShoppingCart} title="Sem itens" description="O backend não retornou itens para este orçamento." />;
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-muted)]/40 text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
          <tr>
            <th className="px-4 py-2 text-left">Item</th>
            <th className="px-4 py-2 text-right">Qtd.</th>
            <th className="px-4 py-2 text-right">Preço snapshot</th>
            <th className="px-4 py-2 text-right">Margem</th>
            <th className="px-4 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {budget.items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3"><div className="font-medium">{item.description}</div><div className="text-caption">{item.product?.sku ?? item.productId}</div></td>
              <td className="px-4 py-3 text-right font-mono">{formatNumber(Number(item.quantity))} {item.unit}</td>
              <td className="px-4 py-3 text-right">{money(item.snapshotSalePrice)}</td>
              <td className="px-4 py-3 text-right">{Number(item.snapshotMargin).toFixed(2)}%</td>
              <td className="px-4 py-3 text-right font-semibold">{money(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BudgetHistory({ budgetId }: { budgetId: string }) {
  const history = useQuery((signal) => budgetsApi.getBudgetHistory(budgetId, { limit: 50, signal }), [budgetId]);
  if (history.loading && !history.data) return <SkeletonList rows={5} />;
  if (history.error && !history.data) return <ErrorState error={history.error} onRetry={history.refetch} />;
  const items = history.data?.items ?? [];
  if (items.length === 0) return <EmptyState icon={History} title="Sem histórico" description="Nenhum evento retornado pelo backend." />;
  return (
    <ol className="space-y-3">
      {items.map((item) => <BudgetHistoryRow key={item.id} item={item} />)}
    </ol>
  );
}

function BudgetHistoryRow({ item }: { item: BudgetHistoryItem }) {
  return (
    <li className="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
      <div className="min-w-0">
        <div className="text-sm font-medium">{historyLabel(item.action)} · {item.actor?.name ?? "Sistema"}</div>
        <div className="text-caption">{item.previousStatus ? `${STATUS_LABEL[item.previousStatus]} → ` : ""}{STATUS_LABEL[item.newStatus]} · {formatDateTime(item.createdAt)}</div>
      </div>
    </li>
  );
}

function BudgetApprovals({ budget }: { budget: Budget }) {
  if (budget.approvals.length === 0) return <EmptyState icon={BadgeCheck} title="Sem decisões" description="Aprovações e rejeições aparecerão aqui." />;
  return (
    <ul className="space-y-2">
      {budget.approvals.map((approval) => (
        <li key={approval.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <div className="flex items-center justify-between gap-2">
            <BudgetStatusChip status={approval.status} />
            <span className="text-caption">{formatDateTime(approval.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm">{approval.observation || "Sem observação."}</p>
          <p className="text-caption">Por {approval.actor?.name ?? approval.actorId}</p>
        </li>
      ))}
    </ul>
  );
}

function BudgetDocumentPanel({
  budget,
  canWrite,
  onRendered,
}: {
  budget: Budget;
  canWrite: boolean;
  onRendered: (message: string) => void;
}) {
  const [documentId, setDocumentId] = useState<string | null>(budget.document?.id ?? null);
  const [loading, setLoading] = useState<"render" | "download" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const blocked = budget.status === "CANCELED" || budget.status === "REJECTED";

  useEffect(() => {
    setDocumentId(budget.document?.id ?? null);
    setError(null);
  }, [budget.id, budget.document?.id]);

  async function renderOfficialDocument() {
    if (blocked) return;
    setLoading("render");
    setError(null);
    try {
      const result = await budgetsApi.renderBudget(budget.id);
      setDocumentId(result.documentId);
      onRendered("Documento oficial do orçamento emitido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível emitir o documento.");
    } finally {
      setLoading(null);
    }
  }

  async function downloadOfficialDocument() {
    setLoading("download");
    setError(null);
    try {
      const file = await budgetsApi.downloadBudget(budget.id);
      downloadDocumentFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível baixar o PDF.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div>
          <p className="text-sm font-semibold">Documento oficial do orçamento</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            A emissão usa exclusivamente o Document Engine e preserva snapshots comerciais do orçamento.
          </p>
          {budget.document?.renderedAt && (
            <p className="mt-1 text-caption">Última emissão: {formatDateTime(budget.document.renderedAt)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={renderOfficialDocument} disabled={!canWrite || blocked || loading !== null} className={primaryBtn}>
            <RefreshCw className={`h-4 w-4 ${loading === "render" ? "animate-spin" : ""}`} /> Emitir Documento
          </button>
          <button onClick={downloadOfficialDocument} disabled={!documentId || loading !== null} className={secondaryBtn}>
            <Download className="h-4 w-4" /> Baixar PDF
          </button>
        </div>
      </div>

      {blocked && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2 text-sm text-[var(--color-warning)]">
          Orçamentos cancelados ou rejeitados não podem emitir documento oficial.
        </div>
      )}
      {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}

      {documentId ? (
        <DocumentViewer source={{ documentId }} title={`ORC-${String(budget.number).padStart(6, "0")}`} canRender={canWrite && !blocked} canDownload />
      ) : (
        <EmptyState icon={FileText} title="Documento ainda não emitido" description="Clique em Emitir Documento para gerar o PDF oficial vinculado ao orçamento." />
      )}
    </div>
  );
}

function BudgetCreationDrawer({
  open,
  onClose,
  onSaved,
  operationId,
  initialCustomerId,
  initialEquipmentId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (budget: Budget) => void;
  operationId?: string | null;
  initialCustomerId?: string | null;
  initialEquipmentId?: string | null;
}) {
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [equipmentId, setEquipmentId] = useState(initialEquipmentId ?? "");
  const [title, setTitle] = useState("Orçamento de manutenção");
  const [expirationDate, setExpirationDate] = useState(nextDate(15));
  const [observations, setObservations] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<BudgetItemPayload[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customers = useQuery((signal) => (open ? customersApi.listCustomers({ limit: 100, signal }) : Promise.resolve(null)), [open]);
  const customer = useQuery<CustomerDetail | null>((signal) => (open && customerId ? customersApi.getCustomer(customerId, { signal }) : Promise.resolve(null)), [open, customerId]);
  const equipments = useQuery((signal) => (open && customerId ? equipmentsApi.listEquipments({ limit: 100, customerId, signal }) : Promise.resolve(null)), [open, customerId]);
  const products = useQuery((signal) => (open ? inventoryApi.listProducts({ limit: 100, active: true, signal }) : Promise.resolve(null)), [open]);
  const pricing = useQuery((signal) => (open ? pricingApi.listPricing({ limit: 100, active: true, signal }) : Promise.resolve(null)), [open]);

  useEffect(() => {
    if (!open) return;
    setCustomerId(initialCustomerId ?? "");
    setEquipmentId(initialEquipmentId ?? "");
    setTitle("Orçamento de manutenção");
    setExpirationDate(nextDate(15));
    setObservations("");
    setItems([]);
    setProductId("");
    setQuantity("1");
    setDescription("");
    setError(null);
  }, [open, initialCustomerId, initialEquipmentId]);

  useEffect(() => {
    if (!productId && products.data?.items[0]) setProductId(products.data.items[0].id);
  }, [productId, products.data]);

  const pricingByProduct = useMemo(() => {
    const map = new Map<string, ProductPricing>();
    for (const row of pricing.data?.items ?? []) map.set(row.productId, row);
    return map;
  }, [pricing.data]);
  const selectedProduct = products.data?.items.find((product) => product.id === productId) ?? null;
  const selectedPricing = productId ? pricingByProduct.get(productId) ?? null : null;

  function addItem() {
    if (!productId || Number(quantity) <= 0) return;
    setItems((current) => [...current, { productId, quantity: Number(quantity), description: description || undefined }]);
    setQuantity("1");
    setDescription("");
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const payload: BudgetPayload = {
        operationId: operationId ?? undefined,
        customerId,
        customerAddressId: customer.data?.addresses?.[0]?.id ?? undefined,
        equipmentId: equipmentId || undefined,
        title,
        expirationDate: new Date(expirationDate).toISOString(),
        observations: observations || undefined,
        status: "PENDING",
        items,
      };
      const budget = await budgetsApi.createBudget(payload);
      onSaved(budget);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o orçamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Orçamento"
      title="Novo orçamento"
      width="max-w-3xl"
      footer={
        <>
          <button onClick={onClose} className={secondaryBtn}>Cancelar</button>
          <button onClick={submit} disabled={saving || !customerId || !title || items.length === 0} className={primaryBtn}>{saving ? "Salvando…" : "Salvar orçamento"}</button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente">
            <select value={customerId} onChange={(event) => { setCustomerId(event.target.value); setEquipmentId(""); }} className={inputCls}>
              <option value="">Selecione</option>
              {customers.data?.items.map((customerRow: Customer) => <option key={customerRow.id} value={customerRow.id}>{customerRow.tradeName || customerRow.name}</option>)}
            </select>
          </Field>
          <Field label="Equipamento">
            <select value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)} className={inputCls}>
              <option value="">Opcional</option>
              {equipments.data?.items.map((equipment: EquipmentSummary) => <option key={equipment.id} value={equipment.id}>{equipment.name}</option>)}
            </select>
          </Field>
          <Field label="Título">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputCls} />
          </Field>
          <Field label="Vencimento">
            <input type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h3 className="text-sm font-semibold">Produtos e Pricing</h3>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">O frontend envia produto e quantidade. Totais e snapshots são calculados exclusivamente pelo backend.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
            <Field label="Produto">
              <select value={productId} onChange={(event) => setProductId(event.target.value)} className={inputCls}>
                {(products.data?.items ?? []).map((product: Product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
              </select>
            </Field>
            <Field label="Quantidade">
              <input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Descrição opcional">
            <input value={description} onChange={(event) => setDescription(event.target.value)} className={inputCls} placeholder={selectedProduct?.name ?? ""} />
          </Field>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-[var(--color-muted-foreground)]">
              Pricing vigente: {selectedPricing ? `${money(selectedPricing.salePrice)} · margem ${Number(selectedPricing.marginPercentage).toFixed(2)}%` : "não carregado ou inexistente"}
            </span>
            <button onClick={addItem} disabled={!productId || !quantity} className={secondaryBtn}><Plus className="h-4 w-4" /> Adicionar item</button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Resumo antes de salvar</h3>
          {items.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Sem itens" description="Adicione pelo menos um produto." />
          ) : (
            <ul className="space-y-2">
              {items.map((item, index) => {
                const product = products.data?.items.find((row) => row.id === item.productId);
                return (
                  <li key={`${item.productId}-${index}`} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                    <span><span className="block text-sm font-medium">{item.description || product?.name || item.productId}</span><span className="text-caption">{product?.sku ?? "produto"}</span></span>
                    <span className="font-mono text-sm">{formatNumber(item.quantity)}</span>
                    <button onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="text-xs text-[var(--color-danger)] hover:underline">remover</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <Field label="Observações">
          <textarea value={observations} onChange={(event) => setObservations(event.target.value)} className={`${inputCls} min-h-24 py-2`} />
        </Field>
      </div>
    </Drawer>
  );
}

function BudgetStatusChip({ status }: { status: BudgetStatus }) {
  return <StatusChip tone={STATUS_TONE[status]} dot>{STATUS_LABEL[status]}</StatusChip>;
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"><h3 className="text-sm font-semibold">{title}</h3><div className="mt-3 space-y-2">{children}</div></div>;
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-3 text-sm"><span className="text-[var(--color-muted-foreground)]">{label}</span><span className={strong ? "font-semibold" : "font-medium"}>{value}</span></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button onClick={onClick} className={`rounded-full border px-3 h-8 text-xs transition ${active ? "border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"}`}>{children}</button>;
}

function effectiveStatus(budget: Budget): BudgetStatus {
  return isExpired(budget) ? "EXPIRED" : budget.status;
}

function isExpired(budget: Budget): boolean {
  return ["DRAFT", "PENDING"].includes(budget.status) && new Date(budget.expirationDate).getTime() < Date.now();
}

function isFinal(status: BudgetStatus): boolean {
  return ["APPROVED", "REJECTED", "EXPIRED", "CANCELED"].includes(status);
}

function historyLabel(action: string): string {
  return action.toLowerCase().replaceAll("_", " ");
}

function n(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: string | number): string {
  return formatCurrencyBRL(n(value));
}

function downloadDocumentFile(file: DocumentDownloadResult) {
  const binary = atob(file.contentBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: file.mimeType ?? "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${file.number}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function dateOnly(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

function nextDate(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

const inputCls = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]";
const selectCls = "h-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 text-sm outline-none focus:border-[var(--color-primary)]";
const primaryBtn = "inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] disabled:opacity-50";
const secondaryBtn = "inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)] disabled:opacity-50";
const successBtn = "inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)] px-3 h-9 text-sm font-medium disabled:opacity-50";
const dangerBtn = "inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)] px-3 h-9 text-sm font-medium disabled:opacity-50";
