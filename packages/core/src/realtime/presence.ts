/**
 * M10.5? Não — M11. Presença efêmera dos agentes (quem está online).
 *
 * Estado vive em memória no processo do server (sem tabela): `accountId →
 * userId → {status, lastSeen}`. Com N≥2 réplicas, plugar o adapter Redis
 * pub/sub no mesmo `REDIS_URL` do realtime (mesma nota do `cable.ts`).
 * Entradas somem sozinhas após 90s sem heartbeat (lazy prune na leitura).
 */
import { publish } from "../realtime/index.js";

export type PresenceStatus = "online" | "busy" | "offline";

export interface PresenceEntry {
  user_id: number;
  account_id: number;
  status: PresenceStatus;
  last_seen_at: number;
}

const HEARTBEAT_TTL_MS = 90_000;
const store = new Map<number, Map<number, { status: PresenceStatus; lastSeen: number }>>();

/** Heartbeat (cable `presence` ou POST): atualiza e publica `presence.update`. */
export function touchPresence(
  accountId: number,
  userId: number,
  status: PresenceStatus = "online",
): PresenceEntry {
  let room = store.get(accountId);
  if (!room) {
    room = new Map();
    store.set(accountId, room);
  }
  const entry = { status, lastSeen: Date.now() };
  room.set(userId, entry);
  const out: PresenceEntry = {
    user_id: userId,
    account_id: accountId,
    status,
    last_seen_at: entry.lastSeen,
  };
  publish(accountId, "presence.update", out);
  return out;
}

/** Saída explícita (socket fechou, logout): publica `offline`. */
export function dropPresence(accountId: number, userId: number): void {
  const room = store.get(accountId);
  if (!room?.has(userId)) return;
  room.delete(userId);
  publish(accountId, "presence.update", {
    user_id: userId,
    account_id: accountId,
    status: "offline",
    last_seen_at: Date.now(),
  } satisfies PresenceEntry);
}

/** Lista quem está online (com prune lazy de heartbeats vencidos). */
export function listPresence(accountId: number): PresenceEntry[] {
  const room = store.get(accountId);
  if (!room) return [];
  const now = Date.now();
  const out: PresenceEntry[] = [];
  for (const [userId, entry] of room) {
    if (now - entry.lastSeen > HEARTBEAT_TTL_MS) {
      room.delete(userId);
      continue;
    }
    out.push({
      user_id: userId,
      account_id: accountId,
      status: entry.status,
      last_seen_at: entry.lastSeen,
    });
  }
  return out;
}

/** Para testes. */
export function clearPresence(): void {
  store.clear();
}
