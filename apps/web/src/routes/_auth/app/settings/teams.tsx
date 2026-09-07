import { Plus, Search, Settings, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";

import { useSessionContext } from "@/components/session-provider";
import { apiFetch } from "@/lib/auth";
import { listTeams, type Team } from "@/lib/automation";

export const Route = createFileRoute("/_auth/app/settings/teams")({
  component: TeamsSettings,
});

/**
 * Configurações · Times 1:1 com settings/teams/Index do v4: header com busca
 * + contador + botão, linhas com ícone/nome/descrição e editar/excluir
 * (membros no form de edição).
 */
function TeamsSettings() {
  const { session } = useSessionContext();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<Team | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const isAdmin = session?.account.role === "administrator";

  async function refresh(): Promise<void> {
    setTeams(await listTeams(session!.accountId));
  }

  useEffect(() => {
    if (session) void refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams ?? [];
    return (teams ?? []).filter(
      (t) => t.name.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q),
    );
  }, [teams, query]);

  if (!session) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-woot-bg">
      <header className="shrink-0 px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-medium text-woot-slate-12">Times</h1>
                {(teams?.length ?? 0) > 0 && (
                  <span className="text-sm text-woot-slate-11">
                    {teams!.length} {teams!.length === 1 ? "time" : "times"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-woot-slate-11">
                Agrupe agentes para organizar o atendimento.{" "}
                <a
                  href="https://www.chatwoot.com/hc/user-guide/en/articles/6700272"
                  target="_blank"
                  rel="noreferrer"
                  className="text-woot-blue hover:underline"
                >
                  Saiba mais sobre times
                </a>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-woot-slate-11" />
                <Input
                  type="search"
                  placeholder="Buscar times..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-8 w-56 pl-8"
                />
              </div>
              {isAdmin && (
                <Link to="/app/settings/teams/new">
                  <Button size="sm" className="gap-2">
                    <Plus className="size-4" /> Novo time
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto w-full max-w-5xl pb-6">
          {teams === null ? (
            <p className="py-10 text-center text-sm text-woot-slate-11">Carregando...</p>
          ) : filtered.length === 0 && query ? (
            <p className="py-20 text-center text-base text-woot-slate-11">
              Nenhum time para essa busca.
            </p>
          ) : (
            <div className="divide-y divide-border border-t border-border">
              {filtered.map((team) => (
                <div key={team.id} className="flex items-start justify-between gap-4 py-4">
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="grid size-10 flex-shrink-0 place-content-center rounded-xl border border-border text-lg">
                      <Users className="size-4 text-woot-slate-11" />
                    </span>
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      <span className="block truncate text-base font-medium capitalize text-woot-slate-12">
                        {team.name}
                      </span>
                      {team.description && (
                        <p className="truncate text-sm text-woot-slate-11">{team.description}</p>
                      )}
                      <p className="text-xs text-woot-slate-10">
                        {team.members.length} {team.members.length === 1 ? "membro" : "membros"}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 justify-end gap-3">
                      <Link
                        to="/app/settings/teams/$teamId"
                        params={{ teamId: String(team.id) }}
                        aria-label={`Editar ${team.name}`}
                        title="Editar"
                        className="grid size-7 place-content-center rounded-lg text-woot-slate-11 transition-colors hover:bg-muted hover:text-woot-slate-12"
                      >
                        <Settings className="size-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Excluir"
                        aria-label={`Excluir ${team.name}`}
                        onClick={() => setDeleting(team)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {deleting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h2 className="mb-1 text-base font-semibold text-woot-slate-12">Confirmar exclusão</h2>
            <p className="mb-4 text-sm text-woot-slate-11">
              Tem certeza que deseja excluir <strong>{deleting.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                Não, manter {deleting.name}
              </Button>
              <Button
                variant="destructive"
                disabled={busyId === deleting.id}
                onClick={() => {
                  setBusyId(deleting.id);
                  void apiFetch(`/api/v1/accounts/${session.accountId}/teams/${deleting.id}`, {
                    method: "DELETE",
                  })
                    .then(() => {
                      setDeleting(null);
                      return refresh();
                    })
                    .catch(() => setBusyId(null));
                }}
              >
                Sim, excluir {deleting.name}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
