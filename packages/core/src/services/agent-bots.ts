/**
 * M12 — AgentBots: bots de webhook por inbox + stub Captain (`bot_type=1`).
 *
 * Fluxo webhook (`bot_type=0`): mensagem incoming numa inbox vinculada →
 * `registerAgentBotForwarder` POST o evento em `outgoing_url` (10s timeout,
 * fire-and-forget). A resposta do bot entra por
 * `POST .../agent_bots/:id/webhook {conversation_id?, content, secret?}`
 * e vira mensagem outgoing com `sender_type="AgentBot"`.
 *
 * Referência: `agent_bot`, `agent_bot_inbox` do Rails + Bot API.
 */
import { agentBotInboxes, agentBots, conversations, db, messages } from "@chatwootjs/db";
import { and, eq } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { requireAdmin, type AuthCtx } from "../policies/index.js";
import { publish, subscribe } from "../realtime/index.js";
import { toApiMessage } from "./messages.js";
import type {
  AgentBotWebhookInput,
  CreateAgentBotInput,
  UpdateAgentBotInput,
} from "../schemas/ops.js";
import { logAudit } from "./audit.js";

export interface ApiAgentBot {
  id: number;
  name: string | null;
  description: string | null;
  outgoing_url: string | null;
  bot_type: string;
  account_id: number | null;
}

const BOT_TYPE_FROM_INT = ["webhook", "captain"] as const;

function toApi(row: typeof agentBots.$inferSelect): ApiAgentBot {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    outgoing_url: row.outgoingUrl,
    bot_type: BOT_TYPE_FROM_INT[row.botType] ?? "webhook",
    account_id: row.accountId,
  };
}

export async function listAgentBots(accountId: number): Promise<ApiAgentBot[]> {
  const rows = await db.query.agentBots.findMany({
    where: (b) => eq(b.accountId, accountId),
  });
  return rows.map(toApi);
}

export async function createAgentBot(
  accountId: number,
  auth: AuthCtx,
  input: CreateAgentBotInput,
): Promise<ApiAgentBot> {
  requireAdmin(auth);
  const [row] = await db
    .insert(agentBots)
    .values({
      accountId,
      name: input.name,
      description: input.description,
      outgoingUrl: input.outgoing_url,
      botType: input.bot_type ?? 0,
      botConfig: input.bot_config ?? {},
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create bot");
  void logAudit(accountId, auth.userId, "create", "AgentBot", row.id, {});
  return toApi(row);
}

export async function updateAgentBot(
  accountId: number,
  auth: AuthCtx,
  id: number,
  input: UpdateAgentBotInput,
): Promise<ApiAgentBot> {
  requireAdmin(auth);
  const existing = await db.query.agentBots.findFirst({
    where: (b) => and(eq(b.id, id), eq(b.accountId, accountId)),
  });
  if (!existing) throw new NotFoundError("Bot not found");
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.outgoing_url !== undefined) patch.outgoingUrl = input.outgoing_url || null;
  if (input.bot_type !== undefined) patch.botType = input.bot_type;
  if (input.bot_config !== undefined) patch.botConfig = input.bot_config;
  const [row] = await db.update(agentBots).set(patch).where(eq(agentBots.id, id)).returning();
  if (!row) throw new NotFoundError("Bot not found");
  void logAudit(accountId, auth.userId, "update", "AgentBot", id, {});
  return toApi(row);
}

export async function deleteAgentBot(accountId: number, auth: AuthCtx, id: number): Promise<void> {
  requireAdmin(auth);
  const deleted = await db
    .delete(agentBots)
    .where(and(eq(agentBots.id, id), eq(agentBots.accountId, accountId)))
    .returning({ id: agentBots.id });
  if (deleted.length === 0) throw new NotFoundError("Bot not found");
  void logAudit(accountId, auth.userId, "destroy", "AgentBot", id, {});
}

/** Vincula/desvincula o bot da inbox (`agent_bot_id: null` remove). */
export async function setInboxAgentBot(
  accountId: number,
  auth: AuthCtx,
  inboxId: number,
  agentBotId: number | null,
): Promise<{ inbox_id: number; agent_bot_id: number | null }> {
  requireAdmin(auth);
  const inbox = await db.query.inboxes.findFirst({
    where: (i) => and(eq(i.id, inboxId), eq(i.accountId, accountId)),
  });
  if (!inbox) throw new NotFoundError("Inbox not found");
  await db.delete(agentBotInboxes).where(eq(agentBotInboxes.inboxId, inboxId));
  if (agentBotId !== null) {
    const bot = await db.query.agentBots.findFirst({
      where: (b) => and(eq(b.id, agentBotId), eq(b.accountId, accountId)),
    });
    if (!bot) throw new NotFoundError("Bot not found");
    await db.insert(agentBotInboxes).values({ inboxId, agentBotId, accountId, status: 0 });
  }
  void logAudit(accountId, auth.userId, "update", "Inbox", inboxId, {
    agent_bot_id: agentBotId,
  });
  return { inbox_id: inboxId, agent_bot_id: agentBotId };
}

export async function getInboxAgentBot(
  accountId: number,
  inboxId: number,
): Promise<ApiAgentBot | null> {
  const link = await db.query.agentBotInboxes.findFirst({
    where: (l) => and(eq(l.inboxId, inboxId), eq(l.accountId, accountId)),
  });
  if (!link?.agentBotId) return null;
  const bot = await db.query.agentBots.findFirst({ where: (b) => eq(b.id, link.agentBotId!) });
  return bot ? toApi(bot) : null;
}

/**
 * Resposta do bot externo (Bot API): valida `secret` quando o bot tem um
 * e cria a mensagem outgoing. `conversation_id` pode ser omitido se a
 * conversa for a última aberta da... não — é obrigatório (sem adivinhação).
 */
export async function receiveAgentBotWebhook(
  accountId: number,
  botId: number,
  input: AgentBotWebhookInput,
): Promise<{ message_id: number }> {
  const bot = await db.query.agentBots.findFirst({
    where: (b) => and(eq(b.id, botId), eq(b.accountId, accountId)),
  });
  if (!bot) throw new NotFoundError("Bot not found");
  if (bot.secret && input.secret !== bot.secret) {
    throw new NotFoundError("Bot not found");
  }
  if (!input.conversation_id) throw new UnprocessableError("conversation_id é obrigatório");
  const conv = await db.query.conversations.findFirst({
    where: (c) => and(eq(c.id, input.conversation_id!), eq(c.accountId, accountId)),
  });
  if (!conv) throw new NotFoundError("Conversation not found");

  const [row] = await db
    .insert(messages)
    .values({
      accountId,
      inboxId: conv.inboxId,
      conversationId: conv.id,
      messageType: 1,
      private: false,
      status: 0,
      content: input.content,
      contentType: 0,
      senderType: "AgentBot",
      senderId: bot.id,
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create message");
  await db
    .update(conversations)
    .set({ lastActivityAt: new Date(), updatedAt: new Date() })
    .where(eq(conversations.id, conv.id));
  publish(accountId, "message.created", { ...(await toApiMessage(row)), conversation_id: conv.id });
  return { message_id: row.id };
}

/**
 * Encaminhador automático (boot do server): incoming → POST no
 * `outgoing_url` do bot vinculado (só `bot_type=webhook` com URL).
 */
export function registerAgentBotForwarder(): void {
  const g = globalThis as Record<string, unknown>;
  if (g.__cw_agentbot_registered) return;
  g.__cw_agentbot_registered = true;

  subscribe("message.created", ({ accountId, data }) => {
    void (async () => {
      try {
        const msg = data as {
          id?: number;
          message_type?: string;
          conversation_id?: number;
          content?: string | null;
        };
        if (msg.message_type !== "incoming" || !msg.conversation_id) return;
        const conv = await db.query.conversations.findFirst({
          where: (c) => and(eq(c.id, msg.conversation_id!), eq(c.accountId, accountId)),
          columns: { id: true, inboxId: true },
        });
        if (!conv) return;
        const link = await db.query.agentBotInboxes.findFirst({
          where: (l) => eq(l.inboxId, conv.inboxId),
        });
        if (!link?.agentBotId) return;
        const bot = await db.query.agentBots.findFirst({
          where: (b) => eq(b.id, link.agentBotId!),
        });
        if (!bot?.outgoingUrl || bot.botType !== 0) return;
        await fetch(bot.outgoingUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "message.created",
            account_id: accountId,
            conversation_id: conv.id,
            message_id: msg.id,
            content: msg.content,
          }),
          signal: AbortSignal.timeout(10_000),
        }).catch((err) => console.error("[agent-bot] forward falhou", err));
      } catch (err) {
        console.error("[agent-bot]", err);
      }
    })();
  });
}
