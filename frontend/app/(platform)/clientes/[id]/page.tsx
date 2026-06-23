import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, Mail, MapPin, FileText, Briefcase, Wrench, Activity, Clock } from "lucide-react";
import { Breadcrumbs } from "@/components/platform/breadcrumbs";
import { PageHeader } from "@/components/platform/page-header";
import { InfoCard, InfoRow } from "@/components/platform/info-card";
import { DataTable, type Column } from "@/components/platform/data-table";
import { StatusPill } from "@/components/shared/status-pill";
import { NewServiceButton } from "@/components/platform/new-service-button";
import { getClientById, type ClientServiceRow, type ClientEquipmentRow } from "@/mocks/data";

const serviceCols: Column<ClientServiceRow>[] = [
  { key: "code", header: "Código", className: "w-[110px]", cell: (s) => <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{s.code}</span> },
  { key: "title", header: "Atendimento", cell: (s) => <div className="font-medium truncate">{s.title}</div> },
  { key: "date", header: "Data", className: "w-[160px]", cell: (s) => <span className="font-mono text-xs">{s.date}</span> },
  { key: "op", header: "Operador", className: "w-[140px]", cell: (s) => <span className="text-sm">{s.operator}</span> },
  { key: "eq", header: "Equipamento", className: "w-[120px]", cell: (s) => <span className="font-mono text-xs">{s.equipmentTag}</span> },
  { key: "status", header: "Status", className: "w-[140px]", cell: (s) => <StatusPill status={s.status} /> },
];

const equipmentCols: Column<ClientEquipmentRow>[] = [
  { key: "tag", header: "Tag", className: "w-[110px]", cell: (e) => <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{e.tag}</span> },
  { key: "name", header: "Equipamento", cell: (e) => <div className="font-medium truncate">{e.name}</div> },
  { key: "loc", header: "Local", className: "w-[200px]", cell: (e) => <span className="text-sm truncate">{e.location}</span> },
  { key: "status", header: "Status", className: "w-[140px]", cell: (e) => <StatusPill status={e.status} /> },
];

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = getClientById(id);
  if (!client) notFound();

  const metrics = [
    { label: "Em aberto", value: client.metrics.open, icon: Briefcase },
    { label: "Equipamentos", value: client.metrics.equipments, icon: Wrench },
    { label: "Última visita", value: client.metrics.lastVisit, icon: Clock },
    { label: "SLA 90d", value: client.metrics.sla, icon: Activity },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <Breadcrumbs items={[{ label: "Clientes", href: "/clientes" }, { label: client.name }]} />

      <PageHeader
        eyebrow={client.segment}
        title={client.name}
        description={`${client.city} · ${client.since}`}
        actions={
          <>
            <button className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
              <FileText className="h-4 w-4" /> Exportar ficha
            </button>
            <NewServiceButton />
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <span className="text-caption">{label}</span>
              <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <InfoCard title="Atendimentos recentes" action={<Link href="/servicos" className="text-caption hover:text-[var(--color-foreground)]">Ver todos</Link>}>
            <DataTable columns={serviceCols} rows={client.services} />
          </InfoCard>

          <InfoCard title="Equipamentos no cliente" action={<Link href="/equipamentos" className="text-caption hover:text-[var(--color-foreground)]">Ver inventário</Link>}>
            <DataTable columns={equipmentCols} rows={client.equipments} />
          </InfoCard>
        </div>

        <div className="space-y-4">
          <InfoCard title="Dados do cliente">
            <div className="space-y-0">
              <InfoRow label="Documento" value={<span className="font-mono text-xs">{client.document}</span>} />
              <InfoRow label="Endereço" value={<span className="inline-flex items-center gap-1.5 justify-end"><MapPin className="h-3 w-3 opacity-70" /> {client.address}</span>} />
              <InfoRow label="Cidade" value={client.city} />
              <InfoRow label="Segmento" value={client.segment} />
              <InfoRow label="Contato principal" value={client.primaryContact} />
            </div>
          </InfoCard>

          <InfoCard title="Contatos">
            <ul className="space-y-3">
              {client.contacts.map((c) => (
                <li key={c.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{c.name}</span>
                    <span className="text-caption">{c.role}</span>
                  </div>
                  <div className="mt-2 flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
                      <Phone className="h-3 w-3" /> {c.phone}
                    </a>
                    <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
                      <Mail className="h-3 w-3" /> {c.email}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </InfoCard>

          <InfoCard title="Notas operacionais">
            <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">{client.notes}</p>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
