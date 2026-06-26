"use client";

import { useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { PageHeader } from "@/components/platform/page-header";
import { DashboardSection } from "@/components/platform/dashboard-section";
import { MetricCard } from "@/components/platform/metric-card";
import { ExportButton } from "@/components/platform/export-button";
import { SkeletonCard } from "@/components/shared/skeletons";
import { ComingSoonState, ErrorState } from "@/components/shared/states";
import { Gate } from "@/components/auth/gate";
import { financialApi, useQuery, type FinancialData } from "@/lib/api";
import { formatCurrencyBRL } from "@/lib/format";

const PERIODS = ["7 dias", "30 dias", "90 dias"] as const;

export default function FinancialPage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("30 dias");
  const fin = useQuery<FinancialData>((signal) => financialApi.getFinancial({ signal }), []);

  const finance = fin.data?.finance;
  const entries = useMemo(() => finance?.entries ?? [], [finance]);
  const lucro = finance ? finance.summary.entradas - finance.summary.saidas - finance.summary.despesas : 0;

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
                    className={`px-3 h-9 text-sm transition-colors ${
                      period === p ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "hover:bg-[var(--color-muted)]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <ExportButton
                label="Exportar"
                fileName="financeiro-lancamentos"
                rows={entries.map((e) => ({
                  tipo: e.kind === "ENTRY" ? "Entrada" : "Despesa",
                  descricao: e.description,
                  valor: e.amount,
                }))}
              />
            </>
          }
        />

        {fin.loading && !fin.data ? (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : fin.error && !fin.data ? (
          <ErrorState error={fin.error} onRetry={fin.refetch} />
        ) : fin.data?.disabled ? (
          <ComingSoonState
            title="Financeiro em breve"
            description="O Demo Dataset está desabilitado e ainda não existe domínio financeiro de produção. Ative o Demo Dataset para visualizar dados de desenvolvimento."
          />
        ) : finance ? (
          <>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Entradas" value={formatCurrencyBRL(finance.summary.entradas)} delta={period} trend="up" icon="TrendingUp" />
              <MetricCard label="Saídas" value={formatCurrencyBRL(finance.summary.saidas)} delta={period} trend="down" icon="TrendingDown" />
              <MetricCard label="Despesas" value={formatCurrencyBRL(finance.summary.despesas)} delta={period} trend="down" icon="Wallet" />
              <MetricCard label="Projeção 30 dias" value={formatCurrencyBRL(finance.summary.projecao30Dias)} delta="estimativa" trend="up" icon="LineChart" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <DashboardSection title="Comparativo do período" className="lg:col-span-2">
                <ComparativeChart
                  entradas={finance.summary.entradas}
                  saidas={finance.summary.saidas}
                  despesas={finance.summary.despesas}
                />
              </DashboardSection>

              <DashboardSection title="Resultado">
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] space-y-4">
                  <Indicator label="Lucro estimado" value={formatCurrencyBRL(lucro)} tone={lucro >= 0 ? "up" : "down"} />
                  <Indicator
                    label="Margem"
                    value={finance.summary.entradas > 0 ? `${Math.round((lucro / finance.summary.entradas) * 100)}%` : "—"}
                    tone={lucro >= 0 ? "up" : "down"}
                  />
                  <Indicator label="Cobertura de despesas" value={finance.summary.despesas > 0 ? `${Math.round((finance.summary.entradas / finance.summary.despesas) * 100)}%` : "—"} tone="up" />
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
        ) : null}
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
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-end gap-6 h-48">
        {bars.map((b) => (
          <div key={b.label} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
            <span className="font-mono text-xs tabular-nums text-[var(--color-muted-foreground)]">{formatCurrencyBRL(b.value)}</span>
            <div
              className="w-full max-w-[80px] rounded-t-[var(--radius-sm)] transition-all"
              style={{ height: `${(b.value / max) * 100}%`, backgroundColor: b.color, minHeight: 4 }}
            />
            <span className="text-caption">{b.label}</span>
          </div>
        ))}
      </div>
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
