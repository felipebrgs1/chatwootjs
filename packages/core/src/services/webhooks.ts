import { db, webhooks } from "@chatwootjs/db";
import { and, eq } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { jobs } from "../jobs/index.js";
import { requireAdmin, type AuthCtx } from "../policies/index.js";
import { logAudit } from "./audit.js";
import { WEBHOOK_EVENTS } from "../schemas/webhooks.js";

// Espelha webhooks_controller do Rails. Entrega via job `webhook.deliver`
// (retry exponencial, até 3 tentativas — no BullMQ via attempts/backoff,
// no in-process via loop interno).

const HTTP_URL = /^https?:\/\/.+/;

export interface ApiWebhook {
  id: number;
  name: string | null;
  url: string | null;
  inbox_id: number | null;
  subscriptions: string[];
}

function toApi(row: typeof webhooks.$inferSelect): ApiWebhook {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    inbox_id: row.inboxId,
    subscriptions: (row.subscriptions ?? []) as string[],
  };
}

function assertValidUrl(url: string): void {
  if (!HTTP_URL.test(url)) {
    throw new UnprocessableError("Invalid webhook URL", { url: ["use http(s)://..."] });
  }
}

export async function listWebhooks(accountId: number): Promise<ApiWebhook[]> {
  const rows = await db.query.webhooks.findMany({
    where: (w) => eq(w.accountId, accountId),
  });
  return rows.map(toApi);
}

export async function findWebhook(accountId: number, id: number) {
  const row = await db.query.webhooks.findFirst({
    where: (w) => and(eq(w.accountId, accountId), eq(w.id, id)),
  });
  if (!row) throw new NotFoundError("Webhook not found");
  return row;
}

export async function createWebhook(
  accountId: number,
  auth: AuthCtx,
  input: { url: string; name?: string; inbox_id?: number | null; subscriptions: string[] },
): Promise<ApiWebhook> {
  requireAdmin(auth);
  assertValidUrl(input.url);
  try {
    const [row] = await db
      .insert(webhooks)
      .values({
        accountId,
        url: input.url,
        name: input.name?.trim() || null,
        inboxId: input.inbox_id ?? null,
        webhookType: input.inbox_id ? 1 : 0,
        subscriptions: input.subscriptions,
      })
      .returning();
    if (!row) throw new UnprocessableError("Could not create webhook");
    void logAudit(accountId, auth.userId, "create", "Webhook", row.id, {});
    return toApi(row);
  } catch (err) {
    if (err instanceof UnprocessableError) throw err;
    throw new UnprocessableError("Could not create webhook", { url: ["já cadastrada"] });
  }
}

export async function updateWebhook(
  accountId: number,
  auth: AuthCtx,
  id: number,
  input: { url?: string; name?: string; inbox_id?: number | null; subscriptions?: string[] },
): Promise<ApiWebhook> {
  requireAdmin(auth);
  const row = await findWebhook(accountId, id);
  if (input.url !== undefined) assertValidUrl(input.url);
  try {
    const [updated] = await db
      .update(webhooks)
      .set({
        url: input.url ?? row.url,
        name: input.name !== undefined ? input.name.trim() || null : row.name,
        inboxId: input.inbox_id !== undefined ? input.inbox_id : row.inboxId,
        subscriptions: input.subscriptions ?? row.subscriptions,
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, row.id))
      .returning();
    if (!updated) throw new NotFoundError("Webhook not found");
    void logAudit(accountId, auth.userId, "update", "Webhook", row.id, {});
    return toApi(updated);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof UnprocessableError) throw err;
    throw new UnprocessableError("Could not update webhook", { url: ["já cadastrada"] });
  }
}

export async function deleteWebhook(accountId: number, auth: AuthCtx, id: number): Promise<void> {
  requireAdmin(auth);
  const row = await findWebhook(accountId, id);
  await db.delete(webhooks).where(eq(webhooks.id, row.id));
  void logAudit(accountId, auth.userId, "destroy", "Webhook", row.id, {});
}

/** Payload no formato do Rails: `{ event, data, account_id, created_at }`. */
export function webhookPayload(event: string, data: unknown, accountId: number) {
  return {
    event,
    data,
    account_id: accountId,
    created_at: new Date().toISOString(),
  };
}

/** POST direto numa URL (usado pela ação send_webhook_event). */
export async function deliverWebhookUrl(
  url: string,
  event: string,
  data: unknown,
  accountId: number,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(webhookPayload(event, data, accountId)),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Webhook ${url} respondeu ${res.status}`);
}

/**
 * Dispara os webhooks da conta inscritos no evento. Chamada fire-and-forget
 * pelos listeners de domínio (não bloqueia a requisição).
 */
export async function fireWebhooks(
  accountId: number,
  event: string,
  data: unknown,
  inboxId?: number,
): Promise<void> {
  if (!WEBHOOK_EVENTS.includes(event as (typeof WEBHOOK_EVENTS)[number])) return;
  const rows = await db.query.webhooks.findMany({
    where: (w) => eq(w.accountId, accountId),
  });
  const targets = rows.filter(
    (w) =>
      ((w.subscriptions ?? []) as string[]).includes(event) &&
      (w.inboxId === null || w.inboxId === undefined || w.inboxId === inboxId),
  );
  for (const target of targets) {
    if (!target.url) continue;
    await jobs.dispatch({
      name: "webhook.deliver",
      payload: { webhookId: target.id, event, data, accountId },
    });
  }
}

/** Handler do job `webhook.deliver` (registrado no boot do server). */
export function registerWebhookJob(): void {
  jobs.on("webhook.deliver", async (payload) => {
    const { webhookId, event, data, accountId } = payload as {
      webhookId: number;
      event: string;
      data: unknown;
      accountId: number;
    };
    const hook = await db.query.webhooks.findFirst({
      where: (w, { eq: eqFn }) => eqFn(w.id, webhookId),
    });
    if (!hook?.url) return;
    const url = hook.url;
    // No in-process (sem BullMQ) o retry é manual; com BullMQ o worker
    // rejoga o job (attempts/backoff) ao lançar erro.
    const inProcess = (await import("../jobs/index.js")).activeJobRunner() === "in-process";
    const attempts = inProcess ? 3 : 1;
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (hook.secret) headers["X-Chatwoot-Signature"] = hook.secret;
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(webhookPayload(event, data, accountId)),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`respondeu ${res.status}`);
        return;
      } catch (err) {
        lastError = err;
        if (attempt < attempts) await new Promise((r) => setTimeout(r, attempt * 1000));
      }
    }
    console.error(`[webhook.deliver] ${url} falhou após ${attempts} tentativas`, lastError);
    if (!inProcess) throw lastError;
  });
}

export async function testWebhook(
  accountId: number,
  auth: AuthCtx,
  id: number,
): Promise<{ ok: boolean; status?: number }> {
  requireAdmin(auth);
  const row = await findWebhook(accountId, id);
  if (!row.url) throw new UnprocessableError("Webhook without URL");
  try {
    const res = await fetch(row.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload("webhook.test", { id: row.id }, accountId)),
      signal: AbortSignal.timeout(10_000),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}
