"use client";

import { useMemo, useState } from "react";
import { Boxes, DollarSign, History, Package, Plus, Truck } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DataTable, type Column } from "@platform/components/data-table";
import { Pagination } from "@platform/components/pagination";
import { ProductFormDrawer } from "@platform/components/product-form-drawer";
import { MetricCard } from "@erp/ui/metric-card";
import { FilterBar, FilterChip } from "@erp/ui/filter-bar";
import { StatusChip } from "@erp/ui/status-chip";
import { SkeletonList } from "@erp/ui/skeletons";
import { ErrorState } from "@erp/ui/states";
import { EmptyState } from "@erp/ui/empty-state";
import { Drawer } from "@erp/ui/drawer";
import { Gate } from "@erp/ui/auth/gate";
import { useAuth } from "@erp/ui/auth/auth-provider";
import {
  ApiClientError,
  inventoryApi,
  pricingApi,
  useQuery,
  type InventoryItem,
  type Product,
  type ProductPricing,
  type ResolvedProductPricing,
  type StockMovement,
  type StockMovementType,
  type Supplier,
} from "@erp/api";
import { formatCurrencyBRL, formatDateTime, formatNumber } from "@erp/utils";

type Tab = "products" | "inventory" | "suppliers" | "pricing" | "movements";
type Feedback = { tone: "success" | "danger"; message: string } | null;

const MOVEMENT_LABEL: Record<StockMovementType, string> = {
  IN: "Entrada",
  OUT: "Saída",
  ADJUSTMENT: "Ajuste",
  TRANSFER: "Transferência",
  CONSUMPTION: "Consumo",
  RETURN: "Retorno",
};

export default function ProdutosPage() {
  const { hasRole } = useAuth();
  const canManageProducts = hasRole("OWNER", "MANAGER");
  const canSeePricing = hasRole("OWNER", "MANAGER");
  const canEditPricing = hasRole("OWNER");

  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [active, setActive] = useState<"all" | "true" | "false">("all");
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [formProduct, setFormProduct] = useState<Product | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [pricingProduct, setPricingProduct] = useState<Product | null>(null);
  const [pricingRevision, setPricingRevision] = useState<ProductPricing | null>(null);

  const productList = useQuery(
    (signal) => inventoryApi.listProducts({ page, limit, search, active: active === "all" ? undefined : active === "true", signal }),
    [page, limit, search, active],
  );
  const inventory = useQuery(
    (signal) => inventoryApi.listInventory({ page, limit, search, signal }),
    [page, limit, search],
  );
  const movements = useQuery(
    (signal) => inventoryApi.listStockMovements({ page, limit, productId: detailProduct?.id, signal }),
    [page, limit, detailProduct?.id],
  );
  const suppliers = useQuery(
    (signal) => inventoryApi.listSuppliers({ page, limit, search, active: active === "all" ? undefined : active === "true", signal }),
    [page, limit, search, active],
  );
  const pricing = useQuery(
    (signal) => (canSeePricing ? pricingApi.listPricing({ page, limit, search, active: active === "all" ? undefined : active === "true", signal }) : Promise.resolve(null)),
    [page, limit, search, active, canSeePricing],
  );
  const inventoryStats = useQuery((signal) => inventoryApi.getInventoryStats({ signal }), []);
  const pricingStats = useQuery((signal) => (canSeePricing ? pricingApi.getPricingStats({ signal }) : Promise.resolve(null)), [canSeePricing]);

  const products = productList.data?.items ?? [];
  const stats = inventoryStats.data;
  const pStats = pricingStats.data;

  const productColumns: Column<Product>[] = [
    { key: "sku", header: "SKU", className: "w-[140px]", sortAccessor: (p) => p.sku, cell: (p) => <span className="font-mono text-xs">{p.sku}</span> },
    { key: "name", header: "Produto", sortAccessor: (p) => p.name, cell: (p) => <div className="min-w-0"><div className="font-medium truncate">{p.name}</div><div className="text-caption truncate">{p.category ?? "Sem categoria"} · {p.brand ?? "sem marca"}</div></div> },
    { key: "codes", header: "Códigos", className: "w-[180px]", cell: (p) => <div className="text-xs"><div>{p.internalCode ?? "—"}</div><div className="text-caption">{p.manufacturerCode ?? "sem fabricante"}</div></div> },
    { key: "model", header: "Modelo", className: "w-[150px]", cell: (p) => <span className="text-sm">{p.model ?? "—"}</span> },
    { key: "unit", header: "Un.", className: "w-[70px]", cell: (p) => <span className="font-mono text-xs">{p.unit}</span> },
    { key: "stock", header: "Estoque", className: "w-[160px]", cell: (p) => <StockSummary product={p} /> },
    { key: "status", header: "Status", className: "w-[110px]", cell: (p) => <StatusChip tone={p.isActive ? "success" : "neutral"} dot>{p.isActive ? "Ativo" : "Inativo"}</StatusChip> },
  ];

  const inventoryColumns: Column<InventoryItem>[] = [
    { key: "product", header: "Produto", cell: (item) => <div><div className="font-medium">{item.product?.name ?? item.productId}</div><div className="text-caption">{item.product?.sku ?? "—"} · {item.location ?? "sem localização"}</div></div> },
    { key: "current", header: "Atual", className: "w-[100px]", sortAccessor: (i) => n(i.currentQuantity), cell: (i) => qty(i.currentQuantity, i.product?.unit) },
    { key: "minimum", header: "Mín.", className: "w-[90px]", sortAccessor: (i) => n(i.minimumQuantity), cell: (i) => qty(i.minimumQuantity, i.product?.unit) },
    { key: "ideal", header: "Ideal", className: "w-[90px]", cell: (i) => qty(i.idealQuantity, i.product?.unit) },
    { key: "reserved", header: "Reserv.", className: "w-[90px]", cell: (i) => qty(i.reservedQuantity, i.product?.unit) },
    { key: "available", header: "Disponível", className: "w-[120px]", sortAccessor: (i) => n(i.availableQuantity), cell: (i) => <span className="font-mono text-sm">{qty(i.availableQuantity, i.product?.unit)}</span> },
    { key: "critical", header: "Situação", className: "w-[130px]", cell: (i) => <StockStatus item={i} /> },
  ];

  const supplierColumns: Column<Supplier>[] = [
    { key: "name", header: "Fornecedor", cell: (s) => <div><div className="font-medium">{s.legalName}</div><div className="text-caption">{s.tradeName ?? "sem nome fantasia"}</div></div> },
    { key: "document", header: "Documento", className: "w-[170px]", cell: (s) => <span className="font-mono text-xs">{s.document ?? "—"}</span> },
    { key: "contacts", header: "Contatos", cell: (s) => <span className="text-sm">{summarizeContacts(s.contacts)}</span> },
    { key: "address", header: "Endereço", cell: (s) => <span className="text-sm">{summarizeAddress(s.address)}</span> },
    { key: "status", header: "Status", className: "w-[110px]", cell: (s) => <StatusChip tone={s.isActive ? "success" : "neutral"} dot>{s.isActive ? "Ativo" : "Inativo"}</StatusChip> },
  ];

  const pricingColumns: Column<ProductPricing>[] = [
    { key: "product", header: "Produto", cell: (p) => <div><div className="font-medium">{p.product?.name ?? p.productId}</div><div className="text-caption">{p.product?.sku ?? "—"}</div></div> },
    { key: "cost", header: "Custo médio", className: "w-[120px]", sortAccessor: (p) => n(p.averageCost), cell: (p) => money(p.averageCost) },
    { key: "sale", header: "Venda", className: "w-[120px]", sortAccessor: (p) => n(p.salePrice), cell: (p) => money(p.salePrice) },
    { key: "min", header: "Mínimo", className: "w-[120px]", cell: (p) => money(p.minimumSalePrice) },
    { key: "margin", header: "Margem", className: "w-[100px]", sortAccessor: (p) => n(p.marginPercentage), cell: (p) => <StatusChip tone={n(p.marginPercentage) > 30 ? "success" : "warning"}>{n(p.marginPercentage).toFixed(2)}%</StatusChip> },
    { key: "valid", header: "Vigência", cell: (p) => <span className="text-sm">{dateOnly(p.validFrom)} → {p.validUntil ? dateOnly(p.validUntil) : "vigente"}</span> },
  ];

  const movementColumns: Column<StockMovement>[] = [
    { key: "date", header: "Data", className: "w-[150px]", sortAccessor: (m) => m.occurredAt, cell: (m) => <span className="text-xs">{formatDateTime(m.occurredAt)}</span> },
    { key: "product", header: "Produto", cell: (m) => <div><div className="font-medium">{m.inventoryItem?.product?.name ?? m.inventoryItemId}</div><div className="text-caption">{m.inventoryItem?.product?.sku ?? "—"}</div></div> },
    { key: "type", header: "Tipo", className: "w-[130px]", cell: (m) => <StatusChip tone={movementTone(m.type)}>{MOVEMENT_LABEL[m.type]}</StatusChip> },
    { key: "quantity", header: "Qtd.", className: "w-[100px]", sortAccessor: (m) => n(m.quantity), cell: (m) => qty(m.quantity, m.inventoryItem?.product?.unit) },
    { key: "reason", header: "Motivo", cell: (m) => <span className="text-sm">{m.reason}</span> },
  ];

  function refreshAll(message?: string) {
    productList.refetch();
    inventory.refetch();
    movements.refetch();
    suppliers.refetch();
    pricing.refetch();
    inventoryStats.refetch();
    pricingStats.refetch();
    if (message) setFeedback({ tone: "success", message });
  }

  async function disableProduct(product: Product) {
    if (!confirm(`Desativar ${product.name}?`)) return;
    try {
      await inventoryApi.deleteProduct(product.id);
      refreshAll("Produto desativado.");
    } catch (err) {
      setFeedback({ tone: "danger", message: err instanceof Error ? err.message : "Falha ao desativar produto." });
    }
  }

  const pageData = tab === "products" ? productList.data : tab === "inventory" ? inventory.data : tab === "suppliers" ? suppliers.data : tab === "pricing" ? pricing.data : movements.data;
  const pageLoading = tab === "products" ? productList.loading : tab === "inventory" ? inventory.loading : tab === "suppliers" ? suppliers.loading : tab === "pricing" ? pricing.loading : movements.loading;
  const pageError = tab === "products" ? productList.error : tab === "inventory" ? inventory.error : tab === "suppliers" ? suppliers.error : tab === "pricing" ? pricing.error : movements.error;
  const retry = tab === "products" ? productList.refetch : tab === "inventory" ? inventory.refetch : tab === "suppliers" ? suppliers.refetch : tab === "pricing" ? pricing.refetch : movements.refetch;

  return (
    <div className="space-y-6 max-w-[1440px]">
      <PageHeader
        eyebrow="Operação"
        title="Produtos, Estoque e Preços"
        description="Catálogo técnico, estoque físico, fornecedores, movimentações e preços reais do backend."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Gate roles={["OWNER", "MANAGER"]}>
              <button onClick={() => { setFormProduct(null); setProductFormOpen(true); }} className={primaryBtn}>
                <Plus className="h-4 w-4" /> Novo produto
              </button>
            </Gate>
            <Gate roles={["OWNER"]}>
              <button onClick={() => setPricingProduct(products[0] ?? null)} disabled={products.length === 0} className={secondaryBtn}>
                <DollarSign className="h-4 w-4" /> Novo preço
              </button>
            </Gate>
          </div>
        }
      />

      {feedback && (
        <div className={`rounded-[var(--radius-md)] border px-3 py-2 text-sm ${feedback.tone === "success" ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]" : "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]"}`}>
          {feedback.message}
        </div>
      )}

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Produtos ativos" value={formatNumber(stats?.activeProducts ?? productList.data?.pagination.total ?? 0)} icon="Package" />
        <MetricCard label="Itens críticos" value={formatNumber(stats?.minimumStockAlerts ?? 0)} trend={(stats?.minimumStockAlerts ?? 0) > 0 ? "up" : "flat"} icon="AlertTriangle" />
        <MetricCard label="Sem estoque" value={formatNumber(stats?.productsWithoutStock ?? 0)} trend={(stats?.productsWithoutStock ?? 0) > 0 ? "up" : "flat"} icon="Boxes" />
        <MetricCard label="Sem preço" value={canSeePricing ? formatNumber(pStats?.productsWithoutPrice ?? 0) : "—"} icon="DollarSign" />
        <MetricCard label="Consumos 30 dias" value={formatNumber(stats?.consumptionMovementsLast30Days ?? 0)} icon="History" />
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "products"} onClick={() => switchTab("products", setTab, setPage)}>Produtos</TabButton>
        <TabButton active={tab === "inventory"} onClick={() => switchTab("inventory", setTab, setPage)}>Estoque</TabButton>
        <TabButton active={tab === "suppliers"} onClick={() => switchTab("suppliers", setTab, setPage)}>Fornecedores</TabButton>
        {canSeePricing && <TabButton active={tab === "pricing"} onClick={() => switchTab("pricing", setTab, setPage)}>Preços</TabButton>}
        <TabButton active={tab === "movements"} onClick={() => switchTab("movements", setTab, setPage)}>Movimentos</TabButton>
      </div>

      <FilterBar search={search} onSearch={(value) => { setSearch(value); setPage(1); }} searchPlaceholder="Buscar por SKU, produto, fornecedor…">
        <FilterChip active={active === "all"} onClick={() => { setActive("all"); setPage(1); }}>Todos</FilterChip>
        <FilterChip active={active === "true"} onClick={() => { setActive("true"); setPage(1); }}>Ativos</FilterChip>
        <FilterChip active={active === "false"} onClick={() => { setActive("false"); setPage(1); }}>Inativos</FilterChip>
      </FilterBar>

      {pageLoading && !pageData ? (
        <SkeletonList rows={7} />
      ) : pageError && !pageData ? (
        <ErrorState error={pageError} onRetry={retry} />
      ) : tab === "products" ? (
        products.length === 0 ? <EmptyState icon={Package} title="Nenhum produto" description="Cadastre o primeiro produto técnico." /> : (
          <div className="space-y-3">
            <DataTable columns={productColumns} rows={products} onRowClick={setDetailProduct} />
            {productList.data && <Pagination pagination={productList.data.pagination} onPageChange={setPage} onPageSizeChange={(next) => { setLimit(next); setPage(1); }} />}
          </div>
        )
      ) : tab === "inventory" ? (
        (inventory.data?.items ?? []).length === 0 ? <EmptyState icon={Boxes} title="Nenhum item de estoque" description="Itens são criados quando produtos são cadastrados." /> : (
          <div className="space-y-3">
            <DataTable columns={inventoryColumns} rows={inventory.data?.items ?? []} onRowClick={setStockItem} />
            {inventory.data && <Pagination pagination={inventory.data.pagination} onPageChange={setPage} onPageSizeChange={(next) => { setLimit(next); setPage(1); }} />}
          </div>
        )
      ) : tab === "suppliers" ? (
        <SuppliersSection
          rows={suppliers.data?.items ?? []}
          columns={supplierColumns}
          pagination={suppliers.data?.pagination}
          onPage={setPage}
          onLimit={(next) => { setLimit(next); setPage(1); }}
          onSelect={(row) => { setSupplier(row); setSupplierOpen(true); }}
          onCreate={() => { setSupplier(null); setSupplierOpen(true); }}
        />
      ) : tab === "pricing" ? (
        !canSeePricing ? <ErrorState error={new ApiClientError({ code: "AUTH_FORBIDDEN", status: 403, message: "Sem permissão", details: {} })} /> : (
          <div className="space-y-3">
            {(pricing.data?.items ?? []).length === 0 ? <EmptyState icon={DollarSign} title="Nenhum preço" description="Crie o primeiro preço vigente para um produto." /> : <DataTable columns={pricingColumns} rows={pricing.data?.items ?? []} onRowClick={(row) => { setPricingRevision(row); setPricingProduct(row.product ?? null); }} />}
            {pricing.data && <Pagination pagination={pricing.data.pagination} onPageChange={setPage} onPageSizeChange={(next) => { setLimit(next); setPage(1); }} />}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {(movements.data?.items ?? []).length === 0 ? <EmptyState icon={History} title="Sem movimentações" description="Entradas, saídas e consumos aparecerão aqui." /> : <DataTable columns={movementColumns} rows={movements.data?.items ?? []} />}
          {movements.data && <Pagination pagination={movements.data.pagination} onPageChange={setPage} onPageSizeChange={(next) => { setLimit(next); setPage(1); }} />}
        </div>
      )}

      <ProductFormDrawer open={productFormOpen} product={formProduct} onClose={() => setProductFormOpen(false)} onSaved={() => refreshAll("Produto salvo.")} />
      <ProductDetailDrawer product={detailProduct} canManage={canManageProducts} canSeePricing={canSeePricing} onClose={() => setDetailProduct(null)} onEdit={(product) => { setFormProduct(product); setProductFormOpen(true); }} onDisable={disableProduct} onPrice={(product) => { setPricingProduct(product); setPricingRevision(null); }} />
      <InventoryDrawer item={stockItem} onClose={() => setStockItem(null)} onSaved={() => refreshAll("Estoque atualizado.")} />
      <SupplierDrawer open={supplierOpen} supplier={supplier} onClose={() => setSupplierOpen(false)} onSaved={() => refreshAll("Fornecedor salvo.")} />
      <PricingDrawer product={pricingProduct} revision={pricingRevision} canEdit={canEditPricing} onClose={() => { setPricingProduct(null); setPricingRevision(null); }} onSaved={() => refreshAll("Preço salvo.")} />
    </div>
  );
}

function ProductDetailDrawer({ product, canManage, canSeePricing, onClose, onEdit, onDisable, onPrice }: { product: Product | null; canManage: boolean; canSeePricing: boolean; onClose: () => void; onEdit: (p: Product) => void; onDisable: (p: Product) => void; onPrice: (p: Product) => void }) {
  const price = useQuery<ResolvedProductPricing | null>((signal) => (product && canSeePricing ? pricingApi.getProductPricing(product.id, { signal }).catch((err) => {
    if (err instanceof ApiClientError && err.status === 404) return null;
    throw err;
  }) : Promise.resolve(null)), [product?.id, canSeePricing]);
  return (
    <Drawer open={product !== null} onClose={onClose} eyebrow="Produto" title={product?.name ?? ""} width="max-w-2xl">
      {product && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <StatusChip tone={product.isActive ? "success" : "neutral"} dot>{product.isActive ? "Ativo" : "Inativo"}</StatusChip>
            <StatusChip tone="info">{product.category ?? "Sem categoria"}</StatusChip>
            <StatusChip tone="neutral">{product.unit}</StatusChip>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Info label="SKU" value={product.sku} />
            <Info label="Código interno" value={product.internalCode ?? "—"} />
            <Info label="Fabricante" value={product.manufacturerCode ?? "—"} />
            <Info label="Marca / Modelo" value={`${product.brand ?? "—"} / ${product.model ?? "—"}`} />
            <Info label="Peso" value={product.weight != null ? String(product.weight) : "—"} />
            <Info label="Dimensões" value={product.dimensions ?? "—"} />
          </dl>
          <section className={cardCls}>
            <h3 className="text-sm font-semibold">Estoque associado</h3>
            <div className="mt-3 space-y-2">
              {(product.inventoryItems ?? []).length === 0 ? <p className="text-caption">Nenhum item de estoque associado.</p> : product.inventoryItems?.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-muted)]/40 px-3 py-2 text-sm">
                  <span>{item.location ?? "Sem localização"}</span>
                  <span className="font-mono">{qty(item.availableQuantity, product.unit)} disponíveis</span>
                </div>
              ))}
            </div>
          </section>
          {canSeePricing && (
            <section className={cardCls}>
              <h3 className="text-sm font-semibold">Preço vigente</h3>
              {price.loading ? <p className="text-caption mt-2">Carregando preço…</p> : price.data ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Info label="Venda" value={money(price.data.salePrice)} />
                  <Info label="Custo médio" value={money(price.data.averageCost)} />
                  <Info label="Margem" value={`${Number(price.data.marginPercentage).toFixed(2)}%`} />
                </div>
              ) : <p className="text-caption mt-2">Produto sem preço vigente.</p>}
            </section>
          )}
          <div className="flex flex-wrap gap-2">
            {canManage && <button onClick={() => onEdit(product)} className={secondaryBtn}>Editar</button>}
            {canManage && product.isActive && <button onClick={() => onDisable(product)} className={dangerBtn}>Desativar</button>}
            {canSeePricing && <button onClick={() => onPrice(product)} className={secondaryBtn}>Criar preço</button>}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function InventoryDrawer({ item, onClose, onSaved }: { item: InventoryItem | null; onClose: () => void; onSaved: () => void }) {
  const [movementOpen, setMovementOpen] = useState(false);
  const [form, setForm] = useState({ minimumQuantity: "", idealQuantity: "", reservedQuantity: "", location: "" });
  const history = useQuery((signal) => (item ? inventoryApi.listStockMovements({ inventoryItemId: item.id, limit: 8, signal }) : Promise.resolve(null)), [item?.id]);

  useMemo(() => {
    if (item) setForm({ minimumQuantity: String(item.minimumQuantity), idealQuantity: String(item.idealQuantity), reservedQuantity: String(item.reservedQuantity), location: item.location ?? "" });
  }, [item]);

  async function saveParams() {
    if (!item) return;
    await inventoryApi.updateInventoryItem(item.id, {
      minimumQuantity: Number(form.minimumQuantity || 0),
      idealQuantity: Number(form.idealQuantity || 0),
      reservedQuantity: Number(form.reservedQuantity || 0),
      location: form.location || null,
    });
    onSaved();
  }

  return (
    <Drawer open={item !== null} onClose={onClose} eyebrow="Estoque" title={item?.product?.name ?? "Item"} width="max-w-2xl">
      {item && (
        <div className="space-y-5">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
            <MetricMini label="Atual" value={qty(item.currentQuantity, item.product?.unit)} />
            <MetricMini label="Mínimo" value={qty(item.minimumQuantity, item.product?.unit)} />
            <MetricMini label="Ideal" value={qty(item.idealQuantity, item.product?.unit)} />
            <MetricMini label="Reservado" value={qty(item.reservedQuantity, item.product?.unit)} />
            <MetricMini label="Disponível" value={qty(item.availableQuantity, item.product?.unit)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Mínimo"><input value={form.minimumQuantity} onChange={(e) => setForm((f) => ({ ...f, minimumQuantity: e.target.value }))} className={inputCls} type="number" /></Field>
            <Field label="Ideal"><input value={form.idealQuantity} onChange={(e) => setForm((f) => ({ ...f, idealQuantity: e.target.value }))} className={inputCls} type="number" /></Field>
            <Field label="Reservado"><input value={form.reservedQuantity} onChange={(e) => setForm((f) => ({ ...f, reservedQuantity: e.target.value }))} className={inputCls} type="number" /></Field>
            <Field label="Localização"><input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className={inputCls} /></Field>
          </div>
          <div className="flex gap-2">
            <Gate roles={["OWNER", "MANAGER"]}><button onClick={saveParams} className={secondaryBtn}>Salvar parâmetros</button></Gate>
            <Gate roles={["OWNER", "MANAGER", "OPERATOR"]}><button onClick={() => setMovementOpen(true)} className={primaryBtn}>Nova movimentação</button></Gate>
          </div>
          <section className={cardCls}>
            <h3 className="text-sm font-semibold">Histórico recente</h3>
            <ul className="mt-2 space-y-2">
              {(history.data?.items ?? []).map((m) => <li key={m.id} className="flex justify-between text-sm"><span>{MOVEMENT_LABEL[m.type]} · {m.reason}</span><span className="font-mono">{qty(m.quantity, item.product?.unit)}</span></li>)}
            </ul>
          </section>
          <MovementDrawer item={item} open={movementOpen} onClose={() => setMovementOpen(false)} onSaved={() => { setMovementOpen(false); onSaved(); history.refetch(); }} />
        </div>
      )}
    </Drawer>
  );
}

function MovementDrawer({ item, open, onClose, onSaved }: { item: InventoryItem; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<{ type: StockMovementType; quantity: string; reason: string }>({ type: "IN", quantity: "", reason: "" });
  async function submit() {
    await inventoryApi.createStockMovement({ inventoryItemId: item.id, type: form.type, quantity: Number(form.quantity), reason: form.reason || MOVEMENT_LABEL[form.type] });
    onSaved();
  }
  return (
    <Drawer open={open} onClose={onClose} eyebrow="Movimentação" title={item.product?.name ?? ""} width="max-w-md" footer={<><button onClick={onClose} className={secondaryBtn}>Cancelar</button><button onClick={submit} className={primaryBtn} disabled={!form.quantity}>Registrar</button></>}>
      <div className="space-y-3">
        <Field label="Tipo"><select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as StockMovementType }))} className={inputCls}>{(["IN", "OUT", "ADJUSTMENT", "RETURN"] as StockMovementType[]).map((t) => <option key={t} value={t}>{MOVEMENT_LABEL[t]}</option>)}</select></Field>
        <Field label="Quantidade"><input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} className={inputCls} /></Field>
        <Field label="Motivo"><input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} className={inputCls} /></Field>
      </div>
    </Drawer>
  );
}

function SuppliersSection({ rows, columns, pagination, onPage, onLimit, onSelect, onCreate }: { rows: Supplier[]; columns: Column<Supplier>[]; pagination?: { page: number; limit: number; total: number; totalPages: number }; onPage: (p: number) => void; onLimit: (n: number) => void; onSelect: (s: Supplier) => void; onCreate: () => void }) {
  return (
    <div className="space-y-3">
      <Gate roles={["OWNER", "MANAGER"]}><button onClick={onCreate} className={primaryBtn}><Plus className="h-4 w-4" /> Novo fornecedor</button></Gate>
      {rows.length === 0 ? <EmptyState icon={Truck} title="Nenhum fornecedor" description="Cadastre fornecedores para compras futuras." /> : <DataTable columns={columns} rows={rows} onRowClick={onSelect} />}
      {pagination && <Pagination pagination={pagination} onPageChange={onPage} onPageSizeChange={onLimit} />}
    </div>
  );
}

function SupplierDrawer({ open, supplier, onClose, onSaved }: { open: boolean; supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ legalName: "", tradeName: "", document: "", phone: "", city: "", state: "", notes: "", isActive: true });
  useMemo(() => {
    if (!open) return;
    setForm({ legalName: supplier?.legalName ?? "", tradeName: supplier?.tradeName ?? "", document: supplier?.document ?? "", phone: phoneFrom(supplier?.contacts), city: String(supplier?.address?.city ?? ""), state: String(supplier?.address?.state ?? ""), notes: supplier?.notes ?? "", isActive: supplier?.isActive ?? true });
  }, [open, supplier]);
  async function submit() {
    const payload = { legalName: form.legalName, tradeName: form.tradeName || null, document: form.document || null, contacts: form.phone ? [{ phone: form.phone }] : [], address: { city: form.city, state: form.state }, notes: form.notes || null, isActive: form.isActive };
    if (supplier) await inventoryApi.updateSupplier(supplier.id, payload);
    else await inventoryApi.createSupplier(payload);
    onSaved();
    onClose();
  }
  async function disable() {
    if (!supplier || !confirm(`Desativar ${supplier.legalName}?`)) return;
    await inventoryApi.deleteSupplier(supplier.id);
    onSaved();
    onClose();
  }
  return (
    <Drawer open={open} onClose={onClose} eyebrow="Fornecedor" title={supplier ? "Editar fornecedor" : "Novo fornecedor"} width="max-w-xl" footer={<><button onClick={onClose} className={secondaryBtn}>Cancelar</button>{supplier?.isActive && <button onClick={disable} className={dangerBtn}>Desativar</button>}<button onClick={submit} className={primaryBtn} disabled={!form.legalName}>Salvar</button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Razão social"><input value={form.legalName} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} className={inputCls} /></Field>
        <Field label="Nome fantasia"><input value={form.tradeName} onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))} className={inputCls} /></Field>
        <Field label="Documento"><input value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} className={inputCls} /></Field>
        <Field label="Telefone"><input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} /></Field>
        <Field label="Cidade"><input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputCls} /></Field>
        <Field label="Estado"><input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className={inputCls} /></Field>
        <div className="sm:col-span-2"><Field label="Observações"><textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={`${inputCls} min-h-20 py-2`} /></Field></div>
      </div>
    </Drawer>
  );
}

function PricingDrawer({ product, revision, canEdit, onClose, onSaved }: { product: Product | null; revision: ProductPricing | null; canEdit: boolean; onClose: () => void; onSaved: () => void }) {
  const products = useQuery((signal) => inventoryApi.listProducts({ limit: 100, active: true, signal }), []);
  const targetProduct = product ?? products.data?.items[0] ?? null;
  const [productId, setProductId] = useState("");
  const [form, setForm] = useState({ costPrice: "", replacementCost: "", averageCost: "", salePrice: "", minimumSalePrice: "", suggestedSalePrice: "", validFrom: new Date().toISOString().slice(0, 10) });
  const history = useQuery((signal) => (targetProduct ? pricingApi.getPricingHistory(targetProduct.id, { limit: 10, signal }) : Promise.resolve(null)), [targetProduct?.id]);

  useMemo(() => {
    setProductId(targetProduct?.id ?? "");
    if (revision) setForm({ costPrice: String(revision.costPrice), replacementCost: String(revision.replacementCost), averageCost: String(revision.averageCost), salePrice: String(revision.salePrice), minimumSalePrice: String(revision.minimumSalePrice), suggestedSalePrice: String(revision.suggestedSalePrice), validFrom: new Date().toISOString().slice(0, 10) });
  }, [targetProduct?.id, revision]);

  async function submit() {
    const payload = {
      costPrice: Number(form.costPrice),
      replacementCost: Number(form.replacementCost),
      averageCost: Number(form.averageCost),
      salePrice: Number(form.salePrice),
      minimumSalePrice: Number(form.minimumSalePrice),
      suggestedSalePrice: Number(form.suggestedSalePrice),
      validFrom: `${form.validFrom}T00:00:00.000Z`,
    };
    if (revision) await pricingApi.revisePricing(revision.id, payload);
    else if (productId) await pricingApi.createProductPricing(productId, payload);
    onSaved();
    onClose();
  }
  return (
    <Drawer open={product !== null || revision !== null} onClose={onClose} eyebrow="Pricing" title={revision ? "Revisar preço" : "Novo preço"} width="max-w-2xl" footer={<>{canEdit && <button onClick={submit} className={primaryBtn} disabled={!productId || !form.salePrice}>Salvar preço</button>}<button onClick={onClose} className={secondaryBtn}>Fechar</button></>}>
      {!canEdit && <ErrorState error={new ApiClientError({ code: "AUTH_FORBIDDEN", status: 403, message: "Sem permissão para editar pricing", details: {} })} />}
      <div className="space-y-4">
        {!revision && <Field label="Produto"><select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}>{products.data?.items.map((p) => <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>)}</select></Field>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Custo"><input type="number" value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))} className={inputCls} /></Field>
          <Field label="Reposição"><input type="number" value={form.replacementCost} onChange={(e) => setForm((f) => ({ ...f, replacementCost: e.target.value }))} className={inputCls} /></Field>
          <Field label="Custo médio"><input type="number" value={form.averageCost} onChange={(e) => setForm((f) => ({ ...f, averageCost: e.target.value }))} className={inputCls} /></Field>
          <Field label="Venda"><input type="number" value={form.salePrice} onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))} className={inputCls} /></Field>
          <Field label="Mínimo"><input type="number" value={form.minimumSalePrice} onChange={(e) => setForm((f) => ({ ...f, minimumSalePrice: e.target.value }))} className={inputCls} /></Field>
          <Field label="Sugerido"><input type="number" value={form.suggestedSalePrice} onChange={(e) => setForm((f) => ({ ...f, suggestedSalePrice: e.target.value }))} className={inputCls} /></Field>
          <Field label="Vigente a partir de"><input type="date" value={form.validFrom} onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))} className={inputCls} /></Field>
        </div>
        <section className={cardCls}>
          <h3 className="text-sm font-semibold">Histórico</h3>
          <ul className="mt-2 space-y-2">
            {(history.data?.items ?? []).map((p) => <li key={p.id} className="flex justify-between text-sm"><span>{dateOnly(p.validFrom)} · margem {n(p.marginPercentage).toFixed(2)}%</span><span>{money(p.salePrice)}</span></li>)}
          </ul>
        </section>
      </div>
    </Drawer>
  );
}

function StockSummary({ product }: { product: Product }) {
  const items = product.inventoryItems ?? [];
  const total = items.reduce((sum, item) => sum + n(item.availableQuantity), 0);
  return <span className="font-mono text-xs">{formatNumber(total)} {product.unit}</span>;
}

function StockStatus({ item }: { item: InventoryItem }) {
  const available = n(item.availableQuantity);
  const minimum = n(item.minimumQuantity);
  if (!item.isActive) return <StatusChip tone="neutral">Inativo</StatusChip>;
  if (available <= 0) return <StatusChip tone="danger" dot>Sem estoque</StatusChip>;
  if (minimum > 0 && available <= minimum) return <StatusChip tone="warning" dot>Crítico</StatusChip>;
  return <StatusChip tone="success" dot>OK</StatusChip>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-caption">{label}</dt><dd className="text-sm font-medium">{value}</dd></div>;
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return <div className={cardCls}><div className="text-caption">{label}</div><div className="mt-1 font-mono text-sm">{value}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-sm font-medium">{label}</span>{children}</label>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full px-3 h-9 text-sm transition ${active ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "border border-[var(--color-border)] hover:bg-[var(--color-muted)]"}`}>{children}</button>;
}

function switchTab(tab: Tab, setTab: (tab: Tab) => void, setPage: (page: number) => void) {
  setTab(tab);
  setPage(1);
}

function n(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function qty(value: string | number, unit = ""): string {
  return `${formatNumber(n(value))}${unit ? ` ${unit}` : ""}`;
}

function money(value: string | number): string {
  return formatCurrencyBRL(n(value));
}

function dateOnly(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR");
}

function movementTone(type: StockMovementType) {
  if (type === "OUT" || type === "CONSUMPTION") return "danger";
  if (type === "ADJUSTMENT" || type === "TRANSFER") return "warning";
  return "success";
}

function summarizeContacts(contacts: unknown[]): string {
  const first = contacts[0];
  if (first && typeof first === "object") return Object.values(first as Record<string, unknown>).filter(Boolean).join(" · ") || "—";
  return "—";
}

function summarizeAddress(address: Record<string, unknown>): string {
  return [address.city, address.state].filter(Boolean).join(" / ") || "—";
}

function phoneFrom(contacts?: unknown[]): string {
  const first = contacts?.[0];
  return first && typeof first === "object" ? String((first as Record<string, unknown>).phone ?? "") : "";
}

const primaryBtn = "inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-3 h-9 text-sm font-medium shadow-[var(--shadow-card)] disabled:opacity-50";
const secondaryBtn = "inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 h-9 text-sm hover:bg-[var(--color-muted)]";
const dangerBtn = "inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)]/40 text-[var(--color-danger)] px-3 h-9 text-sm hover:bg-[var(--color-danger)]/10";
const inputCls = "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 h-9 text-sm outline-none focus:border-[var(--color-primary)]";
const cardCls = "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-4";
