import { createFileRoute } from "@tanstack/react-router";

import { useSessionContext } from "@/components/session-provider";
import { listTeams, type Team } from "@/lib/automation";
import { useEffect, useState } from "react";

import { TeamForm } from "./new";

export const Route = createFileRoute("/_auth/app/settings/teams/$teamId")({
  component: EditTeamPage,
});

function EditTeamPage() {
  const { teamId } = Route.useParams();
  const { session } = useSessionContext();
  const [team, setTeam] = useState<Team | null | undefined>(undefined);

  useEffect(() => {
    if (!session) return;
    void listTeams(session.accountId)
      .then((rows) => setTeam(rows.find((t) => t.id === Number(teamId)) ?? null))
      .catch(() => setTeam(null));
  }, [session, teamId]);

  if (!session) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-woot-bg">
      {team === undefined ? (
        <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
      ) : team === null ? (
        <p className="p-6 text-sm text-muted-foreground">Time não encontrado.</p>
      ) : (
        <TeamForm
          key={team.id}
          accountId={session.accountId}
          initial={team}
          onDone={() => window.history.back()}
        />
      )}
    </div>
  );
}
