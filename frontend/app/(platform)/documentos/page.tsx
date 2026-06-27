"use client";

/**
 * Documentos (Platform) — visibilidade demo dos documentos do fluxo operacional
 * (OS, Orçamento, Relatório de Visita Técnica, PMOC, Laudo, Recibo).
 *
 * A geração de PDF é responsabilidade do backend (escopo futuro). Esta tela
 * apenas demonstra a UI pronta para visualizar/revisar/editar/baixar/validar,
 * compondo a partir de dados reais (templates da organização + OS do demo).
 */
import { useMemo, useState } from "react";
import { FileText, Eye, Pencil, CheckCircle2, FileCheck } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { SectionCard } from "@erp/ui/section-card";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonCard } from "@erp/ui/skeletons";
import { ComingSoonState } from "@erp/ui/states";
import { Drawer } from "@erp/ui/drawer";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { DocumentDownload } from "@erp/ui/documents/document-download";
import { Gate } from "@erp/ui/auth/gate";
import { organizationApi, operationsApi, useQuery } from "@erp/api";
import type { DocumentKind, GeneratedDocument } from "@erp/types";
import { DOCUMENT_KIND_LABEL } from "@erp/types";

const KINDS: { kind: DocumentKind; description: string }[] = [
  { kind: "WORK_ORDER", description: "Registro do serviço executado em campo." },
  { kind: "QUOTE", description: "Proposta comercial para aprovação do cliente." },
  { kind: "TECHNICAL_REPORT", description: "Relatório técnico de visita / laudo de campo." },
  { kind: "PMOC", description: "Plano de Manutenção, Operação e Controle." },
  { kind: "REPORT", description: "Laudo / relatório consolidado." },
  { kind: "RECEIPT", description: "Recibo de pagamento do serviço." },
];

export default function DocumentosPage() {
  const [doc, setDoc] = useState<GeneratedDocument | null>(null);
  const templates = useQuery((signal) => organizationApi.listTemplates({ signal }), []);
  const orders = useQuery((signal) => operationsApi.getOrders({ signal }), []);

  function openKind(kind: DocumentKind) {
    setDoc({ id: `kind-${kind}`, kind, title: DOCUMENT_KIND_LABEL[kind], status: "draft" });
  }

  const recents = useMemo<GeneratedDocument[]>(
    () =>
      (orders.data?.items ?? []).map((o) => ({
        id: `os-${o.id}`,
        kind: "WORK_ORDER" as const,
        title: `${o.number} — ${o.customer}`,
        status: "draft" as const,
      })),
    [orders.data],
  );

  return (
    <div className="space-y-6 max-w-[1200px]">
      <PageHeader
        eyebrow="Operação"
        title="Documentos"
        description="Pré-visualização dos documentos do fluxo. A geração de PDF é feita pelo backend (escopo futuro)."
      />

      <SectionCard title="Modelos de documento" icon={FileText} description="Tipos disponíveis no fluxo operacional.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KINDS.map((k) => {
            const count = templates.data?.filter((t) => t.type === k.kind).length ?? 0;
            return (
              <button
                key={k.kind}
                type="button"
                onClick={() => openKind(k.kind)}
                className="text-left rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 hover:bg-[var(--color-muted)] transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <span className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 grid place-items-center text-[var(--color-primary)]"><FileText className="h-4 w-4" /></span>
                  <StatusChip tone="neutral">{count} modelo{count === 1 ? "" : "s"}</StatusChip>
                </div>
                <div className="mt-3 font-medium">{DOCUMENT_KIND_LABEL[k.kind]}</div>
                <p className="text-caption mt-0.5">{k.description}</p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Documentos recentes" icon={FileCheck} description="Derivados das ordens de serviço do demo.">
        {orders.loading && !orders.data ? (
          <SkeletonCard />
        ) : orders.data?.disabled ? (
          <ComingSoonState title="Sem documentos" description="Ative o Demo Dataset para visualizar documentos recentes." />
        ) : recents.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum documento recente.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] -my-1">
            {recents.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setDoc(d)} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-[var(--color-muted)]/40 -mx-2 px-2 rounded-[var(--radius-md)]">
                  <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <span className="min-w-0 flex-1 text-sm font-medium truncate">{d.title}</span>
                  <StatusChip tone="info">{DOCUMENT_KIND_LABEL[d.kind]}</StatusChip>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <Drawer open={doc !== null} onClose={() => setDoc(null)} eyebrow="Documento" title={doc?.title ?? ""} width="max-w-3xl">
        {doc && (
          <div className="space-y-4">
            <DocumentViewer
              document={doc}
              reviewFields={[{ label: "Tipo", value: DOCUMENT_KIND_LABEL[doc.kind] }, { label: "Status", value: "Rascunho (demo)" }]}
              actions={<DocActions document={doc} />}
            />
          </div>
        )}
      </Drawer>
    </div>
  );
}

function DocActions({ document: doc }: { document: GeneratedDocument }) {
  return (
    <div className="space-y-2">
      <button type="button" className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] h-9 text-sm hover:bg-[var(--color-muted)]">
        <Eye className="h-4 w-4" /> Visualizar
      </button>
      <Gate roles={["OWNER", "MANAGER"]}>
        <button type="button" className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] h-9 text-sm hover:bg-[var(--color-muted)]">
          <Pencil className="h-4 w-4" /> Revisar / Editar
        </button>
      </Gate>
      <Gate roles={["OWNER"]}>
        <button type="button" disabled title="Validação/geração é feita pelo backend (em breve)." className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] h-9 text-sm opacity-60 cursor-not-allowed">
          <CheckCircle2 className="h-4 w-4" /> Validar
        </button>
      </Gate>
      <DocumentDownload document={doc} variant="ghost" />
    </div>
  );
}
