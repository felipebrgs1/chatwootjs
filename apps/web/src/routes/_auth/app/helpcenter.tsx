import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, BookOpen, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { Textarea } from "@chatwootjs/ui/components/textarea";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";
import type { Article, Category, Portal } from "@/lib/helpcenter";

export const Route = createFileRoute("/_auth/app/helpcenter")({
  component: HelpCenterSettings,
});

const portalSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  slug: z
    .string()
    .trim()
    .min(1, "Informe o slug")
    .regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hífens"),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "Cor inválida"),
  page_title: z.string().optional(),
  header_text: z.string().optional(),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function HelpCenterSettings() {
  const { session } = useSessionContext();
  const [portals, setPortals] = useState<Portal[] | null>(null);
  const [current, setCurrent] = useState<Portal | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [artTitle, setArtTitle] = useState("");
  const [artSlug, setArtSlug] = useState("");
  const [artCategory, setArtCategory] = useState("");
  const [artContent, setArtContent] = useState("");
  const [catName, setCatName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isAdmin = session?.account.role === "administrator";

  const form = useForm<z.infer<typeof portalSchema>>({
    resolver: zodResolver(portalSchema),
    defaultValues: { name: "", slug: "", color: "#1f93ff", page_title: "", header_text: "" },
  });

  function base(): string {
    return `/api/v1/accounts/${session!.accountId}/portals`;
  }

  async function refresh(): Promise<void> {
    const d = await apiFetch<{ portals: Portal[] }>(base());
    setPortals(d.portals);
  }

  async function openPortal(portal: Portal): Promise<void> {
    setCurrent(portal);
    const [c, a] = await Promise.all([
      apiFetch<{ categories: Category[] }>(`${base()}/${portal.slug}/categories`),
      apiFetch<{ articles: Article[] }>(`${base()}/${portal.slug}/articles`),
    ]);
    setCategories(c.categories);
    setArticles(a.articles);
  }

  useEffect(() => {
    if (session) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function onSubmitPortal(values: z.infer<typeof portalSchema>): Promise<void> {
    setError(null);
    try {
      await apiFetch(base(), { method: "POST", body: JSON.stringify(values) });
      form.reset({ name: "", slug: "", color: "#1f93ff", page_title: "", header_text: "" });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  async function addCategory(): Promise<void> {
    if (!catName.trim() || !current) return;
    await apiFetch(`${base()}/${current.slug}/categories`, {
      method: "POST",
      body: JSON.stringify({ name: catName.trim(), slug: slugify(catName) }),
    });
    setCatName("");
    await openPortal(current);
  }

  function startArticle(article?: Article): void {
    setEditingArticle(article ?? null);
    setArtTitle(article?.title ?? "");
    setArtSlug(article?.slug ?? "");
    setArtCategory(article?.category_id ? String(article.category_id) : "");
    setArtContent(article?.content ?? "");
  }

  async function saveArticle(publish: boolean): Promise<void> {
    if (!current) return;
    setError(null);
    try {
      const body = JSON.stringify({
        title: artTitle,
        slug: artSlug || slugify(artTitle),
        content: artContent,
        category_id: artCategory ? Number(artCategory) : null,
        status: publish ? "published" : "draft",
      });
      if (editingArticle) {
        await apiFetch(`${base()}/${current.slug}/articles/${editingArticle.id}`, {
          method: "PATCH",
          body,
        });
      } else {
        await apiFetch(`${base()}/${current.slug}/articles`, { method: "POST", body });
      }
      startArticle();
      await openPortal(current);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  if (!session) return null;

  if (!current) {
    return (
      <div className="flex flex-1 flex-col bg-woot-bg">
        <header className="border-b bg-white px-6 py-4">
          <h1 className="text-lg font-semibold">Central de ajuda</h1>
          <p className="text-sm text-muted-foreground">Portais públicos com artigos.</p>
        </header>
        <main className="grid max-w-2xl content-start gap-4 p-6">
          {isAdmin && (
            <form
              onSubmit={form.handleSubmit(onSubmitPortal)}
              className="grid gap-3 rounded-lg border bg-white p-4"
            >
              <h2 className="text-sm font-medium">Novo portal</h2>
              <div className="grid gap-3 sm:grid-cols-[1fr_180px_100px]">
                <div className="grid gap-1.5">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" {...form.register("name")} placeholder="Ajuda" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" {...form.register("slug")} placeholder="ajuda" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="color">Cor</Label>
                  <Input id="color" type="color" {...form.register("color")} className="h-9 px-1" />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Criar
                </Button>
              </div>
            </form>
          )}
          <section className="rounded-lg border bg-white">
            {portals === null ? (
              <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <ul className="divide-y">
                {portals.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => void openPortal(p)}
                      className="flex w-full items-center gap-3 p-3 text-start hover:bg-muted/50"
                    >
                      <span
                        className="size-8 flex-shrink-0 rounded-lg"
                        style={{ backgroundColor: p.color ?? "#1f93ff" }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          /hc/{p.slug}
                        </span>
                      </span>
                      <BookOpen className="size-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      </div>
    );
  }

  const draft = articles.filter((a) => a.status === "draft");
  const published = articles.filter((a) => a.status === "published");

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="flex items-center gap-3 border-b bg-white px-6 py-4">
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => setCurrent(null)}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{current.name}</h1>
          <p className="text-sm text-muted-foreground">/hc/{current.slug}</p>
        </div>
      </header>
      <main className="grid content-start gap-4 p-6 lg:grid-cols-[300px_1fr]">
        <section className="grid content-start gap-2">
          <h2 className="text-sm font-medium">Categorias</h2>
          <ul className="divide-y rounded-lg border bg-white">
            {categories.map((c) => (
              <li key={c.id} className="p-3 text-sm font-medium">
                {c.name}
              </li>
            ))}
          </ul>
          {isAdmin && (
            <div className="flex gap-2">
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Nova categoria..."
              />
              <Button size="sm" onClick={() => void addCategory()}>
                <Plus className="size-4" />
              </Button>
            </div>
          )}
          <h2 className="mt-2 text-sm font-medium">Publicados ({published.length})</h2>
          <ul className="divide-y rounded-lg border bg-white">
            {published.map((a) => (
              <li key={a.id} className="flex items-center gap-2 p-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{a.title}</span>
                <span className="text-xs text-muted-foreground">{a.views} views</span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${a.title}`}
                    onClick={() => startArticle(a)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
          {draft.length > 0 && (
            <>
              <h2 className="mt-2 text-sm font-medium">Rascunhos ({draft.length})</h2>
              <ul className="divide-y rounded-lg border border-dashed bg-white">
                {draft.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 p-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{a.title}</span>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${a.title}`}
                        onClick={() => startArticle(a)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <section className="grid content-start gap-3 rounded-lg border bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <Eye className="size-4" />
            {editingArticle ? "Editar artigo" : "Novo artigo"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_200px_180px]">
            <div className="grid gap-1.5">
              <Label htmlFor="art-title">Título</Label>
              <Input
                id="art-title"
                value={artTitle}
                onChange={(e) => {
                  setArtTitle(e.target.value);
                  if (!editingArticle) setArtSlug(slugify(e.target.value));
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="art-slug">Slug</Label>
              <Input id="art-slug" value={artSlug} onChange={(e) => setArtSlug(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="art-cat">Categoria</Label>
              <select
                id="art-cat"
                value={artCategory}
                onChange={(e) => setArtCategory(e.target.value)}
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="art-content">Conteúdo (HTML simples)</Label>
            <Textarea
              id="art-content"
              value={artContent}
              onChange={(e) => setArtContent(e.target.value)}
              rows={10}
              className="font-mono"
            />
          </div>
          {artContent && (
            <div className="grid gap-1.5">
              <Label>Preview (sanitizado)</Label>
              <div
                className="prose-sm max-w-none rounded-lg border bg-muted/30 p-3 text-sm"
                // Conteúdo já sanitizado no server ao salvar.
                dangerouslySetInnerHTML={{ __html: artContent }}
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={() => void saveArticle(false)}>Salvar rascunho</Button>
            <Button variant="outline" onClick={() => void saveArticle(true)}>
              Publicar
            </Button>
            {editingArticle && (
              <>
                <Button
                  variant="ghost"
                  onClick={() =>
                    editingArticle.status === "published"
                      ? void apiFetch(
                          `${base()}/${current.slug}/articles/${editingArticle.id}/unpublish`,
                          { method: "POST" },
                        ).then(() => {
                          startArticle();
                          return openPortal(current);
                        })
                      : void apiFetch(`${base()}/${current.slug}/articles/${editingArticle.id}`, {
                          method: "DELETE",
                        }).then(() => {
                          startArticle();
                          return openPortal(current);
                        })
                  }
                >
                  {editingArticle.status === "published" ? "Despublicar" : "Excluir"}
                  {editingArticle.status === "published" ? null : (
                    <Trash2 className="ml-1.5 size-3.5" />
                  )}
                </Button>
                <Button variant="ghost" onClick={() => startArticle()}>
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
