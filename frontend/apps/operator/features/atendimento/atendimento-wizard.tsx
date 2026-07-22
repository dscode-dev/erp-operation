'use client';

/**
 * AtendimentoWizard — the full field-service flow:
 * Cliente → Escopo → Execução → Checklist → Conteúdo → Evidências →
 * Assinatura → Confirmação.
 *
 * Reads clients/equipments from the real backend and persists the complete
 * Operation → Assignment → Handoff flow through the official APIs.
 */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Building2,
  MapPin,
  Wrench,
  ClipboardList,
  Check,
  CheckCircle2,
  Camera,
  PenLine,
  FileText,
  Send,
  ChevronRight,
  Circle,
  QrCode,
  X,
  FileSearch,
} from 'lucide-react';
import { WizardProgressHeader } from '@erp/ui/wizard/progress-header';
import { WizardFooter } from '@erp/ui/wizard/step-footer';
import { SearchInput } from '@erp/ui/search-input';
import { StatusChip } from '@erp/ui/status-chip';
import { StatusPill } from '@erp/ui/status-pill';
import { SkeletonList } from '@erp/ui/skeletons';
import { EmptyState } from '@erp/ui/empty-state';
import { ErrorState } from '@erp/ui/states';
import { MultiSelect } from '@erp/ui/multi-select';
import { PhotoInput, type CapturedPhoto } from '@erp/ui/photo-input';
import { SignaturePad } from '@erp/ui/documents/signature-pad';
import { TechnicalCatalogSelector } from '@erp/ui/technical-catalog/technical-catalog-selector';
import { QrScanner } from '@erp/ui/qr-scanner';
import {
  customersApi,
  assignmentsApi,
  equipmentsApi,
  pmocApi,
  technicalCatalogsApi,
  useQuery,
  ApiClientError,
  type Customer,
  type CustomerDetail,
  type EquipmentSummary,
  type EquipmentDetail,
  type TechnicalCatalog,
  type TechnicalCatalogArea,
  type DocumentKind,
  type OperationMaintenanceChecklistItem,
  type OperationMaintenanceType,
  type PmocPlan,
  type PmocExecutionRequest,
} from '@erp/api';
import { DOCUMENT_KIND_LABEL } from '@erp/types';
import { useAuth } from '@erp/ui/auth/auth-provider';
import { EQUIPMENT_STATUS_LABEL, EQUIPMENT_STATUS_PILL } from '@platform/equipment-display';
import { useDebounce } from '@erp/utils';
import { SERVICE_TYPES, serviceTypeLabel, type ServiceTypeKey } from '../../lib/service-types';
import { createOperationFromDraft, workOrderNumber } from '../../lib/atendimento';
import { OperatorSignatureChoice } from '../../components/operator-signature';

const STEPS = [
  'Cliente',
  'Escopo',
  'Execução',
  'Checklist',
  'Conteúdo',
  'Evidências',
  'Assinatura',
  'Confirmar',
] as const;

const FIELD_DOCUMENT_TYPES: DocumentKind[] = [
  'WORK_ORDER',
  'TECHNICAL_REPORT',
];
type ChecklistItem = { catalogId: string; label: string; done: boolean; note?: string };
const RVT_MAINTENANCE_TYPES: Array<{ value: OperationMaintenanceType; label: string }> = [
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'SEMIANNUAL', label: 'Semestral' },
];

export function AtendimentoWizard({
  initialCustomerId,
  initialEquipmentId,
}: {
  initialCustomerId?: string;
  initialEquipmentId?: string;
} = {}) {
  const router = useRouter();
  const [documentType, setDocumentType] = useState<DocumentKind | null>(null);
  const [step, setStep] = useState(0);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [address, setAddress] = useState<{ id: string; label: string } | null>(null);
  const [equipments, setEquipments] = useState<EquipmentSummary[]>([]);
  const [serviceType, setServiceType] = useState<ServiceTypeKey | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [maintenanceType, setMaintenanceType] = useState<OperationMaintenanceType>('SEMIANNUAL');
  const [maintenanceChecklist, setMaintenanceChecklist] = useState<OperationMaintenanceChecklistItem[]>([]);
  const [reportedIssue, setReportedIssue] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [observations, setObservations] = useState('');
  const [objectives, setObjectives] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [conclusions, setConclusions] = useState<string[]>([]);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState('');
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [technicalSignatureId, setTechnicalSignatureId] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ operationId: string; documentNumber: string; documentType: DocumentKind } | null>(
    null,
  );
  const [startedAt] = useState(() => new Date().toISOString());

  // Prefill from QR / "Iniciar atendimento" deep links.
  useEffect(() => {
    let active = true;
    (async () => {
      if (initialEquipmentId) {
        const eq = await equipmentsApi.getEquipment(initialEquipmentId).catch(() => null);
        if (!active || !eq) return;
        setEquipments([eq]);
        if (eq.address)
          setAddress({
            id: eq.address.id,
            label: eq.address.name ?? eq.address.city ?? 'Endereço',
          });
        if (eq.customer) {
          const c = await customersApi.getCustomer(eq.customer.id).catch(() => null);
          if (active && c) {
            setCustomer(c);
            setStep(2); // pula para Execução
          }
        }
      } else if (initialCustomerId) {
        const c = await customersApi.getCustomer(initialCustomerId).catch(() => null);
        if (active && c) {
          setCustomer(c);
          setStep(0); // mantém Cliente para escolher o endereço
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [initialEquipmentId, initialCustomerId]);

  function pickServiceType(key: ServiceTypeKey) {
    setServiceType(key);
  }

  // Checklist real de Catálogos Técnicos (type CHECKLIST) para o documento em
  // andamento — substitui o checklist mock por tipo de serviço.
  const checklistCatalog = useQuery(
    (signal) =>
      documentType === 'WORK_ORDER'
        ? technicalCatalogsApi.listChecklistItems(technicalCatalogsApi.documentWorkflow(documentType), { signal })
        : Promise.resolve([]),
    [documentType],
  );
  const rvtChecklistCatalog = useQuery(
    async (signal) =>
      documentType === 'TECHNICAL_REPORT'
        ? (
            await Promise.all(
              RVT_MAINTENANCE_TYPES.map((item) =>
                technicalCatalogsApi.listChecklistItems('TECHNICAL_REPORT', {
                  maintenanceType: item.value,
                  signal,
                }),
              ),
            )
          ).flat()
        : [],
    [documentType],
  );
  useEffect(() => {
    if (documentType !== 'TECHNICAL_REPORT' || rvtChecklistCatalog.loading) return;
    setMaintenanceChecklist((current) => {
      if (current.length) return current;
      return (rvtChecklistCatalog.data ?? []).map((item) => ({
        maintenanceType: item.maintenanceType ?? 'SEMIANNUAL',
        description: item.title,
        executed: false,
        result: 'NO',
        observations: item.description,
      }));
    });
  }, [documentType, rvtChecklistCatalog.data, rvtChecklistCatalog.loading]);

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return !!customer;
      case 1:
        return true; // equipamento opcional
      case 2:
        return !!serviceType;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      case 6:
        return !!technicalSignatureId && !!signature && signerName.trim().length > 0;
      case 7:
        return true;
      default:
        return false;
    }
  }, [step, customer, serviceType, signature, signerName, technicalSignatureId]);

  function back() {
    if (step === 0) router.push('/operator');
    else setStep((s) => s - 1);
  }

  async function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // Resumo → cria a Operation real (gera a OS em rascunho no backend).
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (!documentType) return;
      const submission = await createOperationFromDraft({
        documentType,
        customerId: customer?.id ?? null,
        addressId: address?.id ?? null,
        equipmentId: equipments[0]?.id ?? null,
        inspectedEquipments: equipments.map((item) => ({
          equipmentId: item.id,
          sector: item.address?.name ?? address?.label ?? item.name,
        })),
        serviceType,
        checklist,
        maintenanceType,
        maintenanceChecklist,
        reportedIssue,
        serviceDescription,
        observations,
        objective: objectives,
        conditions,
        recommendations,
        conclusion: conclusions,
        photos,
        signature,
        signerName,
        signerRole,
        signedAt,
        technicalSignatureId,
        startedAt,
      });
      setResult({
        operationId: submission.operation.id,
        documentNumber: submission.handoff.number ?? workOrderNumber(submission.operation) ?? `OP-${submission.operation.number}`,
        documentType,
      });
    } catch (err) {
      setSubmitError(
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível registrar o atendimento. Tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <SuccessView
        documentNumber={result.documentNumber}
        documentType={result.documentType}
        onDone={() => router.push('/operator')}
        onDocuments={() => router.push('/operator/documents')}
        onNew={() => window.location.reload()}
      />
    );
  }

  if (!documentType) {
    return <AttendanceTypeStep onSelect={setDocumentType} onClose={() => router.push('/operator')} />;
  }

  // Compatibilidade de rota/estado antigo: PMOC não é mais oferecido para
  // início autônomo, mas um estado já aberto continua direcionado ao fluxo oficial.
  if (documentType === 'PMOC') {
    return <PmocStartStep onBack={() => setDocumentType(null)} />;
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="flex flex-col min-h-dvh">
      <WizardProgressHeader
        title={`${DOCUMENT_KIND_LABEL[documentType]} · ${STEPS[step]}`}
        current={step}
        total={STEPS.length}
        onBack={back}
        onClose={() => router.push('/operator')}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {step === 0 && (
          <div className="space-y-5">
            <ClienteStep
              selected={customer}
              onSelect={(c) => {
                setCustomer(c);
                setAddress(null);
                setEquipments([]);
              }}
            />
            {customer && (
              <section className="space-y-2 border-t border-[var(--color-border)] pt-4">
                <h2 className="text-sm font-semibold">Local do atendimento</h2>
                <EnderecoStep customerId={customer.id} selected={address} onSelect={setAddress} />
              </section>
            )}
          </div>
        )}
        {step === 1 && customer && (
          <EquipamentoStep
            customerId={customer.id}
            selected={equipments}
            onChange={setEquipments}
            onScanSelect={(eq) => {
              setEquipments((current) =>
                current.some((item) => item.id === eq.id) ? current : [...current, eq],
              );
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm">
              <span className="block text-caption">Documento</span>
              <strong>{DOCUMENT_KIND_LABEL[documentType]}</strong>
              <span className="mt-1 block text-caption">O atendimento será executado por você e iniciado agora.</span>
            </div>
            <TipoStep selected={serviceType} onSelect={pickServiceType} />
          </div>
        )}
        {step === 3 && (
          documentType === 'TECHNICAL_REPORT' ? (
            <RvtMaintenanceChecklistStep
              maintenanceType={maintenanceType}
              onMaintenanceType={setMaintenanceType}
              items={maintenanceChecklist}
              loading={rvtChecklistCatalog.loading}
              onToggle={(index) => setMaintenanceChecklist((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, executed: !item.executed, result: item.executed ? 'NO' : 'YES' } : item))}
            />
          ) : (
            <ChecklistStep
              catalog={checklistCatalog.data ?? []}
              selected={checklist}
              loading={checklistCatalog.loading}
              onChange={setChecklist}
            />
          )
        )}
        {step === 4 && (
          <NotesStep
            documentType={documentType}
            reportedIssue={reportedIssue}
            onReportedIssue={setReportedIssue}
            serviceDescription={serviceDescription}
            onServiceDescription={setServiceDescription}
            observations={observations}
            onObservations={setObservations}
            objectives={objectives}
            onObjectivesChange={setObjectives}
            conditions={conditions}
            onConditionsChange={setConditions}
            recommendations={recommendations}
            onRecommendationsChange={setRecommendations}
            conclusions={conclusions}
            onConclusionsChange={setConclusions}
            areas={technicalCatalogAreas(equipments)}
          />
        )}
        {step === 5 && <FotosStep photos={photos} onChange={setPhotos} />}
        {step === 6 && (
          <div className="space-y-5">
            <OperatorSignatureChoice selectedId={technicalSignatureId} onSelect={setTechnicalSignatureId} />
            <ResumoStep
              customer={customer}
              address={address}
              equipments={equipments}
              serviceType={serviceType}
              checklist={checklist}
              maintenanceType={maintenanceType}
              maintenanceChecklist={maintenanceChecklist}
              reportedIssue={reportedIssue}
              serviceDescription={serviceDescription}
              observations={observations}
              photoCount={photos.length}
              signed={false}
              documentType={documentType}
              variant="signature"
              showSignature={false}
            />
            <AssinaturaStep signerName={signerName} signerRole={signerRole} signedAt={signedAt} onSignerName={setSignerName} onSignerRole={setSignerRole} onChange={(value) => { setSignature(value); setSignedAt(value ? new Date().toISOString() : null); }} />
          </div>
        )}
        {step === 7 && (
          <ResumoStep
            customer={customer}
            address={address}
            equipments={equipments}
            serviceType={serviceType}
            checklist={checklist}
            maintenanceType={maintenanceType}
            maintenanceChecklist={maintenanceChecklist}
            reportedIssue={reportedIssue}
            serviceDescription={serviceDescription}
            observations={observations}
            photoCount={photos.length}
            signed={!!signature}
            signerName={signerName}
            signerRole={signerRole}
            signedAt={signedAt}
            technicalSignatureSelected={Boolean(technicalSignatureId)}
            documentType={documentType}
            variant="confirmation"
          />
        )}
        {submitError && (
          <p className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
            {submitError}
          </p>
        )}
      </div>

      <WizardFooter
        onBack={back}
        onNext={next}
        nextLabel={isLast ? 'Concluir e gerar PDF' : 'Continuar'}
        nextDisabled={!canNext}
        loading={submitting}
        isLast={isLast}
        nextIcon={isLast ? <Send className="h-4 w-4" /> : undefined}
      />
    </div>
  );
}

/* ---------- Steps ---------- */

function AttendanceTypeStep({ onSelect, onClose }: { onSelect: (type: DocumentKind) => void; onClose: () => void }) {
  return (
    <div className="min-h-dvh px-4 py-5">
      <div className="mx-auto max-w-lg space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-caption uppercase tracking-wider">Nova atividade</p>
            <h1 className="text-[22px] font-semibold tracking-tight">O que você vai realizar?</h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Você pode iniciar uma Ordem de Serviço ou Visita Técnica mesmo sem atribuição. Ao concluir, o PDF oficial será gerado.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)]"><X className="h-4 w-4" /></button>
        </header>

        <div className="space-y-2">
          {FIELD_DOCUMENT_TYPES.map((type) => (
            <button key={type} type="button" onClick={() => onSelect(type)} className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-left active:scale-[0.99]">
              <span className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><FileText className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold">{DOCUMENT_KIND_LABEL[type]}</span><span className="block text-xs text-[var(--color-muted-foreground)]">Registrar uma nova atividade de campo</span></span>
              <ChevronRight className="h-5 w-5 text-[var(--color-muted-foreground)]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PmocStartStep({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { session } = useAuth();
  const [planId, setPlanId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plans = useQuery((signal) => pmocApi.listPmoc({ active: true, limit: 100, signal }), []);
  const requests = useQuery(
    (signal) => planId
      ? pmocApi.listExecutionRequests(planId, { status: 'PENDING', limit: 100, signal })
      : Promise.resolve({ items: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } }),
    [planId],
  );
  const eligible = (requests.data?.items ?? []).filter((request) => !request.plannedOperatorId || request.plannedOperatorId === session?.user.id);

  async function claim(request: PmocExecutionRequest, allowEarly = false) {
    setBusy(request.id);
    setError(null);
    try {
      const prefill = await pmocApi.getExecutionRequestPrefill(request.id);
      const generated = await pmocApi.generateWorkOrder(
        request.id,
        { ...prefill, documentType: 'PMOC', operatorId: undefined },
        { allowEarly },
      );
      const operationId = generated.operationId ?? generated.generatedOperationId;
      if (!operationId) throw new Error('A execução foi reservada, mas o atendimento não foi localizado.');
      const assignments = await assignmentsApi.listMyAssignments({ operationId, limit: 1 });
      const assignment = assignments.items[0];
      if (!assignment) throw new Error('O atendimento PMOC foi criado, mas ainda não está disponível na sua fila.');
      router.push(`/operator/services/${assignment.id}`);
    } catch (cause) {
      // Adiantamento: confirma e refaz com allowEarly (registra na plataforma).
      if (cause instanceof ApiClientError && cause.code === 'PMOC_EXECUTION_TOO_EARLY') {
        setBusy(null);
        if (window.confirm(`${cause.message}\n\nDeseja registrar o adiantamento e continuar?`)) {
          void claim(request, true);
        }
        return;
      }
      setError(cause instanceof Error ? cause.message : 'Não foi possível iniciar esta execução PMOC.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-dvh px-4 py-5">
      <div className="mx-auto max-w-lg space-y-5">
        <header className="flex items-start gap-3"><button type="button" onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-border)]"><ChevronRight className="h-4 w-4 rotate-180" /></button><div><p className="text-caption uppercase tracking-wider">Nova atividade</p><h1 className="text-[22px] font-semibold">Iniciar execução PMOC</h1><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Selecione um plano e assuma uma execução disponível. O atendimento seguirá a cadeia oficial do PMOC.</p></div></header>
        {plans.loading && !plans.data ? <SkeletonList rows={4} /> : plans.error && !plans.data ? <ErrorState error={plans.error} onRetry={plans.refetch} /> : (
          <label className="block space-y-1 text-sm"><span className="font-medium">Plano PMOC</span><select className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-3" value={planId} onChange={(event) => setPlanId(event.target.value)}><option value="">Selecione um plano ativo</option>{(plans.data?.items ?? []).map((plan: PmocPlan) => <option key={plan.id} value={plan.id}>PMOC-{String(plan.number).padStart(6, '0')} · {plan.customer?.name ?? plan.maintenancePlan?.name ?? 'Plano PMOC'}</option>)}</select></label>
        )}
        {error && <p className="rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]">{error}</p>}
        {planId && (requests.loading && !requests.data ? <SkeletonList rows={3} /> : eligible.length === 0 ? <EmptyState icon={FileSearch} title="Nenhuma execução disponível" description="As próximas atividades aparecerão aqui conforme a programação do PMOC." /> : <div className="space-y-2">{eligible.map((request) => <button key={request.id} type="button" disabled={Boolean(busy)} onClick={() => void claim(request)} className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-left disabled:opacity-60"><span><span className="block font-semibold">Execução {String(request.executionNumber).padStart(3, '0')}</span><span className="block text-xs text-[var(--color-muted-foreground)]">Prevista para {new Date(request.scheduledFor).toLocaleDateString('pt-BR')}</span></span>{busy === request.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}</button>)}</div>)}
      </div>
    </div>
  );
}

function ClienteStep({
  selected,
  onSelect,
}: {
  selected: Customer | null;
  onSelect: (c: Customer) => void;
}) {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const list = useQuery(
    (signal) => customersApi.listCustomers({ limit: 12, search: debounced || undefined, signal }),
    [debounced],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Busque por nome, telefone ou CNPJ.
      </p>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar cliente…"
        className="w-full"
      />
      {list.loading && !list.data ? (
        <SkeletonList rows={5} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : list.data && list.data.items.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhum cliente" description="Ajuste a busca." />
      ) : (
        <ul className="space-y-2">
          {(list.data?.items ?? []).map((c) => (
            <li key={c.id}>
              <PickRow
                active={selected?.id === c.id}
                onClick={() => onSelect(c)}
                icon={<Building2 className="h-4 w-4" />}
                title={c.name}
                subtitle={c.cnpj ?? c.cpf ?? c.phone ?? '—'}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EnderecoStep({
  customerId,
  selected,
  onSelect,
}: {
  customerId: string;
  selected: { id: string; label: string } | null;
  onSelect: (a: { id: string; label: string }) => void;
}) {
  const detail = useQuery<CustomerDetail>(
    (signal) => customersApi.getCustomer(customerId, { signal }),
    [customerId],
  );
  if (detail.loading && !detail.data) return <SkeletonList rows={3} />;
  if (detail.error && !detail.data)
    return <ErrorState error={detail.error} onRetry={detail.refetch} />;
  const addresses = detail.data?.addresses ?? [];
  if (addresses.length === 0)
    return (
      <EmptyState
        icon={MapPin}
        title="Sem endereços"
        description="Este cliente não possui endereços cadastrados."
      />
    );
  return (
    <ul className="space-y-2">
      {addresses.map((a) => {
        const label =
          [a.street, a.number, a.district, a.city].filter(Boolean).join(', ') ||
          a.name ||
          'Endereço';
        return (
          <li key={a.id}>
            <PickRow
              active={selected?.id === a.id}
              onClick={() => onSelect({ id: a.id, label })}
              icon={<MapPin className="h-4 w-4" />}
              title={a.name ?? 'Endereço'}
              subtitle={label}
              badge={a.isPrimary ? 'Principal' : undefined}
            />
          </li>
        );
      })}
    </ul>
  );
}

function EquipamentoStep({
  customerId,
  selected,
  onChange,
  onScanSelect,
}: {
  customerId: string;
  selected: EquipmentSummary[];
  onChange: (equipments: EquipmentSummary[]) => void;
  onScanSelect: (e: EquipmentSummary) => void;
}) {
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search, 300);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<EquipmentDetail | null>(null);
  const list = useQuery(
    (signal) =>
      equipmentsApi.listEquipments({
        customerId,
        limit: 100,
        search: debounced || undefined,
        signal,
      }),
    [customerId, debounced],
  );

  async function handleScan(text: string) {
    setScanOpen(false);
    setScanning(true);
    setScanError(null);
    try {
      const eq = await equipmentsApi.lookupByQr(text.trim());
      setScanned(eq);
    } catch (err) {
      setScanError(
        err instanceof ApiClientError && err.code === 'EQUIPMENT_NOT_FOUND'
          ? 'Nenhum equipamento encontrado para este QR Code.'
          : err instanceof ApiClientError && err.status === 400
            ? 'QR Code inválido.'
            : 'Não foi possível ler o QR Code. Tente novamente.',
      );
    } finally {
      setScanning(false);
    }
  }

  // After scan + confirm, equipment is auto-selected and the wizard advances.
  if (scanned) {
    return (
      <ScannedEquipmentCard
        equipment={scanned}
        onConfirm={() => onScanSelect(scanned)}
        onCancel={() => setScanned(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => {
          setScanError(null);
          setScanOpen(true);
        }}
        disabled={scanning}
        className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] h-12 text-sm font-semibold active:scale-[0.99] disabled:opacity-60"
      >
        {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-5 w-5" />}
        Escanear QR Code
      </button>
      {scanError && (
        <p className="text-[12px] text-[var(--color-danger)] text-center">{scanError}</p>
      )}

      <div className="flex items-center gap-2 text-caption">
        <span className="h-px flex-1 bg-[var(--color-border)]" /> ou busque{' '}
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar equipamento…"
        className="w-full"
      />
      <p className="text-caption">
        Selecione todos os equipamentos atendidos. Nenhum seletor adicional será aberto.
      </p>

      <QrScanner open={scanOpen} onClose={() => setScanOpen(false)} onResult={handleScan} />

      {list.loading && !list.data ? (
        <SkeletonList rows={4} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : (list.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={Wrench} title="Nenhum equipamento" />
      ) : (
        <ul className="space-y-2">
          {(list.data?.items ?? []).map((e) => (
            <li key={e.id}>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    selected.some((item) => item.id === e.id)
                      ? selected.filter((item) => item.id !== e.id)
                      : [...selected, e],
                  )
                }
                className={`flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-3.5 text-left active:scale-[0.99] ${selected.some((item) => item.id === e.id) ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded border ${selected.some((item) => item.id === e.id) ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : 'border-[var(--color-border)]'}`}
                >
                  {selected.some((item) => item.id === e.id) && <Check className="h-4 w-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{e.name}</strong>
                  <span className="block truncate text-caption">
                    {`${e.tag ?? '—'} · ${e.manufacturer ?? ''} ${e.model ?? ''}`.trim()}
                  </span>
                </span>
                {e.status === 'MAINTENANCE' && <StatusChip tone="warning">Manutenção</StatusChip>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ScannedEquipmentCard({
  equipment,
  onConfirm,
  onCancel,
}: {
  equipment: EquipmentDetail;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    const att = equipment.attachments?.find((a) => a.category === 'PHOTO');
    if (!att) return;
    let active = true;
    equipmentsApi
      .getEquipmentAttachment(att.id)
      .then((c) => {
        if (active) setPhoto(`data:${c.mimeType};base64,${c.contentBase64}`);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [equipment]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-[var(--color-success)]">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> Equipamento lido com sucesso
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={equipment.name} className="h-40 w-full object-cover" />
        )}
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-section-title leading-tight">{equipment.name}</h2>
            <StatusPill
              status={EQUIPMENT_STATUS_PILL[equipment.status]}
              label={EQUIPMENT_STATUS_LABEL[equipment.status]}
            />
          </div>
          <Row label="Cliente" value={equipment.customer?.name} />
          <Row label="Endereço" value={equipment.address?.name ?? equipment.address?.city} />
          <Row label="Patrimônio" value={equipment.tag} />
          <Row label="Nº de série" value={equipment.serialNumber} />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 h-12 text-sm font-medium hover:bg-[var(--color-muted)]"
        >
          <X className="h-4 w-4" /> Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] h-12 text-sm font-semibold active:scale-[0.99]"
        >
          <Check className="h-4 w-4" /> Confirmar e continuar
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 border-b last:border-0 border-[var(--color-border)]/60">
      <span className="text-caption">{label}</span>
      <span className="text-sm text-right">{value || '—'}</span>
    </div>
  );
}

function TipoStep({
  selected,
  onSelect,
}: {
  selected: ServiceTypeKey | null;
  onSelect: (k: ServiceTypeKey) => void;
}) {
  return (
    <div className="space-y-2">
      {SERVICE_TYPES.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onSelect(t.key)}
          className={`w-full text-left rounded-[var(--radius-md)] border p-4 transition active:scale-[0.99] ${selected === t.key ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{t.label}</span>
            {selected === t.key && <Check className="h-4 w-4 text-[var(--color-primary)]" />}
          </div>
          <p className="text-caption mt-0.5">{t.description}</p>
        </button>
      ))}
    </div>
  );
}

function ChecklistStep({
  catalog,
  selected,
  loading,
  onChange,
}: {
  catalog: TechnicalCatalog[];
  selected: ChecklistItem[];
  loading?: boolean;
  onChange: (items: ChecklistItem[]) => void;
}) {
  if (loading) return <SkeletonList rows={5} />;
  if (catalog.length === 0)
    return (
      <EmptyState
        icon={ClipboardList}
        title="Sem checklist para este documento"
        description="Nenhum item de checklist está cadastrado em Catálogos Técnicos para este tipo de atendimento. Você pode seguir para a próxima etapa."
      />
    );

  const selectedIds = selected.map((item) => item.catalogId);

  function select(catalogIds: string[]) {
    const current = new Map(selected.map((item) => [item.catalogId, item]));
    onChange(
      catalogIds.flatMap((catalogId) => {
        const item = catalog.find((candidate) => candidate.id === catalogId);
        if (!item) return [];
        return [
          current.get(catalogId) ?? {
            catalogId: item.id,
            label: item.title,
            note: item.description ?? undefined,
            // No atendimento iniciado pelo próprio operador, selecionar significa
            // declarar que a atividade já foi executada.
            done: true,
          },
        ];
      }),
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Checklist executado</h2>
        <p className="mt-1 text-caption">
          Etapa opcional. Selecione apenas as atividades que você realizou neste atendimento. Os
          itens escolhidos serão registrados como concluídos na Ordem de Serviço.
        </p>
      </div>
      <MultiSelect
        label="Itens predefinidos"
        options={catalog.map((item) => ({
          value: item.id,
          label: item.title,
          description: item.description ?? undefined,
        }))}
        value={selectedIds}
        onChange={select}
        placeholder="Selecionar atividades realizadas"
        emptyMessage="Nenhum item correspondente foi encontrado."
      />
      {selected.length > 0 && (
        <ul className="space-y-2" aria-label="Atividades selecionadas e concluídas">
          {selected.map((item) => (
            <li
              key={item.catalogId}
              className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-3.5"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" />
              <span className="text-sm">
                <span className="block font-medium">{item.label}</span>
                <span className="text-caption">Atividade realizada</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {selected.length === 0 && (
        <p className="rounded-[var(--radius-md)] bg-[var(--color-muted)] px-3 py-2 text-caption">
          Nenhum item selecionado. Você pode continuar sem adicionar checklist.
        </p>
      )}
    </div>
  );
}

function RvtMaintenanceChecklistStep({
  maintenanceType,
  onMaintenanceType,
  items,
  loading,
  onToggle,
}: {
  maintenanceType: OperationMaintenanceType;
  onMaintenanceType: (value: OperationMaintenanceType) => void;
  items: OperationMaintenanceChecklistItem[];
  loading: boolean;
  onToggle: (index: number) => void;
}) {
  if (loading) return <SkeletonList rows={6} />;
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div><h2 className="font-semibold">Tipo de manutenção</h2><p className="text-caption">Os dois tipos aparecerão no documento. Selecione o realizado nesta visita.</p></div>
        <div className="grid grid-cols-2 gap-3">
          {RVT_MAINTENANCE_TYPES.map((type) => <button key={type.value} type="button" onClick={() => onMaintenanceType(type.value)} className={`flex min-h-16 items-center justify-between rounded-[var(--radius-lg)] border p-3 text-left ${maintenanceType === type.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}><span className="font-medium">{type.label}</span>{maintenanceType === type.value && <Check className="h-5 w-5 text-[var(--color-primary)]" />}</button>)}
        </div>
      </section>
      {RVT_MAINTENANCE_TYPES.map((type) => {
        const indexed = items.map((item, index) => ({ item, index })).filter(({ item }) => item.maintenanceType === type.value);
        return <section key={type.value} className={`space-y-2 rounded-[var(--radius-lg)] border p-3 ${maintenanceType === type.value ? 'border-[var(--color-primary)]' : 'border-[var(--color-border)]'}`}>
          <div className="flex items-center justify-between"><h3 className="font-semibold">Checklist {type.label.toLowerCase()}</h3>{maintenanceType === type.value && <StatusChip tone="success">Selecionado</StatusChip>}</div>
          {indexed.length === 0 ? <p className="text-caption">Nenhum item cadastrado no Catálogo Técnico.</p> : <ul className="space-y-2">{indexed.map(({ item, index }) => <li key={`${type.value}-${index}`}><button type="button" onClick={() => onToggle(index)} className="flex w-full items-center gap-3 rounded-md bg-[var(--color-card)] p-3 text-left">{item.executed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-success)]" /> : <Circle className="h-5 w-5 shrink-0 text-[var(--color-muted-foreground)]" />}<span className="text-sm">{item.description}</span></button></li>)}</ul>}
        </section>;
      })}
    </div>
  );
}

function NotesStep({
  documentType,
  reportedIssue,
  onReportedIssue,
  serviceDescription,
  onServiceDescription,
  observations,
  onObservations,
  recommendations,
  onRecommendationsChange,
  areas,
}: {
  documentType: DocumentKind;
  reportedIssue: string;
  onReportedIssue: (value: string) => void;
  serviceDescription: string;
  onServiceDescription: (value: string) => void;
  observations: string;
  onObservations: (value: string) => void;
  objectives: string[];
  onObjectivesChange: (values: string[]) => void;
  conditions: string[];
  onConditionsChange: (values: string[]) => void;
  recommendations: string[];
  onRecommendationsChange: (values: string[]) => void;
  conclusions: string[];
  onConclusionsChange: (values: string[]) => void;
  areas: TechnicalCatalogArea[];
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Relato do atendimento</h2>
        {documentType === 'WORK_ORDER' && <>
          <MobileTextArea label="Defeito ou solicitação" value={reportedIssue} onChange={onReportedIssue} placeholder="Descreva o que foi informado pelo cliente." />
          <MobileTextArea label="Serviços previstos ou executados" value={serviceDescription} onChange={onServiceDescription} placeholder="Descreva os serviços e verificações realizados." />
        </>}
        <MobileTextArea
          label="Observações"
          value={observations}
          onChange={onObservations}
          placeholder="Registre o resultado, pendências e orientações ao cliente."
        />
      </section>
      {documentType === 'TECHNICAL_REPORT' && <>
        <section className="space-y-2 border-t border-[var(--color-border)] pt-4">
          <h2 className="text-sm font-semibold">Recomendações técnicas <span className="font-normal text-[var(--color-muted-foreground)]">(opcional)</span></h2>
          <TechnicalCatalogSelector type="RECOMMENDATION" areas={areas} workflow="TECHNICAL_REPORT" label="Recomendação" values={recommendations} onChange={onRecommendationsChange} compact />
          <MobileTextArea label="Texto das recomendações" value={recommendations.join('\n')} onChange={(value) => onRecommendationsChange(value.split('\n').filter(Boolean))} placeholder="Inclua orientações técnicas quando necessário." />
        </section>
      </>}
    </div>
  );
}

function MobileTextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} placeholder={placeholder} className="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-3 text-sm outline-none focus:border-[var(--color-primary)]" />
    </label>
  );
}

function technicalCatalogAreas(equipments: EquipmentSummary[]): TechnicalCatalogArea[] {
  const areas = new Set<TechnicalCatalogArea>();
  for (const equipment of equipments) {
    if (['SPLIT', 'CHILLER', 'CONDENSER', 'EVAPORATOR', 'AIR_HANDLER'].includes(equipment.type)) {
      areas.add('HVAC');
      areas.add('REFRIGERATION');
    } else if (['ELECTRICAL_PANEL', 'GENERATOR', 'SOLAR_INVERTER'].includes(equipment.type)) {
      areas.add('ELECTRICAL');
    }
  }
  return areas.size > 0 ? [...areas] : ['GENERAL'];
}

function FotosStep({
  photos,
  onChange,
}: {
  photos: CapturedPhoto[];
  onChange: (p: CapturedPhoto[]) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Registre o serviço com fotos (opcional).
      </p>
      <PhotoInput photos={photos} onChange={onChange} />
    </div>
  );
}

function AssinaturaStep({
  signerName,
  signerRole,
  signedAt,
  onSignerName,
  onSignerRole,
  onChange,
}: {
  signerName: string;
  signerRole: string;
  signedAt: string | null;
  onSignerName: (v: string) => void;
  onSignerRole: (v: string) => void;
  onChange: (s: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Identifique quem assina pelo cliente e colete a assinatura. Esses dados vão para o relatório final.
      </p>
      <input
        value={signerName}
        onChange={(e) => onSignerName(e.target.value)}
        placeholder="Nome do cliente/responsável que assina *"
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-11 text-sm outline-none focus:border-[var(--color-primary)]"
      />
      <input
        value={signerRole}
        onChange={(e) => onSignerRole(e.target.value)}
        placeholder="Função ou vínculo (opcional)"
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-11 text-sm outline-none focus:border-[var(--color-primary)]"
      />
      <SignaturePad onChange={onChange} onConfirm={onChange} />
      {!signerName.trim() && <p className="text-[11px] text-[var(--color-warning)]">Informe o nome de quem assina para continuar.</p>}
      {signedAt && <p className="rounded-[var(--radius-md)] bg-[var(--color-success)]/10 px-3 py-2 text-xs text-[var(--color-success)]">Assinatura coletada em {new Date(signedAt).toLocaleString('pt-BR')}.</p>}
    </div>
  );
}

function ResumoStep({
  customer,
  address,
  equipments,
  serviceType,
  checklist,
  maintenanceType,
  maintenanceChecklist,
  reportedIssue,
  serviceDescription,
  observations,
  photoCount,
  signed,
  signerName,
  signerRole,
  signedAt,
  technicalSignatureSelected = false,
  documentType,
  variant = 'confirmation',
  showSignature = true,
}: {
  customer: Customer | null;
  address: { id: string; label: string } | null;
  equipments: EquipmentSummary[];
  serviceType: ServiceTypeKey | null;
  checklist: ChecklistItem[];
  maintenanceType: OperationMaintenanceType;
  maintenanceChecklist: OperationMaintenanceChecklistItem[];
  reportedIssue: string;
  serviceDescription: string;
  observations: string;
  photoCount: number;
  signed: boolean;
  signerName?: string;
  signerRole?: string;
  signedAt?: string | null;
  technicalSignatureSelected?: boolean;
  documentType: DocumentKind;
  variant?: 'signature' | 'confirmation';
  showSignature?: boolean;
}) {
  const displayedChecklist = documentType === 'TECHNICAL_REPORT' ? maintenanceChecklist : checklist;
  const done = displayedChecklist.filter((item) => 'executed' in item ? item.executed : item.done).length;
  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-md)] border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-3 py-2 text-sm text-[var(--color-info)] flex items-start gap-2">
        <FileText className="h-4 w-4 mt-0.5 shrink-0" />
        {variant === 'signature'
          ? 'Confira com o cliente os dados abaixo antes de coletar a assinatura.'
          : 'Confira os dados finais. Ao concluir, o PDF oficial será gerado e ficará disponível para baixar ou compartilhar.'}
      </div>
      <SummaryRow icon={<Building2 className="h-4 w-4" />} label="Cliente" value={customer?.name} />
      <SummaryRow icon={<FileText className="h-4 w-4" />} label="Documento" value={DOCUMENT_KIND_LABEL[documentType]} />
      <SummaryRow icon={<MapPin className="h-4 w-4" />} label="Endereço" value={address?.label} />
      <SummaryRow
        icon={<Wrench className="h-4 w-4" />}
        label="Equipamentos"
        value={
          equipments.length ? equipments.map((item) => item.name).join(', ') : 'Sem equipamento'
        }
      />
      <SummaryRow
        icon={<ClipboardList className="h-4 w-4" />}
        label="Tipo"
        value={serviceType ? serviceTypeLabel(serviceType) : undefined}
      />
      <SummaryRow
        icon={<CheckCircle2 className="h-4 w-4" />}
        label="Checklist"
        value={`${done}/${displayedChecklist.length} concluídos${documentType === 'TECHNICAL_REPORT' ? ` · ${maintenanceType === 'WEEKLY' ? 'Semanal' : 'Semestral'}` : ''}`}
      />
      <SummaryRow icon={<Camera className="h-4 w-4" />} label="Fotos" value={`${photoCount}`} />
      {showSignature && (
        <SummaryRow
          icon={<PenLine className="h-4 w-4" />}
          label="Assinatura técnica"
          value={technicalSignatureSelected ? 'Minha assinatura selecionada' : 'Pendente'}
          tone={technicalSignatureSelected ? 'success' : 'warning'}
        />
      )}
      {showSignature && (
        <SummaryRow
          icon={<PenLine className="h-4 w-4" />}
          label="Assinatura"
          value={signed ? `Coletada · ${signerName?.trim() ?? ''}${signerRole?.trim() ? ` (${signerRole.trim()})` : ''}${signedAt ? ` · ${new Date(signedAt).toLocaleString('pt-BR')}` : ''}` : 'Pendente'}
          tone={signed ? 'success' : 'warning'}
        />
      )}
      {(reportedIssue || serviceDescription || observations) && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
          <div className="text-caption uppercase tracking-wider mb-2">{documentType === 'WORK_ORDER' ? 'Conteúdo da Ordem de Serviço' : 'Conteúdo do Relatório de Visita Técnica'}</div>
          {reportedIssue && <p className="text-sm whitespace-pre-wrap"><strong>Solicitação:</strong> {reportedIssue}</p>}
          {serviceDescription && <p className="mt-2 text-sm whitespace-pre-wrap"><strong>Serviços:</strong> {serviceDescription}</p>}
          {observations && <p className="mt-2 text-sm whitespace-pre-wrap"><strong>Resultado:</strong> {observations}</p>}
        </div>
      )}
    </div>
  );
}

function SuccessView({
  documentNumber,
  documentType,
  onDone,
  onDocuments,
  onNew,
}: {
  documentNumber: string;
  documentType: DocumentKind;
  onDone: () => void;
  onDocuments: () => void;
  onNew: () => void;
}) {
  return (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div className="max-w-xs">
        <div className="mx-auto h-16 w-16 rounded-full bg-[var(--color-success)]/12 grid place-items-center text-[var(--color-success)]">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h1 className="text-section-title mt-4">Atendimento concluído</h1>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-3 py-1 text-sm font-medium text-[var(--color-primary)]">
          <FileText className="h-4 w-4" /> {documentNumber}
        </p>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-2">
          {DOCUMENT_KIND_LABEL[documentType]} concluído e PDF oficial gerado. A gestão foi notificada e o documento já pode ser baixado ou compartilhado.
        </p>
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={onDocuments}
            className="w-full rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] h-12 text-sm font-semibold active:scale-[0.99]"
          >
            Baixar ou compartilhar PDF
          </button>
          <button
            type="button"
            onClick={onNew}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] h-12 text-sm font-medium hover:bg-[var(--color-muted)]"
          >
            Novo atendimento
          </button>
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] h-12 text-sm font-medium hover:bg-[var(--color-muted)]"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- shared bits ---------- */

function PickRow({
  active,
  onClick,
  icon,
  title,
  subtitle,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 rounded-[var(--radius-md)] border p-3.5 transition active:scale-[0.99] ${active ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]'}`}
    >
      <span className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--color-muted)] grid place-items-center text-[var(--color-muted-foreground)] shrink-0">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium truncate">{title}</span>
        <span className="block text-caption truncate">{subtitle}</span>
      </span>
      {badge && <StatusChip tone="warning">{badge}</StatusChip>}
      {active ? (
        <Check className="h-4 w-4 text-[var(--color-primary)] shrink-0" />
      ) : (
        <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />
      )}
    </button>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  tone?: 'success' | 'warning';
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
      <span className="text-[var(--color-muted-foreground)]">{icon}</span>
      <span className="text-caption w-24 shrink-0">{label}</span>
      <span
        className={`text-sm font-medium flex-1 text-right truncate ${tone === 'success' ? 'text-[var(--color-success)]' : tone === 'warning' ? 'text-[var(--color-warning)]' : ''}`}
      >
        {value ?? '—'}
      </span>
    </div>
  );
}
