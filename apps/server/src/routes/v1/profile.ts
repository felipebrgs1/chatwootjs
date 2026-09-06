import {
  AvailabilityBodySchema,
  UpdateProfileSchema,
  getProfile,
  updateProfile,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { UserEnv } from "../../middlewares/auth";
import { authUser } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<UserEnv>().use(authUser);

app.get("/", async (c) => {
  try {
    return ok(c, { user: await getProfile(c.var.auth.userId) });
  } catch (err) {
    return fail(c, err);
  }
});

app.patch("/", zValidator("json", UpdateProfileSchema), async (c) => {
  try {
    return ok(c, { user: await updateProfile(c.var.auth.userId, c.req.valid("json")) });
  } catch (err) {
    return fail(c, err);
  }
});

app.put("/availability", zValidator("json", AvailabilityBodySchema), async (c) => {
  try {
    return ok(c, { user: await updateProfile(c.var.auth.userId, c.req.valid("json")) });
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
