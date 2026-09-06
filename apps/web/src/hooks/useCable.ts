import { useEffect, useRef } from "react";

import { getAccessToken } from "@/lib/auth";

export interface CableEvent {
  event: string;
  data: Record<string, unknown> & { conversation_id?: number };
}

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";

function wsUrl(token: string): string {
  const base = SERVER_URL.replace(/^http/, "ws");
  return `${base}/cable?token=${encodeURIComponent(token)}`;
}

function roomIdentifier(accountId: number): string {
  return JSON.stringify({ channel: "RoomChannel", account_id: accountId });
}

/**
 * Assina o RoomChannel da conta, reconecta com backoff exponencial e
 * despacha `{event, data}` para `onEvent`. Igual ao `useCable` mental do
 * ActionCable: cada evento invalida queries TanStack no chamador.
 */
export function useCable(accountId: number | null, onEvent: (event: CableEvent) => void): void {
  const handler = useRef(onEvent);

  useEffect(() => {
    handler.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!accountId) return;
    let ws: WebSocket | null = null;
    let closed = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        ws = new WebSocket(wsUrl(token));
      } catch {
        schedule();
        return;
      }
      ws.onopen = () => {
        attempt = 0;
        activeSocket = ws;
        ws?.send(JSON.stringify({ command: "subscribe", identifier: roomIdentifier(accountId) }));
      };
      ws.onmessage = (evt) => {
        let payload: { type?: string; message?: CableEvent };
        try {
          payload = JSON.parse(String(evt.data));
        } catch {
          return;
        }
        if (payload.message?.event) {
          handler.current(payload.message);
        }
      };
      ws.onclose = () => {
        if (activeSocket === ws) activeSocket = null;
        if (!closed) schedule();
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    const schedule = () => {
      if (closed) return;
      attempt += 1;
      const delay = Math.min(1000 * 2 ** Math.min(attempt, 6), 30000);
      timer = setTimeout(connect, delay);
    };

    connect();
    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [accountId]);
}

/** Envia typing.on/off para a sala (rebroadcast pelo servidor). */
export function sendTyping(accountId: number, conversationId: number, on: boolean): void {
  const socket = activeSocket;
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(
    JSON.stringify({
      command: "message",
      identifier: roomIdentifier(accountId),
      data: JSON.stringify({
        action: on ? "typing_on" : "typing_off",
        account_id: accountId,
        conversation_id: conversationId,
      }),
    }),
  );
}
// Último socket aberto (para o typing bubble no ReplyBox).
let activeSocket: WebSocket | null = null;
