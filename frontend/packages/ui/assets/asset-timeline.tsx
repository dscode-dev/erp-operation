"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  FileCheck2,
  FileText,
  PackageCheck,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  StickyNote,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { assetLifecycleApi, ApiClientError } from "@erp/api";
import type { AssetLifecycleEvent, AssetLifecycleEventType, DocumentTemplateType } from "@erp/types";
import { Drawer } from "@erp/ui/drawer";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { formatBytes, formatDateTime } from "@erp/utils";

const ICONS: Record<string, LucideIcon> = {
  "badge-check": BadgeCheck,
  "file-check-2": FileCheck2,
  "file-text": FileText,
  "package-check": PackageCheck,
  "search-check": Search,
  "shield-check": ShieldCheck,
  "sticky-note": StickyNote,
  "triangle-alert": TriangleAlert,
  settings: Settings,
  sparkles: Sparkles,
  wrench: Wrench,
};

const FILTERS: Array<{ label: string; type?: AssetLifecycleEventType }> = [
  { label: "Todos" },
  { label: "Preventivas", type: "PREVENTIVE" },
  { label: "Corretivas", type: "CORRECTIVE" },
  { label: "Documentos", type: "DOCUMENT" },
  { label: "Emitidos", type: "DOCUMENT_RENDERED" },
  { label: "Inspeções", type: "INSPECTION" },
];

export function AssetTimeline({
  equipmentId,
  customerId,
  operationId,
  type: initialType,
  title = "Timeline",
  limit = 10,
  compact = false,
  onOpenOperation,
}: {
  equipmentId?: string;
  customerId?: string;
  operationId?: string;
  type?: AssetLifecycleEventType;
  title?: string;
  limit?: number;
  compact?: boolean;
  onOpenOperation?: (operationId: string) => void;
}) {
  const [items, setItems] = useState<AssetLifecycleEvent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState<AssetLifecycleEventType | undefined>(initialType);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<ApiClientError | Error | null>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<AssetLifecycleEvent | null>(null);
  const [documentEvent, setDocumentEvent] = useState<AssetLifecycleEvent | null>(null);

  const load = useCallback(
    async (targetPage: number, signal?: AbortSignal) => {
      const params = { page: targetPage, limit, type, operationId, signal };
      return equipmentId
        ? assetLifecycleApi.listEquipmentLifecycle(equipmentId, params)
        : assetLifecycleApi.listLifecycle({ ...params, customerId });
    },
    [customerId, equipmentId, limit, operationId, type],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setPage(1);
    load(1, controller.signal)
      .then((data) => {
        setItems(data.items);
        setTotalPages(data.pagination.totalPages || 1);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load, retry]);

  useEffect(() => {
    setType(initialType);
  }, [initialType]);

  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(({ timeline }) =>
      [timeline.title, timeline.subtitle, timeline.description, timeline.references.equipment?.name, timeline.references.customer?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [items, search]);

  const groups = useMemo(() => groupByMonth(visibleItems), [visibleItems]);

  async function loadMore() {
    const next = page + 1;
    setLoadingMore(true);
    setError(null);
    try {
      const data = await load(next);
      setItems((current) => [...current, ...data.items]);
      setPage(next);
      setTotalPages(data.pagination.totalPages || next);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-caption">Histórico oficial do Asset Lifecycle</p>
        </div>
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 text-xs hover:bg-[var(--color-muted)]"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      {!compact && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar na timeline…"
              className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] pl-9 pr-3 text-sm outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {FILTERS.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setType(filter.type)}
                className={`h-9 rounded-[var(--radius-md)] border px-3 text-xs transition ${
                  type === filter.type
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <TimelineSkeleton />
      ) : error && items.length === 0 ? (
        <TimelineError error={error} onRetry={() => setRetry((value) => value + 1)} />
      ) : visibleItems.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
          Nenhum evento encontrado no ciclo de vida.
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.month} className="space-y-2">
              <div className="sticky top-0 z-10 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)]">
                <CalendarDays className="h-3.5 w-3.5" /> {group.month}
              </div>
              <div className="space-y-2">
                {group.items.map((event) => (
                  <TimelineCard key={event.id} event={event} onClick={() => setSelected(event)} />
                ))}
              </div>
            </div>
          ))}
          {page < totalPages && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm hover:bg-[var(--color-muted)] disabled:opacity-60"
            >
              {loadingMore ? "Carregando…" : "Carregar mais"}
            </button>
          )}
          {error && <p className="text-xs text-[var(--color-danger)]">{error.message}</p>}
        </div>
      )}

      <AssetEventDrawer
        event={selected}
        onClose={() => setSelected(null)}
        onOpenDocument={(event) => setDocumentEvent(event)}
        onOpenOperation={onOpenOperation}
      />
      <Drawer
        open={documentEvent !== null}
        onClose={() => setDocumentEvent(null)}
        eyebrow="Documento"
        title={documentEvent?.timeline.references.document?.number ?? "Documento"}
        width="max-w-[1280px]"
      >
        {documentEvent?.documentId && (
          <DocumentViewer
            source={{
              documentId: documentEvent.documentId,
              operationId: documentEvent.operationId ?? undefined,
              type: documentEvent.timeline.references.document?.type as DocumentTemplateType | undefined,
            }}
            title={documentEvent.timeline.references.document?.number ?? documentEvent.timeline.title}
          />
        )}
      </Drawer>
    </section>
  );
}

function TimelineCard({ event, onClick }: { event: AssetLifecycleEvent; onClick: () => void }) {
  const item = event.timeline;
  const Icon = ICONS[item.icon] ?? Sparkles;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-left shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${item.color}18`, color: item.color }}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{item.title}</span>
          {item.badges.slice(0, 2).map((badge) => (
            <span key={badge} className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
              {badge}
            </span>
          ))}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--color-muted-foreground)]">{item.subtitle}</span>
        <span className="mt-1 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{item.description}</span>
        <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-muted-foreground)]">
          <span>{formatDateTime(item.date)}</span>
          {item.user && <span>Operador: {item.user.name}</span>}
          {item.references.equipment && <span>Equip.: {item.references.equipment.name}</span>}
        </span>
      </span>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition group-hover:translate-x-0.5" />
    </button>
  );
}

function AssetEventDrawer({
  event,
  onClose,
  onOpenDocument,
  onOpenOperation,
}: {
  event: AssetLifecycleEvent | null;
  onClose: () => void;
  onOpenDocument: (event: AssetLifecycleEvent) => void;
  onOpenOperation?: (operationId: string) => void;
}) {
  const item = event?.timeline;
  const Icon = item ? ICONS[item.icon] ?? Sparkles : Sparkles;
  return (
    <Drawer open={event !== null} onClose={onClose} eyebrow="Evento do ativo" title={item?.title ?? "Evento"}>
      {event && item && (
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ backgroundColor: `${item.color}18`, color: item.color }}>
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm text-[var(--color-muted-foreground)]">{item.subtitle}</p>
              <p className="mt-2 text-sm leading-relaxed">{item.description}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {item.badges.map((badge) => (
              <span key={badge} className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                {badge}
              </span>
            ))}
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
            <Row label="Data" value={formatDateTime(item.date)} />
            <Row label="Operador" value={item.user?.name ?? "—"} />
            <Row label="Cliente" value={item.references.customer?.name ?? "—"} />
            <Row label="Equipamento" value={item.references.equipment?.name ?? "—"} />
            <Row label="Tipo" value={item.type} />
          </div>
          {item.attachments.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <h3 className="mb-2 text-sm font-semibold">Anexos</h3>
              <ul className="space-y-2">
                {item.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    <span className="min-w-0 flex-1 truncate">{attachment.originalFileName}</span>
                    <span className="text-caption">{formatBytes(attachment.fileSize)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {item.documentId && (
              <button type="button" onClick={() => onOpenDocument(event)} className={primaryActionClass}>
                <FileText className="h-4 w-4" /> Abrir documento
              </button>
            )}
            {item.operationId && onOpenOperation && (
              <button type="button" onClick={() => onOpenOperation(item.operationId!)} className={secondaryActionClass}>
                <Wrench className="h-4 w-4" /> Abrir operação
              </button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)]/60 py-2 last:border-0">
      <span className="text-caption">{label}</span>
      <span className="text-right text-sm">{value || "—"}</span>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <div className="skeleton h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-3 w-3/4" />
            <div className="skeleton h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-5 text-center">
      <AlertTriangle className="mx-auto h-6 w-6 text-[var(--color-danger)]" />
      <p className="mt-2 text-sm">{error.message}</p>
      <button type="button" onClick={onRetry} className="mt-3 inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-muted)]">
        <RefreshCw className="h-4 w-4" /> Tentar novamente
      </button>
    </div>
  );
}

function groupByMonth(events: AssetLifecycleEvent[]) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
  const map = new Map<string, AssetLifecycleEvent[]>();
  for (const event of events) {
    const key = formatter.format(new Date(event.timeline.date));
    map.set(key, [...(map.get(key) ?? []), event]);
  }
  return [...map.entries()].map(([month, items]) => ({ month, items }));
}

const primaryActionClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-medium text-white hover:opacity-90";
const secondaryActionClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm hover:bg-[var(--color-muted)]";
