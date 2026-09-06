import { createFileRoute } from "@tanstack/react-router";

import { useCable } from "@/hooks/use-cable";
import { useSessionContext } from "@/components/session-provider";

export const Route = createFileRoute("/_auth/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { session, loading, switchAccount } = useSessionContext();
  const { connected } = useCable(session?.accountId ?? 0);

  if (loading || !session) {
    return (
      <div className="flex flex-1 items-center justify-center bg-woot-bg">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {session.user.name} ({session.user.email})
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Conta
          <select
            value={session.accountId}
            onChange={(e) => switchAccount(Number(e.target.value))}
            className="rounded-md border bg-white px-2 py-1.5"
          >
            {session.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.role === "administrator" ? "admin" : "agente"})
              </option>
            ))}
          </select>
        </label>
      </header>
      <main className="grid gap-4 p-6 sm:grid-cols-3">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">Conta ativa</h2>
          <p className="text-sm text-muted-foreground">
            {session.account.name} · idioma {session.account.locale}
          </p>
        </section>
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">Realtime (/cable)</h2>
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${connected ? "bg-green-500" : "bg-amber-500"}`}
            />
            <span className="text-sm text-muted-foreground">
              {connected ? "Conectado" : "Servidor WS entra no M4"}
            </span>
          </div>
        </section>
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">Disponibilidade</h2>
          <p className="text-sm text-muted-foreground">
            {session.user.availability === "online"
              ? "Online"
              : session.user.availability === "busy"
                ? "Ocupado"
                : "Offline"}{" "}
            (troque no avatar, canto inferior esquerdo)
          </p>
        </section>
      </main>
    </div>
  );
}
