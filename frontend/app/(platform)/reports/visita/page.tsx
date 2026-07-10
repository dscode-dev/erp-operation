"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, CheckCircle2, FileText, Save, X } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { SectionCard } from "@erp/ui/section-card";
import { SignaturePad } from "@erp/ui/documents/signature-pad";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { ErrorState } from "@erp/ui/states";
import { SkeletonList } from "@erp/ui/skeletons";
import { operationApi, useQuery, type OperationChecklistItem, type OperationDetail, type OperationSummary } from "@erp/api";
import { DOCUMENT_KIND_LABEL } from "@erp/types";

type PendingPhoto = { dataUrl: string; name: string; caption: string };

export default function VisitaTecnicaPage() {
  const operations = useQuery((signal) => operationApi.listOperations({ page: 1, limit: 50, signal }), []);
  const [operationId, setOperationId] = useState("");
  const detail = useQuery<OperationDetail | null>(
    (signal) => (operationId ? operationApi.getOperation(operationId, { signal }) : Promise.resolve(null)),
    [operationId],
  );

  const op = detail.data;
  const [observations, setObservations] = useState("");
  const [checklist, setChecklist] = useState<OperationChecklistItem[]>([]);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!operations.data?.items.length || operationId) return;
    setOperationId(operations.data.items[0].id);
  }, [operationId, operations.data?.items]);

  useEffect(() => {
    if (!op) return;
    setObservations(op.observations ?? "");
    setChecklist(op.checklist ?? []);
    setPhotos([]);
    setSignature(null);
    setError(null);
    setNotice(null);
  }, [op]);

  async function addPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const accepted = files.filter((file) => ["image/png", "image/jpeg"].includes(file.type));
    const mapped = await Promise.all(
      accepted.map(async (file) => ({
        dataUrl: await fileToDataUrl(file),
        name: file.name,
        caption: file.name,
      })),
    );
    setPhotos((current) => [...current, ...mapped]);
  }

  function updateChecklist(index: number, patch: Partial<OperationChecklistItem>) {
    setChecklist((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function persistEvidence(status?: OperationDetail["status"]) {
    if (!op) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await operationApi.updateOperation(op.id, {
        ...(status ? { status } : {}),
        observations: observations || null,
        checklist,
        photos: photos.map((photo) => ({ dataUrl: photo.dataUrl, caption: photo.caption || photo.name })),
        ...(signature ? { signatureData: signature, signedAt: new Date().toISOString() } : {}),
      });
      setPhotos([]);
      setSignature(null);
      setNotice(status === "COMPLETED" ? "Evidências salvas e Operation concluída." : "Evidências salvas na Operation.");
      detail.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar as evidências.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[1280px] space-y-6">
      <Link href="/reports" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
        <ArrowLeft className="h-4 w-4" /> Relatórios
      </Link>

      <PageHeader
        eyebrow="Relatório de Visita"
        title="Evidências da Operation"
        description="Fluxo consolidado: selecione uma Operation real, salve observações, checklist, fotos e assinatura; depois visualize ou emita o relatório pelo Document Engine."
      />

      <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Operation real</span>
            <select
              value={operationId}
              onChange={(event) => setOperationId(event.target.value)}
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
            >
              {(operations.data?.items ?? []).map((operation) => (
                <option key={operation.id} value={operation.id}>
                  {operationLabel(operation)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)]">
            <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">
              Fonte: Operation
            </span>
            <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1">
              Documento: {DOCUMENT_KIND_LABEL.TECHNICAL_REPORT}
            </span>
          </div>
        </div>
      </section>

      {detail.loading && !op ? (
        <SkeletonList rows={8} />
      ) : detail.error && !op ? (
        <ErrorState error={detail.error} onRetry={detail.refetch} />
      ) : op ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-4">
            <SectionCard title="1. Identidade da Operation">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Cliente" value={op.customer?.name ?? "—"} />
                <Info label="Equipamento" value={op.equipment?.name ?? "—"} />
                <Info label="Operador" value={op.operator?.name ?? "—"} />
                <Info label="Status" value={op.status} />
                <Info label="Início" value={op.startedAt ? new Date(op.startedAt).toLocaleString("pt-BR") : "—"} />
                <Info label="Conclusão" value={op.completedAt ? new Date(op.completedAt).toLocaleString("pt-BR") : "—"} />
              </div>
            </SectionCard>

            <SectionCard title="2. Atividades / checklist">
              {checklist.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum item de checklist registrado nesta Operation.</p>
              ) : (
                <div className="space-y-2">
                  {checklist.map((item, index) => (
                    <div key={`${item.label}-${index}`} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                      <label className="flex items-start gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={(event) => updateChecklist(index, { done: event.target.checked })}
                          className="mt-1"
                        />
                        <span>{item.label}</span>
                      </label>
                      <input
                        value={item.note ?? ""}
                        onChange={(event) => updateChecklist(index, { note: event.target.value })}
                        placeholder="Observação do item"
                        className="mt-2 h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="3. Observações técnicas">
              <textarea
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                rows={5}
                placeholder="Descreva serviço executado, condições do equipamento, recomendações e pendências."
                className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              />
            </SectionCard>

            <SectionCard title="4. Fotos / evidências">
              <div className="space-y-3">
                <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]">
                  <Camera className="mb-1 h-5 w-5" />
                  Adicionar evidências PNG/JPEG
                  <input type="file" accept="image/png,image/jpeg" multiple onChange={addPhotos} className="hidden" />
                </label>
                <div className="grid gap-2">
                  {op.photos.map((photo) => (
                    <div key={photo.id} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm">
                      <span>{photo.caption ?? "Evidência persistida"}</span>
                      <span className="text-[var(--color-muted-foreground)]">{photo.mimeType}</span>
                    </div>
                  ))}
                  {photos.map((photo, index) => (
                    <div key={`${photo.name}-${index}`} className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{photo.name}</span>
                        <button type="button" onClick={() => setPhotos((items) => items.filter((_, i) => i !== index))} aria-label="Remover evidência pendente">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <input
                        value={photo.caption}
                        onChange={(event) => setPhotos((items) => items.map((item, i) => (i === index ? { ...item, caption: event.target.value } : item)))}
                        className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard title="5. Assinatura coletada">
              {op.signedAt ? (
                <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-[var(--color-success)]">
                  <CheckCircle2 className="h-4 w-4" />
                  Assinatura já persistida em {new Date(op.signedAt).toLocaleString("pt-BR")}
                </div>
              ) : null}
              <SignaturePad onChange={setSignature} onConfirm={setSignature} />
            </SectionCard>

            {error && <p className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</p>}
            {notice && <p className="rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-[var(--color-success)]">{notice}</p>}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => persistEvidence()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? "Salvando…" : "Salvar evidências"}
              </button>
              <button type="button" onClick={() => persistEvidence("COMPLETED")} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium hover:bg-[var(--color-muted)] disabled:opacity-50">
                <CheckCircle2 className="h-4 w-4" />
                Salvar e concluir
              </button>
            </div>
          </div>

          <section className="min-w-0 space-y-3">
            <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold">Preview real do relatório</h2>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    Salve as evidências antes de atualizar, renderizar ou baixar. Este viewer consome exclusivamente o Document Engine.
                  </p>
                </div>
              </div>
            </div>
            <DocumentViewer
              source={{ operationId: op.id, type: "TECHNICAL_REPORT" }}
              title={`Relatório de Visita · OP-${String(op.number).padStart(6, "0")}`}
              onRendered={detail.refetch}
            />
          </section>
        </div>
      ) : (
        <SectionCard title="Nenhuma Operation disponível">
          <p className="text-sm text-[var(--color-muted-foreground)]">Crie uma Operation antes de registrar evidências de visita.</p>
        </SectionCard>
      )}
    </div>
  );
}

function operationLabel(operation: OperationSummary): string {
  return `OP-${String(operation.number).padStart(6, "0")} · ${operation.customer?.name ?? "Cliente"} · ${operation.equipment?.name ?? "sem equipamento"} · ${operation.status}`;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)]">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
