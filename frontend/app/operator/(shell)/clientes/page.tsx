"use client";

import { useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import { SearchInput } from "@erp/ui/search-input";
import { SkeletonList } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { customersApi, useQuery } from "@erp/api";
import { useDebounce } from "@erp/utils";

export default function OperatorClientesPage() {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);
  const list = useQuery(
    (signal) => customersApi.listCustomers({ limit: 30, search: debounced || undefined, signal }),
    [debounced],
  );

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <header>
        <h1 className="text-[22px] font-semibold tracking-tight">Clientes</h1>
        <p className="text-caption">Consulta rápida em campo.</p>
      </header>

      <div className="sticky top-12 z-10 -mx-4 px-4 py-2 bg-[var(--color-background)]/95 backdrop-blur">
        <SearchInput value={search} onChange={setSearch} placeholder="Nome, telefone ou CNPJ…" className="w-full" />
      </div>

      {list.loading && !list.data ? (
        <SkeletonList rows={6} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.refetch} />
      ) : (list.data?.items.length ?? 0) === 0 ? (
        <EmptyState icon={Building2} title="Nenhum cliente" description={debounced ? "Ajuste a busca." : "Sem clientes."} />
      ) : (
        <ul className="space-y-2">
          {(list.data?.items ?? []).map((c) => (
            <li key={c.id}>
              <Link href={`/operator/clientes/${c.id}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-3.5 active:scale-[0.99] transition-transform">
                <span className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-muted)] grid place-items-center text-[var(--color-muted-foreground)] shrink-0"><Building2 className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{c.name}</span>
                  <span className="block text-caption truncate">{c.cnpj ?? c.cpf ?? c.phone ?? c.email ?? "—"}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-[var(--color-muted-foreground)]" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
