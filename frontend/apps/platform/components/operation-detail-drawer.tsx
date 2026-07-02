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
import { Gate } from "@erp/ui/auth/gate";
import { assignmentsApi, budgetsApi, inventoryApi, operationApi, pricingApi, useQuery, type Assignment, type Budget, type BudgetItemPayload, type BudgetPayload, type InventoryItem, type OperationDetail, type OperationDocument, type OperationPart, type Product, type ProductPricing } from "@erp/api";
import { formatCurrencyBRL, formatNumber } from "@erp/utils";
import { ASSIGNMENT_STATUS_LABEL, assignmentTime } from "@erp/ui/assignments/assignment-shared";
import { UserSelect } from "./entity-select";

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
  const assignmentQuery = useQuery(
    (signal) => (operationId ? assignmentsApi.listAssignments({ operationId, limit: 1, signal }) : Promise.resolve({ items: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 0 } })),
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

          <AssignmentSection assignment={assignmentQuery.data?.items[0] ?? null} loading={assignmentQuery.loading} onRefresh={() => { assignmentQuery.refetch(); detail.refetch(); }} />

          <OperationBudgetsSection operation={op} />

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Timeline</h3>
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <AssetTimeline operationId={op.id} compact />
            </div>
          </section>

          <OperationView operation={op} photoSources={photoSources} onOpenDocument={(id) => setPreviewDoc(op.documents.find((d) => d.id === id) ?? null)} />

          <OperationMaterialsSection operationId={op.id} />
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

function AssignmentSection({
  assignment,
  loading,
  onRefresh,
}: {
  assignment: Assignment | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const [operatorId, setOperatorId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOperatorId(assignment?.assignedTo ?? "");
    setError(null);
  }, [assignment?.assignedTo]);

  async function reassign() {
    if (!assignment || !operatorId || operatorId === assignment.assignedTo) return;
    setSaving(true);
    setError(null);
    try {
      await assignmentsApi.reassignAssignment(assignment.id, { assignedTo: operatorId });
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível reatribuir.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Assignment</h3>
        {assignment && <StatusChip tone="info">{ASSIGNMENT_STATUS_LABEL[assignment.status]}</StatusChip>}
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        {loading && !assignment ? (
          <SkeletonList rows={2} />
        ) : !assignment ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Esta Operation ainda não possui Assignment.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Info label="Responsável" value={assignment.assignee.name} />
              <Info label="Atribuído em" value={assignmentTime(assignment.assignedAt)} />
              <Info label="Status" value={ASSIGNMENT_STATUS_LABEL[assignment.status]} />
            </div>
            <AssignmentHistory operationId={assignment.operationId} />
            <Gate roles={["OWNER", "MANAGER"]}>
              <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <UserSelect value={operatorId} onChange={setOperatorId} />
                {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
                <button onClick={reassign} disabled={saving || !operatorId || operatorId === assignment.assignedTo} className="rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-50">
                  {saving ? "Reatribuindo…" : "Reatribuir"}
                </button>
              </div>
            </Gate>
          </div>
        )}
      </div>
    </section>
  );
}

function AssignmentHistory({ operationId }: { operationId: string }) {
  const history = useQuery((signal) => assignmentsApi.getAssignmentHistory(operationId, { signal }), [operationId]);
  if (history.loading && !history.data) return <SkeletonList rows={2} />;
  if (history.error && !history.data) return <ErrorState error={history.error} onRetry={history.refetch} />;
  const items = history.data ?? [];
  return (
    <ol className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex gap-2 text-xs text-[var(--color-muted-foreground)]">
          <span className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
          <span>
            <span className="font-medium text-[var(--color-foreground)]">{item.actor.name}</span>{" "}
            {item.event.toLowerCase().replaceAll("_", " ")} · {new Date(item.createdAt).toLocaleString("pt-BR")}
            {item.notes ? <span className="block">{item.notes}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)]">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function OperationBudgetsSection({ operation }: { operation: OperationDetail }) {
  const budgets = useQuery((signal) => budgetsApi.listOperationBudgets(operation.id, { limit: 20, signal }), [operation.id]);
  const [open, setOpen] = useState(false);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Orçamentos</h3>
        <Gate roles={["OWNER", "MANAGER"]}>
          <button onClick={() => setOpen(true)} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 h-8 text-xs hover:bg-[var(--color-muted)]">
            Novo orçamento
          </button>
        </Gate>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        {budgets.loading && !budgets.data ? (
          <SkeletonList rows={3} />
        ) : budgets.error && !budgets.data ? (
          <ErrorState error={budgets.error} onRetry={budgets.refetch} />
        ) : (budgets.data?.items ?? []).length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum orçamento vinculado a esta Operation.</p>
        ) : (
          <ul className="space-y-2">
            {(budgets.data?.items ?? []).map((budget) => (
              <li key={budget.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">ORC-{String(budget.number).padStart(6, "0")} · {budget.title}</span>
                  <span className="block text-[11px] text-[var(--color-muted-foreground)]">Vence em {new Date(budget.expirationDate).toLocaleDateString("pt-BR")}</span>
                </span>
                <span className="flex items-center gap-2">
                  <BudgetMiniStatus status={budget.status} />
                  <span className="font-mono text-sm">{formatCurrencyBRL(Number(budget.total))}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <OperationBudgetCreationDrawer
        open={open}
        onClose={() => setOpen(false)}
        operation={operation}
        onSaved={() => {
          setOpen(false);
          budgets.refetch();
        }}
      />
    </section>
  );
}

function OperationBudgetCreationDrawer({
  open,
  onClose,
  operation,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  operation: OperationDetail;
  onSaved: () => void;
}) {
  const products = useQuery((signal) => (open ? inventoryApi.listProducts({ limit: 100, active: true, signal }) : Promise.resolve(null)), [open]);
  const pricing = useQuery((signal) => (open ? pricingApi.listPricing({ limit: 100, active: true, signal }) : Promise.resolve(null)), [open]);
  const [title, setTitle] = useState("Orçamento da operação");
  const [expirationDate, setExpirationDate] = useState(operationNextDate(15));
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [items, setItems] = useState<BudgetItemPayload[]>([]);
  const [observations, setObservations] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("Orçamento da operação");
    setExpirationDate(operationNextDate(15));
    setItems([]);
    setProductId("");
    setQuantity("1");
    setObservations("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!productId && products.data?.items[0]) setProductId(products.data.items[0].id);
  }, [productId, products.data]);

  const priceByProduct = new Map((pricing.data?.items ?? []).map((row: ProductPricing) => [row.productId, row]));
  const selectedPrice = productId ? priceByProduct.get(productId) : null;

  function addItem() {
    if (!productId || Number(quantity) <= 0) return;
    setItems((current) => [...current, { productId, quantity: Number(quantity) }]);
    setQuantity("1");
  }

  async function submit() {
    if (!operation.customer?.id) {
      setError("Operation sem cliente vinculado.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: BudgetPayload = {
        operationId: operation.id,
        customerId: operation.customer.id,
        customerAddressId: operation.address?.id ?? undefined,
        equipmentId: operation.equipment?.id ?? undefined,
        title,
        expirationDate: new Date(expirationDate).toISOString(),
        observations: observations || undefined,
        status: "PENDING",
        items,
      };
      await budgetsApi.createBudget(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar orçamento.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} eyebrow="Orçamento" title="Novo orçamento da Operation" width="max-w-2xl" footer={<><button onClick={onClose} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">Cancelar</button><button onClick={submit} disabled={saving || !title || items.length === 0} className="rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-50">{saving ? "Salvando…" : "Salvar"}</button></>}>
      <div className="space-y-4">
        {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Título"><input value={title} onChange={(event) => setTitle(event.target.value)} className={inputCls} /></Field>
          <Field label="Vencimento"><input type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} className={inputCls} /></Field>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <Field label="Produto">
              <select value={productId} onChange={(event) => setProductId(event.target.value)} className={inputCls}>
                {(products.data?.items ?? []).map((product: Product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
              </select>
            </Field>
            <Field label="Quantidade"><input type="number" min="0.001" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputCls} /></Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-[var(--color-muted-foreground)]">Preço vigente: {selectedPrice ? formatCurrencyBRL(Number(selectedPrice.salePrice)) : "não carregado"}</span>
            <button onClick={addItem} disabled={!productId || !quantity} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">Adicionar item</button>
          </div>
        </div>
        <ul className="space-y-2">
          {items.map((item, index) => {
            const product = products.data?.items.find((row) => row.id === item.productId);
            return <li key={`${item.productId}-${index}`} className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-2 text-sm"><span>{product?.name ?? item.productId}</span><span>{formatNumber(item.quantity)}</span><button onClick={() => setItems((current) => current.filter((_, i) => i !== index))} className="text-xs text-[var(--color-danger)]">remover</button></li>;
          })}
        </ul>
        <Field label="Observações"><textarea value={observations} onChange={(event) => setObservations(event.target.value)} className={`${inputCls} min-h-20 py-2`} /></Field>
      </div>
    </Drawer>
  );
}

function BudgetMiniStatus({ status }: { status: Budget["status"] }) {
  const label: Record<Budget["status"], string> = { DRAFT: "Rascunho", PENDING: "Pendente", APPROVED: "Aprovado", REJECTED: "Rejeitado", EXPIRED: "Vencido", CANCELED: "Cancelado" };
  const tone: Record<Budget["status"], "neutral" | "warning" | "success" | "danger"> = { DRAFT: "neutral", PENDING: "warning", APPROVED: "success", REJECTED: "danger", EXPIRED: "danger", CANCELED: "neutral" };
  return <StatusChip tone={tone[status]}>{label[status]}</StatusChip>;
}

function operationNextDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function OperationMaterialsSection({ operationId }: { operationId: string }) {
  const materials = useQuery((signal) => inventoryApi.listOperationMaterials(operationId, { signal }), [operationId]);
  const products = useQuery((signal) => inventoryApi.listProducts({ limit: 100, active: true, signal }), []);
  const inventory = useQuery((signal) => inventoryApi.listInventory({ limit: 100, signal }), []);
  const [open, setOpen] = useState(false);

  async function remove(part: OperationPart) {
    if (!confirm(`Remover ${part.product.name} da operação?`)) return;
    await inventoryApi.deleteOperationMaterial(operationId, part.id);
    materials.refetch();
    inventory.refetch();
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Materiais utilizados</h3>
        <Gate roles={["OWNER", "MANAGER", "OPERATOR"]}>
          <button onClick={() => setOpen(true)} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 h-8 text-xs hover:bg-[var(--color-muted)]">
            Adicionar material
          </button>
        </Gate>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        {materials.loading && !materials.data ? (
          <SkeletonList rows={3} />
        ) : materials.error && !materials.data ? (
          <ErrorState error={materials.error} onRetry={materials.refetch} />
        ) : (materials.data ?? []).length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum material consumido nesta operação.</p>
        ) : (
          <ul className="space-y-2">
            {(materials.data ?? []).map((part) => (
              <li key={part.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium truncate">{part.product.name}</span>
                  <span className="block text-[11px] text-[var(--color-muted-foreground)]">{part.product.sku} · {part.notes ?? "sem observação"}</span>
                </span>
                <span className="font-mono text-sm tabular-nums">{formatNumber(Number(part.quantity))} {part.product.unit}</span>
                <Gate roles={["OWNER", "MANAGER"]}>
                  <button onClick={() => remove(part)} className="text-xs text-[var(--color-danger)] hover:underline">remover</button>
                </Gate>
              </li>
            ))}
          </ul>
        )}
      </div>
      <MaterialFormDrawer
        open={open}
        onClose={() => setOpen(false)}
        operationId={operationId}
        products={products.data?.items ?? []}
        inventory={inventory.data?.items ?? []}
        onSaved={() => {
          setOpen(false);
          materials.refetch();
          inventory.refetch();
        }}
      />
    </section>
  );
}

function MaterialFormDrawer({
  open,
  onClose,
  operationId,
  products,
  inventory,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  operationId: string;
  products: Product[];
  inventory: InventoryItem[];
  onSaved: () => void;
}) {
  const [productId, setProductId] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredItems = inventory.filter((item) => item.productId === productId);

  useEffect(() => {
    if (!open) return;
    const firstProduct = products[0]?.id ?? "";
    setProductId(firstProduct);
    setInventoryItemId(inventory.find((item) => item.productId === firstProduct)?.id ?? "");
    setQuantity("");
    setNotes("");
    setError(null);
  }, [open, products, inventory]);

  useEffect(() => {
    if (!productId) return;
    setInventoryItemId((current) => filteredItems.some((item) => item.id === current) ? current : filteredItems[0]?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function submit() {
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
      setError(err instanceof Error ? err.message : "Não foi possível adicionar material.");
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Materiais"
      title="Adicionar material"
      width="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">Cancelar</button>
          <button onClick={submit} disabled={!productId || !inventoryItemId || !quantity} className="rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-50">Adicionar</button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
        <Field label="Produto">
          <select value={productId} onChange={(event) => setProductId(event.target.value)} className={inputCls}>
            {products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
          </select>
        </Field>
        <Field label="Item de estoque">
          <select value={inventoryItemId} onChange={(event) => setInventoryItemId(event.target.value)} className={inputCls}>
            {filteredItems.map((item) => <option key={item.id} value={item.id}>{item.location ?? "Sem localização"} · disponível {formatNumber(Number(item.availableQuantity))}</option>)}
          </select>
        </Field>
        <Field label="Quantidade">
          <input type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className={inputCls} min="0.001" step="0.001" />
        </Field>
        <Field label="Observações">
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputCls} min-h-20 py-2`} />
        </Field>
      </div>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>;
}

const inputCls = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]";
