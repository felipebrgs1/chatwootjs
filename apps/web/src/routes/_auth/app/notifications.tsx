import { CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";

import { NotificationRow } from "@/components/notifications/NotificationBell";
import { useSessionContext } from "@/components/session-provider";
import {
  NOTIFICATION_TYPE_LABELS,
  getNotificationSettings,
  listNotifications,
  markNotificationRead,
  readAllNotifications,
  updateNotificationSettings,
  type ApiNotification,
  type NotificationSettings,
} from "@/lib/notifications";

export const Route = createFileRoute("/_auth/app/notifications")({
  component: NotificationsPage,
});

const SETTING_KEYS = Object.keys(NOTIFICATION_TYPE_LABELS);

/**
 * M11 — Página de notificações: lista (clica → abre a conversa e marca
 * como lida) + preferências por tipo (sino ligado/desligado).
 */
function NotificationsPage() {
  const { session } = useSessionContext();
  const accountId = session?.accountId ?? null;
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  const refresh = useCallback(async () => {
    if (!accountId) return;
    const data = await listNotifications(accountId, onlyUnread ? { read: false } : {});
    setItems(data.notifications);
    setUnread(data.unread_count);
  }, [accountId, onlyUnread]);

  useEffect(() => {
    let cancelled = false;
    if (!accountId) return;
    void listNotifications(accountId, onlyUnread ? { read: false } : {})
      .then((data) => {
        if (cancelled) return;
        setItems(data.notifications);
        setUnread(data.unread_count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId, onlyUnread]);

  useEffect(() => {
    if (!accountId) return;
    void getNotificationSettings(accountId)
      .then(setSettings)
      .catch(() => {});
  }, [accountId]);

  async function openNotification(n: ApiNotification): Promise<void> {
    if (!accountId || n.read_at) return;
    await markNotificationRead(accountId, n.id).catch(() => {});
    setItems((prev) =>
      prev.map((item) =>
        item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item,
      ),
    );
    setUnread((u) => Math.max(0, u - 1));
  }

  async function toggleType(type: string, enabled: boolean): Promise<void> {
    if (!accountId || !settings) return;
    const muted = enabled
      ? settings.muted_flags.filter((f) => f !== type)
      : [...settings.muted_flags, type];
    const next = await updateNotificationSettings(accountId, { muted_flags: muted });
    setSettings(next);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-woot-bg">
      <header className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">
            Notificações{" "}
            {unread > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({unread} não lidas)
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            Atribuições, menções e novas mensagens em conversas que você participa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Checkbox checked={onlyUnread} onCheckedChange={(v) => setOnlyUnread(v === true)} />
            Só não lidas
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (accountId) void readAllNotifications(accountId).then(() => void refresh());
            }}
          >
            <CheckCheck className="mr-1 size-4" /> Marcar todas como lidas
          </Button>
        </div>
      </header>
      <main className="grid flex-1 content-start gap-4 overflow-y-auto p-6 lg:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-border rounded-lg border bg-card">
          {items.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação aqui.
            </li>
          )}
          {items.map((n) => (
            <li key={n.id} onClick={() => void openNotification(n)}>
              <NotificationRow notification={n} />
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-lg border bg-card p-4">
          <h2 className="text-sm font-semibold">Sino por tipo</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Desligar um tipo silencia a notificação realtime e o badge.
          </p>
          {settings ? (
            <ul className="grid gap-2">
              {SETTING_KEYS.map((type) => {
                const enabled = !settings.muted_flags.includes(type);
                return (
                  <li key={type}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={enabled}
                        onCheckedChange={(v) => void toggleType(type, v === true)}
                      />
                      {NOTIFICATION_TYPE_LABELS[type]}
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Carregando…</p>
          )}
        </aside>
      </main>
    </div>
  );
}
