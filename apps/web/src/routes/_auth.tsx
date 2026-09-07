import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/search/CommandPalette";
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

/** Shell autenticado: sidebar Chatwoot + conteúdo. */
function AuthLayout() {
  return (
    <SessionProvider>
      <div className="flex h-svh bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
      <CommandPalette />
    </SessionProvider>
  );
}
