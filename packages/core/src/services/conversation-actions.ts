import {
  conversations as conversationsTable,
  db,
  labels,
  messages,
  taggings,
} from "@chatwootjs/db";
import { and, eq } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { publish } from "../realtime/index.js";
import { PRIORITY_TO_INT, STATUS_FROM_INT, STATUS_TO_INT } from "../schemas/conversations.js";
import type { ActionItem } from "../schemas/automation.js";
import { createActivityMessage, findConversation, toApiConversationItem } from "./conversations.js";
import { toApiMessage } from "./messages.js";
import { deliverWebhookUrl } from "./webhooks.js";

// Executor compartilhado de ações `{ action_name, action_params }` — usado
// por macros e automações (mesmo formato do Rails). Parâmetros chegam como
// array de primitivos, ex.: `{ action_name: "assign_team", action_params: [3] }`.

function strParam(params: unknown[], index = 0): string | null {
  const value = params[index];
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === "" ? null : s;
}

function numParam(params: unknown[], index = 0): number | null {
  const value = params[index];
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

export function validateActionItems(
  actions: ActionItem[],
  allowed: readonly string[],
  field: "actions" = "actions",
): void {
  const unknown = actions.map((a) => a.action_name).filter((name) => !allowed.includes(name));
  if (unknown.length > 0) {
    throw new UnprocessableError(`Unsupported actions: ${[...new Set(unknown)].join(", ")}`, {
      [field]: [`ações não suportadas: ${[...new Set(unknown)].join(", ")}`],
    });
  }
}

export interface ApplyActionsOptions {
  /** Nome exibido nas activity messages ("Macro X", "Automação Y"). */
  actorName?: string;
  /** Evento que originou a execução (para o payload do send_webhook_event). */
  event?: string;
}

async function currentLabels(conversationId: number): Promise<string[]> {
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

async function ensureLabel(accountId: number, title: string) {
  const normalized = title.trim().toLowerCase();
  const existing = await db.query.labels.findFirst({
    where: (l) => and(eq(l.accountId, accountId), eq(l.title, normalized)),
  });
  if (existing) return existing;
  const [created] = await db.insert(labels).values({ accountId, title: normalized }).returning();
  if (!created) throw new UnprocessableError("Could not create label");
  return created;
}

async function refreshLabelCache(accountId: number, conversationId: number): Promise<void> {
  const list = await currentLabels(conversationId);
  await db
    .update(conversationsTable)
    .set({ cachedLabelList: list.join(", "), updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));
  void accountId;
}

/**
 * Aplica N ações a uma conversa. Idempotente: repetir a mesma ação no mesmo
 * estado não duplica efeitos (assign igual, label já presente, status igual).
 * Retorna os nomes aplicados.
 */
export async function applyActionItems(
  accountId: number,
  conversationId: number,
  actions: ActionItem[],
  opts: ApplyActionsOptions = {},
): Promise<string[]> {
  const applied: string[] = [];
  const actor = opts.actorName ?? "Automação";
  let conv = await findConversation(accountId, conversationId);
  let changed = false;

  for (const action of actions) {
    const params = action.action_params ?? [];
    switch (action.action_name) {
      case "assign_agent": {
        const agentId = numParam(params);
        if (agentId === null) throw new UnprocessableError("assign_agent needs an agent id");
        const membership = await db.query.accountUsers.findFirst({
          where: (au) => and(eq(au.userId, agentId), eq(au.accountId, accountId)),
        });
        if (!membership) throw new NotFoundError("Agent not found");
        if (conv.assigneeId !== agentId) {
          const user = await db.query.users.findFirst({ where: (u) => eq(u.id, agentId) });
          await db
            .update(conversationsTable)
            .set({ assigneeId: agentId, updatedAt: new Date() })
            .where(eq(conversationsTable.id, conv.id));
          await createActivityMessage(
            conv,
            `Conversation was assigned to ${user?.name ?? "agente"} by ${actor}`,
          );
          conv = await findConversation(accountId, conv.id);
          changed = true;
        }
        applied.push(action.action_name);
        break;
      }
      case "remove_assigned_agent": {
        if (conv.assigneeId !== null) {
          await db
            .update(conversationsTable)
            .set({ assigneeId: null, updatedAt: new Date() })
            .where(eq(conversationsTable.id, conv.id));
          await createActivityMessage(conv, `Conversation was unassigned by ${actor}`);
          conv = await findConversation(accountId, conv.id);
          changed = true;
        }
        applied.push(action.action_name);
        break;
      }
      case "assign_team": {
        const teamId = numParam(params);
        if (teamId === null) throw new UnprocessableError("assign_team needs a team id");
        const team = await db.query.teams.findFirst({
          where: (t) => and(eq(t.accountId, accountId), eq(t.id, teamId)),
        });
        if (!team) throw new NotFoundError("Team not found");
        if (conv.teamId !== teamId) {
          await db
            .update(conversationsTable)
            .set({ teamId, updatedAt: new Date() })
            .where(eq(conversationsTable.id, conv.id));
          await createActivityMessage(
            conv,
            `Conversation was assigned to team ${team.name} by ${actor}`,
          );
          conv = await findConversation(accountId, conv.id);
          changed = true;
        }
        applied.push(action.action_name);
        break;
      }
      case "remove_assigned_team": {
        if (conv.teamId !== null) {
          await db
            .update(conversationsTable)
            .set({ teamId: null, updatedAt: new Date() })
            .where(eq(conversationsTable.id, conv.id));
          await createActivityMessage(conv, `Team was removed by ${actor}`);
          conv = await findConversation(accountId, conv.id);
          changed = true;
        }
        applied.push(action.action_name);
        break;
      }
      case "add_label":
      case "remove_label": {
        const raw = params.length > 1 ? params : (params[0] as unknown);
        const titles = (Array.isArray(raw) ? raw : [raw])
          .map((t) =>
            String(t ?? "")
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean);
        if (titles.length === 0)
          throw new UnprocessableError(`${action.action_name} needs a label`);
        const have = new Set(await currentLabels(conv.id));
        if (action.action_name === "add_label") {
          const fresh: string[] = [];
          for (const title of titles) {
            if (have.has(title)) continue;
            const label = await ensureLabel(accountId, title);
            await db
              .insert(taggings)
              .values({
                tagId: label.id,
                taggableType: "Conversation",
                taggableId: conv.id,
                accountId,
                context: "labels",
              })
              .onConflictDoNothing();
            fresh.push(title);
          }
          if (fresh.length > 0) {
            await refreshLabelCache(accountId, conv.id);
            await createActivityMessage(conv, `Labels ${fresh.join(", ")} added by ${actor}`);
            changed = true;
          }
        } else {
          const doomed = titles.filter((t) => have.has(t));
          for (const title of doomed) {
            const label = await db.query.labels.findFirst({
              where: (l) => and(eq(l.accountId, accountId), eq(l.title, title)),
            });
            if (label) {
              await db
                .delete(taggings)
                .where(
                  and(
                    eq(taggings.tagId, label.id),
                    eq(taggings.taggableType, "Conversation"),
                    eq(taggings.taggableId, conv.id),
                  ),
                );
            }
          }
          if (doomed.length > 0) {
            await refreshLabelCache(accountId, conv.id);
            await createActivityMessage(conv, `Labels ${doomed.join(", ")} removed by ${actor}`);
            changed = true;
          }
        }
        applied.push(action.action_name);
        break;
      }
      case "send_message": {
        const content = strParam(params);
        if (!content) throw new UnprocessableError("send_message needs content");
        const [row] = await db
          .insert(messages)
          .values({
            accountId,
            inboxId: conv.inboxId,
            conversationId: conv.id,
            messageType: 1,
            private: false,
            status: 0,
            content,
            senderType: null,
            senderId: null,
          })
          .returning();
        if (!row) throw new UnprocessableError("Could not send message");
        await db
          .update(conversationsTable)
          .set({ lastActivityAt: new Date(), updatedAt: new Date() })
          .where(eq(conversationsTable.id, conv.id));
        publish(accountId, "message.created", {
          ...(await toApiMessage(row)),
          conversation_id: conv.id,
        });
        conv = await findConversation(accountId, conv.id);
        changed = true;
        applied.push(action.action_name);
        break;
      }
      case "add_private_note": {
        const content = strParam(params);
        if (!content) throw new UnprocessableError("add_private_note needs content");
        const [row] = await db
          .insert(messages)
          .values({
            accountId,
            inboxId: conv.inboxId,
            conversationId: conv.id,
            messageType: 1,
            private: true,
            status: 0,
            content,
            senderType: null,
            senderId: null,
          })
          .returning();
        if (!row) throw new UnprocessableError("Could not add note");
        publish(accountId, "message.created", {
          ...(await toApiMessage(row)),
          conversation_id: conv.id,
        });
        applied.push(action.action_name);
        break;
      }
      case "change_status":
      case "resolve_conversation":
      case "open_conversation":
      case "pending_conversation": {
        const status =
          action.action_name === "change_status"
            ? (strParam(params) ?? "")
            : action.action_name === "resolve_conversation"
              ? "resolved"
              : action.action_name === "open_conversation"
                ? "open"
                : "pending";
        const statusInt = STATUS_TO_INT[status];
        if (statusInt === undefined) throw new UnprocessableError(`Invalid status: ${status}`);
        if ((STATUS_FROM_INT[conv.status] ?? "") !== status) {
          await db
            .update(conversationsTable)
            .set({ status: statusInt, statusChangedAt: new Date(), updatedAt: new Date() })
            .where(eq(conversationsTable.id, conv.id));
          await createActivityMessage(conv, `Conversation was marked ${status} by ${actor}`);
          conv = await findConversation(accountId, conv.id);
          changed = true;
        }
        applied.push(action.action_name);
        break;
      }
      case "change_priority": {
        const priority = strParam(params) ?? "";
        const priorityInt = PRIORITY_TO_INT[priority];
        if (priorityInt === undefined)
          throw new UnprocessableError(`Invalid priority: ${priority}`);
        const next = priority === "none" ? null : priorityInt;
        if (conv.priority !== next) {
          await db
            .update(conversationsTable)
            .set({ priority: next, updatedAt: new Date() })
            .where(eq(conversationsTable.id, conv.id));
          await createActivityMessage(conv, `Priority was changed to ${priority} by ${actor}`);
          conv = await findConversation(accountId, conv.id);
          changed = true;
        }
        applied.push(action.action_name);
        break;
      }
      case "snooze":
      case "snooze_conversation": {
        const untilRaw = params[0];
        const untilEpoch =
          typeof untilRaw === "number"
            ? untilRaw
            : untilRaw
              ? Math.floor(new Date(String(untilRaw)).getTime() / 1000)
              : NaN;
        if (!Number.isFinite(untilEpoch))
          throw new UnprocessableError("snooze needs snoozed_until");
        await db
          .update(conversationsTable)
          .set({
            status: STATUS_TO_INT.snoozed,
            snoozedUntil: new Date(untilEpoch * 1000),
            statusChangedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(conversationsTable.id, conv.id));
        await createActivityMessage(conv, `Conversation was snoozed by ${actor}`);
        conv = await findConversation(accountId, conv.id);
        changed = true;
        applied.push(action.action_name);
        break;
      }
      case "mute_conversation": {
        const muted = params.length === 0 ? true : params[0] !== false && params[0] !== "false";
        if (conv.muted !== muted) {
          await db
            .update(conversationsTable)
            .set({ muted, updatedAt: new Date() })
            .where(eq(conversationsTable.id, conv.id));
          conv = await findConversation(accountId, conv.id);
          changed = true;
        }
        applied.push(action.action_name);
        break;
      }
      case "send_webhook_event": {
        const url = strParam(params);
        if (!url) throw new UnprocessableError("send_webhook_event needs a URL");
        await deliverWebhookUrl(
          url,
          opts.event ?? "automation_event",
          await toApiConversationItem(await findConversation(accountId, conv.id)),
          accountId,
        );
        applied.push(action.action_name);
        break;
      }
      default:
        throw new UnprocessableError(`Unsupported action: ${action.action_name}`, {
          actions: [`ação não suportada: ${action.action_name}`],
        });
    }
  }

  if (changed) {
    publish(accountId, "conversation.updated", await toApiConversationItem(conv));
  }
  return applied;
}
