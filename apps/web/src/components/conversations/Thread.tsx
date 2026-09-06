import { Check, CheckCheck, FileText, Lock } from "lucide-react";
import { useEffect, useRef } from "react";

import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import type { ConversationDetail, Message } from "@/lib/conversations";

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";

function attachmentUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${SERVER_URL}${url}`;
}

function formatTime(epoch: number): string {
  return new Date(epoch * 1000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Thread estilo Chatwoot v4: bolhas cinza (recebida) e azul (enviada),
 * pills de atividade centradas e notas privadas âmbar. */
export function Thread({
  conversation,
  messages,
  typing,
  onDelete,
}: {
  conversation: ConversationDetail;
  messages: Message[] | null;
  typing: boolean;
  onDelete: (messageId: number) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages?.length]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background px-3 py-4">
      {messages === null && (
        <p className="py-8 text-center text-sm text-woot-slate-11">Carregando mensagens...</p>
      )}
      {(messages ?? []).map((message, index) => {
        if (message.message_type === "activity" || message.message_type === "template") {
          return (
            <div key={message.id} className="flex justify-center">
              <p
                title={message.content ?? ""}
                className="my-1 max-w-md rounded-lg bg-woot-activity px-3 py-1.5 text-center text-sm text-woot-slate-11"
              >
                {message.content}
              </p>
            </div>
          );
        }
        const incoming = message.message_type === "incoming";
        const previous = (messages ?? [])[index - 1];
        const groupStart =
          !previous ||
          previous.message_type === "activity" ||
          previous.message_type === "template" ||
          previous.message_type !== message.message_type ||
          previous.private !== message.private;
        if (message.private) {
          return <PrivateNote key={message.id} message={message} onDelete={onDelete} />;
        }
        return (
          <MessageBubble
            key={message.id}
            message={message}
            conversation={conversation}
            incoming={incoming}
            groupStart={groupStart}
            messages={messages ?? []}
          />
        );
      })}
      {typing && (
        <div className="flex justify-start">
          <div className="mt-2 rounded-xl rounded-bl-sm bg-woot-bubble-in px-3 py-2.5">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-woot-slate-11"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({
  message,
  conversation,
  incoming,
  groupStart,
  messages,
}: {
  message: Message;
  conversation: ConversationDetail;
  incoming: boolean;
  groupStart: boolean;
  messages: Message[];
}) {
  return (
    <div className={cn("flex min-w-0 items-end gap-2", incoming ? "justify-start" : "justify-end")}>
      {incoming && (
        <span className={cn("flex-shrink-0", !groupStart && "invisible")}>
          <WootAvatar name={message.sender?.name ?? conversation.meta.sender.name} size="sm" />
        </span>
      )}
      <div
        className={cn("flex min-w-0 max-w-[75%] flex-col", incoming ? "items-start" : "items-end")}
      >
        <div
          className={cn(
            "min-w-0",
            incoming
              ? "rounded-xl rounded-bl-sm bg-woot-bubble-in px-3 py-2"
              : "rounded-xl rounded-br-sm bg-woot-bubble-out px-3 py-2",
          )}
        >
          {message.content_attributes?.in_reply_to ? (
            <ReplyQuote
              messageId={Number(message.content_attributes.in_reply_to)}
              messages={messages}
            />
          ) : null}
          {message.content && (
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-woot-slate-12">
              {message.content}
            </p>
          )}
          {message.attachments.map((att) => (
            <AttachmentView key={att.id} attachment={att} />
          ))}
        </div>
        <p className="mt-1 flex items-center gap-1 px-1 text-xxs text-woot-slate-11">
          {message.status === "failed" && <span className="text-red-600">Falhou</span>}
          {message.status === "sent" && !incoming && <Check className="size-3" />}
          {message.status === "delivered" && !incoming && <CheckCheck className="size-3" />}
          {message.status === "read" && !incoming && (
            <CheckCheck className="size-3 text-woot-blue" />
          )}
          <span>{formatTime(message.created_at)}</span>
        </p>
      </div>
    </div>
  );
}

function PrivateNote({ message, onDelete }: { message: Message; onDelete: (id: number) => void }) {
  return (
    <div className="flex justify-end">
      <div className="my-1.5 max-w-[75%] rounded-xl rounded-br-sm border border-amber-300/60 bg-woot-note px-3 py-2">
        <p className="mb-0.5 flex items-center gap-1 text-xxs font-medium uppercase tracking-wide text-amber-800">
          <Lock className="size-3" />
          {message.sender?.name ?? "Nota privada"}
          <button
            type="button"
            aria-label="Apagar nota"
            className="ml-auto text-amber-700 hover:text-amber-900"
            onClick={() => onDelete(message.id)}
          >
            ×
          </button>
        </p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-woot-slate-12">
          {message.content}
        </p>
        <p className="mt-1 flex items-center justify-end gap-1 text-xxs text-amber-800/70">
          <Lock className="size-3" />
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

function ReplyQuote({ messageId, messages }: { messageId: number; messages: Message[] }) {
  const quoted = messages.find((m) => m.id === messageId);
  if (!quoted?.content) return null;
  return (
    <blockquote className="mb-1.5 truncate border-l-2 border-woot-blue pl-2 text-xs text-woot-slate-11">
      {quoted.content}
    </blockquote>
  );
}

export function AttachmentView({ attachment }: { attachment: Message["attachments"][number] }) {
  const url = attachmentUrl(attachment.external_url);
  if (!url) return null;
  const title = attachment.fallback_title ?? "anexo";
  if (attachment.file_type === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="mt-1.5 block">
        <img src={url} alt={title} className="max-h-64 rounded-lg object-cover" loading="lazy" />
      </a>
    );
  }
  if (attachment.file_type === "audio") {
    return <audio src={url} controls className="mt-1.5 w-64 max-w-full" preload="none" />;
  }
  if (attachment.file_type === "video") {
    return <video src={url} controls className="mt-1.5 max-h-64 rounded-lg" preload="none" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mt-1.5 flex items-center gap-2 rounded-lg bg-white/60 px-2 py-1.5 text-xs text-woot-slate-12"
    >
      <FileText className="size-4 flex-shrink-0" />
      <span className="truncate">{title}</span>
    </a>
  );
}
