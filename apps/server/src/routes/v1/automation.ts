import {
  CreateAutomationRuleSchema,
  UpdateAutomationRuleSchema,
  cloneAutomationRule,
  createAutomationRule,
  deleteAutomationRule,
  listAutomationRules,
  updateAutomationRule,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", async (c) => {
  try {
    return ok(c, { automation_rules: await listAutomationRules(c.var.auth.accountId) });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/", zValidator("json", CreateAutomationRuleSchema), async (c) => {
  try {
    const rule = await createAutomationRule(c.var.auth.accountId, c.var.auth, c.req.valid("json"));
    return c.json({ data: { automation_rule: rule } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.patch("/:rule_id", zValidator("json", UpdateAutomationRuleSchema), async (c) => {
  try {
    const rule = await updateAutomationRule(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("rule_id")),
      c.req.valid("json"),
    );
    return ok(c, { automation_rule: rule });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/:rule_id/clone", async (c) => {
  try {
    const rule = await cloneAutomationRule(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("rule_id")),
    );
    return c.json({ data: { automation_rule: rule } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.delete("/:rule_id", async (c) => {
  try {
    await deleteAutomationRule(c.var.auth.accountId, c.var.auth, Number(c.req.param("rule_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
