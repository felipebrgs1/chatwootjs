/**
 * M11 — Preferências de notificação, filtros salvos (views), busca global
 * e presença. Todos escopados por `:account_id` (authAccount, 403 cross-account).
 */
import {
  createCustomFilter,
  CreateCustomFilterSchema,
  deleteCustomFilter,
  getNotificationSettings,
  listCustomFilters,
  listPresence,
  NotificationSettingsSchema,
  unifiedSearch,
  updateCustomFilter,
  UpdateCustomFilterSchema,
  updateNotificationSettings,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

export const notificationSettings = new Hono<AppEnv>().use(authAccount);
notificationSettings.get("/", async (c) => {
  try {
    return ok(c, {
      notification_settings: await getNotificationSettings(c.var.auth.accountId, c.var.auth.userId),
    });
  } catch (err) {
    return fail(c, err);
  }
});
notificationSettings.put("/", zValidator("json", NotificationSettingsSchema), async (c) => {
  try {
    return ok(c, {
      notification_settings: await updateNotificationSettings(
        c.var.auth.accountId,
        c.var.auth.userId,
        c.req.valid("json"),
      ),
    });
  } catch (err) {
    return fail(c, err);
  }
});

export const customFilters = new Hono<AppEnv>().use(authAccount);
customFilters.get("/", async (c) => {
  try {
    return ok(c, {
      custom_filters: await listCustomFilters(c.var.auth.accountId, c.var.auth.userId),
    });
  } catch (err) {
    return fail(c, err);
  }
});
customFilters.post("/", zValidator("json", CreateCustomFilterSchema), async (c) => {
  try {
    const filter = await createCustomFilter(
      c.var.auth.accountId,
      c.var.auth.userId,
      c.req.valid("json"),
    );
    return c.json({ data: { custom_filter: filter } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});
customFilters.patch("/:id", zValidator("json", UpdateCustomFilterSchema), async (c) => {
  try {
    const filter = await updateCustomFilter(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("id")),
      c.req.valid("json"),
    );
    return ok(c, { custom_filter: filter });
  } catch (err) {
    return fail(c, err);
  }
});
customFilters.delete("/:id", async (c) => {
  try {
    await deleteCustomFilter(c.var.auth.accountId, c.var.auth, Number(c.req.param("id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

export const search = new Hono<AppEnv>().use(authAccount);
search.get("/", zValidator("query", z.object({ q: z.string().min(1).max(80) })), async (c) => {
  try {
    return ok(c, await unifiedSearch(c.var.auth.accountId, c.var.auth, c.req.valid("query").q));
  } catch (err) {
    return fail(c, err);
  }
});

export const presence = new Hono<AppEnv>().use(authAccount);
presence.get("/", async (c) => {
  try {
    return ok(c, { presence: listPresence(c.var.auth.accountId) });
  } catch (err) {
    return fail(c, err);
  }
});
