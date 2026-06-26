"use client";

import { useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DashboardSection } from "@platform/components/dashboard-section";
import { MetricCard } from "@erp/ui/metric-card";
import { ExportButton } from "@platform/components/export-button";
import { SkeletonCard } from "@erp/ui/skeletons";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { Gate } from "@erp/ui/auth/gate";
import { financialApi, useQuery, type FinancialData } from "@erp/api";
import { formatCurrencyBRL } from "@erp/utils";

const PERIODS = ["7 dias", "30 dias", "90 dias"] as const;

export default function FinancialPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("30 dias");
  const fin = useQuery<FinancialData>((signal) => financialApi.getFinancial({ signal }), []);

  const finance = fin.data?.finance;
  const entries = useMemo(() => finance?.entries ?? [], [finance]);

  const metrics = useMemo(() => {
    if (!finance) return null;
    const { entradas, saidas, despesas, projecao30Dias } = finance.summary;
    const lucro = entradas - saidas - despesas;
    const entryCount = entries.filter((e) => e.kind === "ENTRY").length;
    const ticketMedio = entryCount > 0 ? entradas / entryCount : 0;
    const margem = entradas > 0 ? (lucro / entradas) * 100 : 0;
    const cobertura = despesas > 0 ? (entradas / despesas) * 100 : 0;
    return { entradas, saidas, despesas, projecao30Dias, lucro, ticketMedio, margem, cobertura };
  }, [finance, entries]);

  return (
    <Gate
      roles={["OWNER", "MANAGER"]}
      permission="canFinancial"
      fallback={
        <div className="max-w-[1440px]">
          <PageHeader eyebrow="Visão financeira" title="Financeiro" description="Acesso restrito." />
          <ComingSoonState title="Sem permissão" description="Seu perfil não tem acesso às informações financeiras." />
        </div>
      }
    >
      <div className="space-y-8 max-w-[1440px]">
        <PageHeader
          eyebrow={<span className="inline-flex items-center gap-1.5"><Wallet className="h-3 w-3" /> Visão financeira</span>}
          title="Financeiro"
          description="Indicadores consumidos do Demo Dataset (domínio financeiro definitivo é escopo futuro)."
          actions={
            <>
              <div className="inline-flex rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`px-3 h-9 text-sm transition-colors ${period === p ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "hover:bg-[var(--color-muted)]"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <ExportButton
                label="Exportar"
                fileName="financeiro-lancamentos"
                rows={entries.map((e) => ({ tipo: e.kind === "ENTRY" ? "Entrada" : "Despesa", descricao: e.description, valor: e.amount }))}
              />
            </>
          }
        />

        {fin.loading && !fin.data ? (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : fin.error && !fin.data ? (
          <ErrorState error={fin.error} onRetry={fin.refetch} />
        ) : fin.data?.disabled || !metrics ? (
          <ComingSoonState
            title="Financeiro em breve"
            description="O Demo Dataset está desabilitado e ainda não existe domínio financeiro de produção. Ative o Demo Dataset para visualizar dados de desenvolvimento."
          />
        ) : (
          <>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
              <MetricCard label="Receita recebida" value={formatCurrencyBRL(metrics.entradas)} delta={period} trend="up" icon="TrendingUp" />
              <MetricCard label="Saídas" value={formatCurrencyBRL(metrics.saidas)} delta={period} trend="down" icon="TrendingDown" />
              <MetricCard label="Despesas" value={formatCurrencyBRL(metrics.despesas)} delta={period} trend="down" icon="Wallet" />
              <MetricCard label="Receita prevista" value={formatCurrencyBRL(metrics.projecao30Dias)} delta="30 dias" trend="up" icon="LineChart" />
              <MetricCard label="Ticket médio" value={formatCurrencyBRL(metrics.ticketMedio)} delta="por entrada" trend="flat" icon="Receipt" />
              <MetricCard label="Margem operacional" value={`${Math.round(metrics.margem)}%`} delta="resultado" trend={metrics.margem >= 0 ? "up" : "down"} icon="Percent" />
            </div>

            {/* Comparativo + Resultado — mesma altura lado a lado */}
            <div className="grid gap-6 lg:grid-cols-3 items-stretch">
              <DashboardSection title="Comparativo do período" className="lg:col-span-2">
                <div className="h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] flex flex-col">
                  <ComparativeChart entradas={metrics.entradas} saidas={metrics.saidas} despesas={metrics.despesas} />
                </div>
              </DashboardSection>

              <DashboardSection title="Resultado">
                <div className="h-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] flex flex-col justify-center gap-5">
                  <Indicator label="Lucro estimado" value={formatCurrencyBRL(metrics.lucro)} tone={metrics.lucro >= 0 ? "up" : "down"} />
                  <Indicator label="Margem" value={`${Math.round(metrics.margem)}%`} tone={metrics.margem >= 0 ? "up" : "down"} />
                  <Indicator label="Cobertura de despesas" value={`${Math.round(metrics.cobertura)}%`} tone="up" />
                </div>
              </DashboardSection>
            </div>

            <DashboardSection title={`Lançamentos (${entries.length})`}>
              {entries.length === 0 ? (
                <ComingSoonState title="Sem lançamentos" description="Nenhum lançamento no período." />
              ) : (
                <ul className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] divide-y divide-[var(--color-border)]">
                  {entries.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 p-3.5">
                      {e.kind === "ENTRY" ? (
                        <ArrowUpCircle className="h-5 w-5 text-[var(--color-success)]" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-[var(--color-danger)]" />
                      )}
                      <span className="text-sm font-medium flex-1 truncate">{e.description}</span>
                      <span className={`font-mono text-sm tabular-nums ${e.kind === "ENTRY" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                        {e.kind === "ENTRY" ? "+" : "-"}{formatCurrencyBRL(e.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardSection>
          </>
        )}
      </div>
    </Gate>
  );
}

function ComparativeChart({ entradas, saidas, despesas }: { entradas: number; saidas: number; despesas: number }) {
  const max = Math.max(entradas, saidas, despesas, 1);
  const bars = [
    { label: "Entradas", value: entradas, color: "var(--color-success)" },
    { label: "Saídas", value: saidas, color: "var(--color-danger)" },
    { label: "Despesas", value: despesas, color: "var(--color-warning)" },
  ];
  return (
    <div className="flex-1 flex items-end gap-6 min-h-[200px]">
      {bars.map((b) => (
        <div key={b.label} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
          <span className="font-mono text-xs tabular-nums text-[var(--color-muted-foreground)]">{formatCurrencyBRL(b.value)}</span>
          <div className="w-full max-w-[80px] rounded-t-[var(--radius-sm)] transition-all" style={{ height: `${(b.value / max) * 100}%`, backgroundColor: b.color, minHeight: 4 }} />
          <span className="text-caption">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function Indicator({ label, value, tone }: { label: string; value: string; tone: "up" | "down" }) {
  const Icon = tone === "up" ? TrendingUp : TrendingDown;
  const color = tone === "up" ? "text-[var(--color-success)]" : "text-[var(--color-danger)]";
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-caption">{label}</div>
        <div className="text-section-title mt-0.5">{value}</div>
      </div>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
  );
}
