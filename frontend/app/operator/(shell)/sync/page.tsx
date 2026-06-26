"use client";

/**
 * Sincronização — fila local (outbox) de atendimentos.
 *
 * Offline-ready: os envios ficam na fila até o domínio de Serviços existir
 * (Backend Sprint 6). O flush real será habilitado então; aqui mostramos o
 * estado da fila de forma honesta.
 */
import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, Clock, Trash2, CloudOff } from "lucide-react";
import { StatusChip, type ChipTone } from "@erp/ui/status-chip";
import { EmptyState } from "@erp/ui/empty-state";
import { listOutbox, removeFromOutbox, flushOutbox, type OutboxItem } from "@operator/lib/offline-queue";
import { formatDateTime } from "@erp/utils";

const STATUS: Record<OutboxItem["status"], { tone: ChipTone; label: string }> = {
  pending: { tone: "warning", label: "Pendente" },
  syncing: { tone: "info", label: "Sincronizando" },
  sent: { tone: "success", label: "Enviado" },
  error: { tone: "danger", label: "Erro" },
};

export default function OperatorSyncPage() {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [flushing, setFlushing] = useState(false);

  function reload() {
    setItems(listOutbox());
  }
  useEffect(() => { reload(); }, []);

  async function onFlush() {
    setFlushing(true);
    await flushOutbox();
    reload();
    setFlushing(false);
  }

  const pending = items.filter((i) => i.status === "pending" || i.status === "error").length;

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Sincronização</h1>
          <p className="text-caption">{pending} item(ns) na fila de envio.</p>
        </div>
        <button type="button" onClick={onFlush} disabled={flushing || items.length === 0} className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white px-3 h-10 text-sm font-semibold disabled:opacity-50 active:scale-[0.98] shrink-0">
          <RefreshCw className={`h-4 w-4 ${flushing ? "animate-spin" : ""}`} /> Sincronizar
        </button>
      </header>

      <div className="rounded-[var(--radius-md)] border border-[var(--color-info)]/30 bg-[var(--color-info)]/10 px-3 py-2 text-sm text-[var(--color-info)] flex items-start gap-2">
        <CloudOff className="h-4 w-4 mt-0.5 shrink-0" />
        Os atendimentos ficam salvos no aparelho e serão enviados automaticamente quando o domínio de Serviços estiver disponível no backend.
      </div>

      {items.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nada na fila" description="Todos os atendimentos foram enviados." />
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3.5">
              <Clock className="h-5 w-5 text-[var(--color-muted-foreground)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">Atendimento · {it.kind}</div>
                <div className="text-caption truncate">{formatDateTime(it.createdAt)}</div>
              </div>
              <StatusChip tone={STATUS[it.status].tone} dot>{STATUS[it.status].label}</StatusChip>
              <button type="button" onClick={() => { removeFromOutbox(it.id); reload(); }} aria-label="Remover" className="h-8 w-8 grid place-items-center rounded-[var(--radius-md)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-danger)]">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
