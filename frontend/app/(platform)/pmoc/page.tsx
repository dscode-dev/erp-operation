"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Ban, CalendarClock, CheckCircle2, ChevronRight, ClipboardCheck, PauseCircle, Plus, Search, ShieldAlert } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { Pagination } from "@platform/components/pagination";
import { PmocPlanWizard } from "@platform/components/pmoc-plan-wizard";
import { PmocOperationalCalendar } from "@platform/components/pmoc-operational-calendar";
import { pmocApi, useQuery, type PmocDashboardExecution, type PmocPlan } from "@erp/api";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { EmptyState } from "@erp/ui/empty-state";
import { SkeletonList } from "@erp/ui/skeletons";
import { ErrorState } from "@erp/ui/states";
import { StatusChip } from "@erp/ui/status-chip";

export default function PmocPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("OWNER", "MANAGER");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [wizard, setWizard] = useState(false);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<"overview" | "schedule">("overview");
  const [executionSearch, setExecutionSearch] = useState("");
  const [executionStatus, setExecutionStatus] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const calendarRange = useMemo(() => ({
    from: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).toISOString(),
    to: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0, 23, 59, 59, 999).toISOString(),
  }), [calendarMonth]);
  const plans = useQuery((signal) => pmocApi.listPmoc({ page, limit, signal }), [page, limit, tick]);
  const stats = useQuery((signal) => pmocApi.getPmocStats({ ...calendarRange, signal }), [calendarRange.from, calendarRange.to, tick]);
  const filterExecutions = (items: PmocDashboardExecution[]) => items.filter((item) => {
    const query = executionSearch.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = !query || [item.pmocNumber, item.customer.name, item.customer.tradeName, ...item.equipments.map((equipment) => equipment.name)].filter(Boolean).some((value) => String(value).toLocaleLowerCase("pt-BR").includes(query));
    return matchesSearch && (!executionStatus || item.indicator === executionStatus);
  });
  const upcoming = filterExecutions(stats.data?.upcoming ?? []);
  const recent = filterExecutions(stats.data?.recent ?? []);

  return <div className="space-y-6">
    <PageHeader eyebrow="Operação" title="PMOC" description="Planejamento, execuções e conformidade em um único fluxo operacional."
      actions={canEdit ? <button className={primary} onClick={() => setWizard(true)}><Plus className="h-4 w-4" /> Novo PMOC</button> : <StatusChip tone="info">Somente leitura</StatusChip>} />

    <nav className="flex gap-1 border-b border-[var(--color-border)]" aria-label="Seções do PMOC">
      <button className={tabButton(tab === "overview")} onClick={() => setTab("overview")}>Visão geral</button>
      <button className={tabButton(tab === "schedule")} onClick={() => setTab("schedule")}>Agenda dos PMOCs</button>
    </nav>

    {tab === "overview" && <>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <Metric icon={ClipboardCheck} label="PMOCs ativos" value={stats.data?.activePmocs ?? 0} />
      <Metric icon={PauseCircle} label="PMOCs pausados" value={stats.data?.pausedPmocs ?? 0} tone="warning" />
      <Metric icon={ShieldAlert} label="PMOCs vencidos" value={stats.data?.expiredPmocs ?? 0} tone="danger" />
      <Metric icon={CalendarClock} label="Previstas no mês" value={stats.data?.executionsThisMonth ?? 0} />
      <Metric icon={CheckCircle2} label="Concluídas" value={stats.data?.completedExecutions ?? 0} tone="success" />
      <Metric icon={CalendarClock} label="Pendentes" value={stats.data?.pendingExecutions ?? 0} tone="warning" />
      <Metric icon={Ban} label="Canceladas" value={stats.data?.cancelledExecutions ?? 0} />
      <Metric icon={AlertTriangle} label="Com falha" value={stats.data?.failedExecutions ?? 0} tone="danger" />
    </div>

    {plans.loading && !plans.data ? <SkeletonList rows={6} /> : plans.error && !plans.data ? <ErrorState error={plans.error} onRetry={plans.refetch} /> : !plans.data?.items.length ? <EmptyState icon={ClipboardCheck} title="Nenhum PMOC cadastrado" description="Crie o primeiro plano para iniciar a sequência oficial de execuções." /> : <>
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Planos PMOC</h2><p className="text-sm text-[var(--color-muted-foreground)]">Acompanhe situação, próxima execução e progresso de cada plano.</p></div>{canEdit && <button className={primary} onClick={() => setWizard(true)}><Plus className="h-4 w-4" /> Novo PMOC</button>}</div>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{plans.data.items.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div>
      <Pagination pagination={plans.data.pagination} onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} />
    </>}
    </>}

    {tab === "schedule" && <div className="space-y-5">
      <PmocOperationalCalendar cursor={calendarMonth} items={stats.data?.calendar.items ?? []} loading={stats.loading} onMonthChange={setCalendarMonth} />
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><h2 className="font-semibold">Execuções do PMOC</h2><p className="text-sm text-[var(--color-muted-foreground)]">Consulte próximas atividades e o histórico recente sem sair da agenda.</p></div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" /><input value={executionSearch} onChange={(event) => setExecutionSearch(event.target.value)} className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent pl-9 pr-3 text-sm" placeholder="Buscar PMOC, cliente ou equipamento" /></label>
            <select value={executionStatus} onChange={(event) => setExecutionStatus(event.target.value)} className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm"><option value="">Todos os status</option><option value="SCHEDULED">Programada</option><option value="DUE_SOON">Próxima</option><option value="OVERDUE">Atrasada</option><option value="COMPLETED">Concluída</option><option value="FAILED">Com falha</option><option value="CANCELLED">Cancelada</option></select>
          </div>
        </div>
      </section>
      <div className="grid gap-4 xl:grid-cols-2">
        <ExecutionList title="Próximas execuções" items={upcoming} empty="Nenhuma próxima execução corresponde aos filtros." />
        <ExecutionList title="Últimas execuções" items={recent} empty="Nenhuma execução recente corresponde aos filtros." />
      </div>
    </div>}

    <PmocPlanWizard open={wizard} onClose={() => setWizard(false)} onCreated={() => setTick((value) => value + 1)} />
  </div>;
}

function PlanCard({ plan }: { plan: PmocPlan }) {
  const number = `PMOC-${String(plan.number).padStart(6, "0")}`;
  const overview = plan.overview;
  return <Link href={`/pmoc/${plan.id}`} className="group rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">{number}</p><h2 className="mt-1 font-semibold">{plan.maintenancePlan?.name ?? number}</h2><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{plan.customer?.tradeName ?? plan.customer?.name}</p></div>{plan.active ? <StatusChip tone={overview?.health.tone ?? (plan.operationalStatus === "PAUSED" ? "warning" : "success")}>{overview?.health.label ?? operationalStatusLabel(plan.operationalStatus)}</StatusChip> : <StatusChip tone="info">Finalizado</StatusChip>}</div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Info label="Periodicidade" value={periodicityLabel(plan.periodicity)} /><Info label="Programação" value={generationModeLabel(plan.generationMode)} /><Info label="Próxima execução" value={date(plan.nextExecutionDate)} /><Info label="Equipamentos" value={String(plan.equipments?.length ?? 1)} /></div>
    {overview && <div className="mt-4"><div className="mb-1 flex justify-between text-xs"><span>Execuções</span><strong>{overview.completedExecutions} / {overview.expectedExecutions}</strong></div><div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${overview.completionPercentage}%` }} /></div><p className="mt-1 text-[11px] text-[var(--color-muted-foreground)]">{overview.remainingExecutions} restantes · saúde {overview.health.score}/100</p></div>}
    <div className="mt-4 flex items-center justify-end gap-1 text-sm font-medium text-[var(--color-primary)]">Administrar plano <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></div>
  </Link>;
}
function ExecutionList({ title, items, empty }: { title: string; items: PmocDashboardExecution[]; empty: string }) { return <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"><h2 className="font-semibold">{title}</h2>{items.length ? <ul className="mt-3 divide-y divide-[var(--color-border)]">{items.map((item) => <li key={item.id}><Link href={`/pmoc/${item.pmocPlanId}?execution=${item.id}`} className="flex items-center gap-3 py-3 hover:text-[var(--color-primary)]"><span className={`h-2.5 w-2.5 rounded-full ${item.indicator === "OVERDUE" || item.indicator === "FAILED" ? "bg-red-500" : item.indicator === "DUE_SOON" ? "bg-amber-500" : item.indicator === "COMPLETED" ? "bg-blue-500" : "bg-emerald-500"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm">{item.pmocNumber} · Execução {String(item.executionNumber).padStart(3, "0")}</strong><StatusChip tone={executionTone(item.indicator)}>{executionIndicatorLabel(item.indicator)}</StatusChip></div><span className="block truncate text-xs text-[var(--color-muted-foreground)]">{item.customer.tradeName ?? item.customer.name} · {item.equipments.map((equipment) => equipment.name).join(", ")}</span></div><span className="text-xs tabular-nums">{date(item.executedAt ?? item.scheduledFor)}</span></Link></li>)}</ul> : <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{empty}</p>}</section>; }
function Metric({ icon: Icon, label, value, tone = "primary" }: { icon: typeof ClipboardCheck; label: string; value: number; tone?: "primary" | "success" | "warning" | "danger" }) { const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : "text-[var(--color-primary)]"; return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"><Icon className={`h-5 w-5 ${color}`} /><strong className="mt-3 block text-2xl tabular-nums">{value}</strong><span className="text-xs text-[var(--color-muted-foreground)]">{label}</span></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><span className="block text-xs text-[var(--color-muted-foreground)]">{label}</span><strong className="text-sm">{value}</strong></div>; }
function date(value: string | null) { return value ? new Date(value).toLocaleDateString("pt-BR") : "—"; }
function periodicityLabel(value: string) { return ({ WEEKLY: "Semanal", BIWEEKLY: "Quinzenal", MONTHLY: "Mensal", BIMONTHLY: "Bimestral", QUARTERLY: "Trimestral", FOUR_MONTHLY: "Quadrimestral", SEMIANNUAL: "Semestral", YEARLY: "Anual", CUSTOM: "Personalizada" } as Record<string, string>)[value] ?? value; }
function generationModeLabel(value: string) { return ({ AUTO: "Automática", MANUAL: "Com revisão", PAUSED: "Pausada" } as Record<string, string>)[value] ?? value; }
function operationalStatusLabel(value: string) { return ({ ACTIVE: "Ativo", PENDING: "Aguardando início", OVERDUE: "Atrasado", PAUSED: "Pausado", ERROR: "Requer atenção", EXPIRED: "Encerrado" } as Record<string, string>)[value] ?? "Em acompanhamento"; }
function executionIndicatorLabel(value: string) { return ({ SCHEDULED: "Programada", DUE_SOON: "Próxima", OVERDUE: "Atrasada", COMPLETED: "Concluída", FAILED: "Com falha", CANCELLED: "Cancelada" } as Record<string, string>)[value] ?? value; }
function executionTone(value: string): "success" | "warning" | "danger" | "info" { return value === "FAILED" || value === "OVERDUE" ? "danger" : value === "DUE_SOON" || value === "CANCELLED" ? "warning" : value === "COMPLETED" ? "success" : "info"; }
function tabButton(active: boolean) { return `px-4 py-3 text-sm font-medium ${active ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"}`; }
const primary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)]";
