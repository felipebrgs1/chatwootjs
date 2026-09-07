import { campaigns, contacts, conversations, db, labels, messages, taggings } from "@chatwootjs/db";
import { and, eq, inArray, sql } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { jobs } from "../jobs/index.js";
import { requireAdmin, type AuthCtx } from "../policies/index.js";
import { logAudit } from "./audit.js";
import { publish } from "../realtime/index.js";
import { toApiConversationItem } from "./conversations.js";
import { toApiMessage } from "./messages.js";

// Espelha campaigns_controller + TriggerOneoffCampaignService do Rails.

export const CAMPAIGN_TYPE_FROM_INT = ["ongoing", "one_off"] as const;
export const CAMPAIGN_STATUS_FROM_INT = ["active", "completed"] as const;

export interface ApiCampaign {
  id: number;
  display_id: number | null;
  title: string;
  message: string;
  description: string | null;
  campaign_type: string;
  campaign_status: string;
  enabled: boolean;
  inbox_id: number;
  inbox: { id: number; name: string; channel_type: string | null } | null;
  sender: { id: number; name: string } | null;
  trigger_rules: { url?: string; time_on_page?: number };
  audience: { labels?: string[] };
  scheduled_at: string | null;
}

type InboxFamily = "website" | "sms" | "whatsapp";

const FAMILY_CHANNELS: Record<InboxFamily, string[]> = {
  website: ["Channel::WebWidget"],
  sms: ["Channel::Sms", "Channel::TwilioSms"],
  whatsapp: ["Channel::Whatsapp"],
};

function familyOf(channelType: string | null): InboxFamily | null {
  if (!channelType) return null;
  for (const [family, channels] of Object.entries(FAMILY_CHANNELS)) {
    if (channels.includes(channelType)) return family as InboxFamily;
  }
  return null;
}

async function toApi(row: typeof campaigns.$inferSelect): Promise<ApiCampaign> {
  const [inbox, sender] = await Promise.all([
    db.query.inboxes.findFirst({
      where: (i) => eq(i.id, row.inboxId),
      columns: { id: true, name: true, channelType: true },
    }),
    row.senderId
      ? db.query.users.findFirst({
          where: (u) => eq(u.id, row.senderId!),
          columns: { id: true, name: true },
        })
      : null,
  ]);
  return {
    id: row.id,
    display_id: row.displayId,
    title: row.title,
    message: row.message,
    description: row.description,
    campaign_type: CAMPAIGN_TYPE_FROM_INT[row.campaignType] ?? "ongoing",
    campaign_status: CAMPAIGN_STATUS_FROM_INT[row.campaignStatus] ?? "active",
    enabled: row.enabled,
    inbox_id: row.inboxId,
    inbox: inbox ? { id: inbox.id, name: inbox.name, channel_type: inbox.channelType } : null,
    sender: sender ? { id: sender.id, name: sender.name } : null,
    trigger_rules: row.triggerRules ?? {},
    audience: row.audience ?? {},
    scheduled_at: row.scheduledAt?.toISOString() ?? null,
  };
}

async function assertCampaignInbox(accountId: number, inboxId: number) {
  const inbox = await db.query.inboxes.findFirst({
    where: (i) => and(eq(i.accountId, accountId), eq(i.id, inboxId)),
  });
  if (!inbox) throw new NotFoundError("Inbox not found");
  const family = familyOf(inbox.channelType);
  if (!family) {
    throw new UnprocessableError("Unsupported inbox type for campaigns", {
      inbox_id: ["inbox não suportada (use Website, SMS ou WhatsApp)"],
    });
  }
  return { inbox, family };
}

/** ongoing exige URL http(s) em inbox Website (igual ao Rails). */
function assertTriggerUrl(family: InboxFamily, url?: string): void {
  if (!url || family !== "website") return;
  if (!/^https?:\/\//i.test(url)) {
    throw new UnprocessableError("Invalid campaign URL", {
      trigger_rules: ["URL deve começar com http(s)://"],
    });
  }
}

export async function listCampaigns(
  accountId: number,
  campaignType?: "ongoing" | "one_off",
): Promise<ApiCampaign[]> {
  const rows = await db.query.campaigns.findMany({
    where: (c) =>
      campaignType
        ? and(eq(c.accountId, accountId), eq(c.campaignType, campaignType === "one_off" ? 1 : 0))
        : eq(c.accountId, accountId),
  });
  // Filtra pela família de canal da inbox (ongoing=Website, one_off=SMS/WhatsApp),
  // igual aos getters LiveChat/SMS/WhatsApp do Vue.
  const wanted =
    campaignType === "ongoing"
      ? FAMILY_CHANNELS.website
      : campaignType === "one_off"
        ? [...FAMILY_CHANNELS.sms, ...FAMILY_CHANNELS.whatsapp]
        : null;
  if (!wanted) return Promise.all(rows.map(toApi));
  const boxes = await db.query.inboxes.findMany({
    where: (i) => and(eq(i.accountId, accountId), inArray(i.channelType, wanted)),
    columns: { id: true },
  });
  const ids = new Set(boxes.map((b) => b.id));
  return Promise.all(rows.filter((r) => ids.has(r.inboxId)).map(toApi));
}

export async function findCampaign(accountId: number, id: number) {
  const row = await db.query.campaigns.findFirst({
    where: (c) => and(eq(c.accountId, accountId), eq(c.id, id)),
  });
  if (!row) throw new NotFoundError("Campaign not found");
  return row;
}

function parseScheduledAt(raw?: string): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new UnprocessableError("Invalid scheduled_at", {
      scheduled_at: ["data inválida"],
    });
  }
  return date;
}

export async function createCampaign(
  accountId: number,
  auth: AuthCtx,
  input: {
    inbox_id: number;
    title: string;
    message: string;
    description?: string;
    campaign_type?: "ongoing" | "one_off";
    trigger_rules?: { url?: string; time_on_page?: number };
    audience?: { labels?: string[] };
    scheduled_at?: string;
  },
): Promise<ApiCampaign> {
  requireAdmin(auth);
  // O tipo é forçado pela inbox (igual ao ensure_correct_campaign_attributes):
  // SMS/WhatsApp => one_off (agenda default agora); Website => ongoing.
  const { family } = await assertCampaignInbox(accountId, input.inbox_id);
  assertTriggerUrl(family, input.trigger_rules?.url);
  const forcedType = family === "website" ? 0 : 1;
  const scheduledAt =
    family === "website" ? null : (parseScheduledAt(input.scheduled_at) ?? new Date());
  const displayId =
    (await db
      .select({ max: sql<number | null>`max(${campaigns.displayId})` })
      .from(campaigns)
      .where(eq(campaigns.accountId, accountId))
      .then((r) => r[0]?.max ?? 0)) + 1;
  const [row] = await db
    .insert(campaigns)
    .values({
      accountId,
      inboxId: input.inbox_id,
      title: input.title,
      message: input.message,
      description: input.description || null,
      campaignType: forcedType,
      triggerRules: input.trigger_rules ?? {},
      audience: input.audience ?? {},
      scheduledAt,
      displayId,
      senderId: auth.userId,
      enabled: true,
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create campaign");
  void logAudit(accountId, auth.userId, "create", "Campaign", row.id, {});
  return toApi(row);
}

export async function updateCampaign(
  accountId: number,
  auth: AuthCtx,
  id: number,
  input: Partial<{
    inbox_id: number;
    title: string;
    message: string;
    description: string;
    trigger_rules: { url?: string; time_on_page?: number };
    audience: { labels?: string[] };
    scheduled_at: string | null;
    enabled: boolean;
  }>,
): Promise<ApiCampaign> {
  requireAdmin(auth);
  const row = await findCampaign(accountId, id);
  if (row.campaignStatus === 1) {
    throw new UnprocessableError("Completed campaign cannot be updated", {
      campaign_status: ["campanha concluída não pode ser alterada"],
    });
  }
  const nextInboxId = input.inbox_id ?? row.inboxId;
  const { family } = await assertCampaignInbox(accountId, nextInboxId);
  if (input.trigger_rules !== undefined) {
    assertTriggerUrl(family, input.trigger_rules?.url);
  }
  const [updated] = await db
    .update(campaigns)
    .set({
      inboxId: nextInboxId,
      // Trocar de inbox refaz o tipo (Website=ongoing, SMS/WhatsApp=one_off).
      campaignType: family === "website" ? 0 : 1,
      title: input.title ?? row.title,
      message: input.message ?? row.message,
      description: input.description !== undefined ? input.description || null : row.description,
      triggerRules: input.trigger_rules ?? row.triggerRules,
      audience: input.audience ?? row.audience,
      scheduledAt:
        input.scheduled_at !== undefined
          ? input.scheduled_at
            ? parseScheduledAt(input.scheduled_at)
            : null
          : row.scheduledAt,
      enabled: input.enabled ?? row.enabled,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, row.id))
    .returning();
  if (!updated) throw new NotFoundError("Campaign not found");
  void logAudit(accountId, auth.userId, "update", "Campaign", row.id, {});
  return toApi(updated);
}

export async function deleteCampaign(accountId: number, auth: AuthCtx, id: number): Promise<void> {
  requireAdmin(auth);
  const row = await findCampaign(accountId, id);
  await db.delete(campaigns).where(eq(campaigns.id, row.id));
  void logAudit(accountId, auth.userId, "destroy", "Campaign", row.id, {});
}

// ---- Audiência ----

export interface AudiencePreview {
  count: number;
  sample: Array<{ id: number; name: string; email: string | null }>;
}

/** Contatos com contact_inbox na inbox, filtrados pelos labels da audiência. */
export async function audienceContacts(
  accountId: number,
  campaign: typeof campaigns.$inferSelect,
  limit = 500,
  offset = 0,
): Promise<Array<typeof contacts.$inferSelect>> {
  const wanted = (campaign.audience?.labels ?? []).map((l) => l.toLowerCase());
  const cis = await db.query.contactInboxes.findMany({
    where: (ci) => eq(ci.inboxId, campaign.inboxId),
    columns: { contactId: true },
    limit,
    offset,
  });
  if (cis.length === 0) return [];
  const ids = [...new Set(cis.map((ci) => ci.contactId))];
  const rows = await db.query.contacts.findMany({
    where: (ct) => and(eq(ct.accountId, accountId), inArray(ct.id, ids)),
  });
  if (wanted.length === 0) return rows;
  const tagged = await db
    .select({ taggableId: taggings.taggableId, title: labels.title })
    .from(taggings)
    .innerJoin(labels, eq(labels.id, taggings.tagId))
    .where(
      and(
        eq(taggings.accountId, accountId),
        eq(taggings.taggableType, "Contact"),
        eq(taggings.context, "labels"),
        inArray(taggings.taggableId, ids),
      ),
    );
  const byContact = new Map<number, Set<string>>();
  for (const t of tagged) {
    const set = byContact.get(t.taggableId) ?? new Set<string>();
    if (t.title) set.add(t.title.toLowerCase());
    byContact.set(t.taggableId, set);
  }
  return rows.filter((c) => wanted.some((w) => byContact.get(c.id)?.has(w)));
}

export async function audiencePreview(accountId: number, id: number): Promise<AudiencePreview> {
  const campaign = await findCampaign(accountId, id);
  // Conta sem paginar para o preview bater com o disparo real.
  const all = await audienceContacts(accountId, campaign, 100_000, 0);
  return {
    count: all.length,
    sample: all.slice(0, 10).map((c) => ({ id: c.id, name: c.name, email: c.email })),
  };
}

// ---- Disparo one_off ----

export async function triggerCampaign(
  accountId: number,
  auth: AuthCtx,
  id: number,
): Promise<{ queued: boolean }> {
  requireAdmin(auth);
  const campaign = await findCampaign(accountId, id);
  if (campaign.campaignType !== 1) {
    throw new UnprocessableError("Only one-off campaigns can be triggered", {
      campaign_type: ["só one_off pode ser disparada"],
    });
  }
  if (campaign.campaignStatus === 1) {
    throw new UnprocessableError("Campaign already completed", {
      campaign_status: ["campanha já concluída"],
    });
  }
  await jobs.dispatch({
    name: "campaign.oneoff",
    payload: { accountId, campaignId: campaign.id },
  });
  return { queued: true };
}

const BATCH = 100;

async function alreadySent(
  accountId: number,
  campaignId: number,
  conversationId: number,
): Promise<boolean> {
  const rows = await db.query.messages.findMany({
    where: (m) =>
      and(eq(m.accountId, accountId), eq(m.conversationId, conversationId), eq(m.messageType, 1)),
    columns: { contentAttributes: true },
    limit: 50,
  });
  return rows.some(
    (r) =>
      r.contentAttributes &&
      typeof r.contentAttributes === "object" &&
      (r.contentAttributes as Record<string, unknown>).campaign_id === campaignId,
  );
}

/** Handler do job `campaign.oneoff` (idempotente: rerun não duplica). */
export function registerCampaignJob(): void {
  jobs.on("campaign.oneoff", async (payload) => {
    const { accountId, campaignId } = payload as { accountId: number; campaignId: number };
    const campaign = await db.query.campaigns.findFirst({
      where: (c) => and(eq(c.accountId, accountId), eq(c.id, campaignId)),
    });
    if (!campaign || campaign.campaignStatus === 1) return;
    let sent = 0;
    let failed = 0;
    let offset = 0;
    for (;;) {
      const batch = await audienceContacts(accountId, campaign, BATCH, offset);
      if (batch.length === 0) break;
      offset += batch.length;
      for (const contact of batch) {
        try {
          const ci = await db.query.contactInboxes.findFirst({
            where: (row) => and(eq(row.contactId, contact.id), eq(row.inboxId, campaign.inboxId)),
          });
          if (!ci) {
            failed += 1;
            continue;
          }
          let conv = await db.query.conversations.findFirst({
            where: (c) =>
              and(
                eq(c.accountId, accountId),
                eq(c.inboxId, campaign.inboxId),
                eq(c.contactId, contact.id),
                eq(c.status, 0),
              ),
          });
          if (!conv) {
            const displayId =
              (await db
                .select({ max: sql<number | null>`max(${conversations.displayId})` })
                .from(conversations)
                .where(eq(conversations.accountId, accountId))
                .then((r) => r[0]?.max ?? 0)) + 1;
            const [created] = await db
              .insert(conversations)
              .values({
                accountId,
                inboxId: campaign.inboxId,
                contactId: contact.id,
                contactInboxId: ci.id,
                displayId,
                uuid: crypto.randomUUID(),
                status: 0,
                lastActivityAt: new Date(),
              })
              .returning();
            conv = created ?? undefined;
          }
          if (!conv) {
            failed += 1;
            continue;
          }
          if (await alreadySent(accountId, campaign.id, conv.id)) continue;
          const [msg] = await db
            .insert(messages)
            .values({
              accountId,
              inboxId: campaign.inboxId,
              conversationId: conv.id,
              messageType: 1,
              private: false,
              status: 0,
              content: campaign.message,
              senderType: null,
              senderId: null,
              contentAttributes: { campaign_id: campaign.id },
            })
            .returning();
          if (!msg) {
            failed += 1;
            continue;
          }
          await db
            .update(conversations)
            .set({ lastActivityAt: new Date(), updatedAt: new Date() })
            .where(eq(conversations.id, conv.id));
          const { findConversation } = await import("./conversations.js");
          publish(accountId, "message.created", {
            ...(await toApiMessage(msg)),
            conversation_id: conv.id,
          });
          publish(
            accountId,
            "conversation.updated",
            await toApiConversationItem(await findConversation(accountId, conv.id)),
          );
          sent += 1;
        } catch (err) {
          failed += 1;
          console.error(`[campaign.oneoff] contato ${contact.id}`, err);
        }
      }
      if (batch.length < BATCH) break;
    }
    await db
      .update(campaigns)
      .set({ campaignStatus: 1, updatedAt: new Date() })
      .where(eq(campaigns.id, campaign.id));
    console.log(`[campaign.oneoff] campanha ${campaign.id}: ${sent} enviadas, ${failed} falhas`);
  });
}

// ---- Ongoing (widget) ----

export interface OngoingCampaign {
  id: number;
  title: string;
  message: string;
  trigger_rules: { url?: string; time_on_page?: number };
}

/** Campanhas ongoing ativas+habilitadas da inbox (o widget avalia URL + tempo). */
export async function listActiveOngoingCampaigns(
  accountId: number,
  inboxId: number,
): Promise<OngoingCampaign[]> {
  const rows = await db.query.campaigns.findMany({
    where: (c) =>
      and(
        eq(c.accountId, accountId),
        eq(c.inboxId, inboxId),
        eq(c.campaignType, 0),
        eq(c.campaignStatus, 0),
        eq(c.enabled, true),
      ),
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    trigger_rules: r.triggerRules ?? {},
  }));
}
