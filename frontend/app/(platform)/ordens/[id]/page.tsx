import { notFound } from "next/navigation";
import {
  Printer,
  Share2,
  MessageSquare,
  MapPin,
  Phone,
  User,
  Calendar,
  Clock,
  Wrench,
  CheckCircle2,
  Circle,
  Paperclip,
  AlertTriangle,
  Info,
  Sparkles,
} from "lucide-react";
import { Breadcrumbs } from "@/components/platform/breadcrumbs";
import { PageHeader } from "@/components/platform/page-header";
import { InfoCard, InfoRow } from "@/components/platform/info-card";
import { StatusPill } from "@/components/shared/status-pill";
import { getWorkOrderById, type WorkOrderEvent, type WorkOrderType } from "@/mocks/data";

const typeLabel: Record<WorkOrderType, string> = {
  corretiva: "Corretiva",
  preventiva: "Preventiva",
  instalacao: "Instalação",
  diagnostico: "Diagnóstico",
};

const typeTone: Record<WorkOrderType, string> = {
  corretiva:   "bg-[var(--color-danger)]/10  text-[var(--color-danger)]",
  preventiva:  "bg-[var(--color-success)]/12 text-[var(--color-success)]",
  instalacao:  "bg-[var(--color-info)]/12    text-[var(--color-info)]",
  diagnostico: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
};

const slaTone: Record<"ok" | "warn" | "late", string> = {
  ok:   "text-[var(--color-success)] bg-[var(--color-success)]/10",
  warn: "text-[var(--color-warning)] bg-[var(--color-warning)]/15",
  late: "text-[var(--color-danger)]  bg-[var(--color-danger)]/12",
};

function TimelineDot({ tone }: { tone?: WorkOrderEvent["tone"] }) {
  const cls =
    tone === "ok"   ? "bg-[var(--color-success)]" :
    tone === "warn" ? "bg-[var(--color-warning)]" :
    tone === "late" ? "bg-[var(--color-danger)]"  :
    tone === "info" ? "bg-[var(--color-info)]"    :
                      "bg-[var(--color-muted-foreground)]";
  const Icon =
    tone === "warn" ? AlertTriangle :
    tone === "late" ? AlertTriangle :
    tone === "info" ? Info          :
    tone === "ok"   ? CheckCircle2  : Sparkles;
  return (
    <div className={`relative z-10 h-6 w-6 rounded-full ${cls} text-white grid place-items-center ring-4 ring-[var(--color-card)]`}>
      <Icon className="h-3 w-3" />
    </div>
  );
}

export default async function OrdemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = getWorkOrderById(id);
  if (!found) notFound();
  const wo = found;


  const doneCount = wo.checklist.filter((c) => c.done).length;
  const progress = wo.checklist.length === 0 ? 0 : Math.round((doneCount / wo.checklist.length) * 100);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <Breadcrumbs items={[{ label: "Ordens de Serviço", href: "/ordens" }, { label: wo.number }]} />

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2 uppercase tracking-wider">
            <span className="font-mono">{wo.number}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium normal-case tracking-normal ${typeTone[wo.type]}`}>
              {typeLabel[wo.type]}
            </span>
          </span>
        }
        title={wo.title}
        description={`${wo.client} · ${wo.equipmentTag !== "—" ? wo.equipmentTag + " · " : ""}${wo.address}`}
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
              <MessageSquare className="h-4 w-4" /> Comentar
            </button>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
              <Share2 className="h-4 w-4" /> Compartilhar
            </button>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]">
              <Printer className="h-4 w-4" /> Imprimir OS
            </button>
          </>
        }
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="text-caption">Status</div>
          <div className="mt-2 flex items-center gap-2"><StatusPill status={wo.status} /></div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between"><span className="text-caption">SLA</span><Clock className="h-4 w-4 text-[var(--color-muted-foreground)]" /></div>
          <div className="mt-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${slaTone[wo.sla.tone]}`}>{wo.sla.label}</span>
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between"><span className="text-caption">Agendada</span><Calendar className="h-4 w-4 text-[var(--color-muted-foreground)]" /></div>
          <div className="mt-2 text-base font-medium font-mono">{wo.scheduledFor}</div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between"><span className="text-caption">Valor total</span><Wrench className="h-4 w-4 text-[var(--color-muted-foreground)]" /></div>
          <div className="mt-2 text-base font-semibold tabular-nums">{wo.totals.total}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-4">
          <InfoCard title="Descrição">
            <p className="text-sm leading-relaxed text-[var(--color-foreground)]/90">{wo.description}</p>
          </InfoCard>

          <InfoCard
            title="Checklist de execução"
            action={
              <span className="text-caption tabular-nums">
                {doneCount}/{wo.checklist.length} · {progress}%
              </span>
            }
          >
            <div className="mb-3 h-1.5 w-full rounded-full bg-[var(--color-muted)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <ul className="space-y-1.5">
              {wo.checklist.map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-1.5">
                  {c.done ? (
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />
                  )}
                  <span className={`text-sm ${c.done ? "line-through text-[var(--color-muted-foreground)]" : ""}`}>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </InfoCard>

          <InfoCard title="Itens e mão de obra">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-caption text-left border-b border-[var(--color-border)]">
                    <th className="py-2 font-medium">Descrição</th>
                    <th className="py-2 font-medium w-[80px] text-right">Qtd.</th>
                    <th className="py-2 font-medium w-[60px]">Un.</th>
                    <th className="py-2 font-medium w-[110px] text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {wo.items.map((i) => (
                    <tr key={i.id} className="border-b last:border-0 border-[var(--color-border)]/60">
                      <td className="py-2">{i.label}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{i.qty}</td>
                      <td className="py-2 text-[var(--color-muted-foreground)]">{i.unit}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{i.price}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={3} className="pt-3 text-caption text-right">Mão de obra</td><td className="pt-3 text-right font-mono tabular-nums">{wo.totals.labor}</td></tr>
                  <tr><td colSpan={3} className="text-caption text-right">Peças e insumos</td><td className="text-right font-mono tabular-nums">{wo.totals.parts}</td></tr>
                  <tr><td colSpan={3} className="pt-2 text-sm font-semibold text-right">Total</td><td className="pt-2 text-right font-mono font-semibold tabular-nums">{wo.totals.total}</td></tr>
                </tfoot>
              </table>
            </div>
          </InfoCard>

          <InfoCard title="Linha do tempo">
            <ol className="relative space-y-4">
              <span className="absolute left-3 top-2 bottom-2 w-px bg-[var(--color-border)]" aria-hidden />
              {wo.timeline.map((ev) => (
                <li key={ev.id} className="relative flex gap-3 pl-0">
                  <TimelineDot tone={ev.tone} />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{ev.action}</span>
                      <span className="text-caption font-mono shrink-0">{ev.at}</span>
                    </div>
                    <div className="text-caption">
                      {ev.who}{ev.detail ? ` · ${ev.detail}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </InfoCard>
        </div>

        {/* Coluna lateral */}
        <div className="space-y-4">
          <InfoCard title="Cliente">
            <div className="space-y-0">
              <InfoRow label="Razão"     value={wo.client} />
              <InfoRow label="Contato"   value={<span className="inline-flex items-center gap-1.5"><User className="h-3 w-3 opacity-70" /> {wo.contact.name}</span>} />
              <InfoRow label="Função"    value={wo.contact.role} />
              <InfoRow label="Telefone"  value={<span className="inline-flex items-center gap-1.5 font-mono text-xs"><Phone className="h-3 w-3 opacity-70" /> {wo.contact.phone}</span>} />
              <InfoRow label="Endereço"  value={<span className="inline-flex items-start gap-1.5 text-right"><MapPin className="h-3 w-3 mt-0.5 opacity-70 shrink-0" /> <span>{wo.address}</span></span>} />
            </div>
          </InfoCard>

          <InfoCard title="Equipamento & operação">
            <div className="space-y-0">
              <InfoRow label="Equipamento" value={<span className="font-mono text-xs">{wo.equipmentTag}</span>} />
              <InfoRow label="Tipo"        value={<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${typeTone[wo.type]}`}>{typeLabel[wo.type]}</span>} />
              <InfoRow label="Operador"    value={wo.operator} />
              <InfoRow label="Abertura"    value={<span className="font-mono text-xs">{wo.openedAt}</span>} />
              <InfoRow label="Agendada"    value={<span className="font-mono text-xs">{wo.scheduledFor}</span>} />
              <InfoRow label="Prioridade"  value={wo.priority ? <span className="capitalize">{wo.priority}</span> : <span className="text-[var(--color-muted-foreground)]">normal</span>} />
            </div>
          </InfoCard>

          <InfoCard title="Anexos">
            {wo.attachments.length === 0 ? (
              <p className="text-caption">Nenhum anexo registrado.</p>
            ) : (
              <ul className="space-y-2">
                {wo.attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)]/60 px-2.5 py-2 hover:bg-[var(--color-muted)]/40 transition-colors">
                    <Paperclip className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate">{a.label}</div>
                      <div className="text-caption">{a.kind} · {a.size}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
