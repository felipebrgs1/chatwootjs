import { getPublicArticle, getPublicPortal } from "@chatwootjs/core";
import { Hono } from "hono";

import { fail, ok } from "./v1/_helpers";

// Portal público da central de ajuda — sem auth, lookup por slug.
// Montado em /hc/api pelo server.

const app = new Hono();

app.get("/:portal_slug", async (c) => {
  try {
    return ok(c, { portal: await getPublicPortal(c.req.param("portal_slug")) });
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/:portal_slug/articles/:slug", async (c) => {
  try {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("x-real-ip") ??
      undefined;
    return ok(c, {
      article: await getPublicArticle(c.req.param("portal_slug"), c.req.param("slug"), ip),
    });
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
