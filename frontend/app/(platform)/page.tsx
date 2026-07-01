"use client";

// Dashboard operacional — Sprint 2 (widgets integrados ao backend).
import Link from "next/link";
import { CalendarClock, FileText, ShieldCheck, TriangleAlert, Wallet, Wrench } from "lucide-react";
import { DashboardSection } from "@platform/components/dashboard-section";
import { MetricCard } from "@erp/ui/metric-card";
import { GreetingHeader } from "@platform/components/greeting-header";
import { TeamStatusList } from "@platform/components/team-status-list";
import { StatusPill, type Status } from "@erp/ui/status-pill";
import { SkeletonCard } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { Gate } from "@erp/ui/auth/gate";
import {
  dashboardApi, usersApi, customersApi, financialApi, assetLifecycleApi, useQuery,
  inventoryApi, pricingApi,
  type AssetLifecycleEvent, type DashboardData, type DemoScheduleState, type FinancialData,
  type InventoryStats, type PricingStats, type StockMovement,
} from "@erp/api";
import { firstName, formatNumber, formatCurrencyBRL, formatDateTime } from "@erp/utils";

const SCHEDULE_STATUS: Record<DemoScheduleState, Status> = {
  OVERDUE: "danger",
  IN_PROGRESS: "in_progress",
  SCHEDULED: "scheduled",
  DONE: "done",
};

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export default function PlatformHome() {
  const { session, hasRole } = useAuth();
  const canSeeTeam = hasRole("OWNER", "MANAGER", "VIEWER");

  const dash = useQuery<DashboardData>((signal) => dashboardApi.getDashboard({ signal }), []);
  const users = useQuery(
    (signal) => (canSeeTeam ? usersApi.listUsers({ limit: 100, signal }) : Promise.resolve(null)),
    [canSeeTeam],
  );
  const customers = useQuery((signal) => customersApi.listCustomers({ limit: 100, signal }), []);
  const lifecycle = useQuery((signal) => assetLifecycleApi.listLifecycle({ limit: 12, signal }), []);
  const inventory = useQuery<InventoryStats>((signal) => inventoryApi.getInventoryStats({ signal }), []);
  const movements = useQuery((signal) => inventoryApi.listStockMovements({ limit: 5, signal }), []);
  const pricing = useQuery<PricingStats | null>((signal) => (hasRole("OWNER", "MANAGER") ? pricingApi.getPricingStats({ signal }) : Promise.resolve(null)), [session?.role]);

  const counters = dash.data?.demo?.["demo.dashboard.v1"].counters;
  const schedule = dash.data?.demo?.["demo.schedule.v1"].items ?? [];
  const pending = counters?.ordensPendentes ?? 0;

  const activeUsers = users.data ? users.data.items.filter((u) => u.isActive).length : null;
  const newCustomers = customers.data
    ? customers.data.items.filter((c) => Date.now() - new Date(c.createdAt).getTime() <= THIRTY_DAYS).length
    : null;

  return (
    <div className="space-y-8 max-w-[1440px]">
      <GreetingHeader name={firstName(session?.user.name ?? "Equipe")} pending={pending} />

      {/* Widgets */}
      <DashboardSection title="Visão geral">
        {dash.loading && !dash.data ? (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : dash.error && !dash.data ? (
          <ErrorState error={dash.error} onRetry={dash.refetch} />
        ) : (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
            <MetricCard label="Atendimentos hoje" value={String(counters?.atendimentosHoje ?? "—")} delta="hoje" trend="flat" icon="Briefcase" />
            <MetricCard label="Em andamento" value={String(counters?.servicosEmAndamento ?? "—")} delta="agora" trend="flat" icon="Activity" />
            <MetricCard label="Ordens pendentes" value={String(pending)} delta="abertas" trend={pending ? "up" : "flat"} icon="ClipboardList" />
            <MetricCard label="Usuários ativos" value={activeUsers !== null ? formatNumber(activeUsers) : "—"} delta="equipe" trend="flat" icon="UserCheck" />
            <MetricCard label="Equip. em manutenção" value={dash.data?.equipments ? formatNumber(dash.data.equipments.maintenance) : "—"} delta={dash.data?.equipments ? `${dash.data.equipments.total} no total` : "—"} trend={dash.data?.equipments?.maintenance ? "up" : "flat"} icon="Wrench" />
            <MetricCard label="Clientes novos" value={newCustomers !== null ? formatNumber(newCustomers) : "—"} delta="30 dias" trend={newCustomers ? "up" : "flat"} icon="UserPlus" />
          </div>
        )}
      </DashboardSection>

      <AssetLifecycleWidgets loading={lifecycle.loading} error={lifecycle.error} events={lifecycle.data?.items ?? []} onRetry={lifecycle.refetch} />

      <InventoryPricingWidgets
        inventory={inventory.data}
        pricing={pricing.data}
        movements={movements.data?.items ?? []}
        loading={(inventory.loading && !inventory.data) || (movements.loading && !movements.data)}
        error={inventory.error || movements.error || pricing.error}
        onRetry={() => { inventory.refetch(); movements.refetch(); pricing.refetch(); }}
      />

      {/* Indicadores financeiros (gated) */}
      <Gate roles={["OWNER", "MANAGER"]} permission="canFinancial">
        <FinancialWidgets />
      </Gate>

      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardSection
          title="Próximos atendimentos"
          action={<Link href="/agenda" className="text-xs font-medium text-[var(--color-primary)] hover:underline">agenda</Link>}
          className="lg:col-span-2"
        >
          {dash.loading && !dash.data ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : dash.data?.demoDisabled ? (
            <ComingSoonState title="Agenda em breve" description="O domínio de Agendamento ainda não está disponível na API." />
          ) : schedule.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Sem compromissos" description="Nenhum agendamento próximo." />
          ) : (
            <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
              {schedule.slice(0, 6).map((item) => {
                const at = new Date(item.startsAt);
                return (
                  <li key={item.id} className="flex items-center gap-4 p-3.5 hover:bg-[var(--color-muted)]/40 transition-colors">
                    <span className="font-mono text-[11px] text-[var(--color-muted-foreground)] w-16 shrink-0">
                      {Number.isNaN(at.getTime()) ? "—" : at.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{item.title}</div>
                      <div className="text-caption truncate">{item.customer} · {item.operator}</div>
                    </div>
                    <StatusPill status={SCHEDULE_STATUS[item.state]} />
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardSection>

        {canSeeTeam && (
          <DashboardSection title="Equipe">
            <TeamSection />
          </DashboardSection>
        )}
      </div>
    </div>
  );
}

function InventoryPricingWidgets({
  inventory,
  pricing,
  movements,
  loading,
  error,
  onRetry,
}: {
  inventory: InventoryStats | null;
  pricing: PricingStats | null;
  movements: StockMovement[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <DashboardSection title="Estoque e pricing" action={<Link href="/produtos" className="text-xs font-medium text-[var(--color-primary)] hover:underline">ver produtos</Link>}>
      {loading ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : error && !inventory ? (
        <ErrorState error={error} onRetry={onRetry} title="Estoque indisponível" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[repeat(5,minmax(0,1fr))]">
          <MetricCard label="Produtos críticos" value={formatNumber(inventory?.minimumStockAlerts ?? 0)} trend={(inventory?.minimumStockAlerts ?? 0) > 0 ? "up" : "flat"} icon="AlertTriangle" />
          <MetricCard label="Sem estoque" value={formatNumber(inventory?.productsWithoutStock ?? 0)} trend={(inventory?.productsWithoutStock ?? 0) > 0 ? "up" : "flat"} icon="PackageX" />
          <MetricCard label="Sem preço" value={pricing ? formatNumber(pricing.productsWithoutPrice) : "—"} trend={pricing?.productsWithoutPrice ? "up" : "flat"} icon="DollarSign" />
          <MetricCard label="Consumo recente" value={formatNumber(inventory?.consumptionMovementsLast30Days ?? 0)} icon="History" />
          <MetricCard label="Preços vencidos" value={pricing ? formatNumber(pricing.expiredPrices) : "—"} trend={pricing?.expiredPrices ? "up" : "flat"} icon="BadgeAlert" />
          <div className="lg:col-span-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
            {movements.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="Sem movimentações recentes" description="Entradas, saídas e consumos aparecerão aqui." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {movements.map((movement) => (
                  <li key={movement.id} className="flex items-center gap-3 p-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                      <Wallet className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{movement.inventoryItem?.product?.name ?? movement.reason}</div>
                      <div className="text-caption truncate">{movement.type} · {movement.reason}</div>
                    </div>
                    <span className="font-mono text-xs">{formatNumber(Number(movement.quantity))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </DashboardSection>
  );
}

function AssetLifecycleWidgets({
  loading,
  error,
  events,
  onRetry,
}: {
  loading: boolean;
  error: unknown;
  events: AssetLifecycleEvent[];
  onRetry: () => void;
}) {
  const preventive = events.filter((event) => event.type === "PREVENTIVE").length;
  const corrective = events.filter((event) => event.type === "CORRECTIVE").length;
  const documents = events.filter((event) => event.type === "DOCUMENT").length;
  const equipmentOccurrences = new Map<string, { name: string; count: number }>();
  for (const event of events) {
    const equipment = event.timeline.references.equipment;
    if (!equipment) continue;
    const current = equipmentOccurrences.get(equipment.id) ?? { name: equipment.name, count: 0 };
    equipmentOccurrences.set(equipment.id, { ...current, count: current.count + 1 });
  }
  const topEquipment = [...equipmentOccurrences.values()].sort((a, b) => b.count - a.count)[0];

  return (
    <DashboardSection title="Ciclo de vida dos ativos">
      {loading && events.length === 0 ? (
        <div className="grid gap-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : error && events.length === 0 ? (
        <ErrorState error={error} onRetry={onRetry} title="Asset Lifecycle indisponível" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
          <MetricCard label="Preventivas recentes" value={formatNumber(preventive)} delta="últimos eventos" trend="flat" icon="ShieldCheck" />
          <MetricCard label="Corretivas recentes" value={formatNumber(corrective)} delta="últimos eventos" trend={corrective ? "up" : "flat"} icon="TriangleAlert" />
          <MetricCard label="Documentos recentes" value={formatNumber(documents)} delta="renderizados" trend="flat" icon="FileText" />
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 text-caption"><Wrench className="h-4 w-4" /> Maior ocorrência</div>
            <div className="mt-2 text-lg font-semibold truncate">{topEquipment?.name ?? "—"}</div>
            <p className="text-caption">{topEquipment ? `${topEquipment.count} eventos recentes` : "Sem eventos"}</p>
          </div>
          <div className="lg:col-span-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
            {events.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="Sem eventos" description="Nenhum evento de ciclo de vida retornado pela API." />
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {events.slice(0, 5).map((event) => (
                  <li key={event.id} className="flex items-center gap-3 p-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full" style={{ backgroundColor: `${event.timeline.color}18`, color: event.timeline.color }}>
                      {event.type === "DOCUMENT" ? <FileText className="h-4 w-4" /> : event.type === "CORRECTIVE" ? <TriangleAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{event.timeline.title}</div>
                      <div className="text-caption truncate">{event.timeline.references.customer?.name ?? "—"} · {event.timeline.references.equipment?.name ?? "—"}</div>
                    </div>
                    <span className="text-caption hidden sm:inline">{formatDateTime(event.timeline.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </DashboardSection>
  );
}

function FinancialWidgets() {
  const fin = useQuery<FinancialData>((signal) => financialApi.getFinancial({ signal }), []);
  const f = fin.data?.finance;
  if (fin.loading && !fin.data) {
    return <DashboardSection title="Indicadores financeiros"><div className="grid gap-3 grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div></DashboardSection>;
  }
  if (fin.data?.disabled || !f) {
    return (
      <DashboardSection title="Indicadores financeiros">
        <ComingSoonState title="Financeiro em breve" description="Ative o Demo Dataset para visualizar indicadores financeiros." />
      </DashboardSection>
    );
  }
  return (
    <DashboardSection title="Indicadores financeiros" action={<Link href="/financial" className="text-xs font-medium text-[var(--color-primary)] hover:underline">ver financeiro</Link>}>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Entradas" value={formatCurrencyBRL(f.summary.entradas)} delta="período" trend="up" icon="TrendingUp" />
        <MetricCard label="Saídas" value={formatCurrencyBRL(f.summary.saidas)} delta="período" trend="down" icon="TrendingDown" />
        <MetricCard label="Despesas" value={formatCurrencyBRL(f.summary.despesas)} delta="período" trend="down" icon="Wallet" />
        <MetricCard label="Projeção 30 dias" value={formatCurrencyBRL(f.summary.projecao30Dias)} delta="estimativa" trend="up" icon="LineChart" />
      </div>
    </DashboardSection>
  );
}

function TeamSection() {
  const team = useQuery((signal) => usersApi.listUsers({ limit: 6, signal }), []);
  if (team.loading && !team.data) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>;
  }
  if (team.error && !team.data) {
    return <ErrorState error={team.error} onRetry={team.refetch} title="Equipe indisponível" />;
  }
  const members = (team.data?.items ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    role: u.jobTitle ?? u.role,
    status: (u.isActive ? "online" : "offline") as "online" | "offline",
  }));
  if (members.length === 0) return <EmptyState icon={Wallet} title="Sem usuários" description="Nenhum membro cadastrado." />;
  return <TeamStatusList team={members} />;
}
