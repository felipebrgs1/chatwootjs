import {
  contacts,
  conversationParticipants,
  conversations,
  db,
  labels,
  messages,
  taggings,
  users,
  type Conversation,
} from "@chatwootjs/db";
import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { publish } from "../realtime/index.js";
import { logAudit } from "./audit.js";
import type { AuthCtx } from "../policies/index.js";
import {
  PRIORITY_FROM_INT,
  PRIORITY_TO_INT,
  STATUS_FROM_INT,
  STATUS_TO_INT,
} from "../schemas/conversations.js";
import type { ConversationQuery } from "../schemas/conversations.js";

// ---- Mappers ----

export interface ApiMessagePreview {
  id: number;
  content: string | null;
  message_type: string;
  private: boolean;
  sender_name: string | null;
  created_at: string;
}

export interface ApiConversationItem {
  id: number;
  display_id: number;
  uuid: string;
  status: string;
  priority: string | null;
  inbox_id: number;
  inbox_name: string | null;
  channel_type: string | null;
  contact_id: number | null;
  assignee_id: number | null;
  assignee_name: string | null;
  team_id: number | null;
  snoozed_until: number | null;
  waiting_since: number | null;
  unread_count: number;
  muted: boolean;
  labels: string[];
  last_activity_at: number;
  first_reply_created_at: number | null;
  meta: {
    sender: { id: number | null; name: string; thumbnail: string | null; type: string };
    assignee: { id: number | null; name: string } | null;
  };
  messages: ApiMessagePreview[];
}

export interface ApiConversationDetail extends ApiConversationItem {
  contact: {
    id: number;
    name: string;
    email: string | null;
    phone_number: string | null;
    additional_attributes: Record<string, unknown>;
    custom_attributes: Record<string, unknown>;
  } | null;
  participants: Array<{ id: number; name: string; email: string }>;
}

function toEpoch(date: Date | null | undefined): number | null {
  return date ? Math.floor(date.getTime() / 1000) : null;
}

async function labelsFor(conversationId: number): Promise<string[]> {
  const rows = await db
    .select({ title: labels.title })
    .from(taggings)
    .innerJoin(labels, eq(labels.id, taggings.tagId))
    .where(
      and(
        eq(taggings.taggableType, "Conversation"),
        eq(taggings.taggableId, conversationId),
        eq(taggings.context, "labels"),
      ),
    );
  return rows.map((r) => r.title ?? "").filter(Boolean);
}

export async function toApiConversationItem(row: Conversation): Promise<ApiConversationItem> {
  const [inbox, contact, assignee] = await Promise.all([
    row.inboxId ? db.query.inboxes.findFirst({ where: (i) => eq(i.id, row.inboxId) }) : null,
    row.contactId
      ? db.query.contacts.findFirst({ where: (ct) => eq(ct.id, row.contactId!) })
      : null,
    row.assigneeId ? db.query.users.findFirst({ where: (u) => eq(u.id, row.assigneeId!) }) : null,
  ]);

  const lastMessages = await db.query.messages.findMany({
    where: (m) => eq(m.conversationId, row.id),
    orderBy: (m) => desc(m.createdAt),
    limit: 1,
  });

  const labelsList = await labelsFor(row.id);

  return {
    id: row.id,
    display_id: row.displayId,
    uuid: row.uuid,
    status: STATUS_FROM_INT[row.status] ?? "open",
    priority: row.priority == null ? null : (PRIORITY_FROM_INT[row.priority] ?? null),
    inbox_id: row.inboxId,
    inbox_name: inbox?.name ?? null,
    channel_type: inbox?.channelType ?? null,
    contact_id: row.contactId,
    assignee_id: row.assigneeId,
    assignee_name: assignee?.name ?? null,
    team_id: row.teamId,
    snoozed_until: toEpoch(row.snoozedUntil),
    waiting_since: toEpoch(row.waitingSince),
    unread_count: row.unreadIncomingMessagesCount,
    muted: row.muted,
    labels: labelsList,
    last_activity_at: Math.floor(row.lastActivityAt.getTime() / 1000),
    first_reply_created_at: toEpoch(row.firstReplyCreatedAt),
    meta: {
      sender: {
        id: contact?.id ?? null,
        name: contact?.name || "Contato",
        thumbnail: null,
        type: "contact",
      },
      assignee: assignee ? { id: assignee.id, name: assignee.name } : null,
    },
    messages: lastMessages.map((m) => ({
      id: m.id,
      content: m.content,
      message_type: ["incoming", "outgoing", "activity", "template"][m.messageType] ?? "incoming",
      private: m.private,
      sender_name: null,
      created_at: m.createdAt.toISOString(),
    })),
  };
}

export async function toApiConversationDetail(row: Conversation): Promise<ApiConversationDetail> {
  const item = await toApiConversationItem(row);
  const contact = row.contactId
    ? await db.query.contacts.findFirst({ where: (ct) => eq(ct.id, row.contactId!) })
    : null;
  const participants = await db
    .select({ user: users })
    .from(conversationParticipants)
    .innerJoin(users, eq(users.id, conversationParticipants.userId))
    .where(eq(conversationParticipants.conversationId, row.id));
  return {
    ...item,
    contact: contact
      ? {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone_number: contact.phoneNumber,
          additional_attributes: contact.additionalAttributes ?? {},
          custom_attributes: contact.customAttributes ?? {},
        }
      : null,
    participants: participants.map((p) => ({
      id: p.user.id,
      name: p.user.name,
      email: p.user.email,
    })),
  };
}

// ---- Visibilidade ----

/** Inboxes visíveis: admin → todas; agente → só membro. */
export async function visibleInboxIds(accountId: number, auth: AuthCtx): Promise<number[]> {
  if (auth.role === "administrator") {
    const rows = await db.query.inboxes.findMany({
      where: (i) => eq(i.accountId, accountId),
      columns: { id: true },
    });
    return rows.map((r) => r.id);
  }
  const memberships = await db.query.inboxMembers.findMany({
    where: (im) => eq(im.userId, auth.userId),
    columns: { inboxId: true },
  });
  return memberships.map((m) => m.inboxId);
}

export async function findConversation(accountId: number, id: number): Promise<Conversation> {
  const row = await db.query.conversations.findFirst({
    where: (c) => and(eq(c.accountId, accountId), eq(c.id, id)),
  });
  if (!row) throw new NotFoundError("Conversation not found");
  return row;
}

/** Assert: conversa existe + inbox visível para o agente. */
export async function assertConversationAccess(
  accountId: number,
  id: number,
  auth: AuthCtx,
): Promise<Conversation> {
  const row = await findConversation(accountId, id);
  if (auth.role !== "administrator") {
    const member = await db.query.inboxMembers.findFirst({
      where: (im) => and(eq(im.inboxId, row.inboxId), eq(im.userId, auth.userId)),
    });
    if (!member) throw new NotFoundError("Conversation not found");
  }
  return row;
}

// ---- Lista ----

export interface ConversationListResult {
  data: ApiConversationItem[];
  meta: {
    mine_count: number;
    unassigned_count: number;
    all_count: number;
    total_count: number;
    current_page: number;
  };
}

const PER_PAGE = 25;

export async function listConversations(
  accountId: number,
  auth: AuthCtx,
  query: ConversationQuery,
): Promise<ConversationListResult> {
  const inboxIds = await visibleInboxIds(accountId, auth);
  if (inboxIds.length === 0) {
    return {
      data: [],
      meta: { mine_count: 0, unassigned_count: 0, all_count: 0, total_count: 0, current_page: 1 },
    };
  }

  const statusFilter = query.status === "all" ? undefined : (STATUS_TO_INT[query.status] ?? 0);
  const statusInt = statusFilter ?? 0;
  const base = [eq(conversations.accountId, accountId), inArray(conversations.inboxId, inboxIds)];

  const filters =
    statusFilter === undefined ? [...base] : [...base, eq(conversations.status, statusFilter)];

  if (query.assignee_type === "me") {
    filters.push(eq(conversations.assigneeId, auth.userId));
  } else if (query.assignee_type === "unassigned") {
    filters.push(isNull(conversations.assigneeId));
  }
  if (query.assignee_id) filters.push(eq(conversations.assigneeId, query.assignee_id));
  if (query.inbox_id) filters.push(eq(conversations.inboxId, query.inbox_id));
  if (query.team_id !== undefined) {
    filters.push(
      query.team_id === 0 ? isNull(conversations.teamId) : eq(conversations.teamId, query.team_id),
    );
  }
  if (query.labels && query.labels.length > 0) {
    const tagged = await db
      .select({ taggableId: taggings.taggableId })
      .from(taggings)
      .innerJoin(labels, eq(labels.id, taggings.tagId))
      .where(
        and(
          eq(taggings.accountId, accountId),
          eq(taggings.taggableType, "Conversation"),
          eq(taggings.context, "labels"),
          inArray(labels.title, query.labels),
        ),
      );
    const ids = tagged.map((t) => t.taggableId);
    if (ids.length === 0) {
      return {
        data: [],
        meta: { mine_count: 0, unassigned_count: 0, all_count: 0, total_count: 0, current_page: 1 },
      };
    }
    filters.push(inArray(conversations.id, ids));
  }
  if (query.q) {
    const pattern = `%${query.q}%`;
    const matchingContacts = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(
        and(
          eq(contacts.accountId, accountId),
          or(
            ilike(contacts.name, pattern),
            ilike(contacts.email, pattern),
            ilike(contacts.phoneNumber, pattern),
            ilike(contacts.identifier, pattern),
          ),
        ),
      )
      .limit(200);
    const matchingMessages = await db
      .select({ id: messages.conversationId })
      .from(messages)
      .where(and(eq(messages.accountId, accountId), ilike(messages.content, pattern)))
      .limit(200);
    const ids = new Set([
      ...matchingContacts.map((c) => c.id),
      ...matchingMessages.flatMap((m) => (m.id != null ? [m.id] : [])),
    ]);
    if (ids.size === 0) {
      return {
        data: [],
        meta: { mine_count: 0, unassigned_count: 0, all_count: 0, total_count: 0, current_page: 1 },
      };
    }
    filters.push(
      or(inArray(conversations.contactId, [...ids]), inArray(conversations.id, [...ids]))!,
    );
  }

  const where = and(...filters);

  // Contadores por assignee (respeitando o status filtrado).
  const countBase =
    statusFilter === undefined ? [...base] : [...base, eq(conversations.status, statusInt)];
  const countWhere = (extra?: ReturnType<typeof eq>) =>
    countRows([...countBase, ...(extra ? [extra] : [])]);

  const [mineCount, unassignedCount, allCount, total] = await Promise.all([
    countWhere(eq(conversations.assigneeId, auth.userId)),
    countWhere(isNull(conversations.assigneeId)),
    countWhere(),
    countRows(filters),
  ]);

  const orderBy =
    query.sort_by === "created_at_asc"
      ? asc(conversations.createdAt)
      : query.sort_by === "priority"
        ? [desc(conversations.priority), desc(conversations.lastActivityAt)]
        : query.sort_by === "waiting_since"
          ? asc(conversations.waitingSince)
          : desc(conversations.lastActivityAt);

  const rows = await db
    .select()
    .from(conversations)
    .where(where)
    .orderBy(...(Array.isArray(orderBy) ? orderBy : [orderBy]))
    .limit(PER_PAGE)
    .offset((query.page - 1) * PER_PAGE);

  return {
    data: await Promise.all(rows.map(toApiConversationItem)),
    meta: {
      mine_count: mineCount,
      unassigned_count: unassignedCount,
      all_count: allCount,
      total_count: total,
      current_page: query.page,
    },
  };
}

async function countRows(conditions: ReturnType<typeof and | typeof eq>[]): Promise<number> {
  const [agg] = await db
    .select({ value: count() })
    .from(conversations)
    .where(and(...conditions.filter(Boolean)));
  return Number(agg?.value ?? 0);
}

// ---- Activity messages ----

export async function createActivityMessage(
  conv: Conversation,
  content: string,
  senderId?: number,
): Promise<void> {
  await db.insert(messages).values({
    accountId: conv.accountId,
    inboxId: conv.inboxId,
    conversationId: conv.id,
    messageType: 2,
    private: true,
    status: 0,
    content,
    contentType: 0,
    senderType: senderId ? "User" : null,
    senderId: senderId ?? null,
  });
}

async function actorName(userId: number): Promise<string> {
  const row = await db.query.users.findFirst({
    where: (u) => eq(u.id, userId),
    columns: { name: true },
  });
  return row?.name ?? "Agente";
}

// ---- Mutações ----

export async function getConversation(
  accountId: number,
  id: number,
  auth: AuthCtx,
): Promise<ApiConversationDetail> {
  const row = await assertConversationAccess(accountId, id, auth);
  return toApiConversationDetail(row);
}

export async function createConversation(
  accountId: number,
  auth: AuthCtx,
  input: { inbox_id: number; contact_id: number; status?: string; message?: { content: string } },
): Promise<ApiConversationDetail> {
  const inbox = await db.query.inboxes.findFirst({
    where: (i) => and(eq(i.accountId, accountId), eq(i.id, input.inbox_id)),
  });
  if (!inbox) throw new NotFoundError("Inbox not found");
  if (auth.role !== "administrator") {
    const member = await db.query.inboxMembers.findFirst({
      where: (im) => and(eq(im.inboxId, input.inbox_id), eq(im.userId, auth.userId)),
    });
    if (!member) throw new NotFoundError("Inbox not found");
  }
  const contact = await db.query.contacts.findFirst({
    where: (ct) => and(eq(ct.accountId, accountId), eq(ct.id, input.contact_id)),
  });
  if (!contact) throw new NotFoundError("Contact not found");

  const contactInbox = await db.query.contactInboxes.findFirst({
    where: (ci) => and(eq(ci.contactId, contact.id), eq(ci.inboxId, inbox.id)),
  });

  const displayId =
    (await db
      .select({ max: sql<number | null>`max(${conversations.displayId})` })
      .from(conversations)
      .where(eq(conversations.accountId, accountId))
      .then((r) => r[0]?.max ?? 0)) + 1;

  const [row] = await db
    .insert(conversations)
    .values({
      accountId,
      inboxId: inbox.id,
      contactId: contact.id,
      contactInboxId: contactInbox?.id ?? null,
      displayId,
      uuid: crypto.randomUUID(),
      status: input.status ? (STATUS_TO_INT[input.status] ?? 0) : 0,
      assigneeId: auth.userId,
      lastActivityAt: new Date(),
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create conversation");

  if (input.message?.content) {
    const [created] = await db
      .insert(messages)
      .values({
        accountId,
        inboxId: inbox.id,
        conversationId: row.id,
        messageType: 1,
        private: false,
        status: 0,
        content: input.message.content,
        senderType: "User",
        senderId: auth.userId,
      })
      .returning();
    await db
      .update(conversations)
      .set({ firstReplyCreatedAt: new Date(), updatedAt: new Date() })
      .where(eq(conversations.id, row.id));
    // Publica como qualquer mensagem (realtime, automações, relatórios).
    if (created) {
      const { toApiMessage } = await import("./messages.js");
      publish(accountId, "message.created", {
        ...(await toApiMessage(created)),
        conversation_id: row.id,
      });
    }
  }

  const fresh = await findConversation(accountId, row.id);
  publish(accountId, "conversation.created", await toApiConversationItem(fresh));
  return toApiConversationDetail(fresh);
}

export async function toggleConversationStatus(
  accountId: number,
  id: number,
  auth: AuthCtx,
  status: string,
  snoozedUntil?: number,
): Promise<ApiConversationDetail> {
  const row = await assertConversationAccess(accountId, id, auth);
  const statusInt = STATUS_TO_INT[status];
  if (statusInt === undefined) throw new UnprocessableError("Invalid status");
  if (status === "snoozed" && !snoozedUntil) {
    throw new UnprocessableError("snoozed_until is required", {
      snoozed_until: ["é obrigatório para snooze"],
    });
  }

  await db
    .update(conversations)
    .set({
      status: statusInt,
      snoozedUntil: status === "snoozed" && snoozedUntil ? new Date(snoozedUntil * 1000) : null,
      statusChangedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, row.id));

  const name = await actorName(auth.userId);
  const label =
    status === "snoozed"
      ? `Conversation was snoozed by ${name}`
      : status === "resolved"
        ? `Conversation was marked resolved by ${name}`
        : status === "pending"
          ? `Conversation was marked pending by ${name}`
          : `Conversation was reopened by ${name}`;
  await createActivityMessage(row, label, auth.userId);

  const fresh = await findConversation(accountId, row.id);
  publish(accountId, "conversation.updated", await toApiConversationItem(fresh));
  void logAudit(accountId, auth.userId, "update", "Conversation", row.id, { status });
  return toApiConversationDetail(fresh);
}

export async function assignConversation(
  accountId: number,
  id: number,
  auth: AuthCtx,
  assigneeId: number,
): Promise<ApiConversationDetail> {
  const row = await assertConversationAccess(accountId, id, auth);
  let assignee: { id: number; name: string } | null = null;
  if (assigneeId !== 0) {
    const user = await db.query.users.findFirst({ where: (u) => eq(u.id, assigneeId) });
    if (!user) throw new NotFoundError("Agent not found");
    const membership = await db.query.accountUsers.findFirst({
      where: (au) => and(eq(au.userId, assigneeId), eq(au.accountId, accountId)),
    });
    if (!membership) throw new NotFoundError("Agent not found");
    assignee = { id: user.id, name: user.name };
  }
  await db
    .update(conversations)
    .set({ assigneeId: assignee?.id ?? null, updatedAt: new Date() })
    .where(eq(conversations.id, row.id));

  const name = await actorName(auth.userId);
  await createActivityMessage(
    row,
    assignee
      ? `Conversation was assigned to ${assignee.name} by ${name}`
      : `Conversation was unassigned by ${name}`,
    auth.userId,
  );

  const fresh = await findConversation(accountId, row.id);
  publish(accountId, "conversation.updated", await toApiConversationItem(fresh));
  // M11: assign gera notificação realtime (menos auto-assign pelo próprio).
  if (assignee && assignee.id !== auth.userId) {
    const { notify } = await import("./notifications.js");
    await notify({
      accountId,
      userId: assignee.id,
      type: "assigned_conversation",
      notificableType: "Conversation",
      notificableId: row.id,
      conversationId: row.id,
      actorName: name,
    });
  }
  void logAudit(accountId, auth.userId, "update", "Conversation", row.id, {
    assignee_id: assignee?.id ?? null,
  });
  return toApiConversationDetail(fresh);
}

export async function setConversationTeam(
  accountId: number,
  id: number,
  auth: AuthCtx,
  teamId: number | null,
): Promise<ApiConversationDetail> {
  const row = await assertConversationAccess(accountId, id, auth);
  await db
    .update(conversations)
    .set({ teamId, updatedAt: new Date() })
    .where(eq(conversations.id, row.id));
  const fresh = await findConversation(accountId, row.id);
  publish(accountId, "conversation.updated", await toApiConversationItem(fresh));
  void logAudit(accountId, auth.userId, "update", "Conversation", row.id, { team_id: teamId });
  return toApiConversationDetail(fresh);
}

export async function setConversationPriority(
  accountId: number,
  id: number,
  auth: AuthCtx,
  priority: string,
): Promise<ApiConversationDetail> {
  const row = await assertConversationAccess(accountId, id, auth);
  const priorityInt = PRIORITY_TO_INT[priority];
  if (priorityInt === undefined) throw new UnprocessableError("Invalid priority");
  await db
    .update(conversations)
    .set({ priority: priority === "none" ? null : priorityInt, updatedAt: new Date() })
    .where(eq(conversations.id, row.id));
  const fresh = await findConversation(accountId, row.id);
  publish(accountId, "conversation.updated", await toApiConversationItem(fresh));
  void logAudit(accountId, auth.userId, "update", "Conversation", row.id, { priority });
  return toApiConversationDetail(fresh);
}

export async function setConversationLabels(
  accountId: number,
  id: number,
  auth: AuthCtx,
  titles: string[],
): Promise<string[]> {
  const row = await assertConversationAccess(accountId, id, auth);
  // Garante que as labels existam na conta (Rails cria via tag_list).
  const existing = await db.query.labels.findMany({
    where: (l) => eq(l.accountId, accountId),
  });
  const byTitle = new Map(existing.map((l) => [l.title, l]));
  const normalized = [...new Set(titles.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  const labelIds: number[] = [];
  for (const title of normalized) {
    let label = byTitle.get(title);
    if (!label) {
      const [created] = await db.insert(labels).values({ accountId, title }).returning();
      if (!created) continue;
      label = created;
    }
    labelIds.push(label.id);
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(taggings)
      .where(and(eq(taggings.taggableType, "Conversation"), eq(taggings.taggableId, row.id)));
    if (labelIds.length > 0) {
      await tx.insert(taggings).values(
        labelIds.map((tagId) => ({
          tagId,
          taggableType: "Conversation",
          taggableId: row.id,
          accountId,
          context: "labels",
        })),
      );
    }
    await tx
      .update(conversations)
      .set({ cachedLabelList: normalized.join(", "), updatedAt: new Date() })
      .where(eq(conversations.id, row.id));
  });

  const fresh = await findConversation(accountId, row.id);
  publish(accountId, "conversation.updated", await toApiConversationItem(fresh));
  void logAudit(accountId, auth.userId, "update", "Conversation", row.id, { labels: normalized });
  return normalized;
}

export async function muteConversation(
  accountId: number,
  id: number,
  auth: AuthCtx,
  muted: boolean,
): Promise<void> {
  const row = await assertConversationAccess(accountId, id, auth);
  await db
    .update(conversations)
    .set({ muted, updatedAt: new Date() })
    .where(eq(conversations.id, row.id));
}

export async function markConversationRead(
  accountId: number,
  id: number,
  auth: AuthCtx,
): Promise<void> {
  const row = await assertConversationAccess(accountId, id, auth);
  await db
    .update(conversations)
    .set({
      unreadIncomingMessagesCount: 0,
      agentLastSeenAt: new Date(),
      assigneeLastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, row.id));
  publish(accountId, "conversation.read", { id: row.id });
}

/** Reabre conversas cujo snooze expirou (job de 60s, in-process). */
export function registerSnoozeJob(): void {
  if (globalThis.__cw4_snooze_registered) return;
  globalThis.__cw4_snooze_registered = true;
  const tick = async () => {
    try {
      const expired = await db.query.conversations.findMany({
        where: and(
          eq(conversations.status, STATUS_TO_INT.snoozed ?? 3),
          sql<boolean>`${conversations.snoozedUntil} < now()`,
        ),
        limit: 50,
      });
      for (const conv of expired) {
        await db
          .update(conversations)
          .set({ status: STATUS_TO_INT.open, snoozedUntil: null, updatedAt: new Date() })
          .where(eq(conversations.id, conv.id));
        await createActivityMessage(conv, "Conversation was reopened (snooze expired)");
        const fresh = await findConversation(conv.accountId, conv.id);
        publish(conv.accountId, "conversation.updated", await toApiConversationItem(fresh));
      }
    } catch (err) {
      console.error("[snooze]", err);
    }
  };
  setInterval(() => void tick(), 60_000);
  void tick();
}

declare global {
  // eslint-disable-next-line no-var
  var __cw4_snooze_registered: boolean | undefined;
}

export { PRIORITY_FROM_INT, STATUS_FROM_INT };
