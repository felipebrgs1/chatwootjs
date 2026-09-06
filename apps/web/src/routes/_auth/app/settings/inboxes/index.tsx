import { Globe, Mail, MessageSquare, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/inboxes/")({
  component: InboxesSettings,
});

interface ApiInbox {
  id: number;
  name: string;
  channel_type: string | null;
  greeting_enabled: boolean;
  csat_survey_enabled: boolean;
  working_hours_enabled: boolean;
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

async function loadInboxes(accountId: number): Promise<ApiInbox[]> {
  const data = await apiFetch<{ inboxes: ApiInbox[] }>(`/api/v1/accounts/${accountId}/inboxes`);
  return data.inboxes;
}

function InboxesSettings() {
  const [inboxes, setInboxes] = useState<ApiInbox[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = Number(localStorage.getItem("cw_account_id"));
    loadInboxes(id)
      .then(setInboxes)
      .catch(() => setError(true));
  }, []);

  const filtered = (inboxes ?? []).filter((inbox) =>
    inbox.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="flex items-center justify-between border-b bg-card px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Configurações · Caixas de entrada</h1>
          <p className="text-sm text-muted-foreground">
            Canais por onde chegam as conversas da conta.
          </p>
        </div>
        <Link to="/app/settings/inboxes/new">
          <Button>Nova caixa de entrada</Button>
        </Link>
      </header>
      <main className="grid max-w-3xl content-start gap-3 p-6">
        <Input
          placeholder="Buscar..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        {error && <p className="text-sm text-destructive">Falha ao carregar inboxes.</p>}
        {!error && inboxes === null && (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        )}
        {filtered.length === 0 && inboxes !== null && (
          <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            Nenhuma inbox encontrada.
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {filtered.map((inbox) => {
            const meta = CHANNEL_META[inbox.channel_type ?? ""] ?? {
              label: inbox.channel_type ?? "—",
              icon: MessageSquare,
            };
            const Icon = meta.icon;
            return (
              <li key={inbox.id}>
                <Link
                  to="/app/settings/inboxes/$inboxId"
                  params={{ inboxId: String(inbox.id) }}
                  className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-woot-blue"
                >
                  <span className="grid size-9 flex-shrink-0 place-content-center rounded-lg bg-woot-nav-active-bg text-woot-blue">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{inbox.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {meta.label}
                      {inbox.greeting_enabled && " · saudação"}
                      {inbox.csat_survey_enabled && " · CSAT"}
                      {inbox.working_hours_enabled && " · horário comercial"}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">#{inbox.id}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
