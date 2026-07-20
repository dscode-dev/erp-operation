"use client";

/**
 * Dashboard V2 — visão executiva.
 *
 * Linha 1: Resumo executivo (KPIs clicáveis).
 * Linha 2: Comparativo operacional (mês atual × anterior) | Saúde financeira (gráfico único).
 * Linha 3: Cobertura de atividades (radar mês anterior × atual) | Atividades relevantes e recentes.
 * Linha 4: Timeline operacional (Hoje / 7 dias) | Carga por operador.
 * Consome apenas domínios e componentes já existentes — sem novas regras.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, Clock, FileText, RefreshCw, ShieldCheck, Users, Wrench } from "lucide-react";
import { DashboardSection } from "@platform/components/dashboard-section";
import { GreetingHeader } from "@platform/components/greeting-header";
import { MetricCard } from "@erp/ui/metric-card";
import { SkeletonCard, SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { StatusChip } from "@erp/ui/status-chip";
import { Gate } from "@erp/ui/auth/gate";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { OPERATION_STATUS, OPERATION_TYPE_LABEL, operationCode } from "@erp/ui/operations/operation-shared";
import {
  assetLifecycleApi,
  assignmentsApi,
  documentsApi,
  financialApi,
  operationApi,
  pmocApi,
  useQuery,
  type AssetLifecycleEvent,
  type Assignment,
  type DocumentKind,
  type FinancialStats,
  type OperationStats,
  type Paginated,
  type PmocStats,
} from "@erp/api";
import { firstName, formatDateTime, formatNumber } from "@erp/utils";

type TimelineRange = "today" | "7d";

export default function PlatformHome() {
  const { session, can, hasRole } = useAuth();
  const canSeeFinancial = hasRole("OWNER", "MANAGER") && can("canFinancial");

  const cur = useMemo(() => monthBounds(0), []);
  const prev = useMemo(() => monthBounds(-1), []);

  const operationStats = useQuery<OperationStats>((s) => operationApi.getOperationStats({ signal: s }), []);
  const timeline = useQuery<Paginated<Assignment>>((s) => assignmentsApi.listAssignments({ limit: 100, signal: s }), []);
  const completed = useQuery<Paginated<Assignment>>((s) => assignmentsApi.listAssignments({ status: "COMPLETED", limit: 100, signal: s }), []);
  const pmocStats = useQuery<PmocStats>((s) => pmocApi.getPmocStats({ signal: s }), []);
  const lifecycle = useQuery((s) => assetLifecycleApi.listLifecycle({ limit: 10, signal: s }), []);
  const financial = useQuery<FinancialStats | null>((s) => (canSeeFinancial ? financialApi.getStats({ signal: s }) : Promise.resolve(null)), [canSeeFinancial]);
  const receivablesPending = useQuery<number | null>(
    (s) => (canSeeFinancial ? financialApi.listEntries({ type: "RECEIVABLE", status: "PENDING", limit: 1, signal: s }).then((r) => r.pagination.total) : Promise.resolve(null)),
    [canSeeFinancial],
  );

  // Contagens exatas por período (Document Engine) para comparativo e radar.
  const osCur = useHandoffCount("WORK_ORDER", cur);
  const osPrev = useHandoffCount("WORK_ORDER", prev);
  const visitCur = useHandoffCount("TECHNICAL_REPORT", cur);
  const visitPrev = useHandoffCount("TECHNICAL_REPORT", prev);
  const pmocCur = useHandoffCount("PMOC", cur);
  const pmocPrev = useHandoffCount("PMOC", prev);
  const laudoCur = useHandoffCount("TECHNICAL_OPINION", cur);
  const laudoPrev = useHandoffCount("TECHNICAL_OPINION", prev);
  const budgetCur = useHandoffCount("BUDGET", cur);
  const budgetPrev = useHandoffCount("BUDGET", prev);
  const receiptCur = useHandoffCount("RECEIPT", cur);
  const receiptPrev = useHandoffCount("RECEIPT", prev);

  const byStatus = operationStats.data?.byStatus;
  const open = (byStatus?.DRAFT ?? 0) + (byStatus?.PENDING ?? 0);
  const inProgress = byStatus?.IN_PROGRESS ?? 0;
  const review = byStatus?.REVIEW ?? 0;

  const completedItems = completed.data?.items ?? [];
  const finishedToday = completedItems.filter((a) => isToday(a.completedAt)).length;
  const opsConcludedCur = completedItems.filter((a) => inMonth(a.completedAt, cur)).length;
  const opsConcludedPrev = completedItems.filter((a) => inMonth(a.completedAt, prev)).length;

  const workload = useMemo(() => buildWorkload(timeline.data?.items ?? []), [timeline.data]);
  const comparisonLoading = osCur.loading || visitCur.loading || pmocCur.loading || (completed.loading && !completed.data);
  const radarLoading = comparisonLoading || laudoCur.loading || budgetCur.loading || receiptCur.loading;

  function refreshAll() {
    operationStats.refetch(); timeline.refetch(); completed.refetch(); pmocStats.refetch(); lifecycle.refetch(); financial.refetch(); receivablesPending.refetch();
    osCur.refetch(); osPrev.refetch(); visitCur.refetch(); visitPrev.refetch(); pmocCur.refetch(); pmocPrev.refetch();
    laudoCur.refetch(); laudoPrev.refetch(); budgetCur.refetch(); budgetPrev.refetch(); receiptCur.refetch(); receiptPrev.refetch();
  }

  return (
    <div className="space-y-6 max-w-[1500px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <GreetingHeader name={firstName(session?.user.name ?? "Equipe")} pending={open + review} />
        <button type="button" className="btn-secondary self-start" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {/* Linha 1 — Resumo executivo */}
      <DashboardSection title="Resumo executivo">
        {operationStats.loading && !operationStats.data ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Kpi href="/operacoes?status=PENDING" label="Operações em aberto" value={open} icon="ClipboardList" trend={open > 0 ? "up" : "flat"} />
            <Kpi href="/operacoes?status=IN_PROGRESS" label="Em andamento" value={inProgress} icon="Activity" trend={inProgress > 0 ? "up" : "flat"} />
            <Kpi href="/operacoes?status=REVIEW" label="Aguardando revisão" value={review} icon="Clock" trend={review > 0 ? "down" : "flat"} />
            <Kpi href="/operacoes?status=COMPLETED" label="Finalizadas hoje" value={finishedToday} icon="CheckCircle2" trend="up" />
            <Kpi href="/pmoc" label="PMOCs pendentes" value={pmocStats.data?.pendingExecutions ?? 0} icon="ShieldCheck" trend={(pmocStats.data?.pendingExecutions ?? 0) > 0 ? "down" : "flat"} />
            {canSeeFinancial ? (
              <Kpi href="/financial?type=RECEIVABLE&status=PENDING" label="Recebimentos pendentes" value={receivablesPending.data ?? 0} icon="Wallet" trend={(receivablesPending.data ?? 0) > 0 ? "down" : "flat"} />
            ) : (
              <MetricCard label="Recebimentos pendentes" value="restrito" delta="acesso financeiro" icon="Lock" />
            )}
          </div>
        )}
      </DashboardSection>

      {/* Linha 2 — Comparativo operacional | Saúde financeira */}
      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSection title="Comparativo operacional" action={<span className="text-caption">mês atual × anterior</span>}>
          <OperationalComparison
            loading={comparisonLoading}
            rows={[
              { label: "Operações concluídas", current: opsConcludedCur, previous: opsConcludedPrev },
              { label: "Ordens de Serviço", current: osCur.total, previous: osPrev.total },
              { label: "PMOCs", current: pmocCur.total, previous: pmocPrev.total },
              { label: "Visitas Técnicas", current: visitCur.total, previous: visitPrev.total },
            ]}
          />
        </DashboardSection>

        <Gate roles={["OWNER", "MANAGER"]} permission="canFinancial" fallback={<DashboardSection title="Saúde financeira"><EmptyState icon={FileText} title="Financeiro restrito" description="Seu perfil não possui acesso aos indicadores financeiros." /></DashboardSection>}>
          <DashboardSection title="Saúde financeira" action={<Link href="/financial" className="text-xs font-medium text-[var(--color-primary)] hover:underline">abrir financeiro</Link>}>
            <FinancialHealth loading={financial.loading && !financial.data} error={financial.error} onRetry={financial.refetch} stats={financial.data} />
          </DashboardSection>
        </Gate>
      </div>

      {/* Linha 3 — Radar de cobertura | Atividades relevantes e recentes */}
      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.72fr)_1.28fr]">
        <DashboardSection title="Cobertura de atividades" action={<span className="text-caption">mês atual × anterior</span>}>
          <ActivityCoverage
            loading={radarLoading}
            axes={[
              { label: "OS", current: osCur.total, previous: osPrev.total },
              { label: "Visitas", current: visitCur.total, previous: visitPrev.total },
              { label: "Laudos", current: laudoCur.total, previous: laudoPrev.total },
              { label: "PMOC", current: pmocCur.total, previous: pmocPrev.total },
              { label: "Orçamentos", current: budgetCur.total, previous: budgetPrev.total },
              { label: "Recibos", current: receiptCur.total, previous: receiptPrev.total },
            ]}
          />
        </DashboardSection>

        <DashboardSection title="Atividades relevantes e recentes" action={<Link href="/equipamentos" className="text-xs font-medium text-[var(--color-primary)] hover:underline">ver ativos</Link>}>
          <RecentActivity loading={lifecycle.loading && !lifecycle.data} error={lifecycle.error} onRetry={lifecycle.refetch} events={lifecycle.data?.items ?? []} />
        </DashboardSection>
      </div>

      {/* Linha 4 — Timeline operacional | Carga por operador */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <DashboardSection title="Timeline operacional">
          <OperationalTimeline loading={timeline.loading && !timeline.data} error={timeline.error} onRetry={timeline.refetch} assignments={timeline.data?.items ?? []} />
        </DashboardSection>

        <DashboardSection title="Carga por operador" action={<span className="text-caption">agenda ativa</span>}>
          <OperatorWorkload loading={timeline.loading && !timeline.data} items={workload} />
        </DashboardSection>
      </div>
    </div>
  );
}

/* ---------- KPI ---------- */

function Kpi({ href, label, value, icon, trend }: { href: string; label: string; value: number; icon: Parameters<typeof MetricCard>[0]["icon"]; trend?: "up" | "down" | "flat" }) {
  return (
    <Link href={href} className="block rounded-[var(--radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/40 transition hover:-translate-y-0.5">
      <MetricCard label={label} value={formatNumber(value)} delta="ver detalhes" trend={trend} icon={icon} />
    </Link>
  );
}

/* ---------- Linha 2: Comparativo operacional ---------- */

function OperationalComparison({ loading, rows }: { loading: boolean; rows: Array<{ label: string; current: number; previous: number }> }) {
  if (loading) return <SkeletonCard />;
  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex justify-end gap-4 text-caption">
        <Legend color="var(--color-primary)" label="Mês atual" />
        <Legend color="var(--color-muted-foreground)" label="Mês anterior" />
      </div>
      {rows.map((row) => {
        const max = Math.max(row.current, row.previous, 1);
        const delta = row.current - row.previous;
        return (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="inline-flex items-center gap-2 tabular-nums">
                <span className="font-semibold">{formatNumber(row.current)}</span>
                <DeltaBadge delta={delta} />
              </span>
            </div>
            <div className="space-y-1">
              <div className="h-2.5 rounded-full bg-[var(--color-muted)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${(row.current / max) * 100}%` }} /></div>
              <div className="h-2.5 rounded-full bg-[var(--color-muted)]"><div className="h-full rounded-full bg-[var(--color-muted-foreground)]/60" style={{ width: `${(row.previous / max) * 100}%` }} /></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-caption">—</span>;
  const up = delta > 0;
  return <span className={`text-xs font-semibold ${up ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>{up ? "+" : ""}{formatNumber(delta)}</span>;
}

/* ---------- Linha 2: Saúde financeira (gráfico único) ---------- */

function FinancialHealth({ loading, error, onRetry, stats }: { loading: boolean; error: unknown; onRetry: () => void; stats: FinancialStats | null }) {
  if (loading) return <SkeletonCard />;
  if (error) return <ErrorState error={error} onRetry={onRetry} title="Financeiro indisponível" />;
  const flow = (stats?.monthlyFlow ?? []).map((m) => ({ month: shortMonth(m.month), income: Number(m.income), expenses: Number(m.expenses), balance: Number(m.balance) }));
  if (flow.length === 0) return <EmptyState icon={FileText} title="Sem histórico financeiro" description="Ainda não há lançamentos suficientes para a evolução." />;
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-wrap gap-4 text-caption">
        <Legend color="var(--color-primary)" label="Receitas" />
        <Legend color="var(--color-danger)" label="Despesas" />
        <Legend color="var(--color-foreground)" label="Saldo" />
      </div>
      <EvolutionChart data={flow} />
    </div>
  );
}

function EvolutionChart({ data }: { data: Array<{ month: string; income: number; expenses: number; balance: number }> }) {
  const W = 620;
  const H = 220;
  const padX = 36;
  const padY = 24;
  const values = data.flatMap((d) => [d.income, d.expenses, d.balance]);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const spanRange = max - min || 1;
  const x = (i: number) => padX + (i * (W - padX * 2)) / Math.max(1, data.length - 1);
  const y = (v: number) => H - padY - ((v - min) / spanRange) * (H - padY * 2);
  const line = (key: "income" | "expenses" | "balance") => data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(" ");
  const zeroY = y(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Evolução de receitas, despesas e saldo">
      {[0, 0.5, 1].map((p) => <line key={p} x1={padX} x2={W - padX} y1={padY + p * (H - padY * 2)} y2={padY + p * (H - padY * 2)} stroke="var(--color-border)" strokeDasharray="3 3" />)}
      {min < 0 && <line x1={padX} x2={W - padX} y1={zeroY} y2={zeroY} stroke="var(--color-muted-foreground)" strokeWidth="1" />}
      <path d={line("income")} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={line("expenses")} fill="none" stroke="var(--color-danger)" strokeOpacity="0.8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={line("balance")} fill="none" stroke="var(--color-foreground)" strokeOpacity="0.65" strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.income)} r={2.5} fill="var(--color-primary)" />)}
      {data.map((d, i) => <text key={d.month + i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--color-muted-foreground)">{d.month}</text>)}
    </svg>
  );
}

/* ---------- Linha 3: Cobertura de atividades (radar/teia de aranha) ---------- */

function ActivityCoverage({ loading, axes }: { loading: boolean; axes: Array<{ label: string; current: number; previous: number }> }) {
  if (loading) return <SkeletonCard />;
  const empty = axes.every((a) => a.current === 0 && a.previous === 0);
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex justify-center gap-4 text-caption">
        <Legend color="var(--color-primary)" label="Mês atual" />
        <Legend color="var(--color-muted-foreground)" label="Mês anterior" />
      </div>
      {empty ? (
        <EmptyState icon={FileText} title="Sem atividades no período" description="Nenhum documento emitido no mês atual ou anterior." />
      ) : (
        <RadarChart axes={axes} />
      )}
    </div>
  );
}

function RadarChart({ axes }: { axes: Array<{ label: string; current: number; previous: number }> }) {
  const size = 260;
  const c = size / 2;
  const radius = c - 44;
  const n = axes.length;
  const max = Math.max(...axes.flatMap((a) => [a.current, a.previous]), 1);
  const angle = (i: number) => (-90 + (i * 360) / n) * (Math.PI / 180);
  const point = (value: number, i: number) => {
    const r = (value / max) * radius;
    return [c + r * Math.cos(angle(i)), c + r * Math.sin(angle(i))] as const;
  };
  const polygon = (key: "current" | "previous") => axes.map((a, i) => point(a[key], i).map((v) => v.toFixed(1)).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[300px]" role="img" aria-label="Radar de cobertura de atividades">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => { const [px, py] = [c + ring * radius * Math.cos(angle(i)), c + ring * radius * Math.sin(angle(i))]; return `${px.toFixed(1)},${py.toFixed(1)}`; }).join(" ")}
          fill="none"
          stroke="var(--color-border)"
          strokeDasharray="2 3"
        />
      ))}
      {axes.map((_, i) => { const [px, py] = point(max, i); return <line key={i} x1={c} y1={c} x2={px} y2={py} stroke="var(--color-border)" />; })}
      <polygon points={polygon("previous")} fill="var(--color-muted-foreground)" fillOpacity="0.1" stroke="var(--color-muted-foreground)" strokeOpacity="0.6" strokeWidth="1.5" />
      <polygon points={polygon("current")} fill="var(--color-primary)" fillOpacity="0.16" stroke="var(--color-primary)" strokeWidth="2" />
      {axes.map((a, i) => point(a.current, i)).map(([px, py], i) => <circle key={i} cx={px} cy={py} r={2.5} fill="var(--color-primary)" />)}
      {axes.map((a, i) => {
        const [lx, ly] = [c + (radius + 20) * Math.cos(angle(i)), c + (radius + 20) * Math.sin(angle(i))];
        const anchor = Math.abs(lx - c) < 8 ? "middle" : lx > c ? "start" : "end";
        return (
          <text key={a.label} x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" fontSize="10" fill="var(--color-muted-foreground)">
            {a.label} <tspan fill="var(--color-foreground)" fontWeight="600">{a.current}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

/* ---------- Linha 3: Atividades relevantes e recentes ---------- */

function RecentActivity({ loading, error, onRetry, events }: { loading: boolean; error: unknown; onRetry: () => void; events: AssetLifecycleEvent[] }) {
  if (loading) return <SkeletonList rows={6} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} title="Atividade indisponível" />;
  if (events.length === 0) return <EmptyState icon={ShieldCheck} title="Sem atividade recente" description="Nenhum evento relevante registrado até o momento." />;
  return (
    <ul className="max-h-[360px] overflow-y-auto divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]">
      {events.map((event) => (
        <li key={event.id} className="p-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${event.timeline.color}18`, color: event.timeline.color }}>
              {event.type === "DOCUMENT" ? <FileText className="h-4 w-4" /> : event.timeline.category === "maintenance" ? <Wrench className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
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

/* ---------- Linha 4: Timeline operacional ---------- */

function OperationalTimeline({ loading, error, onRetry, assignments }: { loading: boolean; error: unknown; onRetry: () => void; assignments: Assignment[] }) {
  const [range, setRange] = useState<TimelineRange>("today");
  const items = useMemo(() => {
    const withSchedule = assignments.filter((a) => Boolean(a.operation.scheduledFor));
    const filtered = withSchedule.filter((a) => (range === "today" ? isToday(a.operation.scheduledFor) : inNextDays(a.operation.scheduledFor, 7)));
    return filtered.sort((a, b) => (a.operation.scheduledFor ?? "").localeCompare(b.operation.scheduledFor ?? ""));
  }, [assignments, range]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["today", "7d"] as TimelineRange[]).map((key) => (
          <button key={key} type="button" onClick={() => setRange(key)} className={`h-8 rounded-[var(--radius-md)] px-3 text-xs font-medium ${range === key ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "border border-[var(--color-border)] hover:bg-[var(--color-muted)]"}`}>
            {key === "today" ? "Hoje" : "Próximos 7 dias"}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList rows={5} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRetry} title="Timeline indisponível" />
      ) : items.length === 0 ? (
        <EmptyState icon={CalendarClock} title={range === "today" ? "Sem operações hoje" : "Sem operações nos próximos 7 dias"} description="Nenhum atendimento agendado para o período." />
      ) : (
        <ul className="max-h-[420px] overflow-y-auto divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]">
          {items.map((a) => {
            const op = a.operation;
            const priority = priorityOf(op.scheduledFor, op.status);
            return (
              <li key={a.id}>
                <Link href={`/operacoes?operationId=${op.id}`} className="flex items-center gap-3 p-3 hover:bg-[var(--color-muted)] transition-colors">
                  <span className="flex w-14 shrink-0 flex-col items-center text-[var(--color-muted-foreground)]">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="mt-0.5 font-mono text-xs tabular-nums">{timeOf(op.scheduledFor)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{op.customer?.name ?? operationCode(op.number)}</span>
                    <span className="block text-caption truncate">{OPERATION_TYPE_LABEL[op.type]} · {a.assignee.name}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <StatusChip tone={OPERATION_STATUS[op.status].tone} dot>{OPERATION_STATUS[op.status].label}</StatusChip>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${priority.className}`}>{priority.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------- Linha 4: Carga por operador ---------- */

function OperatorWorkload({ loading, items }: { loading: boolean; items: Array<{ operator: string; count: number }> }) {
  if (loading) return <SkeletonList rows={4} />;
  if (items.length === 0) return <EmptyState icon={Users} title="Sem carga agendada" description="Nenhuma operação ativa atribuída a operadores." />;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      {items.map((item) => (
        <div key={item.operator} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="min-w-0 truncate font-medium">{item.operator}</span>
            <span className="tabular-nums font-semibold">{formatNumber(item.count)}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--color-muted)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${(item.count / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function buildWorkload(assignments: Assignment[]): Array<{ operator: string; count: number }> {
  const active = assignments.filter((a) => !["COMPLETED", "CANCELED", "REJECTED"].includes(a.status));
  const map = new Map<string, number>();
  for (const a of active) map.set(a.assignee.name, (map.get(a.assignee.name) ?? 0) + 1);
  return [...map.entries()].map(([operator, count]) => ({ operator, count })).sort((a, b) => b.count - a.count).slice(0, 6);
}

/* ---------- shared bits ---------- */

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />{label}</span>;
}

/* ---------- data helpers ---------- */

function useHandoffCount(type: DocumentKind, bounds: { from: string; to: string }) {
  const q = useQuery<number>((s) => documentsApi.listHandoffs({ type, from: bounds.from, to: bounds.to, limit: 1, signal: s }).then((r) => r.pagination.total), []);
  return { total: q.data ?? 0, loading: q.loading, refetch: q.refetch };
}

function priorityOf(scheduled: string | null, status: string): { label: string; className: string } {
  if (isOverdue(scheduled, status)) return { label: "Alta", className: "text-[var(--color-danger)]" };
  if (isToday(scheduled)) return { label: "Média", className: "text-[var(--color-warning)]" };
  return { label: "Normal", className: "text-[var(--color-muted-foreground)]" };
}

function isOverdue(scheduled: string | null, status: string): boolean {
  if (!scheduled || ["COMPLETED", "CANCELED"].includes(status)) return false;
  return new Date(scheduled).getTime() < Date.now();
}

function monthBounds(offset: number): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1, 0, 0, 0, 0);
  return { from: start.toISOString(), to: new Date(end.getTime() - 1).toISOString() };
}

function inMonth(iso: string | null, bounds: { from: string; to: string }): boolean {
  if (!iso) return false;
  return iso >= bounds.from && iso <= bounds.to;
}

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function inNextDays(iso: string | null, days: number): boolean {
  if (!iso) return false;
  const d = new Date(iso).getTime();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = start.getTime() + days * 24 * 60 * 60 * 1000;
  return d >= start.getTime() && d <= end;
}

function timeOf(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function shortMonth(month: string): string {
  const parsed = /^\d{4}-\d{2}$/.test(month) ? new Date(`${month}-01T00:00:00`) : new Date(month);
  if (Number.isNaN(parsed.getTime())) return month;
  return parsed.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}
