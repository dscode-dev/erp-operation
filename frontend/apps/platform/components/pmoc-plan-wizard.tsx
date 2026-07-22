"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileSignature,
  Images,
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
  operationApi,
  signaturesApi,
  technicalCatalogsApi,
  usersApi,
  useQuery,
  type CreateOperationPayload,
  type Customer,
  type CustomerAddress,
  type DocumentConfiguration,
  type DocumentHandoff,
  type EquipmentSummary,
  type OperationDetail,
  type OperationPhoto,
  type OperationType,
  type PmocGenerationMode,
  type PmocActiveCoverageResult,
  type PmocPeriodicity,
  type PmocPlan,
  type Signature,
  type TeamUser,
} from "@erp/api";
import { Drawer } from "@erp/ui/drawer";
import { ConfirmDialog } from "@erp/ui/confirm-dialog";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { SignaturePad } from "@erp/ui/documents/signature-pad";
import { MultiSelect } from "@erp/ui/multi-select";
import { PhotoInput, type CapturedPhoto } from "@erp/ui/photo-input";
import { CustomerSignaturePreview } from "@erp/ui/documents/customer-signature-preview";
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
  checklistCatalogIds: string[];
  includeChecklistInOperations: boolean;
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
  checklistCatalogIds: [],
  includeChecklistInOperations: true,
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

const STEPS = ["Identificação", "Cobertura", "Planejamento", "Execução", "Evidências", "Documento", "Confirmação"];

export function PmocPlanWizard({ open, onClose, onCreated, pmoc = null, onUpdated, initialReviewSection = "signatures", editMode = false }: {
  open: boolean;
  onClose: () => void;
  onCreated: (pmoc: PmocPlan) => void;
  pmoc?: PmocPlan | null;
  onUpdated?: (pmoc: PmocPlan) => void;
  initialReviewSection?: "signatures" | "evidence";
  editMode?: boolean;
}) {
  const editing = Boolean(pmoc) && editMode;
  const reviewing = Boolean(pmoc) && !editing;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(initialForm);
  const [nameEdited, setNameEdited] = useState(false);
  const [catalogTick, setCatalogTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationOpen, setOperationOpen] = useState(false);
  const [executionRequestId, setExecutionRequestId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<CreateOperationPayload | null>(null);
  const [handoff, setHandoff] = useState<DocumentHandoff | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [signatureBusy, setSignatureBusy] = useState(false);
  const [signatureFeedback, setSignatureFeedback] = useState<string | null>(null);
  const [previewRevision, setPreviewRevision] = useState(0);
  const [draftPhotos, setDraftPhotos] = useState<CapturedPhoto[]>([]);
  const [coverageConfirmation, setCoverageConfirmation] = useState<PmocActiveCoverageResult | null>(null);

  const reviewRequest = pmoc?.executionRequests?.find((item) => item.operation) ?? null;
  const reviewOperationId = reviewRequest?.operation?.id ?? null;
  const reviewDocumentId = reviewRequest?.operation?.documents?.[0]?.id ?? null;

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
  const activeCoverage = useQuery<PmocActiveCoverageResult | null>(
    (signal) => !editing && !reviewing && form.customerId
      ? pmocApi.getActiveCoverage(form.customerId, { signal })
      : Promise.resolve(null),
    [editing, reviewing, form.customerId],
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
  const workOrderChecklists = useQuery(
    (signal) => technicalCatalogsApi.listChecklistItems("WORK_ORDER", { signal }),
    [catalogTick],
  );
  const users = useQuery((signal) => usersApi.listUsers({ limit: 100, signal }), []);
  const signatures = useQuery((signal) => signaturesApi.listSignatures({ limit: 100, active: true, signal }), []);
  const documentConfig = useQuery<DocumentConfiguration>(
    (signal) => documentsApi.getConfigurationByType("PMOC", { signal }),
    [],
  );
  const reviewOperation = useQuery<OperationDetail | null>(
    (signal) => reviewOperationId
      ? operationApi.getOperation(reviewOperationId, { signal })
      : Promise.resolve(null),
    [reviewOperationId],
  );
  const reviewHandoff = useQuery<DocumentHandoff | null>(
    (signal) => reviewDocumentId ? documentsApi.getHandoff(reviewDocumentId, { signal }) : Promise.resolve(null),
    [reviewDocumentId],
  );

  useEffect(() => {
    if (!open) return;
    setStep(reviewing ? (initialReviewSection === "evidence" ? 4 : 5) : 0);
    setForm(pmoc ? {
      ...initialForm,
      customerId: pmoc.customerId,
      addressId: pmoc.defaultAddressId ?? "",
      equipmentIds: pmoc.equipments?.map((item) => item.equipmentId) ?? [pmoc.equipmentId],
      scopeCatalogIds: pmoc.scopes?.map((item) => item.technicalCatalogId) ?? [],
      checklistCatalogIds: pmoc.checklists?.map((item) => item.technicalCatalogId) ?? [],
      includeChecklistInOperations: Boolean(
        pmoc.checklists?.length && pmoc.includeChecklistInOperations,
      ),
      name: pmoc.maintenancePlan?.name ?? "",
      periodicity: pmoc.periodicity,
      startDate: pmoc.startDate.slice(0, 10),
      endDate: pmoc.endDate.slice(0, 10),
      defaultTechnicianId: pmoc.defaultTechnicianId ?? "",
      defaultOperatorId: pmoc.defaultOperatorId ?? "",
      serviceTypes: pmoc.serviceTypes,
      duration: String(pmoc.defaultEstimatedDurationMinutes ?? 120),
      operationObservations: pmoc.defaultOperationObservations ?? "",
      generationMode: pmoc.generationMode,
      overrideSignature: Boolean(pmoc.signatureOverrideId),
      signatureOverrideId: pmoc.signatureOverrideId ?? "",
    } : initialForm);
    setNameEdited(false);
    setError(null);
    setSaving(false);
    setHandoff(reviewHandoff.data ?? null);
    setSignatureData(null);
    setSignerName("");
    setSignerRole("");
    setCaptureOpen(false);
    setSelectorOpen(false);
    setSignatureFeedback(null);
    setDraftPhotos([]);
    setCoverageConfirmation(null);
  }, [initialReviewSection, open, pmoc, reviewHandoff.data, reviewing]);

  useEffect(() => {
    const items = workOrderChecklists.data ?? [];
    if (!open || pmoc || !items.length) return;
    setForm((current) =>
      current.checklistCatalogIds.length
        ? current
        : {
            ...current,
            checklistCatalogIds: items.map((item) => item.id),
          },
    );
  }, [open, pmoc, workOrderChecklists.data]);

  useEffect(() => {
    if (reviewHandoff.data) setHandoff(reviewHandoff.data);
  }, [reviewHandoff.data]);

  useEffect(() => {
    if (!editing && !nameEdited && nameSuggestion.data?.name) {
      setForm((current) => ({ ...current, name: nameSuggestion.data?.name ?? current.name }));
    }
  }, [editing, nameEdited, nameSuggestion.data]);

  const projection = useMemo(() => project(form), [form]);
  const template = documentConfig.data?.defaultTemplate;
  const signatureMode = template?.signatureMode ?? null;
  const configuredSignature = template?.institutionalSignatures?.[0]?.signature ?? template?.signature ?? null;
  const configurationReady = Boolean(documentConfig.data) && !documentConfig.error;

  useEffect(() => {
    if (!open || reviewing || editing || !signatures.data?.items.length || form.signatureOverrideId) return;
    if (signatureMode !== "FIXED" && signatureMode !== "HYBRID") return;
    const preferred = signatures.data.items.find((item) => item.isDefault) ?? configuredSignature;
    if (preferred) {
      setForm((current) => ({ ...current, overrideSignature: true, signatureOverrideId: preferred.id }));
    }
  }, [configuredSignature, editing, form.signatureOverrideId, open, reviewing, signatureMode, signatures.data?.items]);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function ensureHandoff() {
    if (handoff) return handoff;
    if (reviewHandoff.data) return reviewHandoff.data;
    if (!reviewOperationId) throw new Error("A primeira Ordem de Serviço precisa ser criada antes da coleta de assinatura.");
    const created = await documentsApi.saveHandoffDraft(reviewOperationId, "PMOC");
    setHandoff(created);
    return created;
  }

  async function collectSignature() {
    if (!signatureData || !signerName.trim()) return;
    if (!reviewOperationId) {
      setCaptureOpen(false);
      setSignatureFeedback("Assinatura preparada. Ela será registrada com a primeira Ordem de Serviço deste PMOC.");
      setForm((current) => ({ ...current, firstExecution: "NOW" }));
      return;
    }
    setSignatureBusy(true);
    setSignatureFeedback(null);
    try {
      const current = await ensureHandoff();
      const updated = await documentsApi.collectCustomerSignature(current.id, {
        signerName: signerName.trim(),
        signerRole: signerRole.trim() || undefined,
        signatureData,
        collectedAt: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setHandoff(updated);
      setSignatureData(null);
      setCaptureOpen(false);
      setPreviewRevision((value) => value + 1);
      setSignatureFeedback(current.customerSignature ? "Assinatura do cliente substituída e registrada." : "Assinatura do cliente coletada e registrada.");
    } catch (cause) {
      setSignatureFeedback(cause instanceof ApiClientError ? cause.message : cause instanceof Error ? cause.message : "Não foi possível registrar a assinatura.");
    } finally {
      setSignatureBusy(false);
    }
  }

  async function changeTechnicalSignature(signatureId: string) {
    set("overrideSignature", true);
    set("signatureOverrideId", signatureId);
    setSignatureBusy(true);
    setSignatureFeedback(null);
    try {
      if (pmoc) {
        const updatedPlan = await pmocApi.updatePmoc(pmoc.id, { signatureOverrideId: signatureId });
        onUpdated?.(updatedPlan);
        if (reviewOperationId) {
          const current = await ensureHandoff();
          setHandoff(await documentsApi.selectHandoffTechnicalSignature(current.id, signatureId));
        }
      }
      setSelectorOpen(false);
      setPreviewRevision((value) => value + 1);
      setSignatureFeedback("Assinatura técnica atualizada somente para este PMOC.");
    } catch (cause) {
      setSignatureFeedback(cause instanceof ApiClientError ? cause.message : "Não foi possível alterar a assinatura técnica.");
    } finally {
      setSignatureBusy(false);
    }
  }

  const validByStep = [
    Boolean(form.customerId && form.name.trim()),
    Boolean(form.equipmentIds.length && form.scopeCatalogIds.length && form.serviceTypes.length),
    Boolean(form.startDate && form.endDate && new Date(form.startDate) <= new Date(form.endDate)),
    Boolean(
      form.defaultTechnicianId &&
        Number(form.duration) >= 15 &&
        (!form.includeChecklistInOperations || form.checklistCatalogIds.length > 0),
    ),
    true,
    configurationReady && (!(signatureMode === "FIXED" || signatureMode === "HYBRID") || Boolean(form.overrideSignature ? form.signatureOverrideId : configuredSignature)),
    true,
  ];

  async function submit(confirmActiveCoverage = false) {
    if (!validByStep.every(Boolean) || !form.equipmentIds[0]) return;
    if (!confirmActiveCoverage && activeCoverage.data?.hasActiveCoverage) {
      setCoverageConfirmation(activeCoverage.data);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const pmoc = await pmocApi.createPmoc({
        ...(nameEdited ? { name: form.name } : {}),
        customerId: form.customerId,
        confirmActiveCoverage: confirmActiveCoverage || undefined,
        equipmentId: form.equipmentIds[0],
        equipmentIds: form.equipmentIds,
        scopeCatalogIds: form.scopeCatalogIds,
        checklistCatalogIds: form.checklistCatalogIds,
        includeChecklistInOperations: form.includeChecklistInOperations,
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
      if (
        cause instanceof ApiClientError &&
        cause.code === "PMOC_ACTIVE_COVERAGE_CONFIRMATION_REQUIRED"
      ) {
        const conflicts = Array.isArray(cause.details.conflicts)
          ? cause.details.conflicts as PmocActiveCoverageResult["conflicts"]
          : [];
        setCoverageConfirmation({
          hasActiveCoverage: true,
          checkedAt: new Date().toISOString(),
          conflicts,
        });
        return;
      }
      setError(cause instanceof ApiClientError ? cause.message : "Não foi possível criar o PMOC.");
    } finally {
      setSaving(false);
    }
  }

  async function saveChanges() {
    if (!pmoc || !validByStep.every(Boolean) || !form.equipmentIds[0]) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await pmocApi.updatePmoc(pmoc.id, {
        name: form.name.trim(),
        equipmentIds: form.equipmentIds,
        scopeCatalogIds: form.scopeCatalogIds,
        checklistCatalogIds: form.checklistCatalogIds,
        includeChecklistInOperations: form.includeChecklistInOperations,
        defaultAddressId: form.addressId || null,
        periodicity: form.periodicity,
        generationMode: form.generationMode,
        defaultOperatorId: form.defaultOperatorId || null,
        defaultTechnicianId: form.defaultTechnicianId || null,
        signatureOverrideId: form.overrideSignature ? form.signatureOverrideId || null : null,
        responsibleTechnician: userName(users.data?.items, form.defaultTechnicianId),
        startDate: form.startDate,
        endDate: form.endDate,
        priority: form.priority,
        defaultOperationType: form.serviceTypes[0],
        serviceTypes: form.serviceTypes,
        defaultEstimatedDurationMinutes: Number(form.duration),
        defaultOperationObservations: form.operationObservations || null,
      });
      onUpdated?.(updated);
      onClose();
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : "Não foi possível atualizar o PMOC.");
    } finally {
      setSaving(false);
    }
  }

  async function submitOperation(payload: CreateOperationPayload) {
    if (!executionRequestId) throw new Error("A execução programada não foi encontrada.");
    const request = await pmocApi.generateWorkOrder(executionRequestId, payload);
    if (!request.operationId) throw new Error("A OS não foi vinculada à execução.");
    if (draftPhotos.length) {
      await operationApi.updateOperation(request.operationId, {
        photos: await Promise.all(draftPhotos.map(async (photo) => ({
          dataUrl: await evidenceFileDataUrl(photo.file),
          caption: photo.caption?.trim() || null,
        }))),
      });
      draftPhotos.forEach((photo) => URL.revokeObjectURL(photo.url));
      setDraftPhotos([]);
    }
    if (signatureData && signerName.trim()) {
      let document = await documentsApi.saveHandoffDraft(request.operationId, "PMOC");
      document = await documentsApi.collectCustomerSignature(document.id, {
        signerName: signerName.trim(),
        signerRole: signerRole.trim() || undefined,
        signatureData,
        collectedAt: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (form.signatureOverrideId) {
        await documentsApi.selectHandoffTechnicalSignature(document.id, form.signatureOverrideId);
      }
      setSignatureData(null);
    }
    return operationApi.getOperation(request.operationId);
  }

  const selectedCustomer = customers.data?.items.find((item) => item.id === form.customerId);
  const selectedScopes = scopes.data?.items.filter((item) => form.scopeCatalogIds.includes(item.id)) ?? [];
  const activeUsers = users.data?.items.filter((item) => item.isActive && item.role !== "VIEWER") ?? [];

  return <>
    <Drawer
      open={open && !operationOpen}
      onClose={onClose}
      eyebrow="PMOC operacional"
      title={reviewing ? (initialReviewSection === "evidence" ? "Revisar evidências do PMOC" : "Revisar assinaturas do PMOC") : editing ? "Editar plano PMOC" : "Novo plano PMOC"}
      width="max-w-5xl"
      footer={reviewing ? <button className={secondary} onClick={onClose}>Fechar</button> : <>
        <button className={secondary} onClick={step === 0 ? onClose : () => setStep((value) => value - 1)}>
          {step === 0 ? "Cancelar" : <><ChevronLeft className="h-4 w-4" /> Voltar</>}
        </button>
        {step < STEPS.length - 1
          ? <button className={primary} disabled={!validByStep[step]} onClick={() => setStep((value) => value + 1)}>Continuar <ChevronRight className="h-4 w-4" /></button>
          : <button className={primary} disabled={!validByStep.every(Boolean) || saving} onClick={() => void (editing ? saveChanges() : submit())}>{saving ? "Salvando…" : editing ? "Salvar alterações" : "Criar plano PMOC"}</button>}
      </>}
    >
      <div className="space-y-6">
        {!reviewing && <Stepper step={step} onStep={setStep} />}
        {error && <Notice tone="danger">{error}</Notice>}
        {documentConfig.error && <Notice tone="danger">Não foi possível consultar a configuração documental. Tente novamente antes de concluir.</Notice>}
        {!editing && activeCoverage.data?.hasActiveCoverage && (
          <Notice tone="warning">
            <strong>Este cliente já possui cobertura PMOC ativa.</strong><br />
            {activeCoverage.data.conflicts.map(activeCoverageLabel).join("; ")}. Você poderá revisar
            os dados e confirmar conscientemente a criação de um novo plano na última etapa.
          </Notice>
        )}

        {step === 0 && <IdentificationStep
          form={form}
          customers={customers.data?.items ?? []}
          addresses={customer.data?.addresses ?? []}
          set={set}
          onCustomer={(customerId) => {
            if (editing) return;
            setCoverageConfirmation(null);
            setForm((current) => ({ ...current, customerId, addressId: "", equipmentIds: [], name: "" }));
            setNameEdited(false);
          }}
          onName={(name) => { set("name", name); setNameEdited(true); }}
          suggested={!nameEdited}
          customerLocked={editing}
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
        {step === 3 && <ExecutionStep
          form={form}
          set={set}
          users={users.data?.items ?? []}
          checklistItems={workOrderChecklists.data ?? []}
          loadingChecklist={workOrderChecklists.loading}
          refreshChecklist={() => setCatalogTick((value) => value + 1)}
        />}
        {step === 4 && <EvidenceStep
          operation={reviewOperation.data}
          operationId={reviewOperationId}
          documentId={reviewDocumentId}
          reviewing={reviewing || editing}
          draftPhotos={draftPhotos}
          onDraftPhotos={(photos) => {
            setDraftPhotos(photos);
            if (photos.length) set("firstExecution", "NOW");
          }}
          previewRevision={previewRevision}
          onChanged={() => { reviewOperation.refetch(); setPreviewRevision((value) => value + 1); }}
        />}
        {step === 5 && <DocumentStep
          mode={signatureMode}
          configured={configuredSignature}
          signatures={signatures.data?.items ?? []}
          form={form}
          set={set}
          loading={documentConfig.loading || reviewHandoff.loading || reviewOperation.loading}
          error={documentConfig.error ?? reviewHandoff.error ?? reviewOperation.error}
          reviewing={reviewing || editing || !pmoc}
          technicianName={userName(users.data?.items, form.defaultTechnicianId)}
          handoff={handoff}
          operation={reviewOperation.data}
          documentId={handoff?.id ?? reviewDocumentId}
          operationId={reviewOperationId}
          captureOpen={captureOpen}
          selectorOpen={selectorOpen}
          signatureData={signatureData}
          signerName={signerName}
          signerRole={signerRole}
          busy={signatureBusy}
          feedback={signatureFeedback}
          previewRevision={previewRevision}
          onCaptureOpen={setCaptureOpen}
          onSelectorOpen={setSelectorOpen}
          onSignatureData={setSignatureData}
          onSignerName={setSignerName}
          onSignerRole={setSignerRole}
          onCollect={() => void collectSignature()}
          onTechnicalSignature={(id) => void changeTechnicalSignature(id)}
        />}
        {step === 6 && <SummaryStep
          form={form}
          customerName={selectedCustomer?.tradeName ?? selectedCustomer?.name ?? "—"}
          equipments={equipments.data?.items ?? []}
          scopes={selectedScopes}
          users={activeUsers}
          projection={projection}
          signatureMode={signatureMode ?? "NONE"}
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
    <ConfirmDialog
      open={Boolean(coverageConfirmation)}
      title="Este cliente já possui PMOC ativo"
      confirmLabel="Criar mesmo assim"
      cancelLabel="Revisar cadastro"
      description={coverageConfirmation ? <div className="space-y-2">
        <p>Existe cobertura vigente para este cliente:</p>
        <ul className="list-disc space-y-1 pl-5">
          {coverageConfirmation.conflicts.map((item) => <li key={item.id}>{activeCoverageLabel(item)}</li>)}
        </ul>
        <p>Deseja realmente continuar e criar outro PMOC?</p>
      </div> : undefined}
      onClose={() => setCoverageConfirmation(null)}
      onConfirm={() => submit(true)}
    />
  </>;
}

function IdentificationStep({ form, set, customers, addresses, onCustomer, onName, suggested, customerLocked }: {
  form: Form; set: FormSetter; customers: Customer[]; addresses: CustomerAddress[];
  onCustomer: (id: string) => void; onName: (name: string) => void; suggested: boolean; customerLocked?: boolean;
}) {
  return <Section icon={MapPinned} title="Identificação" text="Identifique o cliente e a unidade atendida.">
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Cliente" required><select value={form.customerId} onChange={(event) => onCustomer(event.target.value)} disabled={customerLocked}><option value="">Selecione…</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.tradeName ?? item.name}</option>)}</select></Field>
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

function ExecutionStep({ form, set, users, checklistItems, loadingChecklist, refreshChecklist }: {
  form: Form;
  set: FormSetter;
  users: TeamUser[];
  checklistItems: Array<{ id: string; title: string; description: string | null }>;
  loadingChecklist: boolean;
  refreshChecklist: () => void;
}) {
  const active = users.filter((item) => item.isActive && item.role !== "VIEWER");
  return <Section icon={Settings2} title="Execução" text="Defina os responsáveis e os padrões aplicados às futuras Ordens de Serviço.">
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Técnico padrão" required><select value={form.defaultTechnicianId} onChange={(event) => set("defaultTechnicianId", event.target.value)}><option value="">Selecione…</option>{active.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.jobTitle ?? user.role}</option>)}</select></Field>
      <Field label="Operador padrão" optional><select value={form.defaultOperatorId} onChange={(event) => set("defaultOperatorId", event.target.value)}><option value="">Definir ao gerar a OS</option>{active.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}</select></Field>
      <Field label="Prioridade"><select value={form.priority} onChange={(event) => set("priority", event.target.value as Form["priority"])}><option value="LOW">Baixa</option><option value="MEDIUM">Média</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></Field>
      <Field label="Duração prevista" required hint="Em minutos"><input type="number" min={15} max={10080} value={form.duration} onChange={(event) => set("duration", event.target.value)} /></Field>
    </div>
    <Field label="Orientações para as Ordens de Serviço" optional><textarea rows={5} value={form.operationObservations} onChange={(event) => set("operationObservations", event.target.value)} placeholder="Instruções que serão sugeridas em cada execução" /></Field>
    <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold">Checklist das Ordens de Serviço</h4>
          <p className="text-sm text-[var(--color-muted-foreground)]">Selecione itens do mesmo Catálogo Técnico utilizado pelas Ordens de Serviço.</p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.includeChecklistInOperations} onChange={(event) => set("includeChecklistInOperations", event.target.checked)} />
          Enviar checklist nas execuções
        </label>
      </div>
      {form.includeChecklistInOperations && <>
        <MultiSelect
          label="Itens predefinidos *"
          value={form.checklistCatalogIds}
          onChange={(value) => set("checklistCatalogIds", value)}
          options={checklistItems.map((item) => ({ value: item.id, label: item.title, description: item.description ?? undefined }))}
          placeholder={loadingChecklist ? "Carregando checklist…" : "Selecionar itens"}
          emptyMessage="Nenhum item ativo disponível para Ordem de Serviço."
        />
        <div className="flex flex-wrap gap-3 text-xs text-[var(--color-muted-foreground)]">
          <span>A OS recebe um snapshot desses itens ao ser gerada.</span>
          <a href="/maintenance-checklists?type=CHECKLIST" target="_blank" rel="noreferrer" className="font-medium text-[var(--color-primary)]">Abrir Catálogo Técnico</a>
          <button type="button" onClick={refreshChecklist} className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)]"><RefreshCw className="h-3 w-3" /> Atualizar lista</button>
        </div>
      </>}
      {!form.includeChecklistInOperations && <Notice tone="neutral">As Ordens de Serviço deste PMOC serão geradas sem checklist predefinido. O histórico do plano permanece inalterado.</Notice>}
    </section>
  </Section>;
}

function EvidenceStep({ operation, operationId, documentId, reviewing, draftPhotos, onDraftPhotos, previewRevision, onChanged }: {
  operation: OperationDetail | null;
  operationId: string | null;
  documentId: string | null;
  reviewing: boolean;
  draftPhotos: CapturedPhoto[];
  onDraftPhotos: (photos: CapturedPhoto[]) => void;
  previewRevision: number;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState<CapturedPhoto[]>([]);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<OperationPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operation?.photos.length) { setSources({}); setCaptions({}); return; }
    let active = true;
    setCaptions(Object.fromEntries(operation.photos.map((photo) => [photo.id, photo.caption ?? ""])));
    operation.photos.forEach((photo) => {
      operationApi.getOperationPhoto(photo.id).then((content) => {
        if (active) setSources((current) => ({ ...current, [photo.id]: `data:${content.mimeType};base64,${content.contentBase64}` }));
      }).catch(() => undefined);
    });
    return () => { active = false; };
  }, [operation]);

  async function upload() {
    if (!operationId || pending.length === 0) return;
    setBusy(true); setError(null); setFeedback(null); setProgress(10);
    setPending((current) => current.map((photo) => ({ ...photo, status: "saving" })));
    try {
      const photos = await Promise.all(pending.map(async (photo) => ({ dataUrl: await evidenceFileDataUrl(photo.file), caption: photo.caption?.trim() || null })));
      setProgress(45);
      await operationApi.updateOperation(operationId, { photos });
      setProgress(100);
      pending.forEach((photo) => URL.revokeObjectURL(photo.url));
      setPending([]);
      setFeedback(`${photos.length} evidência(s) adicionada(s). O preview oficial foi atualizado.`);
      onChanged();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível adicionar as evidências.";
      setPending((current) => current.map((photo) => ({ ...photo, status: "error", error: message })));
      setError(message);
    } finally { setBusy(false); setTimeout(() => setProgress(0), 800); }
  }

  async function saveCaption(photo: OperationPhoto) {
    setBusy(true); setError(null); setFeedback(null);
    try {
      await operationApi.updateOperationPhoto(photo.id, captions[photo.id] ?? "");
      setEditing(null);
      setFeedback("Legenda atualizada. O preview oficial já utiliza o novo texto.");
      onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a legenda."); }
    finally { setBusy(false); }
  }

  async function removePhoto() {
    if (!removing) return;
    setBusy(true); setError(null); setFeedback(null);
    try {
      await operationApi.deleteOperationPhoto(removing.id);
      setSources((current) => { const next = { ...current }; delete next[removing.id]; return next; });
      setFeedback("Evidência removida com auditoria. O preview oficial foi atualizado.");
      setRemoving(null);
      onChanged();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível remover a evidência."); }
    finally { setBusy(false); }
  }

  return <Section icon={Images} title="Evidências fotográficas" text="Revise as imagens da execução e complemente o documento quando necessário.">
    {!operationId && <div className="space-y-4">
      <Notice tone="info"><strong>As evidências serão vinculadas à primeira execução.</strong><br />Ao adicionar fotos agora, a primeira Ordem de Serviço será preparada ao concluir o cadastro. O plano PMOC não armazena imagens em paralelo.</Notice>
      <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div><h4 className="font-semibold">Adicionar fotos</h4><p className="text-sm text-[var(--color-muted-foreground)]">Selecione ou arraste imagens PNG/JPEG. Você poderá revisar as miniaturas e legendas antes de criar o plano.</p></div>
        <PhotoInput photos={draftPhotos} onChange={onDraftPhotos} max={16} existingCount={0} requiredMinimum={4} />
      </section>
    </div>}
    {operationId && <div className="space-y-5">
      {!operation?.photos.length && <Notice tone="neutral"><strong>Nenhuma evidência cadastrada.</strong><br />Adicione imagens PNG ou JPEG utilizando o uploader oficial.</Notice>}
      {Boolean(operation?.photos.length) && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{operation?.photos.map((photo, index) => <article key={photo.id} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)]">
        <div className="relative aspect-square bg-white">{sources[photo.id] ? <Image src={sources[photo.id]} alt={photo.caption || `Evidência ${index + 1}`} fill unoptimized sizes="240px" className="object-contain" /> : <div className="grid h-full place-items-center text-xs text-[var(--color-muted-foreground)]">Carregando miniatura…</div>}<span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-xs text-white">{index + 1}</span></div>
        <div className="space-y-3 p-3">
          {editing === photo.id ? <div className="space-y-2"><input value={captions[photo.id] ?? ""} maxLength={255} onChange={(event) => setCaptions((current) => ({ ...current, [photo.id]: event.target.value }))} className="h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-2 text-sm" placeholder="Legenda da evidência" autoFocus /><div className="flex gap-2"><button type="button" className={smallButton} disabled={busy} onClick={() => void saveCaption(photo)}>Salvar</button><button type="button" className={smallButton} onClick={() => { setEditing(null); setCaptions((current) => ({ ...current, [photo.id]: photo.caption ?? "" })); }}>Cancelar</button></div></div> : <><p className="min-h-10 text-sm font-medium">{photo.caption || "Sem legenda"}</p><div className="space-y-1 text-xs text-[var(--color-muted-foreground)]"><p>{photo.createdBy?.name ?? operation.operator?.name ?? "Responsável não identificado"}</p><p>{new Date(photo.createdAt).toLocaleDateString("pt-BR")} · {new Date(photo.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p></div><div className="flex gap-2"><button type="button" className={smallButton} onClick={() => setEditing(photo.id)}>Editar legenda</button><button type="button" className={`${smallButton} text-red-600`} onClick={() => setRemoving(photo)}>Remover</button></div></>}
        </div>
      </article>)}</div>}
      {reviewing && <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"><div><h4 className="font-semibold">Adicionar fotos</h4><p className="text-sm text-[var(--color-muted-foreground)]">Arraste imagens ou selecione vários arquivos. Revise as miniaturas e legendas antes do envio.</p></div><PhotoInput photos={pending} onChange={setPending} max={16} existingCount={operation?.photos.length ?? 0} requiredMinimum={4} disabled={busy} />{progress > 0 && <div className="space-y-1"><div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted)]"><div className="h-full bg-[var(--color-primary)] transition-all" style={{ width: `${progress}%` }} /></div><p className="text-xs text-[var(--color-muted-foreground)]">Enviando evidências · {progress}%</p></div>}<button type="button" className={primary} disabled={!pending.length || busy} onClick={() => void upload()}>{busy ? "Enviando…" : `Enviar ${pending.length || ""} foto(s)`}</button></section>}
      {error && <Notice tone="danger">{error}</Notice>}{feedback && <Notice tone="info">{feedback}</Notice>}
      {reviewing && <section className="space-y-3"><div><h4 className="font-semibold">Preview do documento</h4><p className="text-sm text-[var(--color-muted-foreground)]">Esta é a mesma coleção, ordem e legenda resolvida pelo DocumentContext para Preview e PDF.</p></div><DocumentViewer key={`evidence-${documentId ?? operationId}-${previewRevision}`} source={{ operationId, type: "PMOC", documentId }} canRender={false} canDownload={false} title="Preview das evidências do PMOC" /></section>}
    </div>}
    <ConfirmDialog open={Boolean(removing)} title="Remover esta evidência?" danger confirmLabel="Remover evidência" description="A imagem deixará o documento atual. A ação será registrada em auditoria e PDFs emitidos ficarão desatualizados." onClose={() => setRemoving(null)} onConfirm={() => void removePhoto()} />
  </Section>;
}

function DocumentStep({
  mode, configured, signatures, form, set, loading, error, reviewing, handoff, operation,
  documentId, operationId, technicianName, captureOpen, selectorOpen, signatureData, signerName, signerRole,
  busy, feedback, previewRevision, onCaptureOpen, onSelectorOpen, onSignatureData,
  onSignerName, onSignerRole, onCollect, onTechnicalSignature,
}: {
  mode: string | null; configured: Signature | null; signatures: Signature[]; form: Form; set: FormSetter;
  loading: boolean; error: Error | null; reviewing: boolean; handoff: DocumentHandoff | null;
  operation: OperationDetail | null; documentId: string | null; operationId: string | null;
  technicianName: string;
  captureOpen: boolean; selectorOpen: boolean; signatureData: string | null; signerName: string;
  signerRole: string; busy: boolean; feedback: string | null; previewRevision: number;
  onCaptureOpen: (value: boolean) => void; onSelectorOpen: (value: boolean) => void;
  onSignatureData: (value: string | null) => void; onSignerName: (value: string) => void;
  onSignerRole: (value: string) => void; onCollect: () => void; onTechnicalSignature: (id: string) => void;
}) {
  const selected = form.overrideSignature ? signatures.find((item) => item.id === form.signatureOverrideId) ?? null : configured;
  const customerRequired = mode === "COLLECTED" || mode === "HYBRID";
  const technicalRequired = mode === "FIXED" || mode === "HYBRID";
  const collectedAt = handoff?.customerSignature?.collectedAt ? new Date(handoff.customerSignature.collectedAt) : null;
  const collectedBy = handoff?.customerSignature?.collectedBy ?? handoff?.collectedBy ?? null;
  const operator = operation?.operator ?? handoff?.operation?.operator ?? null;
  return <Section icon={FileSignature} title="Assinaturas" text="Revise exatamente as assinaturas que farão parte do documento final.">
    {loading && <Notice tone="neutral"><strong>Consultando a política do modelo PMOC…</strong></Notice>}
    {error && <Notice tone="danger"><strong>Não foi possível consultar a política do documento.</strong><br />Tente novamente antes de concluir o cadastro.</Notice>}
    {!loading && !error && !mode && <Notice tone="danger"><strong>Nenhum modelo PMOC ativo foi encontrado.</strong></Notice>}
    {mode === "NONE" && <Notice tone="neutral"><strong>Sem assinatura configurada.</strong><br />O documento será emitido sem bloco de assinatura.</Notice>}
    {customerRequired && <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Assinatura do cliente</p><h4 className="mt-1 font-semibold">{handoff?.customerSignature ? "✓ Assinatura coletada" : signatureData ? "✓ Assinatura preparada" : "Nenhuma assinatura coletada."}</h4></div>{reviewing && <button type="button" className={secondary} onClick={() => onCaptureOpen(!captureOpen)}>{handoff?.customerSignature || signatureData ? "Substituir assinatura" : "Coletar assinatura"}</button>}</div>
      {handoff?.customerSignature && documentId && <>
        <CustomerSignaturePreview documentId={documentId} name={handoff.customerSignature.name} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Readonly label="Nome do cliente" value={handoff.customerSignature.name} />
          <Readonly label="Data da coleta" value={collectedAt?.toLocaleDateString("pt-BR") ?? "—"} />
          <Readonly label="Hora" value={collectedAt?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "—"} />
          <Readonly label="Coletada por" value={collectedBy ? `${collectedBy.name} (${roleLabel(collectedBy.role)})` : "—"} />
        </div>
      </>}
      {!handoff?.customerSignature && signatureData && <div className="grid gap-3 sm:grid-cols-2"><Readonly label="Nome do cliente" value={signerName} /><Readonly label="Persistência" value={operationId ? "Aguardando confirmação" : "Será vinculada à primeira Ordem de Serviço"} /></div>}
      {!handoff?.customerSignature && !reviewing && <Notice tone="info">A coleta ficará disponível após a criação da primeira Ordem de Serviço.</Notice>}
      {reviewing && captureOpen && <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-4">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Nome do cliente" required><input value={signerName} maxLength={120} onChange={(event) => onSignerName(event.target.value)} /></Field><Field label="Função" optional><input value={signerRole} maxLength={80} onChange={(event) => onSignerRole(event.target.value)} placeholder="Ex.: responsável pela unidade" /></Field></div>
        <SignaturePad onChange={onSignatureData} />
        <div className="flex justify-end"><button type="button" className={primary} disabled={!signatureData || !signerName.trim() || busy} onClick={onCollect}>{busy ? "Salvando…" : handoff?.customerSignature ? "Confirmar substituição" : "Confirmar assinatura"}</button></div>
      </div>}
      <Readonly label="Operador responsável" value={operator?.name ?? "Ainda não definido"} />
    </section>}
    <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Responsável técnico</p><h4 className="mt-1 font-semibold">Assinatura atualmente selecionada</h4></div>{technicalRequired && <button type="button" className={secondary} onClick={() => onSelectorOpen(!selectorOpen)}>Alterar assinatura técnica</button>}</div>
      <Readonly label="Técnico responsável pelo PMOC" value={technicianName || "Ainda não definido"} />
      {technicalRequired ? (selected ? <SignatureCard signature={selected} /> : <Notice tone="danger">O modelo exige assinatura institucional, mas nenhuma assinatura ativa está configurada.</Notice>) : <Notice tone="neutral">A política atual do modelo não insere assinatura técnica no documento. O responsável técnico permanece identificado no PMOC.</Notice>}
      {technicalRequired && selectorOpen && <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3"><p className="text-sm font-medium">Assinaturas ativas da organização</p>{signatures.length ? <div className="grid gap-3 md:grid-cols-2">{signatures.map((signature) => <button type="button" key={signature.id} disabled={busy} onClick={() => onTechnicalSignature(signature.id)} className={`rounded-lg border p-1 text-left transition hover:border-[var(--color-primary)] ${selected?.id === signature.id ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20" : "border-transparent"}`}><SignatureCard signature={signature} />{signature.isDefault && <span className="mb-2 ml-3 inline-flex rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700">Assinatura padrão</span>}</button>)}</div> : <Notice tone="danger">Nenhuma assinatura ativa está disponível.</Notice>}</div>}
      {!reviewing && <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={form.overrideSignature} onChange={(event) => { set("overrideSignature", event.target.checked); if (!event.target.checked) set("signatureOverrideId", ""); }} /> Utilizar esta assinatura somente neste PMOC</label>}
    </section>
    {feedback && <Notice tone={feedback.startsWith("Não") ? "danger" : "info"}>{feedback}</Notice>}
    {reviewing && operationId && <section className="space-y-3"><div><h4 className="font-semibold">Preview do documento</h4><p className="text-sm text-[var(--color-muted-foreground)]">O preview oficial é atualizado após cada alteração, sem modificar documentos históricos já emitidos.</p></div><DocumentViewer key={`${documentId ?? operationId}-${previewRevision}`} source={{ operationId, type: "PMOC", documentId }} canRender={false} canDownload={false} title="Preview das assinaturas do PMOC" /></section>}
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
      <SummaryCard title="Execução" onEdit={() => onEdit(3)} rows={[['Operador padrão', userName(users, form.defaultOperatorId, 'Definido ao gerar')], ['Técnico', userName(users, form.defaultTechnicianId)], ['Duração prevista', `${form.duration} minutos`], ['Prioridade', priorityLabel(form.priority)], ['Checklist na OS', form.includeChecklistInOperations ? `${form.checklistCatalogIds.length} item(ns)` : 'Não enviar']]} />
      <div className="md:col-span-2"><SummaryCard title="Política documental" onEdit={() => onEdit(5)} rows={[['Modo', signatureModeLabel(signatureMode)], ['Assinatura institucional', signature?.name ?? (signatureMode === 'NONE' || signatureMode === 'COLLECTED' ? 'Não aplicável' : 'Não configurada')], ['Origem', form.overrideSignature ? 'Definida somente para este PMOC' : 'Modelo oficial do documento']]} /></div>
    </div>
  </Section>;
}

function Section({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children: React.ReactNode }) { return <section className="space-y-5"><div className="flex gap-3 border-b border-[var(--color-border)] pb-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><Icon className="h-5 w-5" /></span><div><h3 className="text-base font-semibold">{title}</h3><p className="text-sm text-[var(--color-muted-foreground)]">{text}</p></div></div>{children}</section>; }
function Field({ label, children, required = false, optional = false, hint }: { label: string; children: React.ReactNode; required?: boolean; optional?: boolean; hint?: string }) { return <label className="grid gap-1.5 text-sm font-medium"><span>{label}{required && <span className="ml-1 text-[var(--color-danger)]">*</span>}{optional && <span className="ml-1 font-normal text-[var(--color-muted-foreground)]">(opcional)</span>}</span>{children}{hint && <span className="text-xs font-normal text-[var(--color-muted-foreground)]">{hint}</span>}</label>; }
function Readonly({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3"><span className="block text-xs text-[var(--color-muted-foreground)]">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>; }
function Choice({ checked, onChange, title, text }: { checked: boolean; onChange: () => void; title: string; text: string }) { return <label className={`flex gap-3 rounded-lg border p-3 ${checked ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}><input type="radio" checked={checked} onChange={onChange} /><span><strong className="text-sm">{title}</strong><span className="block text-xs text-[var(--color-muted-foreground)]">{text}</span></span></label>; }
function Notice({ tone, children }: { tone: "danger" | "info" | "neutral" | "warning"; children: React.ReactNode }) { const color = tone === "danger" ? "border-red-500/30 bg-red-500/10 text-red-700" : tone === "warning" ? "border-amber-500/30 bg-amber-500/10 text-amber-800" : tone === "info" ? "border-blue-500/30 bg-blue-500/10 text-blue-700" : "border-[var(--color-border)] bg-[var(--color-muted)]"; return <div className={`rounded-lg border p-3 text-sm ${color}`}>{children}</div>; }
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
function roleLabel(value: string) { return ({ OWNER: "Owner", MANAGER: "Manager", OPERATOR: "Operator", VIEWER: "Viewer" } as Record<string, string>)[value] ?? value; }
function activeCoverageLabel(item: PmocActiveCoverageResult["conflicts"][number]) { return `PMOC-${String(item.number).padStart(6, "0")} · ${item.name} · cobertura até ${new Date(item.endDate).toLocaleDateString("pt-BR")}`; }
function evidenceFileDataUrl(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Não foi possível ler a imagem.")); reader.readAsDataURL(file); }); }
const primary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50";
const secondary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium";
const smallButton = "inline-flex h-8 items-center rounded-md border border-[var(--color-border)] px-2 text-xs font-medium hover:bg-[var(--color-muted)] disabled:opacity-50";
