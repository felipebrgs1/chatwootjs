import { articles, categories, db, folders, portals } from "@chatwootjs/db";
import { and, asc, eq } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { requireAdmin, type AuthCtx } from "../policies/index.js";

// Central de ajuda — espelha portals/categories/articles do Rails, incluindo
// sanitização do HTML (allowlist como o ActionText) e portal público.

export interface ApiPortal {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  page_title: string | null;
  header_text: string | null;
  homepage_link: string | null;
  archived: boolean;
}

export interface ApiCategory {
  id: number;
  name: string | null;
  slug: string;
  description: string | null;
  locale: string;
  position: number | null;
}

export interface ApiArticle {
  id: number;
  title: string | null;
  slug: string;
  description: string | null;
  content: string | null;
  status: "draft" | "published";
  category_id: number | null;
  views: number;
  locale: string;
}

function toApiPortal(row: typeof portals.$inferSelect): ApiPortal {
  return {
    id: row.id,
    name: row.name ?? "",
    slug: row.slug ?? "",
    color: row.color,
    page_title: row.pageTitle,
    header_text: row.headerText,
    homepage_link: row.homepageLink,
    archived: row.archived ?? false,
  };
}

function toApiCategory(row: typeof categories.$inferSelect): ApiCategory {
  return {
    id: row.id,
    name: row.name ?? "",
    slug: row.slug ?? "",
    description: row.description,
    locale: row.locale ?? "en",
    position: row.position,
  };
}

function toApiArticle(row: typeof articles.$inferSelect): ApiArticle {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    content: row.content,
    status: row.status === 1 ? "published" : "draft",
    category_id: row.categoryId,
    views: row.views ?? 0,
    locale: row.locale ?? "en",
  };
}

// ---- Sanitizador (allowlist; sem dependências) ----

const ALLOWED_TAGS: Record<string, string[]> = {
  p: [],
  b: [],
  i: [],
  em: [],
  strong: [],
  u: [],
  a: ["href"],
  ul: [],
  ol: [],
  li: [],
  h1: [],
  h2: [],
  h3: [],
  blockquote: [],
  code: [],
  pre: [],
  br: [],
  hr: [],
};

function cleanHref(href: string): string | null {
  const value = href.trim();
  if (/^(https?:\/\/|mailto:|#|\/)/i.test(value)) return value;
  return null;
}

/** Remove tags fora da allowlist, event handlers e URLs perigosas. */
export function sanitizeArticleHtml(html: string): string {
  return html.replace(
    /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>/g,
    (_full: string, closing: string, tagName: string, attrs: string) => {
      const tag = tagName.toLowerCase();
      const allowed = ALLOWED_TAGS[tag];
      if (!allowed) return "";
      if (closing) return `</${tag}>`;
      if (tag === "br" || tag === "hr") return `<${tag}>`;
      const out: string[] = [];
      const attrRe = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
      let m: RegExpExecArray | null;
      while ((m = attrRe.exec(attrs)) !== null) {
        const name = m[1]!.toLowerCase();
        const value = m[3] ?? m[4] ?? m[5] ?? "";
        if (!allowed.includes(name)) continue;
        if (name === "href") {
          const clean = cleanHref(value);
          if (!clean) continue;
          out.push(`href="${clean.replaceAll('"', "&quot;")}"`);
        }
      }
      return `<${tag}${out.length > 0 ? ` ${out.join(" ")}` : ""}>`;
    },
  );
}

// ---- Portais ----

export async function listPortals(accountId: number): Promise<ApiPortal[]> {
  const rows = await db.query.portals.findMany({
    where: (p) => eq(p.accountId, accountId),
  });
  return rows.map(toApiPortal);
}

export async function findPortalById(accountId: number, id: number) {
  const row = await db.query.portals.findFirst({
    where: (p) => and(eq(p.accountId, accountId), eq(p.id, id)),
  });
  if (!row) throw new NotFoundError("Portal not found");
  return row;
}

export async function findPortalBySlug(accountId: number, slug: string) {
  const row = await db.query.portals.findFirst({
    where: (p) => and(eq(p.accountId, accountId), eq(p.slug, slug)),
  });
  if (!row) throw new NotFoundError("Portal not found");
  return row;
}

export async function createPortal(
  accountId: number,
  auth: AuthCtx,
  input: {
    name: string;
    slug: string;
    color?: string;
    page_title?: string;
    header_text?: string;
    homepage_link?: string;
    custom_domain?: string;
  },
): Promise<ApiPortal> {
  requireAdmin(auth);
  try {
    const [row] = await db
      .insert(portals)
      .values({
        accountId,
        name: input.name,
        slug: input.slug.toLowerCase(),
        color: input.color ?? null,
        pageTitle: input.page_title || null,
        headerText: input.header_text || null,
        homepageLink: input.homepage_link || null,
        customDomain: input.custom_domain || null,
      })
      .returning();
    if (!row) throw new UnprocessableError("Could not create portal");
    return toApiPortal(row);
  } catch (err) {
    if (err instanceof UnprocessableError) throw err;
    throw new UnprocessableError("Could not create portal", { slug: ["já está em uso"] });
  }
}

export async function updatePortal(
  accountId: number,
  auth: AuthCtx,
  id: number,
  input: Partial<{
    name: string;
    slug: string;
    color: string;
    page_title: string;
    header_text: string;
    homepage_link: string;
    custom_domain: string;
    archived: boolean;
  }>,
): Promise<ApiPortal> {
  requireAdmin(auth);
  const row = await findPortalById(accountId, id);
  try {
    const [updated] = await db
      .update(portals)
      .set({
        name: input.name ?? row.name,
        slug: input.slug ? input.slug.toLowerCase() : row.slug,
        color: input.color !== undefined ? input.color || null : row.color,
        pageTitle: input.page_title !== undefined ? input.page_title || null : row.pageTitle,
        headerText: input.header_text !== undefined ? input.header_text || null : row.headerText,
        homepageLink:
          input.homepage_link !== undefined ? input.homepage_link || null : row.homepageLink,
        customDomain:
          input.custom_domain !== undefined ? input.custom_domain || null : row.customDomain,
        archived: input.archived ?? row.archived,
        updatedAt: new Date(),
      })
      .where(eq(portals.id, row.id))
      .returning();
    if (!updated) throw new NotFoundError("Portal not found");
    return toApiPortal(updated);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new UnprocessableError("Could not update portal", { slug: ["já está em uso"] });
  }
}

export async function deletePortal(accountId: number, auth: AuthCtx, id: number): Promise<void> {
  requireAdmin(auth);
  const row = await findPortalById(accountId, id);
  await db.delete(portals).where(eq(portals.id, row.id));
}

// ---- Categorias ----

export async function listCategories(
  accountId: number,
  portalSlug: string,
): Promise<ApiCategory[]> {
  const portal = await findPortalBySlug(accountId, portalSlug);
  const rows = await db.query.categories.findMany({
    where: (c) => and(eq(c.accountId, accountId), eq(c.portalId, portal.id)),
    orderBy: (c) => asc(c.position),
  });
  return rows.map(toApiCategory);
}

export async function createCategory(
  accountId: number,
  auth: AuthCtx,
  portalSlug: string,
  input: { name: string; slug: string; description?: string; locale?: string; position?: number },
): Promise<ApiCategory> {
  requireAdmin(auth);
  const portal = await findPortalBySlug(accountId, portalSlug);
  const [row] = await db
    .insert(categories)
    .values({
      accountId,
      portalId: portal.id,
      name: input.name,
      slug: input.slug.toLowerCase(),
      description: input.description || null,
      locale: input.locale || "pt-BR",
      position: input.position ?? null,
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create category");
  return toApiCategory(row);
}

export async function updateCategory(
  accountId: number,
  auth: AuthCtx,
  portalSlug: string,
  id: number,
  input: Partial<{
    name: string;
    slug: string;
    description: string;
    locale: string;
    position: number;
  }>,
): Promise<ApiCategory> {
  requireAdmin(auth);
  const portal = await findPortalBySlug(accountId, portalSlug);
  const row = await db.query.categories.findFirst({
    where: (c) => and(eq(c.accountId, accountId), eq(c.portalId, portal.id), eq(c.id, id)),
  });
  if (!row) throw new NotFoundError("Category not found");
  const [updated] = await db
    .update(categories)
    .set({
      name: input.name ?? row.name,
      slug: input.slug ? input.slug.toLowerCase() : row.slug,
      description: input.description !== undefined ? input.description || null : row.description,
      locale: input.locale ?? row.locale,
      position: input.position !== undefined ? input.position : row.position,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, row.id))
    .returning();
  if (!updated) throw new NotFoundError("Category not found");
  return toApiCategory(updated);
}

export async function deleteCategory(
  accountId: number,
  auth: AuthCtx,
  portalSlug: string,
  id: number,
): Promise<void> {
  requireAdmin(auth);
  const portal = await findPortalBySlug(accountId, portalSlug);
  const row = await db.query.categories.findFirst({
    where: (c) => and(eq(c.accountId, accountId), eq(c.portalId, portal.id), eq(c.id, id)),
  });
  if (!row) throw new NotFoundError("Category not found");
  await db.transaction(async (tx) => {
    await tx.update(articles).set({ categoryId: null }).where(eq(articles.categoryId, row.id));
    await tx.delete(folders).where(eq(folders.categoryId, row.id));
    await tx.delete(categories).where(eq(categories.id, row.id));
  });
}

// ---- Artigos ----

export async function listArticles(accountId: number, portalSlug: string): Promise<ApiArticle[]> {
  const portal = await findPortalBySlug(accountId, portalSlug);
  const rows = await db.query.articles.findMany({
    where: (a) => and(eq(a.accountId, accountId), eq(a.portalId, portal.id)),
    orderBy: (a) => asc(a.position),
  });
  return rows.map(toApiArticle);
}

async function assertCategory(
  accountId: number,
  portalId: number,
  categoryId: number | null | undefined,
): Promise<number | null> {
  if (categoryId === null || categoryId === undefined) return null;
  const cat = await db.query.categories.findFirst({
    where: (c) => and(eq(c.accountId, accountId), eq(c.portalId, portalId), eq(c.id, categoryId)),
  });
  if (!cat) throw new NotFoundError("Category not found");
  return cat.id;
}

export async function createArticle(
  accountId: number,
  auth: AuthCtx,
  portalSlug: string,
  input: {
    title: string;
    slug: string;
    description?: string;
    content?: string;
    category_id?: number | null;
    folder_id?: number | null;
    status?: "draft" | "published";
    locale?: string;
    position?: number;
  },
): Promise<ApiArticle> {
  requireAdmin(auth);
  const portal = await findPortalBySlug(accountId, portalSlug);
  const [row] = await db
    .insert(articles)
    .values({
      accountId,
      portalId: portal.id,
      categoryId: await assertCategory(accountId, portal.id, input.category_id),
      folderId: input.folder_id ?? null,
      authorId: auth.userId,
      title: input.title,
      slug: input.slug.toLowerCase(),
      description: input.description || null,
      content: input.content ? sanitizeArticleHtml(input.content) : null,
      status: input.status === "published" ? 1 : 0,
      locale: input.locale || "pt-BR",
      position: input.position ?? null,
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create article");
  return toApiArticle(row);
}

export async function updateArticle(
  accountId: number,
  auth: AuthCtx,
  portalSlug: string,
  id: number,
  input: Partial<{
    title: string;
    slug: string;
    description: string;
    content: string;
    category_id: number | null;
    folder_id: number | null;
    status: "draft" | "published";
    locale: string;
    position: number;
  }>,
): Promise<ApiArticle> {
  requireAdmin(auth);
  const portal = await findPortalBySlug(accountId, portalSlug);
  const row = await db.query.articles.findFirst({
    where: (a) => and(eq(a.accountId, accountId), eq(a.portalId, portal.id), eq(a.id, id)),
  });
  if (!row) throw new NotFoundError("Article not found");
  const [updated] = await db
    .update(articles)
    .set({
      title: input.title ?? row.title,
      slug: input.slug ? input.slug.toLowerCase() : row.slug,
      description: input.description !== undefined ? input.description || null : row.description,
      content:
        input.content !== undefined
          ? input.content
            ? sanitizeArticleHtml(input.content)
            : null
          : row.content,
      categoryId:
        input.category_id !== undefined
          ? await assertCategory(accountId, portal.id, input.category_id)
          : row.categoryId,
      folderId: input.folder_id !== undefined ? input.folder_id : row.folderId,
      status: input.status !== undefined ? (input.status === "published" ? 1 : 0) : row.status,
      locale: input.locale ?? row.locale,
      position: input.position !== undefined ? input.position : row.position,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, row.id))
    .returning();
  if (!updated) throw new NotFoundError("Article not found");
  return toApiArticle(updated);
}

export async function setArticleStatus(
  accountId: number,
  auth: AuthCtx,
  portalSlug: string,
  id: number,
  status: "draft" | "published",
): Promise<ApiArticle> {
  return updateArticle(accountId, auth, portalSlug, id, { status });
}

export async function deleteArticle(
  accountId: number,
  auth: AuthCtx,
  portalSlug: string,
  id: number,
): Promise<void> {
  requireAdmin(auth);
  const portal = await findPortalBySlug(accountId, portalSlug);
  const row = await db.query.articles.findFirst({
    where: (a) => and(eq(a.accountId, accountId), eq(a.portalId, portal.id), eq(a.id, id)),
  });
  if (!row) throw new NotFoundError("Article not found");
  await db.delete(articles).where(eq(articles.id, row.id));
}

// ---- Portal público (sem auth) ----

export interface PublicArticle extends ApiArticle {
  category_slug: string | null;
}

export interface PublicPortal {
  name: string;
  slug: string;
  color: string | null;
  page_title: string | null;
  header_text: string | null;
  categories: Array<ApiCategory & { articles: PublicArticle[] }>;
}

async function findPublicPortal(slug: string) {
  const row = await db.query.portals.findFirst({
    where: (p) => and(eq(p.slug, slug.toLowerCase()), eq(p.archived, false)),
  });
  if (!row) throw new NotFoundError("Portal not found");
  return row;
}

export async function getPublicPortal(slug: string): Promise<PublicPortal> {
  const portal = await findPublicPortal(slug);
  const cats = await db.query.categories.findMany({
    where: (c) => eq(c.portalId, portal.id),
    orderBy: (c) => asc(c.position),
  });
  const arts = await db.query.articles.findMany({
    where: (a) => and(eq(a.portalId, portal.id), eq(a.status, 1)),
    orderBy: (a) => asc(a.position),
  });
  const byCat = new Map<number | null, typeof arts>();
  for (const a of arts) {
    const list = byCat.get(a.categoryId) ?? [];
    list.push(a);
    byCat.set(a.categoryId, list);
  }
  const catSlug = new Map(cats.map((c) => [c.id, c.slug]));
  return {
    name: portal.name,
    slug: portal.slug,
    color: portal.color,
    page_title: portal.pageTitle,
    header_text: portal.headerText,
    categories: cats.map((c) => ({
      ...toApiCategory(c),
      articles: (byCat.get(c.id) ?? []).map((a) => ({
        ...toApiArticle(a),
        category_slug: catSlug.get(a.categoryId ?? -1) ?? null,
      })),
    })),
  };
}

// Dedupe de views em memória (24h por ip+artigo).
const seenViews = new Map<string, number>();
setInterval(() => {
  const cutoff = Date.now() - 24 * 3600_000;
  for (const [key, at] of seenViews) {
    if (at < cutoff) seenViews.delete(key);
  }
}, 3600_000);

export async function getPublicArticle(
  slug: string,
  articleSlug: string,
  viewerIp?: string,
): Promise<PublicArticle & { portal: { name: string; slug: string; color: string | null } }> {
  const portal = await findPublicPortal(slug);
  const row = await db.query.articles.findFirst({
    where: (a) =>
      and(eq(a.portalId, portal.id), eq(a.slug, articleSlug.toLowerCase()), eq(a.status, 1)),
  });
  if (!row) throw new NotFoundError("Article not found");
  const seenKey = `${row.id}:${viewerIp ?? "?"}`;
  if (!seenViews.has(seenKey)) {
    seenViews.set(seenKey, Date.now());
    await db
      .update(articles)
      .set({ views: (row.views ?? 0) + 1 })
      .where(eq(articles.id, row.id));
    row.views = (row.views ?? 0) + 1;
  }
  const cat = row.categoryId
    ? await db.query.categories.findFirst({
        where: (c) => eq(c.id, row.categoryId!),
        columns: { slug: true },
      })
    : null;
  return {
    ...toApiArticle(row),
    category_slug: cat?.slug ?? null,
    portal: { name: portal.name, slug: portal.slug, color: portal.color },
  };
}
