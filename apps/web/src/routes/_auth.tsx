import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppRail } from "@/components/app-rail";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
});

/** Shell autenticado: icon rail 56px + conteúdo (mock até o M1). */
function AuthLayout() {
  return (
    <div className="flex h-svh bg-woot-bg">
      <AppRail />
      <div className="flex min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
