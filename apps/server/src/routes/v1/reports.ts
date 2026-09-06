import {
  ReportsQuerySchema,
  getAgentsReport,
  getCsatReport,
  getInboxesReport,
  getLabelsReport,
  getOverview,
  getSummary,
  getTeamsReport,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

const query = zValidator("query", ReportsQuerySchema);

app.get("/summary", query, async (c) => {
  try {
    return ok(c, await getSummary(c.var.auth.accountId, c.req.valid("query")));
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/agents", query, async (c) => {
  try {
    return ok(c, await getAgentsReport(c.var.auth.accountId, c.req.valid("query")));
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/teams", query, async (c) => {
  try {
    return ok(c, await getTeamsReport(c.var.auth.accountId, c.req.valid("query")));
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/inboxes", query, async (c) => {
  try {
    return ok(c, await getInboxesReport(c.var.auth.accountId, c.req.valid("query")));
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/labels", query, async (c) => {
  try {
    return ok(c, await getLabelsReport(c.var.auth.accountId, c.req.valid("query")));
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/overview", query, async (c) => {
  try {
    return ok(c, await getOverview(c.var.auth.accountId, c.req.valid("query")));
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/csat", query, async (c) => {
  try {
    return ok(c, await getCsatReport(c.var.auth.accountId, c.req.valid("query")));
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
