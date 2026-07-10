"use client";

import { useEffect, useState } from "react";
import { ApiClientError, inventoryApi, type Product, type ProductPayload } from "@erp/api";
import { Drawer } from "@erp/ui/drawer";

type FormState = {
  sku: string;
  internalCode: string;
  manufacturerCode: string;
  name: string;
  unit: string;
  brand: string;
  model: string;
  category: string;
  technicalDescription: string;
  weight: string;
  dimensions: string;
  isActive: boolean;
};

const blank: FormState = {
  sku: "",
  internalCode: "",
  manufacturerCode: "",
  name: "",
  unit: "UN",
  brand: "",
  model: "",
  category: "",
  technicalDescription: "",
  weight: "",
  dimensions: "",
  isActive: true,
};

export function ProductFormDrawer({
  open,
  product,
  categoryOptions = [],
  skuOptions = [],
  internalCodeOptions = [],
  onClose,
  onSaved,
}: {
  open: boolean;
  product?: Product | null;
  categoryOptions?: string[];
  skuOptions?: string[];
  internalCodeOptions?: string[];
  onClose: () => void;
  onSaved?: (product: Product) => void;
}) {
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(product ? fromProduct(product) : blank);
  }, [open, product]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      const saved = product?.id
        ? await inventoryApi.updateProduct(product.id, payload)
        : await inventoryApi.createProduct(payload);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Catálogo técnico"
      title={product ? "Editar produto" : "Novo produto"}
      width="max-w-2xl"
      footer={
        <>
          <button onClick={onClose} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving || !form.sku.trim() || !form.name.trim() || !form.unit.trim()}
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar produto"}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}

        <section className={sectionCls}>
          <SectionTitle title="Identificação comercial" description="SKU e código interno são identificadores únicos do catálogo técnico." />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="SKU">
              <input value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} className={inputCls} placeholder="HVAC-FILTRO-G4-001" list="product-sku-options" />
              <datalist id="product-sku-options">{skuOptions.map((option) => <option key={option} value={option} />)}</datalist>
            </Field>
            <Field label="Código interno">
              <input value={form.internalCode} onChange={(e) => set("internalCode", e.target.value.toUpperCase())} className={inputCls} placeholder="MAT-0001" list="product-internal-code-options" />
              <datalist id="product-internal-code-options">{internalCodeOptions.map((option) => <option key={option} value={option} />)}</datalist>
            </Field>
            <Field label="Unidade">
              <input value={form.unit} onChange={(e) => set("unit", e.target.value.toUpperCase())} className={inputCls} placeholder="UN, KG, M" list="product-unit-options" />
              <datalist id="product-unit-options">
                {["UN", "PC", "CX", "KG", "M", "M2", "L"].map((option) => <option key={option} value={option} />)}
              </datalist>
            </Field>
          </div>

          <Field label="Nome">
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Nome técnico do produto" />
          </Field>
        </section>

        <section className={sectionCls}>
          <SectionTitle title="Classificação técnica" description="Categoria é texto controlado pelo uso: selecione uma existente ou crie uma nova sem entidade extra." />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Categoria">
              <input value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls} placeholder="Filtros, Elétrica…" list="product-category-options" />
              <datalist id="product-category-options">{categoryOptions.map((option) => <option key={option} value={option} />)}</datalist>
            </Field>
            <Field label="Código do fabricante">
              <input value={form.manufacturerCode} onChange={(e) => set("manufacturerCode", e.target.value)} className={inputCls} placeholder="Código do fabricante" />
            </Field>
            <Field label="Marca">
              <input value={form.brand} onChange={(e) => set("brand", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Modelo">
              <input value={form.model} onChange={(e) => set("model", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Peso">
              <input type="number" value={form.weight} onChange={(e) => set("weight", e.target.value)} className={inputCls} inputMode="decimal" step="0.001" />
            </Field>
            <Field label="Dimensões">
              <input value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} className={inputCls} placeholder="600x600x50" />
            </Field>
          </div>
        </section>

        <section className={sectionCls}>
          <SectionTitle title="Fornecedor" description="O catálogo não possui fornecedor fixo. Fornecedores são gerenciados em Compras e preservados nos snapshots dos pedidos." />
          <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/35 px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
            Para vincular fornecedor de forma auditável, crie o fornecedor na aba Fornecedores e utilize-o no Pedido de Compra. O produto permanece apenas como catálogo técnico.
          </p>
        </section>

        <section className={sectionCls}>
          <SectionTitle title="Descrição" description="Informações usadas por operações, compras, estoque e documentos futuros." />
          <Field label="Descrição técnica">
            <textarea value={form.technicalDescription} onChange={(e) => set("technicalDescription", e.target.value)} className={`${inputCls} min-h-24 py-2`} />
          </Field>
        </section>

        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="accent-[var(--color-primary)]" />
          Produto ativo
        </label>
      </div>
    </Drawer>
  );
}

function fromProduct(product: Product): FormState {
  return {
    sku: product.sku ?? "",
    internalCode: product.internalCode ?? "",
    manufacturerCode: product.manufacturerCode ?? "",
    name: product.name ?? "",
    unit: product.unit ?? "UN",
    brand: product.brand ?? "",
    model: product.model ?? "",
    category: product.category ?? "",
    technicalDescription: product.technicalDescription ?? "",
    weight: product.weight != null ? String(product.weight) : "",
    dimensions: product.dimensions ?? "",
    isActive: product.isActive,
  };
}

function toPayload(form: FormState): ProductPayload {
  return {
    sku: form.sku,
    internalCode: nullable(form.internalCode),
    manufacturerCode: nullable(form.manufacturerCode),
    name: form.name,
    unit: form.unit,
    brand: nullable(form.brand),
    model: nullable(form.model),
    category: nullable(form.category),
    technicalDescription: nullable(form.technicalDescription),
    weight: form.weight ? Number(form.weight) : null,
    dimensions: nullable(form.dimensions),
    isActive: form.isActive,
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]";
const sectionCls = "space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4";

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{description}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
