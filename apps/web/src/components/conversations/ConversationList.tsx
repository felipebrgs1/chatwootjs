import { Search } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import type { ConversationItem } from "@/lib/conversations";

const STATUS_CHIPS = [
  { value: "open", label: "Abertas" },
  { value: "pending", label: "Pendentes" },
  { value: "resolved", label: "Resolvidas" },
  { value: "snoozed", label: "Adiadas" },
  { value: "all", label: "Todas" },
] as const;

export type StatusChip = (typeof STATUS_CHIPS)[number]["value"];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-sky-400",
};

function waitingClass(waitingSince: number | null): string {
  if (!waitingSince) return "";
  const hours = (Date.now() / 1000 - waitingSince) / 3600;
  if (hours >= 4) return "text-red-600";
  if (hours >= 1) return "text-amber-600";
  return "text-muted-foreground";
}

function waitingLabel(waitingSince: number | null): string {
  if (!waitingSince) return "";
  const minutes = Math.max(1, Math.round((Date.now() / 1000 - waitingSince) / 60));
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function preview(item: ConversationItem): string {
  const last = item.messages[0];
  if (!last?.content) return "(sem mensagens)";
  return last.private ? `(nota) ${last.content}` : last.content;
}

export function ConversationList({
  items,
  selectedId,
  status,
  assignee,
  mineCount,
  unassignedCount,
  allCount,
  query,
  onStatus,
  onAssignee,
  onQuery,
}: {
  items: ConversationItem[] | null;
  selectedId: number | null;
  status: StatusChip;
  assignee: "me" | "unassigned" | "all";
  mineCount: number;
  unassignedCount: number;
  allCount: number;
  query: string;
  onStatus: (status: StatusChip) => void;
  onAssignee: (assignee: "me" | "unassigned" | "all") => void;
  onQuery: (query: string) => void;
}) {
  return (
    <section
      aria-label="Lista de conversas"
      className="flex w-[320px] flex-shrink-0 flex-col border-r border-border bg-background"
    >
      <header className="border-b border-border px-3 pb-2 pt-3">
        <div className="flex items-center gap-1">
          <h1 className="text-base font-semibold">Conversas</h1>
          <div className="ml-auto flex rounded-lg bg-muted p-0.5 text-xs">
            {(
              [
                { value: "me", label: `Minhas (${mineCount})` },
                { value: "unassigned", label: `Livres (${unassignedCount})` },
                { value: "all", label: `Todas (${allCount})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onAssignee(tab.value)}
                className={cn(
                  "rounded-md px-2 py-1 transition-colors",
                  assignee === tab.value
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex gap-1 overflow-x-auto">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => onStatus(chip.value)}
              className={cn(
                "flex-shrink-0 rounded-full border px-2.5 py-1 text-xs transition-colors",
                status === chip.value
                  ? "border-woot-blue bg-woot-nav-active-bg font-medium text-woot-blue"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar conversas..."
            className="w-full rounded-lg border border-input bg-background py-1.5 pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground focus:border-woot-blue"
          />
        </div>
      </header>
      <ul className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto p-1.5">
        {items === null && <li className="p-4 text-sm text-muted-foreground">Carregando...</li>}
        {items !== null && items.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">Nenhuma conversa aqui.</li>
        )}
        {(items ?? []).map((item) => {
          const active = item.id === selectedId;
          return (
            <li key={item.id}>
              <Link
                to="/app/conversations/$conversationId"
                params={{ conversationId: String(item.id) }}
                search={(prev) => prev}
                className={cn(
                  "flex gap-2.5 rounded-lg border-l-2 px-2.5 py-2.5 transition-colors hover:bg-muted/60",
                  active ? "border-l-woot-blue bg-woot-nav-active-bg/60" : "border-l-transparent",
                )}
              >
                <WootAvatar name={item.meta.sender.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="truncate text-sm font-medium">{item.meta.sender.name}</span>
                    {item.priority && item.priority !== "none" && (
                      <span
                        title={item.priority}
                        className={cn(
                          "mt-1 size-1.5 flex-shrink-0 rounded-full",
                          PRIORITY_COLORS[item.priority] ?? "bg-slate-400",
                        )}
                      />
                    )}
                    <span className="ml-auto flex-shrink-0 text-[11px] text-muted-foreground">
                      #{item.display_id}
                    </span>
                  </div>
                  <p className="truncate text-[13px] text-muted-foreground">{preview(item)}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    {item.inbox_name && (
                      <span className="truncate rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                        {item.inbox_name}
                      </span>
                    )}
                    {item.assignee_name && (
                      <span className="truncate text-muted-foreground">{item.assignee_name}</span>
                    )}
                    {item.waiting_since && (
                      <span
                        className={cn("ml-auto flex-shrink-0", waitingClass(item.waiting_since))}
                      >
                        {waitingLabel(item.waiting_since)}
                      </span>
                    )}
                    {item.unread_count > 0 && (
                      <span className="grid size-5 flex-shrink-0 place-content-center rounded-full bg-woot-blue text-[10px] font-semibold text-white">
                        {item.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
