import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/superadmin")({
  component: SuperAdminLayout,
});

/** Layout próprio do console (fora do shell autenticado `_auth`). */
function SuperAdminLayout() {
  return (
    <div className="min-h-svh bg-woot-bg">
      <header className="border-b bg-card px-6 py-3">
        <p className="text-sm font-semibold">ChatwootJS · Superadmin</p>
        <p className="text-xs text-muted-foreground">Console de instalação (área separada)</p>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Outlet />
      </main>
    </div>
  );
}
