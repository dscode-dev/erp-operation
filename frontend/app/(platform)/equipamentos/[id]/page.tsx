import Link from "next/link";
import { notFound } from "next/navigation";
import { QrCode, Plus, MapPin, Calendar, ShieldCheck, Tag } from "lucide-react";
import { Breadcrumbs } from "@/components/platform/breadcrumbs";
import { PageHeader } from "@/components/platform/page-header";
import { InfoCard, InfoRow } from "@/components/platform/info-card";
import { DataTable, type Column } from "@/components/platform/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { getEquipmentById, type EquipmentHistoryRow } from "@/mocks/data";

const historyCols: Column<EquipmentHistoryRow>[] = [
  { key: "code", header: "Código", className: "w-[110px]", cell: (h) => <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{h.code}</span> },
  { key: "title", header: "Atendimento", cell: (h) => <div className="font-medium truncate">{h.title}</div> },
  { key: "date", header: "Data", className: "w-[160px]", cell: (h) => <span className="font-mono text-xs">{h.date}</span> },
  { key: "op", header: "Operador", className: "w-[140px]", cell: (h) => <span className="text-sm">{h.operator}</span> },
  { key: "status", header: "Status", className: "w-[140px]", cell: (h) => <StatusPill status={h.status} /> },
];

export default async function EquipamentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eq = getEquipmentById(id);
  if (!eq) notFound();

  return (
    <div className="space-y-6 max-w-[1400px]">
      <Breadcrumbs items={[{ label: "Equipamentos", href: "/equipamentos" }, { label: eq.name }]} />

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 uppercase tracking-wider">
            <Tag className="h-3 w-3" />
            <span className="font-mono">{eq.tag}</span>
          </span>
        }
        title={eq.name}
        description={`${eq.brand} ${eq.model} · ${eq.client}`}
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
              <QrCode className="h-4 w-4" /> Gerar QR
            </button>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]">
              <Plus className="h-4 w-4" /> Abrir serviço
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between"><span className="text-caption">Status</span></div>
          <div className="mt-2"><StatusPill status={eq.status} /></div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between"><span className="text-caption">Última manutenção</span><Calendar className="h-4 w-4 text-[var(--color-muted-foreground)]" /></div>
          <div className="mt-2 text-base font-medium font-mono">{eq.lastService}</div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between"><span className="text-caption">Próxima</span><Calendar className="h-4 w-4 text-[var(--color-muted-foreground)]" /></div>
          <div className="mt-2 text-base font-medium font-mono">{eq.nextService}</div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between"><span className="text-caption">Garantia até</span><ShieldCheck className="h-4 w-4 text-[var(--color-muted-foreground)]" /></div>
          <div className="mt-2 text-base font-medium font-mono">{eq.warrantyUntil}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <InfoCard title="Histórico de manutenções" action={<Link href="/servicos" className="text-caption hover:text-[var(--color-foreground)]">Ver fila</Link>}>
            <DataTable columns={historyCols} rows={eq.history} />
          </InfoCard>

          <InfoCard title="Especificações técnicas">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {eq.specs.map((s) => (
                <div key={s.label} className="flex items-center justify-between py-2 border-b last:border-0 border-[var(--color-border)]/60">
                  <dt className="text-caption">{s.label}</dt>
                  <dd className="text-sm font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>
          </InfoCard>
        </div>

        <div className="space-y-4">
          <InfoCard title="Identificação">
            <div className="space-y-0">
              <InfoRow label="Tag" value={<span className="font-mono text-xs">{eq.tag}</span>} />
              <InfoRow label="Fabricante" value={eq.brand} />
              <InfoRow label="Modelo" value={<span className="font-mono text-xs">{eq.model}</span>} />
              <InfoRow label="Série" value={<span className="font-mono text-xs">{eq.serial}</span>} />
              <InfoRow label="Instalado em" value={<span className="font-mono text-xs">{eq.installedAt}</span>} />
            </div>
          </InfoCard>

          <InfoCard title="Localização">
            <div className="space-y-0">
              <InfoRow label="Cliente" value={eq.client} />
              <InfoRow label="Local" value={<span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3 opacity-70" /> {eq.location}</span>} />
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
