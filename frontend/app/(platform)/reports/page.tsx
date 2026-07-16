'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardCheck,
  FileCheck2,
  FileText,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { PageHeader } from '@platform/components/page-header';
import { Pagination } from '@platform/components/pagination';
import { OperationCreationDrawer } from '@platform/components/operation-creation-drawer';
import {
  ApiClientError,
  customersApi,
  documentsApi,
  equipmentsApi,
  maintenanceChecklistTemplatesApi,
  operationApi,
  pmocApi,
  signaturesApi,
  usersApi,
  useQuery,
  type Customer,
  type CustomerAddress,
  type CustomerDetail,
  type DocumentCatalogItem,
  type DocumentConfiguration,
  type DocumentKind,
  type EquipmentSummary,
  type MaintenanceChecklistTemplate,
  type OperationDetail,
  type OperationMaintenanceType,
  type OperationSummary,
  type Paginated,
  type PmocPlan,
  type CreateOperationPayload,
  type Signature,
  type TeamUser,
  type TechnicalCatalogArea,
} from '@erp/api';
import { Gate } from '@erp/ui/auth/gate';
import { useAuth } from '@erp/ui/auth/auth-provider';
import { Drawer } from '@erp/ui/drawer';
import { EmptyState } from '@erp/ui/empty-state';
import { SkeletonCard } from '@erp/ui/skeletons';
import { DocumentViewer } from '@erp/ui/documents/document-viewer';
import { SignaturePad } from '@erp/ui/documents/signature-pad';
import { MultiSelect } from '@erp/ui/multi-select';
import { TechnicalCatalogSelector } from '@erp/ui/technical-catalog/technical-catalog-selector';
import { DOCUMENT_KIND_LABEL } from '@erp/types';
import { formatDate } from '@erp/utils';

const REPORT_TYPES: Array<{
  type: DocumentKind;
  title: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    type: 'WORK_ORDER',
    title: 'Ordem de Serviço',
    description: 'Emitida exclusivamente a partir de uma Operation existente.',
    icon: ClipboardCheck,
  },
  {
    type: 'TECHNICAL_REPORT',
    title: 'Relatório de Visita Técnica',
    description: 'Visita, equipamentos, atividades, observações e assinaturas.',
    icon: FileText,
  },
  {
    type: 'TECHNICAL_OPINION',
    title: 'Laudo Técnico',
    description: 'Diagnóstico, análise, conclusão e responsabilidade técnica.',
    icon: FileCheck2,
  },
  {
    type: 'PMOC',
    title: 'PMOC',
    description: 'Plano, ambientes, checklist, medições e pendências operacionais.',
    icon: ShieldCheck,
  },
  {
    type: 'RECEIPT',
    title: 'Recibo',
    description: 'Referência, valor recebido, observações e assinatura.',
    icon: ReceiptText,
  },
];

type WorkflowForm = {
  workOrderSource: '' | 'EXISTING' | 'NEW';
  operationId: string;
  customerId: string;
  addressId: string;
  equipmentId: string;
  operatorId: string;
  pmocId: string;
  pmocMode: '' | 'EXISTING' | 'NEW';
  pmocEquipmentIds: string[];
  pmocResponsible: string;
  pmocStartDate: string;
  pmocEndDate: string;
  pmocObservations: string;
  pmocCoverage: string;
  pmocPeriodicity: import('@erp/types').PmocPeriodicity;
  pmocGenerationMode: import('@erp/types').PmocGenerationMode;
  pmocDefaultOperatorId: string;
  pmocDefaultTechnicianId: string;
  pmocSignatureOverrideId: string;
  pmocExecutionRequestId: string;
  pmocRecurrenceFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'INTERVAL_DAYS' | 'INTERVAL_MONTHS';
  pmocRecurrenceInterval: string;
  pmocActive: boolean;
  objective: string;
  objectiveItems: string[];
  diagnosis: string;
  siteConditions: string;
  observations: string;
  analysis: string;
  recommendations: string;
  conclusion: string;
  conclusionItems: string[];
  technicalResponsible: string;
  technicalCrea: string;
  technicalSignatureId: string;
  reference: string;
  amount: string;
  receivedFrom: string;
  checklist: string;
  signatureData: string | null;
  customerSignerName: string;
  customerSignerRole: string;
  photos: Array<{ dataUrl: string; caption: string }>;
  referenceMonth: string;
  referenceYear: string;
  maintenanceType: OperationMaintenanceType;
  maintenanceChecklist: Array<{
    templateId?: string;
    maintenanceType: OperationMaintenanceType;
    description: string;
    executed: boolean;
    result: 'YES' | 'NO' | 'NOT_APPLICABLE';
    equipmentId?: string;
    observations: string;
  }>;
  inspectedEquipments: Array<{
    equipmentId: string;
    sector: string;
    systemType: string;
    currentSituation: string;
  }>;
};

const defaultPmocStart = new Date();
const defaultPmocEnd = new Date(defaultPmocStart);
defaultPmocEnd.setUTCFullYear(defaultPmocEnd.getUTCFullYear() + 1);

const emptyForm: WorkflowForm = {
  workOrderSource: '',
  operationId: '',
  customerId: '',
  addressId: '',
  equipmentId: '',
  operatorId: '',
  pmocId: '',
  pmocMode: '',
  pmocEquipmentIds: [],
  pmocResponsible: '',
  pmocStartDate: defaultPmocStart.toISOString().slice(0, 10),
  pmocEndDate: defaultPmocEnd.toISOString().slice(0, 10),
  pmocObservations: '',
  pmocCoverage: '',
  pmocPeriodicity: 'MONTHLY',
  pmocGenerationMode: 'MANUAL',
  pmocDefaultOperatorId: '',
  pmocDefaultTechnicianId: '',
  pmocSignatureOverrideId: '',
  pmocExecutionRequestId: '',
  pmocRecurrenceFrequency: 'MONTHLY',
  pmocRecurrenceInterval: '1',
  pmocActive: true,
  objective: '',
  objectiveItems: [],
  diagnosis: '',
  siteConditions: '',
  observations: '',
  analysis: '',
  recommendations: '',
  conclusion: '',
  conclusionItems: [],
  technicalResponsible: '',
  technicalCrea: '',
  technicalSignatureId: '',
  reference: '',
  amount: '',
  receivedFrom: '',
  checklist: '',
  signatureData: null,
  customerSignerName: '',
  customerSignerRole: '',
  photos: [],
  referenceMonth: String(new Date().getMonth() + 1),
  referenceYear: String(new Date().getFullYear()),
  maintenanceType: 'SEMIANNUAL',
  maintenanceChecklist: [],
  inspectedEquipments: [],
};

export default function ReportCenterPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [workflow, setWorkflow] = useState<{ type: DocumentKind; operationId?: string } | null>(
    null,
  );
  const [selectedDocument, setSelectedDocument] = useState<DocumentCatalogItem | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<DocumentKind | ''>('');
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const documents = useQuery<Paginated<DocumentCatalogItem>>(
    (signal) =>
      documentsApi.listDocuments({
        page,
        limit: 10,
        search: search || undefined,
        type: filterType || undefined,
        signal,
      }),
    [page, search, filterType, tick],
  );
  const supported = new Set(REPORT_TYPES.map((item) => item.type));
  const availableReports = REPORT_TYPES.filter(
    (item) => item.type !== 'RECEIPT' || hasRole('OWNER'),
  );
  const items = (documents.data?.items ?? []).filter((item) => supported.has(item.type));
  const metrics = useMemo(
    () => ({
      total: documents.data?.pagination.total ?? 0,
      ready: items.filter((item) => item.status === 'READY').length,
      draft: items.filter((item) => item.status === 'DRAFT').length,
      rendered: items.filter((item) => item.renderedAt).length,
    }),
    [documents.data, items],
  );

  return (
    <Gate
      permission="canReports"
      fallback={
        <EmptyState
          icon={FileText}
          title="Central de Relatórios indisponível"
          description="Seu perfil não possui acesso ao módulo."
        />
      }
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Gestão"
          title="Central de Relatórios"
          description="Emissão oficial de documentos pelo Document Engine. Modelos são administrados separadamente em Cadastros."
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Documentos" value={metrics.total} />
          <Metric label="Prontos" value={metrics.ready} />
          <Metric label="Rascunhos" value={metrics.draft} />
          <Metric label="Renderizados na página" value={metrics.rendered} />
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-section-title">Nova emissão</h2>
            <p className="text-caption">
              Escolha o workflow; template, branding e política de assinatura serão resolvidos pelo
              backend.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {availableReports.map(({ type: reportType, title, description, icon: Icon }) => (
              <button
                key={reportType}
                type="button"
                onClick={() => {
                  if (reportType === 'PMOC') {
                    router.push('/pmoc');
                    return;
                  }
                  setWorkflow({ type: reportType });
                }}
                className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card)]"
              >
                <span className="inline-flex rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 p-2 text-[var(--color-primary)]">
                  <Icon className="h-5 w-5" />
                </span>
                <strong className="mt-3 block text-sm">{title}</strong>
                <span className="mt-1 block text-xs text-[var(--color-muted-foreground)]">
                  {description}
                </span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)]">
                  <Plus className="h-3.5 w-3.5" /> Iniciar
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-section-title">Histórico de emissões</h2>
              <p className="text-caption">Mesmos registros exibidos no repositório Documentos.</p>
            </div>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar número, cliente…"
                className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
              />
              <select
                value={filterType}
                onChange={(event) => {
                  setFilterType(event.target.value as DocumentKind | '');
                  setPage(1);
                }}
                className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
              >
                <option value="">Todos os tipos</option>
                {REPORT_TYPES.map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {documents.loading ? (
            <SkeletonCard />
          ) : documents.error ? (
            <EmptyState
              icon={RefreshCw}
              title="Falha ao carregar emissões"
              description={String(documents.error)}
              action={<button onClick={documents.refetch}>Tentar novamente</button>}
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhuma emissão encontrada"
              description="Inicie um workflow acima para criar o primeiro documento."
            />
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-left text-caption">
                      <th className="px-4 py-3">Número</th>
                      <th>Tipo</th>
                      <th>Cliente</th>
                      <th>Equipamento</th>
                      <th>Status</th>
                      <th>Emissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedDocument(item)}
                        className="cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-muted)]/60"
                      >
                        <td className="px-4 py-3 font-medium">{item.number}</td>
                        <td>{DOCUMENT_KIND_LABEL[item.type]}</td>
                        <td>{item.customer?.name ?? '—'}</td>
                        <td>{item.equipment?.name ?? '—'}</td>
                        <td>{item.status}</td>
                        <td>{formatDate(item.renderedAt ?? item.issuedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {documents.data && (
            <Pagination
              pagination={documents.data.pagination}
              onPageChange={setPage}
              onPageSizeChange={() => undefined}
              pageSizeOptions={[10]}
            />
          )}
        </section>

        {workflow && (
          <ReportWorkflowDrawer
            type={workflow.type}
            initialOperationId={workflow.operationId}
            onClose={() => setWorkflow(null)}
            onRendered={() => setTick((value) => value + 1)}
          />
        )}
        <Drawer
          open={Boolean(selectedDocument)}
          onClose={() => setSelectedDocument(null)}
          title={selectedDocument?.number ?? 'Documento'}
          eyebrow="Histórico da emissão"
          width="max-w-[1180px]"
        >
          {selectedDocument && (
            <div className="space-y-4">
              {selectedDocument.origin === 'OPERATION' && selectedDocument.originId && (
                <button
                  type="button"
                  onClick={() => {
                    setWorkflow({
                      type: selectedDocument.type,
                      operationId: selectedDocument.originId ?? undefined,
                    });
                    setSelectedDocument(null);
                  }}
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-muted)]"
                >
                  Editar dados de origem
                </button>
              )}
              <DocumentViewer
                source={{ documentId: selectedDocument.id }}
                canRender
                canDownload
                onRendered={() => setTick((value) => value + 1)}
              />
            </div>
          )}
        </Drawer>
      </div>
    </Gate>
  );
}

function ReportWorkflowDrawer({
  type,
  initialOperationId,
  onClose,
  onRendered,
}: {
  type: DocumentKind;
  initialOperationId?: string;
  onClose: () => void;
  onRendered: () => void;
}) {
  const { hasRole } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WorkflowForm>(emptyForm);
  const [operation, setOperation] = useState<OperationDetail | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [equipments, setEquipments] = useState<EquipmentSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [creatingPmoc, setCreatingPmoc] = useState(false);
  const [pmocWorkOrderOpen, setPmocWorkOrderOpen] = useState(false);
  const [pmocWorkOrderPrefill, setPmocWorkOrderPrefill] =
    useState<CreateOperationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const customers = useQuery<Paginated<Customer>>(
    (signal) => customersApi.listCustomers({ page: 1, limit: 100, signal }),
    [],
  );
  const users = useQuery<Paginated<TeamUser>>(
    (signal) => usersApi.listUsers({ page: 1, limit: 100, signal }),
    [],
  );
  const operations = useQuery<Paginated<OperationSummary>>(
    (signal) => operationApi.listOperations({ page: 1, limit: 100, status: 'COMPLETED', signal }),
    [],
  );
  const pmocs = useQuery<Paginated<PmocPlan>>(
    (signal) => pmocApi.listPmoc({ page: 1, limit: 100, active: true, signal }),
    [],
  );
  const configuration = useQuery<DocumentConfiguration>(
    (signal) => documentsApi.getConfigurationByType(type, { signal }),
    [type],
  );
  const signatures = useQuery<Paginated<Signature>>(
    (signal) => signaturesApi.listSignatures({ page: 1, limit: 100, active: true, signal }),
    [],
  );
  const checklistTemplates = useQuery<Paginated<MaintenanceChecklistTemplate>>(
    (signal) =>
      maintenanceChecklistTemplatesApi.list({
        page: 1,
        limit: 100,
        active: true,
        maintenanceType: form.maintenanceType,
        signal,
      }),
    [form.maintenanceType],
  );
  const isWorkOrder = type === 'WORK_ORDER';

  useEffect(() => {
    if (initialOperationId) void selectOperation(initialOperationId);
    // Initial source is immutable for the drawer lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOperationId]);

  useEffect(() => {
    if (!form.customerId) {
      setAddresses([]);
      setEquipments([]);
      setSelectedCustomer(null);
      return;
    }
    const controller = new AbortController();
    Promise.all([
      customersApi.getCustomer(form.customerId, { signal: controller.signal }),
      equipmentsApi.listEquipments({
        customerId: form.customerId,
        page: 1,
        limit: 100,
        signal: controller.signal,
      }),
    ])
      .then(([customer, equipmentPage]) => {
        setSelectedCustomer(customer);
        setAddresses(customer.addresses);
        setEquipments(equipmentPage.items);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [form.customerId]);

  function set<K extends keyof WorkflowForm>(key: K, value: WorkflowForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectWorkOrderSource(source: 'EXISTING' | 'NEW') {
    setOperation(null);
    setError(null);
    setForm({ ...emptyForm, workOrderSource: source });
  }

  async function selectOperation(id: string) {
    set('operationId', id);
    setError(null);
    if (!id) {
      setOperation(null);
      return;
    }
    try {
      const detail = await operationApi.getOperation(id);
      setOperation(detail);
      setForm((current) => ({
        ...current,
        workOrderSource: 'EXISTING',
        customerId: detail.customer?.id ?? '',
        addressId: detail.address?.id ?? '',
        equipmentId: detail.equipment?.id ?? '',
        operatorId: detail.operator?.id ?? '',
        objective: detail.reportedIssue ?? '',
        diagnosis: detail.technicalDiagnosis ?? '',
        observations: detail.observations ?? '',
        analysis: detail.serviceDescription ?? '',
        recommendations: detail.technicalRecommendations ?? '',
        ...(type === 'TECHNICAL_OPINION'
          ? {
              objective: detail.technicalOpinionObjective ?? '',
              objectiveItems: detail.technicalOpinionObjectiveItems ?? [],
              siteConditions: detail.technicalOpinionConditions ?? '',
              analysis: detail.technicalOpinionAnalysis ?? '',
              conclusion: detail.technicalOpinionConclusion ?? '',
              conclusionItems: detail.technicalOpinionConclusionItems ?? [],
              recommendations: detail.technicalOpinionRecommendations ?? '',
              technicalResponsible: detail.technicalOpinionResponsible ?? '',
              technicalCrea: detail.technicalOpinionCrea ?? '',
            }
          : {}),
        checklist: detail.checklist
          .map(
            (item) =>
              `${item.done ? '[x]' : '[ ]'} ${item.label}${item.note ? ` | ${item.note}` : ''}`,
          )
          .join('\n'),
        referenceMonth: detail.referenceMonth
          ? String(detail.referenceMonth)
          : current.referenceMonth,
        referenceYear: detail.referenceYear ? String(detail.referenceYear) : current.referenceYear,
        maintenanceType: detail.maintenanceType ?? current.maintenanceType,
        maintenanceChecklist: detail.maintenanceChecklistItems.map((item) => ({
          equipmentId: item.equipmentId ?? undefined,
          maintenanceType: item.maintenanceType,
          description: item.description,
          executed: item.executed,
          result: item.result ?? (item.executed ? 'YES' : 'NO'),
          observations: item.observations ?? '',
        })),
        inspectedEquipments: detail.inspectedEquipments.map((item) => ({
          equipmentId: item.equipmentId,
          sector: item.sector,
          systemType: item.systemTypeSnapshot ?? '',
          currentSituation: item.currentSituationSnapshot ?? '',
        })),
      }));
    } catch (cause) {
      setError(message(cause));
    }
  }

  function applyPmocPlan(plan: PmocPlan) {
    const recurrence = plan.maintenancePlan?.recurrenceRule as
      | { frequency?: WorkflowForm['pmocRecurrenceFrequency']; interval?: number }
      | undefined;
    setForm((current) => ({
      ...current,
      pmocId: plan.id,
      pmocMode: 'EXISTING',
      pmocEquipmentIds: (plan.equipments?.length
        ? plan.equipments.map((item) => item.equipmentId)
        : [plan.equipmentId]
      ),
      pmocResponsible: plan.responsibleTechnician,
      pmocStartDate: plan.startDate.slice(0, 10),
      pmocEndDate: plan.endDate.slice(0, 10),
      pmocObservations: plan.observations ?? '',
      pmocCoverage: plan.coverage ?? '',
      pmocPeriodicity: plan.periodicity,
      pmocGenerationMode: plan.generationMode,
      pmocDefaultOperatorId: plan.defaultOperatorId ?? '',
      pmocDefaultTechnicianId: plan.defaultTechnicianId ?? '',
      pmocSignatureOverrideId: plan.signatureOverrideId ?? '',
      pmocExecutionRequestId:
        plan.executionRequests?.find((item) => item.status === 'PENDING' || item.status === 'FAILED')
          ?.id ??
        plan.executionRequests?.find((item) => item.status === 'GENERATED')?.id ??
        '',
      pmocRecurrenceFrequency: recurrence?.frequency ?? 'MONTHLY',
      pmocRecurrenceInterval: String(recurrence?.interval ?? 1),
      pmocActive: plan.active,
      customerId: plan.customerId,
      equipmentId: plan.equipmentId,
      inspectedEquipments: (plan.equipments?.length
        ? plan.equipments
        : [{ equipmentId: plan.equipmentId, equipment: plan.equipment }]
      ).map((item) => ({
        equipmentId: item.equipmentId,
        sector: item.equipment?.name ?? 'Não informado',
        systemType: '',
        currentSituation: '',
      })),
      objective: `Execução do plano PMOC ${plan.maintenancePlan?.name ?? plan.contractNumber ?? plan.id}`,
      observations: plan.observations ?? current.observations,
    }));
    const generated = plan.executionRequests?.find(
      (item) => item.status === 'GENERATED' && item.operationId,
    );
    if (generated?.operationId) {
      void operationApi.getOperation(generated.operationId).then(setOperation).catch(() => undefined);
    } else {
      setOperation(null);
    }
  }

  async function selectPmoc(id: string) {
    set('pmocId', id);
    if (!id) return;
    try {
      const plan =
        pmocs.data?.items.find((item) => item.id === id) ?? (await pmocApi.getPmoc(id));
      applyPmocPlan(plan);
    } catch (cause) {
      setError(message(cause));
    }
  }

  async function createPmocPlan() {
    setCreatingPmoc(true);
    setError(null);
    try {
      if (!form.customerId || !form.operatorId)
        throw new Error('Selecione o cliente e o responsável pela futura Ordem de Serviço.');
      if (form.pmocEquipmentIds.length === 0)
        throw new Error('Selecione ao menos um equipamento controlado pelo PMOC.');
      if (!form.pmocResponsible.trim())
        throw new Error('Informe o responsável técnico do PMOC.');
      const created = await pmocApi.createPmoc({
        customerId: form.customerId,
        equipmentId: form.pmocEquipmentIds[0],
        equipmentIds: form.pmocEquipmentIds,
        responsibleTechnician: form.pmocResponsible,
        coverage: form.pmocCoverage || undefined,
        periodicity: form.pmocPeriodicity,
        generationMode: form.pmocGenerationMode,
        defaultOperatorId: form.pmocDefaultOperatorId || undefined,
        defaultTechnicianId: form.pmocDefaultTechnicianId || undefined,
        signatureOverrideId: form.pmocSignatureOverrideId || undefined,
        startDate: form.pmocStartDate,
        endDate: form.pmocEndDate,
        observations: form.pmocObservations || undefined,
        priority: 'HIGH',
        recurrenceRule:
          form.pmocPeriodicity === 'CUSTOM'
            ? {
                frequency: form.pmocRecurrenceFrequency,
                interval: Number(form.pmocRecurrenceInterval || 1),
              }
            : undefined,
        active: form.pmocActive,
      });
      applyPmocPlan(created);
      pmocs.refetch();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setCreatingPmoc(false);
    }
  }

  async function updatePmocPlan() {
    if (!form.pmocId) return;
    setCreatingPmoc(true);
    setError(null);
    try {
      const updated = await pmocApi.updatePmoc(form.pmocId, {
        equipmentIds: form.pmocEquipmentIds,
        responsibleTechnician: form.pmocResponsible,
        coverage: form.pmocCoverage || null,
        periodicity: form.pmocPeriodicity,
        generationMode: form.pmocGenerationMode,
        defaultOperatorId: form.pmocDefaultOperatorId || null,
        defaultTechnicianId: form.pmocDefaultTechnicianId || null,
        signatureOverrideId: form.pmocSignatureOverrideId || null,
        startDate: form.pmocStartDate,
        endDate: form.pmocEndDate,
        observations: form.pmocObservations || null,
        recurrenceRule:
          form.pmocPeriodicity === 'CUSTOM'
            ? {
                frequency: form.pmocRecurrenceFrequency,
                interval: Number(form.pmocRecurrenceInterval || 1),
              }
            : undefined,
        active: form.pmocActive,
      });
      applyPmocPlan(updated);
      pmocs.refetch();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setCreatingPmoc(false);
    }
  }

  async function deletePmocPlan() {
    if (!form.pmocId) return;
    if (!window.confirm('Deseja realmente remover este plano PMOC?')) return;
    setCreatingPmoc(true);
    setError(null);
    try {
      await pmocApi.deletePmoc(form.pmocId);
      setForm((current) => ({
        ...current,
        pmocId: '',
        pmocMode: '',
        customerId: '',
        equipmentId: '',
        pmocEquipmentIds: [],
        inspectedEquipments: [],
      }));
      pmocs.refetch();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setCreatingPmoc(false);
    }
  }

  async function openPmocWorkOrderWizard() {
    if (!form.pmocId) return;
    setCreatingPmoc(true);
    setError(null);
    try {
      const plan = await pmocApi.getPmoc(form.pmocId);
      const generated = plan.executionRequests?.find(
        (item) => item.status === 'GENERATED' && item.operationId,
      );
      if (generated?.operationId) {
        const detail = await operationApi.getOperation(generated.operationId);
        setOperation(detail);
        set('operationId', detail.id);
        return;
      }
      let request = plan.executionRequests?.find(
        (item) => item.status === 'PENDING' || item.status === 'FAILED',
      );
      request ??= await pmocApi.createExecutionRequest(form.pmocId, {
        notes: 'Solicitação manual criada pela Central de Relatórios.',
      });
      const prefill = await pmocApi.getExecutionRequestPrefill(request.id);
      set('pmocExecutionRequestId', request.id);
      setPmocWorkOrderPrefill(prefill);
      setPmocWorkOrderOpen(true);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setCreatingPmoc(false);
    }
  }

  async function submitPmocWorkOrder(payload: CreateOperationPayload): Promise<OperationDetail> {
    if (!form.pmocExecutionRequestId) {
      throw new Error('A solicitação de execução do PMOC não foi encontrada.');
    }
    const request = await pmocApi.generateWorkOrder(form.pmocExecutionRequestId, payload);
    if (!request.operationId) throw new Error('A Ordem de Serviço não foi vinculada pelo backend.');
    const detail = await operationApi.getOperation(request.operationId);
    setOperation(detail);
    set('operationId', detail.id);
    setPmocWorkOrderOpen(false);
    await pmocs.refetch();
    return detail;
  }

  async function createChecklistTemplate(description: string) {
    const created = await maintenanceChecklistTemplatesApi.create({
      maintenanceType: form.maintenanceType,
      description,
      active: true,
    });
    await checklistTemplates.refetch();
    return created;
  }

  async function preparePreview() {
    setBusy(true);
    setError(null);
    try {
      let detail = operation;
      if (isWorkOrder && form.workOrderSource === 'EXISTING') {
        if (!form.operationId)
          throw new Error('Selecione uma Operation para emitir a Ordem de Serviço.');
        detail = detail ?? (await operationApi.getOperation(form.operationId));
      } else {
        if (isWorkOrder && form.workOrderSource !== 'NEW')
          throw new Error('Escolha se deseja usar uma Operation ou criar a OS do zero.');
        if (!form.customerId || !form.operatorId)
          throw new Error('Cliente e responsável são obrigatórios.');
        if (type === 'TECHNICAL_OPINION') {
          if (!form.technicalResponsible.trim() || !form.technicalCrea.trim())
            throw new Error('Responsável Técnico e CREA/registro profissional são obrigatórios.');
          if (form.inspectedEquipments.length === 0)
            throw new Error('Selecione ao menos um equipamento para o Laudo Técnico.');
          if (!form.objective.trim() || !form.conclusion.trim())
            throw new Error(
              'Informe o esclarecimento principal do técnico para o objetivo e a conclusão.',
            );
          if (
            form.inspectedEquipments.some(
              (item) =>
                !item.sector.trim() || !item.systemType.trim() || !item.currentSituation.trim(),
            )
          )
            throw new Error(
              'Informe tipo de sistema, local de instalação e situação atual de todos os equipamentos.',
            );
        }
        if (type === 'PMOC') {
          if (!form.pmocId) throw new Error('Selecione um plano PMOC ativo.');
          if (!detail)
            throw new Error('Gere ou abra a Ordem de Serviço vinculada antes de continuar.');
          if (form.inspectedEquipments.length === 0)
            throw new Error('Selecione ao menos um equipamento controlado pelo PMOC.');
          if (form.signatureData && !form.customerSignerName.trim())
            throw new Error('Informe o nome do cliente ou responsável que assinou o PMOC.');
        }
        const content = contentFor(type, form);
        if (detail) {
          detail = await operationApi.updateOperation(detail.id, content);
        } else {
          detail = await operationApi.createOperation({
            customerId: form.customerId,
            addressId: form.addressId || null,
            equipmentId:
              (type === 'WORK_ORDER' || type === 'TECHNICAL_OPINION'
                ? form.inspectedEquipments[0]?.equipmentId
                : null) ||
              form.equipmentId ||
              null,
            operatorId: form.operatorId,
            type: operationTypeFor(type),
            status: 'DRAFT',
            ...content,
          });
        }
      }
      setOperation(detail);
      set('operationId', detail.id);
      setStep(3);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  const steps = [
    'Origem',
    'Conteúdo',
    type === 'TECHNICAL_OPINION' ? 'Assinatura' : 'Evidências',
    'Preview',
  ];
  return (
    <>
    <Drawer
      open
      onClose={onClose}
      title={DOCUMENT_KIND_LABEL[type]}
      eyebrow="Workflow documental"
      width="max-w-[1240px]"
      footer={
        <>
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm"
          >
            {step > 0 ? 'Voltar' : 'Cancelar'}
          </button>
          {step < 2 && (
            <button
              type="button"
              disabled={
                creatingPmoc ||
                (type === 'PMOC' && step === 0 && (!form.pmocId || !operation))
              }
              onClick={() => setStep(step + 1)}
              className="h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm text-[var(--color-primary-foreground)] disabled:opacity-50"
            >
              Continuar
            </button>
          )}
          {step === 2 && (
            <button
              type="button"
              disabled={busy}
              onClick={preparePreview}
              className="h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm text-[var(--color-primary-foreground)] disabled:opacity-50"
            >
              {busy ? 'Preparando…' : 'Gerar preview'}
            </button>
          )}
        </>
      }
    >
      <div className="mb-5 grid grid-cols-4 gap-2">
        {steps.map((label, index) => (
          <div
            key={label}
            className={`rounded-[var(--radius-md)] px-3 py-2 text-center text-xs ${index === step ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]' : index < step ? 'bg-emerald-500/10 text-emerald-700' : 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'}`}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>
      {error && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {configuration.loading ? (
        <SkeletonCard />
      ) : configuration.error ? (
        <div className="rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          Não existe configuração ativa para este tipo. O backend impedirá a emissão.
        </div>
      ) : (
        <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-xs">
          <strong>Template automático:</strong>{' '}
          {configuration.data?.defaultTemplate?.name ?? 'Não configurado'} ·{' '}
          <strong>Assinatura:</strong>{' '}
          {configuration.data?.defaultTemplate?.signatureMode ?? 'NONE'}
        </div>
      )}
      {step === 0 && (
        <OriginStep
          type={type}
          form={form}
          customers={customers.data?.items ?? []}
          users={users.data?.items ?? []}
          operations={operations.data?.items ?? []}
          pmocs={pmocs.data?.items ?? []}
          signatures={signatures.data?.items ?? []}
          addresses={addresses}
          equipments={equipments}
          selectedCustomer={selectedCustomer}
          onSet={set}
          onWorkOrderSource={selectWorkOrderSource}
          onOperation={selectOperation}
          onPmoc={selectPmoc}
          canCreatePmoc={hasRole('OWNER', 'MANAGER')}
          creatingPmoc={creatingPmoc}
          onCreatePmoc={createPmocPlan}
          onUpdatePmoc={updatePmocPlan}
          onDeletePmoc={deletePmocPlan}
          onGeneratePmocWorkOrder={openPmocWorkOrderWizard}
          pmocOperation={operation}
        />
      )}
      {step === 1 && (
        <ContentStep
          type={type}
          form={form}
          equipments={equipments}
          signatures={signatures.data?.items ?? []}
          checklistTemplates={checklistTemplates.data?.items ?? []}
          checklistTemplatesLoading={checklistTemplates.loading}
          canManageChecklist={hasRole('OWNER', 'MANAGER')}
          onCreateChecklist={createChecklistTemplate}
          onSet={set}
        />
      )}
      {step === 2 && <EvidenceStep type={type} form={form} onSet={set} />}
      {step === 3 && operation && (
        <DocumentViewer
          source={{ operationId: operation.id, type }}
          canRender
          canDownload
          onRendered={onRendered}
        />
      )}
    </Drawer>
    <OperationCreationDrawer
      open={pmocWorkOrderOpen}
      mode="work-order"
      initialValues={pmocWorkOrderPrefill ?? undefined}
      submitOperation={submitPmocWorkOrder}
      submitLabel="Confirmar e gerar OS"
      contextNotice="Dados preenchidos a partir do PMOC e da Execution Request. Revise e confirme; a OS será criada pelo workflow oficial de Operations."
      onClose={() => setPmocWorkOrderOpen(false)}
    />
    </>
  );
}

function OriginStep({
  type,
  form,
  customers,
  users,
  operations,
  pmocs,
  signatures,
  addresses,
  equipments,
  selectedCustomer,
  onSet,
  onWorkOrderSource,
  onOperation,
  onPmoc,
  canCreatePmoc,
  creatingPmoc,
  onCreatePmoc,
  onUpdatePmoc,
  onDeletePmoc,
  onGeneratePmocWorkOrder,
  pmocOperation,
}: {
  type: DocumentKind;
  form: WorkflowForm;
  customers: Customer[];
  users: TeamUser[];
  operations: OperationSummary[];
  pmocs: PmocPlan[];
  signatures: Signature[];
  addresses: CustomerAddress[];
  equipments: EquipmentSummary[];
  selectedCustomer: CustomerDetail | null;
  onSet: <K extends keyof WorkflowForm>(key: K, value: WorkflowForm[K]) => void;
  onWorkOrderSource: (source: 'EXISTING' | 'NEW') => void;
  onOperation: (id: string) => void;
  onPmoc: (id: string) => void;
  canCreatePmoc: boolean;
  creatingPmoc: boolean;
  onCreatePmoc: () => void;
  onUpdatePmoc: () => void;
  onDeletePmoc: () => void;
  onGeneratePmocWorkOrder: () => void;
  pmocOperation: OperationDetail | null;
}) {
  if (type === 'WORK_ORDER')
    return (
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onWorkOrderSource('EXISTING')}
            className={`rounded-[var(--radius-lg)] border p-4 text-left transition ${form.workOrderSource === 'EXISTING' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]'}`}
          >
            <strong className="block text-sm">Usar Operation existente</strong>
            <span className="mt-1 block text-caption">
              Aproveita cliente, equipamentos, execução, fotos e assinatura já registrados.
            </span>
          </button>
          <button
            type="button"
            onClick={() => onWorkOrderSource('NEW')}
            className={`rounded-[var(--radius-lg)] border p-4 text-left transition ${form.workOrderSource === 'NEW' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]'}`}
          >
            <strong className="block text-sm">Criar ordem do zero</strong>
            <span className="mt-1 block text-caption">
              Cria uma Operation rascunho oficial e permite preencher todos os dados da OS.
            </span>
          </button>
        </div>
        {form.workOrderSource === 'EXISTING' && (
          <Field label="Operation oficial">
            <select
              value={form.operationId}
              onChange={(event) => void onOperation(event.target.value)}
            >
              <option value="">Selecione…</option>
              {operations.map((item) => (
                <option key={item.id} value={item.id}>
                  OP-{String(item.number).padStart(6, '0')} · {item.customer?.name ?? 'Cliente'}
                </option>
              ))}
            </select>
          </Field>
        )}
        {form.workOrderSource === 'NEW' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Cliente">
              <select
                value={form.customerId}
                onChange={(event) => {
                  onSet('customerId', event.target.value);
                  onSet('addressId', '');
                  onSet('equipmentId', '');
                  onSet('inspectedEquipments', []);
                }}
              >
                <option value="">Selecione…</option>
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.tradeName ?? item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Endereço">
              <select
                value={form.addressId}
                onChange={(event) => onSet('addressId', event.target.value)}
              >
                <option value="">Endereço principal</option>
                {addresses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name ?? 'Endereço'} · {item.street ?? 'logradouro não informado'}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Responsável">
              <select
                value={form.operatorId}
                onChange={(event) => onSet('operatorId', event.target.value)}
              >
                <option value="">Selecione…</option>
                {users
                  .filter((item) => item.isActive)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.role}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
        )}
        {!form.workOrderSource && (
          <p className="text-caption">Selecione uma das origens para continuar.</p>
        )}
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {type === 'PMOC' && (
          <div className="order-last space-y-4 md:col-span-2">
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  onSet('pmocMode', 'NEW');
                  onSet('pmocId', '');
                }}
                disabled={!canCreatePmoc}
                className={`rounded-[var(--radius-lg)] border p-4 text-left transition disabled:opacity-50 ${form.pmocMode === 'NEW' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}
              >
                <strong className="block text-sm">Criar novo PMOC</strong>
                <span className="mt-1 block text-caption">
                  Cadastra o plano; ao continuar, o sistema cria a Operation e a OS oficial.
                </span>
              </button>
              <button
                type="button"
                onClick={() => onSet('pmocMode', 'EXISTING')}
                className={`rounded-[var(--radius-lg)] border p-4 text-left transition ${form.pmocMode === 'EXISTING' ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)]'}`}
              >
                <strong className="block text-sm">Selecionar PMOC existente</strong>
                <span className="mt-1 block text-caption">
                  Seleciona, ajusta, desativa ou remove um plano já cadastrado.
                </span>
              </button>
            </div>

            {form.pmocMode === 'EXISTING' && (
              <Field label="Plano PMOC">
                <select value={form.pmocId} onChange={(event) => void onPmoc(event.target.value)}>
                  <option value="">Selecione…</option>
                  {pmocs.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.maintenancePlan?.name ??
                        `PMOC-${String(item.number).padStart(6, '0')}`}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {form.pmocMode === 'EXISTING' && pmocs.length === 0 && (
              <p className="rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                Nenhum plano PMOC ativo foi encontrado. Utilize “Criar novo PMOC”.
              </p>
            )}

            {(form.pmocMode === 'NEW' || (form.pmocMode === 'EXISTING' && form.pmocId)) && (
              <div className="grid gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-4 md:grid-cols-2">
                <Field label="Responsável técnico do PMOC">
                  <input
                    value={form.pmocResponsible}
                    maxLength={150}
                    onChange={(event) => onSet('pmocResponsible', event.target.value)}
                  />
                </Field>
                <Field label="Periodicidade oficial">
                  <select
                    value={form.pmocPeriodicity}
                    onChange={(event) =>
                      onSet(
                        'pmocPeriodicity',
                        event.target.value as WorkflowForm['pmocPeriodicity'],
                      )
                    }
                  >
                    <option value="WEEKLY">Semanal</option>
                    <option value="BIWEEKLY">Quinzenal</option>
                    <option value="MONTHLY">Mensal</option>
                    <option value="BIMONTHLY">Bimestral</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="FOUR_MONTHLY">Quadrimestral</option>
                    <option value="SEMIANNUAL">Semestral</option>
                    <option value="YEARLY">Anual</option>
                    <option value="CUSTOM">Personalizada</option>
                  </select>
                </Field>
                <MultiSelect
                  label="Equipamentos controlados"
                  options={equipments.map((item) => ({
                    value: item.id,
                    label: item.name,
                    description: item.tag ?? undefined,
                  }))}
                  value={form.pmocEquipmentIds}
                  onChange={(value) => onSet('pmocEquipmentIds', value)}
                  emptyMessage="Selecione primeiro um cliente com equipamentos ativos."
                />
                <Field label="Modo de geração da OS">
                  <select
                    value={form.pmocGenerationMode}
                    onChange={(event) =>
                      onSet(
                        'pmocGenerationMode',
                        event.target.value as WorkflowForm['pmocGenerationMode'],
                      )
                    }
                  >
                    <option value="MANUAL">Manual — revisão no wizard</option>
                    <option value="AUTO">Automática — Scheduler</option>
                    <option value="PAUSED">Pausada</option>
                  </select>
                </Field>
                <Field label="Operador padrão (opcional)">
                  <select
                    value={form.pmocDefaultOperatorId}
                    onChange={(event) => onSet('pmocDefaultOperatorId', event.target.value)}
                  >
                    <option value="">Definir na geração</option>
                    {users
                      .filter((item) => item.isActive && item.role !== 'VIEWER')
                      .map((item) => (
                        <option key={item.id} value={item.id}>{item.name} · {item.role}</option>
                      ))}
                  </select>
                </Field>
                <Field label="Técnico padrão (opcional)">
                  <select
                    value={form.pmocDefaultTechnicianId}
                    onChange={(event) => onSet('pmocDefaultTechnicianId', event.target.value)}
                  >
                    <option value="">Sem técnico padrão</option>
                    {users
                      .filter((item) => item.isActive && item.role !== 'VIEWER')
                      .map((item) => (
                        <option key={item.id} value={item.id}>{item.name} · {item.role}</option>
                      ))}
                  </select>
                </Field>
                <Field label="Assinatura override (opcional)">
                  <select
                    value={form.pmocSignatureOverrideId}
                    onChange={(event) => onSet('pmocSignatureOverrideId', event.target.value)}
                  >
                    <option value="">Política oficial do Template</option>
                    {signatures.filter((item) => item.active).map((item) => (
                      <option key={item.id} value={item.id}>{item.name} · {item.title}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Início da vigência">
                  <input
                    type="date"
                    value={form.pmocStartDate}
                    onChange={(event) => onSet('pmocStartDate', event.target.value)}
                  />
                </Field>
                <Field label="Fim da vigência">
                  <input
                    type="date"
                    value={form.pmocEndDate}
                    onChange={(event) => onSet('pmocEndDate', event.target.value)}
                  />
                </Field>
                {form.pmocPeriodicity === 'CUSTOM' && <Field label="Recorrência personalizada">
                  <select
                    value={form.pmocRecurrenceFrequency}
                    onChange={(event) =>
                      onSet(
                        'pmocRecurrenceFrequency',
                        event.target.value as WorkflowForm['pmocRecurrenceFrequency'],
                      )
                    }
                  >
                    <option value="DAILY">Diária</option>
                    <option value="WEEKLY">Semanal</option>
                    <option value="MONTHLY">Mensal</option>
                    <option value="YEARLY">Anual</option>
                    <option value="INTERVAL_DAYS">Intervalo em dias</option>
                    <option value="INTERVAL_MONTHS">Intervalo em meses</option>
                  </select>
                </Field>}
                {form.pmocPeriodicity === 'CUSTOM' && <Field label="Intervalo">
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={form.pmocRecurrenceInterval}
                    onChange={(event) => onSet('pmocRecurrenceInterval', event.target.value)}
                  />
                </Field>}
                <div className="md:col-span-2">
                  <Field label="Cobertura do plano">
                    <textarea
                      value={form.pmocCoverage}
                      maxLength={5000}
                      rows={3}
                      onChange={(event) => onSet('pmocCoverage', event.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Observações do plano">
                  <input
                    value={form.pmocObservations}
                    maxLength={5000}
                    onChange={(event) => onSet('pmocObservations', event.target.value)}
                  />
                </Field>
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.pmocActive}
                    onChange={(event) => onSet('pmocActive', event.target.checked)}
                  />
                  Plano ativo
                </label>
                {canCreatePmoc && (
                  <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
                    {form.pmocMode === 'EXISTING' && (
                      <button
                        type="button"
                        disabled={creatingPmoc}
                        onClick={onDeletePmoc}
                        className="h-9 rounded-[var(--radius-md)] border border-red-500/40 px-4 text-sm text-red-700 disabled:opacity-50"
                      >
                        Remover plano
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={creatingPmoc}
                      onClick={form.pmocMode === 'NEW' ? onCreatePmoc : onUpdatePmoc}
                      className="h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
                    >
                      {creatingPmoc
                        ? 'Salvando…'
                        : form.pmocMode === 'NEW'
                          ? 'Criar PMOC'
                          : 'Salvar ajustes'}
                    </button>
                    {form.pmocMode === 'EXISTING' && form.pmocId && (
                      <button
                        type="button"
                        disabled={creatingPmoc || form.pmocGenerationMode === 'PAUSED'}
                        onClick={onGeneratePmocWorkOrder}
                        className="h-9 rounded-[var(--radius-md)] border border-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary)] disabled:opacity-50"
                      >
                        {pmocOperation ? 'Abrir Ordem de Serviço' : 'Gerar Ordem de Serviço'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <Field label="Cliente">
          <select
            value={form.customerId}
            disabled={type === 'PMOC' && form.pmocMode === 'EXISTING' && Boolean(form.pmocId)}
            onChange={(event) => {
              onSet('customerId', event.target.value);
              onSet('addressId', '');
              onSet('equipmentId', '');
              onSet('pmocEquipmentIds', []);
              onSet('inspectedEquipments', []);
            }}
          >
            <option value="">Selecione…</option>
            {customers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.tradeName ?? item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Endereço">
          <select
            value={form.addressId}
            onChange={(event) => onSet('addressId', event.target.value)}
          >
            <option value="">Endereço principal</option>
            {addresses.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name ?? 'Endereço'} · {item.street ?? 'logradouro não informado'}
              </option>
            ))}
          </select>
        </Field>
        {type !== 'TECHNICAL_REPORT' && type !== 'TECHNICAL_OPINION' && type !== 'PMOC' && (
          <Field label="Equipamento">
            <select
              value={form.equipmentId}
              onChange={(event) => onSet('equipmentId', event.target.value)}
            >
              <option value="">Sem equipamento</option>
              {equipments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.tag}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Responsável">
          <select
            value={form.operatorId}
            onChange={(event) => {
              onSet('operatorId', event.target.value);
              if (type === 'PMOC' && form.pmocMode === 'NEW') {
                const selected = users.find((item) => item.id === event.target.value);
                if (selected) {
                  onSet('pmocResponsible', selected.name);
                  onSet('pmocDefaultOperatorId', selected.id);
                }
              }
            }}
          >
            <option value="">Selecione…</option>
            {users
              .filter((item) => item.isActive)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.role}
                </option>
              ))}
          </select>
        </Field>
      </div>
      {type === 'TECHNICAL_OPINION' && selectedCustomer && (
        <RequesterSummary customer={selectedCustomer} addressId={form.addressId} />
      )}
    </div>
  );
}

function RequesterSummary({
  customer,
  addressId,
}: {
  customer: CustomerDetail;
  addressId: string;
}) {
  const contact = customer.contacts.find((item) => item.isPrimary) ?? customer.contacts[0] ?? null;
  const address =
    customer.addresses.find((item) => item.id === addressId) ??
    customer.addresses.find((item) => item.isPrimary) ??
    customer.addresses[0] ??
    null;
  const addressText = address
    ? [
        address.street,
        address.number,
        address.complement,
        address.district,
        address.city && address.state ? `${address.city}/${address.state}` : address.city,
      ]
        .filter(Boolean)
        .join(' · ')
    : 'Não informado';
  const contactText = [
    contact?.name,
    contact?.role,
    contact?.phone ?? customer.phone,
    contact?.email ?? customer.email,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-4">
      <h3 className="text-sm font-semibold">Dados do solicitante no Laudo</h3>
      <p className="mt-1 text-caption">
        Informações carregadas do cadastro do cliente e utilizadas pelo Preview e PDF.
      </p>
      <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-caption">Razão Social</dt>
          <dd>{customer.name}</dd>
        </div>
        <div>
          <dt className="text-caption">Documento (CNPJ/CPF)</dt>
          <dd>{customer.cnpj ?? customer.cpf ?? 'Não informado'}</dd>
        </div>
        <div>
          <dt className="text-caption">Contato</dt>
          <dd>{contactText || 'Não informado'}</dd>
        </div>
        <div>
          <dt className="text-caption">Endereço</dt>
          <dd>{addressText}</dd>
        </div>
      </dl>
    </section>
  );
}

function ContentStep({
  type,
  form,
  equipments,
  signatures,
  checklistTemplates,
  checklistTemplatesLoading,
  canManageChecklist,
  onCreateChecklist,
  onSet,
}: {
  type: DocumentKind;
  form: WorkflowForm;
  equipments: EquipmentSummary[];
  signatures: Signature[];
  checklistTemplates: MaintenanceChecklistTemplate[];
  checklistTemplatesLoading: boolean;
  canManageChecklist: boolean;
  onCreateChecklist: (description: string) => Promise<MaintenanceChecklistTemplate>;
  onSet: <K extends keyof WorkflowForm>(key: K, value: WorkflowForm[K]) => void;
}) {
  const [newChecklistDescription, setNewChecklistDescription] = useState('');
  const [creatingChecklist, setCreatingChecklist] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const contextualAreas = technicalCatalogAreas(
    equipments.filter((equipment) =>
      form.inspectedEquipments.some((selected) => selected.equipmentId === equipment.id),
    ),
  );

  const selectedChecklistItems = form.maintenanceChecklist.filter(
    (item) => item.maintenanceType === form.maintenanceType,
  );
  const selectedChecklistTemplateIds = checklistTemplates
    .filter((template) =>
      selectedChecklistItems.some(
        (item) =>
          item.templateId === template.id ||
          (!item.templateId && item.description === template.description),
      ),
    )
    .map((template) => template.id);

  function selectChecklistTemplates(templateIds: string[]) {
    const selectedIds = new Set(templateIds);
    const customItems = selectedChecklistItems.filter(
      (item) =>
        !checklistTemplates.some(
          (template) =>
            template.id === item.templateId ||
            (!item.templateId && template.description === item.description),
        ),
    );
    const catalogItems = checklistTemplates
      .filter((template) => selectedIds.has(template.id))
      .map((template) => {
        const current = selectedChecklistItems.find(
          (item) => item.templateId === template.id || item.description === template.description,
        );
        return (
          current ?? {
            templateId: template.id,
            maintenanceType: template.maintenanceType,
            description: template.description,
            executed: false,
            result: 'NO' as const,
            observations: '',
          }
        );
      });
    onSet('maintenanceChecklist', [...customItems, ...catalogItems]);
  }

  async function createChecklist() {
    const description = newChecklistDescription.trim();
    if (description.length < 3) return;
    setCreatingChecklist(true);
    setChecklistError(null);
    try {
      const created = await onCreateChecklist(description);
      onSet('maintenanceChecklist', [
        ...selectedChecklistItems,
        {
          templateId: created.id,
          maintenanceType: created.maintenanceType,
          description: created.description,
          executed: false,
          result: 'NO',
          observations: '',
        },
      ]);
      setNewChecklistDescription('');
    } catch (cause) {
      setChecklistError(message(cause));
    } finally {
      setCreatingChecklist(false);
    }
  }

  if (type === 'WORK_ORDER') {
    if (form.workOrderSource === 'EXISTING')
      return (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-4">
          <strong className="text-sm">Dados carregados da Operation</strong>
          <p className="mt-1 text-caption">
            A ordem utilizará os dados operacionais persistidos, incluindo equipamentos, checklist,
            fotos e assinatura. Para corrigi-los, edite a Operation de origem.
          </p>
        </div>
      );
    return (
      <div className="space-y-5">
        <InspectedEquipmentSelector form={form} equipments={equipments} onSet={onSet} />
        <Area
          label="Defeito ou solicitação informada"
          value={form.objective}
          onChange={(value) => onSet('objective', value)}
        />
        <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <div>
            <h3 className="text-sm font-semibold">Serviços executados / Checklist da execução</h3>
            <p className="text-caption">
              Informe o resumo técnico e, quando necessário, detalhe uma atividade por linha.
            </p>
          </div>
          <Area
            label="Resumo dos serviços executados"
            value={form.analysis}
            onChange={(value) => onSet('analysis', value)}
          />
          <Area
            label="Atividades do checklist — uma por linha"
            value={form.checklist}
            onChange={(value) => onSet('checklist', value)}
          />
        </section>
        <Area
          label="Observações e resultado operacional"
          value={form.observations}
          onChange={(value) => onSet('observations', value)}
        />
      </div>
    );
  }
  if (type === 'RECEIPT')
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Text
          label="Referência"
          value={form.reference}
          onChange={(value) => onSet('reference', value)}
        />
        <Text
          label="Valor recebido"
          value={form.amount}
          onChange={(value) => onSet('amount', value)}
          inputMode="decimal"
        />
        <Text
          label="Recebido de"
          value={form.receivedFrom}
          onChange={(value) => onSet('receivedFrom', value)}
        />
        <Area
          label="Observações"
          value={form.observations}
          onChange={(value) => onSet('observations', value)}
        />
      </div>
    );
  if (type === 'TECHNICAL_OPINION')
    return (
      <div className="space-y-5">
        <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <div>
            <h3 className="text-sm font-semibold">Responsabilidade técnica</h3>
            <p className="text-caption">
              Estes dados identificam o profissional responsável no Preview e no PDF do Laudo.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Responsável Técnico">
              <select
                value={form.technicalSignatureId}
                onChange={(event) => {
                  const signature = signatures.find((item) => item.id === event.target.value);
                  onSet('technicalSignatureId', event.target.value);
                  onSet('technicalResponsible', signature?.name ?? '');
                  onSet('technicalCrea', signature?.professionalCouncil ?? 'Não consta');
                }}
              >
                <option value="">Selecione uma assinatura institucional…</option>
                {signatures.map((signature) => (
                  <option key={signature.id} value={signature.id}>
                    {[signature.name, signature.title, signature.department]
                      .filter(Boolean)
                      .join(' · ')}
                  </option>
                ))}
              </select>
            </Field>
            <Text
              label="CREA / Registro profissional"
              value={form.technicalCrea}
              onChange={(value) => onSet('technicalCrea', value)}
            />
          </div>
        </section>
        <InspectedEquipmentSelector
          form={form}
          equipments={equipments}
          technicalOpinion
          onSet={onSet}
        />
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Objetivo</h3>
          <TechnicalCatalogSelector
            type="OBJECTIVE"
            areas={contextualAreas}
            workflow="TECHNICAL_OPINION"
            label="Objetivo"
            values={form.objectiveItems}
            onChange={(values) => onSet('objectiveItems', values)}
          />
          <Area
            label="Esclarecimento técnico sobre o objetivo"
            value={form.objective}
            onChange={(value) => onSet('objective', value)}
          />
          <p className="text-xs text-[var(--color-muted-foreground)]">
            O texto acima será o conteúdo principal; os itens selecionados serão exibidos abaixo em
            uma lista complementar.
          </p>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Condições observadas</h3>
          <TechnicalCatalogSelector
            type="SITE_CONDITION"
            areas={contextualAreas}
            workflow="TECHNICAL_OPINION"
            label="Condição"
            values={catalogLines(form.siteConditions)}
            onChange={(values) => onSet('siteConditions', values.join('\n'))}
          />
          <Area
            label="Condições — edição textual completa"
            value={form.siteConditions}
            onChange={(value) => onSet('siteConditions', value)}
          />
        </section>
        <Area
          label="Análise técnica"
          value={form.analysis}
          onChange={(value) => onSet('analysis', value)}
        />
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Recomendações</h3>
          <TechnicalCatalogSelector
            type="RECOMMENDATION"
            areas={contextualAreas}
            workflow="TECHNICAL_OPINION"
            label="Recomendação"
            values={catalogLines(form.recommendations)}
            onChange={(values) => onSet('recommendations', values.join('\n'))}
          />
          <Area
            label="Recomendações — edição textual completa"
            value={form.recommendations}
            onChange={(value) => onSet('recommendations', value)}
          />
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Conclusão</h3>
          <TechnicalCatalogSelector
            type="CONCLUSION"
            areas={contextualAreas}
            workflow="TECHNICAL_OPINION"
            label="Conclusão"
            values={form.conclusionItems}
            onChange={(values) => onSet('conclusionItems', values)}
          />
          <Area
            label="Conclusão e esclarecimento do responsável técnico"
            value={form.conclusion}
            onChange={(value) => onSet('conclusion', value)}
          />
          <p className="text-xs text-[var(--color-muted-foreground)]">
            A conclusão livre é obrigatória e permanece em destaque antes dos itens predefinidos.
          </p>
        </section>
      </div>
    );
  if (type === 'PMOC')
    return (
      <div className="space-y-5">
        <InspectedEquipmentSelector form={form} equipments={equipments} onSet={onSet} />
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Periodicidade da execução">
            <select
              value={form.maintenanceType}
              onChange={(event) => {
                onSet('maintenanceType', event.target.value as OperationMaintenanceType);
                onSet('maintenanceChecklist', []);
              }}
            >
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensal</option>
              <option value="QUARTERLY">Trimestral</option>
              <option value="SEMIANNUAL">Semestral</option>
              <option value="ANNUAL">Anual</option>
              <option value="CORRECTIVE">Corretiva</option>
            </select>
          </Field>
          <MultiSelect
            label="Procedimentos do catálogo PMOC"
            options={checklistTemplates.map((template) => ({ value: template.id, label: template.description }))}
            value={selectedChecklistTemplateIds}
            onChange={selectChecklistTemplates}
            placeholder={checklistTemplatesLoading ? 'Carregando procedimentos…' : 'Selecionar procedimentos'}
            emptyMessage="Nenhum procedimento cadastrado para esta periodicidade."
          />
        </div>
        <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <div>
            <h3 className="text-sm font-semibold">Checklist por equipamento</h3>
            <p className="text-caption">Cada resultado é persistido como snapshot da execução. Selecione Sim, Não ou N.A. e registre a observação quando necessário.</p>
          </div>
          {selectedChecklistItems.map((item, index) => (
            <div key={item.templateId ?? `${item.description}-${index}`} className="grid gap-2 rounded-[var(--radius-md)] bg-[var(--color-muted)]/50 p-3 md:grid-cols-[1.2fr_1.6fr_130px_1.3fr_auto] md:items-center">
              <select
                aria-label={`Equipamento de ${item.description}`}
                value={item.equipmentId ?? ''}
                onChange={(event) => onSet('maintenanceChecklist', selectedChecklistItems.map((current, currentIndex) => currentIndex === index ? { ...current, equipmentId: event.target.value || undefined } : current))}
              >
                <option value="">Procedimento geral</option>
                {form.inspectedEquipments.map((selected) => {
                  const equipment = equipments.find((candidate) => candidate.id === selected.equipmentId);
                  return <option key={selected.equipmentId} value={selected.equipmentId}>{equipment?.name ?? selected.equipmentId}</option>;
                })}
              </select>
              <span className="text-sm">{item.description}</span>
              <select
                aria-label={`Resultado de ${item.description}`}
                value={item.result}
                onChange={(event) => onSet('maintenanceChecklist', selectedChecklistItems.map((current, currentIndex) => currentIndex === index ? { ...current, result: event.target.value as 'YES' | 'NO' | 'NOT_APPLICABLE', executed: event.target.value === 'YES' } : current))}
              >
                <option value="YES">Sim</option>
                <option value="NO">Não</option>
                <option value="NOT_APPLICABLE">N.A.</option>
              </select>
              <input value={item.observations} maxLength={2000} onChange={(event) => onSet('maintenanceChecklist', selectedChecklistItems.map((current, currentIndex) => currentIndex === index ? { ...current, observations: event.target.value } : current))} placeholder="Observação" className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm" />
              <button type="button" aria-label={`Remover ${item.description}`} onClick={() => onSet('maintenanceChecklist', selectedChecklistItems.filter((_, currentIndex) => currentIndex !== index))} className="rounded-md p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-danger)]"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </section>
        <Area label="Objetivo e detalhes da execução" value={form.objective} onChange={(value) => onSet('objective', value)} />
        <Area label="Observações e conclusão" value={form.observations} onChange={(value) => onSet('observations', value)} />
      </div>
    );
  if (type === 'TECHNICAL_REPORT')
    return (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Mês de referência">
            <select
              value={form.referenceMonth}
              onChange={(event) => onSet('referenceMonth', event.target.value)}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(
                    new Date(2026, index, 1),
                  )}
                </option>
              ))}
            </select>
          </Field>
          <Text
            label="Ano de referência"
            value={form.referenceYear}
            onChange={(value) => onSet('referenceYear', value)}
          />
          <Field label="Tipo de manutenção">
            <select
              value={form.maintenanceType}
              onChange={(event) => {
                onSet('maintenanceType', event.target.value as OperationMaintenanceType);
                onSet('maintenanceChecklist', []);
              }}
            >
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensal</option>
              <option value="QUARTERLY">Trimestral</option>
              <option value="SEMIANNUAL">Semestral</option>
              <option value="ANNUAL">Anual</option>
              <option value="CORRECTIVE">Corretiva</option>
            </select>
          </Field>
        </div>
        <InspectedEquipmentSelector form={form} equipments={equipments} onSet={onSet} />
        <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
          <div>
            <h3 className="text-sm font-semibold">Checklist de manutenção</h3>
            <p className="text-caption">
              Use atividades padronizadas e registre somente a execução e a observação desta visita.
            </p>
          </div>
          <MultiSelect
            label="Atividades do checklist"
            options={checklistTemplates.map((template) => ({
              value: template.id,
              label: template.description,
            }))}
            value={selectedChecklistTemplateIds}
            onChange={selectChecklistTemplates}
            placeholder={checklistTemplatesLoading ? 'Carregando atividades…' : 'Buscar atividades'}
            emptyMessage="Nenhuma atividade cadastrada para esta periodicidade."
          />
          {selectedChecklistItems.map((item, index) => (
            <div
              key={item.templateId ?? `${item.description}-${index}`}
              className="grid gap-2 rounded-[var(--radius-md)] bg-[var(--color-muted)]/50 p-3 md:grid-cols-[auto_1fr_280px_auto] md:items-center"
            >
              <input
                type="checkbox"
                checked={item.executed}
                aria-label={`Marcar ${item.description} como executada`}
                onChange={(event) =>
                  onSet(
                    'maintenanceChecklist',
                    selectedChecklistItems.map((current, currentIndex) =>
                      currentIndex === index
                        ? { ...current, executed: event.target.checked }
                        : current,
                    ),
                  )
                }
              />
              <span className="text-sm">{item.description}</span>
              <input
                value={item.observations}
                maxLength={2000}
                onChange={(event) =>
                  onSet(
                    'maintenanceChecklist',
                    selectedChecklistItems.map((current, currentIndex) =>
                      currentIndex === index
                        ? { ...current, observations: event.target.value }
                        : current,
                    ),
                  )
                }
                placeholder="Observação opcional"
                className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
              />
              <button
                type="button"
                aria-label={`Remover ${item.description}`}
                onClick={() =>
                  onSet(
                    'maintenanceChecklist',
                    selectedChecklistItems.filter((_, currentIndex) => currentIndex !== index),
                  )
                }
                className="rounded-md p-2 text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-danger)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {canManageChecklist && (
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={newChecklistDescription}
                maxLength={500}
                onChange={(event) => setNewChecklistDescription(event.target.value)}
                placeholder="Nova atividade para esta periodicidade"
                className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
              />
              <button
                type="button"
                disabled={creatingChecklist || newChecklistDescription.trim().length < 3}
                onClick={() => void createChecklist()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> {creatingChecklist ? 'Adicionando…' : 'Adicionar novo'}
              </button>
            </div>
          )}
          {checklistError && <p className="text-sm text-[var(--color-danger)]">{checklistError}</p>}
        </section>
        <section className="space-y-2">
          <TechnicalCatalogSelector
            type="OBJECTIVE"
            label="Objetivo"
            areas={contextualAreas}
            workflow="TECHNICAL_REPORT"
            values={catalogLines(form.objective)}
            onChange={(values) => onSet('objective', values.join('\n'))}
          />
          <Area label="Objetivo da visita" value={form.objective} onChange={(value) => onSet('objective', value)} />
        </section>
        <section className="space-y-2">
          <TechnicalCatalogSelector
            type="SITE_CONDITION"
            label="Condição"
            areas={contextualAreas}
            workflow="TECHNICAL_REPORT"
            values={catalogLines(form.diagnosis)}
            onChange={(values) => onSet('diagnosis', values.join('\n'))}
          />
          <Area label="Diagnóstico ou situação encontrada" value={form.diagnosis} onChange={(value) => onSet('diagnosis', value)} />
        </section>
        <Area
          label="Atividades executadas"
          value={form.analysis}
          onChange={(value) => onSet('analysis', value)}
        />
        <section className="space-y-2">
          <TechnicalCatalogSelector
            type="RECOMMENDATION"
            label="Recomendação"
            areas={contextualAreas}
            workflow="TECHNICAL_REPORT"
            values={catalogLines(form.recommendations)}
            onChange={(values) => onSet('recommendations', values.join('\n'))}
          />
          <Area label="Recomendações técnicas" value={form.recommendations} onChange={(value) => onSet('recommendations', value)} />
        </section>
        <Area
          label="Observações finais"
          value={form.observations}
          onChange={(value) => onSet('observations', value)}
        />
      </div>
    );
  return (
    <div className="space-y-4">
      <Area
        label="Objetivo da visita"
        value={form.objective}
        onChange={(value) => onSet('objective', value)}
      />
      <Area
        label="Observações"
        value={form.observations}
        onChange={(value) => onSet('observations', value)}
      />
    </div>
  );
}

function InspectedEquipmentSelector({
  form,
  equipments,
  technicalOpinion = false,
  onSet,
}: {
  form: WorkflowForm;
  equipments: EquipmentSummary[];
  technicalOpinion?: boolean;
  onSet: <K extends keyof WorkflowForm>(key: K, value: WorkflowForm[K]) => void;
}) {
  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
      <div>
        <h3 className="text-sm font-semibold">Equipamentos incluídos</h3>
        <p className="text-caption">
          Selecione os ativos que formarão a tabela do documento. A busca suporta clientes com
          muitos equipamentos.
        </p>
      </div>
      <MultiSelect
        label="Selecionar equipamentos"
        options={equipments.map((equipment) => ({
          value: equipment.id,
          label: `${equipment.name} · ${equipment.tag || 'sem tag'}`,
          description: [equipment.manufacturer, equipment.model, equipment.capacity]
            .filter(Boolean)
            .join(' · '),
        }))}
        value={form.inspectedEquipments.map((item) => item.equipmentId)}
        onChange={(equipmentIds) =>
          onSet(
            'inspectedEquipments',
            equipmentIds.map((equipmentId) => {
              const current = form.inspectedEquipments.find(
                (item) => item.equipmentId === equipmentId,
              );
              const equipment = equipments.find((item) => item.id === equipmentId);
              return (
                current ?? {
                  equipmentId,
                  sector: equipment?.address?.name || equipment?.name || 'Não informado',
                  systemType: technicalOpinion ? equipmentTypeLabel(equipment?.type) : '',
                  currentSituation: '',
                }
              );
            }),
          )
        }
        placeholder={
          equipments.length ? 'Buscar e selecionar equipamentos' : 'Cliente sem equipamentos'
        }
        emptyMessage="Nenhum equipamento encontrado para este cliente."
      />
      {form.inspectedEquipments.map((item) => {
        const equipment = equipments.find((candidate) => candidate.id === item.equipmentId);
        if (!equipment) return null;
        return (
          <div
            key={item.equipmentId}
            className={`grid gap-3 rounded-[var(--radius-md)] bg-[var(--color-muted)]/50 p-3 ${
              technicalOpinion ? 'md:grid-cols-2' : 'md:grid-cols-[1fr_260px_auto] md:items-center'
            }`}
          >
            <span className={`text-sm ${technicalOpinion ? 'md:col-span-2' : ''}`}>
              <strong>{equipment.name}</strong> · {equipment.manufacturer ?? 'Marca não informada'}{' '}
              · {equipment.model ?? 'Modelo não informado'}
            </span>
            {technicalOpinion && (
              <input
                aria-label={`Tipo de sistema de ${equipment.name}`}
                value={item.systemType}
                onChange={(event) =>
                  onSet(
                    'inspectedEquipments',
                    form.inspectedEquipments.map((current) =>
                      current.equipmentId === item.equipmentId
                        ? { ...current, systemType: event.target.value }
                        : current,
                    ),
                  )
                }
                placeholder="Tipo de sistema"
                className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
              />
            )}
            <input
              aria-label={`Setor de ${equipment.name}`}
              value={item.sector}
              onChange={(event) =>
                onSet(
                  'inspectedEquipments',
                  form.inspectedEquipments.map((current) =>
                    current.equipmentId === item.equipmentId
                      ? { ...current, sector: event.target.value }
                      : current,
                  ),
                )
              }
              placeholder={technicalOpinion ? 'Local de instalação' : 'Setor/ambiente'}
              className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
            />
            {technicalOpinion && (
              <input
                aria-label={`Situação atual de ${equipment.name}`}
                value={item.currentSituation}
                onChange={(event) =>
                  onSet(
                    'inspectedEquipments',
                    form.inspectedEquipments.map((current) =>
                      current.equipmentId === item.equipmentId
                        ? { ...current, currentSituation: event.target.value }
                        : current,
                    ),
                  )
                }
                placeholder="Situação atual"
                className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm"
              />
            )}
            <button
              type="button"
              aria-label={`Remover ${equipment.name}`}
              onClick={() =>
                onSet(
                  'inspectedEquipments',
                  form.inspectedEquipments.filter(
                    (current) => current.equipmentId !== item.equipmentId,
                  ),
                )
              }
              className={`rounded-md p-2 text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-danger)] ${technicalOpinion ? 'justify-self-end' : ''}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </section>
  );
}

function EvidenceStep({
  type,
  form,
  onSet,
}: {
  type: DocumentKind;
  form: WorkflowForm;
  onSet: <K extends keyof WorkflowForm>(key: K, value: WorkflowForm[K]) => void;
}) {
  if (type === 'WORK_ORDER' && form.workOrderSource === 'EXISTING')
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-4">
        <strong className="text-sm">Evidências da Operation</strong>
        <p className="mt-1 text-caption">
          Fotos e assinaturas existentes serão resolvidas pelo backend. Nenhum arquivo é duplicado
          neste fluxo.
        </p>
      </div>
    );
  return (
    <div className="space-y-5">
      {type !== 'WORK_ORDER' && (
        <Area
          label="Checklist — uma atividade por linha"
          value={form.checklist}
          onChange={(value) => onSet('checklist', value)}
        />
      )}
      {(type === 'PMOC' || type === 'WORK_ORDER') && (
        <Field label={type === 'PMOC' ? 'Fotos do PMOC' : 'Evidências fotográficas opcionais'}>
          <input
            type="file"
            accept="image/png,image/jpeg"
            multiple
            onChange={async (event) => {
              const files = Array.from(event.target.files ?? []).slice(0, 10);
              const photos = await Promise.all(
                files.map(async (file) => ({
                  dataUrl: await fileDataUrl(file),
                  caption: file.name,
                })),
              );
              onSet('photos', photos);
            }}
          />
          <span className="text-caption">{form.photos.length} foto(s) selecionada(s).</span>
        </Field>
      )}
      <div>
        <p className="mb-2 text-sm font-medium">
          Assinatura coletada, quando exigida pelo template
        </p>
        {type === 'PMOC' && (
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <Text label="Nome do cliente/responsável" value={form.customerSignerName} onChange={(value) => onSet('customerSignerName', value)} />
            <Text label="Função ou vínculo" value={form.customerSignerRole} onChange={(value) => onSet('customerSignerRole', value)} />
          </div>
        )}
        <SignaturePad
          onChange={(value) => onSet('signatureData', value)}
          onConfirm={(value) => onSet('signatureData', value)}
        />
      </div>
    </div>
  );
}

function contentFor(type: DocumentKind, form: WorkflowForm) {
  const checklist = form.checklist
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({
      label: line
        .replace(/^\[[ xX]\]\s*/, '')
        .split('|')[0]
        .trim(),
      done: !line.startsWith('[ ]'),
      note: line.split('|')[1]?.trim() || undefined,
    }));
  const common = {
    checklist,
    photos: type === 'PMOC' || type === 'WORK_ORDER' ? form.photos : [],
    signatureData: form.signatureData,
    customerSignerName: form.signatureData ? form.customerSignerName || undefined : undefined,
    customerSignerRole: form.signatureData ? form.customerSignerRole || undefined : undefined,
    signedAt: form.signatureData ? new Date().toISOString() : undefined,
  };
  if (type === 'RECEIPT')
    return {
      ...common,
      reportedIssue: form.reference,
      serviceDescription: `Valor recebido: R$ ${form.amount || '0,00'}\nRecebido de: ${form.receivedFrom || 'Não informado'}`,
      observations: form.observations,
    };
  if (type === 'TECHNICAL_OPINION')
    return {
      ...common,
      checklist: [],
      photos: [],
      technicalOpinionObjective: form.objective,
      technicalOpinionObjectiveItems: form.objectiveItems,
      technicalOpinionConditions: form.siteConditions,
      technicalOpinionAnalysis: form.analysis,
      technicalOpinionConclusion: form.conclusion,
      technicalOpinionConclusionItems: form.conclusionItems,
      technicalOpinionRecommendations: form.recommendations,
      technicalOpinionResponsible: form.technicalResponsible,
      technicalOpinionCrea: form.technicalCrea,
      inspectedEquipments: form.inspectedEquipments,
    };
  if (type === 'TECHNICAL_REPORT')
    return {
      ...common,
      reportedIssue: form.objective,
      technicalDiagnosis: form.diagnosis,
      serviceDescription: form.analysis,
      technicalRecommendations: form.recommendations,
      observations: form.observations,
      referenceMonth: Number(form.referenceMonth),
      referenceYear: Number(form.referenceYear),
      maintenanceType: form.maintenanceType,
      maintenanceChecklist: form.maintenanceChecklist.map((item) => ({
        maintenanceType: item.maintenanceType,
        description: item.description,
        executed: item.executed,
        observations: item.observations || undefined,
      })),
      inspectedEquipments: form.inspectedEquipments,
    };
  if (type === 'WORK_ORDER')
    return {
      ...common,
      reportedIssue: form.objective,
      serviceDescription: form.analysis,
      observations: form.observations,
      inspectedEquipments: form.inspectedEquipments,
    };
  if (type === 'PMOC')
    return {
      ...common,
      serviceDescription: form.objective,
      observations: form.observations,
      maintenanceType: form.maintenanceType,
      inspectedEquipments: form.inspectedEquipments,
      maintenanceChecklist: form.maintenanceChecklist.map((item) => ({
        equipmentId: item.equipmentId,
        maintenanceType: item.maintenanceType,
        description: item.description,
        executed: item.result === 'YES',
        result: item.result,
        observations: item.observations || undefined,
      })),
    };
  return {
    ...common,
    reportedIssue: form.objective,
    serviceDescription: undefined,
    observations: form.observations,
  };
}

function operationTypeFor(
  type: DocumentKind,
): 'PREVENTIVA' | 'CORRETIVA' | 'INSTALACAO' | 'PROJETO' {
  return type === 'PMOC' ? 'PREVENTIVA' : type === 'TECHNICAL_OPINION' ? 'CORRETIVA' : 'PROJETO';
}
function catalogLines(value: string): string[] {
  return value
    .split(/\r?\n/u)
    .map((line) => line.replace(/^\s*[-•*]\s*/u, '').trim())
    .filter(Boolean);
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
function equipmentTypeLabel(type?: EquipmentSummary['type']): string {
  if (!type) return '';
  const labels: Record<EquipmentSummary['type'], string> = {
    SPLIT: 'Split',
    CONDENSER: 'Unidade condensadora',
    EVAPORATOR: 'Unidade evaporadora',
    CHILLER: 'Chiller',
    AIR_HANDLER: 'Unidade de tratamento de ar',
    SOLAR_INVERTER: 'Inversor solar',
    ELECTRICAL_PANEL: 'Painel elétrico',
    GENERATOR: 'Gerador',
    OTHER: 'Outro sistema',
  };
  return labels[type];
}
function message(cause: unknown) {
  return cause instanceof ApiClientError || cause instanceof Error
    ? cause.message
    : 'Não foi possível preparar o documento.';
}
function fileDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <span className="text-caption">{label}</span>
      <strong className="mt-1 block text-2xl">{value}</strong>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium [&_input]:h-10 [&_input]:rounded-[var(--radius-md)] [&_input]:border [&_input]:border-[var(--color-border)] [&_input]:bg-[var(--color-card)] [&_input]:px-3 [&_select]:h-10 [&_select]:rounded-[var(--radius-md)] [&_select]:border [&_select]:border-[var(--color-border)] [&_select]:bg-[var(--color-card)] [&_select]:px-3">
      {label}
      {children}
    </label>
  );
}
function Text({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: 'decimal';
}) {
  return (
    <Field label={label}>
      <input
        value={value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm"
      />
    </label>
  );
}
