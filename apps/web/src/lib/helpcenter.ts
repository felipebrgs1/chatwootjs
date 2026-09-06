// Client da central de ajuda (M9) — dashboard autenticado + portal público.
export interface Portal {
  id: number;
  name: string;
  slug: string;
  color: string | null;
  page_title: string | null;
  header_text: string | null;
  homepage_link: string | null;
  archived: boolean;
}

export interface Category {
  id: number;
  name: string | null;
  slug: string;
  description: string | null;
  locale: string;
  position: number | null;
}

export interface Article {
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

export interface PublicArticle extends Article {
  category_slug: string | null;
  portal: { name: string; slug: string; color: string | null };
}

export interface PublicPortal {
  name: string;
  slug: string;
  color: string | null;
  page_title: string | null;
  header_text: string | null;
  categories: Array<Category & { articles: PublicArticle[] }>;
}

const SERVER = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000";

export async function getPublicPortal(slug: string): Promise<PublicPortal> {
  const res = await fetch(`${SERVER}/hc/api/${slug}`);
  if (!res.ok) throw new Error("Portal não encontrado");
  const body = (await res.json()) as { data: { portal: PublicPortal } };
  return body.data.portal;
}

export async function getPublicArticle(slug: string, article: string): Promise<PublicArticle> {
  const res = await fetch(`${SERVER}/hc/api/${slug}/articles/${article}`);
  if (!res.ok) throw new Error("Artigo não encontrado");
  const body = (await res.json()) as { data: { article: PublicArticle } };
  return body.data.article;
}
