/**
 * M12 — Console do superadmin (`/super_admin`, área separada com auth
 * própria por `super_admins`; visual simples, sem paridade ActiveAdmin).
 */
import {
  deleteAccountCascade,
  deleteUserEverywhere,
  InstallationConfigSchema,
  listAllAccounts,
  listAllUsers,
  listInstallationConfigs,
  listPlatformApps,
  listPlatformBanners,
  superAdminSignIn,
  SuperAdminSignInSchema,
  upsertInstallationConfig,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { superAdmin, type SuperAdminEnv } from "../middlewares/auth";
import { fail, ok } from "./v1/_helpers";

const open = new Hono();
open.post("/auth/sign_in", zValidator("json", SuperAdminSignInSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json");
    return c.json({ data: await superAdminSignIn(email, password) });
  } catch (err) {
    return fail(c, err);
  }
});

const app = new Hono<SuperAdminEnv>().use(superAdmin);

app.get(
  "/accounts",
  zValidator("query", z.object({ q: z.string().max(60).optional() })),
  async (c) => {
    try {
      return ok(c, { accounts: await listAllAccounts(c.req.valid("query").q) });
    } catch (err) {
      return fail(c, err);
    }
  },
);

app.delete("/accounts/:id", async (c) => {
  try {
    await deleteAccountCascade(Number(c.req.param("id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

app.get(
  "/users",
  zValidator("query", z.object({ q: z.string().max(60).optional() })),
  async (c) => {
    try {
      return ok(c, { users: await listAllUsers(c.req.valid("query").q) });
    } catch (err) {
      return fail(c, err);
    }
  },
);

app.delete("/users/:id", async (c) => {
  try {
    await deleteUserEverywhere(Number(c.req.param("id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/installation_configs", async (c) => {
  try {
    return ok(c, { installation_configs: await listInstallationConfigs() });
  } catch (err) {
    return fail(c, err);
  }
});

app.put("/installation_configs/:name", zValidator("json", InstallationConfigSchema), async (c) => {
  try {
    return ok(c, {
      installation_config: await upsertInstallationConfig(
        c.req.param("name"),
        c.req.valid("json").value,
      ),
    });
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/platform_apps", async (c) => {
  try {
    return ok(c, { platform_apps: await listPlatformApps() });
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/platform_banners", async (c) => {
  try {
    return ok(c, { platform_banners: await listPlatformBanners() });
  } catch (err) {
    return fail(c, err);
  }
});

const root = new Hono();
root.route("/", open);
root.route("/", app);

export default root;
