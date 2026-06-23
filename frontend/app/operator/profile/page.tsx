import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function OperatorProfile() {
  return (
    <div className="px-4 pt-6 space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-[var(--color-accent)] grid place-items-center text-[var(--color-accent-foreground)] font-semibold text-lg">
          AS
        </div>
        <div>
          <h1 className="text-heading">Ana Souza</h1>
          <p className="text-caption">Operadora · Turno tarde</p>
        </div>
      </header>

      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] divide-y divide-[var(--color-border)]">
        {[
          ["Atendimentos hoje", "12"],
          ["Tempo médio", "23 min"],
          ["Satisfação", "98%"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between p-4">
            <span className="text-[var(--color-muted-foreground)] text-sm">{k}</span>
            <span className="font-semibold tabular-nums">{v}</span>
          </div>
        ))}
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-4 flex items-center justify-between">
        <span className="text-sm">Tema</span>
        <ThemeToggle />
      </section>
    </div>
  );
}
