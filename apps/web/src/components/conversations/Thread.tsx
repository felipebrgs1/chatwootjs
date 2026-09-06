import { FileText, Trash2 } from "lucide-react";
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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-woot-bg px-4 py-3">
      {messages === null && (
        <p className="py-8 text-center text-sm text-muted-foreground">Carregando mensagens...</p>
      )}
      {(messages ?? []).map((message) => {
        if (message.message_type === "activity") {
          return (
            <p
              key={message.id}
              className="mx-auto my-1.5 max-w-md rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground"
            >
              {message.content}
            </p>
          );
        }
        if (message.private) {
          return <PrivateNote key={message.id} message={message} onDelete={onDelete} />;
        }
        const incoming = message.message_type === "incoming";
        return (
          <div
            key={message.id}
            className={cn("my-1 flex max-w-[75%]", incoming ? "self-start" : "self-end")}
          >
            {incoming && (
              <WootAvatar
                name={message.sender?.name ?? conversation.meta.sender.name}
                size="sm"
                className="mr-2 mt-0.5 flex-shrink-0"
              />
            )}
            <div
              className={cn(
                "min-w-0 rounded-xl px-3 py-2 text-sm shadow-sm",
                incoming
                  ? "rounded-tl-sm bg-white text-foreground"
                  : "rounded-tr-sm bg-woot-blue text-white",
              )}
            >
              {message.content_attributes?.in_reply_to ? (
                <ReplyQuote
                  messageId={Number(message.content_attributes.in_reply_to)}
                  messages={messages ?? []}
                  incoming={incoming}
                />
              ) : null}
              {message.content && (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              )}
              {message.attachments.map((att) => (
                <AttachmentView key={att.id} attachment={att} incoming={incoming} />
              ))}
              <p
                className={cn(
                  "mt-1 text-right text-[10px]",
                  incoming ? "text-muted-foreground" : "text-white/80",
                )}
              >
                {message.sender?.name ? `${message.sender.name} · ` : ""}
                {formatTime(message.created_at)}
              </p>
            </div>
          </div>
        );
      })}
      {typing && (
        <div className="my-1 flex max-w-[75%] self-start">
          <div className="rounded-xl rounded-tl-sm bg-white px-3 py-2 text-sm shadow-sm">
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
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

function PrivateNote({ message, onDelete }: { message: Message; onDelete: (id: number) => void }) {
  return (
    <div className="my-1.5 self-stretch rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900 dark:bg-amber-950">
      <p className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
        Nota privada · {message.sender?.name ?? ""}
        <button
          type="button"
          aria-label="Apagar nota"
          className="ml-auto text-amber-600 hover:text-amber-800"
          onClick={() => onDelete(message.id)}
        >
          <Trash2 className="size-3.5" />
        </button>
      </p>
      <p className="whitespace-pre-wrap break-words">{message.content}</p>
      <p className="mt-1 text-right text-[10px] text-amber-700/70">
        {formatTime(message.created_at)}
      </p>
    </div>
  );
}

function ReplyQuote({
  messageId,
  messages,
  incoming,
}: {
  messageId: number;
  messages: Message[];
  incoming: boolean;
}) {
  const quoted = messages.find((m) => m.id === messageId);
  if (!quoted?.content) return null;
  return (
    <blockquote
      className={cn(
        "mb-1.5 truncate border-l-2 pl-2 text-xs",
        incoming ? "border-woot-blue text-muted-foreground" : "border-white/60 text-white/85",
      )}
    >
      {quoted.content}
    </blockquote>
  );
}

export function AttachmentView({
  attachment,
  incoming,
}: {
  attachment: Message["attachments"][number];
  incoming: boolean;
}) {
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
      className={cn(
        "mt-1.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs",
        incoming ? "bg-muted text-foreground" : "bg-white/20 text-white",
      )}
    >
      <FileText className="size-4 flex-shrink-0" />
      <span className="truncate">{title}</span>
    </a>
  );
}
