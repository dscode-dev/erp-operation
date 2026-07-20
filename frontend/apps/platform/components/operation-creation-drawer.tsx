"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Drawer } from "@erp/ui/drawer";
import { MultiSelect } from "@erp/ui/multi-select";
import { TechnicalCatalogSelector } from "@erp/ui/technical-catalog/technical-catalog-selector";
import {
  ApiClientError,
  equipmentsApi,
  operationApi,
  technicalCatalogsApi,
  useQuery,
  type CreateOperationPayload,
  type DocumentKind,
  type OperationDetail,
  type OperationType,
} from "@erp/api";
import { DOCUMENT_KIND_LABEL } from "@erp/types";
import {
  CustomerAddressSelect,
  CustomerSelect,
  DateTimePicker,
  Field,
  ServiceTypeSelect,
  UserSelect,
  inputCls,
} from "./entity-select";

type Mode = "operation" | "schedule" | "service" | "work-order";
type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = ["Cliente", "Escopo", "Execução", "Checklist", "Confirmar"];

const ATTENDANCE_DOCUMENT_TYPES: DocumentKind[] = [
  "WORK_ORDER",
  "TECHNICAL_REPORT",
  "TECHNICAL_OPINION",
  "BUDGET",
];

const MODE_COPY: Record<Mode, { eyebrow: string; title: string; description: string; success: string }> = {
  operation: {
    eyebrow: "Operação",
    title: "Nova operação",
    description: "Cadastre um novo atendimento operacional. A Ordem de Serviço será preparada automaticamente.",
    success: "Operação criada com sucesso.",
  },
  schedule: {
    eyebrow: "Agenda",
    title: "Novo agendamento",
    description: "Programe um atendimento e defina o operador responsável.",
    success: "Agendamento registrado com sucesso.",
  },
  service: {
    eyebrow: "Serviços",
    title: "Novo serviço",
    description: "Cadastre o serviço com cliente, escopo e responsável.",
    success: "Serviço criado com sucesso.",
  },
  "work-order": {
    eyebrow: "Ordem de Serviço",
    title: "Nova OS",
    description: "Preencha os dados necessários para criar e gerenciar a Ordem de Serviço.",
    success: "Ordem de Serviço preparada com sucesso.",
  },
};

export function OperationCreationDrawer({
  open,
  mode = "operation",
  onClose,
  onCreated,
  initialValues,
  submitOperation,
  submitLabel,
  contextNotice,
}: {
  open: boolean;
  mode?: Mode;
  onClose: () => void;
  onCreated?: (operation: OperationDetail) => void;
  initialValues?: Partial<CreateOperationPayload>;
  submitOperation?: (payload: CreateOperationPayload) => Promise<OperationDetail>;
  submitLabel?: string;
  contextNotice?: string;
}) {
  const copy = MODE_COPY[mode];
  const [step, setStep] = useState<Step>(0);
  const [customerId, setCustomerId] = useState("");
  const [addressId, setAddressId] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [operatorId, setOperatorId] = useState("");
  const [type, setType] = useState<OperationType>("PREVENTIVA");
  const [documentType, setDocumentType] = useState<DocumentKind>("WORK_ORDER");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [checklist, setChecklist] = useState<string[]>([]);
  const [observations, setObservations] = useState("");
  const [reportedIssue, setReportedIssue] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<OperationDetail | null>(null);
  const equipments = useQuery(
    (signal) => customerId
      ? equipmentsApi.listEquipments({ customerId, limit: 100, signal })
      : Promise.resolve(null),
    [customerId],
  );

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setCustomerId(initialValues?.customerId ?? "");
    setAddressId(initialValues?.addressId ?? "");
    setEquipmentId(initialValues?.equipmentId ?? initialValues?.inspectedEquipments?.[0]?.equipmentId ?? "");
    setEquipmentIds(
      initialValues?.inspectedEquipments?.map((item) => item.equipmentId) ??
        (initialValues?.equipmentId ? [initialValues.equipmentId] : []),
    );
    setOperatorId(initialValues?.operatorId ?? "");
    setType(initialValues?.type ?? "PREVENTIVA");
    setDocumentType(initialValues?.documentType ?? "WORK_ORDER");
    const schedule = initialValues?.scheduledFor ? localDateTime(initialValues.scheduledFor) : null;
    setDate(schedule?.date ?? "");
    setTime(schedule?.time ?? "");
    setChecklist(initialValues?.checklist?.map((item) => item.label) ?? []);
    setObservations(initialValues?.observations ?? "");
    setReportedIssue(initialValues?.reportedIssue ?? "");
    setServiceDescription(initialValues?.serviceDescription ?? "");
    setSaving(false);
    setError(null);
    setCreated(null);
  }, [initialValues, open]);

  const scheduledFor = useMemo(() => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}:00`).toISOString();
  }, [date, time]);
  const documentTypeLocked = initialValues?.documentType === "PMOC";

  const canNext =
    step === 0 ? Boolean(customerId)
    : step === 1 ? true
    : step === 2 ? Boolean(type) && (mode === "schedule" ? Boolean(scheduledFor) : true)
    : true; // checklist é opcional (depende do que houver em Catálogos Técnicos)

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const payload: CreateOperationPayload = {
        ...initialValues,
        customerId,
        addressId: addressId || null,
        equipmentId: equipmentId || null,
        inspectedEquipments: equipmentIds.map((id) => {
          const existing = initialValues?.inspectedEquipments?.find((item) => item.equipmentId === id);
          const equipment = equipments.data?.items.find((item) => item.id === id);
          return {
            equipmentId: id,
            sector: existing?.sector ?? equipment?.name ?? "Equipamento selecionado",
            systemType: existing?.systemType ?? null,
            currentSituation: existing?.currentSituation ?? null,
          };
        }),
        type,
        documentType,
        // Nasce como rascunho; a atribuição ao operador leva a operação para
        // "Pendente" no backend, e só o início da execução muda para
        // "Em andamento".
        status: initialValues?.status ?? "DRAFT",
        scheduledFor,
        operatorId: operatorId || null,
        checklist: checklist.map((label) => ({ label, done: false })),
        observations: observations || null,
        reportedIssue: reportedIssue || null,
        serviceDescription: serviceDescription || null,
      };
      const operation = submitOperation
        ? await submitOperation(payload)
        : await operationApi.createOperation(payload);
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
                {saving ? "Criando…" : (submitLabel ?? "Criar")}
              </button>
            )}
          </>
        )
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-[var(--color-muted-foreground)]">{copy.description}</p>
        {contextNotice && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 px-3 py-2 text-sm">
            {contextNotice}
          </div>
        )}
        {operatorId && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-3 py-2 text-sm text-[var(--color-info)]">
            O atendimento será encaminhado ao operador selecionado e todo o histórico será preservado.
          </div>
        )}
        {error && <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">{error}</div>}
        {created ? (
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 p-5 text-[var(--color-success)]">
            <div className="flex items-center gap-2 font-semibold"><Check className="h-5 w-5" /> {copy.success}</div>
            <p className="mt-2 text-sm">Atendimento #{String(created.number).padStart(6, "0")}. A Ordem de Serviço fica disponível na área de documentos.</p>
          </div>
        ) : (
          <>
            <Stepper step={step} />
            {step === 0 && (
              <div className="space-y-3">
                <CustomerSelect value={customerId} onChange={(id) => { setCustomerId(id); setAddressId(""); setEquipmentId(""); setEquipmentIds([]); }} />
                <CustomerAddressSelect customerId={customerId} value={addressId} onChange={setAddressId} />
              </div>
            )}
            {step === 1 && (
              <div className="space-y-3">
                <MultiSelect
                  label="Equipamentos da Ordem de Serviço"
                  value={equipmentIds}
                  onChange={(ids) => { setEquipmentIds(ids); setEquipmentId(ids[0] ?? ""); }}
                  options={(equipments.data?.items ?? []).map((equipment) => ({
                    value: equipment.id,
                    label: equipment.name,
                    description: equipment.tag ?? equipment.type,
                  }))}
                  placeholder={customerId ? "Selecione um ou mais equipamentos" : "Selecione primeiro o cliente"}
                  emptyMessage="Nenhum equipamento ativo disponível para este cliente."
                />
                <p className="text-caption">Todos os equipamentos selecionados serão preservados na OS, no Operator e no documento. O primeiro permanece como equipamento principal para compatibilidade.</p>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-3">
                <ServiceTypeSelect value={type} onChange={setType} />
                <Field label="Documento solicitado">
                  <select value={documentType} onChange={(event) => setDocumentType(event.target.value as DocumentKind)} className={inputCls} disabled={documentTypeLocked}>
                    {(documentTypeLocked ? (["PMOC"] as DocumentKind[]) : ATTENDANCE_DOCUMENT_TYPES).map((item) => (
                      <option key={item} value={item}>{DOCUMENT_KIND_LABEL[item]}</option>
                    ))}
                  </select>
                </Field>
                <p className="text-caption">PMOC continua sendo atribuído pelo plano oficial. Os demais atendimentos usarão o documento selecionado.</p>
                <UserSelect value={operatorId} onChange={setOperatorId} />
                <DateTimePicker date={date} time={time} onDate={setDate} onTime={setTime} />
              </div>
            )}
            {step === 3 && (
              <div className="space-y-3">
                <p className="text-caption">
                  Selecione os checks que o operador deverá seguir. Os itens vêm de <strong>Catálogos Técnicos</strong> para o documento <strong>{DOCUMENT_KIND_LABEL[documentType]}</strong>; você também pode adicionar itens personalizados.
                </p>
                <TechnicalCatalogSelector
                  type="CHECKLIST"
                  workflow={technicalCatalogsApi.documentWorkflow(documentType)}
                  label="Item de checklist"
                  values={checklist}
                  onChange={setChecklist}
                />
              </div>
            )}
            {step === 4 && (
              <div className="space-y-3">
                <Field label="Defeito ou solicitação"><textarea value={reportedIssue} onChange={(event) => setReportedIssue(event.target.value)} className={`${inputCls} min-h-24 py-2`} autoFocus /></Field>
                <Field label="Serviços previstos ou executados"><textarea value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} className={`${inputCls} min-h-28 py-2`} placeholder="Um item por linha" /></Field>
                <Field label="Observações"><textarea value={observations} onChange={(event) => setObservations(event.target.value)} className={`${inputCls} min-h-24 py-2`} /></Field>
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-sm">
                  <div><strong>Cliente:</strong> {customerId ? "selecionado" : "—"}</div>
                  <div><strong>Tipo:</strong> {type}</div>
                  <div><strong>Documento:</strong> {DOCUMENT_KIND_LABEL[documentType]}</div>
                  <div><strong>Agenda:</strong> {scheduledFor ? new Date(scheduledFor).toLocaleString("pt-BR") : "não definida"}</div>
                  <div><strong>Checklist:</strong> {checklist.length} item(ns)</div>
                  <div><strong>Equipamentos:</strong> {equipmentIds.length}</div>
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

function localDateTime(value: string): { date: string; time: string } {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}
