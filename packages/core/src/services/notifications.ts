/**
 * M11 — Notificações (sino), preferências por tipo e filtros salvos (views).
 * DDL Rails (D2): notification_settings guarda bitmasks email_flags/push_flags
 * (FlagShihTzu, bits 1-based na ordem de Notification::NOTIFICATION_TYPES);
 * notifications usa primary_actor (polimórfico); custom_filters usa filter_type.
 * O "mute" do sino (sem coluna no Rails) = bits de e-mail+push desligados
 * para o tipo (derivado, não armazenado).
 *
 * Referência: `notifications_controller.rb`, `notification_settings_controller.rb`,
 * `custom_filters_controller.rb` + `NotificationBell`/`CustomViews` do Vue.
 */
import {
  conversationParticipants,
  customFilters,
  db,
  mentions,
  notificationSettings,
  notifications,
  type Notification,
} from "@chatwootjs/db";
import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";

import { ForbiddenError, NotFoundError } from "../lib/errors.js";
import type { AuthCtx } from "../policies/index.js";
import { publish, subscribe } from "../realtime/index.js";
import type {
  CreateCustomFilterInput,
  NotificationTypeName,
  NotificationsQuery,
  UpdateCustomFilterInput,
} from "../schemas/notifications.js";
import { NOTIFICATION_TYPES } from "../schemas/notifications.js";

// Nossos 3 tipos mapeados nos ints do enum Rails (Notification::NOTIFICATION_TYPES).
// A API mantém os nomes v1; o banco carrega ints que o Rails interpreta.
export const NOTIFICATION_TYPE_TO_INT: Record<NotificationTypeName, number> = {
  assigned_conversation: 2, // conversation_assignment
  conversation_mention: 4, // conversation_mention
  participating_conversation_new_message: 5, // participating_conversation_new_message
};

const INT_TO_NOTIFICATION_TYPE: Record<number, NotificationTypeName> = {
  2: "assigned_conversation",
  4: "conversation_mention",
  5: "participating_conversation_new_message",
};

// Bits 1-based de email_flags/push_flags (ordem de NOTIFICATION_TYPES no Rails).
const TYPE_TO_BIT: Record<NotificationTypeName, number> = {
  assigned_conversation: 2,
  conversation_mention: 4,
  participating_conversation_new_message: 5,
};

function bitsToNames(bits: number | null): NotificationTypeName[] {
  const b = bits ?? 0;
  return (Object.keys(TYPE_TO_BIT) as NotificationTypeName[]).filter(
    (t) => (b & (1 << (TYPE_TO_BIT[t] - 1))) !== 0,
  );
}

function namesToBits(names: readonly string[] | undefined): number | undefined {
  if (!names) return undefined;
  let b = 0;
  for (const n of names) {
    const bit = TYPE_TO_BIT[n as NotificationTypeName];
    if (bit) b |= 1 << (bit - 1);
  }
  return b;
}

export interface ApiNotification {
  id: number;
  notification_type: NotificationTypeName;
  notificable_type: string | null;
  notificable_id: number | null;
  read_at: string | null;
  snoozed_until: string | null;
  created_at: string;
  conversation_id: number | null;
  actor_name: string | null;
}

function toApiNotification(
  row: Notification,
  extra: { conversation_id?: number | null; actor_name?: string | null } = {},
): ApiNotification {
  return {
    id: row.id,
    notification_type: INT_TO_NOTIFICATION_TYPE[row.notificationType] ?? "assigned_conversation",
    notificable_type: row.primaryActorType,
    notificable_id: row.primaryActorId,
    read_at: row.readAt?.toISOString() ?? null,
    snoozed_until: row.snoozedUntil?.toISOString() ?? null,
    created_at: row.createdAt?.toISOString() ?? "",
    conversation_id: extra.conversation_id ?? null,
    actor_name: extra.actor_name ?? null,
  };
}

// ---- Consulta ----

export async function listNotifications(
  accountId: number,
  userId: number,
  query: NotificationsQuery,
): Promise<{
  notifications: ApiNotification[];
  unread_count: number;
  meta: { page: number; total: number };
}> {
  const conditions = [eq(notifications.accountId, accountId), eq(notifications.userId, userId)];
  if (query.read === "false") conditions.push(isNull(notifications.readAt));
  if (query.read === "true") conditions.push(isNotNull(notifications.readAt));
  const where = and(...conditions);

  const totalRows = await db.select({ total: count() }).from(notifications).where(where);
  const total = totalRows[0]?.total ?? 0;
  const unreadRows = await db
    .select({ unread: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.accountId, accountId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    );
  const unread = unreadRows[0]?.unread ?? 0;

  const limit = 25;
  const offset = (query.page - 1) * limit;
  const rows = await db.query.notifications.findMany({
    where,
    orderBy: (n) => desc(n.createdAt),
    limit,
    offset,
  });
  const items = await Promise.all(
    rows.map(async (row) => {
      let conversationId: number | null = null;
      if (row.primaryActorType === "Conversation" && row.primaryActorId) {
        conversationId = row.primaryActorId;
      } else if (row.primaryActorType === "Message" && row.primaryActorId) {
        const msg = await db.query.messages.findFirst({
          where: (m) => eq(m.id, row.primaryActorId!),
          columns: { conversationId: true },
        });
        conversationId = msg?.conversationId ?? null;
      }
      return toApiNotification(row, { conversation_id: conversationId });
    }),
  );
  return { notifications: items, unread_count: unread, meta: { page: query.page, total } };
}

async function findOwned(accountId: number, userId: number, id: number): Promise<Notification> {
  const row = await db.query.notifications.findFirst({
    where: (n) => and(eq(n.id, id), eq(n.accountId, accountId), eq(n.userId, userId)),
  });
  if (!row) throw new NotFoundError("Notification not found");
  return row;
}

export async function markNotificationRead(
  accountId: number,
  userId: number,
  id: number,
): Promise<ApiNotification> {
  const row = await findOwned(accountId, userId, id);
  await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, row.id));
  return toApiNotification({ ...row, readAt: new Date() });
}

export async function markNotificationUnread(
  accountId: number,
  userId: number,
  id: number,
): Promise<ApiNotification> {
  const row = await findOwned(accountId, userId, id);
  await db.update(notifications).set({ readAt: null }).where(eq(notifications.id, row.id));
  return toApiNotification({ ...row, readAt: null });
}

export async function snoozeNotification(
  accountId: number,
  userId: number,
  id: number,
  until: string,
): Promise<ApiNotification> {
  const row = await findOwned(accountId, userId, id);
  const date = new Date(until);
  await db.update(notifications).set({ snoozedUntil: date }).where(eq(notifications.id, row.id));
  return toApiNotification({ ...row, snoozedUntil: date });
}

export async function markAllNotificationsRead(
  accountId: number,
  userId: number,
): Promise<{ updated: number }> {
  const rows = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.accountId, accountId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });
  return { updated: rows.length };
}

// ---- Preferências ----

export interface ApiNotificationSettings {
  email_flags: string[];
  push_flags: string[];
  muted_flags: string[];
}

export async function getNotificationSettings(
  accountId: number,
  userId: number,
): Promise<ApiNotificationSettings> {
  const row = await db.query.notificationSettings.findFirst({
    where: (s) => and(eq(s.accountId, accountId), eq(s.userId, userId)),
  });
  const email = bitsToNames(row?.emailFlags ?? null);
  const push = bitsToNames(row?.pushFlags ?? null);
  // Mutado = bits de e-mail E push desligados para o tipo.
  const muted = (Object.keys(TYPE_TO_BIT) as NotificationTypeName[]).filter(
    (t) => !email.includes(t) && !push.includes(t),
  );
  return { email_flags: email, push_flags: push, muted_flags: muted };
}

export async function updateNotificationSettings(
  accountId: number,
  userId: number,
  input: { email_flags?: string[]; push_flags?: string[]; muted_flags?: string[] },
): Promise<ApiNotificationSettings> {
  const valid = (flags: string[] | undefined): NotificationTypeName[] | undefined =>
    flags?.filter((f) => (NOTIFICATION_TYPES as readonly string[]).includes(f)) as
      | NotificationTypeName[]
      | undefined;
  const email = valid(input.email_flags);
  const push = valid(input.push_flags);
  const muted = new Set(valid(input.muted_flags) ?? []);
  // Base atual em bits para preservar tipos não mencionados no input.
  const current = await getNotificationSettings(accountId, userId);
  const emailSet = new Set(email ?? current.email_flags);
  const pushSet = new Set(push ?? current.push_flags);
  for (const t of Object.keys(TYPE_TO_BIT) as NotificationTypeName[]) {
    if (muted.has(t)) {
      emailSet.delete(t);
      pushSet.delete(t);
    }
  }
  // Linha nova começa com tudo ligado (comportamento v1); o patch abaixo aplica.
  const allOn = Object.keys(TYPE_TO_BIT) as NotificationTypeName[];
  const patch: Record<string, unknown> = {
    emailFlags: namesToBits(email || push || muted.size ? [...emailSet] : allOn) ?? 0,
    pushFlags: namesToBits(email || push || muted.size ? [...pushSet] : allOn) ?? 0,
    updatedAt: new Date(),
  };

  const existing = await db.query.notificationSettings.findFirst({
    where: (s) => and(eq(s.accountId, accountId), eq(s.userId, userId)),
  });
  if (existing) {
    await db
      .update(notificationSettings)
      .set(patch)
      .where(eq(notificationSettings.id, existing.id));
  } else {
    await db.insert(notificationSettings).values({
      accountId,
      userId,
      emailFlags: patch.emailFlags as number,
      pushFlags: patch.pushFlags as number,
    });
  }
  return getNotificationSettings(accountId, userId);
}

// ---- Emissão ----

export interface NotifyInput {
  accountId: number;
  userId: number;
  type: NotificationTypeName;
  notificableType: "Conversation" | "Message";
  notificableId: number;
  conversationId?: number;
  actorName?: string;
  secondaryActorType?: string;
  secondaryActorId?: number;
}

/**
 * Cria a notificação (a menos que o tipo esteja mutado) e publica
 * `notification.created`. Retorna null quando suprimida por preferência.
 */
export async function notify(input: NotifyInput): Promise<ApiNotification | null> {
  const settings = await getNotificationSettings(input.accountId, input.userId);
  if (settings.muted_flags.includes(input.type)) return null;
  if (input.type === "participating_conversation_new_message") {
    // Suprime se a conversa está mutada (Rails: contact.blocked).
    const conv = await db.query.conversations.findFirst({
      where: (c) =>
        and(
          eq(c.id, input.conversationId ?? input.notificableId),
          eq(c.accountId, input.accountId),
        ),
      columns: { contactId: true },
    });
    if (conv?.contactId) {
      const contact = await db.query.contacts.findFirst({
        where: (ct) => eq(ct.id, conv.contactId!),
        columns: { blocked: true },
      });
      if (contact?.blocked) return null;
    }
  }
  const [row] = await db
    .insert(notifications)
    .values({
      accountId: input.accountId,
      userId: input.userId,
      primaryActorType: input.notificableType,
      primaryActorId: input.notificableId,
      secondaryActorType: input.secondaryActorType ?? null,
      secondaryActorId: input.secondaryActorId ?? null,
      notificationType: NOTIFICATION_TYPE_TO_INT[input.type],
    })
    .returning();
  if (!row) return null;
  const api = toApiNotification(row, {
    conversation_id: input.conversationId ?? null,
    actor_name: input.actorName ?? null,
  });
  publish(input.accountId, "notification.created", { ...api, user_id: input.userId });
  return api;
}

/** `@nome` no corpo → ids dos agentes da conta mencionados (puro, testável). */
export function extractMentionTokens(content: string): string[] {
  const tokens = new Set<string>();
  for (const m of content.matchAll(/(^|\s)@([\p{L}\p{N}._-]+)/gu)) {
    const token = m[2]?.toLowerCase();
    if (token) tokens.add(token);
  }
  return [...tokens];
}

/** Resolve menções contra agentes da conta + grava `mentions` + notifica. */
export async function processMentions(
  accountId: number,
  conversationId: number,
  messageId: number,
  authorId: number,
  content: string,
): Promise<number[]> {
  const tokens = extractMentionTokens(content);
  if (tokens.length === 0) return [];
  const memberships = await db.query.accountUsers.findMany({
    where: (au) => eq(au.accountId, accountId),
    columns: { userId: true },
  });
  const ids = memberships
    .map((m) => m.userId)
    .filter((id): id is number => id != null && id !== authorId);
  if (ids.length === 0) return [];
  const agents = await db.query.users.findMany({
    where: (u, { inArray }) => inArray(u.id, ids),
    columns: { id: true, name: true, email: true },
  });
  const mentioned: number[] = [];
  for (const agent of agents) {
    const haystack = `${agent.name ?? ""} ${(agent.email ?? "").split("@")[0]}`.toLowerCase();
    if (!tokens.some((t) => haystack.includes(t))) continue;
    await db
      .insert(mentions)
      .values({
        accountId,
        userId: agent.id,
        conversationId,
        mentionedAt: new Date(),
      })
      .onConflictDoNothing();
    await notify({
      accountId,
      userId: agent.id,
      type: "conversation_mention",
      notificableType: "Message",
      notificableId: messageId,
      conversationId,
    });
    mentioned.push(agent.id);
  }
  return mentioned;
}

/**
 * Emissores automáticos (boot do server): nova mensagem incoming numa
 * conversa participada/assignada → `participating_conversation_new_message`
 * para participantes + assignee (menos o autor, se for agente).
 */
export function registerNotificationEmitters(): void {
  const g = globalThis as Record<string, unknown>;
  if (g.__cw_notifications_registered) return;
  g.__cw_notifications_registered = true;

  subscribe("message.created", ({ accountId, data }) => {
    void (async () => {
      try {
        const msg = data as {
          id?: number;
          message_type?: string;
          conversation_id?: number;
          sender?: { id?: number; type?: string } | null;
        };
        if (msg.message_type !== "incoming" || !msg.conversation_id || !msg.id) return;
        const conv = await db.query.conversations.findFirst({
          where: (c) => and(eq(c.id, msg.conversation_id!), eq(c.accountId, accountId)),
          columns: { id: true, assigneeId: true },
        });
        if (!conv) return;
        const parts = await db
          .select({ userId: conversationParticipants.userId })
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, conv.id));
        const targets = new Set<number>(parts.map((p) => p.userId));
        if (conv.assigneeId) targets.add(conv.assigneeId);
        // Autor agente não se notifica.
        if (msg.sender?.type === "User" && msg.sender.id) targets.delete(msg.sender.id);
        for (const userId of targets) {
          await notify({
            accountId,
            userId,
            type: "participating_conversation_new_message",
            notificableType: "Message",
            notificableId: msg.id,
            conversationId: conv.id,
          });
        }
      } catch (err) {
        console.error("[notifications] emitter", err);
      }
    })();
  });
}

// ---- Filtros salvos (views) ----

export interface ApiCustomFilter {
  id: number;
  name: string;
  model_type: string;
  query: Record<string, unknown>;
  visibility: number;
}

const FILTER_TYPE_TO_MODEL = ["conversation", "contact", "report"] as const;

function toApiCustomFilter(row: typeof customFilters.$inferSelect): ApiCustomFilter {
  return {
    id: row.id,
    name: row.name ?? "",
    model_type: FILTER_TYPE_TO_MODEL[row.filterType ?? 0] ?? "conversation",
    query: (row.query ?? {}) as Record<string, unknown>,
    visibility: 0,
  };
}

export async function listCustomFilters(
  accountId: number,
  userId: number,
): Promise<ApiCustomFilter[]> {
  const rows = await db.query.customFilters.findMany({
    where: (f) => and(eq(f.accountId, accountId), eq(f.filterType, 0)),
    orderBy: (f) => desc(f.createdAt),
  });
  // Rails: filtros são pessoais (dono ou admin).
  return rows.filter((r) => r.userId === userId || r.userId == null).map(toApiCustomFilter);
}

export async function createCustomFilter(
  accountId: number,
  userId: number,
  input: CreateCustomFilterInput,
): Promise<ApiCustomFilter> {
  const [row] = await db
    .insert(customFilters)
    .values({
      accountId,
      userId,
      name: input.name,
      filterType: 0,
      query: input.query as Record<string, unknown>,
    })
    .returning();
  if (!row) throw new Error("Could not create filter");
  return toApiCustomFilter(row);
}

export async function updateCustomFilter(
  accountId: number,
  auth: AuthCtx,
  id: number,
  input: UpdateCustomFilterInput,
): Promise<ApiCustomFilter> {
  const row = await db.query.customFilters.findFirst({
    where: (f) => and(eq(f.id, id), eq(f.accountId, accountId)),
  });
  if (!row) throw new NotFoundError("Filter not found");
  if (row.userId !== auth.userId && auth.role !== "administrator") {
    throw new ForbiddenError("Only the owner or an admin can edit this view");
  }
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.query !== undefined) patch.query = input.query;
  await db.update(customFilters).set(patch).where(eq(customFilters.id, id));
  const fresh = await db.query.customFilters.findFirst({ where: (f) => eq(f.id, id) });
  if (!fresh) throw new NotFoundError("Filter not found");
  return toApiCustomFilter(fresh);
}

export async function deleteCustomFilter(
  accountId: number,
  auth: AuthCtx,
  id: number,
): Promise<void> {
  const row = await db.query.customFilters.findFirst({
    where: (f) => and(eq(f.id, id), eq(f.accountId, accountId)),
  });
  if (!row) throw new NotFoundError("Filter not found");
  if (row.userId !== auth.userId && auth.role !== "administrator") {
    throw new ForbiddenError("Only the owner or an admin can delete this view");
  }
  await db.delete(customFilters).where(eq(customFilters.id, id));
}
