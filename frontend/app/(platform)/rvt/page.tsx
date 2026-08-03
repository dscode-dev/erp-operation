'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, ClipboardList, PauseCircle, Plus, Search } from 'lucide-react';
import { PageHeader } from '@platform/components/page-header';
import { Pagination } from '@platform/components/pagination';
import { RvtPlanWizard } from '@platform/components/rvt-plan-wizard';
import { rvtApi, useQuery, type RvtPlan, type RvtPlanStatus } from '@erp/api';
import { useAuth } from '@erp/ui/auth/auth-provider';
import { EmptyState } from '@erp/ui/empty-state';
import { SkeletonList } from '@erp/ui/skeletons';
import { ErrorState } from '@erp/ui/states';
import { StatusChip } from '@erp/ui/status-chip';

function RvtPageContent() {
  const params = useSearchParams();
  const { hasRole } = useAuth();
  const canEdit = hasRole('OWNER', 'MANAGER');
  const [page, setPage] = useState(1); const [limit, setLimit] = useState(12); const [search, setSearch] = useState(''); const [status, setStatus] = useState<RvtPlanStatus | ''>('');
  const [wizard, setWizard] = useState(params.get('create') === '1'); const [tick, setTick] = useState(0);
  const plans = useQuery((signal) => rvtApi.listPlans({ page, limit, search: search || undefined, status: status || undefined, signal }), [page, limit, search, status, tick]);
  const metrics = useMemo(() => ({ total: plans.data?.pagination.total ?? 0, active: plans.data?.items.filter((item) => item.status === 'ACTIVE').length ?? 0, paused: plans.data?.items.filter((item) => item.status === 'PAUSED').length ?? 0, completed: plans.data?.items.filter((item) => item.status === 'COMPLETED').length ?? 0 }), [plans.data]);
  return <div className="space-y-6"><PageHeader eyebrow="Operação" title="Relatórios de Visita Técnica" description="Configure coberturas e acompanhe cada relatório como uma execução independente." actions={canEdit ? <button className={primary} onClick={() => setWizard(true)}><Plus className="h-4 w-4" /> Nova configuração</button> : <StatusChip tone="info">Somente leitura</StatusChip>} />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={ClipboardList} label="Configurações" value={metrics.total} /><Metric icon={CalendarDays} label="Ativas nesta página" value={metrics.active} /><Metric icon={PauseCircle} label="Pausadas" value={metrics.paused} /><Metric icon={CheckCircle2} label="Concluídas" value={metrics.completed} /></div>
    <div className="flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-[var(--color-muted-foreground)]" /><input className={`${input} w-full pl-9`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por nome, número ou cliente" /></label><select className={input} value={status} onChange={(event) => { setStatus(event.target.value as RvtPlanStatus | ''); setPage(1); }}><option value="">Todos os status</option><option value="ACTIVE">Ativo</option><option value="PAUSED">Pausado</option><option value="COMPLETED">Concluído</option><option value="CANCELED">Cancelado</option></select></div>
    {plans.loading && !plans.data ? <SkeletonList rows={6} /> : plans.error && !plans.data ? <ErrorState error={plans.error} onRetry={plans.refetch} /> : !plans.data?.items.length ? <EmptyState icon={ClipboardList} title="Nenhum RVT configurado" description="Crie uma configuração para gerar as execuções previstas, sem emitir documento antecipadamente." /> : <><div className="grid gap-3 lg:grid-cols-2">{plans.data.items.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div><Pagination pagination={plans.data.pagination} onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} /></>}
    <RvtPlanWizard open={wizard} onClose={() => setWizard(false)} onSaved={() => setTick((value) => value + 1)} />
  </div>;
}

export default function RvtPage() { return <Suspense><RvtPageContent /></Suspense>; }
function PlanCard({ plan }: { plan: RvtPlan }) { return <Link href={`/rvt/${plan.id}`} className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 transition hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-card)]"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong>RVT-{String(plan.number).padStart(5, '0')}</strong><StatusChip tone={tone(plan.status)}>{statusLabel(plan.status)}</StatusChip></div><h2 className="mt-1 truncate font-medium">{plan.name}</h2><p className="text-caption">{plan.customer.tradeName ?? plan.customer.name} · {plan.maintenanceType === 'WEEKLY' ? 'Semanal' : 'Semestral'}</p><p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{plan.equipments.length} equipamento(s) · {plan._count?.executions ?? 0} execução(ões) · {date(plan.startDate)} a {date(plan.endDate)}</p></div><ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></div></Link>; }
function Metric({ icon: Icon, label, value }: { icon: typeof ClipboardList; label: string; value: number }) { return <div className="rounded-xl border bg-[var(--color-card)] p-4"><Icon className="h-5 w-5 text-[var(--color-primary)]" /><strong className="mt-3 block text-2xl">{value}</strong><span className="text-caption">{label}</span></div>; }
function date(value: string) { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value)); }
function statusLabel(value: RvtPlanStatus) { return ({ ACTIVE: 'Ativo', PAUSED: 'Pausado', COMPLETED: 'Concluído', CANCELED: 'Cancelado' } as const)[value]; }
function tone(value: RvtPlanStatus): 'success' | 'warning' | 'info' | 'danger' { return value === 'ACTIVE' ? 'success' : value === 'PAUSED' ? 'warning' : value === 'CANCELED' ? 'danger' : 'info'; }
const input = 'h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm';
const primary = 'inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)]';
