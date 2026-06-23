import { Bell } from "lucide-react";

export function OperatorHeader({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return (
    <header className="flex items-center justify-between">
      <div>
        <p className="text-caption">{greet},</p>
        <h1 className="text-heading">{name}</h1>
      </div>
      <button
        type="button"
        aria-label="Notificações"
        className="relative h-11 w-11 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] grid place-items-center shadow-[var(--shadow-card)]"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--color-danger)]" />
      </button>
    </header>
  );
}
