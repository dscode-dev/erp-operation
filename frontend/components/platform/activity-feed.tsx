export type ActivityItem = { id: number; who: string; what: string; when: string };

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] divide-y divide-[var(--color-border)]">
      {items.map((a) => (
        <li key={a.id} className="flex items-start gap-3 p-3 text-sm">
          <div className="h-7 w-7 shrink-0 rounded-full bg-[var(--color-muted)] grid place-items-center text-[10px] font-semibold">
            {a.who.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate"><span className="font-medium">{a.who}</span> <span className="text-[var(--color-muted-foreground)]">{a.what}</span></div>
            <div className="text-caption">{a.when}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
