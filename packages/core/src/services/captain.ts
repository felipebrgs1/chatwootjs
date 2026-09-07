/**
 * M12 — Captain/AI (stub com flag). `POST .../captain/assist` com
 * `{type: reply_suggest|summarize|rewrite, conversation_id?, content?}`.
 *
 * Atrás de `feature_flags.captain_enabled` da conta + provider plugável
 * OpenAI-compatível (`CAPTAIN_API_KEY` ou `OPENAI_API_KEY`, opcional
 * `CAPTAIN_BASE_URL`/`CAPTAIN_MODEL`). Sem flag ou sem chave → 501 com
 * mensagem clara. **Não bloqueia o GA.**
 */
import { db } from "@chatwootjs/db";
import { and, eq } from "drizzle-orm";

import { NotImplementedError, ServiceUnavailableError } from "../lib/errors.js";
import type { AuthCtx } from "../policies/index.js";
import type { CaptainAssistInput } from "../schemas/ops.js";

export function captainEnabledFor(account: { featureFlags?: unknown }): boolean {
  const flags = account.featureFlags as Record<string, unknown> | null | undefined;
  return flags?.captain_enabled === true;
}

const PROMPTS: Record<CaptainAssistInput["type"], (ctx: string) => string> = {
  reply_suggest: (ctx) =>
    `Você é um assistente de suporte. Sugira UMA resposta curta, cordial e direta (pt-BR) para o cliente a partir deste contexto:\n\n${ctx}`,
  summarize: (ctx) =>
    `Resuma em até 5 bullets (pt-BR) o essencial desta conversa de suporte:\n\n${ctx}`,
  rewrite: (ctx) =>
    `Reescreva a mensagem abaixo de forma mais clara, cordial e profissional (pt-BR), mantendo o sentido:\n\n${ctx}`,
};

async function conversationContext(accountId: number, conversationId: number): Promise<string> {
  const conv = await db.query.conversations.findFirst({
    where: (c) => and(eq(c.id, conversationId), eq(c.accountId, accountId)),
    columns: { id: true },
  });
  if (!conv) return "Conversa não encontrada.";
  const rows = await db.query.messages.findMany({
    where: (m) => eq(m.conversationId, conversationId),
    orderBy: (m, { desc }) => desc(m.createdAt),
    limit: 20,
    columns: { messageType: true, content: true },
  });
  return rows
    .reverse()
    .map((m) => `${m.messageType === 1 ? "Agente" : "Cliente"}: ${m.content ?? ""}`)
    .join("\n");
}

export async function captainAssist(
  accountId: number,
  _auth: AuthCtx,
  input: CaptainAssistInput,
): Promise<{ result: string }> {
  const account = await db.query.accounts.findFirst({
    where: (a) => eq(a.id, accountId),
  });
  if (!account || !captainEnabledFor(account)) {
    throw new NotImplementedError(
      "Captain desativado nesta conta (feature_flags.captain_enabled).",
    );
  }
  const apiKey = process.env.CAPTAIN_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new NotImplementedError(
      "Captain sem chave de LLM (defina CAPTAIN_API_KEY ou OPENAI_API_KEY).",
    );
  }
  const base = (process.env.CAPTAIN_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.CAPTAIN_MODEL ?? "gpt-4o-mini";

  const context =
    input.content ??
    (input.conversation_id
      ? await conversationContext(accountId, input.conversation_id)
      : "Sem contexto.");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 600,
      messages: [{ role: "user", content: PROMPTS[input.type](context) }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    throw new ServiceUnavailableError(`Provedor de LLM respondeu ${res.status}.`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const result = data.choices?.[0]?.message?.content?.trim();
  if (!result) throw new ServiceUnavailableError("Provedor de LLM retornou vazio.");
  return { result };
}
