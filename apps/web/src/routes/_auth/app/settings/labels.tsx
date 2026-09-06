import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/labels")({
  component: LabelsSettings,
});

interface ApiLabel {
  id: number;
  title: string;
  color: string;
  description: string | null;
  show_on_sidebar: boolean;
}

const schema = z.object({
  title: z.string().trim().min(1, "Informe o título"),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, "Cor inválida"),
  description: z.string().optional(),
});

type Values = z.infer<typeof schema>;

function LabelsSettings() {
  const { session } = useSessionContext();
  const [labels, setLabels] = useState<ApiLabel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const isAdmin = session?.account.role === "administrator";
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", color: "#1f93ff", description: "" },
  });

  async function refresh(): Promise<void> {
    const data = await apiFetch<{ labels: ApiLabel[] }>(
      `/api/v1/accounts/${session!.accountId}/labels`,
    );
    setLabels(data.labels);
  }

  useEffect(() => {
    if (session) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function onSubmit(values: Values): Promise<void> {
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/api/v1/accounts/${session!.accountId}/labels/${editing}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        await apiFetch(`/api/v1/accounts/${session!.accountId}/labels`, {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      setEditing(null);
      form.reset({ title: "", color: "#1f93ff", description: "" });
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (Object.values(err.attributes ?? {})[0]?.[0] ?? err.message)
          : "Erro inesperado",
      );
    }
  }

  async function remove(id: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${session!.accountId}/labels/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-lg font-semibold">Configurações · Labels</h1>
        <p className="text-sm text-muted-foreground">
          Etiquetas aplicáveis a conversas e contatos.
        </p>
      </header>
      <main className="grid max-w-xl content-start gap-4 p-6">
        {isAdmin && (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-3 rounded-lg border bg-card p-4"
          >
            <h2 className="text-sm font-medium">{editing ? "Editar label" : "Nova label"}</h2>
            <div className="grid gap-1.5 sm:grid-cols-[1fr_100px]">
              <div className="grid gap-1.5">
                <Label htmlFor="title">Título</Label>
                <Input id="title" {...form.register("title")} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="color">Cor</Label>
                <Input id="color" type="color" {...form.register("color")} className="h-9 px-1" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" {...form.register("description")} />
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
                    form.reset({ title: "", color: "#1f93ff", description: "" });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
        <section className="rounded-lg border bg-card">
          {labels === null ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="divide-y">
              {labels.map((label) => (
                <li key={label.id} className="flex items-center gap-3 p-3">
                  <span
                    className="size-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{label.title}</p>
                    {label.description && (
                      <p className="truncate text-xs text-muted-foreground">{label.description}</p>
                    )}
                  </div>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${label.title}`}
                        onClick={() => {
                          setEditing(label.id);
                          form.reset({
                            title: label.title,
                            color: label.color,
                            description: label.description ?? "",
                          });
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${label.title}`}
                        onClick={() => void remove(label.id)}
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
