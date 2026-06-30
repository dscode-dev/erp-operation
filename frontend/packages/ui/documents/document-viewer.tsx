"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { documentsApi, ApiClientError } from "@erp/api";
import type {
  DocumentBlueprint,
  DocumentComponent,
  DocumentDownloadResult,
  DocumentKind,
  DocumentRenderResult,
} from "@erp/types";
import { DOCUMENT_KIND_LABEL } from "@erp/types";
import { formatBytes } from "@erp/utils";

type Source =
  | { documentId: string; operationId?: string; type?: DocumentKind }
  | { operationId: string; type: DocumentKind; documentId?: string | null };

export function DocumentViewer({
  source,
  title,
  canRender = true,
  canDownload = true,
  onRendered,
}: {
  source: Source;
  title?: string;
  canRender?: boolean;
  canDownload?: boolean;
  onRendered?: (document: DocumentRenderResult) => void;
}) {
  const [documentId, setDocumentId] = useState("documentId" in source ? source.documentId ?? null : null);
  const [blueprint, setBlueprint] = useState<DocumentBlueprint | null>(null);
  const [rendered, setRendered] = useState<DocumentRenderResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(0.88);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setDocumentId("documentId" in source ? source.documentId ?? null : null);
    setRendered(null);
    setPage(0);
  }, [source]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(null);
    const operationSource = source.operationId && source.type ? { operationId: source.operationId, type: source.type } : null;
    const load = documentId
      ? documentsApi.previewDocument(documentId, { signal: controller.signal })
      : operationSource
        ? documentsApi.previewOperationDocument(operationSource.operationId, operationSource.type, { signal: controller.signal })
        : Promise.reject(new Error("Documento sem origem de preview."));

    load
      .then((data) => {
        if (!active) return;
        setBlueprint(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(err instanceof ApiClientError || err instanceof Error ? err.message : "Falha ao carregar preview.");
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [documentId, source, tick]);

  const pages = useMemo(() => paginate(blueprint), [blueprint]);
  const currentPage = pages[Math.min(page, Math.max(0, pages.length - 1))] ?? [];
  const docTitle = title ?? blueprint?.header.title ?? (source.type ? DOCUMENT_KIND_LABEL[source.type] : "Documento");

  const render = useCallback(async () => {
    setRendering(true);
    setError(null);
    try {
      const operationSource = source.operationId && source.type ? { operationId: source.operationId, type: source.type } : null;
      const result = documentId
        ? await documentsApi.renderDocument(documentId)
        : operationSource
          ? await documentsApi.renderOperationDocument(operationSource.operationId, operationSource.type)
          : null;
      if (!result) throw new Error("Documento sem origem de renderização.");
      setRendered(result);
      setDocumentId(result.id);
      onRendered?.(result);
      setTick((value) => value + 1);
      return result;
    } catch (err) {
      setError(err instanceof ApiClientError || err instanceof Error ? err.message : "Falha ao renderizar documento.");
      return null;
    } finally {
      setRendering(false);
    }
  }, [documentId, onRendered, source]);

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      let id = documentId;
      if (!id) {
        const result = await render();
        id = result?.id ?? null;
      }
      if (!id) throw new Error("Renderize o documento antes do download.");
      const file = await documentsApi.downloadDocument(id);
      downloadBase64(file);
    } catch (err) {
      setError(err instanceof ApiClientError || err instanceof Error ? err.message : "Falha ao baixar documento.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[144px_minmax(0,1fr)_300px]">
      <aside className="hidden lg:block rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-2 max-h-[720px] overflow-auto">
        <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)] px-2 py-1">
          Páginas
        </div>
        <div className="space-y-2">
          {pages.map((sections, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPage(index)}
              className={`w-full rounded-[var(--radius-md)] border p-1 text-left transition ${
                page === index
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/8"
                  : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
              }`}
            >
              <div className="aspect-[1/1.35] rounded bg-white p-2 text-[7px] text-slate-500 shadow-sm overflow-hidden">
                <strong className="block truncate text-slate-900">{docTitle}</strong>
                {sections.slice(0, 3).map((section) => (
                  <span key={section.id} className="mt-1 block truncate">
                    {section.title}
                  </span>
                ))}
              </div>
              <span className="mt-1 block text-center text-[11px] text-[var(--color-muted-foreground)]">
                {index + 1}
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-muted)]/30 overflow-hidden">
        <Toolbar
          page={page}
          total={pages.length}
          zoom={zoom}
          onPrev={() => setPage((value) => Math.max(0, value - 1))}
          onNext={() => setPage((value) => Math.min(pages.length - 1, value + 1))}
          onZoomIn={() => setZoom((value) => Math.min(1.35, value + 0.08))}
          onZoomOut={() => setZoom((value) => Math.max(0.62, value - 0.08))}
          onRefresh={() => setTick((value) => value + 1)}
          loading={loading}
        />

        <div className="h-[720px] overflow-auto p-4 sm:p-6">
          {loading ? (
            <State icon={Loader2} title="Carregando preview oficial…" spin />
          ) : error && !blueprint ? (
            <State icon={AlertTriangle} title="Preview indisponível" description={error} danger />
          ) : blueprint ? (
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }} className="transition-transform">
              <DocumentPage blueprint={blueprint} sections={currentPage} page={page + 1} total={pages.length} />
            </div>
          ) : (
            <State icon={FileText} title="Documento vazio" />
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-caption truncate">{blueprint ? DOCUMENT_KIND_LABEL[blueprint.metadata.documentType] : "Documento"}</div>
              <h3 className="font-medium truncate">{blueprint?.metadata.documentNumber ?? docTitle}</h3>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <Meta label="Cliente" value={metadataValue(blueprint, "Cliente")} />
            <Meta label="Equipamento" value={metadataValue(blueprint, "Nome")} />
            <Meta label="Operador" value={metadataValue(blueprint, "Operador")} />
            <Meta label="Páginas" value={pages.length ? String(pages.length) : "—"} />
            <Meta label="Tamanho" value={formatBytes(rendered?.fileSize ?? 0)} />
            <Meta label="Renderizado em" value={rendered?.renderedAt ? new Date(rendered.renderedAt).toLocaleString("pt-BR") : "—"} />
            <Meta label="Versão" value="v1 · placeholder" />
          </dl>
        </div>

        {error && blueprint && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}

        <div className="grid gap-2">
          <button type="button" onClick={() => setTick((value) => value + 1)} className={secondaryButtonCls}>
            <RefreshCw className="h-4 w-4" /> Atualizar preview
          </button>
          {canRender && (
            <button type="button" onClick={render} disabled={rendering} className={primaryButtonCls}>
              {rendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              Renderizar documento
            </button>
          )}
          {canDownload && (
            <button type="button" onClick={download} disabled={downloading} className={secondaryButtonCls}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download PDF
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function Toolbar({
  page,
  total,
  zoom,
  loading,
  onPrev,
  onNext,
  onZoomIn,
  onZoomOut,
  onRefresh,
}: {
  page: number;
  total: number;
  zoom: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2">
      <div className="inline-flex items-center gap-1">
        <button type="button" onClick={onPrev} disabled={page <= 0} className={iconButtonCls}><ChevronLeft className="h-4 w-4" /></button>
        <span className="min-w-[92px] text-center text-sm">
          Página {total ? page + 1 : 0} / {total}
        </span>
        <button type="button" onClick={onNext} disabled={page >= total - 1} className={iconButtonCls}><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="inline-flex items-center gap-1">
        <button type="button" onClick={onZoomOut} className={iconButtonCls}><ZoomOut className="h-4 w-4" /></button>
        <span className="w-12 text-center text-xs font-mono">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={onZoomIn} className={iconButtonCls}><ZoomIn className="h-4 w-4" /></button>
        <button type="button" onClick={onRefresh} disabled={loading} className={iconButtonCls}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
    </div>
  );
}

function DocumentPage({ blueprint, sections, page, total }: { blueprint: DocumentBlueprint; sections: DocumentBlueprint["sections"]; page: number; total: number }) {
  return (
    <article className="mx-auto min-h-[1060px] w-[780px] bg-white text-slate-950 shadow-[var(--shadow-card)]">
      <div className="h-2 bg-[var(--color-primary)]" />
      <div className="p-10">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-semibold">{blueprint.header.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{blueprint.header.subtitle}</p>
            <p className="mt-2 font-mono text-xs text-slate-500">{blueprint.header.documentNumber}</p>
          </div>
          <div className="text-right text-xs leading-relaxed text-slate-500">
            <strong className="block text-sm text-slate-900">{blueprint.header.organizationName}</strong>
            <span>{blueprint.metadata.organization.cnpj}</span>
            <br />
            <span>{blueprint.metadata.organization.city}/{blueprint.metadata.organization.state}</span>
          </div>
        </header>
        <div className="mt-7 space-y-7">
          {sections.map((section) => (
            <section key={section.id}>
              <h2 className="border-b border-slate-200 pb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                {section.title}
              </h2>
              <div className="mt-3 space-y-3">{section.components.map((component) => <ComponentPreview key={component.id} component={component} />)}</div>
            </section>
          ))}
        </div>
        <footer className="mt-10 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-400">
          <span>{blueprint.footer.content}</span>
          <span>Página {page} de {total}</span>
        </footer>
      </div>
    </article>
  );
}

function ComponentPreview({ component }: { component: DocumentComponent }) {
  if (component.kind === "metadata") {
    return (
      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 rounded-md border border-slate-200 bg-slate-50 p-4">
        {component.items.map((item) => (
          <div key={`${component.id}-${item.label}`}>
            <dt className="text-[10px] uppercase tracking-wider text-slate-400">{item.label}</dt>
            <dd className="text-sm font-medium">{item.value || "—"}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (component.kind === "table") {
    return (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-[10px] uppercase tracking-wider text-slate-400">
            {component.columns.map((col) => <th key={col.key} className="py-2">{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {component.rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-100">
              {component.columns.map((col) => <td key={col.key} className="py-2">{row[col.key] ?? "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (component.kind === "checklist") {
    return <ul className="space-y-1 text-sm">{component.items.map((item, i) => <li key={i}>☐ {item.label}{item.note ? ` · ${item.note}` : ""}</li>)}</ul>;
  }
  if (component.kind === "list") {
    return <ul className="list-disc space-y-1 pl-5 text-sm">{component.items.map((item) => <li key={item}>{item}</li>)}</ul>;
  }
  if (component.kind === "qrCode") {
    return <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm"><strong>{component.label}</strong><br /><span className="font-mono text-xs">{component.value}</span></div>;
  }
  if (component.kind === "signaturePlaceholder") {
    return <div className="mt-10 border-t border-slate-400 pt-2 text-center text-sm">{component.label} · {component.strategy}</div>;
  }
  if (component.kind === "image") {
    return <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Imagem protegida · {component.mimeType} · {formatBytes(component.fileSize)}</div>;
  }
  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{("text" in component ? component.text : "") || "—"}</p>;
}

function State({ icon: Icon, title, description, spin, danger }: { icon: typeof FileText; title: string; description?: string; spin?: boolean; danger?: boolean }) {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <Icon className={`mx-auto h-8 w-8 ${spin ? "animate-spin" : ""} ${danger ? "text-[var(--color-danger)]" : "text-[var(--color-muted-foreground)]"}`} />
        <h4 className="mt-3 font-medium">{title}</h4>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--color-muted-foreground)]">{description}</p>}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-caption">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function paginate(blueprint: DocumentBlueprint | null): DocumentBlueprint["sections"][] {
  if (!blueprint) return [];
  const pages: DocumentBlueprint["sections"][] = [];
  let current: DocumentBlueprint["sections"] = [];
  let weight = 0;
  for (const section of blueprint.sections) {
    const sectionWeight = 1 + section.components.reduce((sum, component) => sum + componentWeight(component), 0);
    if (current.length > 0 && weight + sectionWeight > 7) {
      pages.push(current);
      current = [];
      weight = 0;
    }
    current.push(section);
    weight += sectionWeight;
  }
  if (current.length) pages.push(current);
  return pages.length ? pages : [[]];
}

function componentWeight(component: DocumentComponent): number {
  if (component.kind === "table") return Math.max(2, Math.ceil(component.rows.length / 10));
  if (component.kind === "checklist") return Math.max(1, Math.ceil(component.items.length / 8));
  if (component.kind === "metadata") return Math.max(1, Math.ceil(component.items.length / 8));
  return 1;
}

function metadataValue(blueprint: DocumentBlueprint | null, label: string): string {
  if (!blueprint) return "—";
  for (const section of blueprint.sections) {
    for (const component of section.components) {
      if (component.kind !== "metadata") continue;
      const item = component.items.find((entry) => entry.label === label);
      if (item) return item.value || "—";
    }
  }
  return "—";
}

function downloadBase64(file: DocumentDownloadResult) {
  const binary = atob(file.contentBase64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const blob = new Blob([bytes], { type: file.mimeType ?? "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${file.number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const iconButtonCls =
  "inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-45";
const primaryButtonCls =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-medium text-[var(--color-primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonCls =
  "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-50";
