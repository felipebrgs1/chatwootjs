import {
  CompaniesQuerySchema,
  CompanyContactBodySchema,
  CreateCompanySchema,
  UpdateCompanySchema,
  addCompanyContact,
  createCompany,
  deleteCompany,
  getCompany,
  listCompanies,
  listCompanyContacts,
  listCompanyConversations,
  listCompanyNotes,
  removeCompanyContact,
  updateCompany,
} from "@chatwootjs/core";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import type { AppEnv } from "../../middlewares/auth";
import { authAccount } from "../../middlewares/auth";
import { fail, ok } from "./_helpers";

const app = new Hono<AppEnv>().use(authAccount);

app.get("/", zValidator("query", CompaniesQuerySchema), async (c) => {
  try {
    const query = c.req.valid("query");
    const { data, meta } = await listCompanies(c.var.auth.accountId, query);
    return ok(c, { companies: data }, meta);
  } catch (err) {
    return fail(c, err);
  }
});

app.get(
  "/search",
  zValidator("query", z.object({ q: z.string().trim().default("") })),
  async (c) => {
    try {
      const { q } = c.req.valid("query");
      const { data } = await listCompanies(c.var.auth.accountId, {
        q: q || undefined,
        page: 1,
        per_page: 15,
      });
      return ok(c, { companies: data });
    } catch (err) {
      return fail(c, err);
    }
  },
);

app.post("/", zValidator("json", CreateCompanySchema), async (c) => {
  try {
    const company = await createCompany(c.var.auth.accountId, c.var.auth, c.req.valid("json"));
    return c.json({ data: { company } }, 201);
  } catch (err) {
    return fail(c, err);
  }
});

const withCompany = new Hono<AppEnv>();

withCompany.get("/", async (c) => {
  try {
    return ok(c, {
      company: await getCompany(c.var.auth.accountId, Number(c.req.param("company_id"))),
    });
  } catch (err) {
    return fail(c, err);
  }
});

withCompany.patch("/", zValidator("json", UpdateCompanySchema), async (c) => {
  try {
    const company = await updateCompany(
      c.var.auth.accountId,
      c.var.auth,
      Number(c.req.param("company_id")),
      c.req.valid("json"),
    );
    return ok(c, { company });
  } catch (err) {
    return fail(c, err);
  }
});

withCompany.delete("/", async (c) => {
  try {
    await deleteCompany(c.var.auth.accountId, c.var.auth, Number(c.req.param("company_id")));
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

withCompany.get("/contacts", async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page") ?? 1));
    const { data, meta } = await listCompanyContacts(
      c.var.auth.accountId,
      Number(c.req.param("company_id")),
      page,
    );
    return ok(c, { contacts: data }, meta);
  } catch (err) {
    return fail(c, err);
  }
});

withCompany.post("/contacts", zValidator("json", CompanyContactBodySchema), async (c) => {
  try {
    const { contact_id } = c.req.valid("json");
    return c.json(
      {
        data: {
          contact: await addCompanyContact(
            c.var.auth.accountId,
            Number(c.req.param("company_id")),
            contact_id,
          ),
        },
      },
      201,
    );
  } catch (err) {
    return fail(c, err);
  }
});

withCompany.delete("/contacts/:contact_id", async (c) => {
  try {
    await removeCompanyContact(
      c.var.auth.accountId,
      Number(c.req.param("company_id")),
      Number(c.req.param("contact_id")),
    );
    return c.json({ data: { ok: true } });
  } catch (err) {
    return fail(c, err);
  }
});

withCompany.get("/conversations", async (c) => {
  try {
    return ok(c, {
      conversations: await listCompanyConversations(
        c.var.auth.accountId,
        Number(c.req.param("company_id")),
      ),
    });
  } catch (err) {
    return fail(c, err);
  }
});

withCompany.get("/notes", async (c) => {
  try {
    return ok(c, {
      notes: await listCompanyNotes(c.var.auth.accountId, Number(c.req.param("company_id"))),
    });
  } catch (err) {
    return fail(c, err);
  }
});

app.route("/:company_id", withCompany);

export default app;
