import {
  ContactsQuerySchema,
  ContactInboxBodySchema,
  CreateContactSchema,
  CreateNoteSchema,
  MergeContactSchema,
  UpdateContactSchema,
  createContact,
  createContactInbox,
  createNote,
  deleteContact,
  deleteNote,
  getContact,
  getImport,
  listContacts,
  listNotes,
  mergeContacts,
  startContactImport,
  updateContact,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", zValidator("query", ContactsQuerySchema), async (c) => {
  try {
    const query = c.req.valid("query");
    const { data, meta } = await listContacts(c.var.auth.accountId, query);
    return ok(c, { contacts: data }, meta);
  } catch (err) {
    return fail(c, err);
  }
});

app.post("/", zValidator("json", CreateContactSchema), async (c) => {
  try {
    const contact = await createContact(c.var.auth, c.req.valid("json"));
    return c.json({ data: { contact } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

const withContact = new Hono<AppEnv>();

withContact.get("/", async (c) => {
  try {
    const contact = await getContact(c.var.auth.accountId, Number(c.req.param("contact_id")), {
      withDetails: true,
    });
    return ok(c, { contact });
  } catch (err) {
    return fail(c, err);
  }
});

withContact.patch("/", zValidator("json", UpdateContactSchema), async (c) => {
  try {
    const contact = await updateContact(
      c.var.auth,
      Number(c.req.param("contact_id")),
      c.req.valid("json"),
    );
    return ok(c, { contact });
  } catch (err) {
    return fail(c, err);
  }
});

withContact.delete("/", async (c) => {
  try {
    await deleteContact(c.var.auth, Number(c.req.param("contact_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

// ---- Contact inboxes ----

withContact.post("/contact_inboxes", zValidator("json", ContactInboxBodySchema), async (c) => {
  try {
    const { inbox_id } = c.req.valid("json");
    const result = await createContactInbox(
      c.var.auth,
      Number(c.req.param("contact_id")),
      inbox_id,
    );
    return c.json({ data: { contact_inbox: result } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

// ---- Merge ----

withContact.post("/merge", zValidator("json", MergeContactSchema), async (c) => {
  try {
    const { child_id } = c.req.valid("json");
    const contact = await mergeContacts(c.var.auth, Number(c.req.param("contact_id")), child_id);
    return ok(c, { contact });
  } catch (err) {
    return fail(c, err);
  }
});

// ---- Notas ----

withContact.get("/notes", async (c) => {
  try {
    return ok(c, {
      notes: await listNotes(c.var.auth.accountId, Number(c.req.param("contact_id"))),
    });
  } catch (err) {
    return fail(c, err);
  }
});

withContact.post("/notes", zValidator("json", CreateNoteSchema), async (c) => {
  try {
    const { content } = c.req.valid("json");
    const note = await createNote(c.var.auth, Number(c.req.param("contact_id")), content);
    return c.json({ data: { note } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

withContact.delete("/notes/:note_id", async (c) => {
  try {
    await deleteNote(c.var.auth, Number(c.req.param("contact_id")), Number(c.req.param("note_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

// ---- Import CSV (multipart `data_file` ou JSON `{ csv }`) ----

app.post("/import", async (c) => {
  try {
    const contentType = c.req.header("Content-Type") ?? "";
    let csvText = "";
    if (contentType.includes("multipart/form-data")) {
      const body = await c.req.parseBody();
      const file = body["data_file"];
      if (file instanceof File) {
        csvText = await file.text();
      } else {
        return c.json({ error: "Missing data_file" }, 422);
      }
    } else {
      const json = (await c.req.json()) as { csv?: string; data_file?: string };
      csvText = json.csv ?? json.data_file ?? "";
    }
    const result = await startContactImport(c.var.auth, csvText);
    return c.json({ data: { data_import: result } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

app.get("/import/:import_id", async (c) => {
  try {
    const dataImport = await getImport(c.var.auth.accountId, Number(c.req.param("import_id")));
    return ok(c, { data_import: dataImport });
  } catch (err) {
    return fail(c, err);
  }
});

app.route("/:contact_id", withContact);

export default app;
