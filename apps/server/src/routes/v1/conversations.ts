import { PaginationQuerySchema } from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

// STUB M0 — substituído pela implementação real no M4.
// Existe para validar o ciclo auth + paginação + formato `{ data, meta }`.
const app = new Hono<AppEnv>().use(authAccount);

app.get("/", zValidator("query", PaginationQuerySchema), (c) => {
  try {
    const query = c.req.valid("query");
    return ok(c, [], {
      count: 0,
      current_page: query.page,
      total_pages: 0,
      per_page: query.per_page,
      mine_count: 0,
      unassigned_count: 0,
      all_count: 0,
    });
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
