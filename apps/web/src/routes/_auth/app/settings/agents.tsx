import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/agents")({
  component: AgentsSettings,
});

type Role = "agent" | "administrator";

interface Agent {
  id: number;
  name: string;
  email: string;
  role: Role;
  confirmed: boolean;
}

const ROLE_LABEL: Record<Role, string> = {
  agent: "Agente",
  administrator: "Administrador",
};

async function loadAgents(accountId: number): Promise<Agent[]> {
  const data = await apiFetch<{ agents: Agent[] }>(`/api/v1/accounts/${accountId}/agents`);
  return data.agents;
}

/**
 * Configurações · Agentes 1:1 com settings/agents/Index do v4: header com
 * busca + contador + botão, linhas com avatar/nome/e-mail/papel e modais de
 * adicionar/editar/excluir.
 */
function AgentsSettings() {
  const { session } = useSessionContext();
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState<Agent | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const isAdmin = session?.account.role === "administrator";

  async function refresh(): Promise<void> {
    setAgents(await loadAgents(session!.accountId));
  }

  useEffect(() => {
    if (session) void refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return agents ?? [];
    return (agents ?? []).filter(
      (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q),
    );
  }, [agents, query]);

  if (!session) return null;
  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center bg-woot-bg">
        <p className="text-sm text-muted-foreground">Só administradores acessam esta página.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-woot-bg">
      <header className="shrink-0 px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-medium text-woot-slate-12">Agentes</h1>
                {(agents?.length ?? 0) > 0 && (
                  <span className="text-sm text-woot-slate-11">
                    {agents!.length} {agents!.length === 1 ? "agente" : "agentes"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-woot-slate-11">
                Agentes atendem e respondem as mensagens. A lista mostra todos os agentes da conta.{" "}
                <a
                  href="https://www.chatwoot.com/hc/user-guide/en/articles/654852"
                  target="_blank"
                  rel="noreferrer"
                  className="text-woot-blue hover:underline"
                >
                  Saiba mais sobre papéis
                </a>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-woot-slate-11" />
                <Input
                  type="search"
                  placeholder="Buscar agentes..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-8 w-56 pl-8"
                />
              </div>
              <Button size="sm" onClick={() => setAdding(true)} className="gap-2">
                <Plus className="size-4" /> Adicionar agente
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto w-full max-w-5xl pb-6">
          {agents === null ? (
            <p className="py-10 text-center text-sm text-woot-slate-11">Carregando...</p>
          ) : filtered.length === 0 && query ? (
            <p className="py-20 text-center text-base text-woot-slate-11">
              Nenhum agente para essa busca.
            </p>
          ) : (
            <div className="divide-y divide-border border-t border-border">
              {filtered.map((agent) => (
                <div key={agent.email} className="flex items-start justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <WootAvatar name={agent.name} size="md" className="size-10 text-sm" />
                    <div className="flex min-w-0 flex-col items-start gap-1.5">
                      <span className="block truncate text-base font-medium capitalize text-woot-slate-12">
                        {agent.name}
                      </span>
                      <span className="flex items-center gap-2 text-sm">
                        <span className="truncate text-woot-slate-11">{agent.email}</span>
                        <span className="h-3 w-px rounded-lg bg-border" aria-hidden="true" />
                        <span className="text-woot-slate-11">{ROLE_LABEL[agent.role]}</span>
                        {!agent.confirmed && (
                          <>
                            <span className="h-3 w-px rounded-lg bg-border" aria-hidden="true" />
                            <span className="text-amber-700">convite pendente</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 justify-end gap-3">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title="Editar"
                      aria-label={`Editar ${agent.name}`}
                      onClick={() => setEditing(agent)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {agent.id !== session.user.id && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Excluir"
                        aria-label={`Excluir ${agent.name}`}
                        onClick={() => setDeleting(agent)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {adding && (
        <AgentDialog
          accountId={session.accountId}
          onClose={() => setAdding(false)}
          onSaved={(invitation) => {
            if (!invitation) setAdding(false);
            void refresh();
          }}
        />
      )}
      {editing && (
        <AgentDialog
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
            void apiFetch(`/api/v1/accounts/${session.accountId}/agents/${deleting.id}`, {
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
    </div>
  );
}

const agentSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  email: z.email("E-mail inválido"),
  role: z.enum(["agent", "administrator"]),
});

type AgentValues = z.infer<typeof agentSchema>;

/** Modal adicionar/editar agente (AddAgent/EditAgent do v4). */
function AgentDialog({
  accountId,
  initial,
  onClose,
  onSaved,
}: {
  accountId: number;
  initial?: Agent;
  onClose: () => void;
  onSaved: (invitation?: { email: string; link: string }) => void;
}) {
  const navigate = useNavigate();
  const form = useForm<AgentValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: initial?.name ?? "",
      email: initial?.email ?? "",
      role: initial?.role ?? "agent",
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ email: string; link: string } | null>(null);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <h2 className="mb-1 text-base font-semibold text-woot-slate-12">
          {initial ? "Editar agente" : "Adicionar agente"}
        </h2>
        <p className="mb-3 text-sm text-woot-slate-11">
          {initial ? "Atualize os dados do agente." : "Convide alguém para atender nesta conta."}
        </p>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            setInvited(null);
            try {
              if (initial) {
                await apiFetch(`/api/v1/accounts/${accountId}/agents/${initial.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ name: values.name, role: values.role }),
                });
                onSaved();
              } else {
                const data = await apiFetch<{ agent: Agent; invitation_token?: string }>(
                  `/api/v1/accounts/${accountId}/agents`,
                  { method: "POST", body: JSON.stringify(values) },
                );
                if (data.invitation_token) {
                  // Mantém o modal aberto exibindo o link do convite.
                  const invitation = {
                    email: data.agent.email,
                    link: `${window.location.origin}/auth/invitation?token=${data.invitation_token}`,
                  };
                  setInvited(invitation);
                  onSaved(invitation);
                } else {
                  onSaved();
                }
              }
            } catch (err) {
              setError(
                err instanceof ApiError
                  ? (Object.values(err.attributes ?? {})[0]?.[0] ?? err.message)
                  : "Erro inesperado",
              );
            }
          })}
          className="grid gap-3"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="agent-name">Nome</Label>
            <Input id="agent-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="agent-email">E-mail</Label>
            <Input
              id="agent-email"
              type="email"
              disabled={Boolean(initial)}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="agent-role">Papel</Label>
            <select
              id="agent-role"
              {...form.register("role")}
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="agent">Agente</option>
              <option value="administrator">Administrador</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {invited && (
            <p className="text-sm text-woot-slate-11">
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
              </button>
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {initial ? "Salvar" : "Convidar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Modal de confirmação genérico. */
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
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
