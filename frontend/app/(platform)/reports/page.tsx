"use client";

/**
 * Relatórios — central documental.
 *
 * A Platform não cria relatórios operacionais; ela administra os documentos
 * produzidos pelos operadores. Lista RVT, Laudos, PMOC, Orçamentos, Recibos e
 * OS (Demo Dataset) com preview, revisão/edição (OWNER) e download.
 */
import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { ExportButton } from "@platform/components/export-button";
import { FilterBar, FilterChip } from "@erp/ui/filter-bar";
import { StatusChip, type ChipTone } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { Drawer } from "@erp/ui/drawer";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { DocumentDownload } from "@erp/ui/documents/document-download";
import { Gate } from "@erp/ui/auth/gate";
import { operationsApi, useQuery, type DemoDocument, type DemoDocumentStatus, type DocumentsData } from "@erp/api";
import type { DocumentKind, GeneratedDocument, DocumentStatus } from "@erp/types";
import { DOCUMENT_KIND_LABEL } from "@erp/types";
import { formatDate } from "@erp/utils";

const STATUS: Record<DemoDocumentStatus, { tone: ChipTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Rascunho" },
  READY: { tone: "info", label: "Pronto" },
  VALIDATED: { tone: "success", label: "Validado" },
  SENT: { tone: "primary", label: "Enviado" },
};

const KINDS: DocumentKind[] = ["TECHNICAL_REPORT", "REPORT", "PMOC", "QUOTE", "RECEIPT", "WORK_ORDER"];

function toGeneratedDoc(d: DemoDocument): GeneratedDocument {
  const status: DocumentStatus = d.status === "DRAFT" ? "draft" : "ready";
  return { id: d.id, kind: d.kind, title: `${d.number} · ${DOCUMENT_KIND_LABEL[d.kind]}`, status };
}

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | DocumentKind>("all");
  const [detail, setDetail] = useState<DemoDocument | null>(null);
  const docs = useQuery<DocumentsData>((s) => operationsApi.getDocuments({ signal: s }), []);

  const rows = useMemo(() => {
    let items = docs.data?.items ?? [];
    if (kind !== "all") items = items.filter((d) => d.kind === kind);
    const q = search.trim().toLowerCase();
    if (q) items = items.filter((d) => [d.number, d.customer, d.equipment, d.operator].join(" ").toLowerCase().includes(q));
    return items;
  }, [docs.data, kind, search]);

  const columns: Column<DemoDocument>[] = [
    {
      key: "doc", header: "Documento", sortAccessor: (d) => d.number,
      cell: (d) => <div className="min-w-0"><div className="font-medium truncate">{d.number}</div><div className="text-caption truncate">{DOCUMENT_KIND_LABEL[d.kind]}</div></div>,
    },
    { key: "customer", header: "Cliente", className: "w-[180px]", sortAccessor: (d) => d.customer, cell: (d) => <span className="text-sm truncate">{d.customer}</span> },
    { key: "equipment", header: "Equipamento", className: "w-[180px]", cell: (d) => <span className="text-sm truncate">{d.equipment}</span> },
    { key: "operator", header: "Operador", className: "w-[150px]", cell: (d) => <span className="text-sm">{d.operator}</span> },
    { key: "date", header: "Data", className: "w-[120px]", sortAccessor: (d) => d.date, cell: (d) => <span className="font-mono text-xs">{formatDate(d.date)}</span> },
    { key: "status", header: "Status", className: "w-[130px]", sortAccessor: (d) => d.status, cell: (d) => <StatusChip tone={STATUS[d.status].tone} dot>{STATUS[d.status].label}</StatusChip> },
  ];

  return (
    <Gate
      permission="canReports"
      fallback={<div className="max-w-[1200px]"><PageHeader eyebrow="Gestão" title="Relatórios" description="Acesso restrito." /><ComingSoonState title="Sem permissão" description="Seu perfil não tem permissão de relatórios." /></div>}
    >
      <div className="space-y-6 max-w-[1400px]">
        <PageHeader
          eyebrow="Gestão"
          title="Central de documentos"
          description="Relatórios e documentos produzidos pelos operadores (Demo Dataset)."
          actions={
            <ExportButton
              label="Exportar"
              fileName="documentos"
              rows={rows.map((d) => ({ documento: d.number, tipo: DOCUMENT_KIND_LABEL[d.kind], cliente: d.customer, equipamento: d.equipment, operador: d.operator, data: formatDate(d.date), status: STATUS[d.status].label }))}
            />
          }
        />

        <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Buscar por documento, cliente, operador…">
          <FilterChip active={kind === "all"} onClick={() => setKind("all")}>Todos</FilterChip>
          {KINDS.map((k) => (
            <FilterChip key={k} active={kind === k} onClick={() => setKind(k)}>{DOCUMENT_KIND_LABEL[k]}</FilterChip>
          ))}
        </FilterBar>

        {docs.loading && !docs.data ? (
          <SkeletonList rows={6} />
        ) : docs.error && !docs.data ? (
          <ErrorState error={docs.error} onRetry={docs.refetch} />
        ) : docs.data?.disabled ? (
          <ComingSoonState title="Documentos em breve" description="Ative o Demo Dataset para visualizar a central de documentos." />
        ) : rows.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum documento" description="Ajuste os filtros." />
        ) : (
          <DataTable columns={columns} rows={rows} onRowClick={(d) => setDetail(d)} />
        )}

        <Drawer open={detail !== null} onClose={() => setDetail(null)} eyebrow="Documento" title={detail ? detail.number : ""} width="max-w-3xl">
          {detail && (
            <DocumentViewer
              document={toGeneratedDoc(detail)}
              reviewFields={[
                { label: "Tipo", value: DOCUMENT_KIND_LABEL[detail.kind] },
                { label: "Cliente", value: detail.customer },
                { label: "Equipamento", value: detail.equipment },
                { label: "Operador", value: detail.operator },
                { label: "Data", value: formatDate(detail.date) },
                { label: "Status", value: STATUS[detail.status].label },
              ]}
              actions={
                <>
                  <Gate roles={["OWNER"]}>
                    <button type="button" className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] h-9 text-sm hover:bg-[var(--color-muted)]">Revisar / Editar</button>
                  </Gate>
                  <DocumentDownload document={toGeneratedDoc(detail)} variant="ghost" />
                </>
              }
            />
          )}
        </Drawer>
      </div>
    </Gate>
  );
}
