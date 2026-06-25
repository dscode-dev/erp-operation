import { Wallet, TrendingUp, TrendingDown, Download } from "lucide-react";
import { PageHeader } from "@/components/platform/page-header";
import { DashboardSection } from "@/components/platform/dashboard-section";
import { MetricCard } from "@/components/platform/metric-card";
import { StatusPill } from "@/components/shared/status-pill";
import { RevenueChart } from "@/components/platform/revenue-chart";
import {
  financialMetrics,
  financialMonthly,
  financialReceivables,
  financialExpenses,
} from "@/mocks/data";

export default function FinancialPage() {
  const totalReceitas = financialReceivables.reduce((acc, r) => acc + parseFloat(r.amount.replace(/[^\d,]/g, "").replace(",", ".") || "0"), 0);

  return (
    <div className="space-y-8 max-w-[1440px]">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><Wallet className="h-3 w-3" /> Visão financeira</span>}
        title="Financeiro"
        description="Indicadores de receita, despesa e projeção do mês — visão simplificada do gestor."
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
              Junho · 2026
            </button>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]">
              <Download className="h-4 w-4" /> Exportar
            </button>
          </>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {financialMetrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardSection title="Receita vs Despesa (6 meses)" className="lg:col-span-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
            <RevenueChart data={financialMonthly} />
            <div className="mt-4 flex items-center gap-5 text-caption">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" /> Receita
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[var(--color-danger)]/70" /> Despesa
              </span>
            </div>
          </div>
        </DashboardSection>

        <DashboardSection title="Despesas por categoria">
          <ul className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] divide-y divide-[var(--color-border)]">
            {financialExpenses.map((e) => (
              <li key={e.id} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{e.label}</div>
                  <div className="text-caption">{e.category}</div>
                </div>
                <span className="font-mono text-sm tabular-nums">{e.amount}</span>
              </li>
            ))}
          </ul>
        </DashboardSection>
      </div>

      <DashboardSection
        title="Recebíveis"
        action={<span className="text-caption">total previsto · <span className="font-mono text-[var(--color-foreground)]">R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></span>}
      >
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-muted)]/40 text-[var(--color-muted-foreground)] text-[11px] uppercase tracking-wider">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Cliente</th>
                <th className="text-left font-medium px-4 py-2.5">Vencimento</th>
                <th className="text-right font-medium px-4 py-2.5">Valor</th>
                <th className="text-right font-medium px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {financialReceivables.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--color-muted)]/30">
                  <td className="px-4 py-3 font-medium">{r.client}</td>
                  <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{r.due}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{r.amount}</td>
                  <td className="px-4 py-3 text-right"><div className="inline-flex"><StatusPill status={r.status} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardSection>

      <div className="grid gap-3 sm:grid-cols-3">
        <Trend label="Tendência de receita" value="+12%" tone="up" />
        <Trend label="Ticket médio" value="R$ 1.840" tone="flat" />
        <Trend label="Inadimplência" value="2,1%" tone="down" />
      </div>
    </div>
  );
}

function Trend({ label, value, tone }: { label: string; value: string; tone: "up" | "down" | "flat" }) {
  const Icon = tone === "up" ? TrendingUp : tone === "down" ? TrendingDown : TrendingUp;
  const color = tone === "up" ? "text-[var(--color-success)]" : tone === "down" ? "text-[var(--color-danger)]" : "text-[var(--color-muted-foreground)]";
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] flex items-center justify-between">
      <div>
        <div className="text-caption">{label}</div>
        <div className="text-section-title mt-0.5">{value}</div>
      </div>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
  );
}
