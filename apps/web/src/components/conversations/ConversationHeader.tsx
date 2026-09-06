import { BellOff, ChevronDown, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@chatwootjs/ui/components/dropdown-menu";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import type { ConversationDetail } from "@/lib/conversations";
import { executeMacro, listMacros, type Macro } from "@/lib/automation";

const STATUS_OPTIONS = [
  { value: "open", label: "Abrir" },
  { value: "pending", label: "Marcar como pendente" },
  { value: "resolved", label: "Marcar como resolvida" },
] as const;

const SNOOZE_OPTIONS = [
  { label: "Adiar para amanhã", hours: 24 },
  { label: "Adiar para a próxima semana", hours: 24 * 7 },
  { label: "Adiar para o próximo mês", hours: 24 * 30 },
] as const;

/** Header da conversa estilo Chatwoot v4: avatar + nome/inbox à esquerda,
 * macro, silenciar e botão "Resolver" com dropdown à direita. */
export function ConversationHeader({
  accountId,
  conversation,
  onStatus,
  onSnooze,
  onMute,
  onMacro,
}: {
  accountId: number;
  conversation: ConversationDetail;
  onStatus: (status: string) => void;
  onSnooze: (untilEpoch: number) => void;
  onMute: () => void;
  onMacro?: () => void;
}) {
  const [macros, setMacros] = useState<Macro[] | null>(null);
  const [macroBusy, setMacroBusy] = useState(false);

  useEffect(() => {
    void listMacros(accountId)
      .then(setMacros)
      .catch(() => {});
  }, [accountId]);

  return (
    <header className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <WootAvatar name={conversation.meta.sender.name} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-tight text-woot-slate-12">
          {conversation.meta.sender.name}
        </p>
        <p className="truncate text-xs text-woot-slate-11">
          {conversation.inbox_name ?? ""} · #{conversation.display_id}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger
              title="Executar macro"
              className="grid size-8 place-content-center rounded-lg text-woot-slate-11 hover:bg-muted disabled:opacity-50"
              disabled={macroBusy}
            >
              <Zap className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {macros === null ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Carregando...</p>
              ) : macros.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  Nenhuma macro — crie em Configurações · Macros.
                </p>
              ) : (
                macros.map((macro) => (
                  <DropdownMenuItem
                    key={macro.id}
                    disabled={macroBusy}
                    onSelect={() => {
                      setMacroBusy(true);
                      void executeMacro(accountId, macro.id, conversation.id)
                        .then(() => {
                          onMacro?.();
                        })
                        .catch(() => {})
                        .finally(() => setMacroBusy(false));
                    }}
                  >
                    {macro.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <button
          type="button"
          title={conversation.muted ? "Ativar notificações" : "Silenciar"}
          onClick={onMute}
          className={cn(
            "grid size-8 place-content-center rounded-lg hover:bg-muted",
            conversation.muted ? "text-amber-600" : "text-woot-slate-11",
          )}
        >
          <BellOff className="size-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-woot-slate-12 transition-colors hover:bg-muted">
            {conversation.status === "resolved" ? "Resolvida" : "Resolver"}
            <ChevronDown className="size-3.5 text-woot-slate-11" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {STATUS_OPTIONS.filter((s) => s.value !== conversation.status).map((s) => (
              <DropdownMenuItem key={s.value} onSelect={() => onStatus(s.value)}>
                {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {SNOOZE_OPTIONS.map((opt) => (
              <DropdownMenuItem
                key={opt.label}
                onSelect={() => onSnooze(Math.floor(Date.now() / 1000) + opt.hours * 3600)}
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
