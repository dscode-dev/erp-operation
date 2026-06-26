"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Phone, Mail, MapPin, FileText, Wrench, Building2, Pencil } from "lucide-react";
import { Breadcrumbs } from "@platform/components/breadcrumbs";
import { PageHeader } from "@platform/components/page-header";
import { InfoCard, InfoRow } from "@platform/components/info-card";
import { DataTable, type Column } from "@platform/components/data-table";
import { StatusPill, type Status } from "@erp/ui/status-pill";
import { SkeletonCard } from "@erp/ui/skeletons";
import { AsyncBoundary } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { Gate } from "@erp/ui/auth/gate";
import { CustomerFormDrawer } from "@platform/components/customer-form-drawer";
import { ExportButton } from "@platform/components/export-button";
import {
  customersApi,
  equipmentsApi,
  useQuery,
  type CustomerDetail,
  type EquipmentStatus,
  type EquipmentSummary,
} from "@erp/api";
import { formatDate, maskCep } from "@erp/utils";

const EQUIPMENT_STATUS: Record<EquipmentStatus, Status> = {
  ACTIVE: "success",
  MAINTENANCE: "warning",
  INACTIVE: "offline",
  RETIRED: "danger",
};

const equipmentCols: Column<EquipmentSummary>[] = [
  { key: "tag", header: "Tag", className: "w-[120px]", cell: (e) => <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{e.tag ?? "—"}</span> },
  { key: "name", header: "Equipamento", cell: (e) => <div className="font-medium truncate">{e.name}</div> },
  { key: "type", header: "Tipo", className: "w-[140px]", cell: (e) => <span className="text-sm">{e.type}</span> },
  { key: "status", header: "Status", className: "w-[140px]", cell: (e) => <StatusPill status={EQUIPMENT_STATUS[e.status]} /> },
];

export default function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [editing, setEditing] = useState(false);

  const detail = useQuery<CustomerDetail>((signal) => customersApi.getCustomer(id, { signal }), [id]);
  const equipments = useQuery(
    (signal) => equipmentsApi.listEquipments({ customerId: id, limit: 50, signal }),
    [id],
  );

  return (
    <div className="space-y-6 max-w-[1400px]">
      <Breadcrumbs items={[{ label: "Clientes", href: "/clientes" }, { label: detail.data?.name ?? "…" }]} />

      <AsyncBoundary
        loading={detail.loading}
        error={detail.error}
        data={detail.data}
        onRetry={detail.refetch}
        skeleton={<div className="grid gap-3 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
      >
        {(c) => (
          <>
            <PageHeader
              eyebrow={c.type === "COMPANY" ? "Empresa" : "Pessoa"}
              title={c.name}
              description={c.tradeName ?? c.email ?? undefined}
              actions={
                <>
                  <ExportButton
                    label="Exportar ficha"
                    fileName={`cliente-${c.id}`}
                    rows={[c]}
                  />
                  <Gate roles={["OWNER", "MANAGER"]}>
                    <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]">
                      <Pencil className="h-4 w-4" /> Editar
                    </button>
                  </Gate>
                </>
              }
            />

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={c.isActive ? "success" : "offline"} label={c.isActive ? "Ativo" : "Inativo"} />
              <span className="text-caption">Cadastrado em {formatDate(c.createdAt)}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <InfoCard
                  title="Equipamentos no cliente"
                  action={<Link href={`/equipamentos?customerId=${c.id}`} className="text-caption hover:text-[var(--color-foreground)]">Ver inventário</Link>}
                >
                  {equipments.loading && !equipments.data ? (
                    <SkeletonCard />
                  ) : equipments.data && equipments.data.items.length > 0 ? (
                    <DataTable columns={equipmentCols} rows={equipments.data.items} rowHref={(e) => `/equipamentos/${e.id}`} />
                  ) : (
                    <EmptyState icon={Wrench} title="Sem equipamentos" description="Nenhum equipamento vinculado a este cliente." />
                  )}
                </InfoCard>

                {c.addresses.length > 0 && (
                  <InfoCard title="Endereços">
                    <ul className="space-y-2">
                      {c.addresses.map((a) => (
                        <li key={a.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                            <span className="text-sm font-medium">{a.name ?? "Endereço"}</span>
                            {a.isPrimary && <span className="text-[10px] uppercase rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5">Principal</span>}
                          </div>
                          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                            {[a.street, a.number, a.district].filter(Boolean).join(", ")}
                            {a.city ? ` — ${a.city}/${a.state ?? ""}` : ""}
                            {a.zipCode ? ` · CEP ${maskCep(a.zipCode)}` : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </InfoCard>
                )}
              </div>

              <div className="space-y-4">
                <InfoCard title="Dados do cliente">
                  <InfoRow label="Documento" value={<span className="font-mono text-xs">{c.cnpj ?? c.cpf ?? "—"}</span>} />
                  <InfoRow label="E-mail" value={c.email ?? "—"} />
                  <InfoRow label="Telefone" value={c.phone ?? "—"} />
                  {c.secondaryPhone && <InfoRow label="Telefone 2" value={c.secondaryPhone} />}
                </InfoCard>

                <InfoCard title={`Contatos (${c.contacts.length})`}>
                  {c.contacts.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum contato cadastrado.</p>
                  ) : (
                    <ul className="space-y-3">
                      {c.contacts.map((ct) => (
                        <li key={ct.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{ct.name}</span>
                            <span className="text-caption">{ct.role}</span>
                          </div>
                          <div className="mt-2 flex flex-col gap-1 text-xs text-[var(--color-muted-foreground)]">
                            {ct.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3 w-3" /> {ct.phone}</span>}
                            {ct.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" /> {ct.email}</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </InfoCard>

                <InfoCard title={`Anexos (${c.attachments.length})`}>
                  {c.attachments.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum anexo.</p>
                  ) : (
                    <ul className="space-y-2">
                      {c.attachments.map((at) => (
                        <li key={at.id} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                          <span className="truncate">{at.originalFileName}</span>
                          <span className="text-caption ml-auto">{at.category}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </InfoCard>

                {c.notes && (
                  <InfoCard title="Observações">
                    <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">{c.notes}</p>
                  </InfoCard>
                )}
              </div>
            </div>

            <CustomerFormDrawer open={editing} onClose={() => setEditing(false)} onSaved={detail.refetch} customer={c} />
          </>
        )}
      </AsyncBoundary>

      {/* Placeholder icon usage to keep Building2 import meaningful when empty */}
      <span className="sr-only"><Building2 className="h-0 w-0" /></span>
    </div>
  );
}
