"use client";

/**
 * OperatorHome — field-app home (mobile-first). Not a dashboard.
 * Serviços do dia, próximos, atalhos, equipamentos e clientes recentes.
 */
import Link from "next/link";
import { Plus, Calendar, Users, QrCode, Wrench, Building2, ChevronRight, ClipboardList, FileText, RefreshCw } from "lucide-react";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { SkeletonCard, SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { StatusPill, type Status } from "@erp/ui/status-pill";
import {
  financialApi, customersApi, equipmentsApi, useQuery,
  type DemoScheduleState, type ScheduleData,
} from "@erp/api";
import { firstName, greeting } from "@erp/utils";
import {
  EQUIPMENT_STATUS_LABEL, EQUIPMENT_STATUS_PILL, EQUIPMENT_TYPE_LABEL,
} from "@platform/equipment-display";

const STATE_PILL: Record<DemoScheduleState, Status> = {
  OVERDUE: "danger",
  IN_PROGRESS: "in_progress",
  SCHEDULED: "scheduled",
};

export function OperatorHome() {
  const { session } = useAuth();
  const sched = useQuery<ScheduleData>((signal) => financialApi.getSchedule({ signal }), []);
  const customers = useQuery((signal) => customersApi.listCustomers({ limit: 4, signal }), []);
  const equipments = useQuery((signal) => equipmentsApi.listEquipments({ limit: 4, signal }), []);

  const items = sched.data?.items ?? [];
  const today = items.filter((i) => i.state === "IN_PROGRESS" || i.state === "OVERDUE");
  const upcoming = items.filter((i) => i.state === "SCHEDULED");

  function fmt(iso: string) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="px-4 pt-4 pb-24 space-y-6">
      <header>
        <p className="text-caption">{greeting()},</p>
        <h1 className="text-[22px] font-semibold tracking-tight leading-tight">{firstName(session?.user.name ?? "Operador")}.</h1>
      </header>

      {/* CTA principal */}
      <Link
        href="/operator/atendimento"
        className="flex items-center gap-3 rounded-[var(--radius-xl)] bg-[var(--color-primary)] text-white p-4 shadow-[var(--shadow-hover)] active:scale-[0.99] transition-transform"
      >
        <span className="h-11 w-11 rounded-[var(--radius-lg)] bg-white/20 grid place-items-center"><Plus className="h-6 w-6" /></span>
        <span className="flex-1">
          <span className="block font-semibold">Novo atendimento</span>
          <span className="block text-[12px] opacity-90">Iniciar serviço em campo</span>
        </span>
        <ChevronRight className="h-5 w-5 opacity-90" />
      </Link>

      {/* Atalhos rápidos */}
      <div className="grid grid-cols-3 gap-2.5">
        <Shortcut href="/operator/qr" icon={QrCode} label="Escanear QR" />
        <Shortcut href="/operator/agenda" icon={Calendar} label="Agenda" />
        <Shortcut href="/operator/clientes" icon={Users} label="Clientes" />
        <Shortcut href="/operator/equipamentos" icon={Wrench} label="Equipamentos" />
        <Shortcut href="/operator/documents" icon={FileText} label="Documentos" />
        <Shortcut href="/operator/sync" icon={RefreshCw} label="Sincronizar" />
      </div>

      {/* Serviços do dia */}
      <Section title="Serviços do dia">
        {sched.loading && !sched.data ? (
          <SkeletonList rows={2} />
        ) : sched.error && !sched.data ? (
          <ErrorState error={sched.error} onRetry={sched.refetch} />
        ) : sched.data?.disabled ? (
          <ComingSoonState title="Sem dados" description="Ative o Demo Dataset para ver atendimentos." />
        ) : today.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Nada para hoje" description="Sem serviços em andamento." />
        ) : (
          <ul className="space-y-2">
            {today.map((s) => (
              <li key={s.id}>
                <Link href={`/operator/services/${s.id}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 shadow-[var(--shadow-card)] active:scale-[0.99] transition-transform">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{s.title}</div>
                    <div className="text-caption truncate">{s.customer} · {fmt(s.startsAt)}</div>
                  </div>
                  <StatusPill status={STATE_PILL[s.state]} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Próximos atendimentos */}
      {upcoming.length > 0 && (
        <Section title="Próximos atendimentos" action={<Link href="/operator/agenda" className="text-xs font-medium text-[var(--color-primary)]">agenda</Link>}>
          <ul className="space-y-2">
            {upcoming.slice(0, 4).map((s) => (
              <li key={s.id}>
                <Link href={`/operator/services/${s.id}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 active:scale-[0.99] transition-transform">
                  <span className="font-mono text-[11px] text-[var(--color-muted-foreground)] w-16 shrink-0">{fmt(s.startsAt)}</span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium truncate">{s.title}</span><span className="block text-caption truncate">{s.customer}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Equipamentos recentes */}
      <Section title="Equipamentos recentes" action={<Link href="/operator/clientes" className="text-xs font-medium text-[var(--color-primary)]">ver</Link>}>
        {equipments.loading && !equipments.data ? (
          <SkeletonCard />
        ) : (equipments.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={Wrench} title="Sem equipamentos" />
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {(equipments.data?.items ?? []).map((e) => (
              <li key={e.id}>
                <Link href={`/operator/equipamentos/${e.id}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 active:scale-[0.99] transition-transform">
                  <span className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--color-muted)] grid place-items-center text-[var(--color-muted-foreground)] shrink-0"><Wrench className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium truncate">{e.name}</span><span className="block text-caption truncate">{e.customer?.name ?? EQUIPMENT_TYPE_LABEL[e.type]}</span></span>
                  <StatusPill status={EQUIPMENT_STATUS_PILL[e.status]} label={EQUIPMENT_STATUS_LABEL[e.status]} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Clientes recentes */}
      <Section title="Clientes recentes" action={<Link href="/operator/clientes" className="text-xs font-medium text-[var(--color-primary)]">ver todos</Link>}>
        {customers.loading && !customers.data ? (
          <SkeletonCard />
        ) : (customers.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon={Building2} title="Sem clientes" />
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {(customers.data?.items ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/operator/clientes/${c.id}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 active:scale-[0.99] transition-transform">
                  <span className="h-9 w-9 rounded-[var(--radius-md)] bg-[var(--color-muted)] grid place-items-center text-[var(--color-muted-foreground)] shrink-0"><Building2 className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium truncate">{c.name}</span><span className="block text-caption truncate">{c.cnpj ?? c.cpf ?? c.phone ?? "—"}</span></span>
                  <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
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

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
