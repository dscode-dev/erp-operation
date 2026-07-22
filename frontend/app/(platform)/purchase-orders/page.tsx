"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PackageCheck, Plus, RefreshCw, Search, ShoppingCart } from "lucide-react";
import { PageHeader } from "@platform/components/page-header";
import { DashboardSection } from "@platform/components/dashboard-section";
import { Pagination } from "@platform/components/pagination";
import { MetricCard } from "@erp/ui/metric-card";
import { SkeletonCard } from "@erp/ui/skeletons";
import { EmptyState } from "@erp/ui/empty-state";
import { ErrorState } from "@erp/ui/states";
import { Gate } from "@erp/ui/auth/gate";
import {
  inventoryApi,
  procurementApi,
  useQuery,
  type Paginated,
  type Product,
  type PurchaseOrder,
  type PurchaseOrderStats,
  type PurchaseOrderStatus,
  type Supplier,
} from "@erp/api";
import { formatCurrencyBRL, formatDate } from "@erp/utils";
import { PurchaseOrderDrawer } from "@platform/components/purchase-order-drawer";
import { PurchaseStatusBadge } from "@platform/components/financial-procurement-badges";

const statuses: Array<PurchaseOrderStatus | ""> = ["", "DRAFT", "SENT", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELED"];

export default function PurchaseOrdersPage() {
  const params = useSearchParams();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PurchaseOrderStatus | "">(() => parseStatus(params.get("status")));
  const [supplierId, setSupplierId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [drawer, setDrawer] = useState<{ open: boolean; order: PurchaseOrder | null }>({ open: false, order: null });

  const stats = useQuery<PurchaseOrderStats>((signal) => procurementApi.getPurchaseOrderStats({ signal }), []);
  const orders = useQuery<Paginated<PurchaseOrder>>(
    (signal) => procurementApi.listPurchaseOrders({
      page,
      limit,
      search,
      status: status || undefined,
      supplierId: supplierId || undefined,
      from: from || undefined,
      to: to || undefined,
      signal,
    }),
    [page, limit, search, status, supplierId, from, to],
  );
  const suppliers = useQuery<Paginated<Supplier>>((signal) => inventoryApi.listSuppliers({ limit: 100, active: true, signal }), []);
  const products = useQuery<Paginated<Product>>((signal) => inventoryApi.listProducts({ limit: 100, active: true, purchasable: true, signal }), []);

  const supplierItems = suppliers.data?.items ?? [];
  const productItems = products.data?.items ?? [];
  const refetchAll = () => {
    stats.refetch();
    orders.refetch();
    suppliers.refetch();
    products.refetch();
  };

  return (
    <Gate
      roles={["OWNER", "MANAGER"]}
      fallback={
        <div className="max-w-[1440px]">
          <PageHeader eyebrow="Compras" title="Pedidos de Compra" description="Acesso restrito." />
          <ErrorState error={{ message: "Seu perfil não possui permissão para compras." }} />
        </div>
      }
    >
      <div className="space-y-8 max-w-[1440px]">
        <PageHeader
          eyebrow={<span className="inline-flex items-center gap-1.5"><ShoppingCart className="h-3 w-3" /> Procurement</span>}
          title="Pedidos de Compra"
          description="Fluxo real de aquisição, envio e recebimento integrado ao estoque."
          actions={
            <>
              <button className="btn-secondary" onClick={refetchAll}><RefreshCw className="h-4 w-4" /> Atualizar</button>
              <button className="btn-primary" onClick={() => setDrawer({ open: true, order: null })}><Plus className="h-4 w-4" /> Novo pedido</button>
            </>
          }
        />

        <DashboardSection title="Indicadores de compras">
          {stats.loading && !stats.data ? (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : stats.error && !stats.data ? (
            <ErrorState error={stats.error} onRetry={stats.refetch} />
          ) : (
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
              <MetricCard label="Total" value={String(stats.data?.total ?? 0)} icon="ShoppingCart" />
              <MetricCard label="Rascunhos" value={String(stats.data?.draft ?? 0)} icon="FilePenLine" />
              <MetricCard label="Aguardando receb." value={String((stats.data?.sent ?? 0) + (stats.data?.partiallyReceived ?? 0))} trend={(stats.data?.sent ?? 0) > 0 ? "up" : "flat"} icon="Truck" />
              <MetricCard label="Recebidos" value={String(stats.data?.received ?? 0)} trend="up" icon="PackageCheck" />
              <MetricCard label="Cancelados" value={String(stats.data?.canceled ?? 0)} trend={(stats.data?.canceled ?? 0) > 0 ? "down" : "flat"} icon="Ban" />
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="Lista de pedidos">
          <div className="mb-4 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            <label className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-muted-foreground)]" />
              <input className="input pl-9" placeholder="Buscar pedido" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </label>
            <select className="input" value={supplierId} onChange={(e) => { setSupplierId(e.target.value); setPage(1); }}>
              <option value="">Fornecedor</option>{supplierItems.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.tradeName ?? supplier.legalName}</option>)}
            </select>
            <select className="input" value={status} onChange={(e) => { setStatus(e.target.value as PurchaseOrderStatus | ""); setPage(1); }}>
              {statuses.map((value) => <option key={value || "all"} value={value}>{value || "Status"}</option>)}
            </select>
            <input className="input" type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <input className="input" type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>

          {orders.loading && !orders.data ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : orders.error && !orders.data ? (
            <ErrorState error={orders.error} onRetry={orders.refetch} />
          ) : (orders.data?.items.length ?? 0) === 0 ? (
            <EmptyState icon={PackageCheck} title="Nenhum pedido de compra" description="Crie o primeiro pedido ou ajuste os filtros." />
          ) : (
            <>
              <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-muted)]/50 text-left text-caption">
                    <tr><th className="p-3">Número</th><th>Fornecedor</th><th>Status</th><th>Entrega prevista</th><th>Itens</th><th className="p-3 text-right">Valor estimado</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {orders.data?.items.map((order) => {
                      const total = (order.items ?? []).reduce((sum, item) => sum + Number(item.quantity) * Number(item.snapshotCost), 0);
                      return (
                        <tr key={order.id} className="cursor-pointer hover:bg-[var(--color-muted)]/40" onClick={() => setDrawer({ open: true, order })}>
                          <td className="p-3 font-medium">#{order.number}</td>
                          <td>{order.supplier?.tradeName ?? order.supplier?.legalName ?? "—"}</td>
                          <td><PurchaseStatusBadge status={order.status} /></td>
                          <td>{formatDate(order.expectedDelivery)}</td>
                          <td>{order.items?.length ?? 0}</td>
                          <td className="p-3 text-right font-mono">{formatCurrencyBRL(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {orders.data && <div className="mt-4"><Pagination pagination={orders.data.pagination} onPageChange={setPage} onPageSizeChange={(next) => { setLimit(next); setPage(1); }} /></div>}
            </>
          )}
        </DashboardSection>

        <PurchaseOrderDrawer open={drawer.open} order={drawer.order} suppliers={supplierItems} products={productItems} onClose={() => setDrawer({ open: false, order: null })} onSaved={refetchAll} />
      </div>
    </Gate>
  );
}

function parseStatus(value: string | null): PurchaseOrderStatus | "" {
  return value && statuses.includes(value as PurchaseOrderStatus) ? (value as PurchaseOrderStatus) : "";
}
