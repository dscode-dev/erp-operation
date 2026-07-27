"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, Download, Eye, FileSignature, FileText, History, Images, PauseCircle, Pencil, Play, RotateCcw, Settings2 } from "lucide-react";
import { Pagination } from "@platform/components/pagination";
import { PmocEquipmentExecutionWizard } from "@platform/components/pmoc-equipment-execution-wizard";
import { PmocPlanWizard } from "@platform/components/pmoc-plan-wizard";
import {
  ApiClientError, documentsApi, pmocApi, usersApi, useQuery,
  type CreateOperationPayload, type DocumentHandoff, type EquipmentSummary, type PmocExecutionRequest, type PmocHistoryItem, type PmocPlan,
} from "@erp/api";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { ConfirmDialog } from "@erp/ui/confirm-dialog";
import { Drawer } from "@erp/ui/drawer";
import { DocumentViewer } from "@erp/ui/documents/document-viewer";
import { CustomerSignaturePreview } from "@erp/ui/documents/customer-signature-preview";
import { EmptyState } from "@erp/ui/empty-state";
import { SkeletonCard, SkeletonList } from "@erp/ui/skeletons";
import { ErrorState } from "@erp/ui/states";
import { StatusChip } from "@erp/ui/status-chip";

type Tab = "summary" | "requests" | "timeline";

export default function PmocDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasRole } = useAuth();
  const canEdit = hasRole("OWNER", "MANAGER");
  const isOwner = hasRole("OWNER");
  const [tab, setTab] = useState<Tab>("summary");
  const [tick, setTick] = useState(0);
  const pmoc = useQuery((signal) => pmocApi.getPmoc(id, { signal }), [id, tick]);
  const requests = useQuery((signal) => pmocApi.listExecutionRequests(id, { page: 1, limit: 100, signal }), [id, tick]);
  const history = useQuery<PmocHistoryItem[]>(() => pmocApi.getHistory(id), [id, tick]);
  const latestPmocDocumentId = pmoc.data?.executionRequests?.find((item) => item.operation?.documents?.[0])?.operation?.documents?.[0]?.id ?? null;
  const latestHandoff = useQuery<DocumentHandoff | null>(
    (signal) => latestPmocDocumentId ? documentsApi.getHandoff(latestPmocDocumentId, { signal }) : Promise.resolve(null),
    [latestPmocDocumentId, tick],
  );
  const [generating, setGenerating] = useState<PmocExecutionRequest | null>(null);
  const [executionEquipment, setExecutionEquipment] = useState<EquipmentSummary | null>(null);
  const [prefill, setPrefill] = useState<CreateOperationPayload | null>(null);
  const [settings, setSettings] = useState(false);
  const [editing, setEditing] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [reviewSection, setReviewSection] = useState<"signatures" | "evidence" | null>(null);
  const [documentRequestId, setDocumentRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function openEquipmentExecution(equipment: EquipmentSummary) {
    setError(null);
    try {
      const reusable = (requests.data?.items ?? []).find(
        (item) =>
          item.equipmentId === equipment.id &&
          !item.operationId &&
          (item.status === "PENDING" || item.status === "FAILED"),
      );
      const request =
        reusable ??
        await pmocApi.createExecutionRequest(id, {
          equipmentId: equipment.id,
          scheduledFor: new Date().toISOString(),
          notes: `Execução iniciada para o equipamento ${equipment.name}.`,
        });
      setPrefill(await pmocApi.getExecutionRequestPrefill(request.id));
      setExecutionEquipment(equipment);
      setGenerating(request);
    }
    catch (cause) { setError(message(cause)); }
  }

  if (pmoc.loading && !pmoc.data) return <SkeletonCard />;
  if (pmoc.error && !pmoc.data) return <ErrorState error={pmoc.error} onRetry={pmoc.refetch} />;
  if (!pmoc.data) return <EmptyState icon={CalendarClock} title="PMOC não encontrado" description="O plano não está disponível." />;
  const plan = pmoc.data;
  const items = requests.data?.items ?? [];
  const documentRequest = documentRequestId
    ? items.find((item) => item.id === documentRequestId)
      ?? plan.executionRequests?.find((item) => item.id === documentRequestId)
      ?? null
    : null;
  const latestDocumentRequest = plan.executionRequests?.find((item) => item.operation)
    ?? items.find((item) => item.operation)
    ?? null;
  const overview = plan.overview;

  return <div className="space-y-6">
    <Link href="/pmoc" className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]"><ArrowLeft className="h-4 w-4" /> Voltar para PMOC</Link>
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">PMOC-{String(plan.number).padStart(6, "0")}</span><StatusChip tone={overview?.health.tone ?? (plan.operationalStatus === "PAUSED" ? "warning" : "success")}>{overview?.health.label ?? operationalStatusLabel(plan.operationalStatus)}</StatusChip>{!plan.active && <StatusChip tone="info">Finalizado</StatusChip>}</div><h1 className="mt-2 text-2xl font-semibold">{plan.maintenancePlan?.name}</h1><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{plan.customer?.tradeName ?? plan.customer?.name} · {periodicityLabel(plan.periodicity)} · {generationModeLabel(plan.generationMode)}</p></div>{canEdit && <div className="flex flex-wrap gap-2"><button className={primary} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Editar PMOC</button><button className={secondary} onClick={() => setReviewSection("evidence")}><Images className="h-4 w-4" /> Revisar evidências</button><button className={secondary} onClick={() => setReviewSection("signatures")}><FileSignature className="h-4 w-4" /> Revisar assinaturas</button>{plan.active && <button className={secondary} onClick={async () => { await pmocApi.updatePmoc(plan.id, { generationMode: plan.generationMode === "PAUSED" ? "MANUAL" : "PAUSED" }); setTick((value) => value + 1); }}>{plan.generationMode === "PAUSED" ? <><RotateCcw className="h-4 w-4" /> Retomar plano</> : <><PauseCircle className="h-4 w-4" /> Pausar plano</>}</button>}<button className={secondary} onClick={() => setSettings(true)}><Settings2 className="h-4 w-4" /> Ajustar responsáveis</button>{isOwner && plan.active && <button className={`${secondary} border-red-500/30 text-red-600`} onClick={() => setFinalizing(true)}><CheckCircle2 className="h-4 w-4" /> Finalizar PMOC</button>}</div>}</header>
    {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Metric label="Previstas" value={overview?.expectedExecutions ?? "—"} /><Metric label="Concluídas" value={overview?.completedExecutions ?? "—"} /><Metric label="Pendentes" value={overview?.pendingExecutions ?? "—"} /><Metric label="Falhas" value={overview?.failedExecutions ?? "—"} tone="danger" /><Metric label="Canceladas" value={overview?.cancelledExecutions ?? "—"} /><Metric label="Próxima" value={date(plan.nextExecutionDate)} /></div>
    {overview && <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"><div className="flex items-center justify-between text-sm"><strong>Progresso das execuções</strong><span>{overview.completedExecutions} / {overview.expectedExecutions} · {overview.remainingExecutions} restantes</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-[var(--color-muted)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${overview.completionPercentage}%` }} /></div><p className="mt-2 text-xs text-[var(--color-muted-foreground)]">Saúde {overview.health.label} ({overview.health.score}/100) · atraso médio {overview.averageDelayDays} dia(s)</p></section>}
    {latestDocumentRequest?.operation && <PmocDocumentActions request={latestDocumentRequest} canRender={canEdit} onOpen={() => setDocumentRequestId(latestDocumentRequest.id)} />}
    <nav className="flex gap-1 border-b border-[var(--color-border)]">{(["summary", "requests", "timeline"] as Tab[]).map((value) => <button key={value} className={`px-4 py-3 text-sm font-medium ${tab === value ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}`} onClick={() => setTab(value)}>{value === "summary" ? "Resumo" : value === "requests" ? "Execuções" : "Timeline"}</button>)}</nav>
      {tab === "summary" && <Summary plan={plan} handoff={latestHandoff.data} />}
    {tab === "requests" && (requests.loading && !requests.data ? <SkeletonList rows={6} /> : <EquipmentExecutions plan={plan} requests={items} canExecute={canEdit} onExecute={(equipment) => void openEquipmentExecution(equipment)} onDocument={(item) => setDocumentRequestId(item.id)} />)}
    {tab === "timeline" && (history.loading && !history.data ? <SkeletonList rows={6} /> : <Timeline items={history.data ?? []} />)}

    <PmocEquipmentExecutionWizard
      open={Boolean(generating && executionEquipment && prefill)}
      plan={plan}
      equipment={executionEquipment}
      request={generating}
      prefill={prefill}
      onClose={() => { setGenerating(null); setExecutionEquipment(null); setPrefill(null); }}
      onCompleted={(request) => {
        setGenerating(null);
        setExecutionEquipment(null);
        setPrefill(null);
        setDocumentRequestId(request.id);
        setTick((value) => value + 1);
      }}
    />
    <DefaultsDrawer open={settings} plan={plan} onClose={() => setSettings(false)} onSaved={() => { setSettings(false); setTick((value) => value + 1); }} />
    <PmocPlanWizard open={reviewSection !== null} pmoc={plan} initialReviewSection={reviewSection ?? "signatures"} onClose={() => setReviewSection(null)} onCreated={() => undefined} onUpdated={() => setTick((value) => value + 1)} />
    <PmocPlanWizard configurationOnly open={editing} pmoc={plan} editMode onClose={() => setEditing(false)} onCreated={() => undefined} onUpdated={() => setTick((value) => value + 1)} />
    <Drawer open={Boolean(documentRequest)} onClose={() => setDocumentRequestId(null)} eyebrow="Documento PMOC" title={documentRequest ? `Execução ${String(documentRequest.executionNumber).padStart(3, "0")}` : "Documento"} width="max-w-[1280px]">
      {documentRequest?.operation && <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatusChip tone={documentRequest.operation.signedAt ? "success" : "warning"}>{documentRequest.operation.signedAt ? "ASSINADO" : "NÃO ASSINADO"}</StatusChip>
          <StatusChip tone="info">{documentRequest.operation._count?.photos ?? 0}/6 evidências</StatusChip>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">O Preview pode ser consultado a qualquer momento. As evidências desta execução são opcionais e pertencem somente ao equipamento atendido. Alterações posteriores tornam o PDF anterior desatualizado.</p>
        <DocumentViewer
          source={{ operationId: documentRequest.operation.id, type: "PMOC", documentId: documentRequest.operation.documents?.[0]?.id ?? null }}
          artifact={documentRequest.operation.documents?.[0] ?? null}
          title={`PMOC · Execução ${String(documentRequest.executionNumber).padStart(3, "0")}`}
          canRender={canEdit}
          onRendered={() => setTick((value) => value + 1)}
        />
      </div>}
    </Drawer>
    <ConfirmDialog open={finalizing} title="Finalizar este PMOC?" danger confirmLabel="Finalizar PMOC" description="O plano será encerrado, as próximas execuções pendentes serão canceladas e todo o histórico permanecerá disponível. Esta ação não remove documentos nem Ordens de Serviço já emitidas." onClose={() => setFinalizing(false)} onConfirm={async () => { await pmocApi.deletePmoc(plan.id); router.push("/pmoc"); }} />
  </div>;
}

function PmocDocumentActions({ request, canRender, onOpen }: { request: PmocExecutionRequest; canRender: boolean; onOpen: () => void }) {
  const document = request.operation?.documents?.[0];
  const available = Boolean(document?.renderedAt);
  return <section className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Documento PMOC</h2><StatusChip tone={available ? "success" : "warning"}>{available ? "PDF disponível" : "Sem PDF"}</StatusChip></div>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Execução {String(request.executionNumber).padStart(3, "0")}{document ? ` · ${document.number} · versão ${document.revision}` : " · o PDF oficial ainda não foi gerado"}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <button className={secondary} onClick={onOpen}><Eye className="h-4 w-4" /> Pré-visualizar</button>
      {canRender && <button className={primary} onClick={onOpen}><FileText className="h-4 w-4" /> {available ? "Gerar novamente" : "Gerar PDF"}</button>}
      {available && <button className={secondary} onClick={onOpen}><Download className="h-4 w-4" /> Baixar PDF</button>}
    </div>
  </section>;
}

function Summary({ plan, handoff }: { plan: PmocPlan; handoff: DocumentHandoff | null }) {
  const overview = plan.overview;
  const scope = plan.scopes?.map((item) => item.technicalCatalog.title).join(" · ") || plan.coverage || "Não informado";
  return <div className="space-y-4">
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Plano e cliente"><Rows rows={[["Cliente", plan.customer?.tradeName ?? plan.customer?.name ?? "—"], ["Endereço", plan.defaultAddress ? [plan.defaultAddress.street, plan.defaultAddress.number, plan.defaultAddress.city].filter(Boolean).join(", ") : "Endereço padrão do cliente"], ["Escopo", scope], ["Periodicidade", periodicityLabel(plan.periodicity)], ["Período", `${date(plan.startDate)} até ${date(plan.endDate)}`], ["Programação", generationModeLabel(plan.generationMode)]]} />{plan.customer && <div className="mt-4"><Link className={smallLink} href={`/clientes/${plan.customer.id}`}>Abrir cliente</Link></div>}</Card>
      <Card title="Execução"><Rows rows={[["Tipos de serviço", (plan.serviceTypes.length ? plan.serviceTypes : [plan.defaultOperationType]).map(operationTypeLabel).join(" · ")], ["Próxima execução", date(plan.nextExecutionDate)], ["Última execução", date(overview?.lastExecutionDate ?? plan.lastExecutionDate)], ["Técnico responsável", plan.defaultTechnician?.name ?? plan.responsibleTechnician], ["Última OS", overview?.lastOperation ? `OS-${String(overview.lastOperation.number).padStart(6, "0")}` : "—"], ["Último documento", overview?.lastDocument?.number ?? "—"]]} /></Card>
      <Card title="Assinatura técnica"><Rows rows={[["Responsável técnico", plan.defaultTechnician?.name ?? plan.responsibleTechnician], ["Assinatura utilizada", handoff?.technicalSignature?.name ?? plan.signatureOverride?.name ?? "Definida pelo modelo do documento"], ["Cargo", handoff?.technicalSignature?.title ?? plan.signatureOverride?.title ?? "—"], ["Conselho", handoff?.technicalSignature?.professionalCouncil ?? plan.signatureOverride?.professionalCouncil ?? "—"]]} /></Card>
      <Card title="Coleta mais recente"><Rows rows={[["Operador que coletou", handoff?.customerSignature?.collectedBy?.name ?? handoff?.collectedBy?.name ?? handoff?.operation?.operator.name ?? "Ainda não coletado"], ["Assinatura do cliente", handoff?.customerSignature ? handoff.customerSignature.name : "Pendente"], ["Coletada em", handoff?.customerSignature ? dateTime(handoff.customerSignature.collectedAt) : "—"], ["Evidências", String(handoff?.operation?.evidenceCount ?? 0)]]} />{handoff?.customerSignature && <div className="mt-4"><CustomerSignaturePreview documentId={handoff.id} name={handoff.customerSignature.name} /></div>}</Card>
    </div>
    <CoveredEquipmentList plan={plan} />
  </div>;
}

function EquipmentExecutions({ plan, requests, canExecute, onExecute, onDocument }: { plan: PmocPlan; requests: PmocExecutionRequest[]; canExecute: boolean; onExecute: (equipment: EquipmentSummary) => void; onDocument: (item: PmocExecutionRequest) => void }) {
  const equipments = coveredEquipments(plan);
  if (!equipments.length) return <EmptyState icon={CalendarClock} title="Sem equipamentos cobertos" description="Edite o PMOC para definir os equipamentos desta cobertura." />;
  return <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]"><table className="w-full text-sm"><thead className="bg-[var(--color-muted)] text-left text-xs uppercase text-[var(--color-muted-foreground)]"><tr><th className="p-3">Equipamento</th><th className="p-3">Local</th><th className="p-3">Última execução</th><th className="p-3">Status</th><th className="p-3">OS / Documento</th><th className="p-3 text-right">Ações</th></tr></thead><tbody>{equipments.map((equipment) => {
    const latest = requests.filter((request) => request.equipmentId === equipment.id).sort((left, right) => right.executionNumber - left.executionNumber)[0];
    const document = latest?.operation?.documents?.[0];
    return <tr key={equipment.id} className="border-t border-[var(--color-border)]"><td className="p-3"><Link href={`/equipamentos/${equipment.id}`} className="font-semibold text-[var(--color-primary)]">{equipment.name}</Link><span className="block text-xs text-[var(--color-muted-foreground)]">{[equipment.manufacturer, equipment.model, equipment.capacity].filter(Boolean).join(" · ") || equipment.tag || "Sem especificação"}</span></td><td className="p-3">{equipment.sector ?? equipment.address?.name ?? "Não informado"}</td><td className="p-3">{latest ? <><strong>{String(latest.executionNumber).padStart(3, "0")}</strong><span className="block text-xs text-[var(--color-muted-foreground)]">{dateTime(latest.generatedAt ?? latest.scheduledFor)}</span></> : "Ainda não executado"}</td><td className="p-3"><StatusChip tone={!latest ? "info" : latest.status === "FAILED" ? "danger" : latest.status === "GENERATED" ? "success" : "warning"}>{latest ? executionStatusLabel(latest.status) : "Disponível para execução"}</StatusChip></td><td className="p-3">{latest?.operation ? <button className="text-left text-[var(--color-primary)]" onClick={() => onDocument(latest)}><span className="block">OS-{String(latest.operation?.number).padStart(6, "0")}</span><span className="text-xs">{document?.number ?? "Preparar documento"} · {latest.operation?._count?.photos ?? 0} evidência(s)</span></button> : "—"}</td><td className="p-3"><div className="flex justify-end gap-2">{latest?.operation && <button title="Preview, gerar e baixar PMOC" className={iconBtn} onClick={() => onDocument(latest)}><FileText className="h-4 w-4" /></button>}{canExecute && (!latest || latest.status !== "GENERATING_OS") && <button title={`Executar PMOC para ${equipment.name}`} className={iconBtn} onClick={() => onExecute(equipment)}><Play className="h-4 w-4" /></button>}</div></td></tr>;
  })}</tbody></table></div>;
}

function CoveredEquipmentList({ plan }: { plan: PmocPlan }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const equipments = coveredEquipments(plan);
  const totalPages = Math.max(1, Math.ceil(equipments.length / limit));
  const safePage = Math.min(page, totalPages);
  const visible = equipments.slice((safePage - 1) * limit, safePage * limit);
  return <Card title={`Equipamentos cobertos (${equipments.length})`}><div className="divide-y divide-[var(--color-border)]">{visible.map((equipment) => <div key={equipment.id} className="flex items-center justify-between gap-4 py-3"><div><Link href={`/equipamentos/${equipment.id}`} className="text-sm font-semibold text-[var(--color-primary)]">{equipment.name}</Link><p className="text-xs text-[var(--color-muted-foreground)]">{[equipment.sector, equipment.manufacturer, equipment.model, equipment.capacity].filter(Boolean).join(" · ") || "Sem detalhes técnicos"}</p></div><StatusChip tone="success">Coberto</StatusChip></div>)}</div>{equipments.length > limit && <div className="mt-4"><Pagination pagination={{ page: safePage, limit, total: equipments.length, totalPages }} pageSizeOptions={[5, 10, 20]} onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} /></div>}</Card>;
}

function coveredEquipments(plan: PmocPlan): EquipmentSummary[] {
  const linked = plan.equipments?.map((item) => item.equipment) ?? [];
  const all = linked.length ? linked : plan.equipment ? [plan.equipment] : [];
  return all as EquipmentSummary[];
}

function Timeline({ items }: { items: PmocHistoryItem[] }) { if (!items.length) return <EmptyState icon={History} title="Sem histórico" description="As movimentações deste PMOC aparecerão aqui." />; return <ol className="relative ml-3 border-l border-[var(--color-border)] pl-6">{items.map((item) => <li key={item.id} className="relative pb-6"><span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-[var(--color-card)] bg-[var(--color-primary)]" /><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{historyLabel(item.action)}</strong>{item.source && <StatusChip tone="info">{historySourceLabel(item.source)}</StatusChip>}{item.execution && <StatusChip tone="info">Execução {String(item.execution.executionNumber).padStart(3, "0")}</StatusChip>}</div><p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{dateTime(item.occurredAt)} · {item.actor?.name ?? (item.actorId ? "usuário responsável" : "automação do sistema")}</p>{item.execution && <p className="mt-1 text-sm">{item.execution.workOrderNumber ? `OS-${String(item.execution.workOrderNumber).padStart(6, "0")} · ` : ""}{item.execution.operator?.name ?? "Sem operador"}</p>}{item.document && <Link href={`/documentos?documentId=${item.document.id}`} className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--color-primary)]"><FileText className="h-3.5 w-3.5" /> {item.document.number}</Link>}{item.notes && <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{item.notes}</p>}</li>)}</ol>; }

function DefaultsDrawer({ open, plan, onClose, onSaved }: { open: boolean; plan: PmocPlan; onClose: () => void; onSaved: () => void }) { const users = useQuery((signal) => usersApi.listUsers({ limit: 100, signal }), []); const [operatorId, setOperatorId] = useState(plan.defaultOperatorId ?? ""); const [technicianId, setTechnicianId] = useState(plan.defaultTechnicianId ?? ""); const [propagate, setPropagate] = useState(false); const [busy, setBusy] = useState(false); const available = users.data?.items.filter((item) => item.isActive && item.role !== "VIEWER") ?? []; return <Drawer open={open} onClose={onClose} title="Responsáveis padrão" eyebrow="PMOC" footer={<><button className={secondary} onClick={onClose}>Cancelar</button><button className={primary} disabled={busy} onClick={async () => { setBusy(true); try { await pmocApi.updatePmoc(plan.id, { defaultOperatorId: operatorId || null, defaultTechnicianId: technicianId || null, responsibleTechnician: available.find((item) => item.id === technicianId)?.name ?? plan.responsibleTechnician, applyDefaultsToPendingExecutions: propagate }); onSaved(); } finally { setBusy(false); } }}>Salvar</button></>}><div className="space-y-4"><label className="grid gap-2 text-sm font-medium">Operador padrão<select value={operatorId} onChange={(event) => setOperatorId(event.target.value)}><option value="">Definir ao gerar</option>{available.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}</select></label><label className="grid gap-2 text-sm font-medium">Técnico padrão<select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}><option value="">Sem técnico padrão</option>{available.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.jobTitle ?? item.role}</option>)}</select></label><label className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-3 text-sm"><input className="mt-1" type="checkbox" checked={propagate} onChange={(event) => setPropagate(event.target.checked)} /><span><strong>Aplicar também às próximas execuções pendentes?</strong><span className="block text-xs text-[var(--color-muted-foreground)]">Execuções concluídas e OS já geradas nunca serão alteradas.</span></span></label></div></Drawer>; }

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>; }
function Rows({ rows }: { rows: Array<[string, string]> }) { return <dl className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-[var(--color-border)]/70 pb-2 last:border-0"><dt className="text-sm text-[var(--color-muted-foreground)]">{label}</dt><dd className="text-right text-sm font-medium">{value}</dd></div>)}</dl>; }
function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "danger" }) { return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3"><strong className={tone === "danger" ? "text-xl text-red-600" : "text-xl"}>{value}</strong><span className="block text-xs text-[var(--color-muted-foreground)]">{label}</span></div>; }
function historyLabel(action: string) { const labels: Record<string, string> = { CREATED: "Plano criado", PERIODICITY_CHANGED: "Periodicidade alterada", OPERATOR_CHANGED: "Operador alterado", REQUEST_CREATED: "Execução criada", REQUEST_CREATED_AUTO: "Execução automática criada", REQUEST_CREATED_MANUAL: "Execução manual criada", OS_GENERATED_AUTO: "OS gerada automaticamente", OS_GENERATED_MANUAL: "OS gerada manualmente", ASSIGNMENT_ACCEPTED: "Operador aceitou", ASSIGNMENT_STARTED: "Execução iniciada", ASSIGNMENT_COMPLETED: "Atendimento concluído", EXECUTION_COMPLETED: "Execução concluída", DOCUMENT_RENDERED: "Documento emitido", CLIENT_SIGNED: "Cliente assinou", REQUEST_CANCELLED: "Execução cancelada", REQUEST_FAILED: "Falha na execução" }; return labels[action] ?? "Atualização do PMOC"; }
function historySourceLabel(source: string) { return ({ PMOC: "PMOC", ASSIGNMENT: "Atendimento", DOCUMENT: "Documento", AUDIT: "Registro operacional" } as Record<string, string>)[source] ?? "Atualização"; }
function periodicityLabel(value: string) { return ({ WEEKLY: "Semanal", BIWEEKLY: "Quinzenal", MONTHLY: "Mensal", BIMONTHLY: "Bimestral", QUARTERLY: "Trimestral", FOUR_MONTHLY: "Quadrimestral", SEMIANNUAL: "Semestral", YEARLY: "Anual", CUSTOM: "Personalizada" } as Record<string, string>)[value] ?? value; }
function generationModeLabel(value: string) { return ({ AUTO: "Geração automática", MANUAL: "Geração com revisão", PAUSED: "Programação pausada" } as Record<string, string>)[value] ?? value; }
function operationalStatusLabel(value: string) { return ({ ACTIVE: "Ativo", PENDING: "Aguardando início", OVERDUE: "Atrasado", PAUSED: "Pausado", ERROR: "Requer atenção", EXPIRED: "Encerrado" } as Record<string, string>)[value] ?? "Em acompanhamento"; }
function operationTypeLabel(value: string) { return ({ PREVENTIVA: "Manutenção preventiva", CORRETIVA: "Manutenção corretiva", INSTALACAO: "Instalação", PROJETO: "Projeto / inspeção técnica" } as Record<string, string>)[value] ?? value; }
function executionStatusLabel(value: string) { return ({ PENDING: "Aguardando geração", GENERATING_OS: "Preparando Ordem de Serviço", GENERATED: "Ordem de Serviço criada", FAILED: "Requer atenção", CANCELLED: "Cancelada" } as Record<string, string>)[value] ?? "Em processamento"; }
function date(value: string | null) { return value ? new Date(value).toLocaleDateString("pt-BR") : "—"; }
function dateTime(value: string | null) { return value ? new Date(value).toLocaleString("pt-BR") : "—"; }
function message(cause: unknown) { return cause instanceof ApiClientError ? cause.message : cause instanceof Error ? cause.message : "Não foi possível concluir a ação."; }
const primary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50";
const secondary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium";
const iconBtn = "grid h-9 w-9 place-items-center rounded-md border border-[var(--color-border)] hover:bg-[var(--color-muted)]";
const smallLink = "inline-flex rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--color-muted)]";
