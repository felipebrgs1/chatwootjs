import {
  CampaignsQuerySchema,
  CreateCampaignSchema,
  UpdateCampaignSchema,
  audiencePreview,
  createCampaign,
  deleteCampaign,
  listCampaigns,
  triggerCampaign,
  updateCampaign,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", zValidator("query", CampaignsQuerySchema), async (c) => {
  try {
    const { campaign_type } = c.req.valid("query");
    return ok(c, { campaigns: await listCampaigns(c.var.auth.accountId, campaign_type) });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/", zValidator("json", CreateCampaignSchema), async (c) => {
  try {
    const campaign = await createCampaign(c.var.auth.accountId, c.var.auth, c.req.valid("json"));
    return c.json({ data: { campaign } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/:campaign_id/audience", async (c) => {
  try {
    return ok(c, {
      audience: await audiencePreview(c.var.auth.accountId, Number(c.req.param("campaign_id"))),
    });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/:campaign_id/trigger", async (c) => {
  try {
    const result = await triggerCampaign(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("campaign_id")),
    );
    return ok(c, result);
  } catch (err) {
    return fail(c, err);
  }
});

app.patch("/:campaign_id", zValidator("json", UpdateCampaignSchema), async (c) => {
  try {
    const campaign = await updateCampaign(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("campaign_id")),
      c.req.valid("json"),
    );
    return ok(c, { campaign });
  } catch (err) {
    return fail(c, err);
  }
});

app.delete("/:campaign_id", async (c) => {
  try {
    await deleteCampaign(c.var.auth.accountId, c.var.auth, Number(c.req.param("campaign_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
