/**
 * M10 — Pipeline genérico de inbound: `NormalizedInbound` → contato +
 * contact_inbox + conversa + mensagem incoming (+ anexos), com idempotência
 * por `messages.source_id` e realtime via `createIncomingMessage` (M4).
 *
 * Referência: `chatwoot/app/services/channel/*` (cada canal identifica o
 * contato pelo id da plataforma e reaproveita a conversa aberta).
 */
import {
  attachments,
  contactInboxes,
  contacts,
  conversations,
  db,
  inboxes,
  messages,
} from "@chatwootjs/db";
import { and, desc, eq } from "drizzle-orm";

import { createIncomingMessage } from "../services/messages.js";
import type { NormalizedAttachment, NormalizedInbound } from "./types.js";

export interface IngestResult {
  conversationId: number;
  messageId: number | null;
  /** true quando a mensagem já existia (webhook redelivered). */
  deduplicated: boolean;
  contactId: number;
}

function guessFileType(mime: NormalizedAttachment["fileType"]): number {
  return mime === "image" ? 0 : mime === "audio" ? 1 : mime === "video" ? 2 : 3;
}

async function findContactBySource(
  accountId: number,
  inboxId: number,
  inbound: NormalizedInbound,
): Promise<{ id: number } | undefined> {
  // 1) contact_inbox existente (contato já falou por este canal).
  const ci = await db.query.contactInboxes.findFirst({
    where: (t) => and(eq(t.inboxId, inboxId), eq(t.sourceId, inbound.contactSourceId)),
    columns: { contactId: true },
  });
  if (ci) return { id: ci.contactId };
  // 2) e-mail/telefone iguais (mesma pessoa em outro canal).
  if (inbound.contactEmail) {
    const row = await db.query.contacts.findFirst({
      where: (t) => and(eq(t.accountId, accountId), eq(t.email, inbound.contactEmail!)),
      columns: { id: true },
    });
    if (row) return row;
  }
  if (inbound.contactPhone) {
    const row = await db.query.contacts.findFirst({
      where: (t) => and(eq(t.accountId, accountId), eq(t.phoneNumber, inbound.contactPhone!)),
      columns: { id: true },
    });
    if (row) return row;
  }
  return undefined;
}

/**
 * Ingere uma mensagem normalizada numa inbox específica.
 * Eventos de status (`isStatusEvent`) atualizam a mensagem original e não
 * criam mensagem nova.
 */
export async function ingestInbound(
  accountId: number,
  inboxId: number,
  inbound: NormalizedInbound,
): Promise<IngestResult> {
  const inbox = await db.query.inboxes.findFirst({
    where: (i) => and(eq(i.accountId, accountId), eq(i.id, inboxId)),
  });
  if (!inbox) throw new Error(`Inbox ${inboxId} not found in account ${accountId}`);

  // Idempotência: retry/redelivery da plataforma não duplica.
  const existing = await db.query.messages.findFirst({
    where: (m) => and(eq(m.accountId, accountId), eq(m.sourceId, inbound.sourceId)),
    columns: { id: true, conversationId: true },
  });
  if (existing) {
    const ci = await db.query.contactInboxes.findFirst({
      where: (t) => and(eq(t.inboxId, inboxId), eq(t.sourceId, inbound.contactSourceId)),
      columns: { contactId: true },
    });
    return {
      conversationId: existing.conversationId,
      messageId: existing.id,
      deduplicated: true,
      contactId: ci?.contactId ?? 0,
    };
  }

  // Evento de status sem mensagem correspondente: ignora (nada a atualizar).
  if (inbound.isStatusEvent) {
    return { conversationId: 0, messageId: null, deduplicated: true, contactId: 0 };
  }

  let contact = await findContactBySource(accountId, inboxId, inbound);
  if (!contact) {
    const [row] = await db
      .insert(contacts)
      .values({
        accountId,
        name: inbound.contactName ?? inbound.contactSourceId,
        email: inbound.contactEmail,
        phoneNumber: inbound.contactPhone,
        additionalAttributes: inbound.contactAvatarUrl
          ? { avatar_url: inbound.contactAvatarUrl }
          : {},
      })
      .returning({ id: contacts.id });
    if (!row) throw new Error("Could not create contact from inbound");
    contact = row;
  }

  let contactInbox = await db.query.contactInboxes.findFirst({
    where: (t) => and(eq(t.contactId, contact.id), eq(t.inboxId, inboxId)),
  });
  if (!contactInbox) {
    const [row] = await db
      .insert(contactInboxes)
      .values({
        contactId: contact.id,
        inboxId,
        sourceId: inbound.contactSourceId,
        pubsubToken: crypto.randomUUID(),
      })
      .returning();
    if (!row) throw new Error("Could not create contact_inbox from inbound");
    contactInbox = row;
  }

  // Reaproveita a conversa aberta mais recente; senão cria uma nova.
  const openConv = await db.query.conversations.findFirst({
    where: (c) =>
      and(
        eq(c.accountId, accountId),
        eq(c.inboxId, inboxId),
        eq(c.contactId, contact.id),
        eq(c.status, 0),
      ),
    orderBy: (c) => desc(c.lastActivityAt),
  });

  let conversationId: number;
  if (openConv) {
    conversationId = openConv.id;
  } else {
    const maxDisplay =
      (await db
        .select({ max: conversations.displayId })
        .from(conversations)
        .where(eq(conversations.accountId, accountId))
        .orderBy(desc(conversations.displayId))
        .limit(1)
        .then((r) => r[0]?.max ?? 0)) + 1;
    const [row] = await db
      .insert(conversations)
      .values({
        accountId,
        inboxId,
        contactId: contact.id,
        contactInboxId: contactInbox.id,
        displayId: maxDisplay,
        uuid: crypto.randomUUID(),
        status: 0,
        lastActivityAt: new Date(),
      })
      .returning({ id: conversations.id });
    if (!row) throw new Error("Could not create conversation from inbound");
    conversationId = row.id;
    const { publish } = await import("../realtime/index.js");
    const { findConversation, toApiConversationItem } =
      await import("../services/conversations.js");
    publish(
      accountId,
      "conversation.created",
      await toApiConversationItem(await findConversation(accountId, conversationId)),
    );
  }

  const api = await createIncomingMessage(accountId, conversationId, {
    content: inbound.content,
    senderId: contact.id,
    contentAttributes: { ...inbound.contentAttributes, channel: inbox.channelType },
  });

  // source_id da plataforma (idempotência futura + threading de e-mail).
  await db.update(messages).set({ sourceId: inbound.sourceId }).where(eq(messages.id, api.id));

  if (inbound.attachments.length > 0) {
    await db.insert(attachments).values(
      inbound.attachments.map((a) => ({
        accountId,
        messageId: api.id,
        fileType: guessFileType(a.fileType),
        externalUrl: a.remoteUrl,
        fallbackTitle: a.fallbackTitle,
        meta: {},
      })),
    );
  }

  return { conversationId, messageId: api.id, deduplicated: false, contactId: contact.id };
}

/** Resolve a inbox de um canal pelo predicado (ex.: bot_token, phone_number). */
export async function findInboxByChannel(
  channelType: string,
  match: (inbox: typeof inboxes.$inferSelect) => Promise<boolean>,
): Promise<(typeof inboxes.$inferSelect & { accountId: number }) | null> {
  const rows = await db.query.inboxes.findMany({
    where: (i) => eq(i.channelType, channelType),
  });
  for (const inbox of rows) {
    if (await match(inbox)) return inbox;
  }
  return null;
}
