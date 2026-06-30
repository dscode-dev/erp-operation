"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { ExportButton } from "@platform/components/export-button";
import { FilterBar } from "@erp/ui/filter-bar";
import { StatusChip, type ChipTone } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { ErrorState } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { Drawer } from "@erp/ui/drawer";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { operationApi, useQuery, type OperationDocument, type OperationDocumentStatus } from "@erp/api";
import type { DocumentKind, OperationSummary } from "@erp/types";
import { DOCUMENT_KIND_LABEL } from "@erp/types";
import { formatBytes, formatDate, formatDateTime } from "@erp/utils";

const STATUS: Record<OperationDocumentStatus, { tone: ChipTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Rascunho" },
  READY: { tone: "info", label: "Pronto" },
  VALIDATED: { tone: "success", label: "Validado" },
  SENT: { tone: "primary", label: "Enviado" },
};

const KINDS: DocumentKind[] = ["WORK_ORDER", "TECHNICAL_REPORT", "REPORT", "PMOC", "QUOTE", "RECEIPT"];
const STATUSES: OperationDocumentStatus[] = ["DRAFT", "READY", "VALIDATED", "SENT"];
const selectCls =
  "h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-2 text-sm outline-none focus:border-[var(--color-primary)]";

type DocumentRow = {
  document: OperationDocument;
  operation: OperationSummary;
  id: string;
  type: DocumentKind;
  number: string;
  customer: string;
  equipment: string;
  operator: string;
  date: string;
  status: OperationDocumentStatus;
  fileSize: number | null;
  renderedAt: string | null;
};

export default function DocumentosPage() {
  const ops = useQuery((s) => operationApi.listOperations({ limit: 100, signal: s }), []);
  const [detail, setDetail] = useState<DocumentRow | null>(null);

  const [search, setSearch] = useState("");
  const [customer, setCustomer] = useState("");
  const [equipment, setEquipment] = useState("");
  const [operator, setOperator] = useState("");
  const [kind, setKind] = useState<"" | DocumentKind>("");
  const [status, setStatus] = useState<"" | OperationDocumentStatus>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const all = useMemo<DocumentRow[]>(() => {
    return (ops.data?.items ?? []).flatMap((op) =>
      op.documents.map((doc) => ({
        document: doc,
        operation: op,
        id: doc.id,
        type: doc.type,
        number: doc.number,
        customer: op.customer?.name ?? "—",
        equipment: op.equipment?.name ?? "—",
        operator: op.operator?.name ?? "—",
        date: doc.renderedAt ?? doc.createdAt,
        status: doc.status,
        fileSize: doc.fileSize ?? null,
        renderedAt: doc.renderedAt ?? null,
      })),
    );
  }, [ops.data]);

  const distinct = (key: "customer" | "equipment" | "operator") =>
    Array.from(new Set(all.map((d) => d[key]).filter((value) => value && value !== "—"))).sort();

  const rows = useMemo(() => {
    return all.filter((d) => {
      if (customer && d.customer !== customer) return false;
      if (equipment && d.equipment !== equipment) return false;
      if (operator && d.operator !== operator) return false;
      if (kind && d.type !== kind) return false;
      if (status && d.status !== status) return false;
      if (from && d.date < from) return false;
      if (to && d.date > `${to}T23:59:59`) return false;
      const q = search.trim().toLowerCase();
      if (q && ![d.number, d.customer, d.equipment, d.operator].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, customer, equipment, operator, kind, status, from, to, search]);

  const columns: Column<DocumentRow>[] = [
    {
      key: "doc",
      header: "Documento",
      sortAccessor: (d) => d.number,
      cell: (d) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{d.number}</div>
          <div className="text-caption truncate">{DOCUMENT_KIND_LABEL[d.type]}</div>
        </div>
      ),
    },
    { key: "customer", header: "Cliente", className: "w-[170px]", sortAccessor: (d) => d.customer, cell: (d) => <span className="text-sm truncate">{d.customer}</span> },
    { key: "equipment", header: "Equipamento", className: "w-[170px]", cell: (d) => <span className="text-sm truncate">{d.equipment}</span> },
    { key: "operator", header: "Operador", className: "w-[140px]", cell: (d) => <span className="text-sm">{d.operator}</span> },
    { key: "date", header: "Data", className: "w-[110px]", sortAccessor: (d) => d.date, cell: (d) => <span className="font-mono text-xs">{formatDate(d.date)}</span> },
    { key: "size", header: "Tamanho", className: "w-[95px]", cell: (d) => <span className="text-xs font-mono">{formatBytes(d.fileSize)}</span> },
    { key: "rendered", header: "Renderizado", className: "w-[135px]", cell: (d) => <span className="text-xs">{formatDateTime(d.renderedAt)}</span> },
    { key: "version", header: "Versão", className: "w-[86px]", cell: () => <span className="text-caption">v1</span> },
    { key: "status", header: "Status", className: "w-[120px]", sortAccessor: (d) => d.status, cell: (d) => <StatusChip tone={STATUS[d.status].tone} dot>{STATUS[d.status].label}</StatusChip> },
  ];

  return (
    <div className="space-y-6 max-w-[1500px]">
      <PageHeader
        eyebrow="Operação"
        title="Central de documentos"
        description="Preview, renderização e download consomem exclusivamente o Document Engine do backend."
        actions={
          <ExportButton
            label="Exportar"
            fileName="documentos"
            rows={rows.map((d) => ({
              documento: d.number,
              tipo: DOCUMENT_KIND_LABEL[d.type],
              cliente: d.customer,
              equipamento: d.equipment,
              operador: d.operator,
              data: formatDate(d.date),
              tamanho: formatBytes(d.fileSize),
              renderizadoEm: formatDateTime(d.renderedAt),
              status: STATUS[d.status].label,
              versao: "v1",
            }))}
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
        <select value={status} onChange={(e) => setStatus(e.target.value as OperationDocumentStatus | "")} className={selectCls} aria-label="Status">
          <option value="">Todos os status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls} aria-label="De" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectCls} aria-label="Até" />
      </FilterBar>

      {ops.loading && all.length === 0 ? (
        <SkeletonList rows={6} />
      ) : ops.error && !ops.data ? (
        <ErrorState error={ops.error} onRetry={ops.refetch} />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhum documento" description="Registre operações ou ajuste os filtros." />
      ) : (
        <DataTable columns={columns} rows={rows} onRowClick={(d) => setDetail(d)} />
      )}

      <Drawer open={detail !== null} onClose={() => setDetail(null)} eyebrow="Documento" title={detail?.number ?? ""} width="max-w-[1280px]">
        {detail && (
          <DocumentViewer
            source={{ documentId: detail.id, operationId: detail.operation.id, type: detail.type }}
            title={detail.number}
            onRendered={() => ops.refetch()}
          />
        )}
      </Drawer>
    </div>
  );
}
