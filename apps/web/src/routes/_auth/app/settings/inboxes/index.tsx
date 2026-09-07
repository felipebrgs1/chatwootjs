import {
  Globe,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Smartphone,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";

import { useSessionContext } from "@/components/session-provider";
import { apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/inboxes/")({
  component: InboxesSettings,
});

interface ApiInbox {
  id: number;
  name: string;
  channel_type: string | null;
  channel: Record<string, unknown>;
}

const CHANNEL_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  "Channel::WebWidget": { label: "Website", icon: Globe },
  "Channel::Api": { label: "API", icon: MessageSquare },
  "Channel::Email": { label: "Email", icon: Mail },
  "Channel::Whatsapp": { label: "WhatsApp", icon: Smartphone },
  "Channel::Telegram": { label: "Telegram", icon: MessageSquare },
  "Channel::Sms": { label: "SMS", icon: Smartphone },
  "Channel::Line": { label: "Line", icon: MessageSquare },
  "Channel::FacebookPage": { label: "Facebook", icon: MessageSquare },
  "Channel::Instagram": { label: "Instagram", icon: MessageSquare },
  "Channel::TwitterProfile": { label: "Twitter", icon: MessageSquare },
};

/** Identificador do canal (URL, e-mail, telefone...) como no ChannelName. */
function channelIdentifier(inbox: ApiInbox): string | null {
  const ch = inbox.channel ?? {};
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return (
    str(ch["website_url"]) ??
    str(ch["email"]) ??
    str(ch["phone_number"]) ??
    str(ch["page_id"]) ??
    str(ch["username"]) ??
    null
  );
}

/**
 * Configurações · Inboxes 1:1 com settings/inbox/Index do v4: header com
 * busca + contador + botão, linhas com ícone do canal/nome/identificador e
 * configurar/excluir.
 */
function InboxesSettings() {
  const { session } = useSessionContext();
  const [inboxes, setInboxes] = useState<ApiInbox[] | null>(null);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<ApiInbox | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const isAdmin = session?.account.role === "administrator";

  async function refresh(): Promise<void> {
    const data = await apiFetch<{ inboxes: ApiInbox[] }>(
      `/api/v1/accounts/${session!.accountId}/inboxes`,
    );
    setInboxes(data.inboxes);
  }

  useEffect(() => {
    if (session) void refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inboxes ?? [];
    return (inboxes ?? []).filter((i) => i.name.toLowerCase().includes(q));
  }, [inboxes, query]);

  if (!session) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-woot-bg">
      <header className="shrink-0 px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-medium text-woot-slate-12">Caixas de entrada</h1>
                {(inboxes?.length ?? 0) > 0 && (
                  <span className="text-sm text-woot-slate-11">
                    {inboxes!.length} {inboxes!.length === 1 ? "inbox" : "inboxes"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-woot-slate-11">
                Conecte canais como site, e-mail e WhatsApp.{" "}
                <a
                  href="https://www.chatwoot.com/hc/user-guide/en/collections/6542005"
                  target="_blank"
                  rel="noreferrer"
                  className="text-woot-blue hover:underline"
                >
                  Saiba mais sobre inboxes
                </a>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-woot-slate-11" />
                <Input
                  type="search"
                  placeholder="Buscar inboxes..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-8 w-56 pl-8"
                />
              </div>
              {isAdmin && (
                <Link to="/app/settings/inboxes/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="size-4" /> Nova inbox
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto w-full max-w-5xl pb-6">
          {inboxes === null ? (
            <p className="py-10 text-center text-sm text-woot-slate-11">Carregando...</p>
          ) : filtered.length === 0 && query ? (
            <p className="py-20 text-center text-base text-woot-slate-11">
              Nenhuma inbox para essa busca.
            </p>
          ) : (
            <div className="divide-y divide-border border-t border-border">
              {filtered.map((inbox) => {
                const meta = CHANNEL_META[inbox.channel_type ?? ""] ?? {
                  label: inbox.channel_type ?? "—",
                  icon: MessageSquare,
                };
                const Icon = meta.icon;
                const identifier = channelIdentifier(inbox);
                return (
                  <div key={inbox.id} className="flex items-start justify-between gap-4 py-4">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <span className="grid size-10 shrink-0 place-content-center rounded-xl border border-border bg-card shadow-sm">
                        <Icon className="size-6 text-woot-slate-10" />
                      </span>
                      <div className="flex min-w-0 flex-col items-start gap-1">
                        <span
                          title={inbox.name}
                          className="block max-w-full truncate text-base font-medium capitalize text-woot-slate-12"
                        >
                          {inbox.name}
                        </span>
                        <span className="flex min-w-0 max-w-full items-center gap-1 text-sm text-woot-slate-11">
                          <span className="shrink-0">{meta.label}</span>
                          {identifier && (
                            <>
                              <span aria-hidden="true">•</span>
                              <span title={identifier} className="truncate">
                                {identifier}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex shrink-0 justify-end gap-3">
                        <Link
                          to="/app/settings/inboxes/$inboxId"
                          params={{ inboxId: String(inbox.id) }}
                          aria-label={`Configurar ${inbox.name}`}
                          title="Configurações"
                          className="grid size-7 place-content-center rounded-lg text-woot-slate-11 transition-colors hover:bg-muted hover:text-woot-slate-12"
                        >
                          <Settings className="size-4" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Excluir"
                          aria-label={`Excluir ${inbox.name}`}
                          onClick={() => setDeleting(inbox)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h2 className="mb-1 text-base font-semibold text-woot-slate-12">Confirmar exclusão</h2>
            <p className="mb-4 text-sm text-woot-slate-11">
              Tem certeza que deseja excluir <strong>{deleting.name}</strong>? As conversas da inbox
              são removidas junto.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                Não, manter {deleting.name}
              </Button>
              <Button
                variant="destructive"
                disabled={busyId === deleting.id}
                onClick={() => {
                  setBusyId(deleting.id);
                  void apiFetch(`/api/v1/accounts/${session.accountId}/inboxes/${deleting.id}`, {
                    method: "DELETE",
                  })
                    .then(() => {
                      setDeleting(null);
                      return refresh();
                    })
                    .catch(() => setBusyId(null));
                }}
              >
                Sim, excluir {deleting.name}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
