import { zodResolver } from "@hookform/resolvers/zod";
import { FlaskConical, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/webhooks")({
  component: WebhooksSettings,
});

const EVENTS = [
  "conversation_created",
  "conversation_updated",
  "conversation_status_changed",
  "message_created",
  "message_updated",
  "contact_created",
  "contact_updated",
  "webwidget_triggered",
  "inbox_created",
  "inbox_updated",
] as const;

const schema = z.object({
  url: z.url("URL inválida"),
  name: z.string().optional(),
});

type Values = z.infer<typeof schema>;

interface Webhook {
  id: number;
  name: string | null;
  url: string | null;
  subscriptions: string[];
}

function WebhooksSettings() {
  const { session } = useSessionContext();
  const [items, setItems] = useState<Webhook[] | null>(null);
  const [subs, setSubs] = useState<string[]>(["conversation_created", "message_created"]);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = session?.account.role === "administrator";
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { url: "", name: "" },
  });

  async function refresh(): Promise<void> {
    const d = await apiFetch<{ webhooks: Webhook[] }>(
      `/api/v1/accounts/${session!.accountId}/webhooks`,
    );
    setItems(d.webhooks);
  }

  useEffect(() => {
    if (session) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function toggleSub(event: string): void {
    setSubs((prev) => (prev.includes(event) ? prev.filter((s) => s !== event) : [...prev, event]));
  }

  async function onSubmit(values: Values): Promise<void> {
    setError(null);
    if (subs.length === 0) {
      setError("Selecione ao menos um evento");
      return;
    }
    try {
      await apiFetch(`/api/v1/accounts/${session!.accountId}/webhooks`, {
        method: "POST",
        body: JSON.stringify({
          url: values.url,
          name: values.name || undefined,
          subscriptions: subs,
        }),
      });
      form.reset({ url: "", name: "" });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  async function test(id: number): Promise<void> {
    try {
      const d = await apiFetch<{ ok: boolean; status?: number }>(
        `/api/v1/accounts/${session!.accountId}/webhooks/${id}/test`,
        { method: "POST" },
      );
      if (d.ok) toast.success(`Webhook respondeu ${d.status ?? 200}`);
      else toast.error(`Webhook falhou${d.status ? ` (${d.status})` : ""}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha no teste");
    }
  }

  async function remove(id: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${session!.accountId}/webhooks/${id}`, {
      method: "DELETE",
    });
    await refresh();
  }

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-lg font-semibold">Configurações · Webhooks</h1>
        <p className="text-sm text-muted-foreground">
          POST em JSON (<code className="rounded bg-muted px-1">event, data, account_id</code>) a
          cada evento inscrito, com retry automático.
        </p>
      </header>
      <main className="grid max-w-2xl content-start gap-4 p-6">
        {isAdmin && (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-3 rounded-lg border bg-card p-4"
          >
            <h2 className="text-sm font-medium">Novo webhook</h2>
            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <div className="grid gap-1.5">
                <Label htmlFor="url">URL</Label>
                <Input id="url" {...form.register("url")} placeholder="https://..." />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" {...form.register("name")} placeholder="n8n" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Eventos</Label>
              <div className="flex flex-wrap gap-2">
                {EVENTS.map((event) => (
                  <label
                    key={event}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                  >
                    <Checkbox
                      checked={subs.includes(event)}
                      onCheckedChange={() => toggleSub(event)}
                    />
                    {event}
                  </label>
                ))}
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
        <section className="rounded-lg border bg-card">
          {items === null ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="divide-y">
              {items.map((hook) => (
                <li key={hook.id} className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{hook.name || hook.url}</p>
                    <p className="truncate text-xs text-muted-foreground">{hook.url}</p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {hook.subscriptions.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </p>
                  </div>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void test(hook.id)}
                      >
                        <FlaskConical className="size-3.5" />
                        Testar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${hook.url}`}
                        onClick={() => void remove(hook.id)}
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
