import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

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

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  description: z.string().optional(),
  event_name: z.enum(AUTOMATION_EVENTS),
  active: z.boolean(),
  execution_delay: z.string().optional(),
});

type Values = z.infer<typeof schema>;

function AutomationsSettings() {
  const { session } = useSessionContext();
  const [items, setItems] = useState<AutomationRule[] | null>(null);
  const [conditions, setConditions] = useState<AutomationCondition[]>([]);
  const [actions, setActions] = useState<MacroAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const isAdmin = session?.account.role === "administrator";
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      event_name: "conversation_created",
      active: true,
      execution_delay: "",
    },
  });
  const active = form.watch("active");

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

  function reset(rule?: AutomationRule): void {
    setEditing(rule?.id ?? null);
    form.reset({
      name: rule?.name ?? "",
      description: rule?.description ?? "",
      event_name: (rule?.event_name as Values["event_name"]) ?? "conversation_created",
      active: rule?.active ?? true,
      execution_delay: rule?.execution_delay ? String(rule.execution_delay) : "",
    });
    setConditions(rule?.conditions ?? []);
    setActions(rule?.actions ?? []);
  }

  async function onSubmit(values: Values): Promise<void> {
    setError(null);
    if (!isAdmin) {
      setError("Só administradores gerenciam automações");
      return;
    }
    if (actions.length === 0) {
      setError("Adicione ao menos uma ação");
      return;
    }
    const delay = values.execution_delay?.trim() ? Number(values.execution_delay) : null;
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
      if (editing) {
        await apiFetch(`/api/v1/accounts/${session!.accountId}/automation_rules/${editing}`, {
          method: "PATCH",
          body,
        });
      } else {
        await apiFetch(`/api/v1/accounts/${session!.accountId}/automation_rules`, {
          method: "POST",
          body,
        });
      }
      reset();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  async function toggle(rule: AutomationRule): Promise<void> {
    await apiFetch(`/api/v1/accounts/${session!.accountId}/automation_rules/${rule.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !rule.active }),
    });
    await refresh();
  }

  async function remove(id: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${session!.accountId}/automation_rules/${id}`, {
      method: "DELETE",
    });
    await refresh();
  }

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-lg font-semibold">Configurações · Automações</h1>
        <p className="text-sm text-muted-foreground">
          Regras evento → condições → ações, executadas em segundos.
        </p>
      </header>
      <main className="grid max-w-2xl content-start gap-4 p-6">
        {isAdmin && (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-3 rounded-lg border bg-card p-4"
          >
            <h2 className="text-sm font-medium">{editing ? "Editar regra" : "Nova regra"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" {...form.register("name")} placeholder="Urgente → time X" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="event_name">Evento</Label>
                <select
                  id="event_name"
                  {...form.register("event_name")}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                >
                  {AUTOMATION_EVENTS.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" {...form.register("description")} />
            </div>
            <div className="grid gap-1.5">
              <Label>Condições (vazio = sempre)</Label>
              <ConditionRows
                conditions={conditions}
                keys={CONDITION_KEYS}
                onChange={setConditions}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Ações</Label>
              <ActionRows actions={actions} options={AUTOMATION_ACTIONS} onChange={setActions} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={active}
                  onCheckedChange={(v) => form.setValue("active", v === true)}
                />
                Regra ativa
              </label>
              <div className="grid gap-1.5">
                <Label htmlFor="execution_delay">Delay em minutos (opcional, mín. 10)</Label>
                <Input
                  id="execution_delay"
                  inputMode="numeric"
                  {...form.register("execution_delay")}
                  placeholder="ex.: 60"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editing ? "Salvar" : "Criar"}
              </Button>
              {editing && (
                <Button type="button" variant="ghost" onClick={() => reset()}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
        <section className="rounded-lg border bg-card">
          {items === null ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="divide-y">
              {items.map((rule) => (
                <li key={rule.id} className="flex items-start gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {rule.name}
                      <span
                        className={
                          rule.active
                            ? "rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-normal text-green-700"
                            : "rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground"
                        }
                      >
                        {rule.active ? "ativa" : "pausada"}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {rule.event_name}
                      {rule.execution_delay ? ` · delay ${rule.execution_delay}min` : ""} ·{" "}
                      {rule.conditions.length} condição(ões) · {rule.actions.length} ação(ões)
                    </p>
                  </div>
                  {isAdmin && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => void toggle(rule)}>
                        {rule.active ? "Pausar" : "Ativar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${rule.name}`}
                        onClick={() => reset(rule)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover ${rule.name}`}
                        onClick={() => void remove(rule.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
