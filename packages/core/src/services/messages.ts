import {
  attachments,
  conversationParticipants,
  conversations,
  db,
  messages,
  users,
  type Message,
} from "@chatwootjs/db";
import { and, asc, desc, eq, gt, inArray } from "drizzle-orm";

import { ForbiddenError, NotFoundError, UnprocessableError } from "../lib/errors.js";
import { publish } from "../realtime/index.js";
import { storage } from "../lib/storage.js";
import type { AuthCtx } from "../policies/index.js";
import type { CreateMessageInput } from "../schemas/messages.js";
import { MESSAGE_TYPE_FROM_INT, guessFileType } from "../schemas/messages.js";
import {
  assertConversationAccess,
  findConversation,
  toApiConversationItem,
} from "./conversations.js";

// ---- Mappers ----

export interface ApiAttachment {
  id: number;
  file_type: string;
  external_url: string | null;
  extension: string | null;
  fallback_title: string | null;
  meta: Record<string, unknown>;
}

export interface ApiMessage {
  id: number;
  content: string | null;
  message_type: string;
  private: boolean;
  content_type: string;
  content_attributes: Record<string, unknown>;
  status: string;
  sender: { id: number | null; name: string | null; type: string | null } | null;
  attachments: ApiAttachment[];
  created_at: number;
  echo_id?: string | number;
}

const FILE_TYPE_FROM_INT = ["image", "audio", "video", "file"] as const;
const STATUS_FROM_INT = ["sent", "delivered", "read", "failed"] as const;

async function senderName(
  senderType: string | null,
  senderId: number | null,
): Promise<string | null> {
  if (!senderType || !senderId) return null;
  if (senderType === "User") {
    const row = await db.query.users.findFirst({
      where: (u) => eq(u.id, senderId),
      columns: { name: true },
    });
    return row?.name ?? null;
  }
  const row = await db.query.contacts.findFirst({
    where: (ct) => eq(ct.id, senderId),
    columns: { name: true },
  });
  return row?.name ?? null;
}

export async function toApiMessage(row: Message): Promise<ApiMessage> {
  const atts = await db.query.attachments.findMany({
    where: (a) => eq(a.messageId, row.id),
  });
  return {
    id: row.id,
    content: row.content,
    message_type: MESSAGE_TYPE_FROM_INT[row.messageType] ?? "incoming",
    private: row.private,
    content_type: "text",
    content_attributes: row.contentAttributes ?? {},
    status: STATUS_FROM_INT[row.status] ?? "sent",
    sender: row.senderType
      ? {
          id: row.senderId,
          name: await senderName(row.senderType, row.senderId),
          type: row.senderType,
        }
      : null,
    attachments: atts.map((a) => ({
      id: a.id,
      file_type: FILE_TYPE_FROM_INT[a.fileType] ?? "file",
      external_url: a.externalUrl,
      extension: a.extension,
      fallback_title: a.fallbackTitle,
      meta: a.meta ?? {},
    })),
    created_at: Math.floor(row.createdAt.getTime() / 1000),
  };
}

// ---- Consultas ----

export async function listMessages(
  accountId: number,
  conversationId: number,
  auth: AuthCtx,
  after?: number,
): Promise<ApiMessage[]> {
  const conv = await assertConversationAccess(accountId, conversationId, auth);
  const conditions = [eq(messages.conversationId, conv.id)];
  if (after !== undefined) conditions.push(gt(messages.id, after));
  const rows = await db.query.messages.findMany({
    where: and(...conditions),
    orderBy: (m) => asc(m.createdAt),
    limit: 500,
  });
  return Promise.all(rows.map(toApiMessage));
}

/** Última mensagem (preview da lista). */
export async function lastMessage(conversationId: number): Promise<ApiMessage | null> {
  const row = await db.query.messages.findFirst({
    where: (m) => eq(m.conversationId, conversationId),
    orderBy: (m) => desc(m.createdAt),
  });
  return row ? toApiMessage(row) : null;
}

// ---- Criação ----

export interface SendMessageOptions {
  echoId?: string | number;
}

/**
 * Reply box do agente: sempre `outgoing` (ou nota privada).
 * Exige ser membro da inbox (espelha a política do Rails).
 */
export async function sendAgentMessage(
  accountId: number,
  conversationId: number,
  auth: AuthCtx,
  input: CreateMessageInput,
): Promise<ApiMessage> {
  const conv = await assertConversationAccess(accountId, conversationId, auth);
  if (conv.status === 3) {
    throw new UnprocessableError("Conversation is snoozed", {
      status: ["reabra a conversa antes de responder"],
    });
  }

  const [row] = await db
    .insert(messages)
    .values({
      accountId,
      inboxId: conv.inboxId,
      conversationId: conv.id,
      messageType: 1,
      private: input.private,
      status: 0,
      content: input.content,
      contentType: 0,
      contentAttributes: input.content_attributes ?? {},
      senderType: "User",
      senderId: auth.userId,
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create message");

  // Primeira resposta do agente (só mensagens públicas contam).
  const patch: Record<string, unknown> = { lastActivityAt: new Date(), updatedAt: new Date() };
  if (!input.private && !conv.firstReplyCreatedAt) {
    patch.firstReplyCreatedAt = new Date();
  }
  if (!input.private) patch.waitingSince = null;
  await db.update(conversations).set(patch).where(eq(conversations.id, conv.id));

  const api = { ...(await toApiMessage(row)), echo_id: input.echo_id };
  publish(accountId, "message.created", { ...api, conversation_id: conv.id });
  // M10: mensagens públicas saem para a plataforma externa (fire-and-forget).
  if (!input.private) {
    void import("../channels/outbound.js")
      .then((m) => m.dispatchChannelSend(accountId, conv.id, row.id))
      .catch((err) => console.error("[channel:send] dispatch falhou", err));
  }
  // M11: `@nome` menciona agentes (notificação realtime, menos o autor).
  if (input.content) {
    void import("./notifications.js")
      .then((m) => m.processMentions(accountId, conv.id, row.id, auth.userId, input.content ?? ""))
      .catch((err) => console.error("[mentions]", err));
  }
  publish(
    accountId,
    "conversation.updated",
    await toApiConversationItem(await findConversation(accountId, conv.id)),
  );
  return api;
}

/** Mensagem vinda do contato (widget/M5/canais M10). Interno, não exposto direto. */
export async function createIncomingMessage(
  accountId: number,
  conversationId: number,
  input: { content: string | null; senderId?: number; contentAttributes?: Record<string, unknown> },
): Promise<ApiMessage> {
  const conv = await findConversation(accountId, conversationId);
  const [row] = await db
    .insert(messages)
    .values({
      accountId,
      inboxId: conv.inboxId,
      conversationId: conv.id,
      messageType: 0,
      private: false,
      status: 0,
      content: input.content,
      senderType: input.senderId ? "Contact" : null,
      senderId: input.senderId ?? null,
      contentAttributes: input.contentAttributes ?? {},
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create message");

  const patch: Record<string, unknown> = {
    lastActivityAt: new Date(),
    unreadIncomingMessagesCount: conv.unreadIncomingMessagesCount + 1,
    updatedAt: new Date(),
  };
  if (!conv.waitingSince) patch.waitingSince = new Date();
  if (conv.status === 1) {
    patch.status = 0; // reabre conversa resolvida em nova mensagem (igual ao Rails)
  }
  await db.update(conversations).set(patch).where(eq(conversations.id, conv.id));

  const api = await toApiMessage(row);
  publish(accountId, "message.created", { ...api, conversation_id: conv.id });
  publish(
    accountId,
    "conversation.updated",
    await toApiConversationItem(await findConversation(accountId, conv.id)),
  );
  return api;
}

export async function deleteMessage(
  accountId: number,
  conversationId: number,
  auth: AuthCtx,
  messageId: number,
): Promise<void> {
  const conv = await assertConversationAccess(accountId, conversationId, auth);
  const row = await db.query.messages.findFirst({
    where: (m) => and(eq(m.id, messageId), eq(m.conversationId, conv.id)),
  });
  if (!row) throw new NotFoundError("Message not found");
  // Rails: só deleta activity ou privada (e o próprio autor, salvo admin).
  const deletable = row.messageType === 2 || row.private;
  if (!deletable) throw new ForbiddenError("Only activity or private messages can be deleted");
  if (row.senderId !== auth.userId && auth.role !== "administrator") {
    throw new ForbiddenError("You can only delete your own messages");
  }
  await db.delete(messages).where(eq(messages.id, row.id));
}

// ---- Upload ----

export interface UploadInput {
  filename: string;
  contentType: string;
  data: Uint8Array;
  private?: boolean;
  content?: string;
}

export async function uploadMessageAttachment(
  accountId: number,
  conversationId: number,
  auth: AuthCtx,
  file: UploadInput,
): Promise<ApiMessage> {
  const conv = await assertConversationAccess(accountId, conversationId, auth);
  const stored = await storage().save(file.data, file.filename, file.contentType);
  const ext = file.filename.split(".").pop()?.toLowerCase().slice(0, 10) ?? "";

  const [row] = await db
    .insert(messages)
    .values({
      accountId,
      inboxId: conv.inboxId,
      conversationId: conv.id,
      messageType: 1,
      private: file.private ?? false,
      status: 0,
      content: file.content ?? null,
      senderType: "User",
      senderId: auth.userId,
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create message");

  await db.insert(attachments).values({
    accountId,
    messageId: row.id,
    fileType: guessFileType(file.contentType),
    externalUrl: stored.url,
    extension: ext,
    fallbackTitle: file.filename,
    meta: { size: stored.size, content_type: file.contentType },
  });

  await db
    .update(conversations)
    .set({ lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(conversations.id, conv.id));

  const api = await toApiMessage(row);
  publish(accountId, "message.created", { ...api, conversation_id: conv.id });
  return api;
}

// ---- Participantes ----

export async function listParticipants(accountId: number, conversationId: number, auth: AuthCtx) {
  const conv = await assertConversationAccess(accountId, conversationId, auth);
  const rows = await db
    .select({ user: users })
    .from(conversationParticipants)
    .innerJoin(users, eq(users.id, conversationParticipants.userId))
    .where(eq(conversationParticipants.conversationId, conv.id));
  return rows.map((r) => ({ id: r.user.id, name: r.user.name, email: r.user.email }));
}

export async function addParticipants(
  accountId: number,
  conversationId: number,
  auth: AuthCtx,
  userIds: number[],
) {
  const conv = await assertConversationAccess(accountId, conversationId, auth);
  const agents = await db.query.accountUsers.findMany({
    where: (au) => and(eq(au.accountId, accountId), inArray(au.userId, userIds)),
    columns: { userId: true },
  });
  const ids = agents.map((a) => a.userId);
  if (ids.length === 0) throw new UnprocessableError("No valid agents");
  await db
    .insert(conversationParticipants)
    .values(ids.map((userId) => ({ accountId, conversationId: conv.id, userId })))
    .onConflictDoNothing();
  return listParticipants(accountId, conversationId, auth);
}

export async function removeParticipant(
  accountId: number,
  conversationId: number,
  auth: AuthCtx,
  userId: number,
): Promise<void> {
  const conv = await assertConversationAccess(accountId, conversationId, auth);
  await db
    .delete(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, conv.id),
        eq(conversationParticipants.userId, userId),
      ),
    );
}
