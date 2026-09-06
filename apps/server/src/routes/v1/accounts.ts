import {
  InviteAgentSchema,
  UpdateAccountSchema,
  UpdateAgentSchema,
  getAccount,
  inviteAgent,
  listAgents,
  listMyAccounts,
  removeAgent,
  updateAccount,
  updateAgentRole,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv, UserEnv } from "../../middlewares/auth";
import { authAccount, authUser } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const scoped = new Hono<AppEnv>().use(authAccount);

scoped.get("/", async (c) => {
  try {
    return ok(c, { account: await getAccount(c.var.auth.accountId) });
  } catch (err) {
    return fail(c, err);
  }
});

scoped.patch("/", zValidator("json", UpdateAccountSchema), async (c) => {
  try {
    return ok(c, { account: await updateAccount(c.var.auth, c.req.valid("json")) });
  } catch (err) {
    return fail(c, err);
  }
});

scoped.get("/agents", async (c) => {
  try {
    return ok(c, { agents: await listAgents(c.var.auth.accountId) });
  } catch (err) {
    return fail(c, err);
  }
});

scoped.post("/agents", zValidator("json", InviteAgentSchema), async (c) => {
  try {
    const { agent, invitationToken } = await inviteAgent(c.var.auth, c.req.valid("json"));
    return c.json({ data: { agent, invitation_token: invitationToken } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

scoped.patch("/agents/:id", zValidator("json", UpdateAgentSchema), async (c) => {
  try {
    const agent = await updateAgentRole(
      c.var.auth,
      Number(c.req.param("id")),
      c.req.valid("json").role,
    );
    return ok(c, { agent });
  } catch (err) {
    return fail(c, err);
  }
});

scoped.delete("/agents/:id", async (c) => {
  try {
    await removeAgent(c.var.auth, Number(c.req.param("id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

scoped.get("/account_users", async (c) => {
  try {
    return ok(c, { account_users: await listAgents(c.var.auth.accountId) });
  } catch (err) {
    return fail(c, err);
  }
});

// Lista as contas do usuário logado (para o seletor de contas).
// Usa authUser (sem :account_id) em vez do authAccount do restante do router.
const unscoped = new Hono<UserEnv>().use(authUser);
unscoped.get("/", async (c) => {
  try {
    return ok(c, { accounts: await listMyAccounts(c.var.auth.userId) });
  } catch (err) {
    return fail(c, err);
  }
});

const app = new Hono();
app.route("/accounts", unscoped);
app.route("/accounts/:account_id", scoped);

export default app;
