import {
  companies,
  contacts,
  conversations,
  db,
  inboxes,
  messages,
  notes,
  type Company,
} from "@chatwootjs/db";
import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import type { AuthCtx } from "../policies/index.js";
import { STATUS_FROM_INT } from "../schemas/conversations.js";
import type {
  CompaniesQuery,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "../schemas/companies.js";
import type { ContactHistoryItem } from "./contacts.js";

// ---- Mappers ----

export interface ApiCompany {
  id: number;
  name: string;
  domain: string | null;
  description: string | null;
  contacts_count: number;
  additional_attributes: Record<string, unknown>;
  custom_attributes: Record<string, unknown>;
  last_activity_at: string | null;
  created_at: string;
}

export interface CompanyContactItem {
  id: number;
  name: string;
  email: string | null;
  phone_number: string | null;
}

export interface CompanyNoteItem {
  id: number;
  content: string;
  contact_id: number;
  contact_name: string;
  user_name: string | null;
  created_at: string;
}

function toApiCompany(row: Company, contactsCount: number): ApiCompany {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    description: row.description,
    contacts_count: contactsCount,
    additional_attributes: row.additionalAttributes ?? {},
    custom_attributes: row.customAttributes ?? {},
    last_activity_at: row.lastActivityAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
  };
}

async function assertCompany(accountId: number, companyId: number): Promise<Company> {
  const row = await db.query.companies.findFirst({
    where: (c) => and(eq(c.accountId, accountId), eq(c.id, companyId)),
  });
  if (!row) throw new NotFoundError("Company not found");
  return row;
}

async function countContacts(accountId: number, companyId: number): Promise<number> {
  const [agg] = await db
    .select({ value: count() })
    .from(contacts)
    .where(and(eq(contacts.accountId, accountId), eq(contacts.companyId, companyId)));
  return Number(agg?.value ?? 0);
}

// ---- Consultas ----

export interface CompanyListResult {
  data: ApiCompany[];
  meta: { count: number; current_page: number; total_pages: number; per_page: number };
}

export async function listCompanies(
  accountId: number,
  query: CompaniesQuery,
): Promise<CompanyListResult> {
  const conditions = [eq(companies.accountId, accountId)];
  if (query.q) {
    const pattern = `%${query.q}%`;
    conditions.push(or(ilike(companies.name, pattern), ilike(companies.domain, pattern))!);
  }
  const where = and(...conditions);
  const [agg] = await db.select({ value: count() }).from(companies).where(where);
  const total = Number(agg?.value ?? 0);
  const rows = await db
    .select()
    .from(companies)
    .where(where)
    .orderBy(asc(companies.name))
    .limit(query.per_page)
    .offset((query.page - 1) * query.per_page);
  const data = await Promise.all(
    rows.map(async (row) => toApiCompany(row, await countContacts(accountId, row.id))),
  );
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

export async function getCompany(accountId: number, companyId: number): Promise<ApiCompany> {
  const row = await assertCompany(accountId, companyId);
  return toApiCompany(row, await countContacts(accountId, row.id));
}

// ---- Mutations ----

async function assertDomainFree(
  accountId: number,
  domain: string | undefined,
  exceptId?: number,
): Promise<void> {
  const clean = domain?.trim() || "";
  if (!clean) return;
  const [existing] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.accountId, accountId), eq(companies.domain, clean)))
    .limit(1);
  if (existing && existing.id !== exceptId) {
    throw new UnprocessableError("Domain already taken");
  }
}

export async function createCompany(
  accountId: number,
  _auth: AuthCtx,
  input: CreateCompanyInput,
): Promise<ApiCompany> {
  await assertDomainFree(accountId, input.domain);
  const [row] = await db
    .insert(companies)
    .values({
      accountId,
      name: input.name.trim(),
      domain: input.domain?.trim() || null,
      description: input.description ?? null,
      customAttributes: input.custom_attributes ?? {},
      additionalAttributes: input.additional_attributes ?? {},
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create company");
  return toApiCompany(row, 0);
}

export async function updateCompany(
  accountId: number,
  _auth: AuthCtx,
  companyId: number,
  input: UpdateCompanyInput,
): Promise<ApiCompany> {
  const row = await assertCompany(accountId, companyId);
  await assertDomainFree(accountId, input.domain, row.id);
  const patch: Partial<typeof companies.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.domain !== undefined) patch.domain = input.domain.trim() || null;
  if (input.description !== undefined) patch.description = input.description;
  if (input.custom_attributes !== undefined) patch.customAttributes = input.custom_attributes;
  if (input.additional_attributes !== undefined)
    patch.additionalAttributes = input.additional_attributes;
  const [fresh] = await db.update(companies).set(patch).where(eq(companies.id, row.id)).returning();
  if (!fresh) throw new NotFoundError("Company not found");
  return toApiCompany(fresh, await countContacts(accountId, row.id));
}

export async function deleteCompany(
  accountId: number,
  _auth: AuthCtx,
  companyId: number,
): Promise<void> {
  const row = await assertCompany(accountId, companyId);
  await db.transaction(async (tx) => {
    await tx
      .update(contacts)
      .set({ companyId: null })
      .where(and(eq(contacts.accountId, accountId), eq(contacts.companyId, row.id)));
    await tx.delete(companies).where(eq(companies.id, row.id));
  });
}

// ---- Contatos da empresa ----

export async function listCompanyContacts(
  accountId: number,
  companyId: number,
  page = 1,
  perPage = 15,
): Promise<{
  data: CompanyContactItem[];
  meta: { count: number; current_page: number; total_pages: number; per_page: number };
}> {
  await assertCompany(accountId, companyId);
  const where = and(eq(contacts.accountId, accountId), eq(contacts.companyId, companyId));
  const [agg] = await db.select({ value: count() }).from(contacts).where(where);
  const total = Number(agg?.value ?? 0);
  const rows = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      phoneNumber: contacts.phoneNumber,
    })
    .from(contacts)
    .where(where)
    .orderBy(asc(contacts.name))
    .limit(perPage)
    .offset((page - 1) * perPage);
  return {
    data: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone_number: r.phoneNumber,
    })),
    meta: {
      count: total,
      current_page: page,
      total_pages: total === 0 ? 0 : Math.ceil(total / perPage),
      per_page: perPage,
    },
  };
}

/** Vincula (ou revincula) um contato à empresa. */
export async function addCompanyContact(
  accountId: number,
  companyId: number,
  contactId: number,
): Promise<CompanyContactItem> {
  await assertCompany(accountId, companyId);
  const contact = await db.query.contacts.findFirst({
    where: (c) => and(eq(c.accountId, accountId), eq(c.id, contactId)),
  });
  if (!contact) throw new NotFoundError("Contact not found");
  const [fresh] = await db
    .update(contacts)
    .set({ companyId, updatedAt: new Date() })
    .where(eq(contacts.id, contact.id))
    .returning({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      phoneNumber: contacts.phoneNumber,
    });
  if (!fresh) throw new NotFoundError("Contact not found");
  return { id: fresh.id, name: fresh.name, email: fresh.email, phone_number: fresh.phoneNumber };
}

/** Desvincula o contato da empresa (sem apagar o contato). */
export async function removeCompanyContact(
  accountId: number,
  companyId: number,
  contactId: number,
): Promise<void> {
  await assertCompany(accountId, companyId);
  await db
    .update(contacts)
    .set({ companyId: null })
    .where(
      and(
        eq(contacts.accountId, accountId),
        eq(contacts.id, contactId),
        eq(contacts.companyId, companyId),
      ),
    );
}

// ---- Conversas e notas da empresa ----

/** Conversas dos contatos da empresa (aba Histórico) — espelha companies/conversations. */
export async function listCompanyConversations(
  accountId: number,
  companyId: number,
): Promise<ContactHistoryItem[]> {
  await assertCompany(accountId, companyId);
  const owned = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(eq(contacts.accountId, accountId), eq(contacts.companyId, companyId)));
  const ids = owned.map((c) => c.id);
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.accountId, accountId), inArray(conversations.contactId, ids)))
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

/** Notas dos contatos da empresa, só leitura (aba Notas) — espelha companies/notes. */
export async function listCompanyNotes(
  accountId: number,
  companyId: number,
): Promise<
  Array<{
    id: number;
    content: string;
    contact_id: number;
    contact_name: string;
    user_name: string | null;
    created_at: string;
  }>
> {
  await assertCompany(accountId, companyId);
  const owned = await db
    .select({ id: contacts.id, name: contacts.name })
    .from(contacts)
    .where(and(eq(contacts.accountId, accountId), eq(contacts.companyId, companyId)));
  const ids = owned.map((c) => c.id);
  if (ids.length === 0) return [];
  const nameById = new Map(owned.map((c) => [c.id, c.name]));
  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.accountId, accountId), inArray(notes.contactId, ids)))
    .orderBy(desc(notes.createdAt))
    .limit(100);
  const userIds = [...new Set(rows.map((r) => r.userId).filter((v): v is number => v !== null))];
  const userRows =
    userIds.length > 0
      ? await db.query.users.findMany({
          where: (u) => inArray(u.id, userIds),
          columns: { id: true, name: true },
        })
      : [];
  const names = new Map(userRows.map((u) => [u.id, u.name]));
  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    contact_id: row.contactId,
    contact_name: nameById.get(row.contactId) ?? "",
    user_name: row.userId ? (names.get(row.userId) ?? null) : null,
    created_at: row.createdAt.toISOString(),
  }));
}
