import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { Label } from "@my-better-t-app/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";

import { useSessionContext } from "@/components/session-provider";
import { WootAvatar } from "@my-better-t-app/ui/components/woot-avatar";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/agents")({
  component: AgentsSettings,
});

const InviteSchema = z.object({
  email: z.email("E-mail inválido"),
  name: z.string().trim().optional(),
  role: z.enum(["agent", "administrator"]),
});

type InviteInput = z.infer<typeof InviteSchema>;
type Role = "agent" | "administrator";

interface Agent {
  id: number;
  name: string;
  email: string;
  role: Role;
  confirmed: boolean;
}

async function loadAgents(accountId: number): Promise<Agent[]> {
  const data = await apiFetch<{ agents: Agent[] }>(`/api/v1/accounts/${accountId}/agents`);
  return data.agents;
}

function AgentsSettings() {
  const { session } = useSessionContext();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ email: string; link: string } | null>(null);
  const form = useForm<InviteInput>({
    resolver: zodResolver(InviteSchema),
    defaultValues: { role: "agent" },
  });
  const isAdmin = session?.account.role === "administrator";

  useEffect(() => {
    if (session && agents === null) {
      void loadAgents(session.accountId)
        .then(setAgents)
        .catch(() => setError("Falha ao carregar agentes"));
    }
  }, [session, agents]);

  if (!session) return null;
  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center bg-woot-bg">
        <p className="text-sm text-muted-foreground">Só administradores acessam esta página.</p>
      </div>
    );
  }

  async function refresh(): Promise<void> {
    setAgents(await loadAgents(session!.accountId));
  }

  async function onInvite(input: InviteInput): Promise<void> {
    setError(null);
    setInvited(null);
    try {
      const data = await apiFetch<{ agent: Agent; invitation_token?: string }>(
        `/api/v1/accounts/${session!.accountId}/agents`,
        { method: "POST", body: JSON.stringify(input) },
      );
      if (data.invitation_token) {
        const origin = window.location.origin;
        setInvited({
          email: data.agent.email,
          link: `${origin}/auth/invitation?token=${data.invitation_token}`,
        });
      }
      form.reset({ role: "agent" });
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? (err.attributes?.email?.[0] ?? err.message) : "Erro inesperado",
      );
    }
  }

  async function changeRole(id: number, role: Role): Promise<void> {
    await apiFetch(`/api/v1/accounts/${session!.accountId}/agents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    await refresh();
  }

  async function remove(id: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${session!.accountId}/agents/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Configurações · Agentes</h1>
        <p className="text-sm text-muted-foreground">{session.account.name}</p>
      </header>
      <main className="grid max-w-3xl gap-4 p-6">
        <form
          onSubmit={form.handleSubmit(onInvite)}
          className="grid gap-3 rounded-lg border bg-white p-4"
        >
          <h2 className="text-sm font-medium">Convidar agente</h2>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...form.register("email")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input id="name" {...form.register("name")} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="role">Papel</Label>
            <select id="role" {...form.register("role")} className="rounded-md border px-2 py-1.5">
              <option value="agent">Agente</option>
              <option value="administrator">Administrador</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {invited && (
            <p className="text-sm">
              Convite para {invited.email}:{" "}
              <button
                type="button"
                className="font-medium text-woot-blue hover:underline"
                onClick={() =>
                  void navigate({
                    to: "/auth/invitation",
                    search: { token: invited.link.split("token=")[1]! },
                  })
                }
              >
                abrir link do convite
              </button>{" "}
              (envio por e-mail no M10)
            </p>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting} className="w-fit">
            Convidar
          </Button>
        </form>
        <section className="rounded-lg border bg-white">
          {agents === null ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="divide-y">
              {agents.map((agent) => (
                <li key={agent.id} className="flex items-center gap-3 p-4">
                  <WootAvatar name={agent.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{agent.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {agent.email} · {agent.role === "administrator" ? "Administrador" : "Agente"}
                      {!agent.confirmed && " · convite pendente"}
                    </p>
                  </div>
                  {agent.id !== session.user.id && (
                    <>
                      <select
                        value={agent.role}
                        onChange={(e) => void changeRole(agent.id, e.target.value as Role)}
                        className="rounded-md border px-2 py-1 text-xs"
                      >
                        <option value="agent">Agente</option>
                        <option value="administrator">Administrador</option>
                      </select>
                      <Button variant="ghost" size="sm" onClick={() => void remove(agent.id)}>
                        Remover
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
