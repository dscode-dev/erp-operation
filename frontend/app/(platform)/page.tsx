"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Wrench,
} from "lucide-react";
import { DashboardSection } from "@platform/components/dashboard-section";
import { GreetingHeader } from "@platform/components/greeting-header";
import { MetricCard } from "@erp/ui/metric-card";
import { SkeletonCard } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { Gate } from "@erp/ui/auth/gate";
import { useAuth } from "@erp/ui/auth/auth-provider";
import {
  assetLifecycleApi,
  assignmentsApi,
  financialApi,
  inventoryApi,
  maintenanceApi,
  operationApi,
  pmocApi,
  procurementApi,
  useQuery,
  type AssetLifecycleEvent,
  type Assignment,
  type AssignmentStatus,
  type FinancialStats,
  type InventoryStats,
  type MaintenancePlan,
  type MaintenanceStats,
  type OperationStats,
  type Paginated,
  type PmocPlan,
  type PmocStats,
  type PurchaseOrder,
  type PurchaseOrderStats,
  type StockMovement,
} from "@erp/api";
import { firstName, formatCurrencyBRL, formatDate, formatDateTime, formatNumber } from "@erp/utils";
import { PurchaseStatusBadge } from "@platform/components/financial-procurement-badges";

type RangeKey = "today" | "7d" | "30d" | "month";
type AttentionSeverity = "critical" | "warning";
type AttentionItem = {
  id: string;
  severity: AttentionSeverity;
  domain: string;
  title: string;
  context: string;
  date?: string | null;
  href: string;
};

const assignmentStatuses: AssignmentStatus[] = ["ASSIGNED", "ACCEPTED", "STARTED", "COMPLETED", "REJECTED"];

export default function PlatformHome() {
  const { session, can, hasRole } = useAuth();
  const [range, setRange] = useStateRange();
  const canSeeFinancial = hasRole("OWNER", "MANAGER") && can("canFinancial");
  const canSeeManagement = hasRole("OWNER", "MANAGER");
  const rangeBounds = getRangeBounds(range);

  const assignments = useQuery<Paginated<Assignment>>((signal) => assignmentsApi.listAssignments({ limit: 50, signal }), []);
  const assigned = useQuery<Paginated<Assignment>>((signal) => assignmentsApi.listAssignments({ status: "ASSIGNED", limit: 1, signal }), []);
  const accepted = useQuery<Paginated<Assignment>>((signal) => assignmentsApi.listAssignments({ status: "ACCEPTED", limit: 1, signal }), []);
  const started = useQuery<Paginated<Assignment>>((signal) => assignmentsApi.listAssignments({ status: "STARTED", limit: 1, signal }), []);
  const completed = useQuery<Paginated<Assignment>>((signal) => assignmentsApi.listAssignments({ status: "COMPLETED", limit: 1, signal }), []);
  const rejected = useQuery<Paginated<Assignment>>((signal) => assignmentsApi.listAssignments({ status: "REJECTED", limit: 1, signal }), []);
  const operationStats = useQuery<OperationStats>((signal) => operationApi.getOperationStats({ signal }), []);
  const lifecycle = useQuery((signal) => assetLifecycleApi.listLifecycle({ limit: 8, from: rangeBounds.from, to: rangeBounds.to, signal }), [range]);
  const inventory = useQuery<InventoryStats>((signal) => inventoryApi.getInventoryStats({ signal }), []);
  const movements = useQuery<Paginated<StockMovement>>((signal) => inventoryApi.listStockMovements({ limit: 5, signal }), []);
  const maintenanceStats = useQuery<MaintenanceStats>((signal) => maintenanceApi.getMaintenanceStats({ signal }), []);
  const maintenancePlans = useQuery<Paginated<MaintenancePlan>>((signal) => maintenanceApi.listMaintenancePlans({ active: true, limit: 5, signal }), []);
  const pmocStats = useQuery<PmocStats>((signal) => pmocApi.getPmocStats({ signal }), []);
  const pmocPlans = useQuery<Paginated<PmocPlan>>((signal) => pmocApi.listPmoc({ active: true, limit: 5, signal }), []);
  const financial = useQuery<FinancialStats | null>((signal) => (canSeeFinancial ? financialApi.getStats({ signal }) : Promise.resolve(null)), [canSeeFinancial]);
  const procurement = useQuery<PurchaseOrderStats | null>((signal) => (canSeeManagement ? procurementApi.getPurchaseOrderStats({ signal }) : Promise.resolve(null)), [canSeeManagement]);
  const awaitingPurchases = useQuery<Paginated<PurchaseOrder> | null>((signal) => (canSeeManagement ? procurementApi.listPurchaseOrders({ status: "SENT", limit: 5, signal }) : Promise.resolve(null)), [canSeeManagement]);

  const assignmentItems = assignments.data?.items ?? [];
  const todayAssignments = assignmentItems.filter(isScheduledToday);
  const overdueAssignments = assignmentItems.filter(isAssignmentOverdue);
  const inProgress = started.data?.pagination.total ?? 0;
  const awaitingAcceptance = assigned.data?.pagination.total ?? 0;
  const attention = buildAttentionItems({
    overdueAssignments,
    awaitingToday: todayAssignments.filter((item) => item.status === "ASSIGNED"),
    financial: financial.data,
    inventory: inventory.data,
    procurement: procurement.data,
    maintenance: maintenanceStats.data,
    pmoc: pmocStats.data,
  });

  return (
    <div className="space-y-8 max-w-[1500px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <GreetingHeader name={firstName(session?.user.name ?? "Equipe")} pending={attention.length} />
        <div className="flex flex-wrap items-center gap-2">
          {(["today", "7d", "30d", "month"] as RangeKey[]).map((key) => (
            <button key={key} type="button" onClick={() => setRange(key)} className={range === key ? "btn-primary" : "btn-secondary"}>
              {rangeLabel(key)}
            </button>
          ))}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              assignments.refetch(); assigned.refetch(); accepted.refetch(); started.refetch(); completed.refetch(); rejected.refetch();
              operationStats.refetch(); lifecycle.refetch(); inventory.refetch(); movements.refetch(); maintenanceStats.refetch(); maintenancePlans.refetch();
              pmocStats.refetch(); pmocPlans.refetch(); financial.refetch(); procurement.refetch(); awaitingPurchases.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
        </div>
      </div>

      <DashboardSection title="Resumo executivo">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricLink href="/agenda"><MetricCard label="Operações hoje" value={formatNumber(todayAssignments.length)} delta="agenda operacional" icon="CalendarClock" /></MetricLink>
          <MetricLink href="/operacoes?status=IN_PROGRESS"><MetricCard label="Em execução" value={formatNumber(inProgress)} delta="assignments" trend={inProgress > 0 ? "up" : "flat"} icon="Activity" /></MetricLink>
          <MetricLink href="/operacoes"><MetricCard label="Aguardando aceite" value={formatNumber(awaitingAcceptance)} delta="ação do operador" trend={awaitingAcceptance > 0 ? "down" : "flat"} icon="Clock" /></MetricLink>
          {canSeeFinancial ? (
            <MetricLink href="/financial"><MetricCard label="Saldo atual" value={formatCurrencyBRL(Number(financial.data?.currentBalance ?? 0))} delta="financial core" icon="Wallet" /></MetricLink>
          ) : (
            <MetricCard label="Saldo atual" value="restrito" delta="RBAC" icon="Lock" />
          )}
          <MetricLink href="/produtos?tab=inventory"><MetricCard label="Estoque crítico" value={formatNumber(inventory.data?.minimumStockAlerts ?? 0)} delta="abaixo do mínimo" trend={(inventory.data?.minimumStockAlerts ?? 0) > 0 ? "down" : "flat"} icon="PackageX" /></MetricLink>
          <MetricLink href="/purchase-orders?status=SENT"><MetricCard label="Compras pendentes" value={formatNumber((procurement.data?.sent ?? 0) + (procurement.data?.partiallyReceived ?? 0))} delta="recebimento" icon="ShoppingCart" /></MetricLink>
        </div>
      </DashboardSection>

      <DashboardSection title="Centro de atenção" action={<span className="text-caption">priorizado por criticidade e prazo</span>}>
        <AttentionCenter loading={assignments.loading || inventory.loading || maintenanceStats.loading || pmocStats.loading} items={attention} />
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardSection title="Operação hoje" action={<Link href="/agenda" className="text-xs font-medium text-[var(--color-primary)] hover:underline">abrir agenda</Link>}>
          <OperationsToday
            loading={assignments.loading && !assignments.data}
            error={assignments.error}
            onRetry={assignments.refetch}
            todayAssignments={todayAssignments}
            statusTotals={{
              ASSIGNED: assigned.data?.pagination.total ?? 0,
              ACCEPTED: accepted.data?.pagination.total ?? 0,
              STARTED: started.data?.pagination.total ?? 0,
              COMPLETED: completed.data?.pagination.total ?? 0,
              REJECTED: rejected.data?.pagination.total ?? 0,
            }}
          />
        </DashboardSection>

        <DashboardSection title="Atividade relevante recente" action={<Link href="/equipamentos" className="text-xs font-medium text-[var(--color-primary)] hover:underline">ver ativos</Link>}>
          <RecentActivity loading={lifecycle.loading && !lifecycle.data} error={lifecycle.error} onRetry={lifecycle.refetch} events={lifecycle.data?.items ?? []} />
        </DashboardSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Gate roles={["OWNER", "MANAGER"]} permission="canFinancial">
          <DashboardSection title="Snapshot financeiro" action={<Link href="/financial" className="text-xs font-medium text-[var(--color-primary)] hover:underline">abrir financeiro</Link>}>
            <FinancialSnapshot loading={financial.loading && !financial.data} error={financial.error} onRetry={financial.refetch} stats={financial.data} />
          </DashboardSection>
        </Gate>

        <DashboardSection title="Ativos, manutenção e PMOC">
          <MaintenanceCompliance
            maintenance={maintenanceStats.data}
            pmoc={pmocStats.data}
            plans={maintenancePlans.data?.items ?? []}
            pmocs={pmocPlans.data?.items ?? []}
            loading={(maintenanceStats.loading && !maintenanceStats.data) || (pmocStats.loading && !pmocStats.data)}
            error={maintenanceStats.error || pmocStats.error}
            onRetry={() => { maintenanceStats.refetch(); maintenancePlans.refetch(); pmocStats.refetch(); pmocPlans.refetch(); }}
          />
        </DashboardSection>
      </div>

      <DashboardSection title="Estoque e compras" action={<Link href="/purchase-orders" className="text-xs font-medium text-[var(--color-primary)] hover:underline">abrir compras</Link>}>
        <InventoryProcurement
          inventory={inventory.data}
          procurement={procurement.data}
          purchases={awaitingPurchases.data?.items ?? []}
          movements={movements.data?.items ?? []}
          loading={(inventory.loading && !inventory.data) || (procurement.loading && !procurement.data)}
          error={inventory.error || procurement.error}
          onRetry={() => { inventory.refetch(); procurement.refetch(); awaitingPurchases.refetch(); movements.refetch(); }}
        />
      </DashboardSection>
    </div>
  );
}

function AttentionCenter({ loading, items }: { loading: boolean; items: AttentionItem[] }) {
  if (loading && items.length === 0) return <div className="grid gap-3 md:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (items.length === 0) return <EmptyState icon={CheckCircle2} title="Nada crítico no momento" description="Sem alertas relevantes retornados pelos domínios oficiais." />;
  return (
    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {items.slice(0, 8).map((item) => (
        <Link key={item.id} href={item.href} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full ${item.severity === "critical" ? "bg-red-500/10 text-red-700" : "bg-amber-500/10 text-amber-700"}`}>
              <AlertTriangle className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{item.domain}</span>
              <span className="mt-0.5 block font-semibold">{item.title}</span>
              <span className="mt-1 block text-sm text-[var(--color-muted-foreground)]">{item.context}</span>
              {item.date && <span className="mt-2 block text-caption">Prazo: {formatDate(item.date)}</span>}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function OperationsToday({
  loading,
  error,
  onRetry,
  todayAssignments,
  statusTotals,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  todayAssignments: Assignment[];
  statusTotals: Partial<Record<AssignmentStatus, number>>;
}) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <ErrorState error={error} onRetry={onRetry} title="Operação indisponível" />;
  const workload = groupByOperator(todayAssignments);
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-5">
        {assignmentStatuses.map((status) => (
          <div key={status} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
            <div className="text-caption">{assignmentStatusLabel(status)}</div>
            <div className="mt-1 text-xl font-semibold">{formatNumber(statusTotals[status] ?? 0)}</div>
          </div>
        ))}
      </div>
      {todayAssignments.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Sem agenda operacional hoje" description="Nenhuma Assignment agendada para hoje foi retornada no conjunto consultado." />
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
          {todayAssignments.slice(0, 7).map((assignment) => (
            <li key={assignment.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-medium truncate">OS #{assignment.operation.number} · {assignment.operation.customer?.name ?? "Cliente não informado"}</div>
                <div className="text-caption truncate">{assignment.operation.equipment?.name ?? "Sem equipamento"} · {assignment.assignee.name}</div>
              </div>
              <Link href="/operacoes" className="text-xs font-medium text-[var(--color-primary)] hover:underline">abrir operação</Link>
            </li>
          ))}
        </ul>
      )}
      {workload.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3">
          <div className="mb-2 text-sm font-semibold">Carga por operador hoje</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {workload.map((item) => <div key={item.operator} className="flex justify-between text-sm"><span>{item.operator}</span><span className="font-mono">{item.count}</span></div>)}
          </div>
        </div>
      )}
    </div>
  );
}

function FinancialSnapshot({ loading, error, onRetry, stats }: { loading: boolean; error: unknown; onRetry: () => void; stats: FinancialStats | null }) {
  if (loading) return <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <ErrorState error={error} onRetry={onRetry} title="Financeiro indisponível" />;
  if (!stats) return <EmptyState icon={Wallet} title="Financeiro restrito" description="Seu perfil não possui acesso aos indicadores financeiros." />;
  const overdue = Number(stats.overdue.receivable) + Number(stats.overdue.payable);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <MetricLink href="/financial"><MetricCard label="Saldo atual" value={formatCurrencyBRL(Number(stats.currentBalance))} icon="Wallet" /></MetricLink>
      <MetricLink href="/financial"><MetricCard label="Saldo previsto" value={formatCurrencyBRL(Number(stats.projectedBalance))} icon="LineChart" /></MetricLink>
      <MetricLink href="/financial?type=RECEIVABLE&status=PENDING"><MetricCard label="Receber hoje" value={formatCurrencyBRL(Number(stats.receivableToday))} trend="up" icon="ArrowUpCircle" /></MetricLink>
      <MetricLink href="/financial?status=OVERDUE"><MetricCard label="Atrasados" value={formatCurrencyBRL(overdue)} trend={overdue > 0 ? "down" : "flat"} icon="AlertTriangle" /></MetricLink>
    </div>
  );
}

function MaintenanceCompliance({
  maintenance,
  pmoc,
  plans,
  pmocs,
  loading,
  error,
  onRetry,
}: {
  maintenance: MaintenanceStats | null;
  pmoc: PmocStats | null;
  plans: MaintenancePlan[];
  pmocs: PmocPlan[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (loading) return <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <ErrorState error={error} onRetry={onRetry} title="Manutenção/PMOC indisponível" />;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Planos ativos" value={formatNumber(maintenance?.activePlans ?? 0)} icon="Wrench" />
        <MetricCard label="Manut. vencidas" value={formatNumber(maintenance?.overduePlans ?? 0)} trend={(maintenance?.overduePlans ?? 0) > 0 ? "down" : "flat"} icon="AlertTriangle" />
        <MetricCard label="PMOCs ativos" value={formatNumber(pmoc?.activePmocs ?? 0)} icon="ShieldCheck" />
        <MetricCard label="PMOC em risco" value={formatNumber((pmoc?.expiredPmocs ?? 0) + (pmoc?.pendingPmocs ?? 0))} trend={(pmoc?.expiredPmocs ?? 0) > 0 ? "down" : "flat"} icon="BadgeAlert" />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <CompactList title="Próximas manutenções" empty="Sem planos ativos próximos." items={plans.map((plan) => ({ id: plan.id, title: plan.name, meta: `${plan.equipment?.name ?? "Equipamento"} · ${formatDate(plan.nextExecution)}`, href: "/equipamentos" }))} icon={Wrench} />
        <CompactList title="PMOCs monitorados" empty="Sem PMOCs ativos." items={pmocs.map((plan) => ({ id: plan.id, title: plan.customer?.tradeName ?? plan.customer?.name ?? "PMOC", meta: `${plan.compliance.status} · vence ${formatDate(plan.endDate)}`, href: "/equipamentos" }))} icon={ShieldCheck} />
      </div>
    </div>
  );
}

function InventoryProcurement({
  inventory,
  procurement,
  purchases,
  movements,
  loading,
  error,
  onRetry,
}: {
  inventory: InventoryStats | null;
  procurement: PurchaseOrderStats | null;
  purchases: PurchaseOrder[];
  movements: StockMovement[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (loading) return <div className="grid gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <ErrorState error={error} onRetry={onRetry} title="Estoque/compras indisponíveis" />;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <MetricLink href="/produtos?tab=inventory"><MetricCard label="Abaixo do mínimo" value={formatNumber(inventory?.minimumStockAlerts ?? 0)} trend={(inventory?.minimumStockAlerts ?? 0) > 0 ? "down" : "flat"} icon="PackageX" /></MetricLink>
        <MetricLink href="/produtos?tab=inventory"><MetricCard label="Sem estoque" value={formatNumber(inventory?.productsWithoutStock ?? 0)} trend={(inventory?.productsWithoutStock ?? 0) > 0 ? "down" : "flat"} icon="PackageMinus" /></MetricLink>
        <MetricLink href="/purchase-orders?status=SENT"><MetricCard label="Aguardando entrega" value={formatNumber((procurement?.sent ?? 0) + (procurement?.partiallyReceived ?? 0))} icon="Truck" /></MetricLink>
        <MetricLink href="/purchase-orders"><MetricCard label="Recebidos" value={formatNumber(procurement?.received ?? 0)} trend="up" icon="PackageCheck" /></MetricLink>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <h3 className="mb-3 text-sm font-semibold">Pedidos aguardando recebimento</h3>
          {purchases.length === 0 ? <p className="text-caption">Nenhum pedido enviado aguardando recebimento.</p> : (
            <ul className="space-y-2">
              {purchases.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">#{order.number} · {order.supplier?.tradeName ?? order.supplier?.legalName ?? "Fornecedor"}</span>
                  <PurchaseStatusBadge status={order.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <CompactList title="Movimentos recentes" empty="Sem movimentações recentes." items={movements.map((movement) => ({ id: movement.id, title: movement.inventoryItem?.product?.name ?? movement.reason, meta: `${movement.type} · ${formatNumber(Number(movement.quantity))}`, href: "/produtos" }))} icon={PackageCheck} />
      </div>
    </div>
  );
}

function RecentActivity({ loading, error, onRetry, events }: { loading: boolean; error: unknown; onRetry: () => void; events: AssetLifecycleEvent[] }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  if (error) return <ErrorState error={error} onRetry={onRetry} title="Atividade indisponível" />;
  if (events.length === 0) return <EmptyState icon={ShieldCheck} title="Sem atividade recente" description="Nenhum evento relevante no período selecionado." />;
  return (
    <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]">
      {events.slice(0, 8).map((event) => (
        <li key={event.id} className="p-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full" style={{ backgroundColor: `${event.timeline.color}18`, color: event.timeline.color }}>
              {event.type === "DOCUMENT" ? <ClipboardList className="h-4 w-4" /> : event.timeline.category === "maintenance" ? <Wrench className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{event.timeline.title}</div>
              <div className="text-caption truncate">{event.timeline.subtitle ?? event.timeline.description}</div>
              <div className="mt-1 text-caption">{formatDateTime(event.timeline.date)}</div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CompactList({ title, empty, items, icon: Icon }: { title: string; empty: string; items: Array<{ id: string; title: string; meta: string; href: string }>; icon: LucideIcon }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4" /> {title}</h3>
      {items.length === 0 ? <p className="text-caption">{empty}</p> : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="block rounded-[var(--radius-md)] p-2 hover:bg-[var(--color-muted)]">
                <span className="block text-sm font-medium truncate">{item.title}</span>
                <span className="text-caption">{item.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="block focus-visible:outline-none">{children}</Link>;
}

function buildAttentionItems(input: {
  overdueAssignments: Assignment[];
  awaitingToday: Assignment[];
  financial: FinancialStats | null;
  inventory: InventoryStats | null;
  procurement: PurchaseOrderStats | null;
  maintenance: MaintenanceStats | null;
  pmoc: PmocStats | null;
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (input.overdueAssignments.length > 0) items.push({ id: "assignments-overdue", severity: "critical", domain: "Operação", title: `${input.overdueAssignments.length} assignments atrasadas`, context: "Há atividades com horário anterior ao atual sem conclusão.", href: "/operacoes" });
  if (input.awaitingToday.length > 0) items.push({ id: "assignments-awaiting", severity: "warning", domain: "Operação", title: `${input.awaitingToday.length} atividades sem aceite hoje`, context: "Operadores ainda precisam aceitar atividades agendadas.", href: "/agenda" });
  const overdueFinancial = input.financial ? Number(input.financial.overdue.receivable) + Number(input.financial.overdue.payable) : 0;
  if (overdueFinancial > 0) items.push({ id: "financial-overdue", severity: "critical", domain: "Financeiro", title: "Lançamentos vencidos", context: formatCurrencyBRL(overdueFinancial), href: "/financial" });
  if ((input.inventory?.minimumStockAlerts ?? 0) > 0) items.push({ id: "inventory-low", severity: "warning", domain: "Estoque", title: `${input.inventory?.minimumStockAlerts} itens abaixo do mínimo`, context: "Reposição ou compra pode ser necessária.", href: "/produtos" });
  const awaitingPurchase = (input.procurement?.sent ?? 0) + (input.procurement?.partiallyReceived ?? 0);
  if (awaitingPurchase > 0) items.push({ id: "purchase-awaiting", severity: "warning", domain: "Compras", title: `${awaitingPurchase} pedidos aguardando recebimento`, context: "Acompanhe entrega e entrada no estoque.", href: "/purchase-orders" });
  if ((input.maintenance?.overduePlans ?? 0) > 0) items.push({ id: "maintenance-overdue", severity: "critical", domain: "Manutenção", title: `${input.maintenance?.overduePlans} planos vencidos`, context: "Execuções planejadas precisam de atenção.", href: "/equipamentos" });
  if ((input.pmoc?.expiredPmocs ?? 0) > 0) items.push({ id: "pmoc-expired", severity: "critical", domain: "PMOC", title: `${input.pmoc?.expiredPmocs} PMOCs vencidos`, context: "Risco de não conformidade operacional.", href: "/equipamentos" });
  if ((input.pmoc?.pendingPmocs ?? 0) > 0) items.push({ id: "pmoc-warning", severity: "warning", domain: "PMOC", title: `${input.pmoc?.pendingPmocs} PMOCs em atenção`, context: "Planos em warning/in progress.", href: "/equipamentos" });
  return items.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "critical" ? -1 : 1));
}

function groupByOperator(assignments: Assignment[]): Array<{ operator: string; count: number }> {
  const map = new Map<string, number>();
  for (const assignment of assignments) map.set(assignment.assignee.name, (map.get(assignment.assignee.name) ?? 0) + 1);
  return [...map.entries()].map(([operator, count]) => ({ operator, count })).sort((a, b) => b.count - a.count).slice(0, 6);
}

function isScheduledToday(assignment: Assignment): boolean {
  const scheduled = assignment.operation.scheduledFor;
  if (!scheduled) return false;
  const d = new Date(scheduled);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isAssignmentOverdue(assignment: Assignment): boolean {
  const scheduled = assignment.operation.scheduledFor;
  if (!scheduled || ["COMPLETED", "CANCELED", "REJECTED"].includes(assignment.status)) return false;
  return new Date(scheduled).getTime() < Date.now();
}

function assignmentStatusLabel(status: AssignmentStatus): string {
  const labels: Record<AssignmentStatus, string> = {
    ASSIGNED: "Aguardando",
    ACCEPTED: "Aceitas",
    STARTED: "Em execução",
    PAUSED: "Pausadas",
    COMPLETED: "Concluídas",
    CANCELED: "Canceladas",
    REJECTED: "Rejeitadas",
  };
  return labels[status];
}

function rangeLabel(range: RangeKey): string {
  return { today: "Hoje", "7d": "7 dias", "30d": "30 dias", month: "Mês atual" }[range];
}

function getRangeBounds(range: RangeKey): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now);
  if (range === "today") start.setHours(0, 0, 0, 0);
  if (range === "7d") start.setDate(now.getDate() - 7);
  if (range === "30d") start.setDate(now.getDate() - 30);
  if (range === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return { from: start.toISOString(), to: now.toISOString() };
}

function useStateRange(): [RangeKey, (range: RangeKey) => void] {
  return useState<RangeKey>("today");
}
