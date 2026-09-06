import { BellOff, ChevronDown, Moon } from "lucide-react";
import { useState } from "react";

import { Button } from "@chatwootjs/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@chatwootjs/ui/components/dropdown-menu";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import type { ConversationDetail } from "@/lib/conversations";

const STATUSES = [
  { value: "open", label: "Aberta" },
  { value: "pending", label: "Pendente" },
  { value: "resolved", label: "Resolvida" },
] as const;

const SNOOZE_OPTIONS = [
  { label: "Amanhã", hours: 24 },
  { label: "Próxima semana", hours: 24 * 7 },
  { label: "Próximo mês", hours: 24 * 30 },
] as const;

export function ConversationHeader({
  conversation,
  onStatus,
  onSnooze,
  onMute,
}: {
  conversation: ConversationDetail;
  onStatus: (status: string) => void;
  onSnooze: (untilEpoch: number) => void;
  onMute: () => void;
}) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  return (
    <header className="flex flex-shrink-0 items-center gap-2 border-b border-border bg-background px-3 py-2">
      <WootAvatar name={conversation.meta.sender.name} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{conversation.meta.sender.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {conversation.inbox_name ?? ""} · #{conversation.display_id}
          {conversation.assignee_name ? ` · ${conversation.assignee_name}` : ""}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium",
              conversation.status === "resolved"
                ? "border-green-200 bg-green-50 text-green-700"
                : conversation.status === "pending"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-border text-muted-foreground",
            )}
          >
            {STATUSES.find((s) => s.value === conversation.status)?.label ?? conversation.status}
            <ChevronDown className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {STATUSES.filter((s) => s.value !== conversation.status).map((s) => (
              <DropdownMenuItem key={s.value} onSelect={() => onStatus(s.value)}>
                Marcar como {s.label.toLowerCase()}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSnoozeOpen((v) => !v)}
            className="gap-1.5"
            title="Adiar"
          >
            <Moon className="size-4" />
            Adiar
          </Button>
          {snoozeOpen && (
            <div className="absolute right-0 top-9 z-10 w-44 rounded-lg border bg-background p-1 shadow-lg">
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    onSnooze(Math.floor(Date.now() / 1000) + opt.hours * 3600);
                    setSnoozeOpen(false);
                  }}
                  className="block w-full rounded px-2 py-1.5 text-start text-xs hover:bg-muted"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          title={conversation.muted ? "Ativar notificações" : "Silenciar"}
          onClick={onMute}
          className={cn(conversation.muted && "text-amber-600")}
        >
          <BellOff className="size-4" />
        </Button>
      </div>
    </header>
  );
}
