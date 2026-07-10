"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Building2, CheckCheck, ChevronDown, CircleAlert, Info, Loader2, LogOut, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@erp/ui/theme/theme-toggle";
import { useCommandPalette } from "@platform/components/command-palette";
import { useAuth } from "@erp/ui/auth/auth-provider";
import { UserAvatar } from "@erp/ui/user-avatar";
import { notificationsApi, ApiClientError, type NotificationItem, type NotificationSeverity } from "@erp/api";
import { formatDateTime } from "@erp/utils";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Proprietário",
  MANAGER: "Gestor",
  OPERATOR: "Operador",
  VIEWER: "Visualizador",
};

export function PlatformTopbar() {
  const router = useRouter();
  const { open } = useCommandPalette();
  const { session, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const orgName = session?.organization.tradeName ?? session?.organization.legalName ?? "Empresa";
  const userName = session?.user.name ?? "Usuário";
  const roleLabel = session ? ROLE_LABEL[session.role] ?? session.role : "";
  const userId = session?.user.id ?? null;

  const loadUnread = useCallback(async (signal?: AbortSignal) => {
    if (!userId) return;
    try {
      const result = await notificationsApi.unreadCount({ signal });
      setUnreadCount(result.count);
    } catch {
      // The bell must not break the shell; panel fetch surfaces actionable errors.
    }
  }, [userId]);

  const loadNotifications = useCallback(async (signal?: AbortSignal) => {
    if (!userId) return;
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const result = await notificationsApi.listNotifications({ limit: 8, signal });
      setNotifications(result.items);
      setUnreadCount(result.items.filter((item) => !item.readAt).length);
    } catch (err) {
      setNotificationsError(err instanceof ApiClientError ? err.message : "Falha ao carregar notificações.");
    } finally {
      setNotificationsLoading(false);
    }
  }, [userId]);

  async function markRead(notification: NotificationItem, navigate = false) {
    try {
      if (!notification.readAt) {
        const updated = await notificationsApi.markRead(notification.id);
        setNotifications((items) => items.map((item) => (item.id === updated.id ? updated : item)));
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      if (navigate && notification.actionUrl?.startsWith("/")) {
        setNotificationsOpen(false);
        router.push(notification.actionUrl);
      }
    } catch (err) {
      setNotificationsError(err instanceof ApiClientError ? err.message : "Falha ao marcar notificação.");
    }
  }

  async function markAllRead() {
    try {
      await notificationsApi.markAllRead();
      setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      setNotificationsError(err instanceof ApiClientError ? err.message : "Falha ao marcar todas como lidas.");
    }
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) setNotificationsOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void loadUnread(controller.signal);
    const onFocus = () => void loadUnread();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadUnread();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadUnread();
    }, 60_000);
    return () => {
      controller.abort();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(interval);
    };
  }, [loadUnread, userId]);

  useEffect(() => {
    if (notificationsOpen) void loadNotifications();
  }, [loadNotifications, notificationsOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)]/80 px-4 lg:px-6 backdrop-blur">
      <div
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-2 py-1.5 text-sm text-[var(--color-muted-foreground)]"
      >
        <Building2 className="h-4 w-4" />
        <span className="hidden sm:inline max-w-[180px] truncate">{orgName}</span>
      </div>

      <button
        type="button"
        onClick={open}
        aria-label="Busca global (Ctrl+K)"
        className="flex-1 max-w-md inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-muted)]/40 px-3 py-1.5 text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar clientes, serviços, equipamentos…</span>
        <kbd className="font-mono text-[10px] rounded border border-[var(--color-border)] px-1.5 py-0.5">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            aria-label={`Notificações${unreadCount ? `, ${unreadCount} não lidas` : ""}`}
            aria-haspopup="dialog"
            aria-expanded={notificationsOpen ? "true" : "false"}
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-semibold leading-4 text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div
              role="dialog"
              aria-label="Central de notificações"
              className="absolute right-0 mt-2 w-[min(380px,calc(100vw-24px))] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] p-2 shadow-[var(--shadow-floating)] animate-slide-up"
            >
              <div className="flex items-center justify-between gap-3 px-2 py-2">
                <div>
                  <div className="text-sm font-semibold">Notificações</div>
                  <div className="text-caption">{unreadCount} não lida(s)</div>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => loadNotifications()} className="rounded-[var(--radius-md)] p-2 hover:bg-[var(--color-muted)]" aria-label="Atualizar notificações">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={markAllRead} className="rounded-[var(--radius-md)] p-2 hover:bg-[var(--color-muted)]" aria-label="Marcar todas como lidas">
                    <CheckCheck className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {notificationsError && (
                <div className="m-2 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-xs text-[var(--color-danger)]">
                  {notificationsError}
                </div>
              )}
              {notificationsLoading ? (
                <div className="grid place-items-center py-10 text-sm text-[var(--color-muted-foreground)]">
                  <Loader2 className="mb-2 h-5 w-5 animate-spin" /> Carregando…
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]">Nenhuma notificação relevante no momento.</div>
              ) : (
                <ul className="max-h-[420px] overflow-y-auto">
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => markRead(notification, true)}
                        className={`w-full rounded-[var(--radius-md)] px-2 py-2 text-left hover:bg-[var(--color-muted)] ${notification.readAt ? "opacity-70" : "bg-[var(--color-primary)]/5"}`}
                      >
                        <div className="flex gap-2">
                          <NotificationIcon severity={notification.severity} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium">{notification.title}</span>
                              {!notification.readAt && <span className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-muted-foreground)]">{notification.message}</p>
                            <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">{formatDateTime(notification.createdAt)}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <ThemeToggle />

        <div className="relative ml-1" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu do usuário"
            aria-haspopup="menu"
            aria-expanded={menuOpen ? "true" : "false"}
            className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-[var(--color-muted)]"
          >
            <UserAvatar name={userName} avatarAssetId={session?.user.avatarAssetId ?? null} size="sm" />
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-60 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-floating)] p-1.5 animate-slide-up"
            >
              <div className="px-3 py-2.5 border-b border-[var(--color-border)]">
                <div className="text-sm font-medium truncate">{userName}</div>
                <div className="text-caption truncate">{session?.user.email}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--color-primary)]">
                  <ShieldCheck className="h-3 w-3" /> {roleLabel}
                </div>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => logout()}
                className="mt-1 w-full inline-flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationIcon({ severity }: { severity: NotificationSeverity }) {
  const tone: Record<NotificationSeverity, string> = {
    INFO: "text-[var(--color-primary)] bg-[var(--color-primary)]/10",
    SUCCESS: "text-[var(--color-success)] bg-[var(--color-success)]/10",
    WARNING: "text-[var(--color-warning)] bg-[var(--color-warning)]/10",
    DANGER: "text-[var(--color-danger)] bg-[var(--color-danger)]/10",
  };
  return (
    <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${tone[severity]}`}>
      {severity === "WARNING" || severity === "DANGER" ? <CircleAlert className="h-4 w-4" /> : <Info className="h-4 w-4" />}
    </span>
  );
}
