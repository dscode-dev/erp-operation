import Link from "next/link";
import { QrCode, FileText, Plus, Play } from "lucide-react";
import { OperatorHeader } from "@/components/operator/operator-header";
import { QuickAction } from "@/components/operator/quick-action";
import { ServiceCard } from "@/components/operator/service-card";
import { ScheduleCard } from "@/components/operator/schedule-card";
import { operatorNext, operatorOngoing, operatorSchedule } from "@/mocks/data";

export default function OperatorHome() {
  return (
    <div className="px-4 pt-4 space-y-6">
      <OperatorHeader name="Ana" />

      {operatorNext && (
        <section className="rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] p-5 text-[var(--color-primary-foreground)] shadow-[var(--shadow-hover)]">
          <p className="text-xs uppercase tracking-wider opacity-80">Próximo atendimento</p>
          <h2 className="mt-1 text-xl font-semibold">{operatorNext.title}</h2>
          <p className="opacity-90 text-sm">
            {operatorNext.client} · {operatorNext.time}
          </p>
          <Link
            href="/operator/services"
            className="mt-4 inline-flex items-center justify-center gap-2 w-full rounded-[var(--radius-lg)] bg-white/15 hover:bg-white/25 transition-colors py-3 text-base font-semibold backdrop-blur"
          >
            <Play className="h-5 w-5" />
            Iniciar atendimento
          </Link>
        </section>
      )}

      <section>
        <h3 className="text-caption uppercase tracking-wider mb-2">Ações rápidas</h3>
        <div className="grid grid-cols-3 gap-3">
          <QuickAction icon={QrCode} label="Escanear QR" />
          <QuickAction icon={FileText} label="Abrir OS" />
          <QuickAction icon={Plus} label="Orçamento" />
        </div>
      </section>

      <section>
        <h3 className="text-caption uppercase tracking-wider mb-2">Em andamento</h3>
        <div className="space-y-2">
          {operatorOngoing.map((s) => <ServiceCard key={s.id} {...s} />)}
        </div>
      </section>

      <section>
        <h3 className="text-caption uppercase tracking-wider mb-2">Próximos</h3>
        <div className="space-y-2">
          {operatorSchedule.map((s) => <ScheduleCard key={s.id} {...s} />)}
        </div>
      </section>
    </div>
  );
}
