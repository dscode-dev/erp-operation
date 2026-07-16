"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarClock, History, Play, RefreshCw, Settings2, XCircle } from "lucide-react";
import { OperationCreationDrawer } from "@platform/components/operation-creation-drawer";
import {
  ApiClientError, operationApi, pmocApi, usersApi, useQuery,
  type CreateOperationPayload, type PmocExecutionRequest, type PmocHistoryItem, type PmocPlan,
} from "@erp/api";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { ConfirmDialog } from "@erp/ui/confirm-dialog";
import { Drawer } from "@erp/ui/drawer";
import { EmptyState } from "@erp/ui/empty-state";
import { SkeletonCard, SkeletonList } from "@erp/ui/skeletons";
import { ErrorState } from "@erp/ui/states";
import { StatusChip } from "@erp/ui/status-chip";

type Tab = "summary" | "requests" | "timeline";

export default function PmocDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canEdit = hasRole("OWNER", "MANAGER");
  const [tab, setTab] = useState<Tab>("summary");
  const [tick, setTick] = useState(0);
  const pmoc = useQuery((signal) => pmocApi.getPmoc(id, { signal }), [id, tick]);
  const requests = useQuery((signal) => pmocApi.listExecutionRequests(id, { page: 1, limit: 100, signal }), [id, tick]);
  const history = useQuery<PmocHistoryItem[]>(() => pmocApi.getHistory(id), [id, tick]);
  const [generating, setGenerating] = useState<PmocExecutionRequest | null>(null);
  const [prefill, setPrefill] = useState<CreateOperationPayload | null>(null);
  const [rescheduling, setRescheduling] = useState<PmocExecutionRequest | null>(null);
  const [canceling, setCanceling] = useState<PmocExecutionRequest | null>(null);
  const [settings, setSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openGeneration(request: PmocExecutionRequest) {
    setError(null);
    try { setPrefill(await pmocApi.getExecutionRequestPrefill(request.id)); setGenerating(request); }
    catch (cause) { setError(message(cause)); }
  }
  async function submitOperation(payload: CreateOperationPayload) {
    if (!generating) throw new Error("Execução não selecionada.");
    const request = await pmocApi.generateWorkOrder(generating.id, payload);
    if (!request.operationId) throw new Error("OS não vinculada.");
    setTick((value) => value + 1);
    return operationApi.getOperation(request.operationId);
  }

  if (pmoc.loading && !pmoc.data) return <SkeletonCard />;
  if (pmoc.error && !pmoc.data) return <ErrorState error={pmoc.error} onRetry={pmoc.refetch} />;
  if (!pmoc.data) return <EmptyState icon={CalendarClock} title="PMOC não encontrado" description="O plano não está disponível." />;
  const plan = pmoc.data;
  const items = requests.data?.items ?? [];
  const counts = countRequests(items);

  return <div className="space-y-6">
    <Link href="/pmoc" className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]"><ArrowLeft className="h-4 w-4" /> Voltar para PMOC</Link>
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">PMOC-{String(plan.number).padStart(6, "0")}</span><StatusChip tone={plan.operationalStatus === "ERROR" || plan.operationalStatus === "OVERDUE" ? "danger" : plan.operationalStatus === "PAUSED" ? "warning" : "success"}>{plan.operationalStatus}</StatusChip></div><h1 className="mt-2 text-2xl font-semibold">{plan.maintenancePlan?.name}</h1><p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{plan.customer?.tradeName ?? plan.customer?.name} · {plan.periodicity} · {plan.generationMode}</p></div>{canEdit && <button className={secondary} onClick={() => setSettings(true)}><Settings2 className="h-4 w-4" /> Configurar responsáveis</button>}</header>
    {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><Metric label="Previstas" value={items.length} /><Metric label="Concluídas" value={counts.completed} /><Metric label="Pendentes" value={counts.pending} /><Metric label="Falhas" value={counts.failed} tone="danger" /><Metric label="Canceladas" value={counts.cancelled} /><Metric label="Próxima" value={date(plan.nextExecutionDate)} /></div>
    <nav className="flex gap-1 border-b border-[var(--color-border)]">{(["summary", "requests", "timeline"] as Tab[]).map((value) => <button key={value} className={`px-4 py-3 text-sm font-medium ${tab === value ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}`} onClick={() => setTab(value)}>{value === "summary" ? "Resumo" : value === "requests" ? "Execuções" : "Timeline"}</button>)}</nav>
    {tab === "summary" && <Summary plan={plan} />}
    {tab === "requests" && (requests.loading && !requests.data ? <SkeletonList rows={6} /> : <Requests items={items} canEdit={canEdit} onGenerate={(item) => void openGeneration(item)} onReschedule={setRescheduling} onCancel={setCanceling} />)}
    {tab === "timeline" && (history.loading && !history.data ? <SkeletonList rows={6} /> : <Timeline items={history.data ?? []} />)}

    <OperationCreationDrawer open={Boolean(generating)} mode="work-order" initialValues={prefill ?? undefined} submitOperation={submitOperation} submitLabel={`Gerar Execução ${String(generating?.executionNumber ?? 0).padStart(3, "0")}`} contextNotice="Este drawer é o fluxo oficial de criação da OS. A Execution Request existente será atualizada, sem criar outra execução." onClose={() => { setGenerating(null); setPrefill(null); }} />
    <RescheduleDrawer request={rescheduling} onClose={() => setRescheduling(null)} onSaved={() => { setRescheduling(null); setTick((value) => value + 1); }} />
    <DefaultsDrawer open={settings} plan={plan} onClose={() => setSettings(false)} onSaved={() => { setSettings(false); setTick((value) => value + 1); }} />
    <ConfirmDialog open={Boolean(canceling)} title="Cancelar execução prevista?" danger confirmLabel="Cancelar execução" description="O número e todo o histórico serão preservados. Esta ação não remove a Execution Request." onClose={() => setCanceling(null)} onConfirm={async () => { if (canceling) { await pmocApi.cancelExecutionRequest(canceling.id); setTick((value) => value + 1); } }} />
  </div>;
}

function Summary({ plan }: { plan: PmocPlan }) { return <div className="grid gap-4 lg:grid-cols-2"><Card title="Plano"><Rows rows={[["Cliente", plan.customer?.tradeName ?? plan.customer?.name ?? "—"], ["Cobertura", plan.coverage ?? "Não informada"], ["Periodicidade", plan.periodicity], ["Período", `${date(plan.startDate)} até ${date(plan.endDate)}`], ["Equipamentos", String(plan.equipments?.length ?? 1)]]} /></Card><Card title="Operação padrão"><Rows rows={[["Próxima execução", date(plan.nextExecutionDate)], ["Última execução", date(plan.lastExecutionDate)], ["Operador", plan.defaultOperator?.name ?? "Definido ao gerar"], ["Técnico", plan.defaultTechnician?.name ?? plan.responsibleTechnician], ["Atendimento", plan.defaultOperationType], ["Duração", plan.defaultEstimatedDurationMinutes ? `${plan.defaultEstimatedDurationMinutes} min` : "—"]]} /></Card><Card title="Assinatura"><Rows rows={[["Override do PMOC", plan.signatureOverride?.name ?? "Política do Template"], ["Cargo", plan.signatureOverride?.title ?? "—"], ["Conselho", plan.signatureOverride?.professionalCouncil ?? "—"]]} /></Card><Card title="Scheduler"><Rows rows={[["Modo", plan.generationMode], ["Última execução do scheduler", dateTime(plan.lastSchedulerRun)], ["Status", plan.lastSchedulerStatus], ["Última geração", dateTime(plan.lastSuccessfulGeneration)]]} /></Card></div>; }

function Requests({ items, canEdit, onGenerate, onReschedule, onCancel }: { items: PmocExecutionRequest[]; canEdit: boolean; onGenerate: (item: PmocExecutionRequest) => void; onReschedule: (item: PmocExecutionRequest) => void; onCancel: (item: PmocExecutionRequest) => void }) { if (!items.length) return <EmptyState icon={CalendarClock} title="Sem execuções" description="As execuções previstas aparecerão aqui." />; return <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]"><table className="w-full text-sm"><thead className="bg-[var(--color-muted)] text-left text-xs uppercase text-[var(--color-muted-foreground)]"><tr><th className="p-3">Execução</th><th className="p-3">Status</th><th className="p-3">Prevista</th><th className="p-3">OS</th><th className="p-3">Operador</th><th className="p-3">Técnico</th><th className="p-3">Origem</th><th className="p-3 text-right">Ações</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-[var(--color-border)]"><td className="p-3 font-semibold">{String(item.executionNumber).padStart(3, "0")}</td><td className="p-3"><StatusChip tone={item.status === "FAILED" ? "danger" : item.status === "CANCELLED" ? "warning" : item.status === "GENERATED" ? "success" : "info"}>{item.status}</StatusChip></td><td className="p-3">{dateTime(item.scheduledFor)}</td><td className="p-3">{item.operation ? <Link className="text-[var(--color-primary)]" href={`/operacoes?operationId=${item.operation.id}`}>OS-{String(item.operation.number).padStart(6, "0")}</Link> : "—"}</td><td className="p-3">{item.operation?.operator?.name ?? item.plannedOperator?.name ?? "—"}</td><td className="p-3">{item.plannedTechnician?.name ?? "—"}</td><td className="p-3">{item.origin}</td><td className="p-3"><div className="flex justify-end gap-1">{canEdit && (item.status === "PENDING" || item.status === "FAILED") && <><button title="Gerar OS" className={iconBtn} onClick={() => onGenerate(item)}><Play className="h-4 w-4" /></button><button title="Reagendar" className={iconBtn} onClick={() => onReschedule(item)}><RefreshCw className="h-4 w-4" /></button><button title="Cancelar" className={`${iconBtn} text-red-600`} onClick={() => onCancel(item)}><XCircle className="h-4 w-4" /></button></>}</div></td></tr>)}</tbody></table></div>; }

function Timeline({ items }: { items: PmocHistoryItem[] }) { if (!items.length) return <EmptyState icon={History} title="Sem histórico" description="Os eventos append-only aparecerão aqui." />; return <ol className="relative ml-3 border-l border-[var(--color-border)] pl-6">{items.map((item) => <li key={item.id} className="relative pb-6"><span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-[var(--color-card)] bg-[var(--color-primary)]" /><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{historyLabel(item.action)}</strong>{item.execution && <StatusChip tone="info">Execução {String(item.execution.executionNumber).padStart(3, "0")}</StatusChip>}</div><p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{dateTime(item.occurredAt)}{item.actorId ? " · alteração autenticada" : " · sistema"}</p>{item.execution && <p className="mt-1 text-sm">{item.execution.workOrderNumber ? `OS-${String(item.execution.workOrderNumber).padStart(6, "0")} · ` : ""}{item.execution.operator?.name ?? "Sem operador"}</p>}{item.notes && <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{item.notes}</p>}</li>)}</ol>; }

function RescheduleDrawer({ request, onClose, onSaved }: { request: PmocExecutionRequest | null; onClose: () => void; onSaved: () => void }) { const [value, setValue] = useState(""); const [busy, setBusy] = useState(false); return <Drawer open={Boolean(request)} onClose={onClose} title={`Reagendar execução ${String(request?.executionNumber ?? 0).padStart(3, "0")}`} eyebrow="Execution Request" footer={<><button className={secondary} onClick={onClose}>Cancelar</button><button className={primary} disabled={!value || busy} onClick={async () => { if (!request) return; setBusy(true); try { await pmocApi.rescheduleExecutionRequest(request.id, { scheduledFor: new Date(`${value}T12:00:00`).toISOString(), notes: "Reagendada pela gestão do PMOC" }); onSaved(); } finally { setBusy(false); } }}>Salvar nova data</button></>}><label className="grid gap-2 text-sm font-medium">Nova data prevista<input type="date" value={value} onChange={(event) => setValue(event.target.value)} /></label><p className="mt-3 text-sm text-[var(--color-muted-foreground)]">A execução {String(request?.executionNumber ?? 0).padStart(3, "0")} será preservada. Nenhuma nova Execution Request será criada.</p></Drawer>; }

function DefaultsDrawer({ open, plan, onClose, onSaved }: { open: boolean; plan: PmocPlan; onClose: () => void; onSaved: () => void }) { const users = useQuery((signal) => usersApi.listUsers({ limit: 100, signal }), []); const [operatorId, setOperatorId] = useState(plan.defaultOperatorId ?? ""); const [technicianId, setTechnicianId] = useState(plan.defaultTechnicianId ?? ""); const [propagate, setPropagate] = useState(false); const [busy, setBusy] = useState(false); const available = users.data?.items.filter((item) => item.isActive && item.role !== "VIEWER") ?? []; return <Drawer open={open} onClose={onClose} title="Responsáveis padrão" eyebrow="PMOC" footer={<><button className={secondary} onClick={onClose}>Cancelar</button><button className={primary} disabled={busy} onClick={async () => { setBusy(true); try { await pmocApi.updatePmoc(plan.id, { defaultOperatorId: operatorId || null, defaultTechnicianId: technicianId || null, responsibleTechnician: available.find((item) => item.id === technicianId)?.name ?? plan.responsibleTechnician, applyDefaultsToPendingExecutions: propagate }); onSaved(); } finally { setBusy(false); } }}>Salvar</button></>}><div className="space-y-4"><label className="grid gap-2 text-sm font-medium">Operador padrão<select value={operatorId} onChange={(event) => setOperatorId(event.target.value)}><option value="">Definir ao gerar</option>{available.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}</select></label><label className="grid gap-2 text-sm font-medium">Técnico padrão<select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}><option value="">Sem técnico padrão</option>{available.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.jobTitle ?? item.role}</option>)}</select></label><label className="flex items-start gap-3 rounded-lg border border-[var(--color-border)] p-3 text-sm"><input className="mt-1" type="checkbox" checked={propagate} onChange={(event) => setPropagate(event.target.checked)} /><span><strong>Aplicar também às próximas execuções pendentes?</strong><span className="block text-xs text-[var(--color-muted-foreground)]">Execuções concluídas e OS já geradas nunca serão alteradas.</span></span></label></div></Drawer>; }

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-5"><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>; }
function Rows({ rows }: { rows: Array<[string, string]> }) { return <dl className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-[var(--color-border)]/70 pb-2 last:border-0"><dt className="text-sm text-[var(--color-muted-foreground)]">{label}</dt><dd className="text-right text-sm font-medium">{value}</dd></div>)}</dl>; }
function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "danger" }) { return <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3"><strong className={tone === "danger" ? "text-xl text-red-600" : "text-xl"}>{value}</strong><span className="block text-xs text-[var(--color-muted-foreground)]">{label}</span></div>; }
function countRequests(items: PmocExecutionRequest[]) { return { completed: items.filter((item) => item.maintenanceExecution?.status === "COMPLETED").length, pending: items.filter((item) => item.status === "PENDING").length, failed: items.filter((item) => item.status === "FAILED").length, cancelled: items.filter((item) => item.status === "CANCELLED").length }; }
function historyLabel(action: string) { return action.toLowerCase().replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase()); }
function date(value: string | null) { return value ? new Date(value).toLocaleDateString("pt-BR") : "—"; }
function dateTime(value: string | null) { return value ? new Date(value).toLocaleString("pt-BR") : "—"; }
function message(cause: unknown) { return cause instanceof ApiClientError ? cause.message : cause instanceof Error ? cause.message : "Não foi possível concluir a ação."; }
const primary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50";
const secondary = "inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium";
const iconBtn = "grid h-9 w-9 place-items-center rounded-md border border-[var(--color-border)] hover:bg-[var(--color-muted)]";
