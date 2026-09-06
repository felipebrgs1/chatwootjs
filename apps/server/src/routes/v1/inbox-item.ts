import { getInboxByIdForUser } from "@chatwootjs/core";
import { Hono } from "hono";

import type { UserEnv } from "../../middlewares/auth";
import { authUser } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

// Espelha GET /api/v1/inboxes/:id do Rails (rota fora do escopo /accounts).
const app = new Hono<UserEnv>().use(authUser);

app.get("/:id", async (c) => {
  try {
    const inbox = await getInboxByIdForUser(c.var.auth.userId, Number(c.req.param("id")));
    return ok(c, { inbox });
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
