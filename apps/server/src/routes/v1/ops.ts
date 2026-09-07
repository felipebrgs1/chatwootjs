/**
 * M12 — Auditoria (só admin), AgentBots, Captain/AI (stub) e Imports UI.
 */
import {
  AgentBotWebhookSchema,
  AuditLogsQuerySchema,
  CaptainAssistSchema,
  CreateAgentBotSchema,
  createAgentBot,
  captainAssist,
  deleteAgentBot,
  getDataImport,
  getInboxAgentBot,
  listAgentBots,
  listAuditLogs,
  listDataImports,
  receiveAgentBotWebhook,
  SetInboxBotSchema,
  setInboxAgentBot,
  UpdateAgentBotSchema,
  updateAgentBot,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

export const auditLogs = new Hono<AppEnv>().use(authAccount);
auditLogs.get("/", zValidator("query", AuditLogsQuerySchema), async (c) => {
  try {
    return ok(c, await listAuditLogs(c.var.auth.accountId, c.var.auth, c.req.valid("query")));
  } catch (err) {
    return fail(c, err);
  }
});

export const agentBots = new Hono<AppEnv>().use(authAccount);
agentBots.get("/", async (c) => {
  try {
    return ok(c, { agent_bots: await listAgentBots(c.var.auth.accountId) });
  } catch (err) {
    return fail(c, err);
  }
});
agentBots.post("/", zValidator("json", CreateAgentBotSchema), async (c) => {
  try {
    const bot = await createAgentBot(c.var.auth.accountId, c.var.auth, c.req.valid("json"));
    return c.json({ data: { agent_bot: bot } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});
agentBots.patch("/:id", zValidator("json", UpdateAgentBotSchema), async (c) => {
  try {
    const bot = await updateAgentBot(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("id")),
      c.req.valid("json"),
    );
    return ok(c, { agent_bot: bot });
  } catch (err) {
    return fail(c, err);
  }
});
agentBots.delete("/:id", async (c) => {
  try {
    await deleteAgentBot(c.var.auth.accountId, c.var.auth, Number(c.req.param("id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});
// Bot API: o bot externo entrega a resposta aqui (formato Rails).
agentBots.post("/:id/webhook", zValidator("json", AgentBotWebhookSchema), async (c) => {
  try {
    return ok(
      c,
      await receiveAgentBotWebhook(
        c.var.auth.accountId,
        Number(c.req.param("id")),
        c.req.valid("json"),
      ),
    );
  } catch (err) {
    return fail(c, err);
  }
});

// Montado em /accounts/:account_id/inboxes/:inbox_id/agent_bot.
export const inboxAgentBot = new Hono<AppEnv>().use(authAccount);
inboxAgentBot.get("/", async (c) => {
  try {
    return ok(c, {
      agent_bot: await getInboxAgentBot(c.var.auth.accountId, Number(c.req.param("inbox_id"))),
    });
  } catch (err) {
    return fail(c, err);
  }
});
inboxAgentBot.put("/", zValidator("json", SetInboxBotSchema), async (c) => {
  try {
    return ok(c, {
      inbox_agent_bot: await setInboxAgentBot(
        c.var.auth.accountId,
        c.var.auth,
        Number(c.req.param("inbox_id")),
        c.req.valid("json").agent_bot_id,
      ),
    });
  } catch (err) {
    return fail(c, err);
  }
});

export const captain = new Hono<AppEnv>().use(authAccount);
captain.post("/assist", zValidator("json", CaptainAssistSchema), async (c) => {
  try {
    return ok(c, await captainAssist(c.var.auth.accountId, c.var.auth, c.req.valid("json")));
  } catch (err) {
    return fail(c, err);
  }
});

export const dataImports = new Hono<AppEnv>().use(authAccount);
dataImports.get(
  "/",
  zValidator("query", z.object({ page: z.coerce.number().int().min(1).default(1) })),
  async (c) => {
    try {
      return ok(
        c,
        await listDataImports(c.var.auth.accountId, c.var.auth, c.req.valid("query").page),
      );
    } catch (err) {
      return fail(c, err);
    }
  },
);
dataImports.get("/:id", async (c) => {
  try {
    return ok(c, {
      data_import: await getDataImport(c.var.auth.accountId, c.var.auth, Number(c.req.param("id"))),
    });
  } catch (err) {
    return fail(c, err);
  }
});
