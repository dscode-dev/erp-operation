"use client";

import { useMemo, useState } from "react";
import { Package, Plus } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { ExportButton } from "@platform/components/export-button";
import { MetricCard } from "@erp/ui/metric-card";
import { FilterBar, FilterChip } from "@erp/ui/filter-bar";
import { StatusChip, type ChipTone } from "@erp/ui/status-chip";
import { SkeletonList, SkeletonCard } from "@erp/ui/skeletons";
import { ComingSoonState, ErrorState } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { Gate } from "@erp/ui/auth/gate";
import { ProductFormDrawer } from "@platform/components/product-form-drawer";
import { operationsApi, useQuery, type DemoProduct, type DemoProductStatus, type ProductsData } from "@erp/api";
import { formatCurrencyBRL } from "@erp/utils";

const STOCK: Record<DemoProductStatus, { tone: ChipTone; label: string }> = {
  ok: { tone: "success", label: "Em estoque" },
  low: { tone: "warning", label: "Estoque baixo" },
  out: { tone: "danger", label: "Sem estoque" },
};

const FILTERS: Array<{ key: "all" | DemoProductStatus; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "ok", label: "Em estoque" },
  { key: "low", label: "Baixo" },
  { key: "out", label: "Sem estoque" },
];

export default function ProdutosPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | DemoProductStatus>("all");
  const [formOpen, setFormOpen] = useState(false);
  const products = useQuery<ProductsData>((signal) => operationsApi.getProducts({ signal }), []);

  const all = products.data?.items ?? [];
  const rows = useMemo(() => {
    let items = all;
    if (filter !== "all") items = items.filter((p) => p.status === filter);
    const q = search.trim().toLowerCase();
    if (q) items = items.filter((p) => [p.sku, p.name, p.category].join(" ").toLowerCase().includes(q));
    return items;
  }, [all, filter, search]);

  const stats = useMemo(() => ({
    total: all.length,
    low: all.filter((p) => p.status === "low").length,
    out: all.filter((p) => p.status === "out").length,
    value: all.reduce((acc, p) => acc + p.price * p.stock, 0),
  }), [all]);

  const columns: Column<DemoProduct>[] = [
    { key: "sku", header: "SKU", className: "w-[120px]", sortAccessor: (p) => p.sku, cell: (p) => <span className="font-mono text-xs">{p.sku}</span> },
    { key: "name", header: "Produto", sortAccessor: (p) => p.name, cell: (p) => <div className="min-w-0"><div className="font-medium truncate">{p.name}</div><div className="text-caption truncate">{p.category}</div></div> },
    { key: "stock", header: "Estoque", className: "w-[110px]", sortAccessor: (p) => p.stock, cell: (p) => <span className="font-mono text-sm tabular-nums">{p.stock} {p.unit}</span> },
    { key: "price", header: "Preço", className: "w-[120px]", sortAccessor: (p) => p.price, cell: (p) => <span className="font-mono text-sm tabular-nums">{formatCurrencyBRL(p.price)}</span> },
    { key: "status", header: "Situação", className: "w-[150px]", sortAccessor: (p) => p.status, cell: (p) => <StatusChip tone={STOCK[p.status].tone} dot>{STOCK[p.status].label}</StatusChip> },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <PageHeader
        eyebrow="Cadastros"
        title="Produtos"
        description="Catálogo de peças e insumos (Demo Dataset — domínio de Produtos é escopo futuro)."
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              label="Exportar"
              fileName="produtos"
              rows={rows.map((p) => ({ sku: p.sku, produto: p.name, categoria: p.category, estoque: p.stock, preco: p.price, situacao: STOCK[p.status].label }))}
            />
            <Gate roles={["OWNER", "MANAGER"]}>
              <button
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)]"
              >
                <Plus className="h-4 w-4" /> Novo produto
              </button>
            </Gate>
          </div>
        }
      />

      {products.loading && !products.data ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : products.data && !products.data.disabled ? (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <MetricCard label="SKUs" value={String(stats.total)} icon="Package" />
          <MetricCard label="Estoque baixo" value={String(stats.low)} trend={stats.low ? "up" : "flat"} icon="AlertTriangle" />
          <MetricCard label="Sem estoque" value={String(stats.out)} trend={stats.out ? "up" : "flat"} icon="PackageX" />
          <MetricCard label="Valor em estoque" value={formatCurrencyBRL(stats.value)} icon="Wallet" />
        </div>
      ) : null}

      <FilterBar search={search} onSearch={setSearch} searchPlaceholder="Buscar por SKU, produto, categoria…">
        {FILTERS.map((f) => (
          <FilterChip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</FilterChip>
        ))}
      </FilterBar>

      {products.loading && !products.data ? (
        <SkeletonList rows={6} />
      ) : products.error && !products.data ? (
        <ErrorState error={products.error} onRetry={products.refetch} />
      ) : products.data?.disabled ? (
        <ComingSoonState title="Produtos em breve" description="Ative o Demo Dataset para visualizar o catálogo." />
      ) : rows.length === 0 ? (
        <EmptyState icon={Package} title="Nenhum produto" description="Ajuste os filtros." />
      ) : (
        <DataTable columns={columns} rows={rows} />
      )}

      <ProductFormDrawer open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
