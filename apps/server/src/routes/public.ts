import {
  createWidgetConversation,
  getWidgetConfig,
  listWidgetConversations,
  listWidgetMessages,
  markWidgetConversationRead,
  sendWidgetMessage,
  submitWidgetCsat,
  updateWidgetContact,
  upsertWidgetContact,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { rateLimit } from "../middlewares/rate-limit";
import { fail, ok } from "./v1/_helpers";

// API pública do widget — sem auth de agente; a credencial é o website_token
// (+ contact_token da sessão). Paths iguais ao Rails.
const app = new Hono().use(rateLimit(180));

const tokenQuery = z.object({ website_token: z.string().min(1) });

app.get("/config", zValidator("query", tokenQuery), async (c) => {
  try {
    return ok(c, await getWidgetConfig(c.req.valid("query").website_token));
  } catch (err) {
    return fail(c, err);
  }
});

const contactBody = z.object({
  identifier: z.string().optional(),
  name: z.string().optional(),
  email: z.union([z.email(), z.literal("")]).optional(),
  phone_number: z.string().optional(),
  custom_attributes: z.record(z.string(), z.unknown()).optional(),
});

app.post(
  "/contact",
  zValidator("query", tokenQuery),
  zValidator("json", contactBody),
  async (c) => {
    try {
      const result = await upsertWidgetContact(
        c.req.valid("query").website_token,
        c.req.valid("json"),
      );
      return c.json({ data: result }, 201);
    } catch (err) {
      return fail(c, err);
    }
  },
);

app.post(
  "/contact/update",
  zValidator("query", tokenQuery),
  zValidator("json", contactBody.extend({ contact_token: z.string().min(1) })),
  async (c) => {
    try {
      const { contact_token, ...input } = c.req.valid("json");
      const result = await updateWidgetContact(
        c.req.valid("query").website_token,
        contact_token,
        input,
      );
      return ok(c, result);
    } catch (err) {
      return fail(c, err);
    }
  },
);

const sessionQuery = tokenQuery.extend({ contact_token: z.string().min(1) });

app.get("/conversations", zValidator("query", sessionQuery), async (c) => {
  try {
    const { website_token, contact_token } = c.req.valid("query");
    return ok(c, { conversations: await listWidgetConversations(website_token, contact_token) });
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/conversations", zValidator("query", sessionQuery), async (c) => {
  try {
    const { website_token, contact_token } = c.req.valid("query");
    const conversation = await createWidgetConversation(website_token, contact_token);
    return c.json({ data: { conversation } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/conversations/:id/messages", zValidator("query", sessionQuery), async (c) => {
  try {
    const { website_token, contact_token } = c.req.valid("query");
    const messages = await listWidgetMessages(
      website_token,
      contact_token,
      Number(c.req.param("id")),
    );
    return ok(c, { messages });
  } catch (err) {
    return fail(c, err);
  }
});

app.post(
  "/conversations/:id/messages",
  zValidator("query", sessionQuery),
  zValidator("json", z.object({ content: z.string().trim().min(1).max(150000) })),
  async (c) => {
    try {
      const { website_token, contact_token } = c.req.valid("query");
      const message = await sendWidgetMessage(
        website_token,
        contact_token,
        Number(c.req.param("id")),
        c.req.valid("json").content,
      );
      return c.json({ data: { message } }, 201);
    } catch (err) {
      return fail(c, err);
    }
  },
);

app.put("/conversations/:id/read", zValidator("query", sessionQuery), async (c) => {
  try {
    const { website_token, contact_token } = c.req.valid("query");
    await markWidgetConversationRead(website_token, contact_token, Number(c.req.param("id")));
    return ok(c, { ok: true });
  } catch (err) {
    return fail(c, err);
  }
});

app.post(
  "/csat",
  zValidator("query", sessionQuery),
  zValidator(
    "json",
    z.object({
      conversation_id: z.number().int().positive(),
      rating: z.number().int().min(1).max(5),
      feedback_message: z.string().max(5000).optional(),
    }),
  ),
  async (c) => {
    try {
      const { website_token, contact_token } = c.req.valid("query");
      const { conversation_id, rating, feedback_message } = c.req.valid("json");
      const result = await submitWidgetCsat(
        website_token,
        contact_token,
        conversation_id,
        rating,
        feedback_message,
      );
      return c.json({ data: result }, 201);
    } catch (err) {
      return fail(c, err);
    }
  },
);

export default app;
