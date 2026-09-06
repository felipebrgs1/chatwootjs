import { Bell, BookOpen, Inbox, LogOut, Megaphone, Settings, Users } from "lucide-react";
import { BarChart3 } from "lucide-react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@my-better-t-app/ui/components/dropdown-menu";
import { WootAvatar } from "@my-better-t-app/ui/components/woot-avatar";
import { cn } from "@my-better-t-app/ui/lib/utils";

import { useSessionContext } from "@/components/session-provider";
import { apiFetch, signOut } from "@/lib/auth";

const ITEMS = [
  { to: "/app", icon: Inbox, label: "Conversas", exact: true },
  { to: "/app/contacts", icon: Users, label: "Contatos" },
  { to: "/app/reports", icon: BarChart3, label: "Relatórios" },
  { to: "/app/campaigns", icon: Megaphone, label: "Campanhas" },
  { to: "/app/helpcenter", icon: BookOpen, label: "Central de ajuda" },
];

const AVAILABILITY = [
  { value: "online", label: "Online" },
  { value: "busy", label: "Ocupado" },
  { value: "offline", label: "Offline" },
] as const;

/** Icon rail 56px — espelha o layout do Chatwoot. */
export function AppRail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, reload } = useSessionContext();

  async function setAvailability(value: "online" | "busy" | "offline"): Promise<void> {
    await apiFetch("/api/v1/profile", {
      method: "PATCH",
      body: JSON.stringify({ availability: value }),
    });
    await reload();
  }

  async function logout(): Promise<void> {
    await signOut();
    await navigate({ to: "/auth/login" });
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="flex w-14 flex-col items-center gap-1 bg-woot-rail py-3"
    >
      <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-woot-blue text-sm font-bold text-white">
        C
      </div>
      {ITEMS.map((item) => {
        const active = item.exact
          ? location.pathname === item.to
          : location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            title={item.label}
            aria-label={item.label}
            className={cn(
              "flex size-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white",
              active && "bg-white/15 text-white",
            )}
          >
            <item.icon className="size-5" />
          </Link>
        );
      })}
      <div className="mt-auto flex flex-col items-center gap-2">
        <button
          type="button"
          title="Notificações"
          aria-label="Notificações"
          className="flex size-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Bell className="size-5" />
        </button>
        <Link
          to="/app/settings"
          title="Configurações"
          aria-label="Configurações"
          activeOptions={{ exact: false }}
          className="flex size-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings className="size-5" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Minha conta" className="rounded-full">
            <WootAvatar name={session?.user.name ?? "?"} size="sm" className="mt-1" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-52">
            <DropdownMenuLabel>{session?.user.name ?? "Carregando..."}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {AVAILABILITY.map((item) => (
              <DropdownMenuItem key={item.value} onSelect={() => void setAvailability(item.value)}>
                <span
                  className={cn(
                    "size-2 rounded-full",
                    item.value === "online" && "bg-green-500",
                    item.value === "busy" && "bg-amber-500",
                    item.value === "offline" && "bg-slate-400",
                  )}
                />
                {item.label}
                {session?.user.availability === item.value && (
                  <span className="ml-auto text-xs">✓</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void logout()}>
              <LogOut className="size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
