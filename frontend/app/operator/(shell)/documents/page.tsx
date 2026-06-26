"use client";

/**
 * Documentos do operador — visualização (somente leitura) dos documentos do
 * fluxo (OS, Relatório, PMOC, Recibo, Orçamento). O operador NUNCA edita
 * documentos finalizados; a geração é do backend. Consome o Demo Dataset.
 */
import { useState } from "react";
import { FileText } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import { StatusChip, type ChipTone } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { operationsApi, useQuery, type DemoDocument, type DemoDocumentStatus, type DocumentsData } from "@erp/api";
import type { GeneratedDocument, DocumentStatus } from "@erp/types";
import { DOCUMENT_KIND_LABEL } from "@erp/types";
import { formatDate } from "@erp/utils";

const STATUS: Record<DemoDocumentStatus, { tone: ChipTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Rascunho" },
  READY: { tone: "info", label: "Pronto" },
  VALIDATED: { tone: "success", label: "Validado" },
  SENT: { tone: "primary", label: "Enviado" },
};

export default function OperatorDocuments() {
  const [detail, setDetail] = useState<DemoDocument | null>(null);
  const docs = useQuery<DocumentsData>((s) => operationsApi.getDocuments({ signal: s }), []);

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Documentos</h1>
        <p className="text-caption">Seus documentos recentes (somente leitura).</p>
      </header>

      {docs.loading && !docs.data ? (
        <SkeletonList rows={6} />
      ) : docs.error && !docs.data ? (
        <ErrorState error={docs.error} onRetry={docs.refetch} />
      ) : docs.data?.disabled ? (
        <ComingSoonState title="Sem documentos" description="Ative o Demo Dataset para visualizar documentos." />
      ) : (docs.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={FileText} title="Nenhum documento" />
      ) : (
        <ul className="space-y-2">
          {(docs.data?.items ?? []).map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => setDetail(d)} className="w-full text-left flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 active:scale-[0.99] transition-transform">
                <span className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-muted)] grid place-items-center text-[var(--color-muted-foreground)] shrink-0"><FileText className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{d.number}</span>
                  <span className="block text-caption truncate">{DOCUMENT_KIND_LABEL[d.kind]} · {d.customer}</span>
                </span>
                <StatusChip tone={STATUS[d.status].tone} dot>{STATUS[d.status].label}</StatusChip>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={detail !== null} onClose={() => setDetail(null)} eyebrow="Documento" title={detail?.number ?? ""} width="max-w-lg">
        {detail && (
          <DocumentViewer
            document={toGeneratedDoc(detail)}
            reviewFields={[
              { label: "Tipo", value: DOCUMENT_KIND_LABEL[detail.kind] },
              { label: "Cliente", value: detail.customer },
              { label: "Equipamento", value: detail.equipment },
              { label: "Data", value: formatDate(detail.date) },
              { label: "Status", value: STATUS[detail.status].label },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
}

function toGeneratedDoc(d: DemoDocument): GeneratedDocument {
  const status: DocumentStatus = d.status === "DRAFT" ? "draft" : "ready";
  return { id: d.id, kind: d.kind, title: `${d.number} · ${DOCUMENT_KIND_LABEL[d.kind]}`, status };
}
