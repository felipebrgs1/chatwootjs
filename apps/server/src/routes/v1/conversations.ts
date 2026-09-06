import {
  AssigneeBodySchema,
  ConversationLabelsBodySchema,
  ConversationQuerySchema,
  CreateMessageSchema,
  MAX_UPLOAD_BYTES,
  MessagesQuerySchema,
  PriorityBodySchema,
  SnoozeBodySchema,
  TeamBodySchema,
  ToggleStatusSchema,
  SubmitCsatSchema,
  addParticipants,
  assignConversation,
  createConversation,
  deleteMessage,
  getConversation,
  listConversations,
  listMessages,
  listParticipants,
  markConversationRead,
  muteConversation,
  removeParticipant,
  sendAgentMessage,
  setConversationLabels,
  setConversationPriority,
  setConversationTeam,
  submitCsat,
  toggleConversationStatus,
  uploadMessageAttachment,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

// ---- Lista + contadores ----

app.get("/", zValidator("query", ConversationQuerySchema), async (c) => {
  try {
    const query = c.req.valid("query");
    const { data, meta } = await listConversations(c.var.auth.accountId, c.var.auth, query);
    return ok(c, { conversations: data, payload: data, meta });
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/search", async (c) => {
  try {
    const q = c.req.query("q") ?? "";
    const { data, meta } = await listConversations(c.var.auth.accountId, c.var.auth, {
      status: "open",
      q,
      page: 1,
    });
    return ok(c, { conversations: data }, meta);
  } catch (err) {
    return fail(c, err);
  }
});

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      inbox_id: z.number().int().positive(),
      contact_id: z.number().int().positive(),
      status: z.enum(["open", "pending", "resolved", "snoozed"]).optional(),
      message: z.object({ content: z.string() }).optional(),
    }),
  ),
  async (c) => {
    try {
      const conversation = await createConversation(
        c.var.auth.accountId,
        c.var.auth,
        c.req.valid("json"),
      );
      return c.json({ data: { conversation } }, 201);
    } catch (err) {
      return fail(c, err);
    }
  },
);

const withConversation = new Hono<AppEnv>();

withConversation.get("/", async (c) => {
  try {
    const conversation = await getConversation(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
    );
    return ok(c, { conversation });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/toggle_status", zValidator("json", ToggleStatusSchema), async (c) => {
  try {
    const { status, snoozed_until } = c.req.valid("json");
    const conversation = await toggleConversationStatus(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      status,
      snoozed_until,
    );
    return ok(c, { conversation });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/assignments", zValidator("json", AssigneeBodySchema), async (c) => {
  try {
    const { assignee_id } = c.req.valid("json");
    const conversation = await assignConversation(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      assignee_id,
    );
    return ok(c, { conversation });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/team", zValidator("json", TeamBodySchema), async (c) => {
  try {
    const { team_id } = c.req.valid("json");
    const conversation = await setConversationTeam(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      team_id === 0 ? null : team_id,
    );
    return ok(c, { conversation });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/priority", zValidator("json", PriorityBodySchema), async (c) => {
  try {
    const { priority } = c.req.valid("json");
    const conversation = await setConversationPriority(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      priority,
    );
    return ok(c, { conversation });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/labels", zValidator("json", ConversationLabelsBodySchema), async (c) => {
  try {
    const { labels } = c.req.valid("json");
    const result = await setConversationLabels(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      labels,
    );
    return ok(c, { labels: result });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/mute", async (c) => {
  try {
    await muteConversation(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      true,
    );
    return ok(c, { ok: true });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/unmute", async (c) => {
  try {
    await muteConversation(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      false,
    );
    return ok(c, { ok: true });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/read", async (c) => {
  try {
    await markConversationRead(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
    );
    return ok(c, { ok: true });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/snooze", zValidator("json", SnoozeBodySchema), async (c) => {
  try {
    const { snoozed_until } = c.req.valid("json");
    const conversation = await toggleConversationStatus(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      "snoozed",
      snoozed_until,
    );
    return ok(c, { conversation });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/csat", zValidator("json", SubmitCsatSchema), async (c) => {
  try {
    const response = await submitCsat(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("conversation_id")),
      c.req.valid("json"),
    );
    return c.json({ data: { csat_response: response } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

// ---- Mensagens ----

withConversation.get("/messages", zValidator("query", MessagesQuerySchema), async (c) => {
  try {
    const { after } = c.req.valid("query");
    const messages = await listMessages(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      after,
    );
    return ok(c, { messages });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/messages", zValidator("json", CreateMessageSchema), async (c) => {
  try {
    const message = await sendAgentMessage(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      c.req.valid("json"),
    );
    return c.json({ data: { message } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.delete("/messages/:message_id", async (c) => {
  try {
    await deleteMessage(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      Number(c.req.param("message_id")),
    );
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post("/upload", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) {
      return c.json({ error: "Missing file" }, 422);
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return c.json({ error: "File too large (max 40MB)" }, 422);
    }
    const asPrivate = body["private"] === "true" || body["private"] === "1";
    const content = typeof body["content"] === "string" ? body["content"] : undefined;
    const message = await uploadMessageAttachment(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      {
        filename: file.name || "upload",
        contentType: file.type || "application/octet-stream",
        data: new Uint8Array(await file.arrayBuffer()),
        private: asPrivate,
        content,
      },
    );
    return c.json({ data: { message } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

// ---- Participantes ----

withConversation.get("/participants", async (c) => {
  try {
    const participants = await listParticipants(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
    );
    return ok(c, { participants });
  } catch (err) {
    return fail(c, err);
  }
});

withConversation.post(
  "/participants",
  zValidator("json", z.object({ user_ids: z.array(z.number().int().positive()).min(1) })),
  async (c) => {
    try {
      const { user_ids } = c.req.valid("json");
      const participants = await addParticipants(
        c.var.auth.accountId,
        Number(c.req.param("conversation_id")),
        c.var.auth,
        user_ids,
      );
      return c.json({ data: { participants } }, 201);
    } catch (err) {
      return fail(c, err);
    }
  },
);

withConversation.delete("/participants/:user_id", async (c) => {
  try {
    await removeParticipant(
      c.var.auth.accountId,
      Number(c.req.param("conversation_id")),
      c.var.auth,
      Number(c.req.param("user_id")),
    );
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

app.route("/:conversation_id", withConversation);

export default app;
