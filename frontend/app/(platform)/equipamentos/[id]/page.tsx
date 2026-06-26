"use client";

import { use } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { Breadcrumbs } from "@platform/components/breadcrumbs";
import { PageHeader } from "@platform/components/page-header";
import { InfoCard, InfoRow } from "@platform/components/info-card";
import { QrFoundation } from "@platform/components/qr-foundation";
import { StatusPill } from "@erp/ui/status-pill";
import { SkeletonCard } from "@erp/ui/skeletons";
import { AsyncBoundary } from "@erp/ui/states";
import { equipmentsApi, useQuery, type EquipmentDetail } from "@erp/api";
import { formatDate, formatDateTime } from "@erp/utils";
import {
  EQUIPMENT_STATUS_LABEL,
  EQUIPMENT_STATUS_PILL,
  EQUIPMENT_TYPE_LABEL,
} from "@platform/equipment-display";

export default function EquipamentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const detail = useQuery<EquipmentDetail>((signal) => equipmentsApi.getEquipment(id, { signal }), [id]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <Breadcrumbs items={[{ label: "Equipamentos", href: "/equipamentos" }, { label: detail.data?.name ?? "…" }]} />

      <AsyncBoundary
        loading={detail.loading}
        error={detail.error}
        data={detail.data}
        onRetry={detail.refetch}
        skeleton={<div className="grid gap-3 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}
      >
        {(e) => (
          <>
            <PageHeader
              eyebrow={EQUIPMENT_TYPE_LABEL[e.type]}
              title={e.name}
              description={e.customer?.name ?? undefined}
              actions={<StatusPill status={EQUIPMENT_STATUS_PILL[e.status]} label={EQUIPMENT_STATUS_LABEL[e.status]} />}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <InfoCard title="Ficha técnica">
                  <InfoRow label="Tag" value={e.tag ?? "—"} />
                  <InfoRow label="Fabricante" value={e.manufacturer ?? "—"} />
                  <InfoRow label="Modelo" value={e.model ?? "—"} />
                  <InfoRow label="Nº de série" value={<span className="font-mono text-xs">{e.serialNumber ?? "—"}</span>} />
                  <InfoRow label="Capacidade" value={e.capacity ?? "—"} />
                  <InfoRow label="Tensão" value={e.voltage ?? "—"} />
                  <InfoRow label="Instalação" value={formatDate(e.installationDate)} />
                  <InfoRow label="Garantia até" value={formatDate(e.warrantyExpiration)} />
                  <InfoRow label="Local" value={e.address?.name ?? e.address?.city ?? "—"} />
                  {e.observations && <InfoRow label="Observações" value={e.observations} />}
                </InfoCard>

                <InfoCard title={`Métricas recentes (${e.metrics.length})`}>
                  {e.metrics.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">Nenhuma métrica registrada.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {e.metrics.map((m) => (
                        <li key={m.id} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                          <Activity className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                          <span className="text-sm font-medium capitalize">{m.key}</span>
                          <span className="ml-auto font-mono text-sm tabular-nums">{m.value} {m.unit ?? ""}</span>
                          <span className="text-caption w-28 text-right">{formatDateTime(m.recordedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </InfoCard>

                <InfoCard title="Hierarquia">
                  <div className="space-y-3">
                    <div>
                      <div className="text-caption uppercase tracking-wider mb-1">Equipamento pai</div>
                      {e.parent ? (
                        <Link href={`/equipamentos/${e.parent.id}`} className="text-sm font-medium hover:text-[var(--color-primary)]">
                          {e.parent.name}{e.parent.tag ? ` · ${e.parent.tag}` : ""}
                        </Link>
                      ) : (
                        <span className="text-sm text-[var(--color-muted-foreground)]">Sem equipamento pai.</span>
                      )}
                    </div>
                    <div>
                      <div className="text-caption uppercase tracking-wider mb-2">Filhos ({e.children.length})</div>
                      {e.children.length === 0 ? (
                        <span className="text-sm text-[var(--color-muted-foreground)]">Nenhum equipamento filho.</span>
                      ) : (
                        <ul className="space-y-1.5">
                          {e.children.map((child) => (
                            <li key={child.id}>
                              <Link href={`/equipamentos/${child.id}`} className="flex items-center justify-between text-sm hover:text-[var(--color-primary)]">
                                <span>{child.name}</span>
                                <StatusPill status={EQUIPMENT_STATUS_PILL[child.status]} label={EQUIPMENT_STATUS_LABEL[child.status]} />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </InfoCard>
              </div>

              <div className="space-y-4">
                <QrFoundation qrCode={e.qrCode} qrToken={e.qrToken} />

                <InfoCard title={`Anexos (${e.attachments.length})`}>
                  {e.attachments.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">Nenhum anexo.</p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {e.attachments.map((at) => (
                        <li key={at.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{at.originalFileName}</span>
                          <span className="text-caption">{at.category}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </InfoCard>
              </div>
            </div>
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}
