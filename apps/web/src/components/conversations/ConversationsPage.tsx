import { useCallback, useEffect, useRef, useState } from "react";

import { EmptyState } from "@chatwootjs/ui/components/empty-state";

import { useCable, type CableEvent } from "@/hooks/useCable";
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
import { ConversationList, type StatusChip } from "./ConversationList";
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
  filters: { status: StatusChip; assignee: AssigneeType; query: string; inboxId?: number };
  onFilters: (filters: {
    status: StatusChip;
    assignee: AssigneeType;
    query: string;
    inboxId?: number;
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
  const eventSeq = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadList = useCallback(async () => {
    if (!accountId) return;
    try {
      const data = await listConversations(accountId, {
        status: filters.status,
        assignee_type: filters.assignee,
        q: filters.query || undefined,
        inbox_id: filters.inboxId,
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
  }, [accountId, filters.status, filters.assignee, filters.query, filters.inboxId]);

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
        query={filters.query}
        onStatus={(status) => onFilters({ ...filters, status })}
        onAssignee={(assignee) => onFilters({ ...filters, assignee })}
        onQuery={(query) => onFilters({ ...filters, query })}
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
          conversation={conversation}
          onStatus={(status) =>
            void toggleStatus(accountId, conversation.id, status)
              .then(setConversation)
              .then(() => onListChanged())
          }
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
