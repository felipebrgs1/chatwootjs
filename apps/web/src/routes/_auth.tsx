import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppRail } from "@/components/app-rail";
import { SessionProvider } from "@/components/session-provider";
import { getAccessToken } from "@/lib/auth";

export const Route = createFileRoute("/_auth")({
  beforeLoad: () => {
    if (!getAccessToken()) {
      throw redirect({ to: "/auth/login" });
    }
  },
  component: AuthLayout,
});

/** Shell autenticado: icon rail 56px + conteúdo. */
function AuthLayout() {
  return (
    <SessionProvider>
      <div className="flex h-svh bg-woot-bg">
        <AppRail />
        <div className="flex min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </SessionProvider>
  );
}
