import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
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
  "conversation_status_changed",
  "conversation_updated",
  "message_created",
  "message_updated",
  "webwidget_triggered",
  "contact_created",
  "contact_updated",
  "inbox_created",
  "inbox_updated",
  "conversation_typing_on",
  "conversation_typing_off",
] as const;

const EVENT_LABELS: Record<string, string> = {
  conversation_created: "Conversa criada",
  conversation_status_changed: "Status da conversa alterado",
  conversation_updated: "Conversa atualizada",
  message_created: "Mensagem criada",
  message_updated: "Mensagem atualizada",
  webwidget_triggered: "Widget aberto pelo visitante",
  contact_created: "Contato criado",
  contact_updated: "Contato atualizado",
  inbox_created: "Inbox criada",
  inbox_updated: "Inbox atualizada",
  conversation_typing_on: "Começou a digitar",
  conversation_typing_off: "Parou de digitar",
};

const schema = z.object({
  url: z.url("URL inválida"),
  name: z.string().optional(),
  subscriptions: z.array(z.string()).min(1, "Selecione ao menos um evento"),
});

type Values = z.infer<typeof schema>;

interface Webhook {
  id: number;
  name: string | null;
  url: string | null;
  subscriptions: string[];
}

/**
 * Configurações · Webhooks 1:1 com settings/integrations/Webhooks/Index do
 * v4: header com busca + contador + botão, tabela Endpoint/Ações e modais de
 * adicionar/editar/excluir.
 */
function WebhooksSettings() {
  const { session } = useSessionContext();
  const [items, setItems] = useState<Webhook[] | null>(null);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Webhook | null>(null);
  const [deleting, setDeleting] = useState<Webhook | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const isAdmin = session?.account.role === "administrator";

  async function refresh(): Promise<void> {
    const d = await apiFetch<{ webhooks: Webhook[] }>(
      `/api/v1/accounts/${session!.accountId}/webhooks`,
    );
    setItems(d.webhooks);
  }

  useEffect(() => {
    if (session) void refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items ?? [];
    return (items ?? []).filter(
      (w) => (w.name ?? "").toLowerCase().includes(q) || (w.url ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  if (!session) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-woot-bg">
      <header className="shrink-0 px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-medium text-woot-slate-12">Webhooks</h1>
                {(items?.length ?? 0) > 0 && (
                  <span className="text-sm text-woot-slate-11">
                    {items!.length} {items!.length === 1 ? "webhook" : "webhooks"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-woot-slate-11">
                Receba eventos da conta via HTTP.{" "}
                <a
                  href="https://www.chatwoot.com/hc/user-guide/en/collections/6540915"
                  target="_blank"
                  rel="noreferrer"
                  className="text-woot-blue hover:underline"
                >
                  Saiba mais sobre webhooks
                </a>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-woot-slate-11" />
                <Input
                  type="search"
                  placeholder="Buscar webhooks..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-8 w-56 pl-8"
                />
              </div>
              {isAdmin && (
                <Button size="sm" onClick={() => setAdding(true)} className="gap-2">
                  <Plus className="size-4" /> Adicionar webhook
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto w-full max-w-5xl pb-6">
          {items === null ? (
            <p className="py-10 text-center text-sm text-woot-slate-11">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-woot-slate-11">
              {query ? "Nenhum webhook para essa busca." : "Nenhum webhook nesta conta."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-woot-slate-11">
                    <th className="px-4 py-2.5 font-medium">Endpoint do webhook</th>
                    {isAdmin && <th className="w-24 px-4 py-2.5 text-right font-medium">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((hook, index) => (
                    <WebhookRow
                      key={hook.id}
                      webhook={hook}
                      index={index}
                      isAdmin={isAdmin}
                      busy={busyId === hook.id}
                      onEdit={() => setEditing(hook)}
                      onDelete={() => setDeleting(hook)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {adding && (
        <WebhookDialog
          accountId={session.accountId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void refresh();
          }}
        />
      )}
      {editing && (
        <WebhookDialog
          accountId={session.accountId}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h2 className="mb-1 text-base font-semibold text-woot-slate-12">Confirmar exclusão</h2>
            <p className="mb-4 text-sm text-woot-slate-11">
              Tem certeza que deseja excluir <strong>{deleting.url}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                Não, manter {deleting.url}
              </Button>
              <Button
                variant="destructive"
                disabled={busyId === deleting.id}
                onClick={() => {
                  setBusyId(deleting.id);
                  void apiFetch(`/api/v1/accounts/${session.accountId}/webhooks/${deleting.id}`, {
                    method: "DELETE",
                  })
                    .then(() => {
                      setDeleting(null);
                      return refresh();
                    })
                    .catch(() => setBusyId(null));
                }}
              >
                Sim, excluir {deleting.url}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Linha do webhook (WebhookRow do v4): nome + URL e eventos inscritos. */
function WebhookRow({
  webhook,
  index,
  isAdmin,
  busy,
  onEdit,
  onDelete,
}: {
  webhook: Webhook;
  index: number;
  isAdmin: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const events = webhook.subscriptions.map((e) => EVENT_LABELS[e] ?? e).join(", ");
  const long = events.length > 60;
  return (
    <tr className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40">
      <td className="px-4 py-2.5">
        <p className="flex gap-2 break-words font-medium text-woot-slate-12">
          {webhook.name && <span>{webhook.name}</span>}
          <span className={webhook.name ? "font-normal text-woot-slate-11" : ""}>
            {webhook.url}
          </span>
        </p>
        <p className="mt-1 text-sm text-woot-slate-11">
          <span className="font-medium">Eventos inscritos: </span>
          {long && !expanded ? `${events.slice(0, 60)}... ` : `${events} `}
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-woot-blue hover:underline"
            >
              {expanded ? "ver menos" : "ver mais"}
            </button>
          )}
          <span className="sr-only">linha {index + 1}</span>
        </p>
      </td>
      {isAdmin && (
        <td className="w-24 px-4 py-2.5">
          <span className="flex flex-shrink-0 justify-end gap-3">
            <Button
              variant="ghost"
              size="icon-xs"
              title="Editar"
              aria-label={`Editar ${webhook.url}`}
              disabled={busy}
              onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              title="Excluir"
              aria-label={`Excluir ${webhook.url}`}
              disabled={busy}
              onClick={onDelete}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </span>
        </td>
      )}
    </tr>
  );
}

/** Modal adicionar/editar (NewWebHook/EditWebHook do v4). */
function WebhookDialog({
  accountId,
  initial,
  onClose,
  onSaved,
}: {
  accountId: number;
  initial?: Webhook;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      url: initial?.url ?? "",
      name: initial?.name ?? "",
      subscriptions: initial?.subscriptions ?? ["conversation_created", "message_created"],
    },
  });
  const [error, setError] = useState<string | null>(null);
  const subscriptions = useWatch({ control: form.control, name: "subscriptions" });

  function toggle(event: string): void {
    const current = form.getValues("subscriptions");
    form.setValue(
      "subscriptions",
      current.includes(event) ? current.filter((s) => s !== event) : [...current, event],
      { shouldValidate: true },
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-lg">
        <h2 className="mb-1 text-base font-semibold text-woot-slate-12">
          {initial ? "Editar webhook" : "Adicionar webhook"}
        </h2>
        <p className="mb-3 text-sm text-woot-slate-11">Chamamos essa URL a cada evento inscrito.</p>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              const body = JSON.stringify({
                url: values.url,
                name: values.name || undefined,
                subscriptions: values.subscriptions,
              });
              if (initial) {
                await apiFetch(`/api/v1/accounts/${accountId}/webhooks/${initial.id}`, {
                  method: "PATCH",
                  body,
                });
              } else {
                await apiFetch(`/api/v1/accounts/${accountId}/webhooks`, {
                  method: "POST",
                  body,
                });
              }
              onSaved();
            } catch (err) {
              setError(
                err instanceof ApiError
                  ? (Object.values(err.attributes ?? {})[0]?.[0] ?? err.message)
                  : "Erro inesperado",
              );
            }
          })}
          className="grid gap-3"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="hook-url">URL</Label>
            <Input
              id="hook-url"
              {...form.register("url")}
              placeholder="https://minha-api.test/hook"
            />
            {form.formState.errors.url && (
              <p className="text-xs text-destructive">{form.formState.errors.url.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hook-name">Nome (opcional)</Label>
            <Input id="hook-name" {...form.register("name")} placeholder="n8n" />
          </div>
          <div className="grid gap-1.5">
            <Label>Eventos inscritos</Label>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {EVENTS.map((event) => (
                <label
                  key={event}
                  className="flex cursor-pointer items-center gap-2 text-sm text-woot-slate-12"
                >
                  <Checkbox
                    checked={subscriptions.includes(event)}
                    onCheckedChange={() => toggle(event)}
                  />
                  {EVENT_LABELS[event] ?? event}
                </label>
              ))}
            </div>
            {form.formState.errors.subscriptions && (
              <p className="text-xs text-destructive">
                {form.formState.errors.subscriptions.message}
              </p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {initial ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
