import {
  CreateTeamSchema,
  TeamMembersBodySchema,
  UpdateTeamSchema,
  addTeamMembers,
  createTeam,
  deleteTeam,
  getTeam,
  listMyTeams,
  listTeams,
  removeTeamMember,
  updateTeam,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", async (c) => {
  try {
    return ok(c, { teams: await listTeams(c.var.auth.accountId) });
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/mine", async (c) => {
  try {
    return ok(c, { teams: await listMyTeams(c.var.auth.accountId, c.var.auth) });
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/:team_id", async (c) => {
  try {
    return ok(c, {
      team: await getTeam(c.var.auth.accountId, Number(c.req.param("team_id"))),
    });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/", zValidator("json", CreateTeamSchema), async (c) => {
  try {
    const team = await createTeam(c.var.auth.accountId, c.var.auth, c.req.valid("json"));
    return c.json({ data: { team } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.patch("/:team_id", zValidator("json", UpdateTeamSchema), async (c) => {
  try {
    const team = await updateTeam(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("team_id")),
      c.req.valid("json"),
    );
    return ok(c, { team });
  } catch (err) {
    return fail(c, err);
  }
});

app.delete("/:team_id", async (c) => {
  try {
    await deleteTeam(c.var.auth.accountId, c.var.auth, Number(c.req.param("team_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/:team_id/team_members", zValidator("json", TeamMembersBodySchema), async (c) => {
  try {
    const members = await addTeamMembers(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("team_id")),
      c.req.valid("json").user_ids,
    );
    return c.json({ data: { members } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.delete("/:team_id/team_members/:user_id", async (c) => {
  try {
    await removeTeamMember(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("team_id")),
      Number(c.req.param("user_id")),
    );
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
