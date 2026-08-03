"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FieldEquipmentDraft, TechnicalCatalog } from "@erp/api";

export type NewFieldEquipmentDraft = FieldEquipmentDraft & { localId: string };

const inputClass =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]";

export function createEmptyFieldEquipmentDraft(): NewFieldEquipmentDraft {
  return {
    localId: localFieldEquipmentId(),
    equipmentTypeCatalogId: "",
    sector: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    capacity: "",
    voltage: "",
    tag: "",
    observations: "",
  };
}

function localFieldEquipmentId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") return randomUUID.call(globalThis.crypto);
  // Chave efêmera de UI. Nunca é enviada como identificador de domínio.
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function FieldEquipmentCollection({
  drafts,
  equipmentTypes,
  equipmentTypesLoading,
  onAdd,
  onRemove,
  onChange,
  title = "Equipamentos identificados em campo",
  description = "Registre os equipamentos encontrados no local. Os novos itens serão vinculados ao cliente e ao relatório.",
}: {
  drafts: NewFieldEquipmentDraft[];
  equipmentTypes: TechnicalCatalog[];
  equipmentTypesLoading: boolean;
  onAdd: () => void;
  onRemove: (localId: string) => void;
  onChange: (localId: string, field: keyof FieldEquipmentDraft, value: string) => void;
  title?: string;
  description?: string;
}) {
  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-info)]/30 bg-[var(--color-info)]/5 p-3">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-caption">{description}</p>
      </div>
      {drafts.map((draft, index) => (
        <div key={draft.localId} className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Novo equipamento {index + 1}</p>
            <button type="button" onClick={() => onRemove(draft.localId)} className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-md)] px-2 text-xs text-[var(--color-danger)]" aria-label={`Remover equipamento ${index + 1}`}>
              <Trash2 className="h-4 w-4" /> Remover
            </button>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Tipo *</span>
            <select value={draft.equipmentTypeCatalogId} onChange={(event) => onChange(draft.localId, "equipmentTypeCatalogId", event.target.value)} disabled={equipmentTypesLoading} className={inputClass}>
              <option value="">{equipmentTypesLoading ? "Carregando tipos…" : "Selecione"}</option>
              {equipmentTypes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldEquipmentInput label="Marca *" value={draft.manufacturer ?? ""} onChange={(value) => onChange(draft.localId, "manufacturer", value)} />
            <FieldEquipmentInput label="Modelo *" value={draft.model ?? ""} onChange={(value) => onChange(draft.localId, "model", value)} />
            <FieldEquipmentInput label="Capacidade *" value={draft.capacity ?? ""} onChange={(value) => onChange(draft.localId, "capacity", value)} placeholder="Ex.: 18.000 BTU/h" />
            <FieldEquipmentInput label="Setor / local" value={draft.sector ?? ""} onChange={(value) => onChange(draft.localId, "sector", value)} />
            <FieldEquipmentInput label="Número de série" value={draft.serialNumber ?? ""} onChange={(value) => onChange(draft.localId, "serialNumber", value)} />
            <FieldEquipmentInput label="Tensão" value={draft.voltage ?? ""} onChange={(value) => onChange(draft.localId, "voltage", value)} />
          </div>
        </div>
      ))}
      <button type="button" onClick={onAdd} disabled={drafts.length >= 20} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-primary)]/50 text-sm font-medium text-[var(--color-primary)] disabled:opacity-50">
        <Plus className="h-4 w-4" /> Adicionar outro equipamento
      </button>
    </section>
  );
}

function FieldEquipmentInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>;
}
