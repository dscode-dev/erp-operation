"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Plus, RefreshCw, Search, Wallet } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DashboardSection } from "@platform/components/dashboard-section";
import { Pagination } from "@platform/components/pagination";
import { MetricCard } from "@erp/ui/metric-card";
import { SkeletonCard } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { Gate } from "@erp/ui/auth/gate";
import {
  financialApi,
  useQuery,
  type FinancialAccount,
  type FinancialCategory,
  type FinancialEntry,
  type FinancialEntryOrigin,
  type FinancialEntryStatus,
  type FinancialEntryType,
  type FinancialStats,
  type Paginated,
} from "@erp/api";
import { formatCurrencyBRL, formatDate } from "@erp/utils";
import {
  FinancialAccountDrawer,
  FinancialCategoryDrawer,
  FinancialEntryDrawer,
} from "@platform/components/financial-drawers";
import { FinancialStatusBadge, FinancialTypeBadge } from "@platform/components/financial-procurement-badges";

const entryTypes: Array<FinancialEntryType | ""> = ["", "RECEIVABLE", "PAYABLE", "TRANSFER"];
const statuses: Array<FinancialEntryStatus | ""> = ["", "PENDING", "PAID", "OVERDUE", "CANCELED"];
const origins: Array<FinancialEntryOrigin | ""> = ["", "MANUAL", "BUDGET", "PURCHASE", "OPERATION", "PMOC", "OTHER"];

export default function FinancialPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<FinancialEntryType | "">("");
  const [status, setStatus] = useState<FinancialEntryStatus | "">("");
  const [origin, setOrigin] = useState<FinancialEntryOrigin | "">("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [entryDrawer, setEntryDrawer] = useState<{ open: boolean; entry: FinancialEntry | null }>({ open: false, entry: null });
  const [accountDrawer, setAccountDrawer] = useState<{ open: boolean; account: FinancialAccount | null }>({ open: false, account: null });
  const [categoryDrawer, setCategoryDrawer] = useState<{ open: boolean; category: FinancialCategory | null }>({ open: false, category: null });

  const stats = useQuery<FinancialStats>((signal) => financialApi.getStats({ signal }), []);
  const accounts = useQuery<Paginated<FinancialAccount>>((signal) => financialApi.listAccounts({ limit: 100, active: true, signal }), []);
  const categories = useQuery<Paginated<FinancialCategory>>((signal) => financialApi.listCategories({ limit: 100, active: true, signal }), []);
  const entries = useQuery<Paginated<FinancialEntry>>(
    (signal) => financialApi.listEntries({
      page,
      limit,
      search,
      type: type || undefined,
      status: status || undefined,
      origin: origin || undefined,
      accountId: accountId || undefined,
      categoryId: categoryId || undefined,
      from: from || undefined,
      to: to || undefined,
      signal,
    }),
    [page, limit, search, type, status, origin, accountId, categoryId, from, to],
  );

  const accountItems = accounts.data?.items ?? [];
  const categoryItems = categories.data?.items ?? [];
  const overdueTotal = useMemo(() => {
    const data = stats.data?.overdue;
    return Number(data?.receivable ?? 0) + Number(data?.payable ?? 0);
  }, [stats.data]);

  const refetchAll = () => {
    stats.refetch();
    accounts.refetch();
    categories.refetch();
    entries.refetch();
  };

  return (
    <Gate
      roles={["OWNER", "MANAGER"]}
      permission="canFinancial"
      fallback={
        <div className="max-w-[1440px]">
          <PageHeader eyebrow="Financeiro" title="Financeiro" description="Acesso restrito pelo backend." />
          <ErrorState error={{ message: "Seu perfil não possui permissão financeira." }} />
        </div>
      }
    >
      <div className="space-y-8 max-w-[1440px]">
        <PageHeader
          eyebrow={<span className="inline-flex items-center gap-1.5"><Wallet className="h-3 w-3" /> Core financeiro</span>}
          title="Financeiro"
          description="Contas, categorias e lançamentos consumindo exclusivamente a API Financial."
          actions={
            <>
              <button className="btn-secondary" onClick={refetchAll}><RefreshCw className="h-4 w-4" /> Atualizar</button>
              <button className="btn-secondary" onClick={() => setAccountDrawer({ open: true, account: null })}>Nova conta</button>
              <button className="btn-secondary" onClick={() => setCategoryDrawer({ open: true, category: null })}>Nova categoria</button>
              <button className="btn-primary" onClick={() => setEntryDrawer({ open: true, entry: null })}><Plus className="h-4 w-4" /> Novo lançamento</button>
            </>
          }
        />

        <DashboardSection title="Dashboard financeiro">
          {stats.loading && !stats.data ? (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : stats.error && !stats.data ? (
            <ErrorState error={stats.error} onRetry={stats.refetch} />
          ) : (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
              <MetricCard label="Saldo atual" value={formatCurrencyBRL(Number(stats.data?.currentBalance ?? 0))} icon="Wallet" />
              <MetricCard label="Receber hoje" value={formatCurrencyBRL(Number(stats.data?.receivableToday ?? 0))} trend="up" icon="TrendingUp" />
              <MetricCard label="Pagar hoje" value={formatCurrencyBRL(Number(stats.data?.payableToday ?? 0))} trend="down" icon="TrendingDown" />
              <MetricCard label="Em atraso" value={formatCurrencyBRL(overdueTotal)} trend={overdueTotal > 0 ? "down" : "flat"} icon="AlertTriangle" />
              <MetricCard label="Receitas" value={formatCurrencyBRL(Number(stats.data?.income ?? 0))} trend="up" icon="ArrowUpCircle" />
              <MetricCard label="Despesas" value={formatCurrencyBRL(Number(stats.data?.expenses ?? 0))} trend="down" icon="ArrowDownCircle" />
            </div>
          )}
        </DashboardSection>

        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardSection title="Contas financeiras">
            <MiniList
              loading={accounts.loading && !accounts.data}
              error={accounts.error}
              empty="Nenhuma conta financeira cadastrada."
              items={accountItems}
              onRetry={accounts.refetch}
              render={(account) => (
                <button key={account.id} onClick={() => setAccountDrawer({ open: true, account })} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-[var(--color-muted)]/50">
                  <span><span className="font-medium">{account.name}</span><span className="text-caption ml-2">{account.type}</span></span>
                  <span className="font-mono text-sm">{formatCurrencyBRL(Number(account.currentBalance))}</span>
                </button>
              )}
            />
          </DashboardSection>
          <DashboardSection title="Categorias">
            <MiniList
              loading={categories.loading && !categories.data}
              error={categories.error}
              empty="Nenhuma categoria cadastrada."
              items={categoryItems}
              onRetry={categories.refetch}
              render={(category) => (
                <button key={category.id} onClick={() => setCategoryDrawer({ open: true, category })} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-[var(--color-muted)]/50">
                  <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color ?? "var(--color-primary)" }} /> <span className="font-medium">{category.name}</span></span>
                  <span className="text-caption">{category.type}</span>
                </button>
              )}
            />
          </DashboardSection>
        </div>

        <DashboardSection title="Lançamentos financeiros">
          <div className="mb-4 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <label className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
              <input className="input pl-9" placeholder="Buscar lançamento" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </label>
            <select className="input" value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1); }}>
              <option value="">Conta</option>{accountItems.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className="input" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
              <option value="">Categoria</option>{categoryItems.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="input" value={type} onChange={(e) => { setType(e.target.value as FinancialEntryType | ""); setPage(1); }}>{entryTypes.map((v) => <option key={v || "all"} value={v}>{v || "Tipo"}</option>)}</select>
            <select className="input" value={status} onChange={(e) => { setStatus(e.target.value as FinancialEntryStatus | ""); setPage(1); }}>{statuses.map((v) => <option key={v || "all"} value={v}>{v || "Status"}</option>)}</select>
            <select className="input" value={origin} onChange={(e) => { setOrigin(e.target.value as FinancialEntryOrigin | ""); setPage(1); }}>{origins.map((v) => <option key={v || "all"} value={v}>{v || "Origem"}</option>)}</select>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
              <input className="input" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
            </div>
          </div>

          {entries.loading && !entries.data ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : entries.error && !entries.data ? (
            <ErrorState error={entries.error} onRetry={entries.refetch} />
          ) : (entries.data?.items.length ?? 0) === 0 ? (
            <EmptyState icon={Wallet} title="Nenhum lançamento" description="Crie o primeiro lançamento financeiro ou ajuste os filtros." />
          ) : (
            <>
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-muted)]/50 text-left text-caption">
                    <tr><th className="p-3">Descrição</th><th>Tipo</th><th>Status</th><th>Conta</th><th>Categoria</th><th>Vencimento</th><th className="p-3 text-right">Valor</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {entries.data?.items.map((entry) => (
                      <tr key={entry.id} className="cursor-pointer hover:bg-[var(--color-muted)]/40" onClick={() => setEntryDrawer({ open: true, entry })}>
                        <td className="p-3 font-medium">{entry.description}</td>
                        <td><FinancialTypeBadge type={entry.type} /></td>
                        <td><FinancialStatusBadge status={entry.status} /></td>
                        <td>{entry.account?.name ?? "—"}</td>
                        <td>{entry.category?.name ?? "—"}</td>
                        <td>{formatDate(entry.dueDate)}</td>
                        <td className="p-3 text-right font-mono">{entry.type === "PAYABLE" ? "-" : "+"}{formatCurrencyBRL(Number(entry.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {entries.data && <div className="mt-4"><Pagination pagination={entries.data.pagination} onPageChange={setPage} onPageSizeChange={(next) => { setLimit(next); setPage(1); }} /></div>}
            </>
          )}
        </DashboardSection>

        <FinancialEntryDrawer open={entryDrawer.open} entry={entryDrawer.entry} accounts={accountItems} categories={categoryItems} onClose={() => setEntryDrawer({ open: false, entry: null })} onSaved={refetchAll} />
        <FinancialAccountDrawer open={accountDrawer.open} account={accountDrawer.account} onClose={() => setAccountDrawer({ open: false, account: null })} onSaved={refetchAll} />
        <FinancialCategoryDrawer open={categoryDrawer.open} category={categoryDrawer.category} onClose={() => setCategoryDrawer({ open: false, category: null })} onSaved={refetchAll} />
      </div>
    </Gate>
  );
}

function MiniList<T>({
  loading,
  error,
  empty,
  items,
  onRetry,
  render,
}: {
  loading: boolean;
  error: unknown;
  empty: string;
  items: T[];
  onRetry: () => void;
  render: (item: T) => ReactNode;
}) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (items.length === 0) return <p className="text-caption">{empty}</p>;
  return <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">{items.slice(0, 6).map(render)}</div>;
}
