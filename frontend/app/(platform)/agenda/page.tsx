"use client";

/**
 * Agenda (Platform) — calendário mensal de produção.
 *
 * Navegação por mês/ano/Hoje; a agenda é uma visão de Assignments reais.
 * Eventos clicáveis abrem um Drawer lateral. Layout de célula com
 * altura fixa: nada ultrapassa os limites; excedente vira "+N mais".
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { AlarmClock, AlertTriangle, CalendarClock, Check, ChevronLeft, ChevronRight, Calendar as CalendarIcon, CircleCheck, Plus, ShieldCheck, Wrench, X } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { OperationCreationDrawer } from "@platform/components/operation-creation-drawer";
import { Drawer } from "@erp/ui/drawer";
import { Gate } from "@erp/ui/auth/gate";
import { EmptyState } from "@erp/ui/empty-state";
import { SkeletonList } from "@erp/ui/skeletons";
import { StatusChip } from "@erp/ui/status-chip";
import { StatusPill } from "@erp/ui/status-pill";
import { ErrorState } from "@erp/ui/states";
import {
  assignmentsApi,
  customersApi,
  maintenanceRemindersApi,
  useQuery,
  type Assignment,
  type AssignmentStatus,
  type Customer,
  type MaintenanceReminder,
  type MaintenanceReminderStatus,
  type PmocUpcomingItem,
} from "@erp/api";
import { ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_PILL } from "@erp/ui/assignments/assignment-shared";

type AgendaTab = "overview" | "reminders";

const STATE_COLOR: Record<AssignmentStatus, string> = {
  ASSIGNED: "var(--color-info)",
  ACCEPTED: "var(--color-success)",
  STARTED: "var(--color-primary)",
  PAUSED: "var(--color-warning)",
  COMPLETED: "var(--color-success)",
  CANCELED: "var(--color-danger)",
  REJECTED: "var(--color-danger)",
};

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MAX_PER_CELL = 3;

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
/** Monday-based index 0..6. */
function mondayIndex(d: Date) { return (d.getDay() + 6) % 7; }
function dayKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function sameDay(a: Date, b: Date) { return dayKey(a) === dayKey(b); }

export default function AgendaPage() {
  const today = useMemo(() => new Date(), []);
  const [tab, setTab] = useState<AgendaTab>("overview");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [dayList, setDayList] = useState<{ date: Date; items: Assignment[] } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // 6-week grid covering the month (Monday-first).
  const gridStart = useMemo(() => {
    const first = startOfMonth(cursor);
    const s = new Date(first);
    s.setDate(first.getDate() - mondayIndex(first));
    s.setHours(0, 0, 0, 0);
    return s;
  }, [cursor]);
  const gridEnd = useMemo(() => {
    const e = new Date(gridStart);
    e.setDate(gridStart.getDate() + 41);
    e.setHours(23, 59, 59, 999);
    return e;
  }, [gridStart]);

  const cells = useMemo(
    () => Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    }),
    [gridStart],
  );

  // Assignments are the execution layer of Operations; Agenda is only a calendar view.
  const assignments = useQuery(
    (signal) => assignmentsApi.listAssignments({ limit: 100, signal }),
    [gridStart.getTime(), gridEnd.getTime()],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const it of assignments.data?.items ?? []) {
      const d = new Date(it.operation.scheduledFor ?? it.assignedAt);
      if (Number.isNaN(d.getTime())) continue;
      if (d < gridStart || d > gridEnd) continue;
      const k = dayKey(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    for (const arr of map.values()) arr.sort((a, b) => (a.operation.scheduledFor ?? a.assignedAt).localeCompare(b.operation.scheduledFor ?? b.assignedAt));
    return map;
  }, [assignments.data, gridStart, gridEnd]);

  const totalEvents = assignments.data?.items.length ?? 0;
  const years = useMemo(() => {
    const y = today.getFullYear();
    return Array.from({ length: 7 }, (_, i) => y - 3 + i);
  }, [today]);

  function setMonth(m: number) { setCursor((c) => new Date(c.getFullYear(), m, 1)); }
  function setYear(y: number) { setCursor((c) => new Date(y, c.getMonth(), 1)); }
  function shift(delta: number) { setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1)); }
  function goToday() { setCursor(startOfMonth(new Date())); }

  return (
    <div className="space-y-5 max-w-[1600px]">
      <PageHeader
        eyebrow={<span className="inline-flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> Planejamento</span>}
        title="Agenda"
        description="Calendário mensal dos atendimentos da operação."
        actions={
          <Gate roles={["OWNER", "MANAGER"]} permission="canSchedules">
            <button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium">
              <Plus className="h-4 w-4" /> Novo agendamento
            </button>
          </Gate>
        }
      />

      <nav className="flex gap-1 border-b border-[var(--color-border)]">
        {([["overview", "Visão geral"], ["reminders", "Lembretes"]] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`px-4 py-2.5 text-sm font-medium ${tab === value ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "reminders" && <RemindersTab />}

      {tab === "overview" && <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 shadow-[var(--shadow-card)]">
        <button type="button" onClick={goToday} className="h-9 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-muted)]">Hoje</button>
        <div className="flex items-center">
          <button type="button" onClick={() => shift(-1)} aria-label="Mês anterior" className="h-9 w-9 grid place-items-center rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => shift(1)} aria-label="Próximo mês" className="h-9 w-9 grid place-items-center rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <select value={cursor.getMonth()} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Mês" className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-2 text-sm outline-none focus:border-[var(--color-primary)]">
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <select value={cursor.getFullYear()} onChange={(e) => setYear(Number(e.target.value))} aria-label="Ano" className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-2 text-sm outline-none focus:border-[var(--color-primary)]">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="ml-auto text-caption inline-flex items-center gap-2">
          {assignments.loading && <span className="h-3 w-3 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />}
          {!assignments.loading && `${totalEvents} atendimento(s)`}
        </span>
      </div>

      {assignments.error && !assignments.data ? (
        <ErrorState error={assignments.error} onRetry={assignments.refetch} />
      ) : (
        <div key={`${cursor.getFullYear()}-${cursor.getMonth()}`} className="animate-fade-in rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] overflow-hidden">
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-muted)]/40">
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-2 text-center text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)] font-medium">{w}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {cells.map((date) => {
              const inMonth = date.getMonth() === cursor.getMonth();
              const isToday = sameDay(date, today);
              const items = byDay.get(dayKey(date)) ?? [];
              const visible = items.slice(0, MAX_PER_CELL);
              const extra = items.length - visible.length;
              return (
                <div
                  key={dayKey(date)}
                  className={`min-h-[116px] h-[116px] border-b border-r border-[var(--color-border)] p-1.5 flex flex-col overflow-hidden ${inMonth ? "" : "bg-[var(--color-muted)]/20"}`}
                >
                  <div className="flex items-center justify-between px-0.5">
                    <span className={`text-[12px] tabular-nums ${isToday ? "h-6 w-6 grid place-items-center rounded-full bg-[var(--color-primary)] text-white font-semibold" : inMonth ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"}`}>
                      {date.getDate()}
                    </span>
                  </div>
                  {assignments.loading && !assignments.data ? (
                    <div className="mt-1 space-y-1">
                      <div className="skeleton h-4" /><div className="skeleton h-4 w-2/3" />
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {visible.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => setSelected(ev)}
                          title={ev.operation.customer?.name ?? `Operation #${ev.operation.number}`}
                          className="w-full text-left rounded-[4px] px-1.5 py-0.5 text-[11px] leading-tight truncate hover:brightness-95 transition"
                          style={{ background: `color-mix(in srgb, ${STATE_COLOR[ev.status]} 14%, var(--color-card))`, color: STATE_COLOR[ev.status], boxShadow: `inset 2px 0 0 0 ${STATE_COLOR[ev.status]}` }}
                        >
                          <span className="font-mono text-[10px] opacity-80 mr-1">{new Date(ev.operation.scheduledFor ?? ev.assignedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                          {ev.operation.customer?.name ?? `OP-${String(ev.operation.number).padStart(6, "0")}`}
                        </button>
                      ))}
                      {extra > 0 && (
                        <button type="button" onClick={() => setDayList({ date, items })} className="w-full text-left px-1.5 text-[11px] font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                          +{extra} mais
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!assignments.loading && totalEvents === 0 && (
            <div className="px-4 py-3 text-center text-sm text-[var(--color-muted-foreground)] border-t border-[var(--color-border)]">
              Nenhum agendamento em {MONTHS[cursor.getMonth()].toLowerCase()} de {cursor.getFullYear()}.
            </div>
          )}
        </div>
      )}

      {/* Event drawer */}
      <Drawer open={selected !== null} onClose={() => setSelected(null)} eyebrow="Atendimento" title={selected ? `OP-${String(selected.operation.number).padStart(6, "0")}` : ""} width="max-w-md">
        {selected && (
          <div className="space-y-4">
            <StatusPill status={ASSIGNMENT_STATUS_PILL[selected.status]} label={ASSIGNMENT_STATUS_LABEL[selected.status]} />
            <div>
              <h3 className="font-semibold">{selected.operation.customer?.name ?? "Cliente não informado"}</h3>
              <p className="text-sm text-[var(--color-muted-foreground)]">{selected.operation.equipment?.name ?? "Sem equipamento"} · {selected.assignee.name}</p>
            </div>
            <div className="text-sm text-[var(--color-muted-foreground)]">
              {new Date(selected.operation.scheduledFor ?? selected.assignedAt).toLocaleString("pt-BR")}
            </div>
          </div>
        )}
      </Drawer>
      <OperationCreationDrawer open={createOpen} mode="schedule" onClose={() => setCreateOpen(false)} onCreated={() => assignments.refetch()} />

      {/* "+N mais" day drawer */}
      <Drawer
        open={dayList !== null}
        onClose={() => setDayList(null)}
        eyebrow="Agenda"
        title={dayList ? dayList.date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : ""}
        width="max-w-md"
      >
        {dayList && (
          <ul className="space-y-2">
            {dayList.items.map((ev) => (
              <li key={ev.id}>
                <button type="button" onClick={() => { setSelected(ev); setDayList(null); }} className="w-full text-left flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 hover:bg-[var(--color-muted)] transition-colors">
                    <span className="font-mono text-xs text-[var(--color-muted-foreground)] w-14 shrink-0">{new Date(ev.operation.scheduledFor ?? ev.assignedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate">{ev.operation.customer?.name ?? `OP-${String(ev.operation.number).padStart(6, "0")}`}</span>
                      <span className="block text-caption truncate">{ev.operation.equipment?.name ?? "Sem equipamento"} · {ev.assignee.name}</span>
                    </span>
                  <StatusPill status={ASSIGNMENT_STATUS_PILL[ev.status]} label={ASSIGNMENT_STATUS_LABEL[ev.status]} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Drawer>
      </>}
    </div>
  );
}

/* ---------------- Aba Lembretes ---------------- */

const TYPE_LABEL: Record<string, string> = {
  PREVENTIVA: "Preventiva",
  INSTALACAO: "Instalação",
  CORRETIVA: "Corretiva",
  PROJETO: "Projeto",
};
const STATUS_FILTERS: ReadonlyArray<readonly [MaintenanceReminderStatus, string]> = [
  ["PENDING", "Pendentes"],
  ["DONE", "Concluídos"],
  ["DISMISSED", "Dispensados"],
];
const smallBtn = "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-xs font-medium text-[var(--color-primary-foreground)] disabled:opacity-50";
const smallGhost = "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 text-xs font-medium hover:bg-[var(--color-muted)] disabled:opacity-50";

function reminderChip(active: boolean): string {
  return `h-8 rounded-full px-3 text-xs font-medium ${active ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "border border-[var(--color-border)] hover:bg-[var(--color-muted)]"}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function RemindersTab() {
  const [statusFilter, setStatusFilter] = useState<MaintenanceReminderStatus>("PENDING");
  const [customerId, setCustomerId] = useState("");
  const [tick, setTick] = useState(0);
  const bump = () => setTick((v) => v + 1);

  const stats = useQuery((s) => maintenanceRemindersApi.getReminderStats({ signal: s }), [tick]);
  const reminders = useQuery(
    (s) => maintenanceRemindersApi.listReminders({ status: statusFilter, customerId: customerId || undefined, limit: 50, signal: s }),
    [statusFilter, customerId, tick],
    { refetchInterval: 20_000, refetchOnFocus: true },
  );
  const customers = useQuery((s) => customersApi.listCustomers({ limit: 200, signal: s }), []);
  const pmocUpcoming = useQuery<PmocUpcomingItem[]>(
    (s) => (customerId ? maintenanceRemindersApi.listPmocUpcoming(customerId, { signal: s }) : Promise.resolve([])),
    [customerId],
  );

  async function patch(id: string, payload: { dueDate?: string; status?: MaintenanceReminderStatus; notes?: string }) {
    await maintenanceRemindersApi.updateReminder(id, payload);
    bump();
  }

  const items = reminders.data?.items ?? [];
  const kpis = stats.data;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReminderKpi icon={AlarmClock} label="Pendentes" value={kpis?.pending} tone="var(--color-primary)" />
        <ReminderKpi icon={AlertTriangle} label="Vencidos" value={kpis?.overdue} tone="var(--color-danger)" />
        <ReminderKpi icon={CalendarClock} label="Próximos 30 dias" value={kpis?.dueSoon} tone="var(--color-warning)" />
        <ReminderKpi icon={CircleCheck} label="Concluídos" value={kpis?.done} tone="var(--color-success)" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map(([value, label]) => (
          <button key={value} type="button" onClick={() => setStatusFilter(value)} className={reminderChip(statusFilter === value)}>{label}</button>
        ))}
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="ml-auto h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-2 text-sm outline-none focus:border-[var(--color-primary)]">
          <option value="">Todos os clientes</option>
          {(customers.data?.items ?? []).map((c: Customer) => <option key={c.id} value={c.id}>{c.tradeName ?? c.name}</option>)}
        </select>
      </div>

      {/* Prioridade visual: lembretes gerados a partir de OS */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><Wrench className="h-4 w-4 text-[var(--color-primary)]" /> Lembretes de manutenção (OS Preventiva/Instalação)</div>
        {reminders.loading && !reminders.data ? (
          <SkeletonList rows={5} />
        ) : reminders.error && !reminders.data ? (
          <ErrorState error={reminders.error} onRetry={reminders.refetch} />
        ) : items.length === 0 ? (
          <EmptyState icon={AlarmClock} title="Nenhum lembrete" description="Os lembretes são criados automaticamente ao registrar uma OS de manutenção preventiva ou instalação." />
        ) : (
          <ul className="space-y-2">{items.map((r) => <ReminderRow key={r.id} reminder={r} onPatch={patch} />)}</ul>
        )}
      </section>

      {/* Baixa prioridade: próximas execuções de PMOC (somente leitura) */}
      <section className="space-y-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/20 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]"><ShieldCheck className="h-3.5 w-3.5" /> Próximas execuções de PMOC · somente leitura</div>
        {!customerId ? (
          <p className="text-caption">Selecione um cliente acima para ver as próximas execuções previstas nos PMOCs ativos dele (até 5).</p>
        ) : pmocUpcoming.loading && !pmocUpcoming.data ? (
          <SkeletonList rows={2} />
        ) : (pmocUpcoming.data ?? []).length === 0 ? (
          <p className="text-caption">Nenhuma execução de PMOC prevista para este cliente.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {(pmocUpcoming.data ?? []).map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <CalendarClock className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
                <span className="min-w-0 flex-1 truncate">{p.planName ?? `PMOC-${String(p.pmocNumber).padStart(6, "0")}`}{p.equipment ? ` · ${p.equipment.name}` : ""}</span>
                <Link href={`/pmoc/${p.pmocId}`} className="shrink-0 text-xs text-[var(--color-primary)] hover:underline">execução {String(p.executionNumber).padStart(3, "0")}</Link>
                <span className="shrink-0 font-mono text-xs text-[var(--color-muted-foreground)]">{formatDate(p.scheduledFor)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ReminderKpi({ icon: Icon, label, value, tone }: { icon: typeof AlarmClock; label: string; value: number | undefined; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: `color-mix(in srgb, ${tone} 14%, transparent)`, color: tone }}><Icon className="h-5 w-5" /></span>
      <div>
        <div className="text-2xl font-semibold tabular-nums">{value ?? "—"}</div>
        <div className="text-caption">{label}</div>
      </div>
    </div>
  );
}

function ReminderRow({ reminder, onPatch }: { reminder: MaintenanceReminder; onPatch: (id: string, payload: { dueDate?: string; status?: MaintenanceReminderStatus }) => Promise<void> }) {
  const [date, setDate] = useState(reminder.dueDate.slice(0, 10));
  const [busy, setBusy] = useState(false);
  const overdue = reminder.status === "PENDING" && new Date(reminder.dueDate) < new Date();
  const changed = date !== reminder.dueDate.slice(0, 10);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  return (
    <li className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><Wrench className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{reminder.customer?.tradeName ?? reminder.customer?.name ?? "Cliente"}</span>
            <StatusChip tone={reminder.operationType === "PREVENTIVA" ? "info" : "primary"}>{TYPE_LABEL[reminder.operationType] ?? reminder.operationType}</StatusChip>
            {reminder.status === "DONE" && <StatusChip tone="success">Concluído</StatusChip>}
            {reminder.status === "DISMISSED" && <StatusChip tone="neutral">Dispensado</StatusChip>}
          </div>
          <div className="text-caption truncate">{reminder.equipment?.name ?? "Sem equipamento"}{reminder.operation ? ` · OS-${String(reminder.operation.number).padStart(6, "0")}` : ""}</div>
        </div>
        <div className={`shrink-0 text-right ${overdue ? "text-[var(--color-danger)]" : ""}`}>
          <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">Próxima prevista</div>
          <div className="text-sm font-semibold tabular-nums">{formatDate(reminder.dueDate)}{overdue ? " · vencido" : ""}</div>
        </div>
      </div>
      {reminder.status === "PENDING" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-border)] pt-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-2 text-sm outline-none focus:border-[var(--color-primary)]" />
          <button type="button" disabled={!changed || busy} onClick={() => run(() => onPatch(reminder.id, { dueDate: new Date(`${date}T12:00:00`).toISOString() }))} className={smallBtn}>Salvar data</button>
          {reminder.operationId && <Link href={`/operacoes?operationId=${reminder.operationId}`} className={smallGhost}>Abrir OS</Link>}
          <span className="ml-auto flex gap-1.5">
            <button type="button" disabled={busy} onClick={() => run(() => onPatch(reminder.id, { status: "DONE" }))} className={`${smallGhost} text-[var(--color-success)]`}><Check className="h-3.5 w-3.5" /> Concluir</button>
            <button type="button" disabled={busy} onClick={() => run(() => onPatch(reminder.id, { status: "DISMISSED" }))} className={`${smallGhost} text-[var(--color-muted-foreground)]`}><X className="h-3.5 w-3.5" /> Dispensar</button>
          </span>
        </div>
      ) : (
        <div className="mt-2 flex justify-end border-t border-[var(--color-border)] pt-2">
          <button type="button" disabled={busy} onClick={() => run(() => onPatch(reminder.id, { status: "PENDING" }))} className={smallGhost}>Reabrir</button>
        </div>
      )}
    </li>
  );
}
