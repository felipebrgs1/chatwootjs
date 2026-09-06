import {
  CreateCustomAttributeSchema,
  UpdateCustomAttributeSchema,
  createCustomAttribute,
  deleteCustomAttribute,
  listCustomAttributes,
  updateCustomAttribute,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", async (c) => {
  try {
    const model = c.req.query("attribute_model");
    const attributeModel = model === "0" ? 0 : model === "1" ? 1 : undefined;
    return ok(c, {
      custom_attribute_definitions: await listCustomAttributes(
        c.var.auth.accountId,
        attributeModel,
      ),
    });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/", zValidator("json", CreateCustomAttributeSchema), async (c) => {
  try {
    const definition = await createCustomAttribute(c.var.auth, c.req.valid("json"));
    return c.json({ data: { custom_attribute_definition: definition } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.patch("/:id", zValidator("json", UpdateCustomAttributeSchema), async (c) => {
  try {
    const definition = await updateCustomAttribute(
      c.var.auth,
      Number(c.req.param("id")),
      c.req.valid("json"),
    );
    return ok(c, { custom_attribute_definition: definition });
  } catch (err) {
    return fail(c, err);
  }
});

app.delete("/:id", async (c) => {
  try {
    await deleteCustomAttribute(c.var.auth, Number(c.req.param("id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
