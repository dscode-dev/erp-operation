"use client";

/**
 * AddressFormDrawer — cadastra ou edita UM endereço de um cliente.
 *
 * Aditivo: cada save cria um novo endereço (ou atualiza o selecionado), nunca
 * substitui os demais — um cliente pode ter vários (matriz, filial, obra…).
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import { customersApi, cepApi, ApiClientError, type CustomerAddress } from "@erp/api";

type AddressForm = {
  name: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  isPrimary: boolean;
};

function fromAddress(address: CustomerAddress | null): AddressForm {
  return {
    name: address?.name ?? "",
    zipCode: address?.zipCode ?? "",
    street: address?.street ?? "",
    number: address?.number ?? "",
    complement: address?.complement ?? "",
    district: address?.district ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    isPrimary: address?.isPrimary ?? false,
  };
}

export function AddressFormDrawer({
  open,
  onClose,
  onSaved,
  customerId,
  address = null,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  customerId: string;
  address?: CustomerAddress | null;
}) {
  const isEdit = Boolean(address);
  const [form, setForm] = useState<AddressForm>(fromAddress(address));
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(fromAddress(address));
      setError(null);
      setSaving(false);
      setCepLoading(false);
    }
  }, [open, address]);

  function set<K extends keyof AddressForm>(key: K, value: AddressForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function lookupCep() {
    setCepLoading(true);
    setError(null);
    try {
      const result = await cepApi.lookupCep(form.zipCode);
      setForm((current) => ({
        ...current,
        zipCode: result.zipCode,
        street: result.street || current.street,
        district: result.district || current.district,
        city: result.city || current.city,
        state: result.state || current.state,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível consultar o CEP.");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSave() {
    const validation = validate(form);
    if (validation) {
      setError(validation);
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim() || "Endereço",
      zipCode: form.zipCode.trim(),
      street: form.street.trim(),
      number: form.number.trim(),
      complement: form.complement.trim() || null,
      district: form.district.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      isPrimary: form.isPrimary,
    };
    try {
      if (isEdit && address) {
        await customersApi.updateAddress(customerId, address.id, payload);
      } else {
        await customersApi.createAddress(customerId, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível salvar o endereço.");
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow="Endereços"
      title={isEdit ? "Editar endereço" : "Novo endereço"}
      footer={
        <>
          <button onClick={onClose} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Salvar alterações" : "Adicionar endereço"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="CEP" required>
            <input value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} className={inputCls} placeholder="00000-000" inputMode="numeric" />
          </Field>
          <button type="button" onClick={lookupCep} disabled={cepLoading || form.zipCode.replace(/\D/g, "").length !== 8} className="mt-6 inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-muted)] disabled:opacity-50">
            {cepLoading && <Loader2 className="h-4 w-4 animate-spin" />} Buscar CEP
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome do endereço">
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Matriz, Filial, Obra…" />
          </Field>
          <Field label="Número" required>
            <input value={form.number} onChange={(e) => set("number", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Logradouro" required>
          <input value={form.street} onChange={(e) => set("street", e.target.value)} className={inputCls} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Bairro" required>
            <input value={form.district} onChange={(e) => set("district", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Complemento">
            <input value={form.complement} onChange={(e) => set("complement", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cidade" required>
            <input value={form.city} onChange={(e) => set("city", e.target.value)} className={inputCls} />
          </Field>
          <Field label="UF" required>
            <input value={form.state} onChange={(e) => set("state", e.target.value.toUpperCase())} className={inputCls} maxLength={2} />
          </Field>
        </div>

        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPrimary} onChange={(e) => set("isPrimary", e.target.checked)} className="accent-[var(--color-primary)]" />
          Definir como endereço principal
        </label>
      </div>
    </Drawer>
  );
}

function validate(form: AddressForm): string | null {
  const missing = [
    ["CEP", form.zipCode],
    ["logradouro", form.street],
    ["número", form.number],
    ["bairro", form.district],
    ["cidade", form.city],
    ["UF", form.state],
  ].filter(([, value]) => !String(value).trim()).map(([label]) => label);
  if (missing.length > 0) return `Complete o endereço: ${missing.join(", ")}.`;
  if (!/^\d{5}-?\d{3}$/.test(form.zipCode.trim())) return "Informe um CEP válido.";
  if (!/^[A-Z]{2}$/.test(form.state.trim().toUpperCase())) return "Informe a UF com 2 letras.";
  return null;
}

const inputCls = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label} {required && <span className="text-[var(--color-danger)]">*</span>}</span>
      {children}
    </label>
  );
}
