import Link from "next/link";
import { QrCode, FileText, Plus, Play, MapPin, Phone } from "lucide-react";
import { OperatorHeader } from "@/components/operator/operator-header";
import { QuickAction } from "@/components/operator/quick-action";
import { ServiceCard } from "@/components/operator/service-card";
import { ScheduleCard } from "@/components/operator/schedule-card";
import { operatorNext, operatorOngoing, operatorSchedule } from "@/mocks/data";

export default function OperatorHome() {
  return (
    <div className="px-4 pt-4 pb-24 space-y-6">
      <OperatorHeader name="Ana" />

      {operatorNext && (
        <section className="relative rounded-[var(--radius-xl)] overflow-hidden bg-gradient-to-br from-[var(--color-primary)] via-[color-mix(in_oklab,var(--color-primary)_70%,var(--color-accent))] to-[var(--color-accent)] p-5 text-white shadow-[var(--shadow-hover)]">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <p className="text-[10px] uppercase tracking-[0.12em] opacity-80">Próximo atendimento</p>
          <h2 className="mt-1 text-[20px] font-semibold leading-tight">{operatorNext.title}</h2>
          <p className="opacity-90 text-sm mt-1">{operatorNext.client}</p>
          <div className="mt-2 flex items-center gap-3 text-[12px] opacity-90">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> R. Augusta, 1480</span>
            <span>·</span>
            <span>{operatorNext.time}</span>
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              href="/operator/services"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-white text-[var(--color-primary)] py-3 text-sm font-semibold active:scale-[0.98]"
            >
              <Play className="h-4 w-4" />
              Iniciar
            </Link>
            <button className="h-11 w-11 rounded-[var(--radius-lg)] bg-white/15 hover:bg-white/25 grid place-items-center" aria-label="Ligar">
              <Phone className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2.5">Ações rápidas</h3>
        <div className="grid grid-cols-3 gap-2.5">
          <QuickAction icon={QrCode} label="Escanear QR" tone="primary" />
          <QuickAction icon={FileText} label="Abrir OS" tone="accent" />
          <QuickAction icon={Plus} label="Orçamento" tone="success" />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Em andamento</h3>
          <span className="text-[10px] rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 font-medium">{operatorOngoing.length}</span>
        </div>
        <div className="space-y-2">
          {operatorOngoing.map((s) => <ServiceCard key={s.id} {...s} />)}
        </div>
      </section>

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)] mb-2.5">Próximos</h3>
        <div className="space-y-2">
          {operatorSchedule.map((s) => <ScheduleCard key={s.id} {...s} />)}
        </div>
      </section>
    </div>
  );
}
