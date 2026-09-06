import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { useCable } from "@/hooks/use-cable";

export const Route = createFileRoute("/_auth/app/")({
  component: DashboardMock,
});

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";

async function fetchHealth(): Promise<{ ok: boolean }> {
  const res = await fetch(`${SERVER_URL}/health`);
  if (!res.ok) throw new Error("API offline");
  return res.json() as Promise<{ ok: boolean }>;
}

/** Dashboard mock do M0 — dados reais entram no M1/M4. */
function DashboardMock() {
  const health = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: false });
  const { connected } = useCable(1);

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Conta Demo — Admin Demo (admin@demo.test)</p>
      </header>
      <main className="grid gap-4 p-6 sm:grid-cols-3">
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">API</h2>
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${health.data ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-sm text-muted-foreground">
              {health.isLoading ? "Verificando..." : health.data ? "Conectada" : "Desconectada"}
            </span>
          </div>
        </section>
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">Realtime (/cable)</h2>
          <div className="flex items-center gap-2">
            <span
              className={`size-2 rounded-full ${connected ? "bg-green-500" : "bg-amber-500"}`}
            />
            <span className="text-sm text-muted-foreground">
              {connected ? "Conectado" : "Stub M0 — servidor WS entra no M4"}
            </span>
          </div>
        </section>
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium">Seed</h2>
          <p className="text-sm text-muted-foreground">
            admin@demo.test / password123 (Bearer demo-token)
          </p>
        </section>
      </main>
    </div>
  );
}
