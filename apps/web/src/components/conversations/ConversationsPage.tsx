import { useCallback, useEffect, useRef, useState } from "react";

import { EmptyState } from "@chatwootjs/ui/components/empty-state";

import { sendPresence, useCable, type CableEvent } from "@/hooks/useCable";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useSessionContext } from "@/components/session-provider";
import { ApiError } from "@/lib/auth";
import {
  deleteMessage,
  getConversation,
  listConversations,
  listMessages,
  markRead,
  muteConversation,
  toggleStatus,
  uploadFile,
  type AssigneeType,
  type ConversationDetail,
  type ConversationItem,
  type Message,
} from "@/lib/conversations";
import { ConversationHeader } from "./ConversationHeader";
import { ConversationList, type SortChip, type StatusChip } from "./ConversationList";
import {
  createCustomFilter,
  deleteCustomFilter,
  listCustomFilters,
  type CustomFilter,
} from "@/lib/notifications";
import { DetailsPanel } from "./DetailsPanel";
import { ReplyBox } from "./ReplyBox";
import { Thread } from "./Thread";

/**
 * Página Conversas: lista (320px) + thread (flex) + detalhes (280px).
 * Filtros vivem na query string (?status=, ?assignee=, ?q=...).
 */
export function ConversationsPage({
  selectedId,
  filters,
  onFilters,
}: {
  selectedId: number | null;
  filters: {
    status: StatusChip;
    assignee: AssigneeType;
    query: string;
    inboxId?: number;
    labels?: string[];
    sort?: SortChip;
  };
  onFilters: (filters: {
    status: StatusChip;
    assignee: AssigneeType;
    query: string;
    inboxId?: number;
    labels?: string[];
    sort?: SortChip;
  }) => void;
}) {
  const { session } = useSessionContext();
  const accountId = session?.accountId ?? null;
  const [items, setItems] = useState<ConversationItem[] | null>(null);
  const [counts, setCounts] = useState({ mine: 0, unassigned: 0, all: 0 });
  const [agents, setAgents] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [labels, setLabels] = useState<Array<{ id: number; title: string; color: string }>>([]);
  const [typingConv, setTypingConv] = useState<number | null>(null);
  const [lastEvent, setLastEvent] = useState<{ n: number; event: CableEvent } | null>(null);
  const [views, setViews] = useState<CustomFilter[]>([]);
  const [activeViewId, setActiveViewId] = useState<number | null>(null);
  const eventSeq = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // M11: heartbeat de presença (30s) — o servidor publica `presence.update`.
  useEffect(() => {
    if (!accountId) return;
    const status = session?.user.availability ?? "online";
    sendPresence(accountId, status);
    const timer = setInterval(() => sendPresence(accountId, status), 30_000);
    return () => {
      clearInterval(timer);
      sendPresence(accountId, "offline");
    };
  }, [accountId, session?.user.availability]);

  // M11: views salvas (custom_filters).
  const reloadViews = useCallback(async () => {
    if (!accountId) return;
    try {
      setViews(await listCustomFilters(accountId));
    } catch {
      /* sem sessão */
    }
  }, [accountId]);

  useEffect(() => {
    let cancelled = false;
    if (!accountId) return;
    void listCustomFilters(accountId)
      .then((list) => {
        if (!cancelled) setViews(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  function currentViewQuery(): Record<string, unknown> {
    return {
      status: filters.status,
      assignee: filters.assignee,
      q: filters.query || undefined,
      inbox_id: filters.inboxId,
      labels: filters.labels?.length ? filters.labels : undefined,
      sort_by: filters.sort,
    };
  }

  function applyView(view: CustomFilter): void {
    setActiveViewId(view.id);
    const q = view.query;
    onFilters({
      status: (typeof q.status === "string" ? q.status : "open") as StatusChip,
      assignee: (typeof q.assignee === "string" ? q.assignee : "me") as AssigneeType,
      query: typeof q.q === "string" ? q.q : "",
      inboxId: typeof q.inbox_id === "number" ? q.inbox_id : undefined,
      labels: Array.isArray(q.labels) ? (q.labels as string[]) : undefined,
      sort: (typeof q.sort_by === "string" ? q.sort_by : undefined) as SortChip | undefined,
    });
  }

  async function saveView(name: string): Promise<void> {
    if (!accountId) return;
    const created = await createCustomFilter(accountId, {
      name,
      query: currentViewQuery(),
    });
    setActiveViewId(created.id);
    await reloadViews();
  }

  async function removeView(id: number): Promise<void> {
    if (!accountId) return;
    await deleteCustomFilter(accountId, id);
    if (activeViewId === id) setActiveViewId(null);
    await reloadViews();
  }

  const loadList = useCallback(async () => {
    if (!accountId) return;
    try {
      const data = await listConversations(accountId, {
        status: filters.status,
        assignee_type: filters.assignee,
        q: filters.query || undefined,
        inbox_id: filters.inboxId,
        labels: filters.labels,
        sort_by: filters.sort,
      });
      setItems(data.conversations);
      setCounts({
        mine: data.meta.mine_count,
        unassigned: data.meta.unassigned_count,
        all: data.meta.all_count,
      });
    } catch {
      // sessão expirada etc. — o provider trata
    }
  }, [
    accountId,
    filters.status,
    filters.assignee,
    filters.query,
    filters.inboxId,
    filters.labels,
    filters.sort,
  ]);

  // lista inicial + quando filtros mudam (debounce na busca)
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void loadList(), filters.query ? 300 : 0);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [loadList, filters.query]);

  // agentes + labels (para o painel de ações)
  useEffect(() => {
    if (!accountId) return;
    void import("@/lib/auth").then(async ({ apiFetch }) => {
      const [a, l] = await Promise.all([
        apiFetch<{ agents: Array<{ id: number; name: string; email: string }> }>(
          `/api/v1/accounts/${accountId}/agents`,
        ),
        apiFetch<{ labels: Array<{ id: number; title: string; color: string }> }>(
          `/api/v1/accounts/${accountId}/labels`,
        ),
      ]);
      setAgents(a.agents);
      setLabels(l.labels);
    });
  }, [accountId]);

  const onCable = useCallback(
    (event: CableEvent) => {
      if (
        event.event === "message.created" ||
        event.event === "conversation.updated" ||
        event.event === "conversation.created"
      ) {
        void loadList();
        eventSeq.current += 1;
        setLastEvent({ n: eventSeq.current, event });
      } else if (event.event === "typing.on" || event.event === "typing.off") {
        const convId = event.data.conversation_id as number | undefined;
        setTypingConv(event.event === "typing.on" ? (convId ?? null) : null);
      }
    },
    [loadList],
  );

  useCable(accountId, onCable);

  if (!session) return null;

  return (
    <div className="flex min-w-0 flex-1">
      <ConversationList
        items={items}
        selectedId={selectedId}
        status={filters.status}
        assignee={filters.assignee}
        mineCount={counts.mine}
        unassignedCount={counts.unassigned}
        allCount={counts.all}
        sort={filters.sort ?? "latest"}
        hasFilters={Boolean(filters.inboxId || filters.labels?.length || filters.query)}
        onStatus={(status) => {
          setActiveViewId(null);
          onFilters({ ...filters, status });
        }}
        onAssignee={(assignee) => {
          setActiveViewId(null);
          onFilters({ ...filters, assignee });
        }}
        onSort={(sort) => {
          setActiveViewId(null);
          onFilters({ ...filters, sort });
        }}
        onClearFilters={() => {
          setActiveViewId(null);
          onFilters({ status: filters.status, assignee: filters.assignee, query: "" });
        }}
        accountLabels={labels}
        views={views}
        activeViewId={activeViewId}
        onSelectView={(id) => {
          const view = views.find((v) => v.id === id);
          if (view) applyView(view);
          else setActiveViewId(null);
        }}
        onSaveView={(name) => void saveView(name)}
        onDeleteView={(id) => void removeView(id)}
        headerActions={accountId ? <NotificationBell accountId={accountId} /> : undefined}
      />
      {selectedId === null ? (
        <div className="flex flex-1 items-center justify-center bg-woot-bg">
          <EmptyState
            title="Selecione uma conversa"
            description="Escolha uma conversa na lista para ver as mensagens."
          />
        </div>
      ) : (
        <ConversationDetailView
          key={selectedId}
          accountId={accountId!}
          conversationId={selectedId}
          typing={typingConv === selectedId}
          agents={agents}
          labels={labels}
          lastEvent={lastEvent}
          onListChanged={() => void loadList()}
        />
      )}
    </div>
  );
}

export { ApiError };

/** Detalhe da conversa: carrega tudo no mount (key=conversationId). */
function ConversationDetailView({
  accountId,
  conversationId,
  typing,
  agents,
  labels,
  lastEvent,
  onListChanged,
}: {
  accountId: number;
  conversationId: number;
  typing: boolean;
  agents: Array<{ id: number; name: string; email: string }>;
  labels: Array<{ id: number; title: string; color: string }>;
  lastEvent: { n: number; event: CableEvent } | null;
  onListChanged: () => void;
}) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getConversation(accountId, conversationId)
      .then((detail) => {
        if (cancelled) return;
        setConversation(detail);
        void markRead(accountId, conversationId).catch(() => {});
        onListChanged();
      })
      .catch(() => {});
    void listMessages(accountId, conversationId)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, conversationId]);

  // Live update via WS (< 1s entre abas): troca otimista pelo real ou adiciona.
  // O contador `n` identifica o evento; `lastEvent` só muda por referência nova.
  const seenEvent = useRef(0);
  const lastEventN = lastEvent?.n ?? 0;
  const lastEventPayload = lastEvent?.event ?? null;
  useEffect(() => {
    if (!lastEventPayload || lastEventN === seenEvent.current) return;
    seenEvent.current = lastEventN;
    const event = lastEventPayload;
    const convId =
      (event.data.conversation_id as number | undefined) ?? (event.data.id as number | undefined);
    if (convId !== conversationId) return;
    if (event.event === "message.created") {
      const incoming = event.data as unknown as Message;
      const echoId =
        (event.data.echo_id as number | undefined) ?? (incoming as { echo_id?: number }).echo_id;
      setMessages((prev) => {
        if (!prev) return prev;
        if (echoId) {
          const idx = prev.findIndex((m) => m.id === -Number(echoId));
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = incoming;
            return next;
          }
        }
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    } else if (event.event === "conversation.updated") {
      void getConversation(accountId, conversationId)
        .then(setConversation)
        .catch(() => {});
    }
  }, [lastEventN, lastEventPayload, accountId, conversationId]);

  function replaceOptimistic(echoId: number, message: Message): void {
    setMessages((prev) => {
      if (!prev) return prev;
      const idx = prev.findIndex((m) => m.id === -echoId);
      if (idx < 0) return [...prev, message];
      const next = [...prev];
      next[idx] = message;
      return next;
    });
  }

  if (!conversation) {
    return (
      <div className="flex flex-1 items-center justify-center bg-woot-bg">
        <p className="text-sm text-muted-foreground">Carregando conversa...</p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1">
      <section aria-label="Conversa" className="flex min-w-0 flex-1 flex-col">
        <ConversationHeader
          accountId={accountId}
          conversation={conversation}
          onStatus={(status) =>
            void toggleStatus(accountId, conversation.id, status)
              .then(setConversation)
              .then(() => onListChanged())
          }
          onMacro={() => {
            // macro roda via job: atualiza já + de novo em 2s (cobre o BullMQ)
            void getConversation(accountId, conversation.id)
              .then(setConversation)
              .catch(() => {});
            setTimeout(() => {
              void getConversation(accountId, conversation.id)
                .then((detail) => {
                  setConversation(detail);
                  onListChanged();
                })
                .catch(() => {});
            }, 2000);
          }}
          onSnooze={(until) =>
            void toggleStatus(accountId, conversation.id, "snoozed", until)
              .then(setConversation)
              .then(() => onListChanged())
          }
          onMute={() =>
            void muteConversation(accountId, conversation.id, !conversation.muted).then(() =>
              setConversation({ ...conversation, muted: !conversation.muted }),
            )
          }
        />
        <Thread
          conversation={conversation}
          messages={messages}
          typing={typing}
          onDelete={(messageId) =>
            void deleteMessage(accountId, conversation.id, messageId).then(() =>
              setMessages((prev) => prev?.filter((m) => m.id !== messageId) ?? null),
            )
          }
        />
        <ReplyBox
          accountId={accountId}
          conversationId={conversation.id}
          onOptimistic={(message) => setMessages((prev) => (prev ? [...prev, message] : [message]))}
          onSent={(echoId, message) => replaceOptimistic(echoId, message)}
          onFailed={(echoId) =>
            setMessages((prev) => prev?.filter((m) => m.id !== -echoId) ?? null)
          }
          onUpload={async (file, options) => {
            const message = await uploadFile(accountId, conversation.id, file, options);
            setMessages((prev) => (prev ? [...prev, message] : [message]));
            return message;
          }}
        />
      </section>
      <DetailsPanel
        accountId={accountId}
        conversation={conversation}
        agents={agents}
        labels={labels}
        onChanged={(detail) => {
          setConversation(detail);
          onListChanged();
        }}
      />
    </div>
  );
}
