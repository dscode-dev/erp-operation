"use client";

/**
 * ProductFormDrawer — cadastro de produto (catálogo).
 * O domínio de Produtos ainda é escopo futuro (sem API de produção), por isso o
 * formulário fica preparado para o backend, mas a gravação só será habilitada
 * quando o endpoint existir. Nada é persistido localmente (sem mocks).
 */
import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";

type FormState = {
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: string;
  minStock: string;
  price: string;
};

const blank: FormState = { sku: "", name: "", category: "", unit: "un", stock: "", minStock: "", price: "" };

export function ProductFormDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<FormState>(blank);

  useEffect(() => {
    if (open) setForm(blank);
  }, [open]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Cadastros"
      title="Novo produto"
      width="max-w-lg"
      footer={
        <>
          <button onClick={onClose} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
            Fechar
          </button>
          <button
            disabled
            title="Disponível quando a API de Produtos existir"
            className="rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium opacity-50 cursor-not-allowed"
          >
            Salvar produto
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-3 py-2 text-sm text-[var(--color-info)]">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>O domínio de Produtos é escopo futuro. O cadastro será persistido quando a API estiver disponível.</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU">
            <input value={form.sku} onChange={(e) => set("sku", e.target.value)} className={inputCls} placeholder="PRD-001" />
          </Field>
          <Field label="Unidade">
            <input value={form.unit} onChange={(e) => set("unit", e.target.value)} className={inputCls} placeholder="un, kg, m…" />
          </Field>
        </div>

        <Field label="Nome">
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Nome do produto" />
        </Field>

        <Field label="Categoria">
          <input value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls} placeholder="Ex.: Filtros, Gás refrigerante…" />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Estoque">
            <input type="number" value={form.stock} onChange={(e) => set("stock", e.target.value)} className={inputCls} inputMode="numeric" />
          </Field>
          <Field label="Estoque mín.">
            <input type="number" value={form.minStock} onChange={(e) => set("minStock", e.target.value)} className={inputCls} inputMode="numeric" />
          </Field>
          <Field label="Preço (R$)">
            <input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} className={inputCls} inputMode="decimal" step="0.01" />
          </Field>
        </div>
      </div>
    </Drawer>
  );
}

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
