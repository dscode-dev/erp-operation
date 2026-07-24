"use client";

/**
 * Documentos do operador (mobile).
 *
 * OS e Visita Técnica concluídas pelo operador podem ser emitidas aqui pelo
 * Document Engine oficial. Outros documentos atribuídos preservam a revisão
 * da gestão. Downloads e compartilhamentos usam somente o backend autenticado.
 */
import { Suspense, useMemo, useState } from "react";
import { Building2, Download, FileText, Loader2, Share2, ShieldAlert } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import { StatusChip, type ChipTone } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { ErrorState } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { documentsApi, operationApi, useQuery, ApiClientError, type OperationDocument, type OperationSummary } from "@erp/api";
import type { DocumentKind } from "@erp/types";
import { DOCUMENT_KIND_LABEL } from "@erp/types";
import { formatDateTime } from "@erp/utils";
import { CustomerPicker } from "@operator/components/customer-picker";
import { useSelectedCustomer } from "@operator/lib/selected-customer";

type Availability = "AVAILABLE" | "STALE" | "IN_REVIEW" | "AWAITING_PDF";

const AVAILABILITY: Record<Availability, { tone: ChipTone; label: string }> = {
  AVAILABLE: { tone: "success", label: "PDF disponível" },
  STALE: { tone: "warning", label: "PDF desatualizado" },
  IN_REVIEW: { tone: "warning", label: "Em revisão" },
  AWAITING_PDF: { tone: "neutral", label: "Aguardando geração do PDF" },
};

type Row = {
  operation: OperationSummary;
  document: OperationDocument;
  id: string;
  type: DocumentKind;
  number: string;
  equipment: string;
  date: string;
  availability: Availability;
};

function availability(document: OperationDocument): Availability {
  // Um PDF desatualizado ainda tem renderedAt/storageKey antigos: o download
  // falha (DOCUMENT_STALE). Tratamos como estado próprio para permitir regerar.
  if (document.editorialStatus === "STALE") return "STALE";
  if (document.renderedAt && document.storageKey) return "AVAILABLE";
  if (document.editorialStatus && document.editorialStatus !== "READY") return "IN_REVIEW";
  return "AWAITING_PDF";
}

function OperatorDocumentsInner() {
  const [customer, setCustomer] = useSelectedCustomer();
  const [detail, setDetail] = useState<Row | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Documentos cujo download falhou por estarem desatualizados (DOCUMENT_STALE).
  // O backend só detecta isso ao montar o PDF, então marcamos aqui para revelar
  // o botão "Gerar PDF novamente" mesmo quando o estado editorial ainda é READY.
  const [staleIds, setStaleIds] = useState<Set<string>>(() => new Set());
  const ops = useQuery((s) => operationApi.listOperations({ limit: 100, customerId: customer?.id, signal: s }), [customer?.id]);

  // Estado efetivo: um PDF marcado como desatualizado no download vira STALE.
  function effectiveAvailability(row: Row): Availability {
    return staleIds.has(row.id) ? "STALE" : row.availability;
  }

  function markStaleFromError(err: unknown, id: string) {
    if (err instanceof ApiClientError && err.code === "DOCUMENT_STALE") {
      setStaleIds((prev) => new Set(prev).add(id));
    }
  }

  function clearStale(id: string) {
    setStaleIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const items = useMemo<Row[]>(() => {
    if (!customer) return [];
    return (ops.data?.items ?? []).flatMap((op) =>
      op.documents.map((document) => ({
        operation: op,
        document,
        id: document.id,
        type: document.type,
        number: document.number,
        equipment: op.equipment?.name ?? "—",
        date: document.renderedAt ?? document.createdAt,
        availability: availability(document),
      })),
    );
  }, [customer, ops.data]);

  function mapActionError(err: unknown): string {
    if (err instanceof ApiClientError && err.code === "DOCUMENT_STALE") {
      return "O PDF ficou desatualizado. Toque em “Gerar PDF novamente” (atendimentos concluídos) ou peça à gestão.";
    }
    if (err instanceof ApiClientError && err.code === "DOCUMENT_DOWNLOAD_NOT_READY") {
      return "O PDF ainda não foi gerado pela plataforma.";
    }
    return err instanceof Error ? err.message : "Não foi possível obter o PDF.";
  }

  async function fetchPdf(row: Row): Promise<File> {
    const { blob, filename } = await documentsApi.downloadDocument(row.id);
    return new File([blob], filename ?? `${row.number}.pdf`, { type: "application/pdf" });
  }

  async function share(row: Row) {
    setBusy(`share:${row.id}`);
    setActionError(null);
    try {
      const file = await fetchPdf(row);
      const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (typeof nav.share === "function" && (!nav.canShare || nav.canShare({ files: [file] }))) {
        // Share sheet do dispositivo: WhatsApp, E-mail, Telegram etc.
        await nav.share({
          files: [file],
          title: row.number,
          text: `${DOCUMENT_KIND_LABEL[row.type]} ${row.number} — ${row.operation.customer?.name ?? ""}`.trim(),
        });
      } else {
        // Navegador sem Web Share com arquivos: cai para o download.
        triggerDownload(file);
        setActionError("Este navegador não abre o compartilhamento nativo; o PDF foi baixado para compartilhar manualmente.");
      }
    } catch (err) {
      // Cancelamento do share sheet não é erro.
      if (err instanceof DOMException && err.name === "AbortError") return;
      markStaleFromError(err, row.id);
      setActionError(mapActionError(err));
    } finally {
      setBusy(null);
    }
  }

  async function download(row: Row) {
    setBusy(`download:${row.id}`);
    setActionError(null);
    try {
      triggerDownload(await fetchPdf(row));
    } catch (err) {
      markStaleFromError(err, row.id);
      setActionError(mapActionError(err));
    } finally {
      setBusy(null);
    }
  }

  async function emit(row: Row) {
    setBusy(`emit:${row.id}`);
    setActionError(null);
    try {
      const handoff = await documentsApi.saveHandoffDraft(row.operation.id, row.type);
      await documentsApi.submitHandoff(handoff.id);
      await documentsApi.finalizeHandoffReview(handoff.id);
      await documentsApi.renderDocument(handoff.id);
      clearStale(row.id);
      await ops.refetch();
      setDetail(null);
    } catch (err) {
      setActionError(mapActionError(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Documentos</h1>
        <p className="text-caption">Emita, baixe ou compartilhe suas OS e Visitas Técnicas concluídas.</p>
      </header>

      <div className="sticky top-12 z-10 -mx-4 px-4 py-2 bg-[var(--color-background)]/95 backdrop-blur">
        <CustomerPicker selected={customer} onSelect={setCustomer} />
      </div>

      {actionError && (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2 text-sm text-[var(--color-warning)]">{actionError}</p>
      )}

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
          {items.map((d) => {
            const avail = effectiveAvailability(d);
            const av = AVAILABILITY[avail];
            const canGet = avail === "AVAILABLE";
            const canEmit = !canGet && d.operation.status === "COMPLETED" && (d.type === "WORK_ORDER" || d.type === "TECHNICAL_REPORT");
            return (
              <li key={d.id} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]">
                <button type="button" onClick={() => setDetail(d)} className="w-full text-left flex items-center gap-3 p-3.5 active:scale-[0.99] transition-transform">
                  <span className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-muted)] grid place-items-center text-[var(--color-muted-foreground)] shrink-0"><FileText className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium truncate">{d.number}</span>
                    <span className="block text-caption truncate">{DOCUMENT_KIND_LABEL[d.type]} · {d.equipment} · {formatDateTime(d.date)}</span>
                  </span>
                  <StatusChip tone={av.tone} dot>{av.label}</StatusChip>
                </button>
                {canGet && (
                  <div className="flex gap-2 border-t border-[var(--color-border)] px-3.5 py-2">
                    <ActionButton icon={Share2} label="Compartilhar" busy={busy === `share:${d.id}`} onClick={() => void share(d)} primary />
                    <ActionButton icon={Download} label="Baixar" busy={busy === `download:${d.id}`} onClick={() => void download(d)} />
                  </div>
                )}
                {canEmit && (
                  <div className="border-t border-[var(--color-border)] px-3.5 py-2">
                    <ActionButton icon={FileText} label={avail === "STALE" ? "Gerar PDF novamente" : "Gerar PDF"} busy={busy === `emit:${d.id}`} onClick={() => void emit(d)} primary />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Drawer open={detail !== null} onClose={() => setDetail(null)} eyebrow="Documento" title={detail?.number ?? ""} width="max-w-[1280px]">
        {detail && (() => {
          const detailAvail = effectiveAvailability(detail);
          const detailCompleted = detail.operation.status === "COMPLETED";
          const detailDirect = detail.type === "WORK_ORDER" || detail.type === "TECHNICAL_REPORT";
          return (
          <div className="space-y-3">
            {detailAvail === "AVAILABLE" ? (
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone="success" dot>PDF disponível</StatusChip>
                <div className="ml-auto flex gap-2">
                  <ActionButton icon={Share2} label="Compartilhar" busy={busy === `share:${detail.id}`} onClick={() => void share(detail)} primary />
                  <ActionButton icon={Download} label="Baixar" busy={busy === `download:${detail.id}`} onClick={() => void download(detail)} />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2 text-sm text-[var(--color-warning)]">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {detailAvail === "STALE"
                    ? detailCompleted && detailDirect
                      ? "O PDF ficou desatualizado após alterações no atendimento. Toque em Gerar PDF novamente para atualizar e depois baixar/compartilhar."
                      : "O PDF ficou desatualizado após alterações. Conclua o atendimento para gerar novamente ou peça à gestão."
                    : detailAvail === "IN_REVIEW"
                    ? "Este documento está em revisão. O download e o compartilhamento ficam disponíveis após a aprovação e a geração do PDF na plataforma."
                    : "A revisão foi concluída, mas o PDF ainda não foi gerado pela plataforma. Você poderá baixar e compartilhar assim que for emitido."}
                </span>
              </div>
            )}
            {detailAvail !== "AVAILABLE" && detailCompleted && detailDirect && (
              <ActionButton icon={FileText} label={detailAvail === "STALE" ? "Gerar PDF novamente" : "Gerar PDF oficial"} busy={busy === `emit:${detail.id}`} onClick={() => void emit(detail)} primary />
            )}
            <DocumentViewer
              source={{ documentId: detail.id, operationId: detail.operation.id, type: detail.type }}
              title={detail.number}
              onRendered={ops.refetch}
            />
          </div>
          );
        })()}
      </Drawer>
    </div>
  );
}

function triggerDownload(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function ActionButton({ icon: Icon, label, busy, onClick, primary = false }: { icon: typeof Share2; label: string; busy: boolean; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-3 text-sm font-medium disabled:opacity-50 active:scale-[0.98] ${
        primary
          ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
          : "border border-[var(--color-border)] hover:bg-[var(--color-muted)]"
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />} {label}
    </button>
  );
}

export default function OperatorDocumentsPage() {
  return (
    <Suspense fallback={null}>
      <OperatorDocumentsInner />
    </Suspense>
  );
}
