"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, MapPin, Phone, Mail, Wrench, Plus } from "lucide-react";
import { SkeletonCard } from "@erp/ui/skeletons";
import { AsyncBoundary } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { StatusPill } from "@erp/ui/status-pill";
import { customersApi, equipmentsApi, useQuery, type CustomerDetail } from "@erp/api";
import { maskCep } from "@erp/utils";
import { EQUIPMENT_STATUS_LABEL, EQUIPMENT_STATUS_PILL } from "@platform/equipment-display";

export default function OperatorClienteConsult({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const detail = useQuery<CustomerDetail>((signal) => customersApi.getCustomer(id, { signal }), [id]);
  const equipments = useQuery((signal) => equipmentsApi.listEquipments({ customerId: id, limit: 20, signal }), [id]);

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <Link href="/operator/clientes" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>

      <AsyncBoundary loading={detail.loading} error={detail.error} data={detail.data} onRetry={detail.refetch} skeleton={<SkeletonCard />}>
        {(c) => (
          <>
            <header>
              <h1 className="text-section-title leading-tight">{c.name}</h1>
              <p className="text-caption">{c.cnpj ?? c.cpf ?? "—"}</p>
            </header>

            <Link href={`/operator/atendimento?customerId=${c.id}`} className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-white h-12 text-sm font-semibold active:scale-[0.99]">
              <Plus className="h-4 w-4" /> Iniciar atendimento
            </Link>

            <Card title="Contato">
              {c.phone && <Row icon={<Phone className="h-4 w-4" />} value={c.phone} />}
              {c.email && <Row icon={<Mail className="h-4 w-4" />} value={c.email} />}
              {!c.phone && !c.email && <p className="text-sm text-[var(--color-muted-foreground)]">Sem contato cadastrado.</p>}
            </Card>

            {c.addresses.length > 0 && (
              <Card title="Endereços">
                <ul className="space-y-2">
                  {c.addresses.map((a) => (
                    <li key={a.id} className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 text-[var(--color-muted-foreground)] shrink-0" />
                      <span>{[a.street, a.number, a.district, a.city].filter(Boolean).join(", ")}{a.zipCode ? ` · ${maskCep(a.zipCode)}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card title="Equipamentos">
              {equipments.loading && !equipments.data ? (
                <SkeletonCard />
              ) : (equipments.data?.items.length ?? 0) === 0 ? (
                <EmptyState icon={Wrench} title="Sem equipamentos" />
              ) : (
                <ul className="space-y-2">
                  {(equipments.data?.items ?? []).map((e) => (
                    <li key={e.id}>
                      <Link href={`/operator/equipamentos/${e.id}`} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 active:scale-[0.99] transition-transform">
                        <Wrench className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                        <span className="min-w-0 flex-1 text-sm font-medium truncate">{e.name}</span>
                        <StatusPill status={EQUIPMENT_STATUS_PILL[e.status]} label={EQUIPMENT_STATUS_LABEL[e.status]} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">{title}</h2>
      {children}
    </section>
  );
}

function Row({ icon, value }: { icon: React.ReactNode; value: string }) {
  return <div className="flex items-center gap-2 text-sm"><span className="text-[var(--color-muted-foreground)]">{icon}</span>{value}</div>;
}
