"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSignature,
  MapPinned,
  RefreshCw,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import {
  ApiClientError,
  customersApi,
  documentsApi,
  equipmentsApi,
  pmocApi,
  signaturesApi,
  technicalCatalogsApi,
  usersApi,
  useQuery,
  type CreateOperationPayload,
  type Customer,
  type CustomerAddress,
  type DocumentConfiguration,
  type EquipmentSummary,
  type OperationType,
  type PmocGenerationMode,
  type PmocPeriodicity,
  type PmocPlan,
  type Signature,
  type TeamUser,
} from "@erp/api";
import { Drawer } from "@erp/ui/drawer";
import { MultiSelect } from "@erp/ui/multi-select";
import { OperationCreationDrawer } from "./operation-creation-drawer";

const PERIODICITIES: Array<{ value: PmocPeriodicity; label: string; months: number }> = [
  { value: "MONTHLY", label: "Mensal", months: 1 },
  { value: "BIMONTHLY", label: "Bimestral", months: 2 },
  { value: "QUARTERLY", label: "Trimestral", months: 3 },
  { value: "FOUR_MONTHLY", label: "Quadrimestral", months: 4 },
  { value: "SEMIANNUAL", label: "Semestral", months: 6 },
  { value: "YEARLY", label: "Anual", months: 12 },
];

const SERVICE_TYPES: Array<{ value: OperationType; label: string; description: string }> = [
  { value: "PREVENTIVA", label: "Manutenção preventiva", description: "Inspeção, limpeza e conservação programada." },
  { value: "CORRETIVA", label: "Manutenção corretiva", description: "Diagnóstico e correção de falhas." },
  { value: "INSTALACAO", label: "Instalação", description: "Instalação ou substituição programada." },
  { value: "PROJETO", label: "Projeto / inspeção técnica", description: "Levantamento, inspeção e avaliação técnica." },
];

type Form = {
  customerId: string;
  addressId: string;
  equipmentIds: string[];
  scopeCatalogIds: string[];
  name: string;
  periodicity: PmocPeriodicity;
  startDate: string;
  endDate: string;
  defaultTechnicianId: string;
  defaultOperatorId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  serviceTypes: OperationType[];
  duration: string;
  operationObservations: string;
  generationMode: PmocGenerationMode;
  firstExecution: "NOW" | "NEXT";
  overrideSignature: boolean;
  signatureOverrideId: string;
};
type FormSetter = <K extends keyof Form>(key: K, value: Form[K]) => void;

const initialForm: Form = {
  customerId: "",
  addressId: "",
  equipmentIds: [],
  scopeCatalogIds: [],
  name: "",
  periodicity: "MONTHLY",
  startDate: addMonths(today(), 1),
  endDate: addMonths(today(), 13),
  defaultTechnicianId: "",
  defaultOperatorId: "",
  priority: "HIGH",
  serviceTypes: ["PREVENTIVA"],
  duration: "120",
  operationObservations: "",
  generationMode: "MANUAL",
  firstExecution: "NEXT",
  overrideSignature: false,
  signatureOverrideId: "",
};

const STEPS = ["Identificação", "Cobertura", "Planejamento", "Execução", "Documento", "Confirmação"];

export function PmocPlanWizard({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (pmoc: PmocPlan) => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(initialForm);
  const [nameEdited, setNameEdited] = useState(false);
  const [catalogTick, setCatalogTick] = useState(0);
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
  const nameSuggestion = useQuery(
    (signal) => form.customerId
      ? pmocApi.getNameSuggestion(form.customerId, { signal })
      : Promise.resolve(null),
    [form.customerId],
  );
  const scopes = useQuery(
    (signal) => technicalCatalogsApi.list({
      type: "PLAN_SCOPE",
      workflow: "PMOC",
      includeGeneral: true,
      active: true,
      limit: 100,
      signal,
    }),
    [catalogTick],
  );
  const users = useQuery((signal) => usersApi.listUsers({ limit: 100, signal }), []);
  const signatures = useQuery((signal) => signaturesApi.listSignatures({ limit: 100, active: true, signal }), []);
  const documentConfig = useQuery<DocumentConfiguration>(
    (signal) => documentsApi.getConfigurationByType("PMOC", { signal }),
    [],
  );

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setForm(initialForm);
    setNameEdited(false);
    setError(null);
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (!nameEdited && nameSuggestion.data?.name) {
      setForm((current) => ({ ...current, name: nameSuggestion.data?.name ?? current.name }));
    }
  }, [nameEdited, nameSuggestion.data]);

  const projection = useMemo(() => project(form), [form]);
  const template = documentConfig.data?.defaultTemplate;
  const signatureMode = template?.signatureMode ?? "NONE";
  const configuredSignature = template?.institutionalSignatures?.[0]?.signature ?? template?.signature ?? null;
  const configurationReady = Boolean(documentConfig.data) && !documentConfig.error;

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const validByStep = [
    Boolean(form.customerId && form.name.trim()),
    Boolean(form.equipmentIds.length && form.scopeCatalogIds.length && form.serviceTypes.length),
    Boolean(form.startDate && form.endDate && new Date(form.startDate) <= new Date(form.endDate)),
    Boolean(form.defaultTechnicianId && Number(form.duration) >= 15),
    configurationReady && (!(signatureMode === "FIXED" || signatureMode === "HYBRID") || Boolean(form.overrideSignature ? form.signatureOverrideId : configuredSignature)),
    true,
  ];

  async function submit() {
    if (!validByStep.every(Boolean) || !form.equipmentIds[0]) return;
    setSaving(true);
    setError(null);
    try {
      const pmoc = await pmocApi.createPmoc({
        ...(nameEdited ? { name: form.name } : {}),
        customerId: form.customerId,
        equipmentId: form.equipmentIds[0],
        equipmentIds: form.equipmentIds,
        scopeCatalogIds: form.scopeCatalogIds,
        defaultAddressId: form.addressId || undefined,
        periodicity: form.periodicity,
        generationMode: form.generationMode,
        defaultOperatorId: form.defaultOperatorId || undefined,
        defaultTechnicianId: form.defaultTechnicianId,
        signatureOverrideId: form.overrideSignature ? form.signatureOverrideId || undefined : undefined,
        responsibleTechnician: userName(users.data?.items, form.defaultTechnicianId),
        startDate: form.firstExecution === "NOW" ? today() : form.startDate,
        endDate: form.endDate,
        priority: form.priority,
        defaultOperationType: form.serviceTypes[0],
        serviceTypes: form.serviceTypes,
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
    } finally {
      setSaving(false);
    }
  }

  async function submitOperation(payload: CreateOperationPayload) {
    if (!executionRequestId) throw new Error("A execução programada não foi encontrada.");
    const request = await pmocApi.generateWorkOrder(executionRequestId, payload);
    if (!request.operationId) throw new Error("A OS não foi vinculada à execução.");
    return (await import("@erp/api")).operationApi.getOperation(request.operationId);
  }

  const selectedCustomer = customers.data?.items.find((item) => item.id === form.customerId);
  const selectedScopes = scopes.data?.items.filter((item) => form.scopeCatalogIds.includes(item.id)) ?? [];
  const activeUsers = users.data?.items.filter((item) => item.isActive && item.role !== "VIEWER") ?? [];

  return <>
    <Drawer
      open={open && !operationOpen}
      onClose={onClose}
      eyebrow="PMOC operacional"
      title="Novo plano PMOC"
      width="max-w-5xl"
      footer={<>
        <button className={secondary} onClick={step === 0 ? onClose : () => setStep((value) => value - 1)}>
          {step === 0 ? "Cancelar" : <><ChevronLeft className="h-4 w-4" /> Voltar</>}
        </button>
        {step < STEPS.length - 1
          ? <button className={primary} disabled={!validByStep[step]} onClick={() => setStep((value) => value + 1)}>Continuar <ChevronRight className="h-4 w-4" /></button>
          : <button className={primary} disabled={!validByStep.every(Boolean) || saving} onClick={() => void submit()}>{saving ? "Criando…" : "Criar plano PMOC"}</button>}
      </>}
    >
      <div className="space-y-6">
        <Stepper step={step} onStep={setStep} />
        {error && <Notice tone="danger">{error}</Notice>}
        {documentConfig.error && <Notice tone="danger">Não foi possível consultar a configuração documental. Tente novamente antes de concluir.</Notice>}

        {step === 0 && <IdentificationStep
          form={form}
          customers={customers.data?.items ?? []}
          addresses={customer.data?.addresses ?? []}
          set={set}
          onCustomer={(customerId) => {
            setForm((current) => ({ ...current, customerId, addressId: "", equipmentIds: [], name: "" }));
            setNameEdited(false);
          }}
          onName={(name) => { set("name", name); setNameEdited(true); }}
          suggested={!nameEdited}
        />}
        {step === 1 && <CoverageStep
          form={form}
          set={set}
          equipments={equipments.data?.items ?? []}
          scopes={scopes.data?.items ?? []}
          loadingScopes={scopes.loading}
          refreshScopes={() => setCatalogTick((value) => value + 1)}
        />}
        {step === 2 && <PlanningStep form={form} set={set} projection={projection} />}
        {step === 3 && <ExecutionStep form={form} set={set} users={users.data?.items ?? []} />}
        {step === 4 && <DocumentStep mode={signatureMode} configured={configuredSignature} signatures={signatures.data?.items ?? []} form={form} set={set} />}
        {step === 5 && <SummaryStep
          form={form}
          customerName={selectedCustomer?.tradeName ?? selectedCustomer?.name ?? "—"}
          equipments={equipments.data?.items ?? []}
          scopes={selectedScopes}
          users={activeUsers}
          projection={projection}
          signatureMode={signatureMode}
          signature={form.overrideSignature ? signatures.data?.items.find((item) => item.id === form.signatureOverrideId) ?? null : configuredSignature}
          onEdit={setStep}
        />}
      </div>
    </Drawer>
    <OperationCreationDrawer
      open={operationOpen}
      mode="work-order"
      initialValues={prefill ?? undefined}
      submitOperation={submitOperation}
      submitLabel="Criar primeira Ordem de Serviço"
      contextNotice="A primeira Ordem de Serviço será criada com os dados deste PMOC e ficará disponível para gerenciamento normalmente."
      onClose={() => { setOperationOpen(false); onClose(); }}
    />
  </>;
}

function IdentificationStep({ form, set, customers, addresses, onCustomer, onName, suggested }: {
  form: Form; set: FormSetter; customers: Customer[]; addresses: CustomerAddress[];
  onCustomer: (id: string) => void; onName: (name: string) => void; suggested: boolean;
}) {
  return <Section icon={MapPinned} title="Identificação" text="Identifique o cliente e a unidade atendida.">
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Cliente" required><select value={form.customerId} onChange={(event) => onCustomer(event.target.value)}><option value="">Selecione…</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.tradeName ?? item.name}</option>)}</select></Field>
      <Field label="Endereço" optional><select value={form.addressId} onChange={(event) => set("addressId", event.target.value)} disabled={!form.customerId}><option value="">Endereço principal do cliente</option>{addresses.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.street}, {item.number}</option>)}</select></Field>
      <div className="md:col-span-2"><Field label="Nome do plano" required hint={suggested ? "Sugestão automática — você pode editar." : "Nome personalizado — não será substituído automaticamente."}><input value={form.name} maxLength={140} onChange={(event) => onName(event.target.value)} placeholder="Selecione um cliente para gerar a sugestão" /></Field></div>
    </div>
  </Section>;
}

function CoverageStep({ form, set, equipments, scopes, loadingScopes, refreshScopes }: {
  form: Form; set: FormSetter; equipments: EquipmentSummary[];
  scopes: Array<{ id: string; title: string; description: string | null }>;
  loadingScopes: boolean; refreshScopes: () => void;
}) {
  return <Section icon={ClipboardCheck} title="Cobertura" text="Defina ativos, ambientes e serviços incluídos no plano.">
    <MultiSelect label="Equipamentos cobertos *" value={form.equipmentIds} onChange={(value) => set("equipmentIds", value)} placeholder={form.customerId ? "Selecione um ou mais equipamentos" : "Selecione primeiro o cliente"} emptyMessage="Nenhum equipamento ativo disponível para este cliente." options={equipments.map((item) => ({ value: item.id, label: item.name, description: item.tag ?? item.type }))} />
    <div className="space-y-2">
      <MultiSelect label="Escopo do plano *" value={form.scopeCatalogIds} onChange={(value) => set("scopeCatalogIds", value)} placeholder={loadingScopes ? "Carregando escopos…" : "Selecione uma ou mais áreas"} emptyMessage="Nenhum escopo encontrado. Cadastre um item no Catálogo Técnico." options={scopes.map((item) => ({ value: item.id, label: item.title, description: item.description ?? undefined }))} />
      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted-foreground)]"><span>Use “Outros” quando necessário ou cadastre um escopo reutilizável no Catálogo Técnico.</span><a href="/maintenance-checklists?type=PLAN_SCOPE" target="_blank" rel="noreferrer" className="font-medium text-[var(--color-primary)]">Abrir Catálogo Técnico</a><button type="button" onClick={refreshScopes} className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)]"><RefreshCw className="h-3 w-3" /> Atualizar lista</button></div>
    </div>
    <MultiSelect label="Tipos de serviço *" value={form.serviceTypes} onChange={(value) => set("serviceTypes", value as OperationType[])} placeholder="Selecione um ou mais tipos" options={SERVICE_TYPES} />
  </Section>;
}

function PlanningStep({ form, set, projection }: { form: Form; set: FormSetter; projection: ReturnType<typeof project> }) {
  const modes = [
    { value: "AUTO" as const, label: "Geração automática", description: "As Ordens de Serviço serão criadas conforme a programação." },
    { value: "MANUAL" as const, label: "Geração com revisão", description: "A equipe revisará os dados antes de criar cada Ordem de Serviço." },
    { value: "PAUSED" as const, label: "Programação pausada", description: "O plano será salvo sem novas Ordens de Serviço até ser retomado." },
  ];
  return <Section icon={CalendarClock} title="Planejamento" text="Configure o período e visualize as próximas execuções.">
    <div className="grid gap-4 md:grid-cols-3">
      <Field label="Periodicidade" required><select value={form.periodicity} onChange={(event) => set("periodicity", event.target.value as PmocPeriodicity)}>{PERIODICITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
      <Field label="Primeira execução" required><input type="date" value={form.startDate} onChange={(event) => set("startDate", event.target.value)} /></Field>
      <Field label="Fim da cobertura" required><input type="date" value={form.endDate} min={form.startDate} onChange={(event) => set("endDate", event.target.value)} /></Field>
    </div>
    <div className="grid gap-3 md:grid-cols-3">{modes.map((mode) => <button type="button" key={mode.value} onClick={() => set("generationMode", mode.value)} className={`rounded-[var(--radius-lg)] border p-4 text-left transition ${form.generationMode === mode.value ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]/20" : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"}`}><strong>{mode.label}</strong><span className="mt-1 block text-xs leading-relaxed text-[var(--color-muted-foreground)]">{mode.description}</span></button>)}</div>
    {form.generationMode !== "PAUSED" && <div className="grid gap-3 md:grid-cols-2"><Choice checked={form.firstExecution === "NOW"} onChange={() => set("firstExecution", "NOW")} title="Criar a primeira OS ao concluir" text="Você poderá revisar os dados antes de confirmar." /><Choice checked={form.firstExecution === "NEXT"} onChange={() => set("firstExecution", "NEXT")} title="Iniciar na data programada" text={`A primeira execução ficará prevista para ${formatDate(form.startDate)}.`} /></div>}
    <Projection projection={projection} detailed />
    <Notice tone="neutral">Após criar o plano, cada execução pendente pode ser reagendada individualmente. O número e o histórico permanecem preservados, sem alterar a periodicidade das demais.</Notice>
  </Section>;
}

function ExecutionStep({ form, set, users }: { form: Form; set: FormSetter; users: TeamUser[] }) {
  const active = users.filter((item) => item.isActive && item.role !== "VIEWER");
  return <Section icon={Settings2} title="Execução" text="Defina os responsáveis e os padrões aplicados às futuras Ordens de Serviço.">
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Técnico padrão" required><select value={form.defaultTechnicianId} onChange={(event) => set("defaultTechnicianId", event.target.value)}><option value="">Selecione…</option>{active.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.jobTitle ?? user.role}</option>)}</select></Field>
      <Field label="Operador padrão" optional><select value={form.defaultOperatorId} onChange={(event) => set("defaultOperatorId", event.target.value)}><option value="">Definir ao gerar a OS</option>{active.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}</select></Field>
      <Field label="Prioridade"><select value={form.priority} onChange={(event) => set("priority", event.target.value as Form["priority"])}><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></Field>
      <Field label="Duração prevista" required hint="Em minutos"><input type="number" min={15} max={10080} value={form.duration} onChange={(event) => set("duration", event.target.value)} /></Field>
    </div>
    <Field label="Orientações para as Ordens de Serviço" optional><textarea rows={5} value={form.operationObservations} onChange={(event) => set("operationObservations", event.target.value)} placeholder="Instruções que serão sugeridas em cada execução" /></Field>
  </Section>;
}

function DocumentStep({ mode, configured, signatures, form, set }: { mode: string; configured: Signature | null; signatures: Signature[]; form: Form; set: FormSetter }) {
  const selected = form.overrideSignature ? signatures.find((item) => item.id === form.signatureOverrideId) ?? null : configured;
  return <Section icon={FileSignature} title="Documento" text="A política do modelo oficial determina como o documento PMOC será assinado.">
    {mode === "NONE" && <Notice tone="neutral"><strong>Sem assinatura configurada.</strong><br />O documento será emitido sem bloco de assinatura.</Notice>}
    {mode === "COLLECTED" && <Notice tone="info"><strong>Coleta obrigatória da assinatura do cliente.</strong><br />A assinatura será coletada durante o atendimento em campo.</Notice>}
    {(mode === "FIXED" || mode === "HYBRID") && <div className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Assinatura institucional</p>{selected ? <SignatureCard signature={selected} /> : <Notice tone="danger">O modelo exige assinatura institucional, mas nenhuma assinatura ativa está configurada.</Notice>}</div><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.overrideSignature} onChange={(event) => { set("overrideSignature", event.target.checked); if (!event.target.checked) set("signatureOverrideId", ""); }} /> Alterar assinatura somente deste PMOC</label>{form.overrideSignature && <Field label="Assinatura alternativa" required><select value={form.signatureOverrideId} onChange={(event) => set("signatureOverrideId", event.target.value)}><option value="">Selecione uma assinatura ativa…</option>{signatures.map((signature) => <option key={signature.id} value={signature.id}>{signature.name} · {signature.title}</option>)}</select></Field>}</div>}
    {mode === "HYBRID" && <Notice tone="info"><strong>Assinatura híbrida.</strong><br />O documento utilizará a assinatura institucional exibida e também coletará a assinatura do cliente.</Notice>}
  </Section>;
}

function SummaryStep({ form, customerName, equipments, scopes, users, projection, signatureMode, signature, onEdit }: {
  form: Form; customerName: string; equipments: EquipmentSummary[];
  scopes: Array<{ id: string; title: string }>;
  users: TeamUser[]; projection: ReturnType<typeof project>; signatureMode: string;
  signature: Signature | null; onEdit: (step: number) => void;
}) {
  const equipmentNames = equipments.filter((item) => form.equipmentIds.includes(item.id)).map((item) => item.name);
  return <Section icon={Check} title="Confirmação" text="Revise o plano completo. Você pode voltar diretamente a qualquer seção.">
    <div className="grid gap-4 md:grid-cols-2">
      <SummaryCard title="Identificação" onEdit={() => onEdit(0)} rows={[['Cliente', customerName], ['Plano', form.name], ['Endereço', form.addressId ? 'Endereço selecionado' : 'Endereço principal']]} />
      <SummaryCard title="Cobertura" onEdit={() => onEdit(1)} rows={[['Equipamentos', `${equipmentNames.length} selecionado(s)`], ['Escopo', scopes.map((item) => item.title).join(', ') || '—'], ['Serviços', form.serviceTypes.map(operationTypeLabel).join(', ')]]} />
      <SummaryCard title="Planejamento" onEdit={() => onEdit(2)} rows={[['Periodicidade', periodicityLabel(form.periodicity)], ['Próxima execução', formatDate(projection.next)], ['Execuções previstas', String(projection.count)], ['Programação', generationModeLabel(form.generationMode)]]} />
      <SummaryCard title="Execução" onEdit={() => onEdit(3)} rows={[['Operador padrão', userName(users, form.defaultOperatorId, 'Definido ao gerar')], ['Técnico', userName(users, form.defaultTechnicianId)], ['Duração prevista', `${form.duration} minutos`], ['Prioridade', priorityLabel(form.priority)]]} />
      <div className="md:col-span-2"><SummaryCard title="Política documental" onEdit={() => onEdit(4)} rows={[['Modo', signatureModeLabel(signatureMode)], ['Assinatura institucional', signature?.name ?? (signatureMode === 'NONE' || signatureMode === 'COLLECTED' ? 'Não aplicável' : 'Não configurada')], ['Origem', form.overrideSignature ? 'Definida somente para este PMOC' : 'Modelo oficial do documento']]} /></div>
    </div>
  </Section>;
}

function Section({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children: React.ReactNode }) { return <section className="space-y-5"><div className="flex gap-3 border-b border-[var(--color-border)] pb-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><Icon className="h-5 w-5" /></span><div><h3 className="text-base font-semibold">{title}</h3><p className="text-sm text-[var(--color-muted-foreground)]">{text}</p></div></div>{children}</section>; }
function Field({ label, children, required = false, optional = false, hint }: { label: string; children: React.ReactNode; required?: boolean; optional?: boolean; hint?: string }) { return <label className="grid gap-1.5 text-sm font-medium"><span>{label}{required && <span className="ml-1 text-[var(--color-danger)]">*</span>}{optional && <span className="ml-1 font-normal text-[var(--color-muted-foreground)]">(opcional)</span>}</span>{children}{hint && <span className="text-xs font-normal text-[var(--color-muted-foreground)]">{hint}</span>}</label>; }
function Choice({ checked, onChange, title, text }: { checked: boolean; onChange: () => void; title: string; text: string }) { return <label className={`flex gap-3 rounded-lg border p-3 ${checked ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}><input type="radio" checked={checked} onChange={onChange} /><span><strong className="text-sm">{title}</strong><span className="block text-xs text-[var(--color-muted-foreground)]">{text}</span></span></label>; }
function Notice({ tone, children }: { tone: "danger" | "info" | "neutral"; children: React.ReactNode }) { const color = tone === "danger" ? "border-red-500/30 bg-red-500/10 text-red-700" : tone === "info" ? "border-blue-500/30 bg-blue-500/10 text-blue-700" : "border-[var(--color-border)] bg-[var(--color-muted)]"; return <div className={`rounded-lg border p-3 text-sm ${color}`}>{children}</div>; }
function Projection({ projection, detailed = false }: { projection: ReturnType<typeof project>; detailed?: boolean }) { return <div className="space-y-3 rounded-xl bg-[var(--color-muted)] p-4"><div className="grid gap-3 sm:grid-cols-3"><Metric label="Execuções previstas" value={String(projection.count)} /><Metric label="Período" value={`${projection.months} meses`} /><Metric label="Próxima execução" value={formatDate(projection.next)} /></div>{detailed && <div className="grid gap-2 border-t border-[var(--color-border)] pt-3 sm:grid-cols-2 lg:grid-cols-3">{projection.dates.slice(0, 6).map((date, index) => <div key={`${date}-${index}`} className="rounded-lg bg-[var(--color-card)] p-2 text-sm"><span className="text-xs text-[var(--color-muted-foreground)]">Execução {String(index + 1).padStart(3, '0')}</span><strong className="block">{formatDate(date)}</strong></div>)}{projection.dates.length > 6 && <div className="grid place-items-center rounded-lg border border-dashed border-[var(--color-border)] p-2 text-xs text-[var(--color-muted-foreground)]">+ {projection.dates.length - 6} execuções</div>}</div>}</div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span className="block text-xs text-[var(--color-muted-foreground)]">{label}</span><strong className="text-sm">{value}</strong></div>; }
function SummaryCard({ title, rows, onEdit }: { title: string; rows: Array<[string, string]>; onEdit: () => void }) { return <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"><div className="mb-3 flex items-center justify-between"><h4 className="font-semibold">{title}</h4><button type="button" onClick={onEdit} className="text-xs font-medium text-[var(--color-primary)]">Editar</button></div><dl className="space-y-2">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-[var(--color-border)]/70 pb-2 last:border-0"><dt className="text-xs text-[var(--color-muted-foreground)]">{label}</dt><dd className="max-w-[65%] text-right text-sm font-medium">{value}</dd></div>)}</dl></section>; }
function SignatureCard({ signature }: { signature: Signature }) { const image = useQuery((signal) => signaturesApi.downloadSignatureImage(signature.id, { signal }), [signature.id]); return <div className="mt-3 grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 sm:grid-cols-[120px_1fr] sm:items-center"><div className="grid h-20 place-items-center rounded-md bg-white p-2">{image.data ? <span role="img" aria-label={`Assinatura de ${signature.name}`} className="h-16 w-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url(${JSON.stringify(`data:${image.data.mimeType};base64,${image.data.contentBase64}`)})` }} /> : <span className="text-xs text-[var(--color-muted-foreground)]">Carregando imagem…</span>}</div><div><p className="font-semibold">{signature.name}</p><p className="text-sm text-[var(--color-muted-foreground)]">{signature.title}</p>{signature.professionalCouncil && <p className="text-xs text-[var(--color-muted-foreground)]">{signature.professionalCouncil}</p>}{signature.department && <p className="text-xs text-[var(--color-muted-foreground)]">{signature.department}</p>}<span className="mt-2 inline-flex rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-xs font-medium text-[var(--color-primary)]">Somente leitura</span></div></div>; }
function Stepper({ step, onStep }: { step: number; onStep: (step: number) => void }) { return <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">{STEPS.map((label, index) => <button type="button" key={label} disabled={index > step} onClick={() => onStep(index)} className={`rounded-lg px-2 py-2 text-center text-xs font-medium transition ${index <= step ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"} disabled:cursor-not-allowed`}>{index < step ? <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" />{label}</span> : label}</button>)}</div>; }

function project(form: Form) { const start = new Date(`${form.startDate}T12:00:00`); const end = new Date(`${form.endDate}T12:00:00`); if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return { months: 0, count: 0, next: "", dates: [] as string[] }; const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()); const cadence = PERIODICITIES.find((item) => item.value === form.periodicity)?.months ?? 1; const dates: string[] = []; for (let value = form.firstExecution === "NOW" ? today() : form.startDate, guard = 0; value <= form.endDate && guard < 240; value = addMonths(value, cadence), guard += 1) dates.push(value); return { months, count: dates.length, next: dates[0] ?? form.startDate, dates }; }
function today() { return new Date().toISOString().slice(0, 10); }
function addMonths(value: string, months: number) { const date = new Date(`${value}T12:00:00`); date.setMonth(date.getMonth() + months); return date.toISOString().slice(0, 10); }
function formatDate(value: string) { return value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—"; }
function userName(users: TeamUser[] | undefined, id: string, fallback = "Responsável técnico") { return users?.find((item) => item.id === id)?.name ?? fallback; }
function periodicityLabel(value: string) { return PERIODICITIES.find((item) => item.value === value)?.label ?? value; }
function generationModeLabel(value: PmocGenerationMode) { return ({ AUTO: 'Geração automática', MANUAL: 'Geração com revisão', PAUSED: 'Programação pausada' } as const)[value]; }
function operationTypeLabel(value: OperationType) { return SERVICE_TYPES.find((item) => item.value === value)?.label ?? value; }
function signatureModeLabel(value: string) { return ({ NONE: 'Sem assinatura', FIXED: 'Assinatura institucional', COLLECTED: 'Coleta em campo', HYBRID: 'Assinatura híbrida' } as Record<string, string>)[value] ?? value; }
function priorityLabel(value: Form['priority']) { return ({ LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica' } as const)[value]; }
const primary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50";
const secondary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium";
