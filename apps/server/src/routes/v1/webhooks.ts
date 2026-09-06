import {
  CreateWebhookSchema,
  UpdateWebhookSchema,
  createWebhook,
  deleteWebhook,
  listWebhooks,
  testWebhook,
  updateWebhook,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", async (c) => {
  try {
    return ok(c, { webhooks: await listWebhooks(c.var.auth.accountId) });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/", zValidator("json", CreateWebhookSchema), async (c) => {
  try {
    const webhook = await createWebhook(c.var.auth.accountId, c.var.auth, c.req.valid("json"));
    return c.json({ data: { webhook } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.patch("/:webhook_id", zValidator("json", UpdateWebhookSchema), async (c) => {
  try {
    const webhook = await updateWebhook(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("webhook_id")),
      c.req.valid("json"),
    );
    return ok(c, { webhook });
  } catch (err) {
    return fail(c, err);
  }
});

app.delete("/:webhook_id", async (c) => {
  try {
    await deleteWebhook(c.var.auth.accountId, c.var.auth, Number(c.req.param("webhook_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/:webhook_id/test", async (c) => {
  try {
    const result = await testWebhook(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("webhook_id")),
    );
    return ok(c, result);
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
