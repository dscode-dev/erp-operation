"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, FileCheck2, FileText, Plus, ReceiptText, RefreshCw, ShieldCheck } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { Pagination } from "@platform/components/pagination";
import {
  ApiClientError,
  customersApi,
  documentsApi,
  equipmentsApi,
  maintenanceApi,
  operationApi,
  pmocApi,
  usersApi,
  useQuery,
  type Customer,
  type CustomerAddress,
  type DocumentCatalogItem,
  type DocumentConfiguration,
  type DocumentKind,
  type EquipmentSummary,
  type OperationDetail,
  type OperationSummary,
  type Paginated,
  type PmocPlan,
  type TeamUser,
} from "@erp/api";
import { Gate } from "@erp/ui/auth/gate";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { Drawer } from "@erp/ui/drawer";
import { EmptyState } from "@erp/ui/empty-state";
import { SkeletonCard } from "@erp/ui/skeletons";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { SignaturePad } from "@erp/ui/documents/signature-pad";
import { DOCUMENT_KIND_LABEL } from "@erp/types";
import { formatDate } from "@erp/utils";

const REPORT_TYPES: Array<{ type: DocumentKind; title: string; description: string; icon: typeof FileText }> = [
  { type: "WORK_ORDER", title: "Ordem de Serviço", description: "Emitida exclusivamente a partir de uma Operation existente.", icon: ClipboardCheck },
  { type: "TECHNICAL_REPORT", title: "Relatório de Visita Técnica", description: "Visita, atividades, fotos, observações e assinaturas.", icon: FileText },
  { type: "TECHNICAL_OPINION", title: "Laudo Técnico", description: "Diagnóstico, análise, conclusão e responsabilidade técnica.", icon: FileCheck2 },
  { type: "PMOC", title: "PMOC", description: "Plano, ambientes, checklist, medições e pendências operacionais.", icon: ShieldCheck },
  { type: "RECEIPT", title: "Recibo", description: "Referência, valor recebido, observações e assinatura.", icon: ReceiptText },
];

type WorkflowForm = {
  operationId: string; customerId: string; addressId: string; equipmentId: string; operatorId: string; pmocId: string;
  objective: string; diagnosis: string; observations: string; analysis: string; recommendations: string; conclusion: string; reference: string; amount: string; receivedFrom: string;
  checklist: string; signatureData: string | null; photos: Array<{ dataUrl: string; caption: string }>;
};

const emptyForm: WorkflowForm = {
  operationId: "", customerId: "", addressId: "", equipmentId: "", operatorId: "", pmocId: "",
  objective: "", diagnosis: "", observations: "", analysis: "", recommendations: "", conclusion: "", reference: "", amount: "", receivedFrom: "",
  checklist: "", signatureData: null, photos: [],
};

export default function ReportCenterPage() {
  const { hasRole } = useAuth();
  const [workflow, setWorkflow] = useState<{ type: DocumentKind; operationId?: string } | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentCatalogItem | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<DocumentKind | "">("");
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const documents = useQuery<Paginated<DocumentCatalogItem>>(
    (signal) => documentsApi.listDocuments({ page, limit: 10, search: search || undefined, type: filterType || undefined, signal }),
    [page, search, filterType, tick],
  );
  const supported = new Set(REPORT_TYPES.map((item) => item.type));
  const availableReports = REPORT_TYPES.filter((item) => item.type !== "RECEIPT" || hasRole("OWNER"));
  const items = (documents.data?.items ?? []).filter((item) => supported.has(item.type));
  const metrics = useMemo(() => ({
    total: documents.data?.pagination.total ?? 0,
    ready: items.filter((item) => item.status === "READY").length,
    draft: items.filter((item) => item.status === "DRAFT").length,
    rendered: items.filter((item) => item.renderedAt).length,
  }), [documents.data, items]);

  return (
    <Gate permission="canReports" fallback={<EmptyState icon={FileText} title="Central de Relatórios indisponível" description="Seu perfil não possui acesso ao módulo." />}>
      <div className="space-y-6">
        <PageHeader eyebrow="Gestão" title="Central de Relatórios" description="Emissão oficial de documentos pelo Document Engine. Modelos são administrados separadamente em Cadastros." />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Documentos" value={metrics.total} />
          <Metric label="Prontos" value={metrics.ready} />
          <Metric label="Rascunhos" value={metrics.draft} />
          <Metric label="Renderizados na página" value={metrics.rendered} />
        </div>

        <section className="space-y-3">
          <div><h2 className="text-section-title">Nova emissão</h2><p className="text-caption">Escolha o workflow; template, branding e política de assinatura serão resolvidos pelo backend.</p></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {availableReports.map(({ type: reportType, title, description, icon: Icon }) => (
              <button key={reportType} type="button" onClick={() => setWorkflow({ type: reportType })} className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--color-primary)]/50 hover:shadow-[var(--shadow-card)]">
                <span className="inline-flex rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 p-2 text-[var(--color-primary)]"><Icon className="h-5 w-5" /></span>
                <strong className="mt-3 block text-sm">{title}</strong><span className="mt-1 block text-xs text-[var(--color-muted-foreground)]">{description}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)]"><Plus className="h-3.5 w-3.5" /> Iniciar</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><h2 className="text-section-title">Histórico de emissões</h2><p className="text-caption">Mesmos registros exibidos no repositório Documentos.</p></div>
            <div className="flex gap-2">
              <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar número, cliente…" className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm" />
              <select value={filterType} onChange={(event) => { setFilterType(event.target.value as DocumentKind | ""); setPage(1); }} className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-sm">
                <option value="">Todos os tipos</option>{REPORT_TYPES.map((item) => <option key={item.type} value={item.type}>{item.title}</option>)}
              </select>
            </div>
          </div>
          {documents.loading ? <SkeletonCard /> : documents.error ? <EmptyState icon={RefreshCw} title="Falha ao carregar emissões" description={String(documents.error)} action={<button onClick={documents.refetch}>Tentar novamente</button>} /> : items.length === 0 ? <EmptyState icon={FileText} title="Nenhuma emissão encontrada" description="Inicie um workflow acima para criar o primeiro documento." /> : (
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]">
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[var(--color-border)] text-left text-caption"><th className="px-4 py-3">Número</th><th>Tipo</th><th>Cliente</th><th>Equipamento</th><th>Status</th><th>Emissão</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} onClick={() => setSelectedDocument(item)} className="cursor-pointer border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-muted)]/60"><td className="px-4 py-3 font-medium">{item.number}</td><td>{DOCUMENT_KIND_LABEL[item.type]}</td><td>{item.customer?.name ?? "—"}</td><td>{item.equipment?.name ?? "—"}</td><td>{item.status}</td><td>{formatDate(item.renderedAt ?? item.issuedAt)}</td></tr>)}</tbody></table></div>
            </div>
          )}
          {documents.data && <Pagination pagination={documents.data.pagination} onPageChange={setPage} onPageSizeChange={() => undefined} pageSizeOptions={[10]} />}
        </section>

        {workflow && <ReportWorkflowDrawer type={workflow.type} initialOperationId={workflow.operationId} onClose={() => setWorkflow(null)} onRendered={() => setTick((value) => value + 1)} />}
        <Drawer open={Boolean(selectedDocument)} onClose={() => setSelectedDocument(null)} title={selectedDocument?.number ?? "Documento"} eyebrow="Histórico da emissão" width="max-w-[1180px]">
          {selectedDocument && <div className="space-y-4">{selectedDocument.origin === "OPERATION" && selectedDocument.originId && <button type="button" onClick={() => { setWorkflow({ type: selectedDocument.type, operationId: selectedDocument.originId ?? undefined }); setSelectedDocument(null); }} className="rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-muted)]">Editar dados de origem</button>}<DocumentViewer source={{ documentId: selectedDocument.id }} canRender canDownload onRendered={() => setTick((value) => value + 1)} /></div>}
        </Drawer>
      </div>
    </Gate>
  );
}

function ReportWorkflowDrawer({ type, initialOperationId, onClose, onRendered }: { type: DocumentKind; initialOperationId?: string; onClose: () => void; onRendered: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WorkflowForm>(emptyForm);
  const [operation, setOperation] = useState<OperationDetail | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [equipments, setEquipments] = useState<EquipmentSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customers = useQuery<Paginated<Customer>>((signal) => customersApi.listCustomers({ page: 1, limit: 100, signal }), []);
  const users = useQuery<Paginated<TeamUser>>((signal) => usersApi.listUsers({ page: 1, limit: 100, signal }), []);
  const operations = useQuery<Paginated<OperationSummary>>((signal) => operationApi.listOperations({ page: 1, limit: 100, signal }), []);
  const pmocs = useQuery<Paginated<PmocPlan>>((signal) => pmocApi.listPmoc({ page: 1, limit: 100, active: true, signal }), []);
  const configuration = useQuery<DocumentConfiguration>((signal) => documentsApi.getConfigurationByType(type, { signal }), [type]);
  const isWorkOrder = type === "WORK_ORDER";

  useEffect(() => {
    if (initialOperationId) void selectOperation(initialOperationId);
  // Initial source is immutable for the drawer lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOperationId]);

  useEffect(() => {
    if (!form.customerId) { setAddresses([]); setEquipments([]); return; }
    const controller = new AbortController();
    Promise.all([
      customersApi.getCustomer(form.customerId, { signal: controller.signal }),
      equipmentsApi.listEquipments({ customerId: form.customerId, page: 1, limit: 100, signal: controller.signal }),
    ]).then(([customer, equipmentPage]) => { setAddresses(customer.addresses); setEquipments(equipmentPage.items); }).catch(() => undefined);
    return () => controller.abort();
  }, [form.customerId]);

  function set<K extends keyof WorkflowForm>(key: K, value: WorkflowForm[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function selectOperation(id: string) {
    set("operationId", id); setError(null);
    if (!id) { setOperation(null); return; }
    try {
      const detail = await operationApi.getOperation(id); setOperation(detail);
      setForm((current) => ({ ...current, customerId: detail.customer?.id ?? "", addressId: detail.address?.id ?? "", equipmentId: detail.equipment?.id ?? "", operatorId: detail.operator?.id ?? "", objective: detail.reportedIssue ?? "", diagnosis: detail.technicalDiagnosis ?? "", observations: detail.observations ?? "", analysis: detail.serviceDescription ?? "", recommendations: detail.technicalRecommendations ?? "", checklist: detail.checklist.map((item) => `${item.done ? "[x]" : "[ ]"} ${item.label}${item.note ? ` | ${item.note}` : ""}`).join("\n") }));
    } catch (cause) { setError(message(cause)); }
  }

  async function selectPmoc(id: string) {
    set("pmocId", id); const plan = pmocs.data?.items.find((item) => item.id === id);
    if (plan) setForm((current) => ({ ...current, pmocId: id, customerId: plan.customerId, equipmentId: plan.equipmentId, objective: `Execução do plano PMOC ${plan.contractNumber ?? plan.id}`, observations: plan.observations ?? current.observations }));
  }

  async function preparePreview() {
    setBusy(true); setError(null);
    try {
      let detail = operation;
      if (isWorkOrder) {
        if (!form.operationId) throw new Error("Selecione uma Operation para emitir a Ordem de Serviço.");
        detail = detail ?? await operationApi.getOperation(form.operationId);
      } else {
        if (!form.customerId || !form.operatorId) throw new Error("Cliente e responsável são obrigatórios.");
        const content = contentFor(type, form);
        if (detail) {
          detail = await operationApi.updateOperation(detail.id, content);
        } else {
          detail = await operationApi.createOperation({ customerId: form.customerId, addressId: form.addressId || null, equipmentId: form.equipmentId || null, operatorId: form.operatorId, type: operationTypeFor(type), status: "DRAFT", ...content });
          if (type === "PMOC") {
            const pmoc = pmocs.data?.items.find((item) => item.id === form.pmocId);
            if (!pmoc) throw new Error("Selecione um plano PMOC ativo.");
            const execution = await maintenanceApi.createMaintenanceExecution(pmoc.maintenancePlanId, { scheduledAt: new Date().toISOString(), notes: "Emissão iniciada pela Central de Relatórios" });
            await maintenanceApi.updateMaintenanceExecution(execution.id, { operationId: detail.id, status: "LINKED" });
            detail = await operationApi.getOperation(detail.id);
          }
        }
      }
      setOperation(detail); set("operationId", detail.id); setStep(3);
    } catch (cause) { setError(message(cause)); } finally { setBusy(false); }
  }

  const steps = ["Origem", "Conteúdo", "Evidências", "Preview"];
  return (
    <Drawer open onClose={onClose} title={DOCUMENT_KIND_LABEL[type]} eyebrow="Workflow documental" width="max-w-[1240px]" footer={<><button type="button" onClick={() => step > 0 ? setStep(step - 1) : onClose()} className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm">{step > 0 ? "Voltar" : "Cancelar"}</button>{step < 2 && <button type="button" onClick={() => setStep(step + 1)} className="h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm text-[var(--color-primary-foreground)]">Continuar</button>}{step === 2 && <button type="button" disabled={busy} onClick={preparePreview} className="h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm text-[var(--color-primary-foreground)] disabled:opacity-50">{busy ? "Preparando…" : "Gerar preview"}</button>}</>}>
      <div className="mb-5 grid grid-cols-4 gap-2">{steps.map((label, index) => <div key={label} className={`rounded-[var(--radius-md)] px-3 py-2 text-center text-xs ${index === step ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : index < step ? "bg-emerald-500/10 text-emerald-700" : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"}`}>{index + 1}. {label}</div>)}</div>
      {error && <div className="mb-4 rounded-[var(--radius-md)] border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">{error}</div>}
      {configuration.loading ? <SkeletonCard /> : configuration.error ? <div className="rounded-[var(--radius-md)] border border-amber-500/30 bg-amber-500/10 p-3 text-sm">Não existe configuração ativa para este tipo. O backend impedirá a emissão.</div> : <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-xs"><strong>Template automático:</strong> {configuration.data?.defaultTemplate?.name ?? "Não configurado"} · <strong>Assinatura:</strong> {configuration.data?.defaultTemplate?.signatureMode ?? "NONE"}</div>}
      {step === 0 && <OriginStep type={type} form={form} customers={customers.data?.items ?? []} users={users.data?.items ?? []} operations={operations.data?.items ?? []} pmocs={pmocs.data?.items ?? []} addresses={addresses} equipments={equipments} onSet={set} onOperation={selectOperation} onPmoc={selectPmoc} />}
      {step === 1 && <ContentStep type={type} form={form} onSet={set} />}
      {step === 2 && <EvidenceStep form={form} onSet={set} />}
      {step === 3 && operation && <DocumentViewer source={{ operationId: operation.id, type }} canRender canDownload onRendered={onRendered} />}
    </Drawer>
  );
}

function OriginStep({ type, form, customers, users, operations, pmocs, addresses, equipments, onSet, onOperation, onPmoc }: { type: DocumentKind; form: WorkflowForm; customers: Customer[]; users: TeamUser[]; operations: OperationSummary[]; pmocs: PmocPlan[]; addresses: CustomerAddress[]; equipments: EquipmentSummary[]; onSet: <K extends keyof WorkflowForm>(key: K, value: WorkflowForm[K]) => void; onOperation: (id: string) => void; onPmoc: (id: string) => void }) {
  if (type === "WORK_ORDER") return <Field label="Operation oficial"><select value={form.operationId} onChange={(event) => void onOperation(event.target.value)}><option value="">Selecione…</option>{operations.map((item) => <option key={item.id} value={item.id}>OP-{String(item.number).padStart(6, "0")} · {item.customer?.name ?? "Cliente"}</option>)}</select></Field>;
  return <div className="grid gap-4 md:grid-cols-2">{type === "PMOC" && <Field label="Plano PMOC"><select value={form.pmocId} onChange={(event) => void onPmoc(event.target.value)}><option value="">Selecione…</option>{pmocs.map((item) => <option key={item.id} value={item.id}>{item.customer?.tradeName ?? item.customer?.name ?? item.id} · {item.contractNumber ?? "Sem contrato"}</option>)}</select></Field>}<Field label="Cliente"><select value={form.customerId} disabled={type === "PMOC"} onChange={(event) => onSet("customerId", event.target.value)}><option value="">Selecione…</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.tradeName ?? item.name}</option>)}</select></Field><Field label="Endereço"><select value={form.addressId} onChange={(event) => onSet("addressId", event.target.value)}><option value="">Endereço principal</option>{addresses.map((item) => <option key={item.id} value={item.id}>{item.name ?? "Endereço"} · {item.street ?? "logradouro não informado"}</option>)}</select></Field><Field label="Equipamento"><select value={form.equipmentId} disabled={type === "PMOC"} onChange={(event) => onSet("equipmentId", event.target.value)}><option value="">Sem equipamento</option>{equipments.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.tag}</option>)}</select></Field><Field label="Responsável"><select value={form.operatorId} onChange={(event) => onSet("operatorId", event.target.value)}><option value="">Selecione…</option>{users.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}</select></Field></div>;
}

function ContentStep({ type, form, onSet }: { type: DocumentKind; form: WorkflowForm; onSet: <K extends keyof WorkflowForm>(key: K, value: WorkflowForm[K]) => void }) {
  if (type === "WORK_ORDER") return <p className="text-sm text-[var(--color-muted-foreground)]">A Ordem de Serviço utiliza os dados já persistidos na Operation selecionada. Edite a Operation no módulo Operações quando necessário.</p>;
  if (type === "RECEIPT") return <div className="grid gap-4 md:grid-cols-2"><Text label="Referência" value={form.reference} onChange={(value) => onSet("reference", value)} /><Text label="Valor recebido" value={form.amount} onChange={(value) => onSet("amount", value)} inputMode="decimal" /><Text label="Recebido de" value={form.receivedFrom} onChange={(value) => onSet("receivedFrom", value)} /><Area label="Observações" value={form.observations} onChange={(value) => onSet("observations", value)} /></div>;
  if (type === "TECHNICAL_OPINION") return <div className="space-y-4"><Area label="Diagnóstico" value={form.objective} onChange={(value) => onSet("objective", value)} /><Area label="Análise técnica" value={form.analysis} onChange={(value) => onSet("analysis", value)} /><Area label="Conclusão" value={form.conclusion} onChange={(value) => onSet("conclusion", value)} /></div>;
  if (type === "TECHNICAL_REPORT") return <div className="space-y-4"><Area label="Objetivo da visita" value={form.objective} onChange={(value) => onSet("objective", value)} /><Area label="Diagnóstico ou situação encontrada" value={form.diagnosis} onChange={(value) => onSet("diagnosis", value)} /><Area label="Atividades executadas" value={form.analysis} onChange={(value) => onSet("analysis", value)} /><Area label="Recomendações técnicas" value={form.recommendations} onChange={(value) => onSet("recommendations", value)} /><Area label="Observações finais" value={form.observations} onChange={(value) => onSet("observations", value)} /></div>;
  return <div className="space-y-4"><Area label={type === "PMOC" ? "Medições e objetivo da execução" : "Objetivo da visita"} value={form.objective} onChange={(value) => onSet("objective", value)} /><Area label={type === "PMOC" ? "Pendências e conclusão" : "Observações"} value={form.observations} onChange={(value) => onSet("observations", value)} /></div>;
}

function EvidenceStep({ form, onSet }: { form: WorkflowForm; onSet: <K extends keyof WorkflowForm>(key: K, value: WorkflowForm[K]) => void }) {
  return <div className="space-y-5"><Area label="Checklist — uma atividade por linha" value={form.checklist} onChange={(value) => onSet("checklist", value)} /><Field label="Fotos"><input type="file" accept="image/png,image/jpeg" multiple onChange={async (event) => { const files = Array.from(event.target.files ?? []).slice(0, 10); const photos = await Promise.all(files.map(async (file) => ({ dataUrl: await fileDataUrl(file), caption: file.name }))); onSet("photos", photos); }} /><span className="text-caption">{form.photos.length} foto(s) selecionada(s).</span></Field><div><p className="mb-2 text-sm font-medium">Assinatura coletada, quando exigida pelo template</p><SignaturePad onChange={(value) => onSet("signatureData", value)} onConfirm={(value) => onSet("signatureData", value)} /></div></div>;
}

function contentFor(type: DocumentKind, form: WorkflowForm) {
  const checklist = form.checklist.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => ({ label: line.replace(/^\[[ xX]\]\s*/, "").split("|")[0].trim(), done: !line.startsWith("[ ]"), note: line.split("|")[1]?.trim() || undefined }));
  const common = { checklist, photos: form.photos, signatureData: form.signatureData, signedAt: form.signatureData ? new Date().toISOString() : undefined };
  if (type === "RECEIPT") return { ...common, reportedIssue: form.reference, serviceDescription: `Valor recebido: R$ ${form.amount || "0,00"}\nRecebido de: ${form.receivedFrom || "Não informado"}`, observations: form.observations };
  if (type === "TECHNICAL_OPINION") return { ...common, reportedIssue: form.objective, serviceDescription: form.analysis, observations: form.conclusion };
  if (type === "TECHNICAL_REPORT") return { ...common, reportedIssue: form.objective, technicalDiagnosis: form.diagnosis, serviceDescription: form.analysis, technicalRecommendations: form.recommendations, observations: form.observations };
  return { ...common, reportedIssue: form.objective, serviceDescription: type === "PMOC" ? form.objective : undefined, observations: form.observations };
}

function operationTypeFor(type: DocumentKind): "PREVENTIVA" | "CORRETIVA" | "INSTALACAO" | "PROJETO" { return type === "PMOC" ? "PREVENTIVA" : type === "TECHNICAL_OPINION" ? "CORRETIVA" : "PROJETO"; }
function message(cause: unknown) { return cause instanceof ApiClientError || cause instanceof Error ? cause.message : "Não foi possível preparar o documento."; }
function fileDataUrl(file: File): Promise<string> { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file); }); }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"><span className="text-caption">{label}</span><strong className="mt-1 block text-2xl">{value}</strong></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-medium [&_input]:h-10 [&_input]:rounded-[var(--radius-md)] [&_input]:border [&_input]:border-[var(--color-border)] [&_input]:bg-[var(--color-card)] [&_input]:px-3 [&_select]:h-10 [&_select]:rounded-[var(--radius-md)] [&_select]:border [&_select]:border-[var(--color-border)] [&_select]:bg-[var(--color-card)] [&_select]:px-3">{label}{children}</label>; }
function Text({ label, value, onChange, inputMode }: { label: string; value: string; onChange: (value: string) => void; inputMode?: "decimal" }) { return <Field label={label}><input value={value} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} /></Field>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid gap-1.5 text-sm font-medium">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={5} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm" /></label>; }
