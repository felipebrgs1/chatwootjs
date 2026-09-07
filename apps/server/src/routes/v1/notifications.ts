/**
 * M11 — Sino de notificações (escopo global, como no Rails:
 * `GET /api/v1/notifications`). Exige `?account_id=` e valida o vínculo
 * (403 cross-account, igual ao `authAccount`).
 */
import {
  ForbiddenError,
  listNotifications,
  loadMembership,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  NotificationsQuerySchema,
  snoozeNotification,
  NotificationSnoozeBodySchema,
  UnprocessableError,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { UserEnv } from "../../middlewares/auth";
import { authUser } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<UserEnv>().use(authUser);

const AccountQuery = z.object({ account_id: z.coerce.number().int().positive() });

async function scopedAccount(c: {
  req: { query: (k: string) => string | undefined };
  var: { auth: { userId: number } };
}): Promise<number> {
  const parsed = AccountQuery.safeParse({ account_id: c.req.query("account_id") });
  if (!parsed.success) throw new UnprocessableError("account_id é obrigatório");
  const membership = await loadMembership(c.var.auth.userId, parsed.data.account_id);
  if (!membership) throw new ForbiddenError("No access to this account");
  return parsed.data.account_id;
}

app.get("/", zValidator("query", NotificationsQuerySchema), async (c) => {
  try {
    const accountId = await scopedAccount(c);
    const result = await listNotifications(accountId, c.var.auth.userId, c.req.valid("query"));
    return ok(c, result);
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/read_all", async (c) => {
  try {
    const accountId = await scopedAccount(c);
    return ok(c, await markAllNotificationsRead(accountId, c.var.auth.userId));
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/:id/read", async (c) => {
  try {
    const accountId = await scopedAccount(c);
    const notification = await markNotificationRead(
      accountId,
      c.var.auth.userId,
      Number(c.req.param("id")),
    );
    return ok(c, { notification });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/:id/unread", async (c) => {
  try {
    const accountId = await scopedAccount(c);
    const notification = await markNotificationUnread(
      accountId,
      c.var.auth.userId,
      Number(c.req.param("id")),
    );
    return ok(c, { notification });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/:id/snooze", zValidator("json", NotificationSnoozeBodySchema), async (c) => {
  try {
    const accountId = await scopedAccount(c);
    const notification = await snoozeNotification(
      accountId,
      c.var.auth.userId,
      Number(c.req.param("id")),
      c.req.valid("json").snoozed_until,
    );
    return ok(c, { notification });
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
