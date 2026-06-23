import { DashboardSection } from "@/components/platform/dashboard-section";
import { MetricCard } from "@/components/platform/metric-card";
import { ActivityFeed } from "@/components/platform/activity-feed";
import { StatusPill } from "@/components/shared/status-pill";
import {
  platformMetrics,
  recentActivity,
  todayServices,
  criticalEquipment,
  agenda,
} from "@/mocks/data";

export default function PlatformHome() {
  return (
    <div className="space-y-8 max-w-[1400px]">
      <header className="space-y-1">
        <p className="text-caption uppercase tracking-wider">Operação · hoje</p>
        <h1 className="text-display">Bom dia, Equipe.</h1>
        <p className="text-[var(--color-muted-foreground)]">
          Visão operacional em tempo real — sem ruído financeiro.
        </p>
      </header>

      <DashboardSection title="Indicadores do dia">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {platformMetrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      </DashboardSection>

      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardSection title="Serviços do dia" className="lg:col-span-2">
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
            {todayServices.map((s) => (
              <li key={s.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.title}</div>
                  <div className="text-caption truncate">
                    {s.client} · {s.operator} · {s.time}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardSection title="Agenda">
          <ul className="space-y-2">
            {agenda.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card)]"
              >
                <span className="font-mono text-sm w-14 text-[var(--color-muted-foreground)]">
                  {a.time}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.title}</div>
                  <div className="text-caption truncate">{a.where}</div>
                </div>
                <StatusPill status={a.status} />
              </li>
            ))}
          </ul>
        </DashboardSection>

        <DashboardSection title="Equipamentos críticos">
          <ul className="space-y-2">
            {criticalEquipment.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card)]"
              >
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-caption">{e.location}</div>
                </div>
                <StatusPill status={e.status} />
              </li>
            ))}
          </ul>
        </DashboardSection>
      </div>
    </div>
  );
}
