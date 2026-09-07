import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";
import { listTeams, type Team } from "@/lib/automation";

export const Route = createFileRoute("/_auth/app/settings/teams/new")({
  component: NewTeamPage,
});

interface Agent {
  id: number;
  name: string;
  email: string;
}

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  description: z.string().optional(),
  allow_auto_assign: z.boolean(),
});

type Values = z.infer<typeof schema>;

function NewTeamPage() {
  const { session } = useSessionContext();
  const navigate = useNavigate();
  if (!session) return null;
  return (
    <TeamForm
      accountId={session.accountId}
      onDone={(id) =>
        void navigate({ to: "/app/settings/teams/$teamId", params: { teamId: String(id) } })
      }
    />
  );
}

/** Form de criar/editar time 1:1 com TeamForm do v4 (dados + membros). */
export function TeamForm({
  accountId,
  initial,
  onDone,
}: {
  accountId: number;
  initial?: Team;
  onDone: (id: number) => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      allow_auto_assign: initial?.allow_auto_assign ?? true,
    },
  });
  const allowAuto = useWatch({ control: form.control, name: "allow_auto_assign" });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memberIds, setMemberIds] = useState<number[]>(() =>
    (initial?.members ?? []).map((m) => m.id),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ agents: Agent[] }>(`/api/v1/accounts/${accountId}/agents`).then((d) =>
      setAgents(d.agents),
    );
  }, [accountId]);

  async function syncMembers(teamId: number, wanted: number[]): Promise<void> {
    const fresh = await listTeams(accountId);
    const row = fresh.find((t) => t.id === teamId);
    const existing = new Set(row?.members.map((m) => m.id) ?? []);
    for (const id of wanted.filter((id) => !existing.has(id))) {
      await apiFetch(`/api/v1/accounts/${accountId}/teams/${teamId}/team_members`, {
        method: "POST",
        body: JSON.stringify({ user_ids: [id] }),
      });
    }
    for (const id of [...existing].filter((id) => !wanted.includes(id))) {
      await apiFetch(`/api/v1/accounts/${accountId}/teams/${teamId}/team_members/${id}`, {
        method: "DELETE",
      });
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-woot-bg">
      <header className="shrink-0 px-6">
        <div className="mx-auto w-full max-w-2xl py-6">
          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/app/settings/teams"
              className="text-woot-slate-11 hover:text-woot-slate-12 hover:underline"
            >
              Times
            </Link>
            <ChevronRight className="size-4 text-woot-slate-10" />
            <span className="font-medium text-woot-slate-12">
              {initial ? initial.name : "Novo time"}
            </span>
          </nav>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-6">
        <form
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              let id = initial?.id;
              if (initial) {
                await apiFetch(`/api/v1/accounts/${accountId}/teams/${initial.id}`, {
                  method: "PATCH",
                  body: JSON.stringify(values),
                });
              } else {
                const d = await apiFetch<{ team: Team }>(`/api/v1/accounts/${accountId}/teams`, {
                  method: "POST",
                  body: JSON.stringify(values),
                });
                id = d.team.id;
              }
              await syncMembers(id!, memberIds);
              onDone(id!);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Erro inesperado");
            }
          })}
          className="mx-auto grid w-full max-w-2xl gap-4 pb-6"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="team-name">Nome</Label>
            <Input id="team-name" {...form.register("name")} placeholder="suporte" />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="team-desc">Descrição</Label>
            <Input id="team-desc" {...form.register("description")} />
          </div>
          <label className="flex items-center gap-2 text-sm text-woot-slate-12">
            <Checkbox
              checked={allowAuto}
              onCheckedChange={(v) => form.setValue("allow_auto_assign", v === true)}
            />
            Atribuição automática
          </label>
          <div className="grid gap-1.5">
            <Label>Membros</Label>
            <div className="rounded-xl border border-border bg-card">
              {agents.length === 0 ? (
                <p className="p-3 text-xs text-muted-foreground">Nenhum agente na conta.</p>
              ) : (
                <ul className="max-h-64 divide-y divide-border overflow-y-auto">
                  {agents.map((agent) => {
                    const checked = memberIds.includes(agent.id);
                    return (
                      <li key={agent.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              setMemberIds((prev) =>
                                v === true
                                  ? [...prev, agent.id]
                                  : prev.filter((mid) => mid !== agent.id),
                              )
                            }
                          />
                          <WootAvatar name={agent.name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-woot-slate-12">
                              {agent.name}
                            </span>
                            <span className="block truncate text-xs text-woot-slate-11">
                              {agent.email}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
              {initial ? "Salvar" : "Criar time"}
            </Button>
            <Link to="/app/settings/teams">
              <Button type="button" size="sm" variant="ghost">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
