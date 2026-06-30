"use client";

import { Suspense, useMemo, useState } from "react";
import { Building2, FileText } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import { StatusChip, type ChipTone } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { ErrorState } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { operationApi, useQuery, type OperationDocument, type OperationDocumentStatus, type OperationSummary } from "@erp/api";
import type { DocumentKind } from "@erp/types";
import { DOCUMENT_KIND_LABEL } from "@erp/types";
import { formatDateTime } from "@erp/utils";
import { CustomerPicker } from "@operator/components/customer-picker";
import { useSelectedCustomer } from "@operator/lib/selected-customer";

const STATUS: Record<OperationDocumentStatus, { tone: ChipTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Rascunho" },
  READY: { tone: "info", label: "Pronto" },
  VALIDATED: { tone: "success", label: "Validado" },
  SENT: { tone: "primary", label: "Enviado" },
};

type Row = {
  operation: OperationSummary;
  document: OperationDocument;
  id: string;
  type: DocumentKind;
  number: string;
  customer: string;
  equipment: string;
  date: string;
  status: OperationDocumentStatus;
};

function OperatorDocumentsInner() {
  const [customer, setCustomer] = useSelectedCustomer();
  const [detail, setDetail] = useState<Row | null>(null);
  const ops = useQuery((s) => operationApi.listOperations({ limit: 100, customerId: customer?.id, signal: s }), [customer?.id]);

  const items = useMemo<Row[]>(() => {
    if (!customer) return [];
    return (ops.data?.items ?? []).flatMap((op) =>
      op.documents.map((document) => ({
        operation: op,
        document,
        id: document.id,
        type: document.type,
        number: document.number,
        customer: op.customer?.name ?? customer.name,
        equipment: op.equipment?.name ?? "—",
        date: document.renderedAt ?? document.createdAt,
        status: document.status,
      })),
    );
  }, [customer, ops.data]);

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Documentos</h1>
        <p className="text-caption">Documentos reais por cliente, via Document Engine.</p>
      </header>

      <div className="sticky top-12 z-10 -mx-4 px-4 py-2 bg-[var(--color-background)]/95 backdrop-blur">
        <CustomerPicker selected={customer} onSelect={setCustomer} />
      </div>

      {!customer ? (
        <EmptyState icon={Building2} title="Selecione um cliente" description="Escolha um cliente para ver os documentos." />
      ) : ops.loading && !ops.data ? (
        <SkeletonList rows={6} />
      ) : ops.error && !ops.data ? (
        <ErrorState error={ops.error} onRetry={ops.refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum documento" description="Este cliente ainda não possui documentos de operações." />
      ) : (
        <ul className="space-y-2">
          {items.map((d) => (
            <li key={d.id}>
              <button type="button" onClick={() => setDetail(d)} className="w-full text-left flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 active:scale-[0.99] transition-transform">
                <span className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-muted)] grid place-items-center text-[var(--color-muted-foreground)] shrink-0"><FileText className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{d.number}</span>
                  <span className="block text-caption truncate">{DOCUMENT_KIND_LABEL[d.type]} · {d.equipment} · {formatDateTime(d.date)}</span>
                </span>
                <StatusChip tone={STATUS[d.status].tone} dot>{STATUS[d.status].label}</StatusChip>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={detail !== null} onClose={() => setDetail(null)} eyebrow="Documento" title={detail?.number ?? ""} width="max-w-[1280px]">
        {detail && (
          <DocumentViewer
            source={{ documentId: detail.id, operationId: detail.operation.id, type: detail.type }}
            title={detail.number}
            onRendered={ops.refetch}
          />
        )}
      </Drawer>
    </div>
  );
}

export default function OperatorDocumentsPage() {
  return (
    <Suspense fallback={null}>
      <OperatorDocumentsInner />
    </Suspense>
  );
}
