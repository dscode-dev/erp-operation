"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarClock, Camera, CheckCircle2, ClipboardCheck, Clock, FileText, MapPin, Package, PenLine, Play, XCircle } from "lucide-react";
import { SkeletonCard, SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { StatusPill } from "@erp/ui/status-pill";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { SignaturePad } from "@erp/ui/documents/signature-pad";
import { PhotoInput, type CapturedPhoto } from "@erp/ui/photo-input";
import { assignmentsApi, inventoryApi, operationApi, useQuery, type Assignment, type InventoryItem, type OperationDetail, type OperationDocument, type OperationPart, type Product } from "@erp/api";
import {
  ASSIGNMENT_STATUS_LABEL,
  ASSIGNMENT_STATUS_PILL,
  assignmentTime,
} from "@erp/ui/assignments/assignment-shared";

const workflow = [
  { label: "Aceitar", icon: CheckCircle2 },
  { label: "Checklist", icon: ClipboardCheck },
  { label: "Fotos", icon: Camera },
  { label: "Materiais", icon: Package },
  { label: "Documentos", icon: FileText },
  { label: "Assinatura", icon: PenLine },
  { label: "Concluir", icon: CheckCircle2 },
];

export default function OperatorServiceDetail() {
  const params = useParams<{ id: string }>();
  const assignment = useQuery((signal) => assignmentsApi.getAssignment(params.id, { signal }), [params.id]);
  const history = useQuery(
    (signal) => assignment.data ? assignmentsApi.getAssignmentHistory(assignment.data.operationId, { signal }) : Promise.resolve([]),
    [assignment.data?.operationId],
  );
  const materials = useQuery(
    (signal) => assignment.data ? inventoryApi.listOperationMaterials(assignment.data.operationId, { signal }) : Promise.resolve([]),
    [assignment.data?.operationId],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "accept" | "start" | "complete" | "reject") {
    if (!assignment.data) return;
    setBusy(action);
    setError(null);
    try {
      if (action === "accept") await assignmentsApi.acceptAssignment(assignment.data.id);
      if (action === "start") await assignmentsApi.startAssignment(assignment.data.id);
      if (action === "complete") await assignmentsApi.completeAssignment(assignment.data.id, "Concluído pelo Operator PWA");
      if (action === "reject") await assignmentsApi.rejectAssignment(assignment.data.id, "Recusado pelo operador");
      assignment.refetch();
      history.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a Assignment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-5">
      <Link href="/operator/services" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
        <ArrowLeft className="h-4 w-4" /> Minhas ordens
      </Link>

      {assignment.loading && !assignment.data ? (
        <SkeletonCard />
      ) : assignment.error && !assignment.data ? (
        <ErrorState error={assignment.error} onRetry={assignment.refetch} />
      ) : !assignment.data ? (
        <EmptyState icon={ClipboardCheck} title="Assignment não encontrada" description="A ordem não está mais disponível." />
      ) : (
        <AssignmentWorkflow
          assignment={assignment.data}
          history={history.data ?? []}
          historyLoading={history.loading}
          materials={materials.data ?? []}
          materialsLoading={materials.loading}
          materialsError={materials.error}
          onMaterialsRefresh={materials.refetch}
          error={error}
          busy={busy}
          onAction={run}
        />
      )}
    </div>
  );
}

function AssignmentWorkflow({
  assignment,
  history,
  historyLoading,
  materials,
  materialsLoading,
  materialsError,
  onMaterialsRefresh,
  error,
  busy,
  onAction,
}: {
  assignment: Assignment;
  history: Awaited<ReturnType<typeof assignmentsApi.getAssignmentHistory>>;
  historyLoading: boolean;
  materials: OperationPart[];
  materialsLoading: boolean;
  materialsError: Error | null;
  onMaterialsRefresh: () => void;
  error: string | null;
  busy: string | null;
  onAction: (action: "accept" | "start" | "complete" | "reject") => void;
}) {
  const op = assignment.operation;
  const operation = useQuery((signal) => operationApi.getOperation(op.id, { signal }), [op.id]);
  const [document, setDocument] = useState<OperationDocument | null>(null);
  const address = op.address
    ? `${op.address.street ?? ""}${op.address.number ? `, ${op.address.number}` : ""} · ${op.address.city ?? "cidade não informada"}/${op.address.state ?? "UF"}`
    : "Endereço não informado";
  const pmoc = op.maintenanceExecution?.plan.pmocPlan;
  const pmocExecution = op.maintenanceExecution?.pmocExecutionRequest;
  return (
    <>
      <header className="space-y-3">
        <StatusPill status={ASSIGNMENT_STATUS_PILL[assignment.status]} label={ASSIGNMENT_STATUS_LABEL[assignment.status]} />
        <div>
          <h1 className="text-section-title leading-tight">{op.customer?.name ?? "Cliente não informado"}</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            OP-{String(op.number).padStart(6, "0")} · {op.equipment?.name ?? "Sem equipamento"}
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--color-primary)]">{op.scheduledFor ? assignmentTime(op.scheduledFor) : "Não agendado"}</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Criada em {assignmentTime(op.createdAt)}</p>
        </div>
      </header>

      {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}

      <section className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3">
        <InfoRow icon={MapPin} label="Endereço" value={address} />
        <InfoRow icon={Package} label="Equipamento" value={op.equipment?.name ?? "Sem equipamento vinculado"} />
        <InfoRow icon={ClipboardCheck} label="Tipo / status da Operation" value={`${op.type} · ${op.status}`} />
        <InfoRow icon={Clock} label="Data do agendamento" value={op.scheduledFor ? assignmentTime(op.scheduledFor) : "Não agendado"} />
      </section>

      {pmoc && (
        <section className="rounded-[var(--radius-xl)] border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 p-4 space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">Plano PMOC</p>
            <h2 className="mt-1 font-semibold">PMOC-{String(pmoc.number).padStart(6, "0")} · Execução {String(pmocExecution?.executionNumber ?? 0).padStart(3, "0")}</h2>
          </div>
          <InfoRow icon={CalendarClock} label="Periodicidade" value={pmoc.periodicity} />
          <InfoRow icon={ClipboardCheck} label="Responsável técnico" value={pmoc.responsibleTechnician} />
          <InfoRow icon={Package} label="Equipamentos cobertos" value={pmoc.equipments.map((item) => item.equipment.name).join(", ") || "Equipamento principal"} />
          <InfoRow icon={PenLine} label="Assinatura do cliente" value={operation.data?.signatureCaptured ? "Coletada" : "Pendente para esta execução"} />
          <InfoRow icon={FileText} label="Documento PMOC" value={op.documents.some((item) => item.type === "PMOC") ? "Disponível na seção Documentos" : "Será emitido pelo Document Engine após o preenchimento"} />
        </section>
      )}

      <section className="grid gap-2">
        {assignment.status === "ASSIGNED" && (
          <>
            <BigButton icon={CheckCircle2} label="Aceitar ordem" busy={busy === "accept"} onClick={() => onAction("accept")} />
            <button onClick={() => onAction("reject")} disabled={busy === "reject"} className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-danger)]/30 text-sm font-semibold text-[var(--color-danger)] disabled:opacity-50">
              <XCircle className="h-5 w-5" /> Recusar
            </button>
          </>
        )}
        {assignment.status === "ACCEPTED" && <BigButton icon={Play} label="Iniciar execução" busy={busy === "start"} onClick={() => onAction("start")} />}
        {assignment.status === "STARTED" && <BigButton icon={CheckCircle2} label="Concluir atendimento" busy={busy === "complete"} onClick={() => onAction("complete")} />}
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Checklist da Operation</h2>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          {op.checklist.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum checklist definido para esta Operation.</p>
          ) : (
            <ul className="space-y-2">
              {op.checklist.map((item, index) => (
                <li key={`${item.label}-${index}`} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 grid h-5 w-5 place-items-center rounded-full border ${item.done ? "border-[var(--color-success)] bg-[var(--color-success)] text-white" : "border-[var(--color-border)]"}`}>
                    {item.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                  </span>
                  <span>
                    <span className="font-medium">{item.label}</span>
                    {item.note ? <span className="block text-xs text-[var(--color-muted-foreground)]">{item.note}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {operation.data?.maintenanceExecution?.plan.pmocPlan && (
        <PmocFieldExecution operation={operation.data} onSaved={operation.refetch} />
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Materiais utilizados</h2>
          {assignment.status === "STARTED" && <OperatorMaterialButton operationId={op.id} onSaved={onMaterialsRefresh} />}
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          {materialsLoading && materials.length === 0 ? (
            <SkeletonList rows={2} />
          ) : materialsError && materials.length === 0 ? (
            <ErrorState error={materialsError} onRetry={onMaterialsRefresh} />
          ) : materials.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Nenhum material consumido. {assignment.status === "STARTED" ? "Use “Adicionar” quando houver consumo em campo." : "Materiais podem ser lançados após iniciar a execução."}
            </p>
          ) : (
            <ul className="space-y-2">
              {materials.map((part) => (
                <li key={part.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 font-medium truncate">{part.product.name}</span>
                    <span className="font-mono tabular-nums">{Number(part.quantity).toLocaleString("pt-BR")} {part.product.unit}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{part.product.sku} · {part.inventoryItem.location ?? "sem localização"}{part.notes ? ` · ${part.notes}` : ""}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Documentos da Operation</h2>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          {op.documents.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum documento disponível para esta Operation.</p>
          ) : (
            <div className="grid gap-2">
              {op.documents.map((doc) => (
                <button key={doc.id} onClick={() => setDocument(doc)} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-3 text-left text-sm active:scale-[0.99]">
                  <span className="min-w-0">
                    <span className="block font-medium truncate">{doc.number}</span>
                    <span className="block text-xs text-[var(--color-muted-foreground)]">{doc.type} · {doc.status}</span>
                  </span>
                  <FileText className="h-5 w-5 text-[var(--color-primary)]" />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Recursos de campo</h2>
        <div className="grid grid-cols-2 gap-2">
          {workflow.map(({ label, icon: Icon }) => (
            <div key={label} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
              <Icon className="mb-2 h-5 w-5 text-[var(--color-primary)]" />
              <div className="text-sm font-medium">{label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Fotos e assinatura são preservadas na Operation principal. Coleta offline e assinatura eletrônica avançada ficam fora da V1.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Timeline da Assignment</h2>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          {historyLoading && history.length === 0 ? (
            <SkeletonList rows={3} />
          ) : history.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">Sem eventos registrados.</p>
          ) : (
            <ol className="space-y-3">
              {history.map((item) => (
                <li key={item.id} className="flex gap-3 text-sm">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />
                  <span>
                    <span className="font-medium">{item.event}</span>
                    <span className="block text-xs text-[var(--color-muted-foreground)]">
                      {item.actor.name} · {new Date(item.createdAt).toLocaleString("pt-BR")}
                    </span>
                    {item.notes && <span className="block text-xs text-[var(--color-muted-foreground)]">{item.notes}</span>}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {document && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-3">
          <div className="mx-auto max-w-[1280px] rounded-[var(--radius-xl)] bg-[var(--color-background)] p-3 shadow-[var(--shadow-hover)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-caption">Documento oficial</p>
                <h2 className="font-semibold">{document.number}</h2>
              </div>
              <button onClick={() => setDocument(null)} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm">Fechar</button>
            </div>
            <DocumentViewer source={{ documentId: document.id, operationId: op.id, type: document.type }} title={document.number} />
          </div>
        </div>
      )}
    </>
  );
}

function PmocFieldExecution({ operation, onSaved }: { operation: OperationDetail; onSaved: () => void }) {
  const [items, setItems] = useState(operation.maintenanceChecklistItems);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState(operation.customerSignerName ?? "");
  const [signerRole, setSignerRole] = useState(operation.customerSignerRole ?? "");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setFeedback(null);
    try {
      const encodedPhotos = await Promise.all(photos.map(async (photo) => ({ dataUrl: await fileDataUrl(photo.file), caption: photo.name })));
      await operationApi.updateOperation(operation.id, {
        maintenanceChecklist: items.map((item) => ({
          equipmentId: item.equipmentId,
          maintenanceType: item.maintenanceType,
          description: item.description,
          result: item.result ?? (item.executed ? "YES" : "NO"),
          executed: (item.result ?? (item.executed ? "YES" : "NO")) === "YES",
          observations: item.observations,
        })),
        photos: encodedPhotos,
        signatureData: signature,
        customerSignerName: signature ? signerName : undefined,
        customerSignerRole: signature ? signerRole : undefined,
        signedAt: signature ? new Date().toISOString() : undefined,
      });
      setPhotos([]);
      setFeedback("Execução PMOC salva. O Preview foi invalidado e refletirá os novos dados.");
      onSaved();
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "Não foi possível salvar o PMOC.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--color-primary)]/30 bg-[var(--color-card)] p-4">
      <div><p className="text-caption">Execução vinculada</p><h2 className="font-semibold">PMOC em campo</h2><p className="text-xs text-[var(--color-muted-foreground)]">Preencha os procedimentos por equipamento, evidências e assinatura do cliente.</p></div>
      <div className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum procedimento foi preparado para esta execução.</p> : items.map((item, index) => (
          <div key={item.id ?? index} className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3">
            <p className="text-sm font-medium">{item.equipment?.name ?? "Procedimento geral"}</p>
            <p className="text-sm">{item.description}</p>
            <div className="grid grid-cols-3 gap-2">
              {([['YES','Sim'],['NO','Não'],['NOT_APPLICABLE','N.A.']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setItems((current) => current.map((candidate, currentIndex) => currentIndex === index ? { ...candidate, result: value, executed: value === 'YES' } : candidate))} className={`h-10 rounded-[var(--radius-md)] border text-sm font-medium ${(item.result ?? (item.executed ? 'YES' : 'NO')) === value ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border)]'}`}>{label}</button>)}
            </div>
            <input value={item.observations ?? ""} onChange={(event) => setItems((current) => current.map((candidate, currentIndex) => currentIndex === index ? { ...candidate, observations: event.target.value } : candidate))} placeholder="Observação do procedimento" className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm" />
          </div>
        ))}
      </div>
      <PhotoInput photos={photos} onChange={setPhotos} />
      <div className="grid gap-2"><input value={signerName} onChange={(event) => setSignerName(event.target.value)} placeholder="Nome do cliente/responsável" className="h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm" /><input value={signerRole} onChange={(event) => setSignerRole(event.target.value)} placeholder="Função ou vínculo" className="h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm" /></div>
      <SignaturePad onChange={setSignature} onConfirm={setSignature} />
      {feedback && <p className="text-sm text-[var(--color-muted-foreground)]">{feedback}</p>}
      <button type="button" disabled={busy || (Boolean(signature) && !signerName.trim())} onClick={() => void save()} className="h-12 w-full rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-sm font-semibold text-white disabled:opacity-50">{busy ? "Salvando…" : "Salvar execução PMOC"}</button>
    </section>
  );
}

function fileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Falha ao ler a foto"));
    reader.readAsDataURL(file);
  });
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{label}</span>
        <span className="block break-words">{value}</span>
      </span>
    </div>
  );
}

function OperatorMaterialButton({ operationId, onSaved }: { operationId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm font-medium">
        Adicionar
      </button>
      {open && <OperatorMaterialPanel operationId={operationId} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onSaved(); }} />}
    </>
  );
}

function OperatorMaterialPanel({ operationId, onClose, onSaved }: { operationId: string; onClose: () => void; onSaved: () => void }) {
  const products = useQuery((signal) => inventoryApi.listProducts({ limit: 100, active: true, signal }), []);
  const inventory = useQuery((signal) => inventoryApi.listInventory({ limit: 100, active: true, signal }), []);
  const [productId, setProductId] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const productItems = inventory.data?.items.filter((item: InventoryItem) => item.productId === productId) ?? [];

  useEffect(() => {
    const first = products.data?.items[0]?.id ?? "";
    if (!productId && first) setProductId(first);
  }, [productId, products.data]);

  useEffect(() => {
    setInventoryItemId((current) => productItems.some((item) => item.id === current) ? current : productItems[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, inventory.data]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await inventoryApi.addOperationMaterial(operationId, {
        productId,
        inventoryItemId,
        quantity: Number(quantity),
        notes: notes || null,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o material.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 p-3">
      <div className="w-full rounded-t-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 shadow-[var(--shadow-hover)]">
        <div className="mb-3">
          <p className="text-caption">Inventário oficial</p>
          <h2 className="text-lg font-semibold">Adicionar material</h2>
        </div>
        {(products.loading || inventory.loading) && !products.data ? <SkeletonList rows={3} /> : null}
        {products.error && !products.data ? <ErrorState error={products.error} onRetry={products.refetch} /> : null}
        {inventory.error && !inventory.data ? <ErrorState error={inventory.error} onRetry={inventory.refetch} /> : null}
        {error && <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
        <div className="space-y-3">
          <Field label="Produto">
            <select value={productId} onChange={(event) => setProductId(event.target.value)} className={inputCls}>
              {(products.data?.items ?? []).map((product: Product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
            </select>
          </Field>
          <Field label="Item de estoque">
            <select value={inventoryItemId} onChange={(event) => setInventoryItemId(event.target.value)} className={inputCls}>
              {productItems.map((item) => <option key={item.id} value={item.id}>{item.location ?? "Sem localização"} · disponível {Number(item.availableQuantity).toLocaleString("pt-BR")}</option>)}
            </select>
          </Field>
          <Field label="Quantidade">
            <input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputCls} />
          </Field>
          <Field label="Observação">
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputCls} min-h-20 py-2`} />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={onClose} className="h-11 rounded-[var(--radius-lg)] border border-[var(--color-border)] text-sm font-semibold">Cancelar</button>
          <button onClick={submit} disabled={saving || !productId || !inventoryItemId || Number(quantity) <= 0} className="h-11 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Registrando…" : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>;
}

function BigButton({ icon: Icon, label, busy, onClick }: { icon: typeof CheckCircle2; label: string; busy: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={busy} className="inline-flex h-14 items-center justify-center gap-2 rounded-[var(--radius-xl)] bg-[var(--color-primary)] px-4 text-base font-semibold text-white shadow-[var(--shadow-hover)] disabled:opacity-50">
      <Icon className="h-5 w-5" /> {busy ? "Atualizando…" : label}
    </button>
  );
}

const inputCls = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-11 text-sm outline-none focus:border-[var(--color-primary)]";
