type Member = { id: string; name: string; role: string; status: "online" | "em_servico" | "offline"; current?: string };

const TONE: Record<Member["status"], { label: string; dot: string; text: string }> = {
  online:     { label: "Online",        dot: "bg-[var(--color-success)]", text: "text-[var(--color-success)]" },
  em_servico: { label: "Em atendimento", dot: "bg-[var(--color-primary)]", text: "text-[var(--color-primary)]" },
  offline:    { label: "Offline",       dot: "bg-[var(--color-muted-foreground)]", text: "text-[var(--color-muted-foreground)]" },
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function TeamStatusList({ team }: { team: Member[] }) {
  return (
    <ul className="space-y-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] p-2">
      {team.map((m) => {
        const t = TONE[m.status];
        return (
          <li key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]/50">
            <div className="relative h-8 w-8 rounded-full bg-[var(--color-muted)] grid place-items-center text-[11px] font-semibold">
              {initials(m.name)}
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--color-card)] ${t.dot}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{m.name}</div>
              <div className="text-caption truncate">
                {m.current ? m.current : `${m.role} · ${t.label}`}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
