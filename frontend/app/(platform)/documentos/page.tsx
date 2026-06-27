"use client";

/**
 * Documentos — Central Documental.
 *
 * Lista todos os documentos emitidos pelo sistema (Demo Dataset) com filtros
 * cumulativos (cliente, equipamento, operador, tipo, status, período), preview
 * profissional (DocumentPaper) e download. A geração de PDF é do backend;
 * enquanto isso, o download usa o documento estruturado existente.
 */
import { useMemo, useState } from "react";
import { FileText, Download } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { ExportButton } from "@platform/components/export-button";
import { FilterBar } from "@erp/ui/filter-bar";
import { StatusChip, type ChipTone } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { Drawer } from "@erp/ui/drawer";
import { DocumentPaper } from "@erp/ui/documents/document-paper";
import { blueprintByType, buildDocument } from "@erp/ui/documents/model-blueprints";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { operationsApi, useQuery, type DemoDocument, type DemoDocumentStatus, type DocumentsData } from "@erp/api";
import type { DocumentKind } from "@erp/types";
import { DOCUMENT_KIND_LABEL } from "@erp/types";
import { formatDate, downloadText } from "@erp/utils";

const STATUS: Record<DemoDocumentStatus, { tone: ChipTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Rascunho" },
  READY: { tone: "info", label: "Pronto" },
  VALIDATED: { tone: "success", label: "Validado" },
  SENT: { tone: "primary", label: "Enviado" },
};
const KINDS: DocumentKind[] = ["WORK_ORDER", "TECHNICAL_REPORT", "REPORT", "PMOC", "QUOTE", "RECEIPT"];
const STATUSES: DemoDocumentStatus[] = ["DRAFT", "READY", "VALIDATED", "SENT"];
const selectCls = "h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-2 text-sm outline-none focus:border-[var(--color-primary)]";

export default function DocumentosPage() {
  const { session } = useAuth();
  const docs = useQuery<DocumentsData>((s) => operationsApi.getDocuments({ signal: s }), []);
  const [detail, setDetail] = useState<DemoDocument | null>(null);

  // Cumulative filters.
  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState("");
  const [equipment, setEquipment] = useState("");
  const [operator, setOperator] = useState("");
  const [kind, setKind] = useState<"" | DocumentKind>("");
  const [status, setStatus] = useState<"" | DemoDocumentStatus>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const all = useMemo(() => docs.data?.items ?? [], [docs.data]);
  const distinct = (key: "customer" | "equipment" | "operator") => Array.from(new Set(all.map((d) => d[key]))).filter(Boolean).sort();

  const rows = useMemo(() => {
    return all.filter((d) => {
      if (customer && d.customer !== customer) return false;
      if (equipment && d.equipment !== equipment) return false;
      if (operator && d.operator !== operator) return false;
      if (kind && d.kind !== kind) return false;
      if (status && d.status !== status) return false;
      if (from && d.date < from) return false;
      if (to && d.date > `${to}T23:59:59`) return false;
      const q = search.trim().toLowerCase();
      if (q && ![d.number, d.customer, d.equipment, d.operator].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, customer, equipment, operator, kind, status, from, to, search]);

  const orgName = session?.organization.tradeName || session?.organization.legalName || "Climatize";

  function downloadStructure(d: DemoDocument) {
    const data = buildDocument(blueprintByType(d.kind), { number: d.number, date: d.date, customer: d.customer, equipment: d.equipment, operator: d.operator, value: d.value, statusLabel: STATUS[d.status].label }, { name: orgName });
    downloadText(JSON.stringify(data, null, 2), `${d.number}.json`, "application/json");
  }

  const columns: Column<DemoDocument>[] = [
    { key: "doc", header: "Documento", sortAccessor: (d) => d.number, cell: (d) => <div className="min-w-0"><div className="font-medium truncate">{d.number}</div><div className="text-caption truncate">{DOCUMENT_KIND_LABEL[d.kind]}</div></div> },
    { key: "customer", header: "Cliente", className: "w-[170px]", sortAccessor: (d) => d.customer, cell: (d) => <span className="text-sm truncate">{d.customer}</span> },
    { key: "equipment", header: "Equipamento", className: "w-[170px]", cell: (d) => <span className="text-sm truncate">{d.equipment}</span> },
    { key: "operator", header: "Operador", className: "w-[140px]", cell: (d) => <span className="text-sm">{d.operator}</span> },
    { key: "date", header: "Data", className: "w-[110px]", sortAccessor: (d) => d.date, cell: (d) => <span className="font-mono text-xs">{formatDate(d.date)}</span> },
    { key: "status", header: "Status", className: "w-[120px]", sortAccessor: (d) => d.status, cell: (d) => <StatusChip tone={STATUS[d.status].tone} dot>{STATUS[d.status].label}</StatusChip> },
  ];

  return (
    <div className="space-y-6 max-w-[1500px]">
      <PageHeader
        eyebrow="Operação"
        title="Central de documentos"
        description="Todos os documentos emitidos pelo sistema (Demo Dataset)."
        actions={
          <ExportButton
            label="Exportar"
            fileName="documentos"
            rows={rows.map((d) => ({ documento: d.number, tipo: DOCUMENT_KIND_LABEL[d.kind], cliente: d.customer, equipamento: d.equipment, operador: d.operator, data: formatDate(d.date), status: STATUS[d.status].label }))}
          />
        }
      />

      <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Buscar por documento, cliente, equipamento…">
        <select value={customer} onChange={(e) => setCustomer(e.target.value)} className={selectCls} aria-label="Cliente">
          <option value="">Todos os clientes</option>
          {distinct("customer").map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={selectCls} aria-label="Equipamento">
          <option value="">Todos os equipamentos</option>
          {distinct("equipment").map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={operator} onChange={(e) => setOperator(e.target.value)} className={selectCls} aria-label="Operador">
          <option value="">Todos os operadores</option>
          {distinct("operator").map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind | "")} className={selectCls} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {KINDS.map((k) => <option key={k} value={k}>{DOCUMENT_KIND_LABEL[k]}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as DemoDocumentStatus | "")} className={selectCls} aria-label="Status">
          <option value="">Todos os status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls} aria-label="De" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectCls} aria-label="Até" />
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

      <Drawer open={detail !== null} onClose={() => setDetail(null)} eyebrow="Documento" title={detail?.number ?? ""} width="max-w-3xl">
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip tone={STATUS[detail.status].tone} dot>{STATUS[detail.status].label}</StatusChip>
              <span className="text-caption">{DOCUMENT_KIND_LABEL[detail.kind]}</span>
              <button type="button" onClick={() => downloadStructure(detail)} className="ml-auto inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
                <Download className="h-4 w-4" /> Baixar
              </button>
            </div>
            <div className="bg-[var(--color-muted)]/40 -mx-5 px-4 sm:px-6 py-4">
              <DocumentPaper
                data={buildDocument(
                  blueprintByType(detail.kind),
                  { number: detail.number, date: detail.date, customer: detail.customer, equipment: detail.equipment, operator: detail.operator, value: detail.value, statusLabel: STATUS[detail.status].label },
                  { name: orgName },
                )}
              />
            </div>
            <p className="text-[11px] text-[var(--color-muted-foreground)] text-center">Pré-visualização estruturada. A geração final do PDF é feita pelo backend.</p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
