'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Drawer } from '@erp/ui/drawer';
import { inventoryApi, salesApi, type CustomerAddress, type Product, type Sale } from '@erp/api';

type Line = { productId: string; quantity: string };

export function SaleFormDrawer({
  open,
  onClose,
  onSaved,
  customerId,
  addresses,
  sale = null,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  customerId: string;
  addresses: CustomerAddress[];
  sale?: Sale | null;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [soldAt, setSoldAt] = useState(new Date().toISOString().slice(0, 10));
  const [addressId, setAddressId] = useState('');
  const [warrantyDays, setWarrantyDays] = useState('90');
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: '1' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    inventoryApi
      .listProducts({ page: 1, limit: 100, active: true, sellable: true })
      .then((result) => setProducts(result.items))
      .catch(() => setProducts([]));
    setSoldAt((sale?.soldAt ?? new Date().toISOString()).slice(0, 10));
    setAddressId(sale?.customerAddressId ?? addresses.find((item) => item.isPrimary)?.id ?? '');
    setWarrantyDays(sale?.warrantyDays == null ? '90' : String(sale.warrantyDays));
    setDiscount(String(sale?.discount ?? 0));
    setNotes(sale?.notes ?? '');
    setLines(
      sale?.items.length
        ? sale.items.map((item) => ({
            productId: item.productId ?? '',
            quantity: String(item.quantity),
          }))
        : [{ productId: '', quantity: '1' }],
    );
    setError(null);
  }, [open, sale, addresses]);

  async function save() {
    const items = lines
      .filter((line) => line.productId && Number(line.quantity) > 0)
      .map((line) => ({ productId: line.productId, quantity: Number(line.quantity) }));
    if (!items.length) {
      setError('Adicione ao menos um produto com quantidade válida.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        customerId,
        customerAddressId: addressId || null,
        soldAt: new Date(`${soldAt}T12:00:00`).toISOString(),
        warrantyDays: Number(warrantyDays) || 0,
        warrantyStartsAt: soldAt,
        discount: Number(discount) || 0,
        notes: notes.trim() || null,
        items,
      };
      if (sale) await salesApi.updateSale(sale.id, payload);
      else await salesApi.createSale(payload);
      onSaved();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar a venda.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Cliente"
      title={sale ? `Editar venda V-${String(sale.number).padStart(6, '0')}` : 'Nova venda'}
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" disabled={saving} onClick={save}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}Salvar venda
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Data da venda">
            <input
              className="input"
              type="date"
              value={soldAt}
              onChange={(event) => setSoldAt(event.target.value)}
            />
          </Field>
          <Field label="Endereço">
            <select
              className="input"
              value={addressId}
              onChange={(event) => setAddressId(event.target.value)}
            >
              <option value="">Sem endereço específico</option>
              {addresses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Garantia (dias)">
            <input
              className="input"
              type="number"
              min="0"
              max="3650"
              value={warrantyDays}
              onChange={(event) => setWarrantyDays(event.target.value)}
            />
          </Field>
          <Field label="Desconto">
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </Field>
        </div>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Produtos vendidos</h3>
              <p className="text-caption">
                Preço e custo são resolvidos pelo backend e preservados como snapshot.
              </p>
            </div>
            <button
              className="btn-secondary"
              onClick={() => setLines((current) => [...current, { productId: '', quantity: '1' }])}
            >
              <Plus className="h-4 w-4" />
              Produto
            </button>
          </div>
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-[1fr_110px_38px] gap-2">
              <select
                className="input"
                value={line.productId}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((item, position) =>
                      position === index ? { ...item, productId: event.target.value } : item,
                    ),
                  )
                }
              >
                <option value="">Selecione um produto…</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} · {product.sku}
                  </option>
                ))}
              </select>
              <input
                className="input"
                aria-label="Quantidade"
                type="number"
                min="0.001"
                step="0.001"
                value={line.quantity}
                onChange={(event) =>
                  setLines((current) =>
                    current.map((item, position) =>
                      position === index ? { ...item, quantity: event.target.value } : item,
                    ),
                  )
                }
              />
              <button
                aria-label="Remover produto"
                className="rounded-md border border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                onClick={() =>
                  setLines((current) => current.filter((_, position) => position !== index))
                }
              >
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>
          ))}
        </section>
        <Field label="Observações">
          <textarea
            className="input min-h-24"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </div>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium">{label}</span>
      {children}
    </label>
  );
}
