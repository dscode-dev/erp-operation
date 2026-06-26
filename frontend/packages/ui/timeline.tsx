/**
 * Timeline — reusable vertical timeline (Cliente, Equipamento, Serviço).
 *
 * Each event has a kind that drives the icon/color: instalação, manutenção,
 * visita, documento, observação. Presentational; data comes from the caller
 * (Demo Dataset for now).
 */
import { Wrench, ClipboardCheck, MapPin, FileText, StickyNote, type LucideIcon } from "lucide-react";

export type TimelineKind = "INSTALL" | "MAINTENANCE" | "VISIT" | "DOCUMENT" | "NOTE";

export type TimelineEvent = {
  id: string;
  at: string;
  kind: TimelineKind;
  label: string;
  meta?: string;
};

const KIND: Record<TimelineKind, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  INSTALL: { icon: Wrench, color: "var(--color-primary)", bg: "var(--color-primary)", label: "Instalação" },
  MAINTENANCE: { icon: ClipboardCheck, color: "var(--color-success)", bg: "var(--color-success)", label: "Manutenção" },
  VISIT: { icon: MapPin, color: "var(--color-info)", bg: "var(--color-info)", label: "Visita" },
  DOCUMENT: { icon: FileText, color: "var(--color-accent)", bg: "var(--color-accent)", label: "Documento" },
  NOTE: { icon: StickyNote, color: "var(--color-muted-foreground)", bg: "var(--color-muted-foreground)", label: "Observação" },
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[var(--color-muted-foreground)] py-4 text-center">Sem eventos no histórico.</p>;
  }
  return (
    <ol className="relative">
      {events.map((e, i) => {
        const k = KIND[e.kind];
        const Icon = k.icon;
        const last = i === events.length - 1;
        return (
          <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-[var(--color-border)]" aria-hidden />}
            <span className="relative z-10 h-8 w-8 rounded-full grid place-items-center shrink-0" style={{ backgroundColor: `color-mix(in srgb, ${k.bg} 14%, transparent)`, color: k.color }}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: k.color }}>{k.label}</span>
                <span className="text-caption">· {fmt(e.at)}</span>
              </div>
              <p className="text-sm mt-0.5">{e.label}</p>
              {e.meta && <p className="text-caption">{e.meta}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
