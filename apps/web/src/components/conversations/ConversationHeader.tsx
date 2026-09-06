import { BellOff, ChevronDown, Moon, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";

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
import { executeMacro, listMacros, listTeams, type Macro, type Team } from "@/lib/automation";

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
  accountId,
  conversation,
  teams,
  onStatus,
  onSnooze,
  onMute,
  onTeam,
  onMacro,
}: {
  accountId: number;
  conversation: ConversationDetail;
  teams?: Team[];
  onStatus: (status: string) => void;
  onSnooze: (untilEpoch: number) => void;
  onMute: () => void;
  onTeam?: (teamId: number | null) => void;
  onMacro?: () => void;
}) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [macros, setMacros] = useState<Macro[] | null>(null);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [macroBusy, setMacroBusy] = useState(false);
  const [knownTeams, setKnownTeams] = useState<Team[] | null>(null);

  const teamOptions = teams ?? knownTeams ?? [];

  useEffect(() => {
    if (teams) return;
    void listTeams(accountId)
      .then(setKnownTeams)
      .catch(() => {});
  }, [accountId, teams]);

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
        {(onTeam || teamOptions.length > 0) && (
          <label className="flex items-center gap-1 text-xs text-muted-foreground" title="Time">
            <Users className="size-4" />
            <select
              value={conversation.team_id ?? 0}
              onChange={(e) => onTeam?.(Number(e.target.value) || null)}
              className="h-8 max-w-28 rounded-lg border border-input bg-background px-1 text-xs"
              aria-label="Time responsável"
            >
              <option value={0}>Sem time</option>
              {teamOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            title="Executar macro"
            disabled={macroBusy}
            onClick={() => {
              if (!macros) {
                void listMacros(accountId)
                  .then((rows) => {
                    setMacros(rows);
                    setMacrosOpen(true);
                  })
                  .catch(() => {});
              } else {
                setMacrosOpen((v) => !v);
              }
            }}
          >
            <Zap className="size-4" />
            Macro
          </Button>
          {macrosOpen && (
            <div className="absolute right-0 top-9 z-10 w-56 rounded-lg border bg-background p-1 shadow-lg">
              {macros === null ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">Carregando...</p>
              ) : macros.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  Nenhuma macro — crie em Configurações · Macros.
                </p>
              ) : (
                macros.map((macro) => (
                  <button
                    key={macro.id}
                    type="button"
                    disabled={macroBusy}
                    onClick={() => {
                      setMacroBusy(true);
                      void executeMacro(accountId, macro.id, conversation.id)
                        .then(() => {
                          setMacrosOpen(false);
                          onMacro?.();
                        })
                        .catch(() => {})
                        .finally(() => setMacroBusy(false));
                    }}
                    className="block w-full rounded px-2 py-1.5 text-start text-xs hover:bg-muted disabled:opacity-50"
                  >
                    {macro.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
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
