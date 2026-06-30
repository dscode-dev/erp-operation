/**
 * Commercial-demo domains (Ordens de Serviço, Produtos).
 *
 * No production domain exists yet, so these read from the development Demo
 * Dataset snapshots (`demo.orders.v1`, `demo.products.v1`). When the real
 * domains ship, swap the implementation here — pages stay unchanged.
 */
import { getDemoDataset, isDemoDisabled } from "./demo";
import type { DemoOrder, DemoProduct, DemoService } from "@erp/types";

export type OrdersData = { items: DemoOrder[]; disabled: boolean };
export type ProductsData = { items: DemoProduct[]; disabled: boolean };
export type ServicesData = { items: DemoService[]; disabled: boolean };

export async function getOrders(opts?: { signal?: AbortSignal }): Promise<OrdersData> {
  try {
    const dataset = await getDemoDataset(opts);
    return { items: dataset["demo.orders.v1"]?.items ?? [], disabled: false };
  } catch (err) {
    return { items: [], disabled: isDemoDisabled(err) };
  }
}

export async function getProducts(opts?: { signal?: AbortSignal }): Promise<ProductsData> {
  try {
    const dataset = await getDemoDataset(opts);
    return { items: dataset["demo.products.v1"]?.items ?? [], disabled: false };
  } catch (err) {
    return { items: [], disabled: isDemoDisabled(err) };
  }
}

export async function getServices(opts?: { signal?: AbortSignal }): Promise<ServicesData> {
  try {
    const dataset = await getDemoDataset(opts);
    return { items: dataset["demo.services.v1"]?.items ?? [], disabled: false };
  } catch (err) {
    return { items: [], disabled: isDemoDisabled(err) };
  }
}
