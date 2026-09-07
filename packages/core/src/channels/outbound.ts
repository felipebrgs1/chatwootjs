/**
 * M10 — Outbound: mensagem `outgoing` do dashboard → plataforma.
 *
 * Fluxo: `sendAgentMessage` (M4) cria a mensagem e despacha o job
 * `channel:send` (fire-and-forget). O job carrega a inbox + credenciais
 * `channel_*`, chama `provider.send` e atualiza `messages.status/source_id`:
 * sucesso → `sent` + `source_id`; falha → `failed` com o motivo em
 * `content_attributes.channel_error` (visível no thread).
 */
import { db, messages } from "@chatwootjs/db";
import { and, eq } from "drizzle-orm";

import { jobs } from "../jobs/index.js";
import { providerFor } from "./providers.js";
import type { OutboundContext, OutboundMessage } from "./types.js";

function toSnakeKeys(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row ?? {})) {
    out[k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)] = v;
  }
  return out;
}

async function loadChannelContext(
  accountId: number,
  inboxId: number,
): Promise<OutboundContext | null> {
  const inbox = await db.query.inboxes.findFirst({
    where: (i) => and(eq(i.accountId, accountId), eq(i.id, inboxId)),
  });
  if (!inbox) return null;
  let row: Record<string, unknown> | null = null;
  switch (inbox.channelType) {
    case "Channel::Telegram":
      row =
        ((await db.query.channelTelegrams.findFirst({
          where: (c) => eq(c.id, inbox.channelId),
        })) as unknown as Record<string, unknown> | undefined) ?? null;
      break;
    case "Channel::Whatsapp":
      row =
        ((await db.query.channelWhatsapps.findFirst({
          where: (c) => eq(c.id, inbox.channelId),
        })) as unknown as Record<string, unknown> | undefined) ?? null;
      break;
    case "Channel::FacebookPage":
      row =
        ((await db.query.channelFacebookPages.findFirst({
          where: (c) => eq(c.id, inbox.channelId),
        })) as unknown as Record<string, unknown> | undefined) ?? null;
      break;
    case "Channel::Instagram":
      row =
        ((await db.query.channelInstagrams.findFirst({
          where: (c) => eq(c.id, inbox.channelId),
        })) as unknown as Record<string, unknown> | undefined) ?? null;
      break;
    case "Channel::TwitterProfile":
      row =
        ((await db.query.channelTwitters.findFirst({
          where: (c) => eq(c.id, inbox.channelId),
        })) as unknown as Record<string, unknown> | undefined) ?? null;
      break;
    case "Channel::Sms":
      row =
        ((await db.query.channelSms.findFirst({
          where: (c) => eq(c.id, inbox.channelId),
        })) as unknown as Record<string, unknown> | undefined) ?? null;
      break;
    case "Channel::Email":
      row =
        ((await db.query.channelEmail.findFirst({
          where: (c) => eq(c.id, inbox.channelId),
        })) as unknown as Record<string, unknown> | undefined) ?? null;
      break;
    case "Channel::Line":
      row =
        ((await db.query.channelLines.findFirst({
          where: (c) => eq(c.id, inbox.channelId),
        })) as unknown as Record<string, unknown> | undefined) ?? null;
      break;
    case "Channel::Api":
      row =
        ((await db.query.channelApi.findFirst({
          where: (c) => eq(c.id, inbox.channelId),
        })) as unknown as Record<string, unknown> | undefined) ?? null;
      break;
    case "Channel::WebWidget":
      row =
        ((await db.query.channelWebWidgets.findFirst({
          where: (c) => eq(c.id, inbox.channelId),
        })) as unknown as Record<string, unknown> | undefined) ?? null;
      break;
    default:
      row = null;
  }
  if (!row) return null;
  return {
    accountId,
    inboxId,
    channelType: inbox.channelType ?? "",
    // Providers leem snake_case (ex.: `botToken` → `botToken`? não:
    // convertemos para snake para casar com `cfg(ctx, "bot_token")`).
    channelConfig: { ...toSnakeKeys(row), ...row },
    inboxName: inbox.name ?? "",
  };
}

/** Despacha o envio (fire-and-forget, chamado pelo M4 após criar outgoing). */
export async function dispatchChannelSend(
  accountId: number,
  conversationId: number,
  messageId: number,
): Promise<void> {
  try {
    await jobs.dispatch({
      name: "channel:send",
      payload: { accountId, conversationId, messageId },
    });
  } catch (err) {
    console.error("[channel:send] dispatch falhou", err);
  }
}

/** Handler do job `channel:send` (registrado no boot do server). */
export function registerChannelSendJob(): void {
  jobs.on("channel:send", async (payload) => {
    const { accountId, conversationId, messageId } = payload as {
      accountId: number;
      conversationId: number;
      messageId: number;
    };
    const msg = await db.query.messages.findFirst({
      where: (m) => and(eq(m.id, messageId), eq(m.accountId, accountId)),
    });
    if (!msg || msg.messageType !== 1 || msg.private) return;

    const conv = await db.query.conversations.findFirst({
      where: (c) => and(eq(c.id, conversationId), eq(c.accountId, accountId)),
    });
    if (!conv) return;

    const ctx = await loadChannelContext(accountId, conv.inboxId);
    if (!ctx) return;
    const provider = providerFor(ctx.channelType);
    // WebWidget/API/Voice-stub e canais sem provider: nada a enviar.
    if (
      !provider ||
      ctx.channelType === "Channel::WebWidget" ||
      ctx.channelType === "Channel::Api"
    ) {
      return;
    }

    const atts = await db.query.attachments.findMany({
      where: (a) => eq(a.messageId, msg.id),
    });
    let contactSourceId: string | null = null;
    let contactEmail: string | null = null;
    let contactPhone: string | null = null;
    if (conv.contactInboxId) {
      const ci = await db.query.contactInboxes.findFirst({
        where: (c) => eq(c.id, conv.contactInboxId!),
      });
      contactSourceId = ci?.sourceId ?? null;
    }
    if (conv.contactId) {
      const contact = await db.query.contacts.findFirst({
        where: (c) => eq(c.id, conv.contactId!),
        columns: { email: true, phoneNumber: true },
      });
      contactEmail = contact?.email ?? null;
      contactPhone = contact?.phoneNumber ?? null;
    }

    const outbound: OutboundMessage = {
      messageId: msg.id,
      accountId,
      conversationId,
      inboxId: conv.inboxId,
      content: msg.content,
      attachments: atts.map((a) => ({
        url: a.externalUrl,
        fileType: String(a.fileType),
        fallbackTitle: a.fallbackTitle,
      })),
      contactSourceId,
      contactEmail,
      contactPhone,
    };

    try {
      const result = await provider.send(ctx, outbound);
      const patch: Record<string, unknown> = { status: 0 };
      if (result.sourceId) patch.sourceId = result.sourceId;
      await db.update(messages).set(patch).where(eq(messages.id, msg.id));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const attrs = { ...msg.contentAttributes, channel_error: reason };
      await db
        .update(messages)
        .set({ status: 3, contentAttributes: attrs })
        .where(eq(messages.id, msg.id));
      const { publish } = await import("../realtime/index.js");
      const { toApiMessage } = await import("../services/messages.js");
      const fresh = await db.query.messages.findFirst({ where: (m) => eq(m.id, msg.id) });
      if (fresh) {
        publish(accountId, "message.created", {
          ...(await toApiMessage(fresh)),
          conversation_id: conversationId,
        });
      }
    }
  });
}

export { loadChannelContext };
