import {
  CannedQuerySchema,
  CreateCannedSchema,
  UpdateCannedSchema,
  createCannedResponse,
  deleteCannedResponse,
  listCannedResponses,
  updateCannedResponse,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", zValidator("query", CannedQuerySchema), async (c) => {
  try {
    const { search } = c.req.valid("query");
    return ok(c, { canned_responses: await listCannedResponses(c.var.auth.accountId, search) });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/", zValidator("json", CreateCannedSchema), async (c) => {
  try {
    const canned = await createCannedResponse(
      c.var.auth.accountId,
      c.var.auth,
      c.req.valid("json"),
    );
    return c.json({ data: { canned_response: canned } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.patch("/:canned_id", zValidator("json", UpdateCannedSchema), async (c) => {
  try {
    const canned = await updateCannedResponse(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("canned_id")),
      c.req.valid("json"),
    );
    return ok(c, { canned_response: canned });
  } catch (err) {
    return fail(c, err);
  }
});

app.delete("/:canned_id", async (c) => {
  try {
    await deleteCannedResponse(c.var.auth.accountId, c.var.auth, Number(c.req.param("canned_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
