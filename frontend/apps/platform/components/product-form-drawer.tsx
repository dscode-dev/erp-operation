"use client";

import { useEffect, useState } from "react";
import { ApiClientError, inventoryApi, pricingApi, type Product, type ProductPayload, type Supplier } from "@erp/api";
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
  costPrice: string;
  salePrice: string;
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
  costPrice: "",
  salePrice: "",
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
  canEditPricing = false,
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
  canEditPricing?: boolean;
  onRetrySuppliers?: () => void;
  onCreateSupplier?: () => void;
  onClose: () => void;
  onSaved?: (product: Product, notice?: { tone: "success" | "danger"; message: string }) => void;
}) {
  const [form, setForm] = useState<FormState>(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (product) {
      setForm(fromProduct(product));
      return;
    }
    const codes = suggestProductCodes();
    setForm({
      ...blank,
      ...codes,
      isPurchasable: initialUsage === 'PURCHASE',
      isSellable: initialUsage === 'SALE',
    });
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
    if (!product && canEditPricing && (form.costPrice || form.salePrice)) {
      try {
        const costPrice = parseMoney(form.costPrice);
        const salePrice = form.salePrice ? parseMoney(form.salePrice) : costPrice;
        if (salePrice < costPrice) throw new Error("O valor de venda não pode ser menor que o custo.");
      } catch (pricingError) {
        setError(friendlyError(pricingError, "Revise os valores informados."));
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      const saved = product?.id
        ? await inventoryApi.updateProduct(product.id, payload)
        : await inventoryApi.createProduct(payload);
      let notice: { tone: "success" | "danger"; message: string } | undefined;
      if (!product && canEditPricing && (form.costPrice || form.salePrice)) {
        try {
          const costPrice = parseMoney(form.costPrice);
          const salePrice = form.salePrice ? parseMoney(form.salePrice) : costPrice;
          if (salePrice < costPrice) {
            throw new Error("O valor de venda não pode ser menor que o custo.");
          }
          await pricingApi.createProductPricing(saved.id, {
            costPrice,
            replacementCost: costPrice,
            averageCost: costPrice,
            salePrice,
            minimumSalePrice: salePrice,
            suggestedSalePrice: salePrice,
            validFrom: startOfTodayUtc(),
          });
        } catch (pricingError) {
          notice = {
            tone: "danger",
            message: `Produto cadastrado, mas o preço não foi salvo. ${friendlyError(pricingError, "Revise os valores na aba Preços.")}`,
          };
        }
      }
      onSaved?.(saved, notice);
      onClose();
    } catch (err) {
      setError(friendlyError(err, "Não foi possível salvar o produto."));
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
          <SectionTitle title="Dados principais" description="Os códigos foram sugeridos automaticamente e podem ser alterados." />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="SKU">
              <SimpleCodeInput value={form.sku} onChange={(value) => set("sku", value)} placeholder="PRD-260722-A1B2" existingOptions={skuOptions} />
            </Field>
            <Field label="Código interno">
              <SimpleCodeInput value={form.internalCode} onChange={(value) => set("internalCode", value)} placeholder="INT-260722-A1B2" existingOptions={internalCodeOptions} />
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

        {!product && canEditPricing && (
          <section className={sectionCls}>
            <SectionTitle title="Valores" description="Opcional. Os valores serão registrados no histórico oficial de preços." />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Custo unitário">
                <input type="number" min="0" step="0.01" inputMode="decimal" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} className={inputCls} placeholder="0,00" />
              </Field>
              <Field label="Valor de venda">
                <input type="number" min="0" step="0.01" inputMode="decimal" value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} className={inputCls} placeholder="0,00" />
              </Field>
            </div>
          </section>
        )}

        <details className={sectionCls}>
          <summary className="cursor-pointer list-none text-sm font-semibold">Informações técnicas opcionais</summary>
          <p className="text-xs text-[var(--color-muted-foreground)]">Marca, modelo, fabricante, peso e dimensões.</p>
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
        </details>

        <details className={sectionCls}>
          <summary className="cursor-pointer list-none text-sm font-semibold">Fornecedor principal (opcional)</summary>
          <div className="mt-3 space-y-3">
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
          </div>
        </details>

        <details className={sectionCls}>
          <summary className="cursor-pointer list-none text-sm font-semibold">Descrição técnica (opcional)</summary>
          <div className="mt-3">
          <Field label="Descrição técnica">
            <textarea value={form.technicalDescription} onChange={(e) => set("technicalDescription", e.target.value)} className={`${inputCls} min-h-24 py-2`} />
          </Field>
          </div>
        </details>

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
    costPrice: "",
    salePrice: "",
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

function SimpleCodeInput({
  value,
  onChange,
  placeholder,
  existingOptions,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  existingOptions: string[];
}) {
  const duplicated = existingOptions.some((option) => option.toUpperCase() === value.trim().toUpperCase());
  return (
    <div className="space-y-1">
      <input value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className={inputCls} placeholder={placeholder} />
      <p className={`text-xs ${duplicated ? "text-[var(--color-danger)]" : "text-[var(--color-muted-foreground)]"}`}>
        {duplicated ? "Este código já está em uso." : "Sugestão automática; edite se necessário."}
      </p>
    </div>
  );
}

function suggestProductCodes(): Pick<FormState, "sku" | "internalCode"> {
  const date = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const suffix = globalThis.crypto?.randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase()
    ?? Math.random().toString(36).slice(2, 6).toUpperCase();
  return { sku: `PRD-${date}-${suffix}`, internalCode: `INT-${date}-${suffix}` };
}

function parseMoney(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error("Informe valores válidos e maiores ou iguais a zero.");
  return parsed;
}

function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function friendlyError(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    if (error.code === "PRODUCT_CONFLICT") return "Já existe um produto com este SKU ou código interno.";
    if (error.code === "PRICING_INVALID_MARGIN") return "O valor de venda não pode ser menor que o custo.";
    if (error.code === "PRICING_OVERLAP") return "Já existe um preço vigente para este produto.";
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
