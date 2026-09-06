import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import { ApiError, apiFetch } from "@/lib/auth";
import type { ConversationDetail } from "@/lib/conversations";
import { assignConversation, setLabels, setPriority } from "@/lib/conversations";

type Tab = "contact" | "previous" | "actions";

const PRIORITIES = [
  { value: "none", label: "Nenhuma" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
] as const;

export function DetailsPanel({
  accountId,
  conversation,
  agents,
  labels,
  onChanged,
}: {
  accountId: number;
  conversation: ConversationDetail;
  agents: Array<{ id: number; name: string; email: string }>;
  labels: Array<{ id: number; title: string; color: string }>;
  onChanged: (conversation: ConversationDetail) => void;
}) {
  const [tab, setTab] = useState<Tab>("contact");
  return (
    <aside
      aria-label="Detalhes"
      className="flex w-[280px] flex-shrink-0 flex-col border-l border-border bg-background"
    >
      <div className="flex border-b border-border">
        {(
          [
            { value: "contact", label: "Contato" },
            { value: "previous", label: "Anteriores" },
            { value: "actions", label: "Ações" },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "flex-1 border-b-2 px-2 py-2.5 text-xs transition-colors",
              tab === t.value
                ? "border-woot-blue font-medium text-woot-blue"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "contact" && (
          <ContactTab accountId={accountId} conversation={conversation} onChanged={onChanged} />
        )}
        {tab === "previous" && <PreviousTab accountId={accountId} conversation={conversation} />}
        {tab === "actions" && (
          <ActionsTab
            accountId={accountId}
            conversation={conversation}
            agents={agents}
            labels={labels}
            onChanged={onChanged}
          />
        )}
      </div>
    </aside>
  );
}

function ContactTab({
  accountId,
  conversation,
  onChanged,
}: {
  accountId: number;
  conversation: ConversationDetail;
  onChanged: (c: ConversationDetail) => void;
}) {
  const contact = conversation.contact;
  const form = useForm({
    values: {
      name: contact?.name ?? "",
      email: contact?.email ?? "",
      phone_number: contact?.phone_number ?? "",
    },
  });
  const [saved, setSaved] = useState(false);

  if (!contact) return <p className="text-sm text-muted-foreground">Sem contato.</p>;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <WootAvatar name={contact.name || "?"} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{contact.name || "(sem nome)"}</p>
          <p className="truncate text-xs text-muted-foreground">#{conversation.display_id}</p>
        </div>
      </div>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          const fresh = await apiFetch<{ contact: ConversationDetail["contact"] }>(
            `/api/v1/accounts/${accountId}/contacts/${contact.id}`,
            { method: "PATCH", body: JSON.stringify(values) },
          );
          onChanged({ ...conversation, contact: fresh.contact });
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        })}
        className="grid gap-2"
      >
        <div className="grid gap-1">
          <Label htmlFor="d-name">Nome</Label>
          <Input id="d-name" {...form.register("name")} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="d-email">E-mail</Label>
          <Input id="d-email" {...form.register("email")} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="d-phone">Telefone</Label>
          <Input id="d-phone" {...form.register("phone_number")} />
        </div>
        {saved && <p className="text-xs text-green-600">Salvo.</p>}
        <Button type="submit" size="sm" className="w-fit" disabled={form.formState.isSubmitting}>
          Salvar
        </Button>
      </form>
      {Object.keys(contact.custom_attributes).length > 0 && (
        <dl className="grid gap-1 rounded-lg border p-2 text-xs">
          {Object.entries(contact.custom_attributes).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="truncate">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function PreviousTab({
  accountId,
  conversation,
}: {
  accountId: number;
  conversation: ConversationDetail;
}) {
  const [items, setItems] = useState<Array<{
    id: number;
    display_id: number;
    status: string;
    last_activity_at: number;
  }> | null>(null);
  const contactId = conversation.contact?.id;

  useEffect(() => {
    if (!contactId) return;
    const q = conversation.contact?.email || conversation.contact?.name || "";
    void apiFetch<{
      conversations: Array<{
        id: number;
        contact_id: number | null;
        display_id: number;
        status: string;
        last_activity_at: number;
      }>;
    }>(`/api/v1/accounts/${accountId}/conversations/search?q=${encodeURIComponent(q)}`).then((d) =>
      setItems(
        d.conversations
          .filter((c) => c.contact_id === contactId && c.id !== conversation.id)
          .slice(0, 10),
      ),
    );
  }, [
    accountId,
    contactId,
    conversation.id,
    conversation.contact?.email,
    conversation.contact?.name,
  ]);

  if (!contactId) return <p className="text-sm text-muted-foreground">Sem contato.</p>;
  if (items === null) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhuma conversa anterior.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border px-2.5 py-2 text-sm">
          <p className="font-medium">#{item.display_id}</p>
          <p className="text-xs text-muted-foreground">
            {item.status} · {new Date(item.last_activity_at * 1000).toLocaleDateString("pt-BR")}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ActionsTab({
  accountId,
  conversation,
  agents,
  labels,
  onChanged,
}: {
  accountId: number;
  conversation: ConversationDetail;
  agents: Array<{ id: number; name: string; email: string }>;
  labels: Array<{ id: number; title: string; color: string }>;
  onChanged: (c: ConversationDetail) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<ConversationDetail>): Promise<void> {
    setError(null);
    try {
      onChanged(await fn());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  return (
    <div className="grid gap-3 text-sm">
      <div className="grid gap-1">
        <Label htmlFor="a-assignee">Atribuir a</Label>
        <select
          id="a-assignee"
          value={conversation.assignee_id ?? 0}
          onChange={(e) =>
            void run(() => assignConversation(accountId, conversation.id, Number(e.target.value)))
          }
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value={0}>Ninguém</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="a-priority">Prioridade</Label>
        <select
          id="a-priority"
          value={conversation.priority ?? "none"}
          onChange={(e) => void run(() => setPriority(accountId, conversation.id, e.target.value))}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label>Labels</Label>
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => {
            const active = conversation.labels.includes(label.title);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() =>
                  void run(() =>
                    setLabels(
                      accountId,
                      conversation.id,
                      active
                        ? conversation.labels.filter((t) => t !== label.title)
                        : [...conversation.labels, label.title],
                    ).then(async () => {
                      const fresh = await import("@/lib/conversations").then((m) =>
                        m.getConversation(accountId, conversation.id),
                      );
                      return fresh;
                    }),
                  )
                }
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs transition-colors",
                  active
                    ? "border-transparent font-medium text-white"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
                style={active ? { backgroundColor: label.color } : undefined}
              >
                {label.title}
              </button>
            );
          })}
        </div>
      </div>
      <ParticipantsEditor accountId={accountId} conversation={conversation} onChanged={onChanged} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ParticipantsEditor({
  accountId,
  conversation,
  onChanged,
}: {
  accountId: number;
  conversation: ConversationDetail;
  onChanged: (c: ConversationDetail) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [agents, setAgents] = useState<Array<{ id: number; name: string }> | null>(null);

  useEffect(() => {
    if (adding) {
      void apiFetch<{ agents: Array<{ id: number; name: string }> }>(
        `/api/v1/accounts/${accountId}/agents`,
      ).then((d) => setAgents(d.agents));
    }
  }, [adding, accountId]);

  async function add(userId: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${accountId}/conversations/${conversation.id}/participants`, {
      method: "POST",
      body: JSON.stringify({ user_ids: [userId] }),
    });
    const fresh = await import("@/lib/conversations").then((m) =>
      m.getConversation(accountId, conversation.id),
    );
    onChanged(fresh);
    setAdding(false);
  }

  async function remove(userId: number): Promise<void> {
    await apiFetch(
      `/api/v1/accounts/${accountId}/conversations/${conversation.id}/participants/${userId}`,
      { method: "DELETE" },
    );
    const fresh = await import("@/lib/conversations").then((m) =>
      m.getConversation(accountId, conversation.id),
    );
    onChanged(fresh);
  }

  return (
    <div className="grid gap-1.5">
      <Label>Participantes</Label>
      {conversation.participants.length === 0 && (
        <p className="text-xs text-muted-foreground">Nenhum.</p>
      )}
      <ul className="flex flex-col gap-1">
        {conversation.participants.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-xs">
            <span className="flex-1 truncate">{p.name}</span>
            <button
              type="button"
              onClick={() => void remove(p.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              remover
            </button>
          </li>
        ))}
      </ul>
      {!adding ? (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
          Adicionar
        </Button>
      ) : (
        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) void add(Number(e.target.value));
          }}
          className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="" disabled>
            Escolher agente...
          </option>
          {(agents ?? []).map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function MuteToggle({ muted, onToggle }: { muted: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={muted} onCheckedChange={() => onToggle()} />
      Silenciar notificações
    </label>
  );
}
