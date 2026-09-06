import { ArrowUpDown, Maximize2, MessageCircle, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@chatwootjs/ui/components/empty-state";
import { cn } from "@chatwootjs/ui/lib/utils";

export const Route = createFileRoute("/_auth/app/")({
  component: ConversationsHome,
});

type AssigneeFilter = "mine" | "unassigned" | "all";

const TABS: Array<{ value: AssigneeFilter; label: string }> = [
  { value: "mine", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
  { value: "all", label: "All" },
];

/** Esqueleto da página de conversas (dados reais no M4). Layout 1:1 com o Chatwoot. */
function ConversationsHome() {
  const [tab, setTab] = useState<AssigneeFilter>("mine");

  return (
    <div className="flex min-w-0 flex-1">
      {/* Coluna da lista */}
      <section
        aria-label="Lista de conversas"
        className="flex w-[320px] flex-shrink-0 flex-col border-r border-border"
      >
        <header className="border-b border-border px-4 pb-0 pt-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Conversations</h1>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              Open
            </span>
            <div className="ml-auto flex items-center gap-0.5">
              <button
                type="button"
                title="Filtros (M4)"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <SlidersHorizontal className="size-4" />
              </button>
              <button
                type="button"
                title="Ordenar (M4)"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ArrowUpDown className="size-4" />
              </button>
              <button
                type="button"
                title="Expandir (M4)"
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Maximize2 className="size-4" />
              </button>
            </div>
          </div>
          <div role="tablist" aria-label="Atribuição" className="mt-2 flex gap-4">
            {TABS.map((item) => (
              <button
                key={item.value}
                role="tab"
                aria-selected={tab === item.value}
                onClick={() => setTab(item.value)}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 pb-2 text-sm transition-colors",
                  tab === item.value
                    ? "border-woot-blue font-medium text-woot-blue"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-px text-[11px]",
                    tab === item.value
                      ? "bg-woot-nav-active-bg text-woot-blue"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  0
                </span>
              </button>
            ))}
          </div>
        </header>
        <EmptyState
          icon={<MessageCircle className="size-8" />}
          title="Nenhuma conversa aqui"
          description="As conversas desta caixa de entrada aparecem nesta lista (dados reais no M4)."
        />
      </section>

      {/* Thread vazia */}
      <main className="hidden min-w-0 flex-1 items-center justify-center bg-background md:flex">
        <EmptyState
          icon={<MessageCircle className="size-10" />}
          title="Selecione uma conversa"
          description="Escolha uma conversa na lista para ver as mensagens."
        />
      </main>
    </div>
  );
}
