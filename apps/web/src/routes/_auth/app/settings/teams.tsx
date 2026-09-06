import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";
import { listTeams, type Team } from "@/lib/automation";

export const Route = createFileRoute("/_auth/app/settings/teams")({
  component: TeamsSettings,
});

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  description: z.string().optional(),
  allow_auto_assign: z.boolean(),
});

type Values = z.infer<typeof schema>;

interface Agent {
  id: number;
  name: string;
  email: string;
}

function TeamsSettings() {
  const { session } = useSessionContext();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [addUserId, setAddUserId] = useState("");
  const isAdmin = session?.account.role === "administrator";
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", allow_auto_assign: true },
  });
  const allowAuto = form.watch("allow_auto_assign");

  async function refresh(): Promise<void> {
    setTeams(await listTeams(session!.accountId));
    const a = await apiFetch<{ agents: Agent[] }>(`/api/v1/accounts/${session!.accountId}/agents`);
    setAgents(a.agents);
  }

  useEffect(() => {
    if (session) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function onSubmit(values: Values): Promise<void> {
    setError(null);
    try {
      if (editing) {
        await apiFetch(`/api/v1/accounts/${session!.accountId}/teams/${editing}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
      } else {
        await apiFetch(`/api/v1/accounts/${session!.accountId}/teams`, {
          method: "POST",
          body: JSON.stringify(values),
        });
      }
      setEditing(null);
      form.reset({ name: "", description: "", allow_auto_assign: true });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  async function remove(id: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${session!.accountId}/teams/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function addMember(teamId: number): Promise<void> {
    if (!addUserId) return;
    await apiFetch(`/api/v1/accounts/${session!.accountId}/teams/${teamId}/team_members`, {
      method: "POST",
      body: JSON.stringify({ user_ids: [Number(addUserId)] }),
    });
    setAddingTo(null);
    setAddUserId("");
    await refresh();
  }

  async function removeMember(teamId: number, userId: number): Promise<void> {
    await apiFetch(
      `/api/v1/accounts/${session!.accountId}/teams/${teamId}/team_members/${userId}`,
      { method: "DELETE" },
    );
    await refresh();
  }

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-lg font-semibold">Configurações · Times</h1>
        <p className="text-sm text-muted-foreground">
          Agrupe agentes para atribuição e roteamento de conversas.
        </p>
      </header>
      <main className="grid max-w-2xl content-start gap-4 p-6">
        {isAdmin && (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-3 rounded-lg border bg-card p-4"
          >
            <h2 className="text-sm font-medium">{editing ? "Editar time" : "Novo time"}</h2>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...form.register("name")} placeholder="suporte" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" {...form.register("description")} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allowAuto}
                onCheckedChange={(v) => form.setValue("allow_auto_assign", v === true)}
              />
              Atribuição automática
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editing ? "Salvar" : "Criar"}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(null);
                    form.reset({ name: "", description: "", allow_auto_assign: true });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}
        <section className="rounded-lg border bg-card">
          {teams === null ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : teams.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum time ainda.</p>
          ) : (
            <ul className="divide-y">
              {teams.map((team) => (
                <li key={team.id} className="grid gap-2 p-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{team.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {team.members.length} membro(s)
                        {team.conversations_count !== undefined &&
                          ` · ${team.conversations_count} conversa(s)`}
                      </p>
                    </div>
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Adicionar membro em ${team.name}`}
                          onClick={() => setAddingTo(addingTo === team.id ? null : team.id)}
                        >
                          <Plus className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Editar ${team.name}`}
                          onClick={() => {
                            setEditing(team.id);
                            form.reset({
                              name: team.name,
                              description: team.description ?? "",
                              allow_auto_assign: team.allow_auto_assign,
                            });
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remover ${team.name}`}
                          onClick={() => void remove(team.id)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.map((m) => (
                      <span
                        key={m.id}
                        className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                      >
                        {m.name}
                        {isAdmin && (
                          <button
                            type="button"
                            aria-label={`Remover ${m.name} do time`}
                            onClick={() => void removeMember(team.id, m.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {isAdmin && addingTo === team.id && (
                    <div className="flex gap-2">
                      <select
                        value={addUserId}
                        onChange={(e) => setAddUserId(e.target.value)}
                        className="h-9 flex-1 rounded-lg border border-input bg-background px-2 text-sm"
                      >
                        <option value="">Selecionar agente...</option>
                        {agents
                          .filter((a) => !team.members.some((m) => m.id === a.id))
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.email})
                            </option>
                          ))}
                      </select>
                      <Button size="sm" onClick={() => void addMember(team.id)}>
                        Adicionar
                      </Button>
                    </div>
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
