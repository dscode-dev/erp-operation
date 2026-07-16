"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, ChevronLeft, ChevronRight, FileSignature, Settings2, type LucideIcon } from "lucide-react";
import {
  ApiClientError,
  customersApi,
  documentsApi,
  equipmentsApi,
  pmocApi,
  signaturesApi,
  usersApi,
  useQuery,
  type CreateOperationPayload,
  type Customer,
  type CustomerAddress,
  type DocumentConfiguration,
  type EquipmentSummary,
  type PmocGenerationMode,
  type PmocPeriodicity,
  type PmocPlan,
  type Signature,
  type TeamUser,
} from "@erp/api";
import { Drawer } from "@erp/ui/drawer";
import { OperationCreationDrawer } from "./operation-creation-drawer";

const PERIODICITIES: Array<{ value: PmocPeriodicity; label: string; months: number }> = [
  { value: "MONTHLY", label: "Mensal", months: 1 },
  { value: "BIMONTHLY", label: "Bimestral", months: 2 },
  { value: "QUARTERLY", label: "Trimestral", months: 3 },
  { value: "FOUR_MONTHLY", label: "Quadrimestral", months: 4 },
  { value: "SEMIANNUAL", label: "Semestral", months: 6 },
  { value: "YEARLY", label: "Anual", months: 12 },
];

type Form = {
  customerId: string;
  addressId: string;
  equipmentIds: string[];
  name: string;
  coverage: string;
  periodicity: PmocPeriodicity;
  startDate: string;
  endDate: string;
  defaultTechnicianId: string;
  defaultOperatorId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  operationType: "PREVENTIVA" | "CORRETIVA" | "INSTALACAO" | "PROJETO";
  duration: string;
  operationObservations: string;
  generationMode: PmocGenerationMode;
  firstExecution: "NOW" | "NEXT";
  overrideSignature: boolean;
  signatureOverrideId: string;
};
type FormSetter = <K extends keyof Form>(key: K, value: Form[K]) => void;

const initialForm: Form = {
  customerId: "", addressId: "", equipmentIds: [], name: "", coverage: "",
  periodicity: "MONTHLY", startDate: addMonths(today(), 1), endDate: addMonths(today(), 13),
  defaultTechnicianId: "", defaultOperatorId: "", priority: "HIGH",
  operationType: "PREVENTIVA", duration: "120", operationObservations: "",
  generationMode: "MANUAL", firstExecution: "NEXT", overrideSignature: false,
  signatureOverrideId: "",
};

export function PmocPlanWizard({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (pmoc: PmocPlan) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationOpen, setOperationOpen] = useState(false);
  const [executionRequestId, setExecutionRequestId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<CreateOperationPayload | null>(null);
  const customers = useQuery((signal) => customersApi.listCustomers({ limit: 100, signal }), []);
  const customer = useQuery(
    (signal) => form.customerId ? customersApi.getCustomer(form.customerId, { signal }) : Promise.resolve(null),
    [form.customerId],
  );
  const equipments = useQuery(
    (signal) => form.customerId
      ? equipmentsApi.listEquipments({ customerId: form.customerId, limit: 100, signal })
      : Promise.resolve({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
    [form.customerId],
  );
  const users = useQuery((signal) => usersApi.listUsers({ limit: 100, signal }), []);
  const signatures = useQuery((signal) => signaturesApi.listSignatures({ limit: 100, active: true, signal }), []);
  const documentConfig = useQuery<DocumentConfiguration>(
    (signal) => documentsApi.getConfigurationByType("PMOC", { signal }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    setStep(0); setForm(initialForm); setError(null); setSaving(false);
  }, [open]);

  const projection = useMemo(() => project(form), [form]);
  const template = documentConfig.data?.defaultTemplate;
  const signatureMode = template?.signatureMode ?? "NONE";
  const configuredSignature = template?.signature ?? null;

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const canContinue = step === 0
    ? Boolean(form.customerId && form.equipmentIds.length && form.name.trim() && form.startDate && form.endDate)
    : step === 1 ? Boolean(form.defaultTechnicianId && form.duration)
    : step === 2 ? true
    : signatureMode === "FIXED" || signatureMode === "HYBRID"
      ? Boolean(configuredSignature || form.signatureOverrideId)
      : true;

  async function submit() {
    if (!canContinue || !form.equipmentIds[0]) return;
    setSaving(true); setError(null);
    try {
      const pmoc = await pmocApi.createPmoc({
        name: form.name,
        customerId: form.customerId,
        equipmentId: form.equipmentIds[0],
        equipmentIds: form.equipmentIds,
        defaultAddressId: form.addressId || undefined,
        coverage: form.coverage || undefined,
        periodicity: form.periodicity,
        generationMode: form.generationMode,
        defaultOperatorId: form.defaultOperatorId || undefined,
        defaultTechnicianId: form.defaultTechnicianId,
        signatureOverrideId: form.overrideSignature ? form.signatureOverrideId || undefined : undefined,
        responsibleTechnician: userName(users.data?.items, form.defaultTechnicianId),
        startDate: form.firstExecution === "NOW" ? today() : form.startDate,
        endDate: form.endDate,
        priority: form.priority,
        defaultOperationType: form.operationType,
        defaultEstimatedDurationMinutes: Number(form.duration),
        defaultOperationObservations: form.operationObservations || undefined,
      });
      onCreated(pmoc);
      const request = pmoc.executionRequests?.find((item) => item.status === "PENDING");
      if (form.firstExecution === "NOW" && request) {
        const operationPrefill = await pmocApi.getExecutionRequestPrefill(request.id);
        setExecutionRequestId(request.id);
        setPrefill(operationPrefill);
        setOperationOpen(true);
      } else {
        onClose();
      }
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Não foi possível criar o PMOC.");
    } finally { setSaving(false); }
  }

  async function submitOperation(payload: CreateOperationPayload) {
    if (!executionRequestId) throw new Error("Execution Request não encontrada.");
    const request = await pmocApi.generateWorkOrder(executionRequestId, payload);
    if (!request.operationId) throw new Error("A OS não foi vinculada à execução.");
    return (await import("@erp/api")).operationApi.getOperation(request.operationId);
  }

  return <>
    <Drawer open={open && !operationOpen} onClose={onClose} eyebrow="PMOC operacional" title="Novo plano PMOC" width="max-w-4xl"
      footer={<>
        <button className={secondary} onClick={step === 0 ? onClose : () => setStep((value) => value - 1)}>{step === 0 ? "Cancelar" : <><ChevronLeft className="h-4 w-4" /> Voltar</>}</button>
        {step < 3
          ? <button className={primary} disabled={!canContinue} onClick={() => setStep((value) => value + 1)}>Continuar <ChevronRight className="h-4 w-4" /></button>
          : <button className={primary} disabled={!canContinue || saving} onClick={() => void submit()}>{saving ? "Criando…" : "Criar plano PMOC"}</button>}
      </>}>
      <div className="space-y-6">
        <Stepper step={step} />
        {error && <Notice tone="danger">{error}</Notice>}
        {step === 0 && <PlanStep form={form} set={set} customers={customers.data?.items ?? []} addresses={customer.data?.addresses ?? []} equipments={equipments.data?.items ?? []} projection={projection} />}
        {step === 1 && <OperationStep form={form} set={set} users={users.data?.items ?? []} />}
        {step === 2 && <ScheduleStep form={form} set={set} projection={projection} />}
        {step === 3 && <SignatureStep mode={signatureMode} configured={configuredSignature} signatures={signatures.data?.items ?? []} form={form} set={set} />}
      </div>
    </Drawer>
    <OperationCreationDrawer open={operationOpen} mode="work-order" initialValues={prefill ?? undefined}
      submitOperation={submitOperation} submitLabel="Gerar OS da Execução 001"
      contextNotice="A OS será gerada a partir da Execution Request 001 e continuará gerenciável no fluxo oficial de Operations."
      onClose={() => { setOperationOpen(false); onClose(); }} />
  </>;
}

function PlanStep({ form, set, customers, addresses, equipments, projection }: { form: Form; set: FormSetter; customers: Customer[]; addresses: CustomerAddress[]; equipments: EquipmentSummary[]; projection: ReturnType<typeof project> }) {
  return <section className="space-y-4"><Header icon={CalendarClock} title="Informações do plano" text="Defina a cobertura técnica e a recorrência oficial." />
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Cliente"><select value={form.customerId} onChange={(e) => { set("customerId", e.target.value); set("addressId", ""); set("equipmentIds", []); }}><option value="">Selecione…</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.tradeName ?? item.name}</option>)}</select></Field>
      <Field label="Endereço"><select value={form.addressId} onChange={(e) => set("addressId", e.target.value)}><option value="">Endereço principal</option>{addresses.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.street}, {item.number}</option>)}</select></Field>
      <Field label="Nome do plano"><input value={form.name} maxLength={140} onChange={(e) => set("name", e.target.value)} placeholder="PMOC · Unidade Recife" /></Field>
      <Field label="Frequência"><select value={form.periodicity} onChange={(e) => set("periodicity", e.target.value as PmocPeriodicity)}>{PERIODICITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
      <Field label="Início"><input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
      <Field label="Fim da cobertura"><input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></Field>
    </div>
    <Field label="Equipamentos cobertos"><div className="max-h-52 space-y-1 overflow-auto rounded-[var(--radius-md)] border border-[var(--color-border)] p-2">{equipments.length ? equipments.map((item: EquipmentSummary) => <label key={item.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-[var(--color-muted)]"><input type="checkbox" checked={form.equipmentIds.includes(item.id)} onChange={() => set("equipmentIds", form.equipmentIds.includes(item.id) ? form.equipmentIds.filter((id: string) => id !== item.id) : [...form.equipmentIds, item.id])} /><span className="text-sm"><strong>{item.name}</strong><span className="block text-xs text-[var(--color-muted-foreground)]">{item.tag ?? item.type}</span></span></label>) : <p className="p-3 text-sm text-[var(--color-muted-foreground)]">Selecione um cliente com equipamentos ativos.</p>}</div></Field>
    <Field label="Cobertura"><textarea rows={3} value={form.coverage} onChange={(e) => set("coverage", e.target.value)} placeholder="Escopo técnico coberto pelo plano" /></Field>
    <Projection projection={projection} />
  </section>;
}

function OperationStep({ form, set, users }: { form: Form; set: FormSetter; users: TeamUser[] }) {
  const active = users.filter((item: TeamUser) => item.isActive && item.role !== "VIEWER");
  return <section className="space-y-4"><Header icon={Settings2} title="Configuração operacional" text="Base utilizada para preencher cada OS futura no drawer oficial." />
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Técnico padrão"><select value={form.defaultTechnicianId} onChange={(e) => set("defaultTechnicianId", e.target.value)}><option value="">Selecione…</option>{active.map((u: TeamUser) => <option key={u.id} value={u.id}>{u.name} · {u.jobTitle ?? u.role}</option>)}</select></Field>
      <Field label="Operador padrão (opcional)"><select value={form.defaultOperatorId} onChange={(e) => set("defaultOperatorId", e.target.value)}><option value="">Definir ao gerar a OS</option>{active.map((u: TeamUser) => <option key={u.id} value={u.id}>{u.name} · {u.role}</option>)}</select></Field>
      <Field label="Prioridade"><select value={form.priority} onChange={(e) => set("priority", e.target.value as Form["priority"])}><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></Field>
      <Field label="Tipo de atendimento"><select value={form.operationType} onChange={(e) => set("operationType", e.target.value as Form["operationType"])}><option value="PREVENTIVA">Preventiva</option><option value="CORRETIVA">Corretiva</option><option value="INSTALACAO">Instalação</option><option value="PROJETO">Projeto</option></select></Field>
      <Field label="Duração estimada (minutos)"><input type="number" min={15} max={10080} value={form.duration} onChange={(e) => set("duration", e.target.value)} /></Field>
    </div>
    <Field label="Observações iniciais da OS"><textarea rows={5} value={form.operationObservations} onChange={(e) => set("operationObservations", e.target.value)} placeholder="Orientações que serão sugeridas em cada execução" /></Field>
  </section>;
}

function ScheduleStep({ form, set, projection }: { form: Form; set: FormSetter; projection: ReturnType<typeof project> }) {
  return <section className="space-y-4"><Header icon={CalendarClock} title="Agendamento" text="Escolha como as Execution Requests serão convertidas em OS." />
    <div className="grid gap-3 md:grid-cols-3">{(["AUTO", "MANUAL", "PAUSED"] as const).map((mode) => <button type="button" key={mode} onClick={() => set("generationMode", mode)} className={`rounded-[var(--radius-lg)] border p-4 text-left ${form.generationMode === mode ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)]"}`}><strong>{mode}</strong><span className="mt-1 block text-xs text-[var(--color-muted-foreground)]">{mode === "AUTO" ? "OS criada automaticamente pela periodicidade." : mode === "MANUAL" ? "A equipe revisa e gera cada OS." : "Plano criado sem geração ativa."}</span></button>)}</div>
    {form.generationMode === "AUTO" && <Notice tone="info">Uma Ordem de Serviço será criada automaticamente conforme a periodicidade configurada.</Notice>}
    {form.generationMode !== "PAUSED" && <div className="space-y-2"><label className="flex gap-3 rounded-lg border border-[var(--color-border)] p-3"><input type="radio" checked={form.firstExecution === "NOW"} onChange={() => set("firstExecution", "NOW")} /><span><strong className="text-sm">Gerar imediatamente a primeira OS</strong><span className="block text-xs text-[var(--color-muted-foreground)]">Abre o OperationCreationDrawer após criar o plano.</span></span></label><label className="flex gap-3 rounded-lg border border-[var(--color-border)] p-3"><input type="radio" checked={form.firstExecution === "NEXT"} onChange={() => set("firstExecution", "NEXT")} /><span><strong className="text-sm">Começar na próxima competência</strong><span className="block text-xs text-[var(--color-muted-foreground)]">Mantém a primeira execução prevista para {formatDate(projection.next)}.</span></span></label></div>}
    <Projection projection={projection} />
  </section>;
}

function SignatureStep({ mode, configured, signatures, form, set }: { mode: string; configured: Signature | null; signatures: Signature[]; form: Form; set: FormSetter }) {
  return <section className="space-y-4"><Header icon={FileSignature} title="Assinaturas" text="A política vem do Template PMOC e não é redefinida no frontend." />
    {mode === "NONE" && <Notice tone="neutral">Este Template não exige assinatura. Nenhum campo adicional será exibido.</Notice>}
    {mode === "COLLECTED" && <Notice tone="info">A assinatura será coletada durante a execução. Não há assinatura institucional automática.</Notice>}
    {(mode === "FIXED" || mode === "HYBRID") && <div className="rounded-xl border border-[var(--color-border)] p-4"><p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Assinatura institucional</p><p className="mt-2 font-semibold">{configured?.name ?? "Não configurada"}</p><p className="text-sm text-[var(--color-muted-foreground)]">{configured?.title ?? "Responsável técnico"}{configured?.professionalCouncil ? ` · ${configured.professionalCouncil}` : ""}</p><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.overrideSignature} onChange={(e) => set("overrideSignature", e.target.checked)} /> Alterar somente neste PMOC</label>{form.overrideSignature && <select className="mt-3" value={form.signatureOverrideId} onChange={(e) => set("signatureOverrideId", e.target.value)}><option value="">Selecione uma assinatura ativa…</option>{signatures.map((signature) => <option key={signature.id} value={signature.id}>{signature.name} · {signature.title}</option>)}</select>}</div>}
    {mode === "HYBRID" && <Notice tone="info">A assinatura institucional será aplicada e a assinatura do cliente será coletada durante a execução.</Notice>}
  </section>;
}

function Stepper({ step }: { step: number }) { return <div className="grid grid-cols-4 gap-2">{["Plano", "Operação", "Agendamento", "Assinaturas"].map((label, index) => <div key={label} className={`rounded-lg px-2 py-2 text-center text-xs font-medium ${index <= step ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"}`}>{index < step ? <Check className="mx-auto h-4 w-4" /> : label}</div>)}</div>; }
function Header({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) { return <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><Icon className="h-5 w-5" /></span><div><h3 className="font-semibold">{title}</h3><p className="text-sm text-[var(--color-muted-foreground)]">{text}</p></div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-medium">{label}{children}</label>; }
function Notice({ tone, children }: { tone: "danger" | "info" | "neutral"; children: React.ReactNode }) { const color = tone === "danger" ? "border-red-500/30 bg-red-500/10 text-red-700" : tone === "info" ? "border-blue-500/30 bg-blue-500/10 text-blue-700" : "border-[var(--color-border)] bg-[var(--color-muted)]"; return <div className={`rounded-lg border p-3 text-sm ${color}`}>{children}</div>; }
function Projection({ projection }: { projection: ReturnType<typeof project> }) { return <div className="grid gap-3 rounded-xl bg-[var(--color-muted)] p-4 sm:grid-cols-3"><Metric label="Execuções previstas" value={String(projection.count)} /><Metric label="Período" value={`${projection.months} meses`} /><Metric label="Próxima execução" value={formatDate(projection.next)} /></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span className="block text-xs text-[var(--color-muted-foreground)]">{label}</span><strong className="text-sm">{value}</strong></div>; }
function project(form: Form) { const start = new Date(`${form.startDate}T12:00:00`); const end = new Date(`${form.endDate}T12:00:00`); const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()); const cadence = PERIODICITIES.find((item) => item.value === form.periodicity)?.months ?? 1; return { months, count: Math.max(1, Math.floor(months / cadence) + 1), next: form.firstExecution === "NOW" ? today() : form.startDate }; }
function today() { return new Date().toISOString().slice(0, 10); }
function addMonths(value: string, months: number) { const date = new Date(`${value}T12:00:00`); date.setMonth(date.getMonth() + months); return date.toISOString().slice(0, 10); }
function formatDate(value: string) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—"; }
function userName(users: TeamUser[] | undefined, id: string) { return users?.find((item) => item.id === id)?.name ?? "Responsável técnico"; }
const primary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50";
const secondary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium";
