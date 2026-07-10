"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { notificationsApi, type NotificationItem } from "@erp/api";
import { formatDateTime, formatLongDate } from "@erp/utils";

export function OperatorHeader({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function loadCount() {
    const result = await notificationsApi.unreadCount().catch(() => ({ count: 0 }));
    setCount(result.count);
  }

  async function loadItems() {
    setLoading(true);
    try {
      const result = await notificationsApi.listNotifications({ limit: 6 });
      setItems(result.items);
      setCount(result.items.filter((item) => !item.readAt).length);
    } finally {
      setLoading(false);
    }
  }

  async function markAll() {
    await notificationsApi.markAllRead();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setCount(0);
  }

  useEffect(() => {
    void loadCount();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadCount();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) void loadItems();
  }, [open]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <header className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">{formatLongDate()}</p>
        <h1 className="text-[22px] font-semibold tracking-tight leading-tight">Olá, {name}.</h1>
      </div>
      <div className="relative" ref={ref}>
        <button
          type="button"
          aria-label={`Notificações${count ? `, ${count} não lidas` : ""}`}
          onClick={() => setOpen((value) => !value)}
          className="relative h-11 w-11 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] grid place-items-center shadow-[var(--shadow-card)]"
        >
          <Bell className="h-5 w-5" />
          {count > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-semibold leading-5 text-white">{count > 9 ? "9+" : count}</span>}
        </button>
        {open && (
          <div className="absolute right-0 z-40 mt-2 w-[min(330px,calc(100vw-32px))] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-[var(--shadow-floating)]">
            <div className="flex items-center justify-between px-2 py-2">
              <div>
                <div className="text-sm font-semibold">Notificações</div>
                <div className="text-caption">{count} não lida(s)</div>
              </div>
              <button type="button" onClick={markAll} className="rounded-[var(--radius-md)] p-2 hover:bg-[var(--color-muted)]" aria-label="Marcar todas como lidas">
                <CheckCheck className="h-4 w-4" />
              </button>
            </div>
            {loading ? (
              <div className="grid place-items-center py-8 text-sm text-[var(--color-muted-foreground)]"><Loader2 className="mb-2 h-5 w-5 animate-spin" /> Carregando…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-muted-foreground)]">Sem notificações agora.</div>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id} className={`rounded-[var(--radius-md)] px-2 py-2 ${item.readAt ? "opacity-70" : "bg-[var(--color-primary)]/5"}`}>
                    <div className="text-sm font-medium">{item.title}</div>
                    <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">{item.message}</p>
                    <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">{formatDateTime(item.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
