import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { cn } from "@chatwootjs/ui/lib/utils";

import { ActionRows, ConditionRows } from "@/components/settings/action-editor";
import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";
import {
  AUTOMATION_EVENTS,
  CONDITION_KEYS,
  type AutomationCondition,
  type AutomationRule,
  type MacroAction,
} from "@/lib/automation";

export const Route = createFileRoute("/_auth/app/settings/automations")({
  component: AutomationsSettings,
});

const AUTOMATION_ACTIONS = [
  "send_message",
  "add_label",
  "remove_label",
  "assign_team",
  "assign_agent",
  "remove_assigned_agent",
  "remove_assigned_team",
  "send_webhook_event",
  "mute_conversation",
  "change_status",
  "resolve_conversation",
  "open_conversation",
  "pending_conversation",
  "snooze_conversation",
  "change_priority",
  "add_private_note",
] as const;

const EVENT_LABELS: Record<string, string> = {
  conversation_created: "Conversa criada",
  conversation_updated: "Conversa atualizada",
  message_created: "Mensagem criada",
};

/** Espelha formatDelay do Chatwoot (minutos → 10m/2h/3d). */
function formatDelay(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

function readableDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  description: z.string().optional(),
  event_name: z.enum(AUTOMATION_EVENTS),
  active: z.boolean(),
  execution_delay: z.string().optional(),
});

type Values = z.infer<typeof schema>;

/**
 * Configurações · Automações 1:1 com settings/automation/Index do v4: header
 * com busca + abas Instantânea/Com espera, tabela Nome/Ativa/Criada em/Ações
 * e modais de criar/editar/excluir/ativar.
 */
function AutomationsSettings() {
  const { session } = useSessionContext();
  const [items, setItems] = useState<AutomationRule[] | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"instant" | "delayed">("instant");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [deleting, setDeleting] = useState<AutomationRule | null>(null);
  const [toggling, setToggling] = useState<AutomationRule | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const isAdmin = session?.account.role === "administrator";

  async function refresh(): Promise<void> {
    const d = await apiFetch<{ automation_rules: AutomationRule[] }>(
      `/api/v1/accounts/${session!.accountId}/automation_rules`,
    );
    setItems(d.automation_rules);
  }

  useEffect(() => {
    if (session) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items ?? [];
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  const instant = useMemo(() => filtered.filter((r) => !r.execution_delay), [filtered]);
  const delayed = useMemo(() => filtered.filter((r) => Boolean(r.execution_delay)), [filtered]);
  const showTabs = useMemo(() => (items ?? []).some((r) => Boolean(r.execution_delay)), [items]);
  const visible = showTabs ? (tab === "delayed" ? delayed : instant) : filtered;

  async function clone(rule: AutomationRule): Promise<void> {
    setBusyId(rule.id);
    try {
      await apiFetch(`/api/v1/accounts/${session!.accountId}/automation_rules/${rule.id}/clone`, {
        method: "POST",
      });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function confirmToggle(rule: AutomationRule): Promise<void> {
    setBusyId(rule.id);
    try {
      await apiFetch(`/api/v1/accounts/${session!.accountId}/automation_rules/${rule.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !rule.active }),
      });
      await refresh();
    } finally {
      setBusyId(null);
      setToggling(null);
    }
  }

  if (!session) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-woot-bg">
      {/* Header 1:1 com BaseSettingsHeader (+ abas) */}
      <header className="shrink-0 px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-medium text-woot-slate-12">Automações</h1>
                {visible.length > 0 && (
                  <span className="text-sm text-woot-slate-11">
                    {visible.length} {visible.length === 1 ? "automação" : "automações"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-woot-slate-11">
                Automações substituem processos manuais como etiquetar e atribuir conversas.{" "}
                <a
                  href="https://www.chatwoot.com/hc/user-guide/en/articles/9569733"
                  target="_blank"
                  rel="noreferrer"
                  className="text-woot-blue hover:underline"
                >
                  Saiba mais sobre automações
                </a>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-woot-slate-11" />
                <Input
                  type="search"
                  placeholder="Buscar regras..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-8 w-56 pl-8"
                />
              </div>
              {isAdmin && (
                <Button size="sm" onClick={() => setAdding(true)} className="gap-2">
                  <Plus className="size-4" /> Criar automação
                </Button>
              )}
            </div>
          </div>
          {showTabs && (
            <div
              role="tablist"
              aria-label="Tipo de execução"
              className="flex w-fit gap-0.5 rounded-lg bg-muted p-0.5"
            >
              {(
                [
                  { value: "instant", label: `Instantânea (${instant.length})` },
                  { value: "delayed", label: `Com espera (${delayed.length})` },
                ] as const
              ).map((t) => (
                <button
                  key={t.value}
                  role="tab"
                  aria-selected={tab === t.value}
                  onClick={() => setTab(t.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs transition-colors",
                    tab === t.value
                      ? "bg-card font-medium text-woot-slate-12 shadow-sm"
                      : "text-woot-slate-11 hover:text-woot-slate-12",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto w-full max-w-5xl pb-6">
          {items === null ? (
            <p className="py-10 text-center text-sm text-woot-slate-11">Carregando...</p>
          ) : visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-woot-slate-11">
              {query
                ? "Nenhuma regra para essa busca."
                : showTabs && tab === "delayed"
                  ? "Nenhuma automação com espera."
                  : "Nenhuma automação ainda."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-woot-slate-11">
                    <th className="px-4 py-2.5 font-medium">Nome</th>
                    <th className="px-4 py-2.5 font-medium">Ativa</th>
                    <th className="px-4 py-2.5 font-medium">Criada em</th>
                    {isAdmin && <th className="px-4 py-2.5 text-right font-medium">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((rule) => (
                    <tr
                      key={rule.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <td className="max-w-0 px-4 py-2.5">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-woot-slate-12">{rule.name}</span>
                          {rule.execution_delay ? (
                            <span className="flex-shrink-0 whitespace-nowrap rounded-md bg-woot-slate-3 px-1.5 py-0.5 text-xs text-woot-slate-11">
                              Espera {formatDelay(rule.execution_delay)}
                            </span>
                          ) : null}
                          <span className="h-3 w-px flex-shrink-0 rounded-lg bg-border" />
                          <span className="truncate text-woot-slate-11">
                            {rule.description || EVENT_LABELS[rule.event_name] || rule.event_name}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={rule.active}
                          aria-label={`${rule.active ? "Pausar" : "Ativar"} ${rule.name}`}
                          disabled={!isAdmin || busyId === rule.id}
                          onClick={() => setToggling(rule)}
                          className={cn(
                            "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                            rule.active ? "bg-woot-blue" : "bg-woot-slate-3",
                            "disabled:cursor-not-allowed disabled:opacity-60",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
                              rule.active ? "left-[18px]" : "left-0.5",
                            )}
                          />
                        </button>
                      </td>
                      <td
                        title={new Date(rule.created_at).toLocaleString("pt-BR")}
                        className="whitespace-nowrap px-4 py-2.5 text-woot-slate-12"
                      >
                        {readableDate(rule.created_at)}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5">
                          <span className="flex flex-shrink-0 justify-end gap-3">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Editar"
                              aria-label={`Editar ${rule.name}`}
                              onClick={() => setEditing(rule)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Clonar"
                              aria-label={`Clonar ${rule.name}`}
                              disabled={busyId === rule.id}
                              onClick={() => void clone(rule)}
                            >
                              <Copy className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Excluir"
                              aria-label={`Excluir ${rule.name}`}
                              onClick={() => setDeleting(rule)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {adding && (
        <RuleDialog
          accountId={session.accountId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void refresh();
          }}
        />
      )}
      {editing && (
        <RuleDialog
          accountId={session.accountId}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Confirmar exclusão"
          message={
            <>
              Tem certeza que deseja excluir <strong>{deleting.name}</strong>?
            </>
          }
          confirmLabel={`Sim, excluir ${deleting.name}`}
          rejectLabel={`Não, manter ${deleting.name}`}
          busy={busyId === deleting.id}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            setBusyId(deleting.id);
            void apiFetch(`/api/v1/accounts/${session.accountId}/automation_rules/${deleting.id}`, {
              method: "DELETE",
            })
              .then(() => {
                setDeleting(null);
                return refresh();
              })
              .catch(() => setBusyId(null));
          }}
        />
      )}
      {toggling && (
        <ConfirmDialog
          title={toggling.active ? "Pausar automação" : "Ativar automação"}
          message={
            toggling.active ? (
              <>
                Pausar <strong>{toggling.name}</strong>? Ela deixa de rodar nos próximos eventos.
              </>
            ) : (
              <>
                Ativar <strong>{toggling.name}</strong>? Ela volta a rodar nos próximos eventos.
              </>
            )
          }
          confirmLabel={
            toggling.active ? `Sim, pausar ${toggling.name}` : `Sim, ativar ${toggling.name}`
          }
          rejectLabel="Cancelar"
          busy={busyId === toggling.id}
          onClose={() => setToggling(null)}
          onConfirm={() => void confirmToggle(toggling)}
        />
      )}
    </div>
  );
}

/** Modal criar/editar regra (Add/EditAutomationRule do v4). */
function RuleDialog({
  accountId,
  initial,
  onClose,
  onSaved,
}: {
  accountId: number;
  initial?: AutomationRule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      event_name: (initial?.event_name as Values["event_name"]) ?? "conversation_created",
      active: initial?.active ?? true,
      execution_delay: initial?.execution_delay ? String(initial.execution_delay) : "",
    },
  });
  const active = useWatch({ control: form.control, name: "active" });
  const [conditions, setConditions] = useState<AutomationCondition[]>(initial?.conditions ?? []);
  const [actions, setActions] = useState<MacroAction[]>(initial?.actions ?? []);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-3xl rounded-xl border border-border bg-card p-5 shadow-lg">
        <h2 className="mb-1 text-base font-semibold text-woot-slate-12">
          {initial ? "Editar regra de automação" : "Adicionar regra de automação"}
        </h2>
        <p className="mb-3 text-sm text-woot-slate-11">
          Quando um evento acontece e as condições batem, as ações rodam sozinhas.
        </p>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            if (actions.length === 0) {
              setError("Adicione ao menos uma ação");
              return;
            }
            const delay = values.execution_delay?.trim() ? Number(values.execution_delay) : null;
            if (delay !== null && (!Number.isFinite(delay) || delay < 10)) {
              setError("A espera mínima é de 10 minutos");
              return;
            }
            try {
              const body = JSON.stringify({
                name: values.name,
                description: values.description || undefined,
                event_name: values.event_name,
                conditions,
                actions,
                active: values.active,
                execution_delay: delay,
              });
              if (initial) {
                await apiFetch(`/api/v1/accounts/${accountId}/automation_rules/${initial.id}`, {
                  method: "PATCH",
                  body,
                });
              } else {
                await apiFetch(`/api/v1/accounts/${accountId}/automation_rules`, {
                  method: "POST",
                  body,
                });
              }
              onSaved();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Erro inesperado");
            }
          })}
          className="grid gap-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rule-name">Nome da regra</Label>
              <Input id="rule-name" {...form.register("name")} placeholder="Urgente → time X" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rule-event">Evento</Label>
              <select
                id="rule-event"
                {...form.register("event_name")}
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
              >
                {AUTOMATION_EVENTS.map((e) => (
                  <option key={e} value={e}>
                    {EVENT_LABELS[e] ?? e}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rule-desc">Descrição</Label>
            <Input
              id="rule-desc"
              {...form.register("description")}
              placeholder="O que essa regra faz"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Condições (vazio = sempre)</Label>
            <ConditionRows conditions={conditions} keys={CONDITION_KEYS} onChange={setConditions} />
          </div>
          <div className="grid gap-1.5">
            <Label>Ações</Label>
            <ActionRows actions={actions} options={AUTOMATION_ACTIONS} onChange={setActions} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-woot-slate-12">
              <Checkbox
                checked={active}
                onCheckedChange={(v) => form.setValue("active", v === true)}
              />
              Regra ativa
            </label>
            <div className="grid gap-1.5">
              <Label htmlFor="rule-delay">Esperar (minutos, mín. 10 — vazio = na hora)</Label>
              <Input
                id="rule-delay"
                inputMode="numeric"
                {...form.register("execution_delay")}
                placeholder="ex.: 60"
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {initial ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Modal de confirmação genérico (excluir / ativar / pausar). */
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  rejectLabel,
  busy,
  onClose,
  onConfirm,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  rejectLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <h2 className="mb-1 text-base font-semibold text-woot-slate-12">{title}</h2>
        <p className="mb-4 text-sm text-woot-slate-11">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {rejectLabel}
          </Button>
          <Button
            variant={title.startsWith("Pausar") ? "default" : "destructive"}
            disabled={busy}
            onClick={onConfirm}
          >
            <Check className="size-4" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
