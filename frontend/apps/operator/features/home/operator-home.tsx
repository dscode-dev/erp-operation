"use client";

/**
 * OperatorHome — field-app home powered by real Assignments.
 * This is intentionally not an admin dashboard: it prioritizes today's work,
 * large cards and fast one-handed actions.
 */
import Link from "next/link";
import { Calendar, ClipboardList, FileText, QrCode, RefreshCw, Wrench } from "lucide-react";
import { AssignmentCard } from "@operator/components/assignment-card";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { assignmentsApi, useQuery, type Assignment } from "@erp/api";
import { firstName, greeting } from "@erp/utils";

function isSameDay(iso: string | null | undefined, target = new Date()) {
  if (!iso) return false;
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && date.toDateString() === target.toDateString();
}

function isPast(assignment: Assignment) {
  const iso = assignment.operation.scheduledFor;
  if (!iso || ["COMPLETED", "CANCELED", "REJECTED"].includes(assignment.status)) return false;
  return new Date(iso).getTime() < Date.now() && !isSameDay(iso);
}

export function OperatorHome() {
  const { session } = useAuth();
  const assignments = useQuery((signal) => assignmentsApi.listMyAssignments({ limit: 50, signal }), []);
  const items = assignments.data?.items ?? [];
  const today = items.filter((item) => isSameDay(item.operation.scheduledFor));
  const ongoing = items.filter((item) => item.status === "STARTED");
  const upcoming = items.filter((item) => Boolean(item.operation.scheduledFor) && !isSameDay(item.operation.scheduledFor) && !isPast(item)).slice(0, 4);
  const overdue = items.filter(isPast);

  return (
    <div className="px-4 pt-4 pb-24 space-y-6">
      <header>
        <p className="text-caption">{greeting()},</p>
        <h1 className="text-[22px] font-semibold tracking-tight leading-tight">{firstName(session?.user.name ?? "Operador")}.</h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Sua fila de campo está pronta.</p>
      </header>

      <div className="grid grid-cols-2 gap-2.5">
        <Metric label="Hoje" value={today.length} />
        <Metric label="Em andamento" value={ongoing.length} tone="primary" />
        <Metric label="Próximas" value={upcoming.length} />
        <Metric label="Atrasadas" value={overdue.length} tone={overdue.length ? "danger" : "muted"} />
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        <Shortcut href="/operator/services" icon={ClipboardList} label="Ordens" />
        <Shortcut href="/operator/qr" icon={QrCode} label="QR" />
        <Shortcut href="/operator/agenda" icon={Calendar} label="Agenda" />
        <Shortcut href="/operator/documents" icon={FileText} label="Docs" />
      </div>

      {assignments.loading && !assignments.data ? (
        <SkeletonList rows={4} />
      ) : assignments.error && !assignments.data ? (
        <ErrorState error={assignments.error} onRetry={assignments.refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon={Wrench} title="Sem atividades atribuídas" description="Quando uma Ordem de Serviço for atribuída, ela aparecerá aqui." />
      ) : (
        <>
          {ongoing.length > 0 && (
            <Section title="Em andamento">
              {ongoing.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}
            </Section>
          )}
          {today.length > 0 && <Section title="Hoje">{today.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}</Section>}
          {today.length === 0 && <Section title="Minhas atividades">{items.slice(0, 3).map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}</Section>}
          {overdue.length > 0 && (
            <Section title="Atrasadas">
              {overdue.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} />)}
            </Section>
          )}
        </>
      )}

      <Link href="/operator/sync" className="inline-flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
        <RefreshCw className="h-4 w-4" /> Sincronização offline permanece fora do escopo desta sprint.
      </Link>
    </div>
  );
}

function Metric({ label, value, tone = "muted" }: { label: string; value: number; tone?: "muted" | "primary" | "danger" }) {
  const cls =
    tone === "primary" ? "text-[var(--color-primary)]"
    : tone === "danger" ? "text-[var(--color-danger)]"
    : "text-[var(--color-foreground)]";
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
      <div className={`text-2xl font-semibold tabular-nums ${cls}`}>{value}</div>
      <div className="text-[12px] text-[var(--color-muted-foreground)]">{label}</div>
    </div>
  );
}

function Shortcut({ href, icon: Icon, label }: { href: string; icon: typeof Calendar; label: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] py-4 active:scale-[0.97] transition-transform">
      <Icon className="h-6 w-6 text-[var(--color-primary)]" />
      <span className="text-[12px] font-medium">{label}</span>
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
