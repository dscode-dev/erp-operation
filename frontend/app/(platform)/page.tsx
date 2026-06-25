// Dashboard operacional — Sprint 0.A
import { DashboardSection } from "@/components/platform/dashboard-section";
import { MetricCard } from "@/components/platform/metric-card";
import { ActivityFeed } from "@/components/platform/activity-feed";
import { StatusPill } from "@/components/shared/status-pill";
import { GreetingHeader } from "@/components/platform/greeting-header";
import { AlertCard } from "@/components/platform/alert-card";
import { TeamStatusList } from "@/components/platform/team-status-list";
import {
  recentActivity,
  todayServices,
  agenda,
  teamOnline,
  operationalAlerts,
} from "@/mocks/data";

export default function PlatformHome() {
  const pending = todayServices.filter((s) => s.status !== "done").length;
  const inProgress = todayServices.filter((s) => s.status === "in_progress").length;
  const done = todayServices.filter((s) => s.status === "done").length;
  const operatorsActive = teamOnline.filter((t) => t.status !== "offline").length;
  const criticalAlerts = operationalAlerts.filter((a) => a.severity === "danger").length;

  return (
    <div className="space-y-8 max-w-[1440px]">
      <GreetingHeader name="Darlan" pending={pending} />

      {/* Hoje */}
      <DashboardSection title="Hoje">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
          <MetricCard label="Atendimentos" value={String(todayServices.length)} delta="+6 vs ontem" trend="up" icon="Briefcase" />
          <MetricCard label="Em andamento" value={String(inProgress)} delta="agora" trend="flat" icon="Activity" />
          <MetricCard label="Concluídos"   value={String(done)} delta={`${Math.round((done/todayServices.length)*100)}%`} trend="up" icon="CheckCircle2" />
          <MetricCard label="Pendências"   value={String(pending)} delta="-3" trend="down" icon="AlertCircle" />
          <MetricCard label="Operadores"   value={`${operatorsActive}/${teamOnline.length}`} delta="ativos" trend="flat" icon="Users" />
          <MetricCard label="Críticos"     value={String(criticalAlerts)} delta="atenção" trend={criticalAlerts ? "up" : "flat"} icon="AlertTriangle" />
        </div>
      </DashboardSection>

      {/* Linha principal: serviços + atividade */}
      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardSection
          title="Serviços do dia"
          action={
            <a href="/servicos" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
              ver todos
            </a>
          }
          className="lg:col-span-2"
        >
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
            {todayServices.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-center gap-4 p-3.5 hover:bg-[var(--color-muted)]/40 transition-colors">
                <span className="font-mono text-[11px] text-[var(--color-muted-foreground)] w-16 shrink-0">{s.time}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  <div className="text-caption truncate">
                    {s.client} · {s.operator}
                  </div>
                </div>
                <StatusPill status={s.status} />
              </li>
            ))}
          </ul>
        </DashboardSection>

        <DashboardSection title="Atividade recente">
          <ActivityFeed items={recentActivity} />
        </DashboardSection>
      </div>

      {/* Segunda linha: agenda + equipe + alertas */}
      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardSection
          title="Próximos compromissos"
          action={
            <a href="/agenda" className="text-xs font-medium text-[var(--color-primary)] hover:underline">
              agenda
            </a>
          }
        >
          <ul className="space-y-2">
            {agenda.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-shadow"
              >
                <div className="flex flex-col items-center justify-center w-12 shrink-0 border-r border-[var(--color-border)] pr-3">
                  <span className="font-mono text-sm font-medium tabular-nums">{a.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  <div className="text-caption truncate">{a.where}</div>
                </div>
                <StatusPill status={a.status} />
              </li>
            ))}
          </ul>
        </DashboardSection>

        <DashboardSection title="Equipe">
          <TeamStatusList team={teamOnline} />
        </DashboardSection>

        <DashboardSection title="Alertas">
          <ul className="space-y-2">
            {operationalAlerts.map((a) => (
              <AlertCard key={a.id} {...a} />
            ))}
          </ul>
        </DashboardSection>
      </div>
    </div>
  );
}
