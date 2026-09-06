import {
  channelApi,
  channelEmail,
  channelFacebookPages,
  channelInstagrams,
  channelLines,
  channelSms,
  channelTelegrams,
  channelTwitters,
  channelWebWidgets,
  channelWhatsapps,
  db,
  inboxMembers,
  inboxes,
  workingHours,
  type Inbox,
} from "@chatwootjs/db";
import { and, eq, inArray } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { requireAdmin, type AuthCtx } from "../policies/index.js";
import type {
  CreateInboxInput,
  InboxMembersBody,
  UpdateInboxInput,
  WorkingHoursBody,
} from "../schemas/inboxes.js";
import { listAgents } from "./auth.js";

function randomToken(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

const CHANNEL_TYPE_TO_WEB_WIDGET = "Channel::WebWidget";
const CHANNEL_TYPE_TO_API = "Channel::Api";
const CHANNEL_TYPE_TO_EMAIL = "Channel::Email";
const CHANNEL_TYPE_TO_TELEGRAM = "Channel::Telegram";
const CHANNEL_TYPE_TO_WHATSAPP = "Channel::Whatsapp";
const CHANNEL_TYPE_TO_SMS = "Channel::Sms";
const CHANNEL_TYPE_TO_LINE = "Channel::Line";
const CHANNEL_TYPE_TO_FACEBOOK = "Channel::FacebookPage";
const CHANNEL_TYPE_TO_INSTAGRAM = "Channel::Instagram";
const CHANNEL_TYPE_TO_TWITTER = "Channel::TwitterProfile";

// ---- Mappers (banco snake_case → API camelCase na borda) ----

export interface ApiWorkingHour {
  id: number;
  day_of_week: number;
  closed_all_day: boolean;
  open_all_day: boolean;
  open_hour: number | null;
  open_minutes: number | null;
  close_hour: number | null;
  close_minutes: number | null;
}

function toApiWorkingHour(row: typeof workingHours.$inferSelect): ApiWorkingHour {
  return {
    id: row.id,
    day_of_week: row.dayOfWeek,
    closed_all_day: row.closedAllDay,
    open_all_day: row.openAllDay,
    open_hour: row.openHour ?? null,
    open_minutes: row.openMinutes ?? null,
    close_hour: row.closeHour ?? null,
    close_minutes: row.closeMinutes ?? null,
  };
}

export interface ApiInbox {
  id: number;
  name: string;
  channel_id: number;
  channel_type: string;
  enable_auto_assignment: boolean;
  greeting_enabled: boolean;
  greeting_message: string | null;
  working_hours_enabled: boolean;
  out_of_office_message: string | null;
  timezone: string;
  enable_email_collect: boolean;
  csat_survey_enabled: boolean;
  allow_messages_after_resolved: boolean;
  lock_to_single_conversation: boolean;
  sender_name_type: number;
  business_name: string | null;
  channel: Record<string, unknown>;
  working_hours: ApiWorkingHour[];
  inbox_members: number[];
}

/** Serializa a inbox com o canal aninhado (igual ao `inbox.attributes.json`). */
export async function toApiInbox(inbox: Inbox): Promise<ApiInbox> {
  let channel: Record<string, unknown> = {};
  if (inbox.channelType === CHANNEL_TYPE_TO_WEB_WIDGET) {
    const row = await db.query.channelWebWidgets.findFirst({
      where: (c) => eq(c.id, inbox.channelId),
    });
    if (row) {
      channel = {
        id: row.id,
        website_url: row.websiteUrl,
        website_token: row.websiteToken,
        widget_color: row.widgetColor,
        welcome_title: row.welcomeTitle,
        welcome_tagline: row.welcomeTagline,
        pre_chat_form_enabled: row.preChatFormEnabled,
        hmac_mandatory: row.hmacMandatory,
        messaging_service_sid: null,
      };
    }
  } else if (inbox.channelType === CHANNEL_TYPE_TO_API) {
    const row = await db.query.channelApi.findFirst({ where: (c) => eq(c.id, inbox.channelId) });
    if (row) {
      channel = {
        id: row.id,
        webhook_url: row.webhookUrl,
        identifier: row.identifier,
        hmac_token: row.hmacToken,
        hmac_mandatory: row.hmacMandatory,
        secret: row.secret,
      };
    }
  } else if (inbox.channelType === CHANNEL_TYPE_TO_EMAIL) {
    const row = await db.query.channelEmail.findFirst({ where: (c) => eq(c.id, inbox.channelId) });
    if (row) {
      channel = {
        id: row.id,
        email: row.email,
        forward_to_email: row.forwardToEmail,
        imap_enabled: row.imapEnabled,
        smtp_enabled: row.smtpEnabled,
        verified_for_sending: row.verifiedForSending,
      };
    }
  } else if (inbox.channelType === CHANNEL_TYPE_TO_TELEGRAM) {
    const row = await db.query.channelTelegrams.findFirst({
      where: (c) => eq(c.id, inbox.channelId),
    });
    if (row) {
      channel = { id: row.id, bot_name: row.botName, bot_token: "***" };
    }
  } else if (inbox.channelType === CHANNEL_TYPE_TO_WHATSAPP) {
    const row = await db.query.channelWhatsapps.findFirst({
      where: (c) => eq(c.id, inbox.channelId),
    });
    if (row) {
      channel = {
        id: row.id,
        phone_number: row.phoneNumber,
        provider: row.provider,
        provider_config: { api_key: "***" },
      };
    }
  } else if (inbox.channelType === CHANNEL_TYPE_TO_SMS) {
    const row = await db.query.channelSms.findFirst({ where: (c) => eq(c.id, inbox.channelId) });
    if (row) {
      channel = { id: row.id, phone_number: row.phoneNumber, provider: row.provider };
    }
  } else if (inbox.channelType === CHANNEL_TYPE_TO_LINE) {
    const row = await db.query.channelLines.findFirst({ where: (c) => eq(c.id, inbox.channelId) });
    if (row) {
      channel = { id: row.id, line_channel_id: row.lineChannelId, line_channel_token: "***" };
    }
  }

  const hours = await db.query.workingHours.findMany({
    where: (wh) => eq(wh.inboxId, inbox.id),
    orderBy: (wh) => wh.dayOfWeek,
  });
  const memberIds = await db.query.inboxMembers.findMany({
    where: (im) => eq(im.inboxId, inbox.id),
    columns: { userId: true },
  });

  return {
    id: inbox.id,
    name: inbox.name,
    channel_id: inbox.channelId,
    channel_type: inbox.channelType ?? "",
    enable_auto_assignment: inbox.enableAutoAssignment,
    greeting_enabled: inbox.greetingEnabled,
    greeting_message: inbox.greetingMessage,
    working_hours_enabled: inbox.workingHoursEnabled,
    out_of_office_message: inbox.outOfOfficeMessage,
    timezone: inbox.timezone,
    enable_email_collect: inbox.enableEmailCollect,
    csat_survey_enabled: inbox.csatSurveyEnabled,
    allow_messages_after_resolved: inbox.allowMessagesAfterResolved,
    lock_to_single_conversation: inbox.lockToSingleConversation,
    sender_name_type: inbox.senderNameType,
    business_name: inbox.businessName,
    channel,
    working_hours: hours.map(toApiWorkingHour),
    inbox_members: memberIds.map((m) => m.userId),
  };
}

// ---- Consultas ----

/** InboxPolicy.Scope: agente só vê inboxes onde é membro; admin vê todas. */
export async function listInboxes(accountId: number, auth: AuthCtx): Promise<ApiInbox[]> {
  let rows: Inbox[];
  if (auth.role === "administrator") {
    rows = await db.query.inboxes.findMany({
      where: (i) => eq(i.accountId, accountId),
      orderBy: (i) => i.name,
    });
  } else {
    const memberships = await db.query.inboxMembers.findMany({
      where: (im) => eq(im.userId, auth.userId),
      columns: { inboxId: true },
    });
    const ids = memberships.map((m) => m.inboxId);
    if (ids.length === 0) return [];
    rows = await db.query.inboxes.findMany({
      where: (i) => and(eq(i.accountId, accountId), inArray(i.id, ids)),
      orderBy: (i) => i.name,
    });
  }
  return Promise.all(rows.map(toApiInbox));
}

export async function findInbox(accountId: number, inboxId: number): Promise<Inbox> {
  const row = await db.query.inboxes.findFirst({
    where: (i) => and(eq(i.accountId, accountId), eq(i.id, inboxId)),
  });
  if (!row) throw new NotFoundError("Inbox not found");
  return row;
}

/** show? do InboxPolicy — membro ou admin da conta. */
export async function assertInboxAccess(accountId: number, inboxId: number, auth: AuthCtx) {
  const inbox = await findInbox(accountId, inboxId);
  if (auth.role !== "administrator") {
    const member = await db.query.inboxMembers.findFirst({
      where: (im) => and(eq(im.inboxId, inboxId), eq(im.userId, auth.userId)),
    });
    if (!member) throw new NotFoundError("Inbox not found");
  }
  return inbox;
}

export async function getInbox(auth: AuthCtx, inboxId: number): Promise<ApiInbox> {
  const inbox = await assertInboxAccess(auth.accountId, inboxId, auth);
  return toApiInbox(inbox);
}

/** Rota global /api/v1/inboxes/:id: valida vínculo do usuário com a conta da inbox. */
export async function getInboxByIdForUser(userId: number, inboxId: number): Promise<ApiInbox> {
  const inbox = await db.query.inboxes.findFirst({ where: (i) => eq(i.id, inboxId) });
  if (!inbox) throw new NotFoundError("Inbox not found");
  const { loadMembership } = await import("./auth.js");
  const membership = await loadMembership(userId, inbox.accountId);
  if (!membership) throw new NotFoundError("Inbox not found");
  return toApiInbox(inbox);
}

// ---- Mutação ----

export async function createInbox(auth: AuthCtx, input: CreateInboxInput): Promise<ApiInbox> {
  requireAdmin(auth);
  const inboxId = await db.transaction(async (tx) => {
    let channelId: number | undefined;
    let channelType: string;

    switch (input.channel.type) {
      case CHANNEL_TYPE_TO_WEB_WIDGET: {
        channelType = CHANNEL_TYPE_TO_WEB_WIDGET;
        const [row] = await tx
          .insert(channelWebWidgets)
          .values({
            accountId: auth.accountId,
            websiteUrl: input.channel.website_url,
            websiteToken: randomToken("cw"),
            widgetColor: input.channel.widget_color ?? "#1f93ff",
            welcomeTitle: input.channel.welcome_title ?? input.channel.website_title,
            welcomeTagline: input.channel.welcome_tagline,
            preChatFormEnabled: input.channel.pre_chat_form_enabled ?? false,
            preChatFormOptions: input.channel.pre_chat_form_options ?? {},
            hmacMandatory: input.channel.hmac_mandatory ?? false,
            allowedDomains: input.channel.allowed_domains ?? "",
          })
          .returning({ id: channelWebWidgets.id });
        channelId = row?.id;
        break;
      }
      case CHANNEL_TYPE_TO_API: {
        channelType = CHANNEL_TYPE_TO_API;
        const [row] = await tx
          .insert(channelApi)
          .values({
            accountId: auth.accountId,
            webhookUrl: input.channel.webhook_url,
            identifier: input.channel.identifier,
            hmacToken: randomToken("hmac"),
            hmacMandatory: input.channel.hmac_mandatory ?? false,
            secret: input.channel.secret,
          })
          .returning({ id: channelApi.id });
        channelId = row?.id;
        break;
      }
      case CHANNEL_TYPE_TO_EMAIL: {
        channelType = CHANNEL_TYPE_TO_EMAIL;
        const [row] = await tx
          .insert(channelEmail)
          .values({
            accountId: auth.accountId,
            email: input.channel.email,
            forwardToEmail: input.channel.forward_to_email,
            imapEnabled: input.channel.imap_enabled ?? false,
            imapAddress: input.channel.imap_address ?? "",
            imapPort: input.channel.imap_port ?? 0,
            imapLogin: input.channel.imap_login ?? "",
            imapPassword: input.channel.imap_password ?? "",
            imapEnableSsl: input.channel.imap_enable_ssl ?? true,
            smtpEnabled: input.channel.smtp_enabled ?? false,
            smtpAddress: input.channel.smtp_address ?? "",
            smtpPort: input.channel.smtp_port ?? 0,
            smtpLogin: input.channel.smtp_login ?? "",
            smtpPassword: input.channel.smtp_password ?? "",
            smtpDomain: input.channel.smtp_domain ?? "",
            smtpAuthentication: input.channel.smtp_authentication ?? "login",
          })
          .returning({ id: channelEmail.id });
        channelId = row?.id;
        break;
      }
      case CHANNEL_TYPE_TO_TELEGRAM: {
        channelType = CHANNEL_TYPE_TO_TELEGRAM;
        const [row] = await tx
          .insert(channelTelegrams)
          .values({
            accountId: auth.accountId,
            botName: input.channel.bot_name,
            botToken: input.channel.bot_token,
          })
          .returning({ id: channelTelegrams.id });
        channelId = row?.id;
        break;
      }
      case CHANNEL_TYPE_TO_WHATSAPP: {
        channelType = CHANNEL_TYPE_TO_WHATSAPP;
        const [row] = await tx
          .insert(channelWhatsapps)
          .values({
            accountId: auth.accountId,
            phoneNumber: input.channel.phone_number,
            provider: input.channel.provider,
            providerConfig: input.channel.provider_config ?? {},
            businessManagementToken: input.channel.business_management_token,
          })
          .returning({ id: channelWhatsapps.id });
        channelId = row?.id;
        break;
      }
      case CHANNEL_TYPE_TO_SMS: {
        channelType = CHANNEL_TYPE_TO_SMS;
        const [row] = await tx
          .insert(channelSms)
          .values({
            accountId: auth.accountId,
            phoneNumber: input.channel.phone_number,
            provider: input.channel.provider,
            providerConfig: input.channel.provider_config ?? {},
          })
          .returning({ id: channelSms.id });
        channelId = row?.id;
        break;
      }
      case CHANNEL_TYPE_TO_LINE: {
        channelType = CHANNEL_TYPE_TO_LINE;
        const [row] = await tx
          .insert(channelLines)
          .values({
            accountId: auth.accountId,
            lineChannelId: input.channel.line_channel_id,
            lineChannelSecret: input.channel.line_channel_secret,
            lineChannelToken: input.channel.line_channel_token,
          })
          .returning({ id: channelLines.id });
        channelId = row?.id;
        break;
      }
      case CHANNEL_TYPE_TO_FACEBOOK: {
        channelType = CHANNEL_TYPE_TO_FACEBOOK;
        const [row] = await tx
          .insert(channelFacebookPages)
          .values({
            accountId: auth.accountId,
            pageId: input.channel.page_id,
            userAccessToken: input.channel.user_access_token,
            pageAccessToken: input.channel.page_access_token,
            instagramId: input.channel.instagram_id,
          })
          .returning({ id: channelFacebookPages.id });
        channelId = row?.id;
        break;
      }
      case CHANNEL_TYPE_TO_INSTAGRAM: {
        channelType = CHANNEL_TYPE_TO_INSTAGRAM;
        const [row] = await tx
          .insert(channelInstagrams)
          .values({
            accountId: auth.accountId,
            instagramId: input.channel.instagram_id,
            accessToken: input.channel.access_token,
            expiresAt: new Date(input.channel.expires_at),
          })
          .returning({ id: channelInstagrams.id });
        channelId = row?.id;
        break;
      }
      case CHANNEL_TYPE_TO_TWITTER: {
        channelType = CHANNEL_TYPE_TO_TWITTER;
        const [row] = await tx
          .insert(channelTwitters)
          .values({
            accountId: auth.accountId,
            profileId: input.channel.profile_id,
            twitterAccessToken: input.channel.twitter_access_token,
            twitterAccessTokenSecret: input.channel.twitter_access_token_secret,
          })
          .returning({ id: channelTwitters.id });
        channelId = row?.id;
        break;
      }
    }
    if (!channelId) throw new UnprocessableError("Could not create channel");

    const [inbox] = await tx
      .insert(inboxes)
      .values({
        accountId: auth.accountId,
        channelId,
        channelType,
        name: input.name,
        enableAutoAssignment: input.enable_auto_assignment ?? true,
        greetingEnabled: input.greeting_enabled ?? false,
        greetingMessage: input.greeting_message,
        workingHoursEnabled: input.working_hours_enabled ?? false,
        outOfOfficeMessage: input.out_of_office_message,
        timezone: input.timezone ?? "UTC",
        enableEmailCollect: input.enable_email_collect ?? true,
        csatSurveyEnabled: input.csat_survey_enabled ?? false,
        allowMessagesAfterResolved: input.allow_messages_after_resolved ?? true,
        lockToSingleConversation: input.lock_to_single_conversation ?? false,
      })
      .returning({ id: inboxes.id });
    if (!inbox) throw new UnprocessableError("Could not create inbox");
    return inbox.id;
  });

  const inbox = await db.query.inboxes.findFirst({ where: (i) => eq(i.id, inboxId) });
  if (!inbox) throw new UnprocessableError("Could not create inbox");
  return toApiInbox(inbox);
}

export async function updateInbox(
  auth: AuthCtx,
  inboxId: number,
  input: UpdateInboxInput,
): Promise<ApiInbox> {
  requireAdmin(auth);
  const inbox = await findInbox(auth.accountId, inboxId);

  await db.transaction(async (tx) => {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.enable_auto_assignment !== undefined)
      patch.enableAutoAssignment = input.enable_auto_assignment;
    if (input.greeting_enabled !== undefined) patch.greetingEnabled = input.greeting_enabled;
    if (input.greeting_message !== undefined) patch.greetingMessage = input.greeting_message;
    if (input.working_hours_enabled !== undefined)
      patch.workingHoursEnabled = input.working_hours_enabled;
    if (input.out_of_office_message !== undefined)
      patch.outOfOfficeMessage = input.out_of_office_message;
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.enable_email_collect !== undefined)
      patch.enableEmailCollect = input.enable_email_collect;
    if (input.csat_survey_enabled !== undefined)
      patch.csatSurveyEnabled = input.csat_survey_enabled;
    if (input.allow_messages_after_resolved !== undefined)
      patch.allowMessagesAfterResolved = input.allow_messages_after_resolved;
    if (input.lock_to_single_conversation !== undefined)
      patch.lockToSingleConversation = input.lock_to_single_conversation;
    await tx.update(inboxes).set(patch).where(eq(inboxes.id, inbox.id));

    if (input.channel && inbox.channelType === CHANNEL_TYPE_TO_WEB_WIDGET) {
      const wp: Record<string, unknown> = { updatedAt: new Date() };
      if (input.channel.widget_color) wp.widgetColor = input.channel.widget_color;
      if (input.channel.welcome_title !== undefined)
        wp.welcomeTitle = input.channel.welcome_title ?? null;
      if (input.channel.welcome_tagline !== undefined)
        wp.welcomeTagline = input.channel.welcome_tagline ?? null;
      if (input.channel.pre_chat_form_enabled !== undefined)
        wp.preChatFormEnabled = input.channel.pre_chat_form_enabled;
      if (input.channel.hmac_mandatory !== undefined)
        wp.hmacMandatory = input.channel.hmac_mandatory;
      await tx.update(channelWebWidgets).set(wp).where(eq(channelWebWidgets.id, inbox.channelId));
    }
  });

  const fresh = await db.query.inboxes.findFirst({ where: (i) => eq(i.id, inbox.id) });
  if (!fresh) throw new NotFoundError("Inbox not found");
  return toApiInbox(fresh);
}

/** DELETE: inbox e canal via cascade (inbox_id cascade; canal tem FK da conta). */
export async function deleteInbox(auth: AuthCtx, inboxId: number): Promise<void> {
  requireAdmin(auth);
  const inbox = await findInbox(auth.accountId, inboxId);
  await db.transaction(async (tx) => {
    if (inbox.channelType === CHANNEL_TYPE_TO_WEB_WIDGET) {
      await tx.delete(channelWebWidgets).where(eq(channelWebWidgets.id, inbox.channelId));
    } else if (inbox.channelType === CHANNEL_TYPE_TO_API) {
      await tx.delete(channelApi).where(eq(channelApi.id, inbox.channelId));
    } else if (inbox.channelType === CHANNEL_TYPE_TO_EMAIL) {
      await tx.delete(channelEmail).where(eq(channelEmail.id, inbox.channelId));
    }
    await tx.delete(inboxes).where(eq(inboxes.id, inbox.id));
  });
}

// ---- Membros ----

export interface ApiInboxAgent {
  id: number;
  name: string;
  email: string;
  availability: string;
  role: string;
}

export async function listInboxMembers(auth: AuthCtx, inboxId: number): Promise<ApiInboxAgent[]> {
  const inbox = await assertInboxAccess(auth.accountId, inboxId, auth);
  void inbox;
  const memberships = await db.query.inboxMembers.findMany({
    where: (im) => eq(im.inboxId, inboxId),
    columns: { userId: true },
  });
  const agents = await listAgents(auth.accountId);
  const byId = new Map(agents.map((a) => [a.id, a]));
  return memberships
    .map((m) => byId.get(m.userId))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      availability: a.availability,
      role: a.role,
    }));
}

export async function addInboxMembers(
  auth: AuthCtx,
  inboxId: number,
  body: InboxMembersBody,
): Promise<ApiInboxAgent[]> {
  requireAdmin(auth);
  await findInbox(auth.accountId, inboxId);
  const accountAgents = await listAgents(auth.accountId);
  const valid = new Set(accountAgents.map((a) => a.id));
  const ids = body.user_ids.filter((id) => valid.has(id));
  if (ids.length === 0) {
    throw new UnprocessableError("No valid agents", { user_ids: ["agentes inválidos"] });
  }
  await db
    .insert(inboxMembers)
    .values(ids.map((userId) => ({ inboxId, userId })))
    .onConflictDoNothing();
  return listInboxMembers(auth, inboxId);
}

/** PUT = set completo da lista (add + remove), espelhando update_agents_list. */
export async function setInboxMembers(
  auth: AuthCtx,
  inboxId: number,
  body: InboxMembersBody,
): Promise<ApiInboxAgent[]> {
  requireAdmin(auth);
  await findInbox(auth.accountId, inboxId);
  const current = await db.query.inboxMembers.findMany({
    where: (im) => eq(im.inboxId, inboxId),
    columns: { userId: true },
  });
  const currentIds = new Set(current.map((c) => c.userId));
  const wanted = new Set(body.user_ids);
  const toAdd = [...wanted].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !wanted.has(id));
  if (toAdd.length > 0) {
    await db
      .insert(inboxMembers)
      .values(toAdd.map((userId) => ({ inboxId, userId })))
      .onConflictDoNothing();
  }
  if (toRemove.length > 0) {
    await db
      .delete(inboxMembers)
      .where(and(eq(inboxMembers.inboxId, inboxId), inArray(inboxMembers.userId, toRemove)));
  }
  return listInboxMembers(auth, inboxId);
}

export async function removeInboxMember(
  auth: AuthCtx,
  inboxId: number,
  userId: number,
): Promise<void> {
  requireAdmin(auth);
  await findInbox(auth.accountId, inboxId);
  await db
    .delete(inboxMembers)
    .where(and(eq(inboxMembers.inboxId, inboxId), eq(inboxMembers.userId, userId)));
}

// ---- Horário comercial ----

export async function getWorkingHours(
  accountId: number,
  inboxId: number,
): Promise<ApiWorkingHour[]> {
  const rows = await db.query.workingHours.findMany({
    where: (wh) => and(eq(wh.accountId, accountId), eq(wh.inboxId, inboxId)),
    orderBy: (wh) => wh.dayOfWeek,
  });
  return rows.map(toApiWorkingHour);
}

export async function updateWorkingHours(
  auth: AuthCtx,
  inboxId: number,
  body: WorkingHoursBody,
): Promise<ApiWorkingHour[]> {
  requireAdmin(auth);
  const inbox = await findInbox(auth.accountId, inboxId);
  await db.transaction(async (tx) => {
    await tx.delete(workingHours).where(eq(workingHours.inboxId, inbox.id));
    await tx.insert(workingHours).values(
      body.working_hours.map((wh) => ({
        inboxId: inbox.id,
        accountId: auth.accountId,
        dayOfWeek: wh.day_of_week,
        closedAllDay: wh.closed_all_day,
        openAllDay: wh.open_all_day,
        openHour: wh.open_hour ?? null,
        openMinutes: wh.open_minutes ?? null,
        closeHour: wh.close_hour ?? null,
        closeMinutes: wh.close_minutes ?? null,
      })),
    );
  });
  return getWorkingHours(auth.accountId, inboxId);
}

/** Está fora do horário agora? (banner + bloqueio de mensagens). */
export async function isOutsideWorkingHours(
  accountId: number,
  inboxId: number,
  now: Date = new Date(),
): Promise<boolean> {
  const inbox = await db.query.inboxes.findFirst({
    where: (i) => and(eq(i.accountId, accountId), eq(i.id, inboxId)),
  });
  if (!inbox?.workingHoursEnabled) return false;
  const day = now.getDay();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const minutesOfDay = hour * 60 + minutes;
  const wh = await db.query.workingHours.findFirst({
    where: (w) => and(eq(w.inboxId, inboxId), eq(w.dayOfWeek, day)),
  });
  if (!wh) return true;
  if (wh.closedAllDay) return true;
  if (wh.openAllDay) return false;
  const open = (wh.openHour ?? 9) * 60 + (wh.openMinutes ?? 0);
  const close = (wh.closeHour ?? 17) * 60 + (wh.closeMinutes ?? 0);
  return minutesOfDay < open || minutesOfDay >= close;
}

/** Agentes atribuíveis de uma inbox (exclui o usuário logado? não — Rails mantém). */
export async function listAssignableAgents(auth: AuthCtx, inboxId: number) {
  await findInbox(auth.accountId, inboxId);
  const members = await listInboxMembers(auth, inboxId);
  const memberIds = new Set(members.map((m) => m.id));
  return members.filter((m) => memberIds.has(m.id));
}
