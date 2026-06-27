"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Wrench, ChevronRight, Building2 } from "lucide-react";
import { SearchInput } from "@erp/ui/search-input";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { StatusPill } from "@erp/ui/status-pill";
import { equipmentsApi, useQuery } from "@erp/api";
import { useDebounce } from "@erp/utils";
import { EQUIPMENT_STATUS_LABEL, EQUIPMENT_STATUS_PILL } from "@platform/equipment-display";
import { CustomerPicker } from "@operator/components/customer-picker";
import { useSelectedCustomer } from "@operator/lib/selected-customer";

function OperatorEquipamentosInner() {
  const [customer, setCustomer] = useSelectedCustomer();
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const list = useQuery(
    (signal) =>
      customer
        ? equipmentsApi.listEquipments({ customerId: customer.id, limit: 50, search: debounced || undefined, signal })
        : Promise.resolve(null),
    [customer?.id, debounced],
  );

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Equipamentos</h1>
        <p className="text-caption">Consulta por cliente em campo.</p>
      </header>

      <div className="sticky top-12 z-10 -mx-4 px-4 py-2 space-y-2 bg-[var(--color-background)]/95 backdrop-blur">
        <CustomerPicker selected={customer} onSelect={(next) => { setCustomer(next); setSearch(""); }} />
        {customer && <SearchInput value={search} onChange={setSearch} placeholder="Nome, tag, série, modelo…" className="w-full" />}
      </div>

      {!customer ? (
        <EmptyState icon={Building2} title="Selecione um cliente" description="Escolha um cliente para ver os equipamentos." />
      ) : list.loading && !list.data ? (
        <SkeletonList rows={6} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : (list.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={Wrench} title="Nenhum equipamento" description={debounced ? "Ajuste a busca." : "Este cliente não possui equipamentos."} />
      ) : (
        <ul className="space-y-2">
          {(list.data?.items ?? []).map((e) => (
            <li key={e.id}>
              <Link href={`/operator/equipamentos/${e.id}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 active:scale-[0.99] transition-transform">
                <span className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-muted)] grid place-items-center text-[var(--color-muted-foreground)] shrink-0"><Wrench className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{e.name}</span>
                  <span className="block text-caption truncate">{[e.manufacturer, e.model].filter(Boolean).join(" · ") || e.tag || "—"}</span>
                </span>
                <StatusPill status={EQUIPMENT_STATUS_PILL[e.status]} label={EQUIPMENT_STATUS_LABEL[e.status]} />
                <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function OperatorEquipamentosPage() {
  return (
    <Suspense fallback={null}>
      <OperatorEquipamentosInner />
    </Suspense>
  );
}
