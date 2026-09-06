import {
  CreateLabelSchema,
  UpdateLabelSchema,
  createLabel,
  deleteLabel,
  listLabels,
  updateLabel,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", async (c) => {
  try {
    return ok(c, { labels: await listLabels(c.var.auth.accountId) });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/", zValidator("json", CreateLabelSchema), async (c) => {
  try {
    const label = await createLabel(c.var.auth, c.req.valid("json"));
    return c.json({ data: { label } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.patch("/:label_id", zValidator("json", UpdateLabelSchema), async (c) => {
  try {
    const label = await updateLabel(
      c.var.auth,
      Number(c.req.param("label_id")),
      c.req.valid("json"),
    );
    return ok(c, { label });
  } catch (err) {
    return fail(c, err);
  }
});

app.delete("/:label_id", async (c) => {
  try {
    await deleteLabel(c.var.auth, Number(c.req.param("label_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
