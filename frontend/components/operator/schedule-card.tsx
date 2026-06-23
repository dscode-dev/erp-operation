import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";

export function ScheduleCard({
  id,
  time,
  title,
  where,
}: {
  id: string;
  time: string;
  title: string;
  where: string;
}) {
  return (
    <Link
      href={`/operator/services/${id}`}
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card)] active:scale-[0.99] transition-transform"
    >
      <div className="font-mono text-sm w-14 text-[var(--color-muted-foreground)]">{time}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{title}</div>
        <div className="text-caption flex items-center gap-1 truncate">
          <MapPin className="h-3 w-3" /> {where}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
    </Link>
  );
}
