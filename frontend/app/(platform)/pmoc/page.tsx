"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarClock, CheckCircle2, ChevronRight, ClipboardCheck, Plus, ShieldAlert } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { Pagination } from "@platform/components/pagination";
import { PmocPlanWizard } from "@platform/components/pmoc-plan-wizard";
import { pmocApi, useQuery, type PmocPlan } from "@erp/api";
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
  const plans = useQuery((signal) => pmocApi.listPmoc({ page, limit, signal }), [page, limit, tick]);
  const stats = useQuery((signal) => pmocApi.getPmocStats({ signal }), [tick]);

  return <div className="space-y-6">
    <PageHeader eyebrow="Operação" title="PMOC" description="Planejamento, execuções e conformidade em um único fluxo operacional."
      actions={canEdit ? <button className={primary} onClick={() => setWizard(true)}><Plus className="h-4 w-4" /> Novo PMOC</button> : <StatusChip tone="info">Somente leitura</StatusChip>} />

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={ClipboardCheck} label="PMOCs ativos" value={stats.data?.activePmocs ?? 0} />
      <Metric icon={CheckCircle2} label="Em conformidade" value={stats.data?.compliantPmocs ?? 0} tone="success" />
      <Metric icon={CalendarClock} label="Próximas execuções" value={stats.data?.upcomingExecutions ?? 0} />
      <Metric icon={ShieldAlert} label="Pendentes / vencidos" value={(stats.data?.pendingPmocs ?? 0) + (stats.data?.expiredPmocs ?? 0)} tone="danger" />
    </div>

    {plans.loading && !plans.data ? <SkeletonList rows={6} /> : plans.error && !plans.data ? <ErrorState error={plans.error} onRetry={plans.refetch} /> : !plans.data?.items.length ? <EmptyState icon={ClipboardCheck} title="Nenhum PMOC cadastrado" description="Crie o primeiro plano para iniciar a sequência oficial de execuções." /> : <>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{plans.data.items.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div>
      <Pagination pagination={plans.data.pagination} onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} />
    </>}

    <PmocPlanWizard open={wizard} onClose={() => setWizard(false)} onCreated={() => setTick((value) => value + 1)} />
  </div>;
}

function PlanCard({ plan }: { plan: PmocPlan }) {
  const number = `PMOC-${String(plan.number).padStart(6, "0")}`;
  return <Link href={`/pmoc/${plan.id}`} className="group rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">{number}</p><h2 className="mt-1 font-semibold">{plan.maintenancePlan?.name ?? number}</h2><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{plan.customer?.tradeName ?? plan.customer?.name}</p></div><StatusChip tone={plan.operationalStatus === "ERROR" || plan.operationalStatus === "OVERDUE" ? "danger" : plan.operationalStatus === "PAUSED" ? "warning" : "success"}>{plan.operationalStatus}</StatusChip></div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Info label="Periodicidade" value={plan.periodicity} /><Info label="Modo" value={plan.generationMode} /><Info label="Próxima execução" value={date(plan.nextExecutionDate)} /><Info label="Equipamentos" value={String(plan.equipments?.length ?? 1)} /></div>
    <div className="mt-4 flex items-center justify-end gap-1 text-sm font-medium text-[var(--color-primary)]">Administrar plano <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></div>
  </Link>;
}
function Metric({ icon: Icon, label, value, tone = "primary" }: { icon: typeof ClipboardCheck; label: string; value: number; tone?: "primary" | "success" | "danger" }) { const color = tone === "danger" ? "text-red-600" : tone === "success" ? "text-emerald-600" : "text-[var(--color-primary)]"; return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"><Icon className={`h-5 w-5 ${color}`} /><strong className="mt-3 block text-2xl tabular-nums">{value}</strong><span className="text-xs text-[var(--color-muted-foreground)]">{label}</span></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><span className="block text-xs text-[var(--color-muted-foreground)]">{label}</span><strong className="text-sm">{value}</strong></div>; }
function date(value: string | null) { return value ? new Date(value).toLocaleDateString("pt-BR") : "—"; }
const primary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)]";
