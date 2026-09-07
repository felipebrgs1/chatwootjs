/**
 * M11 — Busca global (`⌘K`): conversas + contatos + artigos + canned em
 * uma chamada (`GET /api/v1/accounts/:id/search?q=`). Respeita visibilidade
 * de inboxes (M4 `visibleInboxIds`).
 */
import { articles, categories, conversations, db, portals } from "@chatwootjs/db";
import { and, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import type { AuthCtx } from "../policies/index.js";
import { visibleInboxIds } from "./conversations.js";

const LIMIT = 8;

export interface SearchHit {
  id: number | string;
  kind: "conversation" | "contact" | "article" | "canned";
  title: string;
  subtitle: string | null;
}

export interface SearchResults {
  conversations: SearchHit[];
  contacts: SearchHit[];
  articles: SearchHit[];
  canned_responses: SearchHit[];
}

export async function unifiedSearch(
  accountId: number,
  auth: AuthCtx,
  q: string,
): Promise<SearchResults> {
  const needle = `%${q.trim().slice(0, 80)}%`;
  const empty: SearchResults = {
    conversations: [],
    contacts: [],
    articles: [],
    canned_responses: [],
  };
  if (!q.trim()) return empty;

  const inboxIds = await visibleInboxIds(accountId, auth);

  const matchedContacts = await db.query.contacts.findMany({
    where: (c) =>
      and(
        eq(c.accountId, accountId),
        or(
          ilike(c.name, needle),
          ilike(c.email, needle),
          ilike(c.phoneNumber, needle),
          ilike(c.identifier, needle),
        ),
      ),
    columns: { id: true, name: true, email: true, phoneNumber: true },
    limit: LIMIT,
  });

  let convRows: Array<{ id: number; displayId: number; contactId: number | null }> = [];
  if (inboxIds.length > 0) {
    const contactIds = matchedContacts.map((c) => c.id);
    const numeric = Number(q.trim());
    const orConds: SQL[] = [];
    if (contactIds.length > 0) orConds.push(inArray(conversations.contactId, contactIds));
    if (Number.isInteger(numeric)) orConds.push(eq(conversations.displayId, numeric));
    if (orConds.length > 0) {
      convRows = await db.query.conversations.findMany({
        where: (c) => and(eq(c.accountId, accountId), inArray(c.inboxId, inboxIds), or(...orConds)),
        columns: { id: true, displayId: true, contactId: true },
        orderBy: (c) => sql`${c.lastActivityAt} desc`,
        limit: LIMIT,
      });
    }
  }
  const contactById = new Map(matchedContacts.map((c) => [c.id, c]));
  // Nome dos contatos das conversas que não vieram no match direto.
  const missingIds = [
    ...new Set(convRows.map((r) => r.contactId).filter((id) => id != null && !contactById.has(id))),
  ] as number[];
  if (missingIds.length > 0) {
    const extra = await db.query.contacts.findMany({
      where: (c) => inArray(c.id, missingIds),
      columns: { id: true, name: true, email: true, phoneNumber: true },
    });
    for (const c of extra) contactById.set(c.id, c);
  }

  const articleRows = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      status: articles.status,
      portalSlug: portals.slug,
      portalName: portals.name,
      categoryName: categories.name,
    })
    .from(articles)
    .innerJoin(portals, eq(portals.id, articles.portalId))
    .leftJoin(categories, eq(categories.id, articles.categoryId))
    .where(and(eq(portals.accountId, accountId), ilike(articles.title, needle)))
    .limit(LIMIT);

  const cannedRows = await db.query.cannedResponses.findMany({
    where: (r) =>
      and(eq(r.accountId, accountId), or(ilike(r.content, needle), ilike(r.shortCode, needle))),
    columns: { id: true, shortCode: true, content: true },
    limit: LIMIT,
  });

  return {
    conversations: convRows.map((r) => {
      const contact = r.contactId ? contactById.get(r.contactId) : undefined;
      return {
        id: r.id,
        kind: "conversation" as const,
        title: `#${r.displayId} ${contact?.name || "Contato"}`,
        subtitle: contact?.email ?? contact?.phoneNumber ?? null,
      };
    }),
    contacts: matchedContacts.map((c) => ({
      id: c.id,
      kind: "contact" as const,
      title: c.name || c.email || c.phoneNumber || `#${c.id}`,
      subtitle: c.email ?? c.phoneNumber ?? null,
    })),
    articles: articleRows.map((a) => ({
      id: a.slug,
      kind: "article" as const,
      title: a.title ?? "(sem título)",
      subtitle: `${a.portalName}${a.categoryName ? ` / ${a.categoryName}` : ""}`,
    })),
    canned_responses: cannedRows.map((r) => ({
      id: r.id,
      kind: "canned" as const,
      title: `//${r.shortCode ?? r.id}`,
      subtitle: r.content?.slice(0, 80) ?? null,
    })),
  };
}
