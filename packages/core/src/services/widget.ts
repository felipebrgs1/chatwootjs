import {
  channelWebWidgets,
  contactInboxes,
  contacts,
  conversations,
  csatSurveyResponses,
  db,
  type ContactInbox,
} from "@chatwootjs/db";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { publish } from "../realtime/index.js";
import { createIncomingMessage, toApiMessage, type ApiMessage } from "./messages.js";
import { toApiConversationItem } from "./conversations.js";

// ---- Helpers ----

export interface WidgetInbox {
  inboxId: number;
  accountId: number;
  name: string;
  websiteToken: string;
  widgetColor: string;
  welcomeTitle: string | null;
  welcomeTagline: string | null;
  greetingEnabled: boolean;
  greetingMessage: string | null;
  preChatFormEnabled: boolean;
  csatSurveyEnabled: boolean;
  workingHoursEnabled: boolean;
  outOfOfficeMessage: string | null;
  allowMessagesAfterResolved: boolean;
}

export async function findWidgetInbox(websiteToken: string): Promise<WidgetInbox> {
  const channel = await db.query.channelWebWidgets.findFirst({
    where: (c) => eq(c.websiteToken, websiteToken),
  });
  if (!channel) throw new NotFoundError("Website token not found");
  if (channel.accountId == null) throw new NotFoundError("Website token not found");
  const widgetAccountId = channel.accountId;
  const inbox = await db.query.inboxes.findFirst({
    where: (i) =>
      and(
        eq(i.accountId, widgetAccountId),
        eq(i.channelId, channel.id),
        eq(i.channelType, "Channel::WebWidget"),
      ),
  });
  if (!inbox) throw new NotFoundError("Inbox not found");
  if (channel.accountId == null || channel.websiteToken == null)
    throw new NotFoundError("Inbox not found");
  return {
    inboxId: inbox.id,
    accountId: channel.accountId,
    name: inbox.name ?? "",
    websiteToken: channel.websiteToken,
    widgetColor: channel.widgetColor ?? "#1f93ff",
    welcomeTitle: channel.welcomeTitle,
    welcomeTagline: channel.welcomeTagline,
    greetingEnabled: inbox.greetingEnabled ?? false,
    greetingMessage: inbox.greetingMessage,
    preChatFormEnabled: channel.preChatFormEnabled ?? false,
    csatSurveyEnabled: inbox.csatSurveyEnabled ?? false,
    workingHoursEnabled: inbox.workingHoursEnabled ?? false,
    outOfOfficeMessage: inbox.outOfOfficeMessage,
    allowMessagesAfterResolved: inbox.allowMessagesAfterResolved ?? false,
  };
}

/** Contato do widget identificado pelo `contact_token` (= pubsub_token). */
export async function findWidgetContact(
  inbox: WidgetInbox,
  contactToken: string,
): Promise<{ contactId: number; contactInbox: ContactInbox }> {
  const contactInbox = await db.query.contactInboxes.findFirst({
    where: (ci) => and(eq(ci.inboxId, inbox.inboxId), eq(ci.pubsubToken, contactToken)),
  });
  if (!contactInbox?.contactId) throw new NotFoundError("Contact session not found");
  return { contactId: contactInbox.contactId, contactInbox };
}

function newPubsubToken(): string {
  return crypto.randomUUID();
}

// ---- Config ----

export async function getWidgetConfig(websiteToken: string) {
  const inbox = await findWidgetInbox(websiteToken);
  const { listActiveOngoingCampaigns } = await import("./campaigns.js");
  return {
    website_token: inbox.websiteToken,
    inbox_name: inbox.name,
    widget_color: inbox.widgetColor,
    welcome_title: inbox.welcomeTitle,
    welcome_tagline: inbox.welcomeTagline,
    greeting_enabled: inbox.greetingEnabled,
    greeting_message: inbox.greetingMessage,
    pre_chat_form_enabled: inbox.preChatFormEnabled,
    csat_survey_enabled: inbox.csatSurveyEnabled,
    working_hours_enabled: inbox.workingHoursEnabled,
    out_of_office_message: inbox.outOfOfficeMessage,
    allow_messages_after_resolved: inbox.allowMessagesAfterResolved,
    ongoing_campaigns: await listActiveOngoingCampaigns(inbox.accountId, inbox.inboxId),
  };
}

// ---- Contato (upsert por identifier/email) ----

export interface WidgetContactInput {
  identifier?: string;
  name?: string;
  email?: string;
  phone_number?: string;
  custom_attributes?: Record<string, unknown>;
}

export async function upsertWidgetContact(
  websiteToken: string,
  input: WidgetContactInput,
): Promise<{ contact_token: string; contact_id: number }> {
  const inbox = await findWidgetInbox(websiteToken);
  const identifier =
    input.identifier?.trim() || input.email?.trim().toLowerCase() || `anon_${crypto.randomUUID()}`;

  // setUser(identifier) vincula contato existente: casa contra identifier E email.
  const keys = [
    ...new Set(
      [input.identifier?.trim(), input.email?.trim().toLowerCase()].filter((v): v is string => !!v),
    ),
  ];
  let contact =
    keys.length > 0
      ? await db.query.contacts.findFirst({
          where: (ct) =>
            and(
              eq(ct.accountId, inbox.accountId),
              or(...keys.flatMap((key) => [eq(ct.identifier, key), eq(ct.email, key)])),
            ),
        })
      : undefined;

  if (!contact) {
    const [created] = await db
      .insert(contacts)
      .values({
        accountId: inbox.accountId,
        name: input.name?.trim() || identifier,
        email: input.email?.trim().toLowerCase() || null,
        phoneNumber: input.phone_number?.trim() || null,
        identifier,
        customAttributes: input.custom_attributes ?? {},
      })
      .returning();
    if (!created) throw new UnprocessableError("Could not create contact");
    contact = created;
  } else {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name?.trim()) patch.name = input.name.trim();
    if (input.email?.trim() && !contact.email) patch.email = input.email.trim().toLowerCase();
    if (input.phone_number?.trim() && !contact.phoneNumber)
      patch.phoneNumber = input.phone_number.trim();
    if (input.custom_attributes) {
      patch.customAttributes = {
        ...((contact.customAttributes ?? {}) as Record<string, unknown>),
        ...input.custom_attributes,
      };
    }
    if (Object.keys(patch).length > 1) {
      await db.update(contacts).set(patch).where(eq(contacts.id, contact.id));
    }
  }

  let contactInbox = await db.query.contactInboxes.findFirst({
    where: (ci) => and(eq(ci.contactId, contact.id), eq(ci.inboxId, inbox.inboxId)),
  });
  if (!contactInbox) {
    const [created] = await db
      .insert(contactInboxes)
      .values({
        contactId: contact.id,
        inboxId: inbox.inboxId,
        sourceId: identifier,
        pubsubToken: newPubsubToken(),
      })
      .returning();
    if (!created) throw new UnprocessableError("Could not create contact session");
    contactInbox = created;
  }

  let contactToken = contactInbox.pubsubToken;
  if (!contactToken) {
    // Rails não dá default: garante token quando ausente (legado/v1).
    contactToken = newPubsubToken();
    await db
      .update(contactInboxes)
      .set({ pubsubToken: contactToken })
      .where(eq(contactInboxes.id, contactInbox.id));
  }
  return { contact_token: contactToken, contact_id: contact.id };
}

export async function updateWidgetContact(
  websiteToken: string,
  contactToken: string,
  input: WidgetContactInput,
): Promise<{ contact_id: number }> {
  const inbox = await findWidgetInbox(websiteToken);
  const { contactId } = await findWidgetContact(inbox, contactToken);
  const contact = await db.query.contacts.findFirst({
    where: (ct) => and(eq(ct.accountId, inbox.accountId), eq(ct.id, contactId)),
  });
  if (!contact) throw new NotFoundError("Contact not found");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name?.trim()) patch.name = input.name.trim();
  if (input.email?.trim()) patch.email = input.email.trim().toLowerCase();
  if (input.phone_number?.trim()) patch.phoneNumber = input.phone_number.trim();
  if (input.custom_attributes) {
    patch.customAttributes = {
      ...((contact.customAttributes ?? {}) as Record<string, unknown>),
      ...input.custom_attributes,
    };
  }
  await db.update(contacts).set(patch).where(eq(contacts.id, contact.id));
  return { contact_id: contact.id };
}

// ---- Conversas do contato ----

export async function listWidgetConversations(websiteToken: string, contactToken: string) {
  const inbox = await findWidgetInbox(websiteToken);
  const { contactId } = await findWidgetContact(inbox, contactToken);
  const rows = await db.query.conversations.findMany({
    where: (c) =>
      and(
        eq(c.accountId, inbox.accountId),
        eq(c.contactId, contactId),
        eq(c.inboxId, inbox.inboxId),
      ),
    orderBy: (c) => desc(c.lastActivityAt),
    limit: 10,
  });
  return Promise.all(rows.map(toApiConversationItem));
}

export async function createWidgetConversation(websiteToken: string, contactToken: string) {
  const inbox = await findWidgetInbox(websiteToken);
  const { contactId, contactInbox } = await findWidgetContact(inbox, contactToken);

  const displayId =
    (await db
      .select({ max: sql<number | null>`max(${conversations.displayId})` })
      .from(conversations)
      .where(eq(conversations.accountId, inbox.accountId))
      .then((r) => r[0]?.max ?? 0)) + 1;

  const [row] = await db
    .insert(conversations)
    .values({
      accountId: inbox.accountId,
      inboxId: inbox.inboxId,
      contactId,
      contactInboxId: contactInbox.id,
      displayId,
      uuid: crypto.randomUUID(),
      status: 0,
      lastActivityAt: new Date(),
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create conversation");
  publish(inbox.accountId, "conversation.created", await toApiConversationItem(row));
  return toApiConversationItem(row);
}

async function findWidgetConversation(inbox: WidgetInbox, contactToken: string, id: number) {
  const { contactId } = await findWidgetContact(inbox, contactToken);
  const row = await db.query.conversations.findFirst({
    where: (c) =>
      and(
        eq(c.accountId, inbox.accountId),
        eq(c.id, id),
        eq(c.contactId, contactId),
        eq(c.inboxId, inbox.inboxId),
      ),
  });
  if (!row) throw new NotFoundError("Conversation not found");
  return row;
}

// ---- Mensagens ----

export async function listWidgetMessages(
  websiteToken: string,
  contactToken: string,
  conversationId: number,
): Promise<ApiMessage[]> {
  const inbox = await findWidgetInbox(websiteToken);
  const conv = await findWidgetConversation(inbox, contactToken, conversationId);
  const rows = await db.query.messages.findMany({
    where: (m) => eq(m.conversationId, conv.id),
    orderBy: (m) => asc(m.createdAt),
    limit: 500,
  });
  return Promise.all(rows.map(toApiMessage));
}

export async function sendWidgetMessage(
  websiteToken: string,
  contactToken: string,
  conversationId: number,
  content: string,
): Promise<ApiMessage> {
  const inbox = await findWidgetInbox(websiteToken);
  const conv = await findWidgetConversation(inbox, contactToken, conversationId);
  if (conv.status === 1 && !inbox.allowMessagesAfterResolved) {
    throw new UnprocessableError("Conversation is resolved", {
      content: ["conversa resolvida — abra um novo atendimento"],
    });
  }
  const { contactId } = await findWidgetContact(inbox, contactToken);
  return createIncomingMessage(inbox.accountId, conv.id, {
    content,
    senderId: contactId,
  });
}

export async function markWidgetConversationRead(
  websiteToken: string,
  contactToken: string,
  conversationId: number,
): Promise<void> {
  const inbox = await findWidgetInbox(websiteToken);
  const conv = await findWidgetConversation(inbox, contactToken, conversationId);
  await db
    .update(conversations)
    .set({ contactLastSeenAt: new Date(), updatedAt: new Date() })
    .where(eq(conversations.id, conv.id));
}

// ---- CSAT ----

export async function submitWidgetCsat(
  websiteToken: string,
  contactToken: string,
  conversationId: number,
  rating: number,
  feedbackMessage?: string,
) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new UnprocessableError("Rating must be between 1 and 5", {
      rating: ["deve estar entre 1 e 5"],
    });
  }
  const inbox = await findWidgetInbox(websiteToken);
  if (!inbox.csatSurveyEnabled) {
    throw new UnprocessableError("CSAT is not enabled for this inbox");
  }
  const conv = await findWidgetConversation(inbox, contactToken, conversationId);
  const { contactId } = await findWidgetContact(inbox, contactToken);

  // Vincula à última mensagem do agente (igual ao Rails: csat via mensagem).
  const lastAgentMessage = await db.query.messages.findFirst({
    where: (m) => and(eq(m.conversationId, conv.id), eq(m.messageType, 1), eq(m.private, false)),
    orderBy: (m) => desc(m.createdAt),
  });
  if (!lastAgentMessage) {
    throw new UnprocessableError("No agent message to rate yet", {
      rating: ["aguarde a resposta do atendente"],
    });
  }

  const [row] = await db
    .insert(csatSurveyResponses)
    .values({
      accountId: inbox.accountId,
      conversationId: conv.id,
      messageId: lastAgentMessage.id,
      rating,
      feedbackMessage,
      contactId,
      assignedAgentId: conv.assigneeId,
    })
    .onConflictDoNothing()
    .returning();
  return {
    id: row?.id ?? null,
    rating,
    conversation_id: conv.id,
  };
}

// ---- Channel API (inbox Channel::Api, autenticada por JWT de agente) ----

export interface ApiChannelMessageInput {
  inbox_id: number;
  contact: { identifier: string; name?: string; email?: string; phone_number?: string };
  message: { content: string };
}

export async function createApiChannelConversation(
  accountId: number,
  input: ApiChannelMessageInput,
) {
  const inbox = await db.query.inboxes.findFirst({
    where: (i) =>
      and(eq(i.accountId, accountId), eq(i.id, input.inbox_id), eq(i.channelType, "Channel::Api")),
  });
  if (!inbox) throw new NotFoundError("API inbox not found");

  const identifier = input.contact.identifier.trim();
  if (!identifier) throw new UnprocessableError("identifier is required");

  let contact = await db.query.contacts.findFirst({
    where: (ct) => and(eq(ct.accountId, accountId), eq(ct.identifier, identifier)),
  });
  if (!contact) {
    const [created] = await db
      .insert(contacts)
      .values({
        accountId,
        name: input.contact.name?.trim() || identifier,
        email: input.contact.email?.trim().toLowerCase() || null,
        phoneNumber: input.contact.phone_number?.trim() || null,
        identifier,
      })
      .returning();
    if (!created) throw new UnprocessableError("Could not create contact");
    contact = created;
  }

  let contactInbox = await db.query.contactInboxes.findFirst({
    where: (ci) => and(eq(ci.contactId, contact.id), eq(ci.inboxId, inbox.id)),
  });
  if (!contactInbox) {
    const [created] = await db
      .insert(contactInboxes)
      .values({
        contactId: contact.id,
        inboxId: inbox.id,
        sourceId: identifier,
        pubsubToken: newPubsubToken(),
      })
      .returning();
    if (!created) throw new UnprocessableError("Could not create contact session");
    contactInbox = created;
  }

  const displayId =
    (await db
      .select({ max: sql<number | null>`max(${conversations.displayId})` })
      .from(conversations)
      .where(eq(conversations.accountId, accountId))
      .then((r) => r[0]?.max ?? 0)) + 1;

  const [conv] = await db
    .insert(conversations)
    .values({
      accountId,
      inboxId: inbox.id,
      contactId: contact.id,
      contactInboxId: contactInbox.id,
      displayId,
      uuid: crypto.randomUUID(),
      status: 0,
      lastActivityAt: new Date(),
    })
    .returning();
  if (!conv) throw new UnprocessableError("Could not create conversation");

  const message = await createIncomingMessage(accountId, conv.id, {
    content: input.message.content,
    senderId: contact.id,
  });
  publish(accountId, "conversation.created", await toApiConversationItem(conv));
  return { conversation: await toApiConversationItem(conv), message };
}

export { channelWebWidgets };
