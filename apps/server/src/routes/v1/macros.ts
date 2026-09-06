import {
  CreateMacroSchema,
  ExecuteMacroSchema,
  UpdateMacroSchema,
  createMacro,
  deleteMacro,
  executeMacro,
  listMacros,
  updateMacro,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", async (c) => {
  try {
    return ok(c, { macros: await listMacros(c.var.auth.accountId, c.var.auth) });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/", zValidator("json", CreateMacroSchema), async (c) => {
  try {
    const macro = await createMacro(c.var.auth.accountId, c.var.auth, c.req.valid("json"));
    return c.json({ data: { macro } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.patch("/:macro_id", zValidator("json", UpdateMacroSchema), async (c) => {
  try {
    const macro = await updateMacro(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("macro_id")),
      c.req.valid("json"),
    );
    return ok(c, { macro });
  } catch (err) {
    return fail(c, err);
  }
});

app.delete("/:macro_id", async (c) => {
  try {
    await deleteMacro(c.var.auth.accountId, c.var.auth, Number(c.req.param("macro_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

// Rails aceita `conversation_ids[]`; aqui também vale `conversation_id` único.
app.post(
  "/:macro_id/execute",
  zValidator(
    "query",
    z
      .object({ conversation_ids: z.union([z.string(), z.array(z.string())]).optional() })
      .passthrough(),
  ),
  zValidator("json", ExecuteMacroSchema.partial()),
  async (c) => {
    try {
      const body = c.req.valid("json");
      const queryIds = c.req.valid("query").conversation_ids;
      const fromQuery = (
        queryIds === undefined ? [] : Array.isArray(queryIds) ? queryIds : [queryIds]
      )
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0);
      const ids = [
        ...(body.conversation_id ? [body.conversation_id] : []),
        ...(body.conversation_ids ?? []),
        ...fromQuery,
      ];
      const result = await executeMacro(
        c.var.auth.accountId,
        c.var.auth,
        Number(c.req.param("macro_id")),
        ids,
      );
      return ok(c, result);
    } catch (err) {
      return fail(c, err);
    }
  },
);

export default app;
