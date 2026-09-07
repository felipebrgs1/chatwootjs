import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { cn } from "@chatwootjs/ui/lib/utils";

import { useSessionContext } from "@/components/session-provider";
import { subscribeCableEvents } from "@/hooks/useCable";
import {
  NOTIFICATION_TYPE_LABELS,
  listNotifications,
  readAllNotifications,
  type ApiNotification,
} from "@/lib/notifications";

/**
 * M11 — Sino de notificações: badge + dropdown + realtime.
 * `notification.created` chega pelo cable (filtrado pelo `user_id` do evento).
 */
export function NotificationBell({ accountId }: { accountId: number }) {
  const { session } = useSessionContext();
  const myId = session?.user.id ?? null;
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listNotifications(accountId, { read: false, page: 1 });
      setUnread(data.unread_count);
      setItems(data.notifications.slice(0, 10));
    } catch {
      /* sem sessão — o provider trata */
    }
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;
    void listNotifications(accountId, { read: false, page: 1 })
      .then((data) => {
        if (cancelled) return;
        setUnread(data.unread_count);
        setItems(data.notifications.slice(0, 10));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => {
    return subscribeCableEvents((event) => {
      if (event.event !== "notification.created") return;
      const data = event.data as {
        user_id?: number;
        notification_type?: string;
        conversation_id?: number;
      };
      if (myId != null && data.user_id !== myId) return;
      void refresh();
      const label = NOTIFICATION_TYPE_LABELS[data.notification_type ?? ""] ?? "Nova notificação";
      toast.info(label, {
        description: data.conversation_id != null ? `Conversa #${data.conversation_id}` : undefined,
      });
    });
  }, [myId, refresh]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  async function markAllRead(): Promise<void> {
    await readAllNotifications(accountId);
    setUnread(0);
    setItems([]);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        title="Notificações"
        aria-label="Notificações"
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-7 place-content-center rounded-lg text-woot-slate-11 hover:bg-muted"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-content-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
            <span className="text-sm font-medium">Notificações</span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  type="button"
                  title="Marcar todas como lidas"
                  onClick={() => void markAllRead()}
                  className="grid size-6 place-content-center rounded-md text-woot-slate-11 hover:bg-muted"
                >
                  <CheckCheck className="size-4" />
                </button>
              )}
              <Link
                to="/app/notifications"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-xs text-woot-blue hover:bg-woot-nav-active-bg"
              >
                Ver todas
              </Link>
            </div>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-woot-slate-11">
                Nenhuma notificação não lida.
              </li>
            )}
            {items.map((n) => (
              <li key={n.id} className="border-b border-border/40 last:border-0">
                <NotificationRow notification={n} onOpen={() => setOpen(false)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function NotificationRow({
  notification,
  onOpen,
}: {
  notification: ApiNotification;
  onOpen?: () => void;
}) {
  const label =
    NOTIFICATION_TYPE_LABELS[notification.notification_type] ?? notification.notification_type;
  const body = (
    <span className="block px-3 py-2.5">
      <span className="block text-[13px] font-medium leading-5">
        {notification.actor_name ? `${notification.actor_name}: ` : ""}
        {label}
      </span>
      <span
        className={cn(
          "block text-xs",
          notification.read_at ? "text-woot-slate-10" : "text-woot-blue",
        )}
      >
        {notification.conversation_id != null
          ? `Conversa #${notification.conversation_id}`
          : new Date(notification.created_at).toLocaleString("pt-BR")}
        {!notification.read_at && " • não lida"}
      </span>
    </span>
  );
  if (notification.conversation_id != null) {
    return (
      <Link
        to="/app/conversations/$conversationId"
        params={{ conversationId: String(notification.conversation_id) }}
        onClick={onOpen}
        className="block transition-colors hover:bg-muted/40"
      >
        {body}
      </Link>
    );
  }
  return body;
}
