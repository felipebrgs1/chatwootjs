import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Input } from "@chatwootjs/ui/components/input";

import {
  getPublicArticle,
  getPublicPortal,
  type PublicArticle,
  type PublicPortal,
} from "@/lib/helpcenter";

export const Route = createFileRoute("/hc/$portalSlug")({
  validateSearch: (search: Record<string, unknown>) => ({
    article: typeof search.article === "string" ? search.article : undefined,
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: PublicPortalPage,
});

function PublicPortalPage() {
  const { portalSlug } = Route.useParams();
  const { article: articleSlug, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  function go(search: { article: string | undefined; q: string }): void {
    void navigate({ search });
  }
  const [loaded, setLoaded] = useState<{
    slug: string;
    portal: PublicPortal | null;
    error: string | null;
  } | null>(null);
  const [loadedArticle, setLoadedArticle] = useState<{
    key: string;
    article: PublicArticle | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getPublicPortal(portalSlug)
      .then((p) => {
        if (!cancelled) setLoaded({ slug: portalSlug, portal: p, error: null });
      })
      .catch(() => {
        if (!cancelled)
          setLoaded({ slug: portalSlug, portal: null, error: "Portal não encontrado" });
      });
    return () => {
      cancelled = true;
    };
  }, [portalSlug]);

  useEffect(() => {
    if (!articleSlug) return;
    const key = `${portalSlug}:${articleSlug}`;
    let cancelled = false;
    void getPublicArticle(portalSlug, articleSlug)
      .then((a) => {
        if (!cancelled) setLoadedArticle({ key, article: a });
      })
      .catch(() => {
        if (!cancelled) setLoadedArticle({ key, article: null });
      });
    return () => {
      cancelled = true;
    };
  }, [portalSlug, articleSlug]);

  const portal = loaded?.slug === portalSlug ? loaded.portal : null;
  const error = loaded?.slug === portalSlug ? loaded.error : null;
  const articleKey = `${portalSlug}:${articleSlug ?? ""}`;
  const article = articleSlug && loadedArticle?.key === articleKey ? loadedArticle.article : null;

  const results = useMemo(() => {
    if (!portal || !q.trim()) return null;
    const needle = q.trim().toLowerCase();
    return portal.categories.flatMap((c) =>
      c.articles
        .filter(
          (a) =>
            (a.title ?? "").toLowerCase().includes(needle) ||
            (a.description ?? "").toLowerCase().includes(needle),
        )
        .map((a) => ({ ...a, category: c.name })),
    );
  }, [portal, q]);

  const accent = portal?.color ?? "#1f93ff";

  return (
    <div className="min-h-screen bg-woot-bg">
      <header className="px-6 py-10 text-center text-white" style={{ backgroundColor: accent }}>
        <h1 className="text-2xl font-semibold">{portal?.page_title || portal?.name || "..."}</h1>
        {portal?.header_text && <p className="mt-1 text-sm opacity-90">{portal.header_text}</p>}
        <div className="mx-auto mt-4 max-w-md">
          <Input
            value={q}
            onChange={(e) => go({ article: undefined, q: e.target.value })}
            placeholder="Buscar artigos..."
            className="bg-white text-foreground"
          />
        </div>
      </header>
      <main className="mx-auto grid max-w-3xl content-start gap-4 p-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!portal && !error && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {results && (
          <section className="rounded-lg border bg-white">
            <ul className="divide-y">
              {results.length === 0 && (
                <li className="p-4 text-sm text-muted-foreground">Nada encontrado.</li>
              )}
              {results.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => go({ article: a.slug, q })}
                    className="block w-full p-3 text-start hover:bg-muted/50"
                  >
                    <span className="block text-sm font-medium">{a.title}</span>
                    <span className="block text-xs text-muted-foreground">{a.category}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {article ? (
          <article className="rounded-lg border bg-white p-6">
            <button
              type="button"
              onClick={() => go({ article: undefined, q })}
              className="mb-3 text-xs text-muted-foreground hover:text-foreground"
            >
              ← Voltar
            </button>
            <h2 className="text-xl font-semibold">{article.title}</h2>
            {article.description && (
              <p className="mt-1 text-sm text-muted-foreground">{article.description}</p>
            )}
            <div
              className="prose-sm mt-4 max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: article.content ?? "" }}
            />
          </article>
        ) : (
          !results &&
          portal?.categories.map((c) => (
            <section key={c.id} className="rounded-lg border bg-white">
              <h2 className="border-b px-4 py-3 text-sm font-semibold">{c.name}</h2>
              <ul className="divide-y">
                {c.articles.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => go({ article: a.slug, q })}
                      className="block w-full p-3 text-start hover:bg-muted/50"
                    >
                      <span className="block text-sm font-medium">{a.title}</span>
                      {a.description && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {a.description}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
