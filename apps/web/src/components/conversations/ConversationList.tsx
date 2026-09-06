import {
  ArrowDownUp,
  ArrowRightToLine,
  Inbox,
  ListFilter,
  MessageSquare,
  Repeat,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@chatwootjs/ui/components/dropdown-menu";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import type { ConversationItem } from "@/lib/conversations";

const STATUS_BADGES = [
  { value: "open", label: "Abertas" },
  { value: "pending", label: "Pendentes" },
  { value: "resolved", label: "Resolvidas" },
  { value: "snoozed", label: "Adiadas" },
  { value: "all", label: "Todas" },
] as const;

export type StatusChip = (typeof STATUS_BADGES)[number]["value"];

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-sky-400",
};

function relativeTime(epoch: number | null): string {
  if (!epoch) return "";
  const minutes = Math.max(1, Math.round((Date.now() / 1000 - epoch) / 60));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function preview(item: ConversationItem): string {
  const last = item.messages[0];
  if (!last?.content) return "";
  return last.private ? `(nota) ${last.content}` : last.content;
}

/** Lista de conversas estilo Chatwoot v4: título + badge de status, tabs de
 * assignee (Me/Não atribuídas/Todas) e cards com avatar, inbox e preview. */
export function ConversationList({
  items,
  selectedId,
  status,
  assignee,
  mineCount,
  unassignedCount,
  allCount,
  onStatus,
  onAssignee,
  accountLabels,
}: {
  items: ConversationItem[] | null;
  selectedId: number | null;
  status: StatusChip;
  assignee: "me" | "unassigned" | "all";
  mineCount: number;
  unassignedCount: number;
  allCount: number;
  onStatus: (status: StatusChip) => void;
  onAssignee: (assignee: "me" | "unassigned" | "all") => void;
  accountLabels: Array<{ id: number; title: string; color: string }>;
}) {
  const statusLabel = STATUS_BADGES.find((s) => s.value === status)?.label ?? "Abertas";
  return (
    <section
      aria-label="Lista de conversas"
      className="flex w-[320px] flex-shrink-0 flex-col border-r border-border bg-background"
    >
      {/* Header: título + badge de status + ações */}
      <div className="flex h-[3.25rem] items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center">
          <h1 className="truncate text-base font-medium text-woot-slate-12">Conversas</h1>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Filtrar por status"
              className="mx-1 my-0.5 flex-shrink-0 rounded-md bg-woot-slate-3 px-2 py-1 text-xxs font-medium capitalize text-woot-slate-12 transition-colors hover:bg-border"
            >
              {statusLabel}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {STATUS_BADGES.map((s) => (
                <DropdownMenuItem
                  key={s.value}
                  onSelect={() => onStatus(s.value)}
                  className={cn(s.value === status && "font-medium text-woot-blue")}
                >
                  {s.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Filtros avançados — chega no M11"
            className="grid size-7 place-content-center rounded-lg text-woot-slate-11 hover:bg-muted"
          >
            <ListFilter className="size-4" />
          </button>
          <button
            type="button"
            title="Ordenar — chega no M11"
            className="grid size-7 place-content-center rounded-lg text-woot-slate-11 hover:bg-muted"
          >
            <ArrowDownUp className="size-4" />
          </button>
          <button
            type="button"
            title="Alternar layout — chega no M12"
            className="grid size-7 place-content-center rounded-lg text-woot-slate-11 hover:bg-muted"
          >
            <ArrowRightToLine className="size-4" />
          </button>
        </div>
      </div>

      {/* Tabs de assignee (underline) */}
      <nav className="flex h-10 items-end px-3" aria-label="Filtrar por atribuição">
        {(
          [
            { value: "me", label: "Minhas", count: mineCount },
            { value: "unassigned", label: "Não atribuídas", count: unassignedCount },
            { value: "all", label: "Todas", count: allCount },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onAssignee(tab.value)}
            className={cn(
              "flex items-center gap-1 whitespace-nowrap border-b-2 px-2 pb-2 pt-1.5 text-sm transition-colors",
              assignee === tab.value
                ? "border-woot-blue font-medium text-woot-blue"
                : "border-transparent text-woot-slate-11 hover:text-woot-slate-12",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xxs font-medium",
                assignee === tab.value
                  ? "bg-woot-nav-active-bg text-woot-blue"
                  : "bg-woot-slate-3 text-woot-slate-11",
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </nav>

      {/* Cards */}
      <ul className="min-h-0 flex-1 list-none overflow-y-auto">
        {items === null && <li className="p-4 text-sm text-woot-slate-11">Carregando...</li>}
        {items !== null && items.length === 0 && (
          <li className="p-4 text-sm text-woot-slate-11">Nenhuma conversa aqui.</li>
        )}
        {(items ?? []).map((item) => (
          <ConversationCard
            key={item.id}
            item={item}
            active={item.id === selectedId}
            showInboxName={item.inbox_name !== null}
            accountLabels={accountLabels}
          />
        ))}
      </ul>
    </section>
  );
}

function ConversationCard({
  item,
  active,
  showInboxName,
  accountLabels,
}: {
  item: ConversationItem;
  active: boolean;
  showInboxName: boolean;
  accountLabels: Array<{ id: number; title: string; color: string }>;
}) {
  const last = item.messages[0];
  const lastIsIncoming = last?.message_type === "incoming";
  const chips = item.labels
    .map((title) => accountLabels.find((l) => l.title === title))
    .filter((l): l is { id: number; title: string; color: string } => Boolean(l))
    .slice(0, 3);
  return (
    <li>
      <Link
        to="/app/conversations/$conversationId"
        params={{ conversationId: String(item.id) }}
        search={(prev) => prev}
        className={cn(
          "group block w-full border-b border-border/60 px-3 py-3 transition-colors hover:bg-muted/40",
          active && "bg-woot-slate-3/70",
        )}
      >
        <div className="flex min-w-0 gap-2.5">
          <WootAvatar name={item.meta.sender.name} size="sm" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            {/* Linha 1: nome + prioridade + inbox + tempo */}
            <div className="flex h-5 items-center gap-2">
              <h4 className="min-w-0 flex-1 truncate text-[15px] font-medium leading-none text-woot-slate-12">
                {item.meta.sender.name}
              </h4>
              {item.priority && item.priority !== "none" && (
                <span
                  title={`Prioridade: ${item.priority}`}
                  className={cn(
                    "size-1.5 flex-shrink-0 rounded-full",
                    PRIORITY_COLORS[item.priority] ?? "bg-slate-400",
                  )}
                />
              )}
              {showInboxName && item.inbox_name && (
                <span
                  title={item.inbox_name}
                  className="grid size-5 flex-shrink-0 place-content-center rounded-full bg-woot-slate-3"
                >
                  <Inbox className="size-3 text-woot-slate-11" />
                </span>
              )}
              <span className="flex-shrink-0 text-xs text-woot-slate-10">
                {relativeTime(item.last_activity_at)}
              </span>
            </div>
            {/* Linha 2: preview da última mensagem */}
            {last?.content && (
              <p className="mt-1 flex min-w-0 items-center gap-1 text-[13px] leading-4">
                {lastIsIncoming ? (
                  <MessageSquare className="size-3 flex-shrink-0 text-woot-slate-11" />
                ) : (
                  <Repeat className="size-3 flex-shrink-0 text-woot-slate-11" />
                )}
                <span
                  className={cn(
                    "truncate",
                    item.unread_count > 0 ? "text-woot-slate-12" : "text-woot-slate-11",
                  )}
                >
                  {preview(item)}
                </span>
              </p>
            )}
            {/* Linha 3: labels / assignee / não lidas */}
            {(chips.length > 0 || item.assignee_name || item.unread_count > 0) && (
              <div className="mt-1 flex items-center gap-2">
                {chips.length > 0 && (
                  <div className="flex min-w-0 flex-wrap gap-1">
                    {chips.map((label) => (
                      <span
                        key={label.id}
                        className="flex items-center gap-1 rounded-md bg-woot-slate-3 px-1.5 py-0.5 text-[10px] leading-4 text-woot-slate-11"
                      >
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.title}
                      </span>
                    ))}
                  </div>
                )}
                {item.assignee_name && chips.length === 0 && (
                  <span className="min-w-0 flex-1 truncate text-xs text-woot-slate-11">
                    {item.assignee_name}
                  </span>
                )}
                {item.unread_count > 0 && (
                  <span className="ml-auto grid size-5 flex-shrink-0 place-content-center rounded-full bg-woot-blue text-xs font-semibold text-white">
                    {item.unread_count}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
