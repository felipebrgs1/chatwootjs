import {
  dropPresence,
  loadMembership,
  publish,
  subscribe,
  touchPresence,
  verifyAccessToken,
} from "@chatwootjs/core";
import type { RealtimeEvent } from "@chatwootjs/core";
import { createBunWebSocket } from "hono/bun";

/**
 * WebSocket realtime (`GET /cable?token=<jwt>`), protocolo JSON compatível
 * com o ActionCable do Rails.
 *
 * Cliente → {"command":"subscribe","identifier":"{\"channel\":\"RoomChannel\",\"account_id\":N}"}
 * Servidor → {"type":"welcome"} / {"type":"confirm_subscription","identifier":...}
 * Eventos → {"identifier":...,"message":{"event":"message.created","data":{...}}}
 *
 * O callback abaixo roda uma vez por conexão: `rooms` e `unsubs` vivem no
 * closure da conexão — sem estado global.
 */

const { upgradeWebSocket, websocket } = createBunWebSocket();

export { websocket };

const FORWARD_EVENTS: RealtimeEvent[] = [
  "conversation.created",
  "conversation.updated",
  "conversation.read",
  "message.created",
  "notification.created",
  "presence.update",
  "typing.on",
  "typing.off",
];

interface Socket {
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
}

export const cableRoute = upgradeWebSocket(async (c) => {
  const url = new URL(c.req.url);
  const token =
    url.searchParams.get("token") ??
    c.req.header("Authorization")?.replace(/^Bearer\s+/, "") ??
    c.req.header("access-token") ??
    null;
  let userId: number | null = null;
  try {
    userId = token ? await verifyAccessToken(token) : null;
  } catch {
    userId = null;
  }
  if (!userId) {
    return {
      onOpen(_evt: unknown, ws: Socket) {
        ws.close(4401, "Unauthorized");
      },
    };
  }
  const authedUserId = userId;
  const rooms = new Set<number>();
  let unsubs: Array<() => void> = [];

  return {
    onOpen(_evt: unknown, ws: Socket) {
      ws.send(JSON.stringify({ type: "welcome" }));
      // Bridge bus in-process → socket (só contas assinadas via RoomChannel).
      unsubs = FORWARD_EVENTS.map((event) =>
        subscribe(event, (message) => {
          if (!rooms.has(message.accountId)) return;
          ws.send(
            JSON.stringify({
              identifier: JSON.stringify({
                channel: "RoomChannel",
                account_id: message.accountId,
              }),
              message: { event: message.event, data: message.data },
            }),
          );
        }),
      );
    },
    onMessage(evt: { data: unknown }, ws: Socket) {
      let payload: { command?: string; identifier?: string; data?: string };
      try {
        payload = JSON.parse(String(evt.data));
      } catch {
        return;
      }

      if (payload.command === "subscribe" && payload.identifier) {
        let parsed: { channel?: string; account_id?: number };
        try {
          parsed = JSON.parse(payload.identifier);
        } catch {
          ws.send(JSON.stringify({ type: "reject_subscription", identifier: payload.identifier }));
          return;
        }
        if (parsed.channel !== "RoomChannel" || typeof parsed.account_id !== "number") {
          ws.send(JSON.stringify({ type: "reject_subscription", identifier: payload.identifier }));
          return;
        }
        // Vínculo conta×usuário agora (403 cross-account fecha o socket).
        const accountId = parsed.account_id;
        const identifier = payload.identifier;
        void loadMembership(authedUserId, accountId).then((membership) => {
          if (!membership) {
            ws.close(4403, "No access to this account");
            return;
          }
          rooms.add(accountId);
          ws.send(JSON.stringify({ type: "confirm_subscription", identifier }));
        });
      } else if (payload.command === "unsubscribe" && payload.identifier) {
        ws.send(JSON.stringify({ type: "confirm_unsubscription", identifier: payload.identifier }));
      } else if (payload.command === "message" && payload.identifier && payload.data) {
        let parsed: {
          action?: string;
          account_id?: number;
          conversation_id?: number;
          status?: string;
        };
        try {
          parsed = JSON.parse(payload.data);
        } catch {
          return;
        }
        // typing do cliente → rebroadcast para a sala (só conta inscrita).
        if (
          (parsed.action === "typing_on" || parsed.action === "typing_off") &&
          parsed.account_id &&
          rooms.has(parsed.account_id)
        ) {
          publish(parsed.account_id, parsed.action === "typing_on" ? "typing.on" : "typing.off", {
            conversation_id: parsed.conversation_id,
            user_id: authedUserId,
          });
        }
        // heartbeat de presença (30s no front) → publica `presence.update`.
        if (parsed.action === "presence" && parsed.account_id && rooms.has(parsed.account_id)) {
          const status =
            parsed.status === "busy" || parsed.status === "offline" ? parsed.status : "online";
          touchPresence(parsed.account_id, authedUserId, status);
        }
      }
    },
    onClose() {
      for (const unsub of unsubs) unsub();
      unsubs = [];
      // Socket caiu → agente sai da lista de online de cada sala.
      for (const accountId of rooms) dropPresence(accountId, authedUserId);
    },
  };
});
