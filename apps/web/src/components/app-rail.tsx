import { Bell, BookOpen, Inbox, Megaphone, Settings, Users } from "lucide-react";
import { BarChart3 } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";

import { WootAvatar } from "@my-better-t-app/ui/components/woot-avatar";
import { cn } from "@my-better-t-app/ui/lib/utils";

const ITEMS = [
  { to: "/app", icon: Inbox, label: "Conversas", exact: true },
  { to: "/app/contacts", icon: Users, label: "Contatos" },
  { to: "/app/reports", icon: BarChart3, label: "Relatórios" },
  { to: "/app/campaigns", icon: Megaphone, label: "Campanhas" },
  { to: "/app/helpcenter", icon: BookOpen, label: "Central de ajuda" },
];

/** Icon rail 56px — espelha o layout do Chatwoot. */
export function AppRail() {
  const location = useLocation();
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
          className="flex size-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Settings className="size-5" />
        </Link>
        <WootAvatar name="Admin Demo" size="sm" className="mt-1" />
      </div>
    </nav>
  );
}
