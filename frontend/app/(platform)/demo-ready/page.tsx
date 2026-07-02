"use client";

/**
 * /demo-ready — modo de apresentação comercial.
 *
 * Não é uma tela falsa: organiza a experiência para demonstração, com contagens
 * ao vivo do backend/Demo Dataset e atalhos para cada área (Climatize).
 */
import Link from "next/link";
import {
  Building2, Users, Wrench, CalendarClock, ClipboardList, Package, ShoppingCart,
  BarChart3, FileText, QrCode, Smartphone, ArrowRight, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { SectionCard } from "@erp/ui/section-card";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonCard } from "@erp/ui/skeletons";
import { useAuth } from "@erp/ui/auth/auth-provider";
import {
  dashboardApi, operationsApi, procurementApi, useQuery,
  type DashboardData, type OrdersData, type ProductsData, type PurchaseOrderStats,
} from "@erp/api";
import { formatNumber } from "@erp/utils";

const JOURNEY: { label: string; hint: string; href: string }[] = [
  { label: "1. Dashboard", hint: "Visão geral da operação", href: "/" },
  { label: "2. Cliente", hint: "Carteira da Climatize", href: "/clientes" },
  { label: "3. Equipamento", hint: "Inventário + QR Code", href: "/equipamentos" },
  { label: "4. Operador (campo)", hint: "App mobile / PWA", href: "/operator" },
  { label: "5. Atendimento", hint: "Wizard com assinatura", href: "/operator/atendimento" },
  { label: "6. Serviços", hint: "Histórico operacional", href: "/servicos" },
  { label: "7. Documentos", hint: "Central documental", href: "/reports" },
  { label: "8. Download", hint: "Preview e download", href: "/documentos" },
];

export default function DemoReadyPage() {
  const { session, can } = useAuth();
  const dash = useQuery<DashboardData>((s) => dashboardApi.getDashboard({ signal: s }), []);
  const orders = useQuery<OrdersData>((s) => operationsApi.getOrders({ signal: s }), []);
  const products = useQuery<ProductsData>((s) => operationsApi.getProducts({ signal: s }), []);
  const purchases = useQuery<PurchaseOrderStats>((s) => procurementApi.getPurchaseOrderStats({ signal: s }), []);

  const org = session?.organization;
  const loading = dash.loading && !dash.data;

  const tiles: { label: string; value: string; href: string; icon: typeof Users; show?: boolean }[] = [
    { label: "Clientes", value: dash.data?.customers ? formatNumber(dash.data.customers.total) : "—", href: "/clientes", icon: Users },
    { label: "Equipamentos", value: dash.data?.equipments ? formatNumber(dash.data.equipments.total) : "—", href: "/equipamentos", icon: Wrench },
    { label: "Agenda", value: String(dash.data?.demo?.["demo.schedule.v1"].items.length ?? "—"), href: "/agenda", icon: CalendarClock },
    { label: "Ordens de Serviço", value: String(orders.data?.items.length ?? "—"), href: "/ordens", icon: ClipboardList },
    { label: "Produtos", value: String(products.data?.items.length ?? "—"), href: "/produtos", icon: Package },
    { label: "Compras", value: String(purchases.data?.total ?? "—"), href: "/purchase-orders", icon: ShoppingCart, show: can("canFinancial") },
    { label: "Relatórios", value: "3 categorias", href: "/reports", icon: BarChart3, show: can("canReports") },
    { label: "Documentos", value: "6 modelos", href: "/documentos", icon: FileText },
  ];

  const flow = [
    "Login no Operator",
    "Ver agenda do dia",
    "Escanear QR (simular)",
    "Abrir equipamento",
    "Iniciar atendimento",
    "Checklist + observação + foto",
    "Assinatura do cliente",
    "Resumo e envio",
  ];

  return (
    <div className="space-y-6 max-w-[1200px]">
      <PageHeader
        eyebrow="Apresentação comercial"
        title="Modo demo"
        description="Tudo pronto para demonstrar a plataforma e o app de campo ao cliente."
      />

      {/* Organização */}
      <SectionCard title="Empresa configurada" icon={Building2}>
        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--color-primary)] grid place-items-center text-white font-semibold">
              {(org?.tradeName ?? org?.legalName ?? "C").slice(0, 1)}
            </div>
            <div>
              <div className="font-semibold">{org?.tradeName ?? org?.legalName ?? "Climatize"}</div>
              <div className="text-caption">Segmento {org?.segment ?? "HVAC"} · identidade azul/branco aplicada</div>
            </div>
            <StatusChip tone="success" dot>Pronto para apresentação</StatusChip>
          </div>
        )}
      </SectionCard>

      {/* Jornada guiada da demonstração */}
      <SectionCard title="Roteiro da demonstração" icon={ArrowRight} description="Siga a jornada de ponta a ponta — parece um fluxo único.">
        <ol className="grid gap-2 sm:grid-cols-2">
          {JOURNEY.map((j, i) => (
            <li key={j.label}>
              <Link href={j.href} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 hover:bg-[var(--color-muted)] transition-colors">
                <span className="h-7 w-7 rounded-full bg-[var(--color-primary)] text-white grid place-items-center text-[12px] font-semibold shrink-0">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium truncate">{j.label}</span>
                  <span className="block text-caption truncate">{j.hint}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              </Link>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* Tiles */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {tiles.filter((t) => t.show !== false).map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.label} href={t.href} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">{t.label}</span>
                <Icon className="h-4 w-4 text-[var(--color-primary)]" />
              </div>
              <div className="mt-2 text-[20px] font-semibold tracking-tight">{loading ? "…" : t.value}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fluxo mobile */}
        <SectionCard title="Fluxo do Operador (campo)" icon={Smartphone}>
          <ol className="space-y-2">
            {flow.map((step, i) => (
              <li key={step} className="flex items-center gap-3 text-sm">
                <span className="h-6 w-6 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] grid place-items-center text-[11px] font-semibold shrink-0">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <Link href="/operator" className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-10 text-sm font-semibold">
            Abrir ERP Operador <ArrowRight className="h-4 w-4" />
          </Link>
        </SectionCard>

        {/* QR */}
        <SectionCard title="QR Code demo" icon={QrCode}>
          <ul className="space-y-2 text-sm">
            <Check>QR sempre visível no detalhe do equipamento (Platform)</Check>
            <Check>Copiar código e baixar QR como imagem</Check>
            <Check>Operador lê via simular / colar código / selecionar</Check>
            <Check>Abre o equipamento e inicia o atendimento</Check>
          </ul>
          <Link href="/equipamentos" className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-10 text-sm font-medium hover:bg-[var(--color-muted)]">
            Ver equipamentos <ArrowRight className="h-4 w-4" />
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
