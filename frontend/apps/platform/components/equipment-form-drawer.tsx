"use client";

/**
 * EquipmentFormDrawer — create / edit an equipment against the production API.
 * customerId, type and name are required. Address options are restricted to the
 * selected customer's addresses (loaded on demand).
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import {
  equipmentsApi,
  customersApi,
  ApiClientError,
  type EquipmentDetail,
  type EquipmentStatus,
  type EquipmentType,
  type CreateEquipmentPayload,
  type Customer,
  type CustomerAddress,
} from "@erp/api";
import {
  EQUIPMENT_TYPES,
  EQUIPMENT_TYPE_LABEL,
  EQUIPMENT_STATUSES,
  EQUIPMENT_STATUS_LABEL,
} from "@platform/equipment-display";

type FormState = {
  customerId: string;
  type: EquipmentType;
  name: string;
  addressId: string;
  status: EquipmentStatus;
  tag: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  capacity: string;
  voltage: string;
  installationDate: string;
  warrantyExpiration: string;
  observations: string;
};

function fromEquipment(e: EquipmentDetail | null, presetCustomerId?: string): FormState {
  return {
    customerId: e?.customer?.id ?? presetCustomerId ?? "",
    type: e?.type ?? "SPLIT",
    name: e?.name ?? "",
    addressId: e?.address?.id ?? "",
    status: e?.status ?? "ACTIVE",
    tag: e?.tag ?? "",
    manufacturer: e?.manufacturer ?? "",
    model: e?.model ?? "",
    serialNumber: e?.serialNumber ?? "",
    capacity: e?.capacity ?? "",
    voltage: e?.voltage ?? "",
    installationDate: e?.installationDate?.slice(0, 10) ?? "",
    warrantyExpiration: e?.warrantyExpiration?.slice(0, 10) ?? "",
    observations: e?.observations ?? "",
  };
}

export function EquipmentFormDrawer({
  open,
  onClose,
  onSaved,
  equipment = null,
  presetCustomerId,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  equipment?: EquipmentDetail | null;
  presetCustomerId?: string;
}) {
  const isEdit = Boolean(equipment);
  const [form, setForm] = useState<FormState>(fromEquipment(equipment, presetCustomerId));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the customer list once the drawer opens.
  useEffect(() => {
    if (!open) return;
    setForm(fromEquipment(equipment, presetCustomerId));
    setError(null);
    const ac = new AbortController();
    customersApi
      .listCustomers({ page: 1, limit: 100, signal: ac.signal })
      .then((res) => setCustomers(res.items))
      .catch(() => undefined);
    return () => ac.abort();
  }, [open, equipment, presetCustomerId]);

  // Load addresses whenever the selected customer changes.
  useEffect(() => {
    if (!open || !form.customerId) {
      setAddresses([]);
      return;
    }
    const ac = new AbortController();
    customersApi
      .getCustomer(form.customerId, { signal: ac.signal })
      .then((c) => setAddresses(c.addresses))
      .catch(() => setAddresses([]));
    return () => ac.abort();
  }, [open, form.customerId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.customerId) { setError("Selecione o cliente."); return; }
    if (!form.name.trim()) { setError("Informe o nome do equipamento."); return; }
    setSaving(true);
    setError(null);

    const payload: CreateEquipmentPayload = {
      customerId: form.customerId,
      type: form.type,
      name: form.name.trim(),
      addressId: form.addressId || null,
      status: form.status,
      tag: form.tag.trim() || null,
      manufacturer: form.manufacturer.trim() || null,
      model: form.model.trim() || null,
      serialNumber: form.serialNumber.trim() || null,
      capacity: form.capacity.trim() || null,
      voltage: form.voltage.trim() || null,
      installationDate: form.installationDate || null,
      warrantyExpiration: form.warrantyExpiration || null,
      observations: form.observations.trim() || null,
    };

    try {
      if (isEdit && equipment) {
        await equipmentsApi.updateEquipment(equipment.id, payload);
      } else {
        await equipmentsApi.createEquipment(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError && err.isForbidden) {
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
      eyebrow="Ativos"
      title={isEdit ? "Editar equipamento" : "Novo equipamento"}
      width="max-w-xl"
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
            {isEdit ? "Salvar alterações" : "Criar equipamento"}
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

        <Field label="Cliente" required>
          <select value={form.customerId} onChange={(e) => { set("customerId", e.target.value); set("addressId", ""); }} className={inputCls}>
            <option value="">Selecione o cliente…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.tradeName || c.name}</option>)}
          </select>
        </Field>

        <Field label="Nome" required>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="Ex.: Split Sala 01" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select value={form.type} onChange={(e) => set("type", e.target.value as EquipmentType)} className={inputCls}>
              {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{EQUIPMENT_TYPE_LABEL[t]}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value as EquipmentStatus)} className={inputCls}>
              {EQUIPMENT_STATUSES.map((s) => <option key={s} value={s}>{EQUIPMENT_STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Endereço">
          <select value={form.addressId} onChange={(e) => set("addressId", e.target.value)} className={inputCls} disabled={!form.customerId}>
            <option value="">{form.customerId ? "Sem endereço específico" : "Selecione o cliente primeiro"}</option>
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>{a.name || [a.street, a.number, a.city].filter(Boolean).join(", ") || "Endereço"}</option>
            ))}
          </select>
          {form.customerId && addresses.length === 0 && (
            <span className="block text-[11px] text-[var(--color-muted-foreground)]">
              Este cliente ainda não possui endereço cadastrado. Cadastre o endereço no cliente para selecionar uma instalação específica.
            </span>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tag">
            <input value={form.tag} onChange={(e) => set("tag", e.target.value)} className={inputCls} placeholder="EQ-001" />
          </Field>
          <Field label="Nº de série">
            <input value={form.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fabricante">
            <input value={form.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Modelo">
            <input value={form.model} onChange={(e) => set("model", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacidade">
            <input value={form.capacity} onChange={(e) => set("capacity", e.target.value)} className={inputCls} placeholder="12.000 BTU" />
          </Field>
          <Field label="Tensão">
            <input value={form.voltage} onChange={(e) => set("voltage", e.target.value)} className={inputCls} placeholder="220V" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Instalação">
            <input type="date" value={form.installationDate} onChange={(e) => set("installationDate", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Garantia até">
            <input type="date" value={form.warrantyExpiration} onChange={(e) => set("warrantyExpiration", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Observações">
          <textarea value={form.observations} onChange={(e) => set("observations", e.target.value)} rows={3} className={`${inputCls} h-auto py-2 resize-none`} />
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
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label} {required && <span className="text-[var(--color-danger)]">*</span>}
      </span>
      {children}
    </label>
  );
}
