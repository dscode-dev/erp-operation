"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import { ApiClientError, operationApi, type OperationDetail, type OperationType } from "@erp/api";
import {
  CustomerAddressSelect,
  CustomerSelect,
  DateTimePicker,
  EquipmentSelect,
  Field,
  ServiceTypeSelect,
  UserSelect,
  inputCls,
} from "./entity-select";

type Mode = "operation" | "schedule" | "service" | "work-order";
type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = ["Cliente", "Escopo", "Execução", "Checklist", "Confirmar"];

const DEFAULT_CHECKLIST = [
  "Conferir EPI e isolamento",
  "Diagnóstico inicial",
  "Executar serviço planejado",
  "Testar funcionamento",
  "Registrar evidências",
];

const MODE_COPY: Record<Mode, { eyebrow: string; title: string; description: string; success: string }> = {
  operation: {
    eyebrow: "Operação",
    title: "Nova operação",
    description: "Cria uma Operation real no backend. A OS rascunho nasce automaticamente.",
    success: "Operação criada com sucesso.",
  },
  schedule: {
    eyebrow: "Agenda",
    title: "Novo agendamento",
    description: "Não existe domínio dedicado de Agenda; este fluxo cria uma Operation agendada real.",
    success: "Agendamento registrado como Operation.",
  },
  service: {
    eyebrow: "Serviços",
    title: "Novo serviço",
    description: "Serviços são uma visão operacional de Operations. Nenhum Service paralelo é criado.",
    success: "Serviço criado como Operation.",
  },
  "work-order": {
    eyebrow: "Ordem de Serviço",
    title: "Nova OS",
    description: "Toda OS nasce de uma Operation; o backend gera o documento rascunho automaticamente.",
    success: "Operation criada e OS rascunho gerada.",
  },
};

export function OperationCreationDrawer({
  open,
  mode = "operation",
  onClose,
  onCreated,
}: {
  open: boolean;
  mode?: Mode;
  onClose: () => void;
  onCreated?: (operation: OperationDetail) => void;
}) {
  const copy = MODE_COPY[mode];
  const [step, setStep] = useState<Step>(0);
  const [customerId, setCustomerId] = useState("");
  const [addressId, setAddressId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [operatorId, setOperatorId] = useState("");
  const [type, setType] = useState<OperationType>("PREVENTIVA");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);
  const [newItem, setNewItem] = useState("");
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<OperationDetail | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setCustomerId("");
    setAddressId("");
    setEquipmentId("");
    setOperatorId("");
    setType("PREVENTIVA");
    setDate("");
    setTime("");
    setChecklist(DEFAULT_CHECKLIST);
    setNewItem("");
    setObservations("");
    setSaving(false);
    setError(null);
    setCreated(null);
  }, [open]);

  const scheduledFor = useMemo(() => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}:00`).toISOString();
  }, [date, time]);

  const canNext =
    step === 0 ? Boolean(customerId)
    : step === 1 ? true
    : step === 2 ? Boolean(type) && (mode === "schedule" ? Boolean(scheduledFor) : true)
    : step === 3 ? checklist.length > 0
    : true;

  function addChecklistItem() {
    const label = newItem.trim();
    if (!label) return;
    setChecklist((items) => [...items, label]);
    setNewItem("");
  }

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const operation = await operationApi.createOperation({
        customerId,
        addressId: addressId || null,
        equipmentId: equipmentId || null,
        type,
        status: mode === "schedule" ? "DRAFT" : "IN_PROGRESS",
        scheduledFor,
        operatorId: operatorId || null,
        checklist: checklist.map((label) => ({ label, done: false })),
        observations: observations || null,
      });
      setCreated(operation);
      onCreated?.(operation);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Não foi possível criar a operação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      eyebrow={copy.eyebrow}
      title={copy.title}
      width="max-w-2xl"
      footer={
        created ? (
          <button onClick={onClose} className={primaryBtn}>Concluir</button>
        ) : (
          <>
            <button onClick={step === 0 ? onClose : () => setStep((s) => Math.max(0, s - 1) as Step)} className={secondaryBtn}>
              {step === 0 ? "Cancelar" : <><ChevronLeft className="h-4 w-4" /> Voltar</>}
            </button>
            {step < 4 ? (
              <button onClick={() => setStep((s) => Math.min(4, s + 1) as Step)} disabled={!canNext} className={primaryBtn}>
                Avançar <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={submit} disabled={saving || !canNext} className={primaryBtn}>
                {saving ? "Criando…" : "Criar"}
              </button>
            )}
          </>
        )
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-[var(--color-muted-foreground)]">{copy.description}</p>
        {operatorId && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-3 py-2 text-sm text-[var(--color-info)]">
            O backend criará a Assignment para o operador selecionado e manterá a trilha de auditoria.
          </div>
        )}
        {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
        {created ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 p-5 text-[var(--color-success)]">
            <div className="flex items-center gap-2 font-semibold"><Check className="h-5 w-5" /> {copy.success}</div>
            <p className="mt-2 text-sm">Número da Operation: #{String(created.number).padStart(6, "0")}. A OS rascunho fica disponível nos documentos da operação.</p>
          </div>
        ) : (
          <>
            <Stepper step={step} />
            {step === 0 && (
              <div className="space-y-3">
                <CustomerSelect value={customerId} onChange={(id) => { setCustomerId(id); setAddressId(""); setEquipmentId(""); }} />
                <CustomerAddressSelect customerId={customerId} value={addressId} onChange={setAddressId} />
              </div>
            )}
            {step === 1 && (
              <div className="space-y-3">
                <EquipmentSelect customerId={customerId} value={equipmentId} onChange={setEquipmentId} />
                <p className="text-caption">Equipamento é opcional, mas recomendado para timeline, lifecycle e documentos.</p>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-3">
                <ServiceTypeSelect value={type} onChange={setType} />
                <UserSelect value={operatorId} onChange={setOperatorId} />
                <DateTimePicker date={date} time={time} onDate={setDate} onTime={setTime} />
              </div>
            )}
            {step === 3 && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input value={newItem} onChange={(event) => setNewItem(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addChecklistItem(); } }} className={inputCls} placeholder="Adicionar item de checklist" />
                  <button onClick={addChecklistItem} className={secondaryBtn}>Adicionar</button>
                </div>
                <ul className="space-y-2">
                  {checklist.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm">
                      <span>{item}</span>
                      <button onClick={() => setChecklist((items) => items.filter((_, i) => i !== index))} className="text-xs text-[var(--color-danger)] hover:underline">remover</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {step === 4 && (
              <div className="space-y-3">
                <Field label="Observações">
                  <textarea value={observations} onChange={(event) => setObservations(event.target.value)} className={`${inputCls} min-h-28 py-2`} autoFocus />
                </Field>
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm">
                  <div><strong>Cliente:</strong> {customerId ? "selecionado" : "—"}</div>
                  <div><strong>Tipo:</strong> {type}</div>
                  <div><strong>Agenda:</strong> {scheduledFor ? new Date(scheduledFor).toLocaleString("pt-BR") : "não definida"}</div>
                  <div><strong>Checklist:</strong> {checklist.length} item(ns)</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, index) => (
        <div key={label} className="flex flex-1 items-center gap-2">
          <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${index <= step ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"}`}>{index + 1}</span>
          <span className="hidden text-xs text-[var(--color-muted-foreground)] sm:inline">{label}</span>
        </div>
      ))}
    </div>
  );
}

const primaryBtn = "inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-50";
const secondaryBtn = "inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]";
