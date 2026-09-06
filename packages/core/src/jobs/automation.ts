import { conversations, db } from "@chatwootjs/db";
import { eq } from "drizzle-orm";

import { publish, subscribe } from "../realtime/index.js";
import { runRulesFor } from "../services/automation.js";
import {
  createActivityMessage,
  findConversation,
  toApiConversationItem,
} from "../services/conversations.js";
import { pickAutoAssignee } from "../services/teams.js";
import { fireWebhooks } from "../services/webhooks.js";

// Listeners de domínio (M6): todo `publish` no barramento realtime vira
// avaliação de automações + disparo de webhooks. Fire-and-forget com log —
// nunca bloqueia a requisição que originou o evento.

function settled(promise: Promise<unknown>, scope: string): void {
  void promise.catch((err) => console.error(`[automation] ${scope}`, err));
}

async function autoAssign(accountId: number, conversationId: number): Promise<void> {
  const conv = await findConversation(accountId, conversationId);
  if (conv.assigneeId !== null) return;
  const inbox = await db.query.inboxes.findFirst({
    where: (i) => eq(i.id, conv.inboxId),
  });
  if (!inbox?.enableAutoAssignment) return;
  const assigneeId = await pickAutoAssignee(conv.inboxId);
  if (assigneeId === null) return;
  await db
    .update(conversations)
    .set({ assigneeId, updatedAt: new Date() })
    .where(eq(conversations.id, conv.id));
  const user = await db.query.users.findFirst({
    where: (u) => eq(u.id, assigneeId),
    columns: { name: true },
  });
  await createActivityMessage(
    conv,
    `Conversation was assigned to ${user?.name ?? "agente"} (auto-assignment)`,
  );
  publish(
    accountId,
    "conversation.updated",
    await toApiConversationItem(await findConversation(accountId, conv.id)),
  );
}

export function registerAutomationListeners(): void {
  if (globalThis.__cw_automation_listeners_registered) return;
  globalThis.__cw_automation_listeners_registered = true;

  subscribe("conversation.created", ({ accountId, data }) => {
    const conv = data as { id: number; inbox_id: number };
    if (typeof conv?.id !== "number") return;
    settled(autoAssign(accountId, conv.id), "auto-assign");
    settled(
      runRulesFor(accountId, "conversation_created", { conversationId: conv.id }),
      "conversation_created",
    );
    settled(
      fireWebhooks(accountId, "conversation_created", data, conv.inbox_id),
      "webhook conversation_created",
    );
  });

  subscribe("conversation.updated", ({ accountId, data }) => {
    const conv = data as { id: number; inbox_id: number };
    if (typeof conv?.id !== "number") return;
    settled(
      runRulesFor(accountId, "conversation_updated", { conversationId: conv.id }),
      "conversation_updated",
    );
    settled(
      fireWebhooks(accountId, "conversation_updated", data, conv.inbox_id),
      "webhook conversation_updated",
    );
  });

  subscribe("message.created", ({ accountId, data }) => {
    const msg = data as { id: number; conversation_id: number };
    if (typeof msg?.conversation_id !== "number") return;
    settled(
      runRulesFor(accountId, "message_created", {
        conversationId: msg.conversation_id,
        messageId: msg.id,
      }),
      "message_created",
    );
    settled(fireWebhooks(accountId, "message_created", data), "webhook message_created");
  });
}

declare global {
  // eslint-disable-next-line no-var
  var __cw_automation_listeners_registered: boolean | undefined;
}
