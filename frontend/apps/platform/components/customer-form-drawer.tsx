"use client";

/**
 * CustomerFormDrawer — create / edit a customer against the production API.
 * PERSON shows CPF; COMPANY shows tradeName + CNPJ. Documents stay optional.
 */
import { useEffect, useState } from "react";
import { Building2, Loader2, User } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import { customersApi, ApiClientError } from "@erp/api";
import type { Customer, CustomerType, CreateCustomerPayload } from "@erp/api";
import { maskCpf, maskCnpj } from "@erp/utils";

type FormState = {
  type: CustomerType;
  name: string;
  tradeName: string;
  cpf: string;
  cnpj: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  notes: string;
};

function fromCustomer(c: Customer | null): FormState {
  return {
    type: c?.type ?? "COMPANY",
    name: c?.name ?? "",
    tradeName: c?.tradeName ?? "",
    cpf: c?.cpf ?? "",
    cnpj: c?.cnpj ?? "",
    email: c?.email ?? "",
    phone: c?.phone ?? "",
    secondaryPhone: c?.secondaryPhone ?? "",
    notes: c?.notes ?? "",
  };
}

export function CustomerFormDrawer({
  open,
  onClose,
  onSaved,
  customer = null,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  customer?: Customer | null;
}) {
  const isEdit = Boolean(customer);
  const [form, setForm] = useState<FormState>(fromCustomer(customer));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(fromCustomer(customer));
      setError(null);
      setFieldError(null);
    }
  }, [open, customer]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    setSaving(true);
    setError(null);
    setFieldError(null);

    const payload: CreateCustomerPayload = {
      type: form.type,
      name: form.name.trim(),
      tradeName: form.type === "COMPANY" ? form.tradeName.trim() || null : null,
      cpf: form.type === "PERSON" ? form.cpf.trim() || null : null,
      cnpj: form.type === "COMPANY" ? form.cnpj.trim() || null : null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      secondaryPhone: form.secondaryPhone.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (isEdit && customer) {
        await customersApi.updateCustomer(customer.id, payload);
      } else {
        await customersApi.createCustomer(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "CUSTOMER_CONFLICT") {
        setFieldError(form.type === "PERSON" ? "CPF já cadastrado." : "CNPJ já cadastrado.");
      } else if (err instanceof ApiClientError && err.isForbidden) {
        setError("Você não tem permissão para esta ação.");
      } else {
        setError(err instanceof ApiClientError ? err.message : "Não foi possível salvar.");
      }
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Cadastros"
      title={isEdit ? "Editar cliente" : "Novo cliente"}
      footer={
        <>
          <button onClick={onClose} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Criar cliente"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {/* Tipo */}
        <div className="grid grid-cols-2 gap-2">
          {(["COMPANY", "PERSON"] as const).map((t) => {
            const Icon = t === "COMPANY" ? Building2 : User;
            return (
              <button
                key={t}
                onClick={() => set("type", t)}
                className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-3 h-10 text-sm transition ${
                  form.type === t
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                }`}
              >
                <Icon className="h-4 w-4" /> {t === "COMPANY" ? "Empresa" : "Pessoa"}
              </button>
            );
          })}
        </div>

        <Field label={form.type === "COMPANY" ? "Razão social" : "Nome completo"} required>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder={form.type === "COMPANY" ? "Empresa LTDA" : "Nome do cliente"} />
        </Field>

        {form.type === "COMPANY" && (
          <Field label="Nome fantasia">
            <input value={form.tradeName} onChange={(e) => set("tradeName", e.target.value)} className={inputCls} />
          </Field>
        )}

        {form.type === "PERSON" ? (
          <Field label="CPF" error={fieldError ?? undefined}>
            <input value={form.cpf} onChange={(e) => set("cpf", maskCpf(e.target.value))} className={inputCls} placeholder="000.000.000-00" inputMode="numeric" />
          </Field>
        ) : (
          <Field label="CNPJ" error={fieldError ?? undefined}>
            <input value={form.cnpj} onChange={(e) => set("cnpj", maskCnpj(e.target.value))} className={inputCls} placeholder="00.000.000/0000-00" inputMode="numeric" />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Telefone">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Telefone secundário">
            <input value={form.secondaryPhone} onChange={(e) => set("secondaryPhone", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="E-mail">
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="contato@empresa.com.br" />
        </Field>

        <Field label="Observações">
          <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className={`${inputCls} h-auto py-2 resize-none`} />
        </Field>
      </div>
    </Drawer>
  );
}

const inputCls =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label} {required && <span className="text-[var(--color-danger)]">*</span>}
      </span>
      {children}
      {error && <span className="block text-[11px] text-[var(--color-danger)]">{error}</span>}
    </label>
  );
}
