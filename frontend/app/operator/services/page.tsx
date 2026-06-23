import { ServiceCard } from "@/components/operator/service-card";
import { operatorOngoing, operatorSchedule } from "@/mocks/data";

export default function OperatorServices() {
  return (
    <div className="px-4 pt-6 space-y-6">
      <header>
        <h1 className="text-heading">Atendimentos</h1>
        <p className="text-[var(--color-muted-foreground)] text-sm">Fila do operador.</p>
      </header>
      <section>
        <h2 className="text-caption uppercase tracking-wider mb-2">Em andamento</h2>
        <div className="space-y-2">
          {operatorOngoing.map((s) => <ServiceCard key={s.id} {...s} />)}
        </div>
      </section>
      <section>
        <h2 className="text-caption uppercase tracking-wider mb-2">Agendados</h2>
        <div className="space-y-2">
          {operatorSchedule.map((s) => <ServiceCard key={s.id} {...s} priority={s.priority} />)}
        </div>
      </section>
    </div>
  );
}
