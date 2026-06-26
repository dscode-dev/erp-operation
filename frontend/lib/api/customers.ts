/** Customer domain — production API (no mocks). */
import { api } from "./client";
import type {
  AssetWithContent,
  CreateCustomerPayload,
  Customer,
  CustomerAddress,
  CustomerContact,
  CustomerDetail,
  CustomerStats,
  Paginated,
} from "./types";

export function listCustomers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  signal?: AbortSignal;
}): Promise<Paginated<Customer>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<Customer>>("/customers", { query, signal });
}

export function getCustomerStats(opts?: { signal?: AbortSignal }): Promise<CustomerStats> {
  return api.get<CustomerStats>("/customers/stats", opts);
}

export function getCustomer(id: string, opts?: { signal?: AbortSignal }): Promise<CustomerDetail> {
  return api.get<CustomerDetail>(`/customers/${id}`, opts);
}

export function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  return api.post<Customer>("/customers", payload);
}

export function updateCustomer(
  id: string,
  payload: Partial<CreateCustomerPayload>,
): Promise<Customer> {
  return api.patch<Customer>(`/customers/${id}`, payload);
}

export function disableCustomer(id: string): Promise<Customer> {
  return api.patch<Customer>(`/customers/${id}/disable`);
}

export function enableCustomer(id: string): Promise<Customer> {
  return api.patch<Customer>(`/customers/${id}/enable`);
}

export function deleteCustomer(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/customers/${id}`);
}

/* ---------- Nested: addresses ---------- */

export function createAddress(
  customerId: string,
  payload: Partial<CustomerAddress>,
): Promise<CustomerAddress> {
  return api.post<CustomerAddress>(`/customers/${customerId}/addresses`, payload);
}

export function updateAddress(
  customerId: string,
  addressId: string,
  payload: Partial<CustomerAddress>,
): Promise<CustomerAddress> {
  return api.patch<CustomerAddress>(`/customers/${customerId}/addresses/${addressId}`, payload);
}

export function deleteAddress(
  customerId: string,
  addressId: string,
): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/customers/${customerId}/addresses/${addressId}`);
}

/* ---------- Nested: contacts ---------- */

export function createContact(
  customerId: string,
  payload: Partial<CustomerContact>,
): Promise<CustomerContact> {
  return api.post<CustomerContact>(`/customers/${customerId}/contacts`, payload);
}

export function updateContact(
  customerId: string,
  contactId: string,
  payload: Partial<CustomerContact>,
): Promise<CustomerContact> {
  return api.patch<CustomerContact>(`/customers/${customerId}/contacts/${contactId}`, payload);
}

export function deleteContact(
  customerId: string,
  contactId: string,
): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/customers/${customerId}/contacts/${contactId}`);
}

/* ---------- Attachments ---------- */

export function uploadCustomerAttachment(
  customerId: string,
  category: string,
  file: File,
): Promise<{ id: string }> {
  const form = new FormData();
  form.append("category", category);
  form.append("file", file);
  return api.upload<{ id: string }>(`/customers/${customerId}/attachments`, form);
}

export function getCustomerAttachment(attachmentId: string): Promise<AssetWithContent> {
  return api.get<AssetWithContent>(`/customers/attachments/${attachmentId}`);
}
