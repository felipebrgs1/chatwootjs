import {
  CreateInboxSchema,
  InboxMembersBodySchema,
  UpdateInboxSchema,
  WorkingHoursBodySchema,
  addInboxMembers,
  createInbox,
  deleteInbox,
  getInbox,
  listInboxMembers,
  listAssignableAgents,
  listInboxes,
  getWorkingHours,
  removeInboxMember,
  setInboxMembers,
  updateInbox,
  updateWorkingHours,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", async (c) => {
  try {
    return ok(c, { inboxes: await listInboxes(c.var.auth.accountId, c.var.auth) });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/", zValidator("json", CreateInboxSchema), async (c) => {
  try {
    const inbox = await createInbox(c.var.auth, c.req.valid("json"));
    return c.json({ data: { inbox } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

const withInbox = new Hono<AppEnv>();

withInbox.get("/", async (c) => {
  try {
    const inbox = await getInbox(c.var.auth, Number(c.req.param("inbox_id")));
    return ok(c, { inbox });
  } catch (err) {
    return fail(c, err);
  }
});

withInbox.patch("/", zValidator("json", UpdateInboxSchema), async (c) => {
  try {
    const inboxId = Number(c.req.param("inbox_id"));
    const inbox = await updateInbox(c.var.auth, inboxId, c.req.valid("json"));
    return ok(c, { inbox });
  } catch (err) {
    return fail(c, err);
  }
});

withInbox.delete("/", async (c) => {
  try {
    await deleteInbox(c.var.auth, Number(c.req.param("inbox_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

// ---- Membros ----

withInbox.get("/inbox_members", async (c) => {
  try {
    const inboxId = Number(c.req.param("inbox_id"));
    return ok(c, { inbox_members: await listInboxMembers(c.var.auth, inboxId) });
  } catch (err) {
    return fail(c, err);
  }
});

withInbox.post("/inbox_members", zValidator("json", InboxMembersBodySchema), async (c) => {
  try {
    const inboxId = Number(c.req.param("inbox_id"));
    const members = await addInboxMembers(c.var.auth, inboxId, c.req.valid("json"));
    return c.json({ data: { inbox_members: members } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

withInbox.put("/inbox_members", zValidator("json", InboxMembersBodySchema), async (c) => {
  try {
    const inboxId = Number(c.req.param("inbox_id"));
    const members = await setInboxMembers(c.var.auth, inboxId, c.req.valid("json"));
    return ok(c, { inbox_members: members });
  } catch (err) {
    return fail(c, err);
  }
});

withInbox.delete("/inbox_members/:user_id", async (c) => {
  try {
    const inboxId = Number(c.req.param("inbox_id"));
    const userId = Number(c.req.param("user_id"));
    await removeInboxMember(c.var.auth, inboxId, userId);
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

// ---- Horário comercial ----

withInbox.get("/working_hours", async (c) => {
  try {
    const inboxId = Number(c.req.param("inbox_id"));
    return ok(c, { working_hours: await getWorkingHours(c.var.auth.accountId, inboxId) });
  } catch (err) {
    return fail(c, err);
  }
});

withInbox.put("/working_hours", zValidator("json", WorkingHoursBodySchema), async (c) => {
  try {
    const inboxId = Number(c.req.param("inbox_id"));
    const hours = await updateWorkingHours(c.var.auth, inboxId, c.req.valid("json"));
    return ok(c, { working_hours: hours });
  } catch (err) {
    return fail(c, err);
  }
});

withInbox.get("/assignable_agents", async (c) => {
  try {
    const inboxId = Number(c.req.param("inbox_id"));
    return ok(c, { assignable_agents: await listAssignableAgents(c.var.auth, inboxId) });
  } catch (err) {
    return fail(c, err);
  }
});

app.route("/:inbox_id", withInbox);

export default app;
