import { ImagePlus, Mic, SendHorizontal, Square, StickyNote } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@chatwootjs/ui/components/button";
import { cn } from "@chatwootjs/ui/lib/utils";

import { ApiError } from "@/lib/auth";
import { sendTyping } from "@/hooks/useCable";
import type { Message } from "@/lib/conversations";

const QUICK_EMOJI = ["😀", "👍", "❤️", "🙏", "😅", "🎉"] as const;

/**
 * ReplyBox: tabs Responder/Nota privada, envio otimista, anexos, ditado de
 * áudio (MediaRecorder → upload) e indicador de digitação.
 */
export function ReplyBox({
  accountId,
  conversationId,
  onOptimistic,
  onSent,
  onFailed,
  onUpload,
}: {
  accountId: number;
  conversationId: number;
  onOptimistic: (message: Message) => void;
  onSent: (echoId: number, message: Message) => void;
  onFailed: (echoId: number) => void;
  onUpload: (file: File, options?: { private?: boolean }) => Promise<Message>;
}) {
  const [tab, setTab] = useState<"reply" | "private">("reply");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const echoRef = useRef(0);

  // digitação: liga ao teclar, desliga após 3s parado
  function handleTyping(): void {
    sendTyping(accountId, conversationId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(accountId, conversationId, false), 3000);
  }

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      sendTyping(accountId, conversationId, false);
    };
  }, [accountId, conversationId]);

  async function send(): Promise<void> {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    const echoId = ++echoRef.current + Date.now();
    const optimistic: Message = {
      id: -echoId,
      content,
      message_type: "outgoing",
      private: tab === "private",
      content_type: "text",
      content_attributes: {},
      status: "sent",
      sender: { id: null, name: "Você", type: "User" },
      attachments: [],
      created_at: Math.floor(Date.now() / 1000),
    };
    onOptimistic(optimistic);
    setText("");
    try {
      const { sendMessage } = await import("@/lib/conversations");
      const message = await sendMessage(accountId, conversationId, {
        content,
        private: tab === "private",
        echo_id: echoId,
      });
      onSent(echoId, message);
    } catch (err) {
      onFailed(echoId);
      setError(err instanceof ApiError ? err.message : "Falha ao enviar");
    } finally {
      setSending(false);
    }
  }

  async function attach(file: File): Promise<void> {
    setError(null);
    try {
      await onUpload(file, { private: tab === "private" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha no upload");
    }
  }

  async function toggleRecording(): Promise<void> {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: blob.type });
        void attach(file);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Microfone indisponível");
    }
  }

  return (
    <footer className="flex-shrink-0 border-t border-border bg-background px-3 pb-3 pt-2">
      <div className="mb-2 flex gap-1">
        {(
          [
            { value: "reply", label: "Responder" },
            { value: "private", label: "Nota privada" },
          ] as const
        ).map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
              tab === t.value
                ? t.value === "private"
                  ? "bg-amber-100 font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  : "bg-woot-nav-active-bg font-medium text-woot-blue"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {t.value === "private" && <StickyNote className="size-3.5" />}
            {t.label}
          </button>
        ))}
        <span className="ml-auto hidden self-center text-[11px] text-muted-foreground sm:block">
          {/* // respostas prontas chegam no M6 · Enter envia */}
        </span>
      </div>
      <div
        className={cn(
          "rounded-xl border border-input bg-background focus-within:border-woot-blue",
          tab === "private" && "border-amber-300 bg-amber-50/50 dark:border-amber-800",
        )}
      >
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            handleTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder={tab === "private" ? "Nota visível só para a equipe..." : "Responder..."}
          className="w-full resize-none bg-transparent px-3 pt-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-0.5 px-2 pb-1.5">
          <button
            type="button"
            title="Anexar"
            onClick={() => fileRef.current?.click()}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ImagePlus className="size-4" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void attach(file);
              e.target.value = "";
            }}
          />
          <div className="relative">
            <button
              type="button"
              title="Emoji"
              onClick={() => setShowEmoji((v) => !v)}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              😀
            </button>
            {showEmoji && (
              <div className="absolute bottom-9 left-0 z-10 flex gap-1 rounded-lg border bg-background p-1.5 shadow-lg">
                {QUICK_EMOJI.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setText((t) => t + emoji);
                      setShowEmoji(false);
                    }}
                    className="rounded p-1 text-lg hover:bg-muted"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            title={recording ? "Parar gravação" : "Gravar áudio"}
            onClick={() => void toggleRecording()}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg hover:bg-muted",
              recording ? "text-red-600" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
          </button>
          {recording && <span className="text-xs text-red-600">gravando...</span>}
          <Button
            size="sm"
            onClick={() => void send()}
            disabled={!text.trim() || sending}
            className="ml-auto gap-1.5"
          >
            <SendHorizontal className="size-3.5" />
            Enviar
          </Button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </footer>
  );
}
