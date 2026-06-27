"use client";

/**
 * OperationDetailDrawer — full lateral view of an Operation: timeline, checklist,
 * photos, observations, signature and related documents. Reuses the shared
 * OperationView (Sections → Renderers) foundation. Document previews reuse the
 * DocumentPaper foundation from the Templates/Documentos backlog.
 */
import { useEffect, useMemo, useState } from "react";
import { Drawer } from "@erp/ui/drawer";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { ErrorState } from "@erp/ui/states";
import { Timeline, type TimelineEvent } from "@erp/ui/timeline";
import { OperationView } from "@erp/ui/operations/operation-view";
import { OPERATION_STATUS, OPERATION_TYPE_LABEL, operationCode } from "@erp/ui/operations/operation-shared";
import { DocumentPaper } from "@erp/ui/documents/document-paper";
import { blueprintByType, buildDocument } from "@erp/ui/documents/model-blueprints";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { operationApi, useQuery, type OperationDetail, type OperationDocument } from "@erp/api";
import { OPERATION_DOC_STATUS } from "@erp/ui/operations/operation-shared";

function lifecycleEvents(op: OperationDetail): TimelineEvent[] {
  const events: TimelineEvent[] = [{ id: `${op.id}-created`, at: op.createdAt, kind: "NOTE", label: "Operação criada" }];
  if (op.startedAt) events.push({ id: `${op.id}-started`, at: op.startedAt, kind: "MAINTENANCE", label: "Atendimento iniciado" });
  for (const d of op.documents) events.push({ id: `${op.id}-doc-${d.id}`, at: d.createdAt, kind: "DOCUMENT", label: `${d.number} gerado` });
  if (op.signedAt) events.push({ id: `${op.id}-signed`, at: op.signedAt, kind: "NOTE", label: "Assinatura coletada" });
  if (op.completedAt) events.push({ id: `${op.id}-completed`, at: op.completedAt, kind: "VISIT", label: "Atendimento concluído" });
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export function OperationDetailDrawer({
  operationId,
  open,
  onClose,
}: {
  operationId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const detail = useQuery<OperationDetail | null>(
    (signal) => (operationId ? operationApi.getOperation(operationId, { signal }) : Promise.resolve(null)),
    [operationId],
  );
  const [photoSources, setPhotoSources] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<OperationDocument | null>(null);

  const op = detail.data;
  const orgName = session?.organization.tradeName || session?.organization.legalName || "Empresa";

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

  const previewData = useMemo(() => {
    if (!op || !previewDoc) return null;
    return buildDocument(
      blueprintByType(previewDoc.type),
      {
        number: previewDoc.number,
        date: op.completedAt ?? op.createdAt,
        customer: op.customer?.name ?? "—",
        equipment: op.equipment?.name ?? "—",
        operator: op.operator?.name ?? "—",
        statusLabel: OPERATION_DOC_STATUS[previewDoc.status].label,
      },
      { name: orgName },
    );
  }, [op, previewDoc, orgName]);

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
              <Timeline events={lifecycleEvents(op)} />
            </div>
          </section>

          <OperationView operation={op} photoSources={photoSources} onOpenDocument={(id) => setPreviewDoc(op.documents.find((d) => d.id === id) ?? null)} />
        </div>
      ) : null}

      <Drawer open={previewDoc !== null} onClose={() => setPreviewDoc(null)} eyebrow="Documento" title={previewDoc?.number ?? ""} width="max-w-3xl">
        {previewData && (
          <div className="space-y-3">
            <div className="bg-[var(--color-muted)]/40 -mx-5 px-4 sm:px-6 py-4">
              <DocumentPaper data={previewData} />
            </div>
            <p className="text-[11px] text-[var(--color-muted-foreground)] text-center">Pré-visualização estruturada. A geração final do PDF é feita pelo backend.</p>
          </div>
        )}
      </Drawer>
    </Drawer>
  );
}
