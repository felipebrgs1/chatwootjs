import {
  attachments,
  contactInboxes,
  contacts,
  conversations,
  customAttributeDefinitions,
  dataImportErrors,
  dataImports,
  db,
  inboxes,
  labels,
  messages,
  notes,
  taggings,
  type Contact,
} from "@chatwootjs/db";
import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { jobs } from "../jobs/index.js";
import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { requireAdmin, type AuthCtx } from "../policies/index.js";
import { ATTRIBUTE_TYPES } from "../schemas/contacts.js";
import { STATUS_FROM_INT } from "../schemas/conversations.js";
import type {
  ContactsQuery,
  CreateContactInput,
  CreateCustomAttributeInput,
  UpdateContactInput,
} from "../schemas/contacts.js";

// ---- Helpers ----

function normalizeEmail(email: string | undefined | null): string | undefined {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : undefined;
}

/** Valida `custom_attributes` contra as definitions da conta (22 do Rails). */
export async function validateCustomAttributes(
  accountId: number,
  attributeModel: 0 | 1,
  attrs: Record<string, unknown>,
): Promise<Record<string, string[]>> {
  const definitions = await db.query.customAttributeDefinitions.findMany({
    where: (d) => and(eq(d.accountId, accountId), eq(d.attributeModel, attributeModel)),
  });
  const errors: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const def = definitions.find((d) => d.attributeKey === key);
    if (!def) continue; // chave desconhecida: aceita como jsonb solto (Rails aceita)
    const type = ATTRIBUTE_TYPES[def.attributeDisplayType] ?? "text";
    if (type === "number" && typeof value !== "number" && !/^-?\d+(\.\d+)?$/.test(String(value))) {
      errors[key] = ["deve ser um número"];
    } else if (type === "link" && !/^https?:\/\//.test(String(value))) {
      errors[key] = ["deve ser uma URL"];
    } else if (type === "date" && Number.isNaN(Date.parse(String(value)))) {
      errors[key] = ["deve ser uma data válida"];
    } else if (type === "list" && def.attributeValues.length > 0) {
      const allowed = def.attributeValues.map(String);
      const values = Array.isArray(value) ? value.map(String) : String(value).split(",");
      const invalid = values.filter((v) => !allowed.includes(v));
      if (invalid.length > 0) errors[key] = [`valor(es) inválido(s): ${invalid.join(", ")}`];
    } else if (type === "checkbox" && typeof value !== "boolean") {
      errors[key] = ["deve ser verdadeiro/falso"];
    }
  }
  return errors;
}

// ---- Mappers ----

export interface ApiLabel {
  id: number;
  title: string;
  color: string;
  description: string | null;
  show_on_sidebar: boolean;
}

function toApiLabel(row: typeof labels.$inferSelect): ApiLabel {
  return {
    id: row.id,
    title: row.title ?? "",
    color: row.color,
    description: row.description ?? null,
    show_on_sidebar: row.showOnSidebar,
  };
}

export interface ApiContact {
  id: number;
  name: string;
  email: string | null;
  phone_number: string | null;
  identifier: string | null;
  location: string;
  country_code: string;
  company_id: number | null;
  company: { id: number; name: string; domain: string | null } | null;
  last_name: string;
  middle_name: string;
  blocked: boolean;
  contact_type: number;
  custom_attributes: Record<string, unknown>;
  additional_attributes: Record<string, unknown>;
  last_activity_at: string | null;
  created_at: string;
  labels?: ApiLabel[];
  contact_inboxes?: Array<{ id: number; inbox_id: number; source_id: string }>;
}

function toApiContact(row: Contact): ApiContact {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone_number: row.phoneNumber,
    identifier: row.identifier,
    location: row.location,
    country_code: row.countryCode,
    last_name: row.lastName,
    middle_name: row.middleName,
    blocked: row.blocked,
    contact_type: row.contactType,
    company_id: row.companyId,
    company: null,
    custom_attributes: row.customAttributes ?? {},
    additional_attributes: row.additionalAttributes ?? {},
    last_activity_at: row.lastActivityAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

// ---- Consultas ----

export interface ContactListResult {
  data: ApiContact[];
  meta: { count: number; current_page: number; total_pages: number; per_page: number };
}

export async function listContacts(
  accountId: number,
  query: ContactsQuery,
): Promise<ContactListResult> {
  const conditions = [eq(contacts.accountId, accountId)];

  if (query.q) {
    const pattern = `%${query.q}%`;
    conditions.push(
      or(
        ilike(contacts.name, pattern),
        ilike(contacts.email, pattern),
        ilike(contacts.phoneNumber, pattern),
        ilike(contacts.identifier, pattern),
      )!,
    );
  }

  if (query.labels && query.labels.length > 0) {
    const tagRows = await db
      .select({ taggableId: taggings.taggableId })
      .from(taggings)
      .innerJoin(labels, eq(labels.id, taggings.tagId))
      .where(
        and(
          eq(taggings.accountId, accountId),
          eq(taggings.taggableType, "Contact"),
          eq(taggings.context, "labels"),
          inArray(labels.title, query.labels),
        ),
      );
    const ids = tagRows.map((r) => r.taggableId);
    if (ids.length === 0) {
      return {
        data: [],
        meta: { count: 0, current_page: query.page, total_pages: 0, per_page: query.per_page },
      };
    }
    conditions.push(inArray(contacts.id, ids));
  }

  const where = and(...conditions);
  const [agg] = await db.select({ value: count() }).from(contacts).where(where);
  const total = Number(agg?.value ?? 0);

  // Prefixo `-` inverte a direção (convenção do Rails: sort=-name).
  const sortDesc = query.sort?.startsWith("-") ?? false;
  const sortField = query.sort?.replace(/^-/, "");
  const dir = (column: Parameters<typeof asc>[0], defaultDesc: boolean) => {
    const descending = query.sort === undefined ? defaultDesc : sortDesc;
    return descending ? desc(column) : asc(column);
  };
  const orderBy =
    sortField === "name"
      ? dir(contacts.name, false)
      : sortField === "email"
        ? dir(contacts.email, false)
        : sortField === "phone_number"
          ? dir(contacts.phoneNumber, false)
          : sortField === "created_at"
            ? dir(contacts.createdAt, true)
            : dir(contacts.lastActivityAt, true);

  const rows = await db
    .select()
    .from(contacts)
    .where(where)
    .orderBy(orderBy)
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page);

  const data = rows.map(toApiContact);
  // Anexa a empresa (join em lote) para exibir o nome no card.
  const companyIds = [
    ...new Set(data.map((c) => c.company_id).filter((v): v is number => v !== null)),
  ];
  if (companyIds.length > 0) {
    const companyRows = await db.query.companies.findMany({
      where: (c) => and(eq(c.accountId, accountId), inArray(c.id, companyIds)),
    });
    const byId = new Map(companyRows.map((c) => [c.id, c]));
    for (const item of data) {
      if (item.company_id !== null) {
        const company = byId.get(item.company_id);
        item.company = company
          ? { id: company.id, name: company.name, domain: company.domain }
          : null;
      }
    }
  }
  return {
    data,
    meta: {
      count: total,
      current_page: query.page,
      total_pages: total === 0 ? 0 : Math.ceil(total / query.per_page),
      per_page: query.per_page,
    },
  };
}

export async function getContact(
  accountId: number,
  contactId: number,
  options: { withDetails?: boolean } = {},
): Promise<ApiContact> {
  const row = await db.query.contacts.findFirst({
    where: (ct) => and(eq(ct.accountId, accountId), eq(ct.id, contactId)),
  });
  if (!row) throw new NotFoundError("Contact not found");
  const api = toApiContact(row);
  if (options.withDetails) {
    const tagRows = await db
      .select({ label: labels })
      .from(taggings)
      .innerJoin(labels, eq(labels.id, taggings.tagId))
      .where(
        and(
          eq(taggings.taggableType, "Contact"),
          eq(taggings.taggableId, contactId),
          eq(taggings.context, "labels"),
        ),
      );
    api.labels = tagRows.map((r) => toApiLabel(r.label));
    api.contact_inboxes = (
      await db.query.contactInboxes.findMany({ where: (ci) => eq(ci.contactId, contactId) })
    ).map((ci) => ({ id: ci.id, inbox_id: ci.inboxId, source_id: ci.sourceId }));
    if (row.companyId) {
      const company = await db.query.companies.findFirst({
        where: (c) => and(eq(c.accountId, accountId), eq(c.id, row.companyId!)),
      });
      api.company = company ? { id: company.id, name: company.name, domain: company.domain } : null;
    }
  }
  return api;
}

async function assertCompanyInAccount(accountId: number, companyId: number): Promise<void> {
  const company = await db.query.companies.findFirst({
    where: (c) => and(eq(c.accountId, accountId), eq(c.id, companyId)),
  });
  if (!company) throw new NotFoundError("Company not found");
}

// ---- Mutação ----

export async function createContact(auth: AuthCtx, input: CreateContactInput): Promise<ApiContact> {
  const email = normalizeEmail(input.email);
  if (email) {
    const existing = await db.query.contacts.findFirst({
      where: (ct) => and(eq(ct.accountId, auth.accountId), eq(ct.email, email)),
    });
    if (existing) {
      throw new UnprocessableError("Email already taken", { email: ["já está em uso"] });
    }
  }
  if (input.custom_attributes) {
    const errors = await validateCustomAttributes(auth.accountId, 0, input.custom_attributes);
    if (Object.keys(errors).length > 0) {
      throw new UnprocessableError("Invalid custom attributes", errors);
    }
  }
  if (input.company_id !== undefined && input.company_id !== null) {
    await assertCompanyInAccount(auth.accountId, input.company_id);
  }
  const [row] = await db
    .insert(contacts)
    .values({
      accountId: auth.accountId,
      name: input.name ?? "",
      email: email ?? null,
      companyId: input.company_id ?? null,
      phoneNumber: input.phone_number || null,
      identifier: input.identifier || null,
      location: input.location ?? "",
      countryCode: input.country_code ?? "",
      lastName: input.last_name ?? "",
      middleName: input.middle_name ?? "",
      blocked: input.blocked ?? false,
      customAttributes: input.custom_attributes ?? {},
      additionalAttributes: input.additional_attributes ?? {},
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create contact");
  return toApiContact(row);
}

export async function updateContact(
  auth: AuthCtx,
  contactId: number,
  input: UpdateContactInput,
): Promise<ApiContact> {
  const row = await db.query.contacts.findFirst({
    where: (ct) => and(eq(ct.accountId, auth.accountId), eq(ct.id, contactId)),
  });
  if (!row) throw new NotFoundError("Contact not found");

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.email !== undefined) {
    const email = normalizeEmail(input.email ?? undefined);
    if (email && email !== row.email) {
      const existing = await db.query.contacts.findFirst({
        where: (ct) => and(eq(ct.accountId, auth.accountId), eq(ct.email, email)),
      });
      if (existing && existing.id !== contactId) {
        throw new UnprocessableError("Email already taken", { email: ["já está em uso"] });
      }
    }
    patch.email = email ?? null;
  }
  if (input.phone_number !== undefined) patch.phoneNumber = input.phone_number || null;
  if (input.identifier !== undefined) patch.identifier = input.identifier || null;
  if (input.location !== undefined) patch.location = input.location;
  if (input.country_code !== undefined) patch.countryCode = input.country_code;
  if (input.last_name !== undefined) patch.lastName = input.last_name;
  if (input.middle_name !== undefined) patch.middleName = input.middle_name;
  if (input.blocked !== undefined) patch.blocked = input.blocked;
  if (input.company_id !== undefined) {
    if (input.company_id !== null) {
      await assertCompanyInAccount(auth.accountId, input.company_id);
    }
    patch.companyId = input.company_id;
  }
  if (input.custom_attributes !== undefined) {
    const errors = await validateCustomAttributes(auth.accountId, 0, input.custom_attributes);
    if (Object.keys(errors).length > 0) {
      throw new UnprocessableError("Invalid custom attributes", errors);
    }
    patch.customAttributes = { ...row.customAttributes, ...input.custom_attributes };
  }
  if (input.additional_attributes !== undefined) {
    patch.additionalAttributes = { ...row.additionalAttributes, ...input.additional_attributes };
  }

  await db.update(contacts).set(patch).where(eq(contacts.id, contactId));
  const fresh = await db.query.contacts.findFirst({
    where: (ct) => eq(ct.id, contactId),
  });
  if (!fresh) throw new NotFoundError("Contact not found");
  return toApiContact(fresh);
}

export async function deleteContact(auth: AuthCtx, contactId: number): Promise<void> {
  const deleted = await db
    .delete(contacts)
    .where(and(eq(contacts.accountId, auth.accountId), eq(contacts.id, contactId)))
    .returning({ id: contacts.id });
  if (deleted.length === 0) throw new NotFoundError("Contact not found");
}

// ---- Contact inboxes ----

function uuid(): string {
  return crypto.randomUUID();
}

export async function createContactInbox(
  auth: AuthCtx,
  contactId: number,
  inboxId: number,
): Promise<{ id: number; source_id: string; inbox_id: number }> {
  const contact = await db.query.contacts.findFirst({
    where: (ct) => and(eq(ct.accountId, auth.accountId), eq(ct.id, contactId)),
  });
  if (!contact) throw new NotFoundError("Contact not found");
  const [existing] = await db
    .select({ id: contactInboxes.id, sourceId: contactInboxes.sourceId })
    .from(contactInboxes)
    .where(and(eq(contactInboxes.contactId, contactId), eq(contactInboxes.inboxId, inboxId)))
    .limit(1);
  if (existing) {
    return { id: existing.id, source_id: existing.sourceId, inbox_id: inboxId };
  }
  const sourceId = uuid();
  const [row] = await db
    .insert(contactInboxes)
    .values({
      contactId,
      inboxId,
      sourceId,
      pubsubToken: uuid(),
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create contact inbox");
  return { id: row.id, source_id: row.sourceId, inbox_id: row.inboxId };
}

// ---- Merge (ContactMergeAction) ----

export async function mergeContacts(
  auth: AuthCtx,
  baseId: number,
  childId: number,
): Promise<ApiContact> {
  if (baseId === childId) {
    throw new UnprocessableError("Cannot merge same contact", {
      child_id: ["igual ao contato base"],
    });
  }
  const [base, child] = await Promise.all([
    db.query.contacts.findFirst({
      where: (ct) => and(eq(ct.accountId, auth.accountId), eq(ct.id, baseId)),
    }),
    db.query.contacts.findFirst({
      where: (ct) => and(eq(ct.accountId, auth.accountId), eq(ct.id, childId)),
    }),
  ]);
  if (!base || !child) throw new NotFoundError("Contact not found");

  await db.transaction(async (tx) => {
    // Move contact_inboxes para o base (colisão: mantém a do base).
    const childInboxes = await tx.query.contactInboxes.findMany({
      where: (ci) => eq(ci.contactId, childId),
    });
    for (const ci of childInboxes) {
      const clash = await tx.query.contactInboxes.findFirst({
        where: (x) => and(eq(x.inboxId, ci.inboxId), eq(x.contactId, baseId)),
      });
      if (!clash) {
        await tx
          .update(contactInboxes)
          .set({ contactId: baseId })
          .where(eq(contactInboxes.id, ci.id));
      }
    }
    // Move notas.
    await tx.update(notes).set({ contactId: baseId }).where(eq(notes.contactId, childId));
    // Move taggings.
    await tx
      .update(taggings)
      .set({ taggableId: baseId })
      .where(and(eq(taggings.taggableType, "Contact"), eq(taggings.taggableId, childId)));

    // Atributos: o base mantém o próprio valor; campos vazios herdam do child.
    await tx
      .update(contacts)
      .set({
        name: base.name || child.name,
        email: base.email ?? child.email,
        phoneNumber: base.phoneNumber ?? child.phoneNumber,
        customAttributes: { ...child.customAttributes, ...base.customAttributes },
        additionalAttributes: { ...child.additionalAttributes, ...base.additionalAttributes },
        lastActivityAt: base.lastActivityAt ?? child.lastActivityAt,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, baseId));

    await tx.delete(contacts).where(eq(contacts.id, childId));
  });

  const fresh = await db.query.contacts.findFirst({ where: (ct) => eq(ct.id, baseId) });
  if (!fresh) throw new NotFoundError("Contact not found");
  return toApiContact(fresh);
}

// ---- Notas ----

export interface ApiNote {
  id: number;
  content: string;
  user_id: number | null;
  user_name: string | null;
  created_at: string;
}

export async function listNotes(accountId: number, contactId: number): Promise<ApiNote[]> {
  const rows = await db.query.notes.findMany({
    where: (n) => and(eq(n.accountId, accountId), eq(n.contactId, contactId)),
    orderBy: (n) => desc(n.createdAt),
  });
  const userIds = [...new Set(rows.map((r) => r.userId).filter((v): v is number => v !== null))];
  const users =
    userIds.length > 0
      ? await db.query.users.findMany({
          where: (u) => inArray(u.id, userIds),
          columns: { id: true, name: true },
        })
      : [];
  const names = new Map(users.map((u) => [u.id, u.name]));
  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    user_id: row.userId,
    user_name: row.userId ? (names.get(row.userId) ?? null) : null,
    created_at: row.createdAt.toISOString(),
  }));
}

export async function createNote(
  auth: AuthCtx,
  contactId: number,
  content: string,
): Promise<ApiNote> {
  const contact = await db.query.contacts.findFirst({
    where: (ct) => and(eq(ct.accountId, auth.accountId), eq(ct.id, contactId)),
  });
  if (!contact) throw new NotFoundError("Contact not found");
  const [row] = await db
    .insert(notes)
    .values({ accountId: auth.accountId, contactId, userId: auth.userId, content })
    .returning();
  if (!row) throw new UnprocessableError("Could not create note");
  return {
    id: row.id,
    content: row.content,
    user_id: row.userId,
    user_name: null,
    created_at: row.createdAt.toISOString(),
  };
}

export async function deleteNote(auth: AuthCtx, contactId: number, noteId: number): Promise<void> {
  const deleted = await db
    .delete(notes)
    .where(
      and(
        eq(notes.accountId, auth.accountId),
        eq(notes.contactId, contactId),
        eq(notes.id, noteId),
      ),
    )
    .returning({ id: notes.id });
  if (deleted.length === 0) throw new NotFoundError("Note not found");
}

// ---- Labels ----

export async function listLabels(accountId: number): Promise<ApiLabel[]> {
  const rows = await db.query.labels.findMany({
    where: (l) => eq(l.accountId, accountId),
    orderBy: (l) => l.title,
  });
  return rows.map(toApiLabel);
}

export async function createLabel(
  auth: AuthCtx,
  input: { title: string; color: string; description?: string; show_on_sidebar?: boolean },
): Promise<ApiLabel> {
  requireAdmin(auth);
  const title = input.title.toLowerCase().replaceAll(" ", "_");
  const [row] = await db
    .insert(labels)
    .values({
      accountId: auth.accountId,
      title,
      color: input.color,
      description: input.description,
      showOnSidebar: input.show_on_sidebar ?? true,
    })
    .onConflictDoNothing({ target: [labels.title, labels.accountId] })
    .returning();
  if (!row) {
    throw new UnprocessableError("Title already exists", { title: ["já está em uso"] });
  }
  return toApiLabel(row);
}

export async function updateLabel(
  auth: AuthCtx,
  labelId: number,
  patch: { title?: string; color?: string; description?: string | null; show_on_sidebar?: boolean },
): Promise<ApiLabel> {
  requireAdmin(auth);
  const row = await db.query.labels.findFirst({
    where: (l) => and(eq(l.accountId, auth.accountId), eq(l.id, labelId)),
  });
  if (!row) throw new NotFoundError("Label not found");
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) update.title = patch.title.toLowerCase().replaceAll(" ", "_");
  if (patch.color !== undefined) update.color = patch.color;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.show_on_sidebar !== undefined) update.showOnSidebar = patch.show_on_sidebar;
  await db.update(labels).set(update).where(eq(labels.id, labelId));
  const fresh = await db.query.labels.findFirst({ where: (l) => eq(l.id, labelId) });
  if (!fresh) throw new NotFoundError("Label not found");
  return toApiLabel(fresh);
}

export async function deleteLabel(auth: AuthCtx, labelId: number): Promise<void> {
  const deleted = await db
    .delete(labels)
    .where(and(eq(labels.accountId, auth.accountId), eq(labels.id, labelId)))
    .returning({ id: labels.id });
  if (deleted.length === 0) throw new NotFoundError("Label not found");
}

// ---- Custom attribute definitions ----

export interface ApiCustomAttribute {
  id: number;
  attribute_model: number;
  attribute_key: string;
  attribute_display_name: string | null;
  attribute_description: string | null;
  attribute_display_type: number;
  default_value: string | null;
  attribute_values: unknown[];
  regex_pattern: string | null;
  regex_cue: string | null;
}

function toApiCustomAttribute(
  row: typeof customAttributeDefinitions.$inferSelect,
): ApiCustomAttribute {
  return {
    id: row.id,
    attribute_model: row.attributeModel,
    attribute_key: row.attributeKey,
    attribute_display_name: row.attributeDisplayName,
    attribute_description: row.attributeDescription,
    attribute_display_type: row.attributeDisplayType,
    default_value: row.defaultValue,
    attribute_values: row.attributeValues ?? [],
    regex_pattern: row.regexPattern,
    regex_cue: row.regexCue,
  };
}

export async function listCustomAttributes(accountId: number, attributeModel?: 0 | 1) {
  const rows = await db.query.customAttributeDefinitions.findMany({
    where: (d) =>
      attributeModel === undefined
        ? eq(d.accountId, accountId)
        : and(eq(d.accountId, accountId), eq(d.attributeModel, attributeModel)),
    orderBy: (d) => d.attributeDisplayName,
  });
  return rows.map(toApiCustomAttribute);
}

export async function createCustomAttribute(
  auth: AuthCtx,
  input: CreateCustomAttributeInput,
): Promise<ApiCustomAttribute> {
  requireAdmin(auth);
  const [row] = await db
    .insert(customAttributeDefinitions)
    .values({
      accountId: auth.accountId,
      attributeModel: input.attribute_model,
      attributeKey: input.attribute_key,
      attributeDisplayName: input.attribute_display_name,
      attributeDescription: input.attribute_description,
      attributeDisplayType: input.attribute_display_type,
      defaultValue: input.default_value,
      attributeValues: input.attribute_values ?? [],
      regexPattern: input.regex_pattern,
      regexCue: input.regex_cue,
    })
    .onConflictDoNothing()
    .returning();
  if (!row) {
    throw new UnprocessableError("Key already exists", { attribute_key: ["já está em uso"] });
  }
  return toApiCustomAttribute(row);
}

export async function updateCustomAttribute(
  auth: AuthCtx,
  id: number,
  patch: Partial<CreateCustomAttributeInput>,
): Promise<ApiCustomAttribute> {
  requireAdmin(auth);
  const row = await db.query.customAttributeDefinitions.findFirst({
    where: (d) => and(eq(d.accountId, auth.accountId), eq(d.id, id)),
  });
  if (!row) throw new NotFoundError("Custom attribute not found");
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.attribute_key !== undefined) update.attributeKey = patch.attribute_key;
  if (patch.attribute_display_name !== undefined)
    update.attributeDisplayName = patch.attribute_display_name;
  if (patch.attribute_description !== undefined)
    update.attributeDescription = patch.attribute_description;
  if (patch.attribute_display_type !== undefined)
    update.attributeDisplayType = patch.attribute_display_type;
  if (patch.default_value !== undefined) update.defaultValue = patch.default_value;
  if (patch.attribute_values !== undefined) update.attributeValues = patch.attribute_values;
  if (patch.regex_pattern !== undefined) update.regexPattern = patch.regex_pattern;
  if (patch.regex_cue !== undefined) update.regexCue = patch.regex_cue;
  await db
    .update(customAttributeDefinitions)
    .set(update)
    .where(eq(customAttributeDefinitions.id, id));
  const fresh = await db.query.customAttributeDefinitions.findFirst({
    where: (d) => eq(d.id, id),
  });
  if (!fresh) throw new NotFoundError("Custom attribute not found");
  return toApiCustomAttribute(fresh);
}

export async function deleteCustomAttribute(auth: AuthCtx, id: number): Promise<void> {
  const deleted = await db
    .delete(customAttributeDefinitions)
    .where(
      and(
        eq(customAttributeDefinitions.accountId, auth.accountId),
        eq(customAttributeDefinitions.id, id),
      ),
    )
    .returning({ id: customAttributeDefinitions.id });
  if (deleted.length === 0) throw new NotFoundError("Custom attribute not found");
}

// ---- Import CSV (data_imports + job) ----

/** CSV simples (com suporte a aspas). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === "," || ch === ";" || ch === "\t") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

const IMPORT_STATUS = { pending: 0, processing: 1, completed: 2, failed: 3 } as const;

/** Inicia o import: cria o registro e dispara o job (in-process, interface BullMQ). */
export async function startContactImport(
  auth: AuthCtx,
  csvText: string,
): Promise<{ id: number; status: number; total_records: number | null }> {
  const rows = parseCsv(csvText.trim());
  if (rows.length < 2) {
    throw new UnprocessableError("CSV must have a header and at least one row");
  }
  const header = rows[0]!.map((h) => h.trim().toLowerCase().replaceAll(" ", "_"));
  const dataRows = rows.slice(1);
  if (!header.includes("name")) {
    throw new UnprocessableError("CSV must have a 'name' column", {
      data_file: ["coluna obrigatória ausente: name"],
    });
  }

  const [row] = await db
    .insert(dataImports)
    .values({
      accountId: auth.accountId,
      dataType: "contact",
      status: IMPORT_STATUS.pending,
      totalRecords: dataRows.length,
      name: `contacts_${new Date().toISOString().slice(0, 10)}`,
      initiatedById: auth.userId,
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create import");

  await jobs.dispatch({
    name: "import.contacts",
    payload: { accountId: auth.accountId, importId: row.id, header, rows: dataRows },
  });

  const fresh = await db.query.dataImports.findFirst({ where: (d) => eq(d.id, row.id) });
  return {
    id: row.id,
    status: fresh?.status ?? IMPORT_STATUS.pending,
    total_records: fresh?.totalRecords ?? null,
  };
}

export async function getImport(accountId: number, importId: number) {
  const row = await db.query.dataImports.findFirst({
    where: (d) => and(eq(d.accountId, accountId), eq(d.id, importId)),
  });
  if (!row) throw new NotFoundError("Import not found");
  const errors = await db.query.dataImportErrors.findMany({
    where: (e) => eq(e.dataImportId, importId),
    limit: 100,
  });
  return {
    id: row.id,
    data_type: row.dataType,
    status: row.status,
    total_records: row.totalRecords,
    processed_records: row.processedRecords,
    stats: row.stats,
    errors: errors.map((e) => ({
      error_code: e.errorCode,
      message: e.message,
      details: e.details,
    })),
  };
}

/** Handler do job `import.contacts` — registra no `jobs` do core no boot. */
export function registerContactImportJob(): void {
  jobs.on("import.contacts", async (payload) => {
    const { accountId, importId, header, rows } = payload as {
      accountId: number;
      importId: number;
      header: string[];
      rows: string[][];
    };
    await db
      .update(dataImports)
      .set({ status: IMPORT_STATUS.processing, startedAt: new Date(), updatedAt: new Date() })
      .where(eq(dataImports.id, importId));

    let processed = 0;
    let failed = 0;
    const nameIdx = header.indexOf("name");
    const emailIdx = header.indexOf("email");
    const phoneIdx = header.indexOf("phone_number");

    for (const row of rows) {
      const name = (nameIdx >= 0 ? row[nameIdx] : "") ?? "";
      const email = normalizeEmail(emailIdx >= 0 ? row[emailIdx] : undefined) ?? null;
      const phoneNumber = phoneIdx >= 0 ? row[phoneIdx] || null : null;
      try {
        if (!name.trim() && !email) {
          throw new Error("linha sem name e email");
        }
        if (email) {
          const existing = await db.query.contacts.findFirst({
            where: (ct) => and(eq(ct.accountId, accountId), eq(ct.email, email)),
          });
          if (existing) throw new Error("email duplicado");
        }
        const [created] = await db
          .insert(contacts)
          .values({ accountId, name, email: email ?? null, phoneNumber })
          .returning({ id: contacts.id });
        if (!created) throw new Error("falha ao inserir");
      } catch (err) {
        failed++;
        await db.insert(dataImportErrors).values({
          dataImportId: importId,
          sourceObjectType: "contact",
          sourceObjectId: name || email || String(processed + failed),
          errorCode: "invalid_row",
          message: err instanceof Error ? err.message : "erro desconhecido",
        });
      }
      processed++;
      await db
        .update(dataImports)
        .set({ processedRecords: processed, updatedAt: new Date() })
        .where(eq(dataImports.id, importId));
    }

    await db
      .update(dataImports)
      .set({
        status:
          failed > 0 && processed - failed === 0 ? IMPORT_STATUS.failed : IMPORT_STATUS.completed,
        completedAt: new Date(),
        updatedAt: new Date(),
        stats: { total: rows.length, processed, failed },
      })
      .where(eq(dataImports.id, importId));
  });
}

export { ATTRIBUTE_TYPES };

// ---- Detalhe do contato (abas da página "ver contato") ----

export interface ContactHistoryItem {
  id: number;
  display_id: number;
  status: string;
  inbox_id: number;
  inbox_name: string | null;
  last_activity_at: string | null;
  preview: string | null;
}

/** Conversas do contato (aba Histórico) — espelha contacts/conversations do Rails. */
export async function listContactConversations(
  accountId: number,
  contactId: number,
): Promise<ContactHistoryItem[]> {
  await getContact(accountId, contactId);
  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.accountId, accountId), eq(conversations.contactId, contactId)))
    .orderBy(desc(conversations.lastActivityAt))
    .limit(50);
  const inboxIds = [...new Set(rows.map((r) => r.inboxId))];
  const inboxRows =
    inboxIds.length > 0 ? await db.select().from(inboxes).where(inArray(inboxes.id, inboxIds)) : [];
  const inboxById = new Map(inboxRows.map((i) => [i.id, i]));
  const items: ContactHistoryItem[] = [];
  for (const row of rows) {
    const [last] = await db
      .select({ content: messages.content })
      .from(messages)
      .where(eq(messages.conversationId, row.id))
      .orderBy(desc(messages.createdAt))
      .limit(1);
    items.push({
      id: row.id,
      display_id: row.displayId,
      status: STATUS_FROM_INT[row.status] ?? "open",
      inbox_id: row.inboxId,
      inbox_name: inboxById.get(row.inboxId)?.name ?? null,
      last_activity_at: row.lastActivityAt?.toISOString() ?? null,
      preview: last?.content?.slice(0, 120) ?? null,
    });
  }
  return items;
}

const ATTACHMENT_TYPES = ["image", "audio", "video", "file"] as const;

export interface ContactAttachmentItem {
  id: number;
  file_type: (typeof ATTACHMENT_TYPES)[number];
  external_url: string | null;
  fallback_title: string | null;
  extension: string | null;
  created_at: string;
  message_id: number;
  conversation_id: number;
}

/** Anexos das conversas do contato (aba Mídia) — espelha contacts/attachments do Rails. */
export async function listContactAttachments(
  accountId: number,
  contactId: number,
): Promise<ContactAttachmentItem[]> {
  await getContact(accountId, contactId);
  const rows = await db
    .select({
      attachment: attachments,
      conversationId: conversations.id,
    })
    .from(attachments)
    .innerJoin(messages, eq(messages.id, attachments.messageId))
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(and(eq(attachments.accountId, accountId), eq(conversations.contactId, contactId)))
    .orderBy(desc(attachments.createdAt))
    .limit(100);
  return rows.map((r) => ({
    id: r.attachment.id,
    file_type: ATTACHMENT_TYPES[r.attachment.fileType] ?? "file",
    external_url: r.attachment.externalUrl,
    fallback_title: r.attachment.fallbackTitle,
    extension: r.attachment.extension,
    created_at: r.attachment.createdAt.toISOString(),
    message_id: r.attachment.messageId,
    conversation_id: r.conversationId,
  }));
}

/** Etiquetas do contato (espelha contacts/labels do Rails). */
export async function listContactLabels(accountId: number, contactId: number): Promise<ApiLabel[]> {
  await getContact(accountId, contactId);
  const tagRows = await db
    .select({ label: labels })
    .from(taggings)
    .innerJoin(labels, eq(labels.id, taggings.tagId))
    .where(
      and(
        eq(taggings.accountId, accountId),
        eq(taggings.taggableType, "Contact"),
        eq(taggings.taggableId, contactId),
        eq(taggings.context, "labels"),
      ),
    );
  return tagRows.map((r) => toApiLabel(r.label));
}

/** Substitui o conjunto de etiquetas (toggle do dropdown = add/remove). */
export async function setContactLabels(
  accountId: number,
  contactId: number,
  titles: string[],
): Promise<string[]> {
  await getContact(accountId, contactId);
  const existing = await db.query.labels.findMany({
    where: (l) => eq(l.accountId, accountId),
  });
  const byTitle = new Map(existing.map((l) => [l.title, l]));
  const normalized = [...new Set(titles.map((t) => t.trim().toLowerCase()).filter(Boolean))];
  const labelIds: number[] = [];
  for (const title of normalized) {
    let label = byTitle.get(title);
    if (!label) {
      const [created] = await db.insert(labels).values({ accountId, title }).returning();
      if (!created) continue;
      label = created;
    }
    labelIds.push(label.id);
  }
  await db.transaction(async (tx) => {
    await tx
      .delete(taggings)
      .where(
        and(
          eq(taggings.accountId, accountId),
          eq(taggings.taggableType, "Contact"),
          eq(taggings.taggableId, contactId),
        ),
      );
    if (labelIds.length > 0) {
      await tx.insert(taggings).values(
        labelIds.map((tagId) => ({
          tagId,
          taggableType: "Contact",
          taggableId: contactId,
          accountId,
          context: "labels",
        })),
      );
    }
  });
  return normalized;
}
