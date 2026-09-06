import {
  Bold,
  Code2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Mic,
  Minimize2,
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

type ToolbarAction = "bold" | "italic" | "link" | "quote" | "code" | "ul" | "ol";

/**
 * Shift+Enter inteligente, função pura (paridade com o WootWriter): dentro de
 * lista ou citação, continua o marcador na nova linha (`- `, `2. `, `> `);
 * numa linha com só o marcador, sai da lista. Retorna null fora de lista.
 */
export function computeListContinuation(
  value: string,
  caret: number,
  selectionEnd: number,
): { text: string; caret: number } | null {
  if (caret !== selectionEnd) return null;
  const lineStart = value.lastIndexOf("\n", caret - 1) + 1;
  const line = value.slice(lineStart, caret);

  const bullet = /^(\s*[-*•]\s+)(.*)$/.exec(line);
  const ordered = /^(\s*)(\d+)([.)]\s+)(.*)$/.exec(line);
  const quote = /^(\s*>+\s?)(.*)$/.exec(line);
  if (!bullet && !ordered && !quote) return null;

  if (ordered) {
    const [, indent, num, delimiter, rest] = ordered;
    // marcador vazio: sai da lista
    if (!rest.trim())
      return { text: value.slice(0, lineStart) + value.slice(caret), caret: lineStart };
    const insert = `\n${indent}${Number(num) + 1}${delimiter}`;
    return {
      text: value.slice(0, caret) + insert + value.slice(caret),
      caret: caret + insert.length,
    };
  }
  const [, marker, rest] = (bullet ?? quote) as RegExpExecArray;
  if (!rest.trim())
    return { text: value.slice(0, lineStart) + value.slice(caret), caret: lineStart };
  const insert = `\n${marker}`;
  return {
    text: value.slice(0, caret) + insert + value.slice(caret),
    caret: caret + insert.length,
  };
}

const TOOLBAR_ACTIONS: ReadonlyArray<{
  icon: typeof Bold;
  label: string;
  action: ToolbarAction;
}> = [
  { icon: Bold, label: "Negrito", action: "bold" },
  { icon: Italic, label: "Itálico", action: "italic" },
  { icon: Link2, label: "Link", action: "link" },
  { icon: Quote, label: "Citação", action: "quote" },
  { icon: Code2, label: "Código", action: "code" },
  { icon: List, label: "Lista", action: "ul" },
  { icon: ListOrdered, label: "Lista numerada", action: "ol" },
];

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
  const [expanded, setExpanded] = useState(false);
  const cannedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const caretRaf = useRef<number | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const echoRef = useRef(0);

  // autocomplete `/atalho`: busca no server com debounce e insere o conteúdo
  function handleChange(value: string): void {
    // Digitação real cancela restauração de cursor pendente de edição sintética.
    if (caretRaf.current !== null) {
      cancelAnimationFrame(caretRaf.current);
      caretRaf.current = null;
    }
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

  /** Envolve a seleção com marcadores markdown (negrito, itálico, código). */
  function wrapSelection(before: string, after: string = before): void {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end) || "texto";
    handleChange(`${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  /** Prefixa cada linha da seleção (citação, listas) — paridade com o WootWriter. */
  function prefixLines(prefix: string | ((index: number) => string)): void {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const blockStart = value.lastIndexOf("\n", start - 1) + 1;
    const rawEnd = end < value.length ? value.indexOf("\n", end) : value.length;
    const blockEnd = rawEnd === -1 ? value.length : rawEnd;
    const body = value.slice(blockStart, blockEnd) || "item";
    const prefixed = body
      .split("\n")
      .map((line, i) => {
        const tag = typeof prefix === "function" ? prefix(i) : prefix;
        return line.trim() ? `${tag}${line}` : line;
      })
      .join("\n");
    handleChange(`${value.slice(0, blockStart)}${prefixed}${value.slice(blockEnd)}`);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(blockStart, blockStart + prefixed.length);
    });
  }

  function insertLink(): void {
    const el = areaRef.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end, value } = el;
    const selected = value.slice(start, end).trim();
    if (/^https?:\/\/\S+$/i.test(selected)) {
      const next = `${value.slice(0, start)}[link](${selected})${value.slice(end)}`;
      handleChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + 1, start + 5);
      });
      return;
    }
    const label = selected || "texto";
    const next = `${value.slice(0, start)}[${label}](url)${value.slice(end)}`;
    handleChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const urlStart = start + label.length + 3;
      el.setSelectionRange(urlStart, urlStart + 3);
    });
  }

  function runToolbar(action: ToolbarAction): void {
    switch (action) {
      case "bold":
        wrapSelection("**");
        break;
      case "italic":
        wrapSelection("*");
        break;
      case "link":
        insertLink();
        break;
      case "quote":
        prefixLines("> ");
        break;
      case "code":
        wrapSelection("`");
        break;
      case "ul":
        prefixLines("- ");
        break;
      case "ol":
        prefixLines((i) => `${i + 1}. `);
        break;
    }
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
      if (caretRaf.current !== null) cancelAnimationFrame(caretRaf.current);
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
                    ? "bg-woot-note font-medium text-amber-900 dark:text-amber-100"
                    : "bg-card font-medium text-woot-slate-12 shadow-sm dark:bg-woot-slate-3"
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
          title={expanded ? "Recolher editor" : "Expandir editor"}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto grid size-7 place-content-center rounded-lg text-woot-slate-11 hover:bg-muted"
        >
          {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
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
          ref={areaRef}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            } else if (e.key === "Enter" && e.shiftKey) {
              // Shift+Enter inteligente: continua `- `, `2. `, `> ` (ver
              // computeListContinuation); fora de lista, quebra de linha normal.
              // setText direto (sem handleChange) para não re-disparar
              // debounce de canned/typing nesta quebra sintética.
              const target = e.currentTarget;
              const edit = computeListContinuation(
                target.value,
                target.selectionStart,
                target.selectionEnd,
              );
              if (edit) {
                e.preventDefault();
                setText(edit.text);
                if (caretRaf.current !== null) cancelAnimationFrame(caretRaf.current);
                caretRaf.current = requestAnimationFrame(() => {
                  caretRaf.current = null;
                  target.focus();
                  target.setSelectionRange(edit.caret, edit.caret);
                });
              }
            }
          }}
          rows={expanded ? 8 : 2}
          placeholder={tab === "private" ? "Nota visível só para a equipe..." : ""}
          className="w-full resize-none bg-transparent px-1 py-1 text-sm text-woot-slate-12 outline-none placeholder:text-woot-slate-10"
        />
      </div>

      {/* Toolbar de formatação markdown (paridade com o WootWriter) */}
      {tab === "reply" && (
        <div className="flex items-center gap-0.5 pb-1" role="toolbar" aria-label="Formatação">
          {TOOLBAR_ACTIONS.map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => runToolbar(action)}
              className="grid size-7 place-content-center rounded-lg text-woot-slate-11 transition-colors hover:bg-muted hover:text-woot-slate-12"
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
