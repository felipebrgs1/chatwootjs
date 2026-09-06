export type RealtimeEvent =
  | "conversation.created"
  | "conversation.updated"
  | "conversation.read"
  | "message.created"
  | "notification.created"
  | "presence.update"
  | "typing.on"
  | "typing.off";

export interface RealtimeMessage {
  accountId: number;
  event: RealtimeEvent;
  data: unknown;
}

export type RealtimeHandler = (message: RealtimeMessage) => void;

/**
 * Barramento in-process. O adaptador WebSocket (`/cable`, M4) assina aqui
 * e repassa para os sockets; em dev sem WS, handlers de teste observam direto.
 */
class RealtimeBus {
  private handlers = new Map<RealtimeEvent, Set<RealtimeHandler>>();

  subscribe(event: RealtimeEvent, handler: RealtimeHandler): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => {
      set.delete(handler);
    };
  }

  unsubscribe(event: RealtimeEvent, handler: RealtimeHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  publish(accountId: number, event: RealtimeEvent, data: unknown): void {
    const message: RealtimeMessage = { accountId, event, data };
    this.handlers.get(event)?.forEach((handler) => {
      handler(message);
    });
  }
}

export const realtime = new RealtimeBus();

export function subscribe(event: RealtimeEvent, handler: RealtimeHandler): () => void {
  return realtime.subscribe(event, handler);
}

export function unsubscribe(event: RealtimeEvent, handler: RealtimeHandler): void {
  realtime.unsubscribe(event, handler);
}

export function publish(accountId: number, event: RealtimeEvent, data: unknown): void {
  realtime.publish(accountId, event, data);
}
