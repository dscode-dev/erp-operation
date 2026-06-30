"use client";

/**
 * OperationDetailDrawer — full lateral view of an Operation: timeline, checklist,
 * photos, observations, signature and related documents. Reuses the shared
 * OperationView (Sections → Renderers) foundation. Document previews use the
 * production Document Engine viewer.
 */
import { useEffect, useState } from "react";
import { Drawer } from "@erp/ui/drawer";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { ErrorState } from "@erp/ui/states";
import { AssetTimeline } from "@erp/ui/assets/asset-timeline";
import { OperationView } from "@erp/ui/operations/operation-view";
import { OPERATION_STATUS, OPERATION_TYPE_LABEL, operationCode } from "@erp/ui/operations/operation-shared";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { operationApi, useQuery, type OperationDetail, type OperationDocument } from "@erp/api";

export function OperationDetailDrawer({
  operationId,
  open,
  onClose,
}: {
  operationId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const detail = useQuery<OperationDetail | null>(
    (signal) => (operationId ? operationApi.getOperation(operationId, { signal }) : Promise.resolve(null)),
    [operationId],
  );
  const [photoSources, setPhotoSources] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<OperationDocument | null>(null);

  const op = detail.data;

  // Load photo content (base64) once an operation is loaded.
  useEffect(() => {
    if (!op || op.photos.length === 0) { setPhotoSources({}); return; }
    let active = true;
    setPhotoSources({});
    op.photos.forEach((p) => {
      operationApi
        .getOperationPhoto(p.id)
        .then((c) => { if (active) setPhotoSources((prev) => ({ ...prev, [p.id]: `data:${c.mimeType};base64,${c.contentBase64}` })); })
        .catch(() => undefined);
    });
    return () => { active = false; };
  }, [op]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Operação"
      title={op ? operationCode(op.number) : "Operação"}
      width="max-w-2xl"
    >
      {detail.loading && !op ? (
        <SkeletonList rows={6} />
      ) : detail.error && !op ? (
        <ErrorState error={detail.error} onRetry={detail.refetch} />
      ) : op ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone="primary">{OPERATION_TYPE_LABEL[op.type]}</StatusChip>
            <StatusChip tone={OPERATION_STATUS[op.status].tone} dot>{OPERATION_STATUS[op.status].label}</StatusChip>
          </div>

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Timeline</h3>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <AssetTimeline operationId={op.id} compact />
            </div>
          </section>

          <OperationView operation={op} photoSources={photoSources} onOpenDocument={(id) => setPreviewDoc(op.documents.find((d) => d.id === id) ?? null)} />
        </div>
      ) : null}

      <Drawer open={previewDoc !== null} onClose={() => setPreviewDoc(null)} eyebrow="Documento" title={previewDoc?.number ?? ""} width="max-w-[1280px]">
        {op && previewDoc && (
          <DocumentViewer
            source={{ documentId: previewDoc.id, operationId: op.id, type: previewDoc.type }}
            title={previewDoc.number}
            onRendered={detail.refetch}
          />
        )}
      </Drawer>
    </Drawer>
  );
}
