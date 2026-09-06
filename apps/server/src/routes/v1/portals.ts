import {
  CreateArticleSchema,
  CreateCategorySchema,
  CreatePortalSchema,
  UpdateArticleSchema,
  UpdateCategorySchema,
  UpdatePortalSchema,
  createArticle,
  createCategory,
  createPortal,
  deleteArticle,
  deleteCategory,
  deletePortal,
  listArticles,
  listCategories,
  listPortals,
  setArticleStatus,
  updateArticle,
  updateCategory,
  updatePortal,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { NotFoundError } from "@chatwootjs/core";
import type { Context } from "hono";

import { fail, ok } from "./_helpers";

function portalSlug(c: Context): string {
  const slug = c.req.param("portal_slug") as string | undefined;
  if (!slug) throw new NotFoundError("Portal not found");
  return slug;
}

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", async (c) => {
  try {
    return ok(c, { portals: await listPortals(c.var.auth.accountId) });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/", zValidator("json", CreatePortalSchema), async (c) => {
  try {
    const portal = await createPortal(c.var.auth.accountId, c.var.auth, c.req.valid("json"));
    return c.json({ data: { portal } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.patch("/:portal_id", zValidator("json", UpdatePortalSchema), async (c) => {
  try {
    const portal = await updatePortal(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("portal_id")),
      c.req.valid("json"),
    );
    return ok(c, { portal });
  } catch (err) {
    return fail(c, err);
  }
});

app.delete("/:portal_id", async (c) => {
  try {
    await deletePortal(c.var.auth.accountId, c.var.auth, Number(c.req.param("portal_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

const nested = new Hono<AppEnv>();

nested.get("/categories", async (c) => {
  try {
    return ok(c, {
      categories: await listCategories(c.var.auth.accountId, portalSlug(c)),
    });
  } catch (err) {
    return fail(c, err);
  }
});

nested.post("/categories", zValidator("json", CreateCategorySchema), async (c) => {
  try {
    const category = await createCategory(
      c.var.auth.accountId,
      c.var.auth,
      portalSlug(c),
      c.req.valid("json"),
    );
    return c.json({ data: { category } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

nested.patch("/categories/:category_id", zValidator("json", UpdateCategorySchema), async (c) => {
  try {
    const category = await updateCategory(
      c.var.auth.accountId,
      c.var.auth,
      portalSlug(c),
      Number(c.req.param("category_id")),
      c.req.valid("json"),
    );
    return ok(c, { category });
  } catch (err) {
    return fail(c, err);
  }
});

nested.delete("/categories/:category_id", async (c) => {
  try {
    await deleteCategory(
      c.var.auth.accountId,
      c.var.auth,
      portalSlug(c),
      Number(c.req.param("category_id")),
    );
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

nested.get("/articles", async (c) => {
  try {
    return ok(c, {
      articles: await listArticles(c.var.auth.accountId, portalSlug(c)),
    });
  } catch (err) {
    return fail(c, err);
  }
});

nested.post("/articles", zValidator("json", CreateArticleSchema), async (c) => {
  try {
    const article = await createArticle(
      c.var.auth.accountId,
      c.var.auth,
      portalSlug(c),
      c.req.valid("json"),
    );
    return c.json({ data: { article } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

nested.patch("/articles/:article_id", zValidator("json", UpdateArticleSchema), async (c) => {
  try {
    const article = await updateArticle(
      c.var.auth.accountId,
      c.var.auth,
      portalSlug(c),
      Number(c.req.param("article_id")),
      c.req.valid("json"),
    );
    return ok(c, { article });
  } catch (err) {
    return fail(c, err);
  }
});

nested.post("/articles/:article_id/publish", async (c) => {
  try {
    const article = await setArticleStatus(
      c.var.auth.accountId,
      c.var.auth,
      portalSlug(c),
      Number(c.req.param("article_id")),
      "published",
    );
    return ok(c, { article });
  } catch (err) {
    return fail(c, err);
  }
});

nested.post("/articles/:article_id/unpublish", async (c) => {
  try {
    const article = await setArticleStatus(
      c.var.auth.accountId,
      c.var.auth,
      portalSlug(c),
      Number(c.req.param("article_id")),
      "draft",
    );
    return ok(c, { article });
  } catch (err) {
    return fail(c, err);
  }
});

nested.delete("/articles/:article_id", async (c) => {
  try {
    await deleteArticle(
      c.var.auth.accountId,
      c.var.auth,
      portalSlug(c),
      Number(c.req.param("article_id")),
    );
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

app.route("/:portal_slug", nested);

export default app;
