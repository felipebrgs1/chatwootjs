import { FileText, MessageSquare, Search, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { cn } from "@chatwootjs/ui/lib/utils";

import { useSessionContext } from "@/components/session-provider";
import { unifiedSearch, type SearchResults } from "@/lib/notifications";

interface FlatHit {
  key: string;
  group: string;
  title: string;
  subtitle: string | null;
  run: () => void;
}

/**
 * M11 — `⌘K` global: conversas + contatos + artigos + canned, com navegação
 * por teclado (↑↓ + Enter) e debounce de 250ms.
 */
export function CommandPalette() {
  const { session } = useSessionContext();
  const navigate = useNavigate();
  const accountId = session?.accountId ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Reset ao abrir (no handler, não em efeito — react/set-state-in-effect).
        setQuery("");
        setResults(null);
        setCursor(0);
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const runSearch = useCallback(
    async (q: string) => {
      if (!accountId || !q.trim()) {
        setResults(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        setResults(await unifiedSearch(accountId, q));
        setCursor(0);
      } catch {
        /* offline — mantém resultados anteriores */
      } finally {
        setLoading(false);
      }
    },
    [accountId],
  );

  function onChange(value: string): void {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void runSearch(value), 250);
  }

  const hits: FlatHit[] = useMemo(() => {
    if (!results) return [];
    const go = (to: string, params?: Record<string, string>) => () => {
      setOpen(false);
      void navigate({ to, params } as never);
    };
    return [
      ...results.conversations.map((h) => ({
        key: `conv-${h.id}`,
        group: "Conversas",
        title: h.title,
        subtitle: h.subtitle,
        run: go("/app/conversations/$conversationId", { conversationId: String(h.id) }),
      })),
      ...results.contacts.map((h) => ({
        key: `contact-${h.id}`,
        group: "Contatos",
        title: h.title,
        subtitle: h.subtitle,
        run: go("/app/contacts/$contactId", { contactId: String(h.id) }),
      })),
      ...results.articles.map((h) => ({
        key: `article-${h.id}`,
        group: "Artigos",
        title: h.title,
        subtitle: h.subtitle,
        run: go("/app/helpcenter"),
      })),
      ...results.canned_responses.map((h) => ({
        key: `canned-${h.id}`,
        group: "Respostas prontas",
        title: h.title,
        subtitle: h.subtitle,
        run: go("/app/settings/canned"),
      })),
    ];
  }, [results, navigate]);

  function onKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      hits[cursor]?.run();
    }
  }

  if (!open) return null;

  const icons: Record<string, typeof Search> = {
    Conversas: MessageSquare,
    Contatos: User,
    Artigos: FileText,
    "Respostas prontas": Search,
  };
  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-label="Busca global"
        className="mx-auto max-w-lg overflow-hidden rounded-xl border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar conversas, contatos, artigos, respostas…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5">
          {loading && (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">Buscando…</li>
          )}
          {!loading && query.trim() && hits.length === 0 && (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhum resultado para “{query.trim()}”.
            </li>
          )}
          {!loading && !query.trim() && (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              Digite para buscar nos 4 domínios. ↑↓ navega, Enter abre.
            </li>
          )}
          {hits.map((hit, i) => {
            const header = hit.group !== lastGroup ? hit.group : null;
            lastGroup = hit.group;
            const Icon = icons[hit.group] ?? Search;
            return (
              <li key={hit.key}>
                {header && (
                  <p className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {header}
                  </p>
                )}
                <button
                  type="button"
                  onClick={hit.run}
                  onMouseEnter={() => setCursor(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left",
                    cursor === i && "bg-woot-nav-active-bg",
                  )}
                >
                  <Icon className="size-4 shrink-0 text-woot-slate-11" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{hit.title}</span>
                    {hit.subtitle && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {hit.subtitle}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
