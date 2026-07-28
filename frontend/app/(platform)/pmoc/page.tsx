"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Ban, Building2, CalendarClock, CheckCircle2, ChevronRight, ClipboardCheck, PauseCircle, Plus, Search, ShieldAlert } from "lucide-react";
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

  // Distribuição por cliente: agrupa os planos da página atual e permite expandir
  // a lista de PMOCs de cada cliente (escala melhor conforme o volume cresce).
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (id: string) =>
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const customerGroups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; plans: PmocPlan[] }>();
    for (const plan of plans.data?.items ?? []) {
      const key = plan.customer?.id ?? "sem-cliente";
      const name = plan.customer?.tradeName ?? plan.customer?.name ?? "Sem cliente";
      if (!map.has(key)) map.set(key, { key, name, plans: [] });
      map.get(key)!.plans.push(plan);
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [plans.data]);

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
      <div><h2 className="font-semibold">Planos PMOC por cliente</h2><p className="text-sm text-[var(--color-muted-foreground)]">Clique em um cliente para ver seus PMOCs e abrir os detalhes de cada plano.</p></div>
      <div className="space-y-2">{customerGroups.map((group) => <CustomerGroup key={group.key} group={group} open={openGroups.has(group.key)} onToggle={() => toggleGroup(group.key)} />)}</div>
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

    <PmocPlanWizard configurationOnly open={wizard} onClose={() => setWizard(false)} onCreated={() => setTick((value) => value + 1)} />
  </div>;
}

function CustomerGroup({ group, open, onToggle }: { group: { key: string; name: string; plans: PmocPlan[] }; open: boolean; onToggle: () => void }) {
  const total = group.plans.length;
  const active = group.plans.filter((plan) => plan.active).length;
  const attention = group.plans.some((plan) => plan.active && ["OVERDUE", "ERROR"].includes(plan.operationalStatus));
  const paused = group.plans.some((plan) => plan.operationalStatus === "PAUSED");
  const nextExecution = group.plans
    .map((plan) => plan.nextExecutionDate)
    .filter((value): value is string => Boolean(value))
    .sort()[0] ?? null;
  const pending = group.plans.reduce((sum, plan) => sum + (plan.overview?.pendingExecutions ?? 0), 0);
  const tone = attention ? "danger" : paused ? "warning" : "success";
  const accent = attention ? "border-l-red-500" : paused ? "border-l-amber-500" : "border-l-emerald-500";
  return <div className={`overflow-hidden rounded-xl border border-[var(--color-border)] border-l-4 ${accent} bg-[var(--color-card)] shadow-[var(--shadow-card)]`}>
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-[var(--color-muted)]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><Building2 className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-[15px]">{group.name}</strong>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--color-muted-foreground)]">
          <span><strong className="text-[var(--color-foreground)] tabular-nums">{total}</strong> plano(s)</span>
          <span><strong className="text-[var(--color-foreground)] tabular-nums">{active}</strong> ativo(s)</span>
          {pending > 0 && <span className="text-amber-600"><strong className="tabular-nums">{pending}</strong> execução(ões) pendente(s)</span>}
          {nextExecution && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Próxima {date(nextExecution)}</span>}
        </div>
      </div>
      <StatusChip tone={tone}>{attention ? "Requer atenção" : paused ? "Pausado" : "Em dia"}</StatusChip>
      <ChevronRight className={`h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform ${open ? "rotate-90" : ""}`} />
    </button>
    {open && <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">{group.plans.map((plan) => <PlanRow key={plan.id} plan={plan} />)}</ul>}
  </div>;
}

function PlanRow({ plan }: { plan: PmocPlan }) {
  const number = `PMOC-${String(plan.number).padStart(6, "0")}`;
  const overview = plan.overview;
  return <li>
    <Link href={`/pmoc/${plan.id}`} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--color-muted)]">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--color-primary)]">{number}</span>
          <strong className="truncate text-sm">{plan.maintenancePlan?.name ?? number}</strong>
          {plan.active ? <StatusChip tone={overview?.health.tone ?? (plan.operationalStatus === "PAUSED" ? "warning" : "success")}>{overview?.health.label ?? operationalStatusLabel(plan.operationalStatus)}</StatusChip> : <StatusChip tone="info">Finalizado</StatusChip>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--color-muted-foreground)]">
          <span>{periodicityLabel(plan.periodicity)}</span>
          <span>{generationModeLabel(plan.generationMode)}</span>
          <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {date(plan.nextExecutionDate)}</span>
          <span>{plan.equipments?.length ?? 1} equip.</span>
        </div>
        {overview && <div className="flex items-center gap-2">
          <div className="h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-[var(--color-muted)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${overview.completionPercentage}%` }} /></div>
          <span className="text-[11px] tabular-nums text-[var(--color-muted-foreground)]">{overview.completedExecutions}/{overview.expectedEquipmentExecutions} · saúde {overview.health.score}/100</span>
        </div>}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition group-hover:translate-x-0.5" />
    </Link>
  </li>;
}
function ExecutionList({ title, items, empty }: { title: string; items: PmocDashboardExecution[]; empty: string }) { return <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"><h2 className="font-semibold">{title}</h2>{items.length ? <ul className="mt-3 divide-y divide-[var(--color-border)]">{items.map((item) => <li key={item.id}><Link href={`/pmoc/${item.pmocPlanId}?execution=${item.id}`} className="flex items-center gap-3 py-3 hover:text-[var(--color-primary)]"><span className={`h-2.5 w-2.5 rounded-full ${item.indicator === "OVERDUE" || item.indicator === "FAILED" ? "bg-red-500" : item.indicator === "DUE_SOON" ? "bg-amber-500" : item.indicator === "COMPLETED" ? "bg-blue-500" : "bg-emerald-500"}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm">{item.pmocNumber} · Execução {String(item.equipmentExecutionNumber).padStart(3, "0")}</strong><StatusChip tone={executionTone(item.indicator)}>{executionIndicatorLabel(item.indicator)}</StatusChip></div><span className="block truncate text-xs text-[var(--color-muted-foreground)]">{item.customer.tradeName ?? item.customer.name} · {item.equipments.map((equipment) => equipment.name).join(", ")}</span></div><span className="text-xs tabular-nums">{date(item.executedAt ?? item.scheduledFor)}</span></Link></li>)}</ul> : <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">{empty}</p>}</section>; }
function Metric({ icon: Icon, label, value, tone = "primary" }: { icon: typeof ClipboardCheck; label: string; value: number; tone?: "primary" | "success" | "warning" | "danger" }) { const color = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : "text-[var(--color-primary)]"; return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"><Icon className={`h-5 w-5 ${color}`} /><strong className="mt-3 block text-2xl tabular-nums">{value}</strong><span className="text-xs text-[var(--color-muted-foreground)]">{label}</span></div>; }
function date(value: string | null) { return value ? new Date(value).toLocaleDateString("pt-BR") : "—"; }
function periodicityLabel(value: string) { return ({ WEEKLY: "Semanal", BIWEEKLY: "Quinzenal", MONTHLY: "Mensal", BIMONTHLY: "Bimestral", QUARTERLY: "Trimestral", FOUR_MONTHLY: "Quadrimestral", SEMIANNUAL: "Semestral", YEARLY: "Anual", CUSTOM: "Personalizada" } as Record<string, string>)[value] ?? value; }
function generationModeLabel(value: string) { return ({ AUTO: "Automática", MANUAL: "Com revisão", PAUSED: "Pausada" } as Record<string, string>)[value] ?? value; }
function operationalStatusLabel(value: string) { return ({ ACTIVE: "Ativo", PENDING: "Aguardando início", OVERDUE: "Cobertura encerrada com pendências", PAUSED: "Pausado", ERROR: "Requer atenção", EXPIRED: "Encerrado", COMPLETED: "Finalizado" } as Record<string, string>)[value] ?? "Em acompanhamento"; }
function executionIndicatorLabel(value: string) { return ({ SCHEDULED: "Programada", DUE_SOON: "Próxima", OVERDUE: "Atrasada", COMPLETED: "Concluída", FAILED: "Com falha", CANCELLED: "Cancelada" } as Record<string, string>)[value] ?? value; }
function executionTone(value: string): "success" | "warning" | "danger" | "info" { return value === "FAILED" || value === "OVERDUE" ? "danger" : value === "DUE_SOON" || value === "CANCELLED" ? "warning" : value === "COMPLETED" ? "success" : "info"; }
function tabButton(active: boolean) { return `px-4 py-3 text-sm font-medium ${active ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"}`; }
const primary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)]";
