import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
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
import { listCanned, type CannedResponse } from "@/lib/automation";

export const Route = createFileRoute("/_auth/app/settings/canned")({
  component: CannedSettings,
});

const schema = z.object({
  short_code: z.string().trim().min(1, "Informe o atalho"),
  content: z.string().trim().min(1, "Informe o conteúdo"),
});

type Values = z.infer<typeof schema>;

function CannedSettings() {
  const { session } = useSessionContext();
  const [items, setItems] = useState<CannedResponse[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const isAdmin = session?.account.role === "administrator";
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { short_code: "", content: "" },
  });

  async function refresh(q?: string): Promise<void> {
    setItems(await listCanned(session!.accountId, q || undefined));
  }

  useEffect(() => {
    if (session) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => void refresh(search), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function onSubmit(values: Values): Promise<void> {
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/api/v1/accounts/${session!.accountId}/canned_responses/${editing}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        await apiFetch(`/api/v1/accounts/${session!.accountId}/canned_responses`, {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      setEditing(null);
      form.reset({ short_code: "", content: "" });
      await refresh(search);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  async function remove(id: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${session!.accountId}/canned_responses/${id}`, {
      method: "DELETE",
    });
    await refresh(search);
  }

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Configurações · Respostas prontas</h1>
        <p className="text-sm text-muted-foreground">
          Digite <code className="rounded bg-muted px-1">//atalho</code> na conversa para inserir.
        </p>
      </header>
      <main className="grid max-w-xl content-start gap-4 p-6">
        {isAdmin && (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-3 rounded-lg border bg-white p-4"
          >
            <h2 className="text-sm font-medium">{editing ? "Editar resposta" : "Nova resposta"}</h2>
            <div className="grid gap-1.5">
              <Label htmlFor="short_code">Atalho</Label>
              <Input id="short_code" {...form.register("short_code")} placeholder="saudacao" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea id="content" {...form.register("content")} rows={3} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editing ? "Salvar" : "Criar"}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(null);
                    form.reset({ short_code: "", content: "" });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="search">Buscar</Label>
          <Input
            id="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="//atalho ou trecho do texto..."
          />
        </div>
        <section className="rounded-lg border bg-white">
          {items === null ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 p-3">
                  <code className="mt-0.5 flex-shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs">
                    //{item.short_code}
                  </code>
                  <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{item.content}</p>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar //${item.short_code}`}
                        onClick={() => {
                          setEditing(item.id);
                          form.reset({
                            short_code: item.short_code ?? "",
                            content: item.content ?? "",
                          });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover //${item.short_code}`}
                        onClick={() => void remove(item.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
