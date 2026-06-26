"use client";

import Link from "next/link";
import { ClipboardList, FileBarChart, Wrench, ClipboardCheck, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/platform/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusChip } from "@/components/shared/status-chip";
import { Gate } from "@/components/auth/gate";

/**
 * Relatórios — arquitetura de categorias. Geração de documentos é escopo do
 * backend (Sprint 3). A categoria "Visita Técnica" já possui fluxo visual.
 */
const CATEGORIES = [
  {
    key: "operacionais",
    title: "Relatórios Operacionais",
    description: "Produtividade, atendimentos e indicadores de operação.",
    icon: FileBarChart,
    items: ["Resumo de atendimentos", "Produtividade por operador", "SLA e pendências"],
    href: null,
  },
  {
    key: "tecnicos",
    title: "Relatórios Técnicos",
    description: "Laudos técnicos e PMOC dos equipamentos.",
    icon: Wrench,
    items: ["Laudo técnico", "PMOC", "Histórico de manutenção"],
    href: null,
  },
  {
    key: "visita",
    title: "Relatórios de Visita Técnica",
    description: "Registro de visita em campo com fotos e assinatura.",
    icon: ClipboardCheck,
    items: ["Novo relatório de visita técnica"],
    href: "/reports/visita",
  },
] as const;

export default function ReportsPage() {
  return (
    <Gate
      permission="canReports"
      fallback={
        <div className="max-w-[1100px]">
          <PageHeader eyebrow="Gestão" title="Relatórios" description="Acesso restrito." />
          <SectionCard><p className="text-sm text-[var(--color-muted-foreground)]">Seu perfil não tem permissão de relatórios.</p></SectionCard>
        </div>
      }
    >
      <div className="space-y-6 max-w-[1100px]">
        <PageHeader
          eyebrow="Gestão"
          title="Relatórios"
          description="Categorias de relatórios. A geração de documentos é realizada pelo backend (em preparação)."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const available = Boolean(cat.href);
            const body = (
              <SectionCard>
                <div className="flex items-start gap-3">
                  <span className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 grid place-items-center text-[var(--color-primary)] shrink-0">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-card-title">{cat.title}</h3>
                      {available ? <StatusChip tone="success">Disponível</StatusChip> : <StatusChip tone="neutral">Em breve</StatusChip>}
                    </div>
                    <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{cat.description}</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {cat.items.map((it) => (
                    <li key={it} className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                      <ClipboardList className="h-3.5 w-3.5" /> {it}
                    </li>
                  ))}
                </ul>
                {available && (
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)]">
                    Abrir fluxo <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </SectionCard>
            );
            return available && cat.href ? (
              <Link key={cat.key} href={cat.href} className="block transition-transform hover:-translate-y-0.5">{body}</Link>
            ) : (
              <div key={cat.key} className="opacity-90">{body}</div>
            );
          })}
        </div>
      </div>
    </Gate>
  );
}
