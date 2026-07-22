"use client";

import { useEffect, useState } from "react";
import { ApiClientError, inventoryApi, type Product, type ProductPayload, type Supplier } from "@erp/api";
import { Drawer } from "@erp/ui/drawer";

type FormState = {
  sku: string;
  internalCode: string;
  manufacturerCode: string;
  name: string;
  unit: string;
  brand: string;
  model: string;
  categoryOption: string;
  customCategory: string;
  technicalDescription: string;
  weight: string;
  dimensions: string;
  primarySupplierId: string;
  isPurchasable: boolean;
  isSellable: boolean;
  isActive: boolean;
};

const CATEGORY_OPTIONS = [
  "Peças e Componentes",
  "Materiais de Consumo",
  "Ferramentas",
  "Equipamentos",
  "Elétrica",
  "Eletrônica",
  "Refrigeração",
  "Climatização",
  "Hidráulica",
  "EPIs",
  "Limpeza e Higienização",
  "Outros",
];

const SKU_PATTERNS = ["HVAC-", "REFR-", "CLIM-", "ELE-", "HID-", "EPI-", "MAT-", "FERR-"];
const INTERNAL_CODE_PATTERNS = ["MAT-", "PEC-", "EQP-", "SRV-", "EST-"];

const blank: FormState = {
  sku: "",
  internalCode: "",
  manufacturerCode: "",
  name: "",
  unit: "UN",
  brand: "",
  model: "",
  categoryOption: "Peças e Componentes",
  customCategory: "",
  technicalDescription: "",
  weight: "",
  dimensions: "",
  primarySupplierId: "",
  isPurchasable: true,
  isSellable: true,
  isActive: true,
};

export function ProductFormDrawer({
  open,
  product,
  skuOptions = [],
  internalCodeOptions = [],
  suppliers = [],
  suppliersLoading = false,
  suppliersError = null,
  preferredSupplierId = null,
  initialUsage = 'PURCHASE',
  canCreateSupplier = false,
  onRetrySuppliers,
  onCreateSupplier,
  onClose,
  onSaved,
}: {
  open: boolean;
  product?: Product | null;
  skuOptions?: string[];
  internalCodeOptions?: string[];
  suppliers?: Supplier[];
  suppliersLoading?: boolean;
  suppliersError?: Error | null;
  preferredSupplierId?: string | null;
  initialUsage?: 'PURCHASE' | 'SALE';
  canCreateSupplier?: boolean;
  onRetrySuppliers?: () => void;
  onCreateSupplier?: () => void;
  onClose: () => void;
  onSaved?: (product: Product) => void;
}) {
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      product
        ? fromProduct(product)
        : { ...blank, isPurchasable: initialUsage === 'PURCHASE', isSellable: initialUsage === 'SALE' },
    );
  }, [open, product, initialUsage]);

  useEffect(() => {
    if (!open || product || !preferredSupplierId) return;
    set("primarySupplierId", preferredSupplierId);
  }, [open, product, preferredSupplierId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.isPurchasable && !form.isSellable) {
      setError("Selecione se o produto é destinado à compra, à venda ou a ambos.");
      return;
    }
    if (form.categoryOption === "Outros" && !form.customCategory.trim()) {
      setError("Informe a categoria personalizada.");
      return;
    }
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
          <SectionTitle title="Finalidade comercial" description="Essa classificação controla onde o produto pode ser utilizado no Orbit." />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`rounded-[var(--radius-md)] border p-3 text-sm ${form.isPurchasable ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}>
              <span className="flex items-center gap-2 font-medium"><input type="checkbox" checked={form.isPurchasable} onChange={(event) => set('isPurchasable', event.target.checked)} />Produto comprado</span>
              <span className="mt-1 block text-caption">Disponível em fornecedores, compras, estoque e consumo operacional.</span>
            </label>
            <label className={`rounded-[var(--radius-md)] border p-3 text-sm ${form.isSellable ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}>
              <span className="flex items-center gap-2 font-medium"><input type="checkbox" checked={form.isSellable} onChange={(event) => set('isSellable', event.target.checked)} />Produto vendido</span>
              <span className="mt-1 block text-caption">Disponível nas vendas dos clientes e nos respectivos recibos/garantias.</span>
            </label>
          </div>
        </section>

        <section className={sectionCls}>
          <SectionTitle title="Identificação comercial" description="SKU e código interno são identificadores únicos do catálogo técnico." />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="SKU">
              <AssistedCodeInput
                value={form.sku}
                onChange={(value) => set("sku", value)}
                placeholder="HVAC-FILTRO-G4-001"
                patterns={SKU_PATTERNS}
                existingOptions={skuOptions}
              />
            </Field>
            <Field label="Código interno">
              <AssistedCodeInput
                value={form.internalCode}
                onChange={(value) => set("internalCode", value)}
                placeholder="MAT-0001"
                patterns={INTERNAL_CODE_PATTERNS}
                existingOptions={internalCodeOptions}
              />
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
          <SectionTitle title="Classificação técnica" description="Categoria é selecionada por opções oficiais e continua persistida como texto no catálogo." />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Categoria">
              <select value={form.categoryOption} onChange={(e) => set("categoryOption", e.target.value)} className={inputCls}>
                {CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </Field>
            {form.categoryOption === "Outros" && (
              <Field label="Categoria personalizada">
                <input value={form.customCategory} onChange={(e) => set("customCategory", e.target.value)} className={inputCls} placeholder="Ex.: Automação predial" />
              </Field>
            )}
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
          <SectionTitle title="Fornecedor principal" description="Selecione um fornecedor real do Orbit para orientar compras e cadastro comercial do produto." />
          {suppliersError ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
              <div>Não foi possível carregar fornecedores. Isso não é tratado como lista vazia.</div>
              {onRetrySuppliers && <button type="button" onClick={onRetrySuppliers} className="mt-2 underline">Tentar novamente</button>}
            </div>
          ) : suppliersLoading ? (
            <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/35 px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
              Carregando fornecedores ativos…
            </p>
          ) : suppliers.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/35 px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
              <div>Nenhum fornecedor ativo encontrado.</div>
              {canCreateSupplier && onCreateSupplier && (
                <button type="button" onClick={onCreateSupplier} className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-8 text-xs hover:bg-[var(--color-muted)]">
                  Criar fornecedor
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Fornecedor">
                <select value={form.primarySupplierId} onChange={(e) => set("primarySupplierId", e.target.value)} className={inputCls}>
                  <option value="">Sem fornecedor principal</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.tradeName || supplier.legalName}{supplier.document ? ` · ${supplier.document}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {canCreateSupplier && onCreateSupplier && (
                <button type="button" onClick={onCreateSupplier} className="self-end rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
                  Novo fornecedor
                </button>
              )}
            </div>
          )}
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
  const category = product.category ?? "";
  const knownCategory = CATEGORY_OPTIONS.includes(category) && category !== "Outros";
  const primarySupplier = product.suppliers?.find((item) => item.isPrimary) ?? product.suppliers?.[0];
  return {
    sku: product.sku ?? "",
    internalCode: product.internalCode ?? "",
    manufacturerCode: product.manufacturerCode ?? "",
    name: product.name ?? "",
    unit: product.unit ?? "UN",
    brand: product.brand ?? "",
    model: product.model ?? "",
    categoryOption: knownCategory ? category : category ? "Outros" : "Peças e Componentes",
    customCategory: knownCategory ? "" : category,
    technicalDescription: product.technicalDescription ?? "",
    weight: product.weight != null ? String(product.weight) : "",
    dimensions: product.dimensions ?? "",
    primarySupplierId: primarySupplier?.supplierId ?? "",
    isPurchasable: product.isPurchasable,
    isSellable: product.isSellable,
    isActive: product.isActive,
  };
}

function toPayload(form: FormState): ProductPayload {
  const category = form.categoryOption === "Outros" ? form.customCategory.trim() : form.categoryOption;
  return {
    sku: form.sku,
    internalCode: nullable(form.internalCode),
    manufacturerCode: nullable(form.manufacturerCode),
    name: form.name,
    unit: form.unit,
    brand: nullable(form.brand),
    model: nullable(form.model),
    category: nullable(category),
    technicalDescription: nullable(form.technicalDescription),
    weight: form.weight ? Number(form.weight) : null,
    dimensions: nullable(form.dimensions),
    primarySupplierId: form.primarySupplierId || null,
    isPurchasable: form.isPurchasable,
    isSellable: form.isSellable,
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

function AssistedCodeInput({
  value,
  onChange,
  placeholder,
  patterns,
  existingOptions,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  patterns: string[];
  existingOptions: string[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_120px] gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className={inputCls} placeholder={placeholder} />
        <select value="" onChange={(e) => e.target.value && onChange(e.target.value)} className={inputCls} aria-label="Aplicar prefixo">
          <option value="">Prefixo</option>
          {patterns.map((pattern) => <option key={pattern} value={pattern}>{pattern}</option>)}
        </select>
      </div>
      {existingOptions.length > 0 && (
        <select value="" onChange={(e) => e.target.value && onChange(e.target.value)} className={`${inputCls} text-xs`} aria-label="Referências existentes">
          <option value="">Referências existentes — valide unicidade antes de reutilizar</option>
          {existingOptions.slice(0, 25).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      )}
    </div>
  );
}
