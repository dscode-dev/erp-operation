"use client";

import Link from "next/link";
import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import {
  ArrowLeft,
  Phone,
  MapPin,
  QrCode,
  CheckCircle2,
  Circle,
  Play,
  PauseCircle,
  FileText,
} from "lucide-react";
import { StatusPill } from "@/components/shared/status-pill";
import { operatorServiceDetails } from "@/mocks/data";

export default function OperatorServiceDetail() {
  const params = useParams<{ id: string }>();
  const initial = operatorServiceDetails[params.id];

  if (!initial) notFound();

  const [checklist, setChecklist] = useState(initial.checklist);
  const done = checklist.filter((c) => c.done).length;
  const total = checklist.length;
  const pct = Math.round((done / total) * 100);

  function toggle(id: string) {
    setChecklist((prev) => prev.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  }

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-10 bg-[var(--color-background)]/85 backdrop-blur border-b border-[var(--color-border)] px-4 py-3 flex items-center gap-3">
        <Link
          href="/operator/services"
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-[var(--color-muted)]"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[11px] text-[var(--color-muted-foreground)]">{initial.code}</p>
          <h1 className="text-base font-semibold truncate">{initial.title}</h1>
        </div>
        <StatusPill status={initial.status} />
      </header>

      <div className="px-4 pt-4 space-y-5">
        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] space-y-3">
          <div>
            <p className="text-caption uppercase tracking-wider">Cliente</p>
            <p className="font-semibold">{initial.client}</p>
            <p className="text-caption">{initial.contact}</p>
          </div>

          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-[var(--color-muted-foreground)] mt-0.5 shrink-0" />
            <span className="flex-1">{initial.address}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${initial.phone.replace(/\D/g, "")}`}
              className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] py-2.5 text-sm font-medium hover:bg-[var(--color-muted)]"
            >
              <Phone className="h-4 w-4" /> Ligar
            </a>
            <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] py-2.5 text-sm font-medium hover:bg-[var(--color-muted)]">
              <MapPin className="h-4 w-4" /> Rota
            </button>
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-caption uppercase tracking-wider mb-2">Equipamento</p>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 grid place-items-center rounded-[var(--radius-md)] bg-[var(--color-muted)]">
              <QrCode className="h-5 w-5 text-[var(--color-muted-foreground)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{initial.equipment.name}</p>
              <p className="text-caption truncate">
                <span className="font-mono">{initial.equipment.tag}</span> · {initial.equipment.location}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <p className="text-caption uppercase tracking-wider mb-2">Descrição</p>
          <p className="text-sm leading-relaxed">{initial.description}</p>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-caption uppercase tracking-wider">Checklist</p>
            <span className="text-xs font-medium font-mono">
              {done}/{total} · {pct}%
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-[var(--color-muted)] overflow-hidden mb-3">
            <div
              className="h-full bg-[var(--color-primary)] transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <ul className="space-y-1">
            {checklist.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center gap-3 rounded-[var(--radius-md)] p-2 text-left hover:bg-[var(--color-muted)] transition-colors"
                >
                  {item.done ? (
                    <CheckCircle2 className="h-5 w-5 text-[var(--color-success)] shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-[var(--color-muted-foreground)] shrink-0" />
                  )}
                  <span
                    className={
                      "text-sm flex-1 " +
                      (item.done ? "line-through text-[var(--color-muted-foreground)]" : "")
                    }
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid grid-cols-2 gap-2">
          <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] py-3 text-sm font-medium hover:bg-[var(--color-muted)]">
            <FileText className="h-4 w-4" /> Anexar
          </button>
          <button className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] py-3 text-sm font-medium hover:bg-[var(--color-muted)]">
            <PauseCircle className="h-4 w-4" /> Pausar
          </button>
        </section>

        <button className="w-full inline-flex items-center justify-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] py-4 font-semibold shadow-[var(--shadow-hover)] active:scale-[0.99] transition-transform">
          {initial.status === "in_progress" ? (
            <>
              <CheckCircle2 className="h-5 w-5" /> Finalizar atendimento
            </>
          ) : (
            <>
              <Play className="h-5 w-5" /> Iniciar atendimento
            </>
          )}
        </button>
      </div>
    </div>
  );
}
