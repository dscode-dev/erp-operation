"use client";

/**
 * AutorizarDemandas (mobile) — mesmo fluxo da aba "Autorizar demandas" das
 * Operações na plataforma, adaptado ao app do operador. Exclusivo do OWNER:
 * libera para o app do técnico as demandas criadas pela gestão (que ficam
 * ocultas até a autorização). Reaproveita os endpoints compartilhados.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Check, Loader2, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { assignmentsApi, useQuery, type PendingDemandGroup } from "@erp/api";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { StatusChip } from "@erp/ui/status-chip";

function dayKeyOf(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "none";
}
function formatDay(day: string): string {
  const d = new Date(`${day}T12:00:00`);
  return Number.isNaN(d.getTime())
    ? day
    : d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
function bucketByDay(items: PendingDemandGroup["items"]): Array<[string, PendingDemandGroup["items"]]> {
  const map = new Map<string, PendingDemandGroup["items"]>();
  for (const item of items) {
    const key = dayKeyOf(item.scheduledFor);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()].sort((a, b) =>
    a[0] === "none" ? 1 : b[0] === "none" ? -1 : a[0].localeCompare(b[0]),
  );
}

export function AutorizarDemandas() {
  const router = useRouter();
  const { session } = useAuth();
  const isOwner = session?.role === "OWNER";

  // Acesso exclusivo do owner: qualquer outro perfil volta para a home.
  useEffect(() => {
    if (session && !isOwner) router.replace("/operator");
  }, [session, isOwner, router]);

  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [globalDate, setGlobalDate] = useState("");
  const [globalOperator, setGlobalOperator] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const q = useQuery<PendingDemandGroup[]>(
    (s) => assignmentsApi.listPendingDemands({ signal: s }),
    [tick],
    { refetchInterval: 20_000, refetchOnFocus: true },
  );

  async function authorize(payload: { operatorId?: string; date?: string }) {
    setBusy(true);
    setMsg(null);
    try {
      const { authorized } = await assignmentsApi.authorizeDemands(payload);
      setMsg(
        authorized > 0
          ? `${authorized} demanda(s) liberada(s) para o app do operador.`
          : "Nenhuma demanda correspondente para autorizar.",
      );
      setTick((v) => v + 1);
    } catch {
      setMsg("Não foi possível autorizar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  if (!isOwner) return null;

  const groups = q.data ?? [];

  return (
    <div className="px-4 pt-4 pb-24 space-y-5">
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/operator")}
          aria-label="Voltar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--color-border)]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-caption uppercase tracking-wider">Operações</p>
          <h1 className="text-[22px] font-semibold tracking-tight leading-tight">Autorizar demandas</h1>
        </div>
      </header>

      <p className="text-sm text-[var(--color-muted-foreground)]">
        As demandas criadas pela gestão ficam <strong>ocultas</strong> no app do operador até você
        autorizar aqui. Itens já em andamento ou concluídos permanecem visíveis.
      </p>

      <section className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="h-4 w-4 text-[var(--color-primary)]" /> Autorização geral por dia
        </h3>
        <label className="grid gap-1 text-xs font-medium">
          Dia
          <input
            type="date"
            value={globalDate}
            onChange={(e) => setGlobalDate(e.target.value)}
            className="h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium">
          Técnico (opcional)
          <select
            value={globalOperator}
            onChange={(e) => setGlobalOperator(e.target.value)}
            className="h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm"
          >
            <option value="">Todos os técnicos</option>
            {groups.map((g) => (
              <option key={g.operator.id} value={g.operator.id}>{g.operator.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!globalDate || busy}
          onClick={() => authorize({ date: globalDate, operatorId: globalOperator || undefined })}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary-foreground)] disabled:opacity-50 active:scale-[0.99]"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Autorizar dia
        </button>
      </section>

      {msg && (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-3 py-2 text-sm text-[var(--color-primary)]">
          {msg}
        </p>
      )}

      {q.loading && !q.data ? (
        <SkeletonList rows={4} />
      ) : q.error && !q.data ? (
        <ErrorState error={q.error} onRetry={q.refetch} />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nada aguardando autorização"
          description="Todas as demandas agendadas já estão visíveis para os técnicos."
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <DemandGroupCard key={group.operator.id} group={group} busy={busy} onAuthorize={authorize} />
          ))}
        </div>
      )}
    </div>
  );
}

function DemandGroupCard({
  group,
  busy,
  onAuthorize,
}: {
  group: PendingDemandGroup;
  busy: boolean;
  onAuthorize: (payload: { operatorId?: string; date?: string }) => void;
}) {
  const days = bucketByDay(group.items);
  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Users className="h-4 w-4" />
          </span>
          <strong className="truncate text-sm">{group.operator.name}</strong>
          <StatusChip tone="warning">{group.total} pendente(s)</StatusChip>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAuthorize({ operatorId: group.operator.id })}
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-3 text-sm font-medium text-[var(--color-primary-foreground)] disabled:opacity-50"
        >
          <Check className="h-4 w-4" /> Autorizar tudo
        </button>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {days.map(([day, items]) => (
          <li key={day} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2">
              <CalendarClock className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
              <span className="truncate">
                {day === "none" ? "Sem data agendada" : formatDay(day)} · {items.length} operação(ões)
              </span>
            </span>
            {day !== "none" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onAuthorize({ operatorId: group.operator.id, date: day })}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] px-2.5 text-xs font-medium disabled:opacity-50"
              >
                Autorizar dia
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
