import { Copy, Mail, MessageSquare, Pencil, Phone, Plus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import { WootSelectMenu } from "@/components/woot-select-menu";
import { subscribeCableEvents } from "@/hooks/useCable";
import { ApiError, apiFetch } from "@/lib/auth";
import type { ConversationDetail } from "@/lib/conversations";
import { getPresence } from "@/lib/notifications";
import { assignConversation, setLabels, setPriority } from "@/lib/conversations";
import {
  executeMacro,
  listMacros,
  listTeams,
  setConversationTeam,
  type Macro,
  type Team,
} from "@/lib/automation";

const PRIORITIES = [
  { value: "none", label: "Nenhuma" },
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
] as const;

/** Painel lateral estilo Chatwoot v4: tabs Contato/Copilot e accordions
 * (Ações, Participantes, Macros, Atributos, Informações, Anteriores). */
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
  const [tab, setTab] = useState<"contact" | "copilot">("contact");
  return (
    <aside
      aria-label="Detalhes"
      className="flex w-[312px] flex-shrink-0 flex-col border-l border-border bg-background"
    >
      {/* Tabs Contato / Copilot */}
      <div className="flex flex-shrink-0 gap-1 px-3 py-2">
        {(
          [
            { value: "contact", label: "Contato" },
            { value: "copilot", label: "Copilot" },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "flex-1 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              tab === t.value
                ? "border-border bg-woot-slate-3/60 font-medium text-woot-blue"
                : "border-transparent text-woot-slate-11 hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-0">
        {tab === "contact" && (
          <ContactPanel
            accountId={accountId}
            conversation={conversation}
            agents={agents}
            labels={labels}
            onChanged={onChanged}
          />
        )}
        {tab === "copilot" && (
          <div className="grid place-content-center gap-1 py-16 text-center">
            <p className="text-sm font-medium text-woot-slate-12">Copilot</p>
            <p className="text-xs text-woot-slate-11">Assistente IA — chega no M12.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Card de contato (avatar centralizado, canais) + accordions. */
function ContactPanel({
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
  const contact = conversation.contact;
  const [editing, setEditing] = useState(false);

  if (!contact) return <p className="text-sm text-woot-slate-11">Sem contato.</p>;

  return (
    <div className="flex flex-col gap-2">
      {/* Card do contato */}
      <div className="flex flex-col items-center gap-1.5 py-3 text-center">
        <WootAvatar name={contact.name || "?"} className="size-12" />
        <p className="text-base font-medium text-woot-slate-12">{contact.name || "(sem nome)"}</p>
        {contact.email && <ContactRow icon={<Mail className="size-3.5" />} value={contact.email} />}
        {contact.phone_number && (
          <ContactRow icon={<Phone className="size-3.5" />} value={contact.phone_number} />
        )}
      </div>

      {/* Ações rápidas */}
      <div className="flex items-center justify-center gap-2">
        <IconAction
          title="Enviar mensagem (foco na caixa de resposta)"
          onClick={() => {
            const el = document.querySelector<HTMLTextAreaElement>("footer textarea");
            el?.focus();
          }}
        >
          <MessageSquare className="size-4" />
        </IconAction>
        <IconAction title="Editar contato" active={editing} onClick={() => setEditing((v) => !v)}>
          <Pencil className="size-4" />
        </IconAction>
      </div>

      {editing && (
        <ContactForm
          accountId={accountId}
          conversation={conversation}
          onSaved={(fresh) => {
            onChanged(fresh);
            setEditing(false);
          }}
        />
      )}

      {/* Accordions */}
      <Accordion title="Ações da conversa" defaultOpen>
        <ConversationActions
          accountId={accountId}
          conversation={conversation}
          agents={agents}
          labels={labels}
          onChanged={onChanged}
        />
      </Accordion>
      <Accordion title="Participantes">
        <ParticipantsEditor
          accountId={accountId}
          conversation={conversation}
          onChanged={onChanged}
        />
      </Accordion>
      <Accordion title="Macros">
        <MacrosList accountId={accountId} conversation={conversation} onRan={onChanged} />
      </Accordion>
      <Accordion title="Atributos do contato">
        {Object.keys(contact.custom_attributes).length === 0 ? (
          <p className="text-xs text-woot-slate-11">Nenhum atributo.</p>
        ) : (
          <dl className="grid gap-1 text-xs">
            {Object.entries(contact.custom_attributes).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="text-woot-slate-11">{key}</dt>
                <dd className="truncate">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Accordion>
      <Accordion title="Conversas anteriores">
        <PreviousConversations accountId={accountId} conversation={conversation} />
      </Accordion>
    </div>
  );
}

function ContactRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-sm text-woot-slate-11 hover:bg-muted">
      <span className="flex-shrink-0">{icon}</span>
      <span className="min-w-0 truncate">{value}</span>
      <button
        type="button"
        title="Copiar"
        className="ml-auto flex-shrink-0 text-woot-slate-11 hover:text-woot-slate-12"
        onClick={() => void navigator.clipboard.writeText(value).catch(() => {})}
      >
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}

function IconAction({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "grid size-9 place-content-center rounded-lg border transition-colors hover:bg-muted",
        active ? "border-woot-blue text-woot-blue" : "border-border text-woot-slate-11",
      )}
    >
      {children}
    </button>
  );
}

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-woot-slate-12 hover:bg-muted/60"
      >
        {title}
        <Plus
          className={cn(
            "ml-auto size-4 text-woot-slate-11 transition-transform",
            open && "rotate-45",
          )}
        />
      </button>
      {open && <div className="border-t border-border px-3 py-2.5 text-sm">{children}</div>}
    </div>
  );
}

function ConversationActions({
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
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listTeams(accountId)
      .then(setTeams)
      .catch(() => {});
  }, [accountId]);

  async function run(fn: () => Promise<ConversationDetail>): Promise<void> {
    setError(null);
    try {
      onChanged(await fn());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-woot-slate-12">Agente responsável</span>
        <WootSelectMenu
          value={String(conversation.assignee_id ?? 0)}
          options={[
            { value: "0", label: "Ninguém" },
            ...agents.map((agent) => ({ value: String(agent.id), label: agent.name })),
          ]}
          onChange={(v) =>
            void run(() => assignConversation(accountId, conversation.id, Number(v)))
          }
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-woot-slate-12">Time</span>
        <WootSelectMenu
          value={String(conversation.team_id ?? 0)}
          options={[
            { value: "0", label: "Sem time" },
            ...teams.map((t) => ({ value: String(t.id), label: t.name })),
          ]}
          onChange={(v) =>
            void run(async () => {
              await setConversationTeam(accountId, conversation.id, Number(v) || null);
              return fetchFresh(accountId, conversation.id);
            })
          }
        />
      </div>
      <div className="grid gap-1">
        <label htmlFor="a-priority" className="text-xs text-woot-slate-11">
          Prioridade
        </label>
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
        <span className="text-xs text-woot-slate-11">Etiquetas</span>
        <div className="flex flex-wrap gap-1.5">
          {labels.map((label) => {
            const active = conversation.labels.includes(label.title);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() =>
                  void run(async () => {
                    await setLabels(
                      accountId,
                      conversation.id,
                      active
                        ? conversation.labels.filter((t) => t !== label.title)
                        : [...conversation.labels, label.title],
                    );
                    return fetchFresh(accountId, conversation.id);
                  })
                }
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                  active
                    ? "border-transparent font-medium text-white"
                    : "border-border text-woot-slate-11 hover:text-woot-slate-12",
                )}
                style={active ? { backgroundColor: label.color } : undefined}
              >
                {!active && (
                  <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                )}
                {label.title}
              </button>
            );
          })}
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

async function fetchFresh(accountId: number, conversationId: number): Promise<ConversationDetail> {
  const { getConversation } = await import("@/lib/conversations");
  return getConversation(accountId, conversationId);
}

function ContactForm({
  accountId,
  conversation,
  onSaved,
}: {
  accountId: number;
  conversation: ConversationDetail;
  onSaved: (c: ConversationDetail) => void;
}) {
  const contact = conversation.contact!;
  const form = useForm({
    values: {
      name: contact.name ?? "",
      email: contact.email ?? "",
      phone_number: contact.phone_number ?? "",
    },
  });
  return (
    <form
      onSubmit={form.handleSubmit(async (values) => {
        const fresh = await apiFetch<{ contact: ConversationDetail["contact"] }>(
          `/api/v1/accounts/${accountId}/contacts/${contact.id}`,
          { method: "PATCH", body: JSON.stringify(values) },
        );
        onSaved({ ...conversation, contact: fresh.contact });
      })}
      className="grid gap-2 rounded-lg border border-border p-3"
    >
      <div className="grid gap-1">
        <label htmlFor="d-name" className="text-xs text-woot-slate-11">
          Nome
        </label>
        <Input id="d-name" {...form.register("name")} className="h-8 text-sm" />
      </div>
      <div className="grid gap-1">
        <label htmlFor="d-email" className="text-xs text-woot-slate-11">
          E-mail
        </label>
        <Input id="d-email" {...form.register("email")} className="h-8 text-sm" />
      </div>
      <div className="grid gap-1">
        <label htmlFor="d-phone" className="text-xs text-woot-slate-11">
          Telefone
        </label>
        <Input id="d-phone" {...form.register("phone_number")} className="h-8 text-sm" />
      </div>
      <Button type="submit" size="sm" className="w-fit" disabled={form.formState.isSubmitting}>
        Salvar
      </Button>
    </form>
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
  // M11: quem está online (pontinho verde) — snapshot + `presence.update`.
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void getPresence(accountId)
      .then((list) => {
        if (!cancelled) setOnlineIds(new Set(list.map((p) => p.user_id)));
      })
      .catch(() => {});
    return subscribeCableEvents((event) => {
      if (event.event !== "presence.update") return;
      const data = event.data as { user_id?: number; status?: string };
      if (typeof data.user_id !== "number") return;
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (data.status === "offline") next.delete(data.user_id as number);
        else next.add(data.user_id as number);
        return next;
      });
    });
  }, [accountId]);

  useEffect(() => {
    if (adding && agents === null) {
      void apiFetch<{ agents: Array<{ id: number; name: string }> }>(
        `/api/v1/accounts/${accountId}/agents`,
      ).then((d) => setAgents(d.agents));
    }
  }, [adding, agents, accountId]);

  async function add(userId: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${accountId}/conversations/${conversation.id}/participants`, {
      method: "POST",
      body: JSON.stringify({ user_ids: [userId] }),
    });
    onChanged(await fetchFresh(accountId, conversation.id));
    setAdding(false);
  }

  async function remove(userId: number): Promise<void> {
    await apiFetch(
      `/api/v1/accounts/${accountId}/conversations/${conversation.id}/participants/${userId}`,
      { method: "DELETE" },
    );
    onChanged(await fetchFresh(accountId, conversation.id));
  }

  return (
    <div className="grid gap-2">
      {conversation.participants.length === 0 && (
        <p className="text-xs text-woot-slate-11">Nenhum participante.</p>
      )}
      <ul className="flex flex-col gap-1">
        {conversation.participants.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-xs">
            <span className="relative shrink-0">
              <WootAvatar name={p.name} size="sm" />
              {onlineIds.has(p.id) && (
                <span
                  title="Online agora"
                  className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background bg-green-500"
                />
              )}
            </span>
            <span className="flex-1 truncate">{p.name}</span>
            <button
              type="button"
              title="Remover participante"
              onClick={() => void remove(p.id)}
              className="text-woot-slate-11 hover:text-destructive"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-woot-blue hover:underline"
        >
          <UserPlus className="size-3.5" />
          Adicionar participante
        </button>
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

function MacrosList({
  accountId,
  conversation,
  onRan,
}: {
  accountId: number;
  conversation: ConversationDetail;
  onRan: (c: ConversationDetail) => void;
}) {
  const [macros, setMacros] = useState<Macro[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    void listMacros(accountId)
      .then(setMacros)
      .catch(() => {});
  }, [accountId]);

  if (macros === null) return <p className="text-xs text-woot-slate-11">Carregando...</p>;
  if (macros.length === 0)
    return <p className="text-xs text-woot-slate-11">Nenhuma macro criada.</p>;

  return (
    <ul className="flex flex-col gap-1">
      {macros.map((macro) => (
        <li key={macro.id}>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            disabled={busy === macro.id}
            onClick={() => {
              setBusy(macro.id);
              void executeMacro(accountId, macro.id, conversation.id)
                .then(() => fetchFresh(accountId, conversation.id))
                .then(onRan)
                .catch(() => {})
                .finally(() => setBusy(null));
            }}
          >
            {macro.name}
          </Button>
        </li>
      ))}
    </ul>
  );
}

function PreviousConversations({
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

  if (!contactId) return <p className="text-xs text-woot-slate-11">Sem contato.</p>;
  if (items === null) return <p className="text-xs text-woot-slate-11">Carregando...</p>;
  if (items.length === 0)
    return <p className="text-xs text-woot-slate-11">Nenhuma conversa anterior.</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-border px-2.5 py-2 text-sm">
          <p className="font-medium">#{item.display_id}</p>
          <p className="text-xs text-woot-slate-11">
            {item.status} · {new Date(item.last_activity_at * 1000).toLocaleDateString("pt-BR")}
          </p>
        </li>
      ))}
    </ul>
  );
}
