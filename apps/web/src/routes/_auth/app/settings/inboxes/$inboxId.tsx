import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/inboxes/$inboxId")({
  component: InboxDetail,
});

type Tab = "settings" | "agents" | "working_hours" | "configuration" | "agent_bot";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "settings", label: "Configurações" },
  { id: "agents", label: "Agentes" },
  { id: "working_hours", label: "Horário comercial" },
  { id: "configuration", label: "Configuração" },
  { id: "agent_bot", label: "AgentBot" },
];

interface AgentBotRow {
  id: number;
  name: string | null;
  description: string | null;
  outgoing_url: string | null;
  bot_type: string;
}

interface ApiInbox {
  id: number;
  inbox_members: number[];
  name: string;
  channel_type: string | null;
  enable_auto_assignment: boolean;
  greeting_enabled: boolean;
  greeting_message: string | null;
  working_hours_enabled: boolean;
  csat_survey_enabled: boolean;
  allow_messages_after_resolved: boolean;
  lock_to_single_conversation: boolean;
  channel: Record<string, unknown>;
}

interface Agent {
  id: number;
  name: string;
  email: string;
}

interface WorkingHour {
  id: number;
  day_of_week: number;
  closed_all_day: boolean;
  open_all_day: boolean;
  open_hour: number | null;
  open_minutes: number | null;
  close_hour: number | null;
  close_minutes: number | null;
}

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

async function loadInbox(accountId: number, inboxId: number): Promise<ApiInbox> {
  const data = await apiFetch<{ inbox: ApiInbox }>(
    `/api/v1/accounts/${accountId}/inboxes/${inboxId}`,
  );
  return data.inbox;
}

async function loadAgents(accountId: number): Promise<Agent[]> {
  const data = await apiFetch<{ agents: Agent[] }>(`/api/v1/accounts/${accountId}/agents`);
  return data.agents;
}

const settingsSchema = z.object({
  name: z.string().trim().min(1),
  greeting_enabled: z.boolean(),
  greeting_message: z.string().optional(),
  working_hours_enabled: z.boolean(),
  csat_survey_enabled: z.boolean(),
  enable_auto_assignment: z.boolean(),
  allow_messages_after_resolved: z.boolean(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";

function InboxDetail() {
  const { inboxId } = Route.useParams();
  const { session } = useSessionContext();
  const accountId = session?.accountId ?? Number(localStorage.getItem("cw_account_id"));
  const [tab, setTab] = useState<Tab>("settings");
  const [inbox, setInbox] = useState<ApiInbox | null>(null);
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [hours, setHours] = useState<WorkingHour[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    values: inbox
      ? {
          name: inbox.name,
          greeting_enabled: inbox.greeting_enabled,
          greeting_message: inbox.greeting_message ?? "",
          working_hours_enabled: inbox.working_hours_enabled,
          csat_survey_enabled: inbox.csat_survey_enabled,
          enable_auto_assignment: inbox.enable_auto_assignment,
          allow_messages_after_resolved: inbox.allow_messages_after_resolved,
        }
      : undefined,
  });

  useEffect(() => {
    Promise.all([loadInbox(accountId, Number(inboxId)), loadAgents(accountId)])
      .then(([inboxRow, agentRows]) => {
        setInbox(inboxRow);
        setAgents(agentRows);
        setIsAdmin(session?.account.role === "administrator");
      })
      .catch(() => setError("Falha ao carregar inbox"));
    void apiFetch<{ working_hours: WorkingHour[] }>(
      `/api/v1/accounts/${accountId}/inboxes/${inboxId}/working_hours`,
    ).then((d) => setHours(d.working_hours));
  }, [accountId, inboxId, session]);

  async function refreshInbox(): Promise<void> {
    setInbox(await loadInbox(accountId, Number(inboxId)));
  }

  async function saveSettings(values: SettingsValues): Promise<void> {
    setError(null);
    setSaved(false);
    try {
      await apiFetch(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: values.name,
          greeting_enabled: values.greeting_enabled,
          greeting_message: values.greeting_message,
          working_hours_enabled: values.working_hours_enabled,
          csat_survey_enabled: values.csat_survey_enabled,
          enable_auto_assignment: values.enable_auto_assignment,
          allow_messages_after_resolved: values.allow_messages_after_resolved,
        }),
      });
      await refreshInbox();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  async function toggleMember(agentId: number, member: boolean): Promise<void> {
    if (member) {
      await apiFetch(`/api/v1/accounts/${accountId}/inboxes/${inboxId}/inbox_members/${agentId}`, {
        method: "DELETE",
      });
    } else {
      await apiFetch(`/api/v1/accounts/${accountId}/inboxes/${inboxId}/inbox_members`, {
        method: "POST",
        body: JSON.stringify({ user_ids: [agentId] }),
      });
    }
    await refreshInbox();
  }

  const watchGreetingEnabled = useWatch({ control: form.control, name: "greeting_enabled" });
  const watchWorkingHoursEnabled = useWatch({
    control: form.control,
    name: "working_hours_enabled",
  });
  const watchCsatEnabled = useWatch({ control: form.control, name: "csat_survey_enabled" });
  const watchAutoAssignment = useWatch({ control: form.control, name: "enable_auto_assignment" });
  const watchAllowMessages = useWatch({
    control: form.control,
    name: "allow_messages_after_resolved",
  });

  const websiteToken = (inbox?.channel as { website_token?: string } | undefined)?.website_token;
  const serverUrl = SERVER_URL;

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="flex items-center gap-3 border-b bg-card px-6 py-4">
        <Link to="/app/settings/inboxes">
          <Button variant="ghost" size="icon" aria-label="Voltar">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold">{inbox?.name ?? "..."}</h1>
          <p className="text-sm text-muted-foreground">{inbox?.channel_type ?? ""}</p>
        </div>
      </header>
      <div className="flex gap-1 border-b bg-card px-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition-colors",
              tab === t.id
                ? "border-woot-blue font-medium text-woot-blue"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <main className="grid max-w-xl content-start gap-4 p-6">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {tab === "settings" && (
          <form
            onSubmit={form.handleSubmit(saveSettings)}
            className="grid gap-3 rounded-lg border bg-card p-4"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" disabled={!isAdmin} {...form.register("name")} />
            </div>
            <SettingCheckbox
              label="Saudação habilitada"
              checked={watchGreetingEnabled}
              disabled={!isAdmin}
              onChange={(v) => form.setValue("greeting_enabled", v, { shouldDirty: true })}
            />
            <SettingCheckbox
              label="Horário comercial habilitado"
              checked={watchWorkingHoursEnabled}
              disabled={!isAdmin}
              onChange={(v) => form.setValue("working_hours_enabled", v, { shouldDirty: true })}
            />
            <SettingCheckbox
              label="Pesquisa CSAT"
              checked={watchCsatEnabled}
              disabled={!isAdmin}
              onChange={(v) => form.setValue("csat_survey_enabled", v, { shouldDirty: true })}
            />
            <SettingCheckbox
              label="Atribuição automática"
              checked={watchAutoAssignment}
              disabled={!isAdmin}
              onChange={(v) => form.setValue("enable_auto_assignment", v, { shouldDirty: true })}
            />
            <SettingCheckbox
              label="Permitir mensagens após resolução"
              checked={watchAllowMessages}
              disabled={!isAdmin}
              onChange={(v) =>
                form.setValue("allow_messages_after_resolved", v, { shouldDirty: true })
              }
            />
            <div className="grid gap-1.5">
              <Label htmlFor="greeting_message">Mensagem de saudação</Label>
              <Input
                id="greeting_message"
                disabled={!isAdmin}
                {...form.register("greeting_message")}
              />
            </div>
            {saved && <p className="text-sm text-green-600">Salvo.</p>}
            {isAdmin && (
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-fit">
                Salvar
              </Button>
            )}
          </form>
        )}

        {tab === "agents" && (
          <section className="rounded-lg border bg-card">
            {agents === null ? (
              <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <ul className="divide-y">
                {agents.map((agent) => {
                  const member = (inbox?.inbox_members ?? []).includes(agent.id);
                  return (
                    <li key={agent.id} className="flex items-center gap-3 p-4">
                      <WootAvatar name={agent.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{agent.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{agent.email}</p>
                      </div>
                      <Checkbox
                        checked={member}
                        disabled={!isAdmin}
                        onCheckedChange={(checked) => void toggleMember(agent.id, checked !== true)}
                        aria-label={`${member ? "Remover" : "Adicionar"} ${agent.name}`}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {tab === "working_hours" && (
          <WorkingHoursForm
            inboxId={Number(inboxId)}
            accountId={accountId}
            initial={hours}
            isAdmin={isAdmin}
            enabled={inbox?.working_hours_enabled ?? false}
          />
        )}

        {tab === "configuration" && inbox?.channel_type === "Channel::WebWidget" && (
          <section className="grid gap-3 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-medium">Snippet do widget</h2>
            <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
              {websiteToken
                ? `<script>\n  window.chatwootSettings = { websiteToken: "${websiteToken}" };\n</script>\n<script src="${serverUrl}/widget.js" defer></script>`
                : "—"}
            </pre>
            <CopyButton text={websiteToken ?? ""} />
            <h2 className="mt-2 text-sm font-medium">Saudação</h2>
            <p className="text-xs text-muted-foreground">
              {inbox.greeting_enabled
                ? (inbox.greeting_message ?? "(sem mensagem)")
                : "Desabilitada"}
            </p>
          </section>
        )}
        {tab === "configuration" && inbox?.channel_type === "Channel::Api" && (
          <section className="grid gap-2 rounded-lg border bg-card p-4 text-sm">
            <h2 className="font-medium">Token do canal API</h2>
            <p className="text-xs text-muted-foreground">
              Use no header <code>api_secret</code> das chamadas da API channel.
            </p>
            <CopyButton text={String((inbox.channel as { secret?: string }).secret ?? "")} />
          </section>
        )}
        {tab === "agent_bot" && (
          <AgentBotSection accountId={accountId} inboxId={Number(inboxId)} isAdmin={isAdmin} />
        )}

        {tab === "configuration" && inbox?.channel_type === "Channel::Email" && (
          <section className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            IMAP/SMTP completos chegam no M10.
          </section>
        )}
      </main>
    </div>
  );
}

function WorkingHoursForm({
  inboxId,
  accountId,
  initial,
  isAdmin,
  enabled,
}: {
  inboxId: number;
  accountId: number;
  initial: WorkingHour[] | null;
  isAdmin: boolean;
  enabled: boolean;
}) {
  const [state, setState] = useState<WorkingHourRow[]>(() =>
    DAYS.map((_, day) => {
      const found = initial?.find((h) => h.day_of_week === day);
      return {
        day_of_week: day,
        closed_all_day: found?.closed_all_day ?? false,
        open_all_day: found?.open_all_day ?? false,
        open_hour: found?.open_hour ?? 9,
        open_minutes: found?.open_minutes ?? 0,
        close_hour: found?.close_hour ?? 17,
        close_minutes: found?.close_minutes ?? 0,
      };
    }),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(day: number, patch: Partial<WorkingHourRow>): void {
    setSaved(false);
    setState((prev) => prev.map((row) => (row.day_of_week === day ? { ...row, ...patch } : row)));
  }

  async function save(): Promise<void> {
    setError(null);
    try {
      await apiFetch(`/api/v1/accounts/${accountId}/inboxes/${inboxId}/working_hours`, {
        method: "PUT",
        body: JSON.stringify({
          working_hours: state.map((row) => ({
            day_of_week: row.day_of_week,
            closed_all_day: row.closed_all_day,
            open_all_day: row.open_all_day,
            open_hour: row.open_hour,
            open_minutes: row.open_minutes,
            close_hour: row.close_hour,
            close_minutes: row.close_minutes,
          })),
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  return (
    <section className="grid gap-3 rounded-lg border bg-card p-4">
      {!enabled && (
        <p className="text-xs text-muted-foreground">
          Habilite o horário comercial na aba Configurações para ativar o banner.
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-start text-xs text-muted-foreground">
            <th className="py-1 text-start">Dia</th>
            <th className="py-1">Fechado</th>
            <th className="py-1">Aberto 24h</th>
            <th className="py-1">Abre</th>
            <th className="py-1">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {state.map((row) => (
            <tr key={row.day_of_week} className="border-t">
              <td className="py-1.5">{DAYS[row.day_of_week]}</td>
              <td className="text-center">
                <Checkbox
                  checked={row.closed_all_day}
                  disabled={!isAdmin}
                  onCheckedChange={(c) => update(row.day_of_week, { closed_all_day: c === true })}
                />
              </td>
              <td className="text-center">
                <Checkbox
                  checked={row.open_all_day}
                  disabled={!isAdmin}
                  onCheckedChange={(c) => update(row.day_of_week, { open_all_day: c === true })}
                />
              </td>
              <td>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  className="w-16"
                  disabled={!isAdmin || row.closed_all_day || row.open_all_day}
                  value={row.open_hour}
                  onChange={(e) => update(row.day_of_week, { open_hour: Number(e.target.value) })}
                />
              </td>
              <td>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  className="w-16"
                  disabled={!isAdmin || row.closed_all_day || row.open_all_day}
                  value={row.close_hour}
                  onChange={(e) => update(row.day_of_week, { close_hour: Number(e.target.value) })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-600">Salvo.</p>}
      {isAdmin && (
        <Button onClick={() => void save()} className="w-fit">
          Salvar horários
        </Button>
      )}
    </section>
  );
}

interface WorkingHourRow {
  day_of_week: number;
  closed_all_day: boolean;
  open_all_day: boolean;
  open_hour: number;
  open_minutes: number;
  close_hour: number;
  close_minutes: number;
}

function SettingCheckbox({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(c) => onChange(c === true)}
        disabled={disabled}
      />
      {label}
    </label>
  );
}

/** M12 — vincula um AgentBot à inbox (responde via outgoing_url). */
function AgentBotSection({
  accountId,
  inboxId,
  isAdmin,
}: {
  accountId: number;
  inboxId: number;
  isAdmin: boolean;
}) {
  const [bots, setBots] = useState<AgentBotRow[]>([]);
  const [linkedId, setLinkedId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [b, linked] = await Promise.all([
          apiFetch<{ agent_bots: AgentBotRow[] }>(`/api/v1/accounts/${accountId}/agent_bots`),
          apiFetch<{ agent_bot: AgentBotRow | null }>(
            `/api/v1/accounts/${accountId}/inboxes/${inboxId}/agent_bot`,
          ),
        ]);
        if (!cancelled) {
          setBots(b.agent_bots);
          setLinkedId(linked.agent_bot?.id ?? null);
        }
      } catch {
        /* sem acesso */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, inboxId]);

  async function link(id: number | null): Promise<void> {
    setError(null);
    try {
      await apiFetch(`/api/v1/accounts/${accountId}/inboxes/${inboxId}/agent_bot`, {
        method: "PUT",
        body: JSON.stringify({ agent_bot_id: id }),
      });
      setLinkedId(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  async function create(): Promise<void> {
    setError(null);
    try {
      const data = await apiFetch<{ agent_bot: AgentBotRow }>(
        `/api/v1/accounts/${accountId}/agent_bots`,
        {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), outgoing_url: url.trim() || undefined }),
        },
      );
      setBots((prev) => [...prev, data.agent_bot]);
      setName("");
      setUrl("");
      await link(data.agent_bot.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  return (
    <section className="grid gap-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-medium">Bot da inbox</h2>
      <p className="text-xs text-muted-foreground">
        Mensagens recebidas são encaminhadas ao <code>outgoing_url</code> do bot; a resposta volta
        por <code>POST /agent_bots/:id/webhook</code>.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="agent-bot">Bot vinculado</Label>
        <select
          id="agent-bot"
          disabled={!isAdmin}
          value={linkedId ?? ""}
          onChange={(e) => void link(e.target.value ? Number(e.target.value) : null)}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Nenhum</option>
          {bots.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name ?? `#${b.id}`} ({b.bot_type})
            </option>
          ))}
        </select>
      </div>
      {isAdmin && (
        <div className="grid gap-1.5 border-t pt-3">
          <Label>Novo bot webhook</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do bot" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://seu-bot/hook"
          />
          <Button
            type="button"
            disabled={!name.trim()}
            onClick={() => void create()}
            className="w-fit"
          >
            Criar e vincular
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-fit gap-2"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}
