"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Drawer } from "@erp/ui/drawer";
import { ErrorState } from "@erp/ui/states";
import {
  inventoryApi,
  procurementApi,
  type Paginated,
  type Product,
  type PurchaseHistory,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type Supplier,
} from "@erp/api";
import { formatCurrencyBRL, formatDateTime } from "@erp/utils";
import { PurchaseStatusBadge } from "./financial-procurement-badges";

type MutationState = { loading: boolean; error: unknown | null };

export function PurchaseOrderDrawer({
  open,
  order,
  suppliers,
  products,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: PurchaseOrder | null;
  suppliers: Supplier[];
  products: Product[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [current, setCurrent] = useState<PurchaseOrder | null>(order);
  const [history, setHistory] = useState<Paginated<PurchaseHistory> | null>(null);
  const [form, setForm] = useState({ supplierId: "", expectedDelivery: "", notes: "" });
  const [itemForm, setItemForm] = useState({ productId: "", quantity: "1", unit: "", snapshotCost: "0", snapshotDescription: "" });
  const [receiptForm, setReceiptForm] = useState<Record<string, string>>({});
  const [receiptNotes, setReceiptNotes] = useState("");
  const [state, setState] = useState<MutationState>({ loading: false, error: null });

  const editable = !current || current.status === "DRAFT" || current.status === "SENT";
  const receivable = current?.status === "SENT" || current?.status === "PARTIALLY_RECEIVED";
  const items = useMemo(() => current?.items ?? [], [current]);
  const remainingItems = useMemo(
    () => items.map((item) => ({ item, remaining: Math.max(0, Number(item.quantity) - Number(item.receivedQuantity)) })).filter((row) => row.remaining > 0),
    [items],
  );
  const total = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.snapshotCost), 0);

  useEffect(() => {
    if (!open) return;
    setCurrent(order);
    setForm({
      supplierId: order?.supplierId ?? suppliers[0]?.id ?? "",
      expectedDelivery: order?.expectedDelivery ? order.expectedDelivery.slice(0, 10) : "",
      notes: order?.notes ?? "",
    });
    setItemForm({ productId: products[0]?.id ?? "", quantity: "1", unit: products[0]?.unit ?? "", snapshotCost: "0", snapshotDescription: "" });
    setReceiptForm({});
    setReceiptNotes("");
    setState({ loading: false, error: null });
    setHistory(null);
    if (order) {
      procurementApi.getPurchaseOrder(order.id).then(setCurrent).catch(() => undefined);
      procurementApi.getPurchaseOrderHistory(order.id, { limit: 30 }).then(setHistory).catch(() => setHistory(null));
    }
  }, [open, order, suppliers, products]);

  function refreshOrder(id: string) {
    procurementApi.getPurchaseOrder(id).then((updated) => {
      setCurrent(updated);
      onSaved();
    }).catch(() => onSaved());
    procurementApi.getPurchaseOrderHistory(id, { limit: 30 }).then(setHistory).catch(() => undefined);
  }

  async function saveOrder() {
    setState({ loading: true, error: null });
    try {
      const payload = { supplierId: form.supplierId, expectedDelivery: form.expectedDelivery || null, notes: form.notes || null };
      const saved = current ? await procurementApi.updatePurchaseOrder(current.id, payload) : await procurementApi.createPurchaseOrder(payload);
      setCurrent(saved);
      onSaved();
      setState({ loading: false, error: null });
      if (!current) refreshOrder(saved.id);
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  async function addItem() {
    if (!current) return;
    setState({ loading: true, error: null });
    try {
      const product = products.find((p) => p.id === itemForm.productId);
      await procurementApi.createPurchaseOrderItem(current.id, {
        productId: itemForm.productId,
        quantity: Number(itemForm.quantity),
        unit: itemForm.unit || product?.unit || "un",
        snapshotCost: Number(itemForm.snapshotCost),
        snapshotDescription: itemForm.snapshotDescription || product?.name || "Item de compra",
      });
      setItemForm({ productId: products[0]?.id ?? "", quantity: "1", unit: products[0]?.unit ?? "", snapshotCost: "0", snapshotDescription: "" });
      setState({ loading: false, error: null });
      refreshOrder(current.id);
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  async function deleteItem(item: PurchaseOrderItem) {
    if (!current || !window.confirm("Remover este item do pedido?")) return;
    setState({ loading: true, error: null });
    try {
      await procurementApi.deletePurchaseOrderItem(item.id);
      setState({ loading: false, error: null });
      refreshOrder(current.id);
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  async function send() {
    if (!current) return;
    setState({ loading: true, error: null });
    try {
      const sent = await procurementApi.sendPurchaseOrder(current.id);
      setCurrent(sent);
      onSaved();
      setState({ loading: false, error: null });
      refreshOrder(sent.id);
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  async function cancel() {
    if (!current || !window.confirm("Cancelar este pedido de compra?")) return;
    setState({ loading: true, error: null });
    try {
      const canceled = await procurementApi.cancelPurchaseOrder(current.id);
      setCurrent(canceled);
      onSaved();
      setState({ loading: false, error: null });
      refreshOrder(canceled.id);
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  async function receiveAll() {
    const next: Record<string, string> = {};
    for (const row of remainingItems) next[row.item.id] = String(row.remaining);
    setReceiptForm(next);
  }

  async function createReceipt() {
    if (!current) return;
    const receiptItems = remainingItems
      .map(({ item, remaining }) => ({ itemId: item.id, quantity: Math.min(Number(receiptForm[item.id] || 0), remaining) }))
      .filter((item) => item.quantity > 0);
    if (receiptItems.length === 0) return;
    setState({ loading: true, error: null });
    try {
      await procurementApi.createPurchaseReceipt(current.id, { notes: receiptNotes || null, items: receiptItems });
      setReceiptForm({});
      setReceiptNotes("");
      setState({ loading: false, error: null });
      refreshOrder(current.id);
    } catch (error) {
      setState({ loading: false, error });
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={current ? `Pedido #${current.number}` : "Novo pedido de compra"}
      eyebrow="Compras"
      width="max-w-5xl"
      footer={
        <>
          {current?.status === "DRAFT" && <button className="btn-secondary" onClick={send} disabled={state.loading || items.length === 0}>Enviar</button>}
          {current && current.status !== "RECEIVED" && current.status !== "CANCELED" && <button className="btn-secondary text-red-600" onClick={cancel} disabled={state.loading}>Cancelar</button>}
          <button className="btn-secondary" onClick={onClose}>Fechar</button>
          {editable && <button className="btn-primary" onClick={saveOrder} disabled={state.loading || !form.supplierId}>Salvar pedido</button>}
        </>
      }
    >
      <div className="space-y-6">
        {state.error ? <ErrorState error={state.error} /> : null}
        {current && (
          <div className="flex flex-wrap items-center gap-3">
            <PurchaseStatusBadge status={current.status} />
            <span className="text-caption">Criado em {formatDateTime(current.createdAt)}</span>
            <span className="text-caption">Total estimado: {formatCurrencyBRL(total)}</span>
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-3">
          <Field label="Fornecedor">
            <select className="input" value={form.supplierId} disabled={!editable} onChange={(e) => setForm((s) => ({ ...s, supplierId: e.target.value }))}>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tradeName ?? supplier.legalName}</option>)}
            </select>
          </Field>
          <Field label="Entrega prevista">
            <input className="input" type="date" value={form.expectedDelivery} disabled={!editable} onChange={(e) => setForm((s) => ({ ...s, expectedDelivery: e.target.value }))} />
          </Field>
          <Field label="Observações">
            <input className="input" value={form.notes} disabled={!editable} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} />
          </Field>
        </section>

        {current && (
          <>
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Itens</h3>
                <span className="text-caption">{items.length} itens</span>
              </div>
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-muted)]/50 text-left text-caption">
                    <tr><th className="p-3">Produto</th><th>Qtd.</th><th>Recebido</th><th>Custo</th><th className="p-3 text-right">Total</th><th /></tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3"><div className="font-medium">{item.snapshotDescription}</div><div className="text-caption">{item.product?.sku ?? item.productId}</div></td>
                        <td>{Number(item.quantity)} {item.unit}</td>
                        <td>{Number(item.receivedQuantity)} {item.unit}</td>
                        <td>{formatCurrencyBRL(Number(item.snapshotCost))}</td>
                        <td className="p-3 text-right font-mono">{formatCurrencyBRL(Number(item.quantity) * Number(item.snapshotCost))}</td>
                        <td className="p-3 text-right">{editable && <button className="text-xs text-red-600 hover:underline" onClick={() => deleteItem(item)}>remover</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {editable && (
                <div className="mt-3 grid gap-2 md:grid-cols-[2fr_0.7fr_0.7fr_0.8fr_1fr_auto]">
                  <select className="input" value={itemForm.productId} onChange={(e) => {
                    const product = products.find((p) => p.id === e.target.value);
                    setItemForm((s) => ({ ...s, productId: e.target.value, unit: product?.unit ?? s.unit, snapshotDescription: product?.name ?? s.snapshotDescription }));
                  }}>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                  <input className="input" type="number" min="0.001" step="0.001" value={itemForm.quantity} onChange={(e) => setItemForm((s) => ({ ...s, quantity: e.target.value }))} />
                  <input className="input" value={itemForm.unit} onChange={(e) => setItemForm((s) => ({ ...s, unit: e.target.value }))} />
                  <input className="input" type="number" min="0" step="0.01" value={itemForm.snapshotCost} onChange={(e) => setItemForm((s) => ({ ...s, snapshotCost: e.target.value }))} />
                  <input className="input" placeholder="Descrição snapshot" value={itemForm.snapshotDescription} onChange={(e) => setItemForm((s) => ({ ...s, snapshotDescription: e.target.value }))} />
                  <button className="btn-secondary" onClick={addItem} disabled={state.loading || !itemForm.productId}>Adicionar</button>
                </div>
              )}
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Recebimentos</h3>
                  {receivable && <button className="text-xs text-[var(--color-primary)] hover:underline" onClick={receiveAll}>preencher total restante</button>}
                </div>
                {(current.receipts ?? []).length === 0 ? <p className="text-caption">Nenhum recebimento registrado.</p> : (
                  <ul className="rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                    {current.receipts.map((receipt) => <li key={receipt.id} className="p-3 text-sm"><div className="font-medium">{formatDateTime(receipt.receivedAt)}</div><div className="text-caption">{receipt.receiver?.name ?? "Recebedor"} · {receipt.notes ?? "Sem observações"}</div></li>)}
                  </ul>
                )}
                {receivable && (
                  <div className="mt-3 space-y-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-3">
                    {remainingItems.map(({ item, remaining }) => (
                      <label key={item.id} className="grid grid-cols-[1fr_110px] items-center gap-2 text-sm">
                        <span>{item.snapshotDescription} <span className="text-caption">restam {remaining} {item.unit}</span></span>
                        <input className="input" type="number" min="0" max={remaining} step="0.001" value={receiptForm[item.id] ?? ""} onChange={(e) => setReceiptForm((s) => ({ ...s, [item.id]: e.target.value }))} />
                      </label>
                    ))}
                    <input className="input" placeholder="Observações do recebimento" value={receiptNotes} onChange={(e) => setReceiptNotes(e.target.value)} />
                    <button className="btn-primary" onClick={createReceipt} disabled={state.loading}>Registrar recebimento</button>
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Histórico</h3>
                {(history?.items ?? []).length === 0 ? <p className="text-caption">Histórico ainda vazio.</p> : (
                  <ul className="rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                    {history?.items.map((item) => <li key={item.id} className="p-3 text-sm"><div className="font-medium">{item.action}</div><div className="text-caption">{formatDateTime(item.createdAt)} · {item.actor?.name ?? "Sistema"}</div></li>)}
                  </ul>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </Drawer>
  );
}

export function usePurchaseOrderLookups() {
  const suppliers = inventoryApi.listSuppliers({ limit: 100, active: true });
  const products = inventoryApi.listProducts({ limit: 100, active: true });
  return Promise.all([suppliers, products]).then(([supplierPage, productPage]) => ({
    suppliers: supplierPage.items,
    products: productPage.items,
  }));
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium space-y-1"><span>{label}</span>{children}</label>;
}
