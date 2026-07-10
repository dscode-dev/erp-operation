import { api } from "./client";
import type { NotificationItem, NotificationType, Paginated } from "@erp/types";

export type ListNotificationsParams = {
  page?: number;
  limit?: number;
  unread?: boolean;
  type?: NotificationType;
  signal?: AbortSignal;
};

export function listNotifications(params?: ListNotificationsParams): Promise<Paginated<NotificationItem>> {
  const { signal, ...query } = params ?? {};
  return api.get<Paginated<NotificationItem>>("/notifications", { query, signal });
}

export function unreadCount(opts?: { signal?: AbortSignal }): Promise<{ count: number }> {
  return api.get<{ count: number }>("/notifications/unread-count", opts);
}

export function markRead(id: string): Promise<NotificationItem> {
  return api.patch<NotificationItem>(`/notifications/${id}/read`);
}

export function markAllRead(): Promise<{ updated: number }> {
  return api.patch<{ updated: number }>("/notifications/read-all");
}
