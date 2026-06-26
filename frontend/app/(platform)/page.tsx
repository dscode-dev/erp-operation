"use client";

// Dashboard operacional — Sprint 2 (widgets integrados ao backend).
import Link from "next/link";
import { CalendarClock, Wallet } from "lucide-react";
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
  dashboardApi, usersApi, customersApi, financialApi, useQuery,
  type DashboardData, type DemoScheduleState, type FinancialData,
} from "@erp/api";
import { firstName, formatNumber, formatCurrencyBRL } from "@erp/utils";

const SCHEDULE_STATUS: Record<DemoScheduleState, Status> = {
  OVERDUE: "danger",
  IN_PROGRESS: "in_progress",
  SCHEDULED: "scheduled",
};

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export default function PlatformHome() {
  const { session, can, hasRole } = useAuth();
  const canSeeTeam = hasRole("OWNER", "MANAGER", "VIEWER");

  const dash = useQuery<DashboardData>((signal) => dashboardApi.getDashboard({ signal }), []);
  const users = useQuery(
    (signal) => (canSeeTeam ? usersApi.listUsers({ limit: 100, signal }) : Promise.resolve(null)),
    [canSeeTeam],
  );
  const customers = useQuery((signal) => customersApi.listCustomers({ limit: 100, signal }), []);

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
