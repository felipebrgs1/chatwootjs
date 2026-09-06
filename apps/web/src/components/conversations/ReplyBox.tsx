import {
  Bold,
  ChevronLeftSquare,
  ChevronRightSquare,
  Code2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Mic,
  Quote,
  SendHorizontal,
  Square,
  StickyNote,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@chatwootjs/ui/lib/utils";

import { ApiError } from "@/lib/auth";
import { listCanned, type CannedResponse } from "@/lib/automation";
import { sendTyping } from "@/hooks/useCable";
import type { Message } from "@/lib/conversations";

const QUICK_EMOJI = ["😀", "👍", "❤️", "🙏", "😅", "🎉"] as const;

/* Ícones do toolbar de formatação (editor rico chega no M12). */
const TOOLBAR = [
  Bold,
  Italic,
  Link2,
  Quote,
  ChevronLeftSquare,
  ChevronRightSquare,
  List,
  ListOrdered,
  Code2,
] as const;

/**
 * ReplyBox estilo Chatwoot v4: pills Responder/Nota privada, área aberta de
 * texto, hint de canned response com `/`, anexos, ditado e envio otimista.
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
  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [cannedOpen, setCannedOpen] = useState(false);
  const cannedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const echoRef = useRef(0);

  // autocomplete `/atalho`: busca no server com debounce e insere o conteúdo
  function handleChange(value: string): void {
    setText(value);
    handleTyping();
    const match = /(?:^|\s)\/(\S*)$/.exec(value);
    if (cannedTimer.current) clearTimeout(cannedTimer.current);
    if (!match) {
      setCannedOpen(false);
      return;
    }
    cannedTimer.current = setTimeout(() => {
      void listCanned(accountId, match[1] || undefined)
        .then((rows) => {
          setCanned(rows.slice(0, 6));
          setCannedOpen(true);
        })
        .catch(() => {});
    }, 200);
  }

  function applyCanned(item: CannedResponse): void {
    setText((prev) =>
      prev.replace(/(?:^|\s)\/\S*$/, item.content ? ` ${item.content}` : "").trimStart(),
    );
    setCannedOpen(false);
  }

  // digitação: liga ao teclar, desliga após 3s parado
  function handleTyping(): void {
    sendTyping(accountId, conversationId, true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(accountId, conversationId, false), 3000);
  }

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (cannedTimer.current) clearTimeout(cannedTimer.current);
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
    <footer className="flex-shrink-0 border-t border-border bg-background px-3 pb-3 pt-2.5">
      {/* Pills Responder / Nota privada + expandir */}
      <div className="mb-1.5 flex items-center gap-2">
        <div className="flex rounded-full border border-border p-0.5">
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
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors",
                tab === t.value
                  ? t.value === "private"
                    ? "bg-woot-note font-medium text-amber-900"
                    : "bg-white font-medium text-woot-slate-12 shadow-sm"
                  : "text-woot-slate-11 hover:text-woot-slate-12",
              )}
            >
              {t.value === "private" && <StickyNote className="size-3.5" />}
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          title="Expandir — chega no M12"
          className="ml-auto grid size-7 place-content-center rounded-lg text-woot-slate-11 hover:bg-muted"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>

      {/* Editor aberto */}
      <div className="relative">
        {cannedOpen && canned.length > 0 && (
          <ul className="absolute bottom-full left-0 z-10 mb-1 max-h-44 w-80 overflow-y-auto rounded-lg border bg-background p-1 shadow-lg">
            {canned.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => applyCanned(item)}
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-muted"
                >
                  <code className="flex-shrink-0 rounded bg-woot-slate-3 px-1 text-[11px] text-woot-blue">
                    /{item.short_code}
                  </code>
                  <span className="min-w-0 flex-1 truncate text-xs text-woot-slate-11">
                    {item.content}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder={tab === "private" ? "Nota visível só para a equipe..." : ""}
          className="w-full resize-none bg-transparent px-1 py-1 text-sm text-woot-slate-12 outline-none placeholder:text-woot-slate-10"
        />
      </div>

      {/* Toolbar de formatação (decorativa até o M12) */}
      {tab === "reply" && (
        <div className="flex items-center gap-0.5 pb-1">
          {TOOLBAR.map((Icon, i) => (
            <button
              key={i}
              type="button"
              title="Editor rico chega no M12"
              disabled
              className="grid size-7 place-content-center rounded-lg text-woot-slate-11 disabled:opacity-50"
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      )}

      {/* Hint de canned response */}
      {tab === "reply" && (
        <p className="pb-1.5 text-sm text-woot-slate-10">
          Shift + enter para nova linha. Comece com <code>'/'</code> para escolher uma Resposta
          Pronta.
        </p>
      )}

      {/* Rodapé: emoji, anexo, áudio + enviar */}
      <div className="flex items-center gap-1">
        <div className="relative">
          <button
            type="button"
            title="Emoji"
            onClick={() => setShowEmoji((v) => !v)}
            className="flex size-8 items-center justify-center rounded-lg text-woot-slate-11 hover:bg-muted hover:text-woot-slate-12"
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
          title="Anexar"
          onClick={() => fileRef.current?.click()}
          className="flex size-8 items-center justify-center rounded-lg text-woot-slate-11 hover:bg-muted hover:text-woot-slate-12"
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
        <button
          type="button"
          title={recording ? "Parar gravação" : "Gravar áudio"}
          onClick={() => void toggleRecording()}
          className={cn(
            "flex size-8 items-center justify-center rounded-lg hover:bg-muted",
            recording ? "text-red-600" : "text-woot-slate-11 hover:text-woot-slate-12",
          )}
        >
          {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
        </button>
        {recording && <span className="text-xs text-red-600">gravando...</span>}
        <button
          type="button"
          onClick={() => void send()}
          disabled={!text.trim() || sending}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-woot-blue px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-40"
        >
          <SendHorizontal className="size-3.5" />
          {tab === "private" ? "Enviar nota" : "Enviar (⏎)"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </footer>
  );
}
