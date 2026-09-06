import { createApiChannelConversation } from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail } from "./_helpers";

// Channel API: integrações customizadas criam conversas/mensagens numa
// inbox Channel::Api. Autenticada por JWT de agente (HMAC entra no M10).
const app = new Hono<AppEnv>().use(authAccount);

const body = z.object({
  inbox_id: z.number().int().positive(),
  contact: z.object({
    identifier: z.string().trim().min(1),
    name: z.string().optional(),
    email: z.union([z.email(), z.literal("")]).optional(),
    phone_number: z.string().optional(),
  }),
  message: z.object({ content: z.string().trim().min(1).max(150000) }),
});

app.post("/conversations", zValidator("json", body), async (c) => {
  try {
    const result = await createApiChannelConversation(c.var.auth.accountId, c.req.valid("json"));
    return c.json({ data: result }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

export default app;
