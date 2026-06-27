"use client";

/**
 * Seletor de cliente para o app do operador. As listagens (Equipamentos,
 * Documentos) são sempre por cliente; este picker define o cliente em foco.
 * Carrega a carteira via API e aceita pré-seleção por `?customerId=`.
 */
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { customersApi, type Customer } from "@erp/api";
import type { SelectedCustomer } from "@operator/lib/selected-customer";

export function CustomerPicker({
  selected,
  onSelect,
}: {
  selected: SelectedCustomer | null;
  onSelect: (c: SelectedCustomer | null) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const params = useSearchParams();
  const presetId = params.get("customerId");
  const presetApplied = useRef(false);

  useEffect(() => {
    const ac = new AbortController();
    customersApi
      .listCustomers({ page: 1, limit: 100, signal: ac.signal })
      .then((res) => setCustomers(res.items))
      .catch(() => undefined);
    return () => ac.abort();
  }, []);

  // Apply `?customerId=` once, when nothing is selected yet.
  useEffect(() => {
    if (presetApplied.current || selected || !presetId || customers.length === 0) return;
    const match = customers.find((c) => c.id === presetId);
    if (match) {
      presetApplied.current = true;
      onSelect({ id: match.id, name: match.name });
    }
  }, [presetId, customers, selected, onSelect]);

  return (
    <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-3 h-11">
      <Building2 className="h-4 w-4 text-[var(--color-muted-foreground)] shrink-0" />
      <select
        value={selected?.id ?? ""}
        onChange={(e) => {
          const c = customers.find((x) => x.id === e.target.value);
          onSelect(c ? { id: c.id, name: c.name } : null);
        }}
        className="flex-1 bg-transparent outline-none text-sm"
        aria-label="Cliente"
      >
        <option value="">Selecione um cliente…</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
