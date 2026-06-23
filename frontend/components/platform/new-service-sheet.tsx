"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Check, ChevronLeft, ChevronRight, Search, Plus, Trash2, Calendar, Clock, User, AlertTriangle } from "lucide-react";
import { clients, equipments } from "@/mocks/data";

type Step = 0 | 1 | 2 | 3 | 4;

const STEPS = [
  { id: 0, label: "Cliente" },
  { id: 1, label: "Equipamento" },
  { id: 2, label: "Tarefas" },
  { id: 3, label: "Agendamento" },
  { id: 4, label: "Resumo" },
] as const;

const operators = ["Ana S.", "Carlos L.", "Marina R.", "João P.", "Renato O.", "Sofia M."];

const defaultTasks = [
  "Conferir EPI e isolamento",
  "Diagnóstico inicial",
  "Execução do serviço",
  "Teste de funcionamento",
  "Coletar assinatura do cliente",
];

export function NewServiceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>(0);
  const [clientQuery, setClientQuery] = useState("");
  const [equipQuery, setEquipQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [equipmentId, setEquipmentId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<string[]>(defaultTasks);
  const [newTask, setNewTask] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [operator, setOperator] = useState<string>(operators[0]);
  const [priority, setPriority] = useState<"alta" | "média" | "baixa">("média");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setClientQuery(""); setEquipQuery("");
    setClientId(null); setEquipmentId(null);
    setTasks(defaultTasks); setNewTask("");
    setDate(""); setTime(""); setOperator(operators[0]);
    setPriority("média"); setNotes("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const selectedClient = useMemo(() => clients.find((c) => c.id === clientId) ?? null, [clientId]);
  const selectedEquip = useMemo(() => equipments.find((e) => e.id === equipmentId) ?? null, [equipmentId]);

  const filteredClients = clients.filter((c) =>
    [c.name, c.segment, c.city, c.contact].join(" ").toLowerCase().includes(clientQuery.toLowerCase()),
  );
  const filteredEquips = equipments.filter((e) => {
    const matchesClient = selectedClient ? e.client.toLowerCase().includes(selectedClient.name.toLowerCase().split(" ")[0].toLowerCase()) : true;
    const q = equipQuery.toLowerCase();
    return matchesClient && [e.tag, e.name, e.client, e.location].join(" ").toLowerCase().includes(q);
  });

  const canNext =
    (step === 0 && !!clientId) ||
    (step === 1 && !!equipmentId) ||
    (step === 2 && tasks.length > 0) ||
    (step === 3 && !!date && !!time && !!operator) ||
    step === 4;

  function next() { if (step < 4) setStep((step + 1) as Step); }
  function prev() { if (step > 0) setStep((step - 1) as Step); }

  function addTask() {
    const t = newTask.trim();
    if (!t) return;
    setTasks((arr) => [...arr, t]);
    setNewTask("");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Novo serviço"
        className="relative ml-auto h-full w-full max-w-xl bg-[var(--color-background)] border-l border-[var(--color-border)] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-border)]">
          <div>
            <p className="text-caption uppercase tracking-wider">Operação</p>
            <h2 className="text-xl font-semibold">Novo serviço</h2>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
              Etapa {step + 1} de {STEPS.length} · {STEPS[step].label}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-2 hover:bg-[var(--color-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  i < step
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : i === step
                    ? "bg-[var(--color-foreground)] text-[var(--color-background)]"
                    : "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px flex-1 ${i < step ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 0 && (
            <>
              <SearchInput value={clientQuery} onChange={setClientQuery} placeholder="Buscar cliente por nome, segmento ou cidade…" />
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredClients.map((c) => {
                  const active = c.id === clientId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setClientId(c.id)}
                      className={`w-full text-left rounded-[var(--radius-md)] border p-3 transition ${
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                          : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.name}</div>
                          <div className="text-caption truncate">{c.segment} · {c.city}</div>
                        </div>
                        {active && <Check className="h-4 w-4 text-[var(--color-primary)] shrink-0" />}
                      </div>
                    </button>
                  );
                })}
                {filteredClients.length === 0 && (
                  <p className="text-sm text-[var(--color-muted-foreground)] p-3">Nenhum cliente encontrado.</p>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              {selectedClient && (
                <p className="text-caption">
                  Mostrando equipamentos próximos a <strong>{selectedClient.name}</strong>.
                </p>
              )}
              <SearchInput value={equipQuery} onChange={setEquipQuery} placeholder="Buscar por tag, nome ou localização…" />
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {filteredEquips.map((e) => {
                  const active = e.id === equipmentId;
                  return (
                    <button
                      key={e.id}
                      onClick={() => setEquipmentId(e.id)}
                      className={`w-full text-left rounded-[var(--radius-md)] border p-3 transition ${
                        active
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                          : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{e.name}</div>
                          <div className="text-caption truncate font-mono">{e.tag} · {e.location}</div>
                        </div>
                        {active && <Check className="h-4 w-4 text-[var(--color-primary)] shrink-0" />}
                      </div>
                    </button>
                  );
                })}
                {filteredEquips.length === 0 && (
                  <p className="text-sm text-[var(--color-muted-foreground)] p-3">Nenhum equipamento encontrado.</p>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="text-sm font-medium">Tarefas a executar</label>
                <p className="text-caption">Esta lista vira o checklist do operador em campo.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
                  placeholder="Adicionar tarefa…"
                  className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  onClick={addTask}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-foreground)] text-[var(--color-background)] px-3 h-9 text-sm font-medium"
                >
                  <Plus className="h-4 w-4" /> Adicionar
                </button>
              </div>
              <ul className="space-y-1.5">
                {tasks.map((t, idx) => (
                  <li
                    key={`${t}-${idx}`}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-muted)] text-[11px] font-semibold">
                      {idx + 1}
                    </div>
                    <span className="flex-1 text-sm">{t}</span>
                    <button
                      onClick={() => setTasks((arr) => arr.filter((_, i) => i !== idx))}
                      aria-label="Remover tarefa"
                      className="rounded p-1 text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {step === 3 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data" icon={<Calendar className="h-4 w-4" />}>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]"
                  />
                </Field>
                <Field label="Hora" icon={<Clock className="h-4 w-4" />}>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]"
                  />
                </Field>
              </div>
              <Field label="Operador responsável" icon={<User className="h-4 w-4" />}>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]"
                >
                  {operators.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Prioridade" icon={<AlertTriangle className="h-4 w-4" />}>
                <div className="flex gap-2">
                  {(["baixa", "média", "alta"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 rounded-[var(--radius-md)] border px-3 h-9 text-sm capitalize transition ${
                        priority === p
                          ? p === "alta"
                            ? "border-[var(--color-danger)] bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                            : "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                          : "border-[var(--color-border)] hover:bg-[var(--color-muted)]"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Observações (opcional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Contexto adicional, restrições de acesso, contatos…"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] resize-none"
                />
              </Field>
            </>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <SummaryRow label="Cliente" value={selectedClient?.name} hint={selectedClient ? `${selectedClient.segment} · ${selectedClient.city}` : undefined} />
              <SummaryRow label="Equipamento" value={selectedEquip?.name} hint={selectedEquip ? `${selectedEquip.tag} · ${selectedEquip.location}` : undefined} />
              <SummaryRow label="Agendamento" value={date && time ? `${date} às ${time}` : undefined} hint={`Operador: ${operator}`} />
              <SummaryRow
                label="Prioridade"
                value={
                  <span className={`text-xs font-bold uppercase rounded px-1.5 py-0.5 ${
                    priority === "alta"
                      ? "bg-[var(--color-danger)]/10 text-[var(--color-danger)]"
                      : "bg-[var(--color-muted)]"
                  }`}>{priority}</span>
                }
              />
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <div className="text-caption uppercase tracking-wider mb-2">Checklist ({tasks.length})</div>
                <ol className="space-y-1.5 list-decimal list-inside text-sm">
                  {tasks.map((t, i) => <li key={i}>{t}</li>)}
                </ol>
              </div>
              {notes && (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                  <div className="text-caption uppercase tracking-wider mb-1">Observações</div>
                  <p className="text-sm whitespace-pre-wrap">{notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--color-border)] p-4 flex items-center justify-between gap-2">
          <button
            onClick={prev}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm disabled:opacity-40 hover:bg-[var(--color-muted)]"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
          {step < 4 ? (
            <button
              onClick={next}
              disabled={!canNext}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium disabled:opacity-40"
            >
              Continuar <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium"
            >
              <Check className="h-4 w-4" /> Criar serviço
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent pl-9 pr-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]"
      />
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryRow({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
      <div className="text-caption uppercase tracking-wider">{label}</div>
      <div className="font-medium mt-0.5">{value ?? <span className="text-[var(--color-muted-foreground)]">—</span>}</div>
      {hint && <div className="text-caption mt-0.5">{hint}</div>}
    </div>
  );
}
