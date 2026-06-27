"use client";

/**
 * Documentos do operador — visualização (somente leitura) dos documentos do
 * fluxo (OS, Relatório, PMOC, Recibo, Orçamento). O operador NUNCA edita
 * documentos finalizados; a geração é do backend. Consome o Demo Dataset.
 */
import { Suspense, useMemo, useState } from "react";
import { Building2, FileText } from "lucide-react";
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
import { CustomerPicker } from "@operator/components/customer-picker";
import { useSelectedCustomer } from "@operator/lib/selected-customer";

const STATUS: Record<DemoDocumentStatus, { tone: ChipTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Rascunho" },
  READY: { tone: "info", label: "Pronto" },
  VALIDATED: { tone: "success", label: "Validado" },
  SENT: { tone: "primary", label: "Enviado" },
};

function OperatorDocumentsInner() {
  const [customer, setCustomer] = useSelectedCustomer();
  const [detail, setDetail] = useState<DemoDocument | null>(null);
  const docs = useQuery<DocumentsData>((s) => operationsApi.getDocuments({ signal: s }), []);

  const items = useMemo(
    () => (customer ? (docs.data?.items ?? []).filter((d) => d.customer === customer.name) : []),
    [docs.data, customer],
  );

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Documentos</h1>
        <p className="text-caption">Documentos por cliente (somente leitura).</p>
      </header>

      <div className="sticky top-12 z-10 -mx-4 px-4 py-2 bg-[var(--color-background)]/95 backdrop-blur">
        <CustomerPicker selected={customer} onSelect={setCustomer} />
      </div>

      {!customer ? (
        <EmptyState icon={Building2} title="Selecione um cliente" description="Escolha um cliente para ver os documentos." />
      ) : docs.loading && !docs.data ? (
        <SkeletonList rows={6} />
      ) : docs.error && !docs.data ? (
        <ErrorState error={docs.error} onRetry={docs.refetch} />
      ) : docs.data?.disabled ? (
        <ComingSoonState title="Sem documentos" description="Ative o Demo Dataset para visualizar documentos." />
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum documento" description="Este cliente não possui documentos." />
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
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

export default function OperatorDocumentsPage() {
  return (
    <Suspense fallback={null}>
      <OperatorDocumentsInner />
    </Suspense>
  );
}
