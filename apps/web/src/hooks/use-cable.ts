import { useEffect, useState } from "react";

/**
 * Stub M0 — conecta em `/cable` com backoff e expõe `{ connected }`.
 * O protocolo de eventos (conversation/message/presence) entra no M4.
 */
export function useCable(_accountId: number | string): { connected: boolean } {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const serverUrl =
      (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";
    const wsUrl = `${serverUrl.replace(/^http/, "ws")}/cable?token=demo-token`;

    function connect(): void {
      let socket: WebSocket;
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        schedule();
        return;
      }
      socket.onopen = () => {
        if (!cancelled) {
          retries = 0;
          setConnected(true);
        }
      };
      socket.onclose = () => {
        if (!cancelled) {
          setConnected(false);
          schedule();
        }
      };
      socket.onerror = () => {
        socket.close();
      };
    }

    function schedule(): void {
      retries += 1;
      const delay = Math.min(1000 * 2 ** retries, 15000);
      timer = setTimeout(() => {
        if (!cancelled) connect();
      }, delay);
    }

    connect();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return { connected };
}
