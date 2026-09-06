import {
  AtSign,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Contact,
  Folder,
  Inbox,
  Layers,
  LogOut,
  Megaphone,
  MessageCircle,
  MessageSquare,
  PenLine,
  Search,
  Settings,
  Smartphone,
  Tag,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@chatwootjs/ui/components/dropdown-menu";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import { useSessionContext } from "@/components/session-provider";
import { apiFetch, signOut } from "@/lib/auth";

const AVAILABILITY = [
  { value: "online", label: "Online", dot: "bg-green-500" },
  { value: "busy", label: "Ocupado", dot: "bg-amber-500" },
  { value: "offline", label: "Offline", dot: "bg-slate-400" },
] as const;

type Availability = (typeof AVAILABILITY)[number]["value"];

interface NavLeaf {
  label: string;
  to?: string;
  icon?: React.ComponentType<{ className?: string }>;
  soon?: boolean;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  defaultOpen?: boolean;
  children?: NavLeaf[];
}

const NAV: NavGroup[] = [
  { label: "My Inbox", icon: Inbox, to: "/app" },
  {
    label: "Conversations",
    icon: MessageCircle,
    to: "/app",
    defaultOpen: true,
    children: [
      { label: "All Conversations", to: "/app", icon: Inbox },
      { label: "Mentions", icon: AtSign, soon: true },
      { label: "Unattended", icon: Clock, soon: true },
    ],
  },
  { label: "Folders", icon: Folder, children: [] },
  { label: "Teams", icon: Users, children: [] },
  { label: "Channels", icon: Layers, children: [] },
  { label: "Labels", icon: Tag, children: [] },
  {
    label: "Contacts",
    icon: Contact,
    children: [{ label: "All Contacts", to: "/app/contacts", icon: Contact }],
  },
  {
    label: "Reports",
    icon: BarChart3,
    children: [{ label: "Overview", to: "/app/reports", icon: BarChart3 }],
  },
  {
    label: "Campaigns",
    icon: Megaphone,
    children: [
      { label: "Ongoing", to: "/app/campaigns", icon: MessageSquare },
      { label: "One-time", to: "/app/campaigns", icon: Smartphone },
    ],
  },
  {
    label: "Help Center",
    icon: BookOpen,
    children: [{ label: "All Articles", to: "/app/helpcenter", icon: BookOpen }],
  },
  {
    label: "Settings",
    icon: Settings,
    defaultOpen: true,
    children: [
      { label: "General", to: "/app/settings/general", icon: Settings },
      { label: "Agents", to: "/app/settings/agents", icon: Users },
    ],
  },
];

const COLLAPSE_BELOW = 120;
const MIN_WIDTH = 56;
const MAX_WIDTH = 320;
const DEFAULT_WIDTH = 240;
const WIDTH_KEY = "cw_sidebar_width";

function loadWidth(): number {
  const raw = Number(localStorage.getItem(WIDTH_KEY));
  if (Number.isFinite(raw) && raw >= MIN_WIDTH && raw <= MAX_WIDTH) return raw;
  return DEFAULT_WIDTH;
}

/** Sidebar branca estilo Chatwoot v4: account switcher, busca, árvore de navegação, perfil. */
export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, reload, switchAccount } = useSessionContext();
  const [width, setWidth] = useState<number>(() => loadWidth());
  const [resizing, setResizing] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV.filter((g) => g.defaultOpen).map((g) => [g.label, true])),
  );
  const asideRef = useRef<HTMLElement>(null);

  const collapsed = width < COLLAPSE_BELOW;
  const activePath = location.pathname;

  useEffect(() => {
    localStorage.setItem(WIDTH_KEY, String(width));
  }, [width]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: PointerEvent) => {
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, e.clientX));
      setWidth(next);
    };
    const onUp = () => setResizing(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [resizing]);

  function isActive(to?: string): boolean {
    if (!to) return false;
    if (to === "/app") return activePath === "/app" || activePath === "/app/";
    return activePath === to || activePath.startsWith(`${to}/`);
  }

  function toggleGroup(label: string): void {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  async function setAvailability(value: Availability): Promise<void> {
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
    <aside
      ref={asideRef}
      aria-label="Navegação principal"
      style={{ width: `${collapsed ? MIN_WIDTH : width}px` }}
      className="relative flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden border-r border-border bg-background text-sm"
    >
      {/* Topo: logo + account switcher */}
      <div className={cn("grid gap-2", collapsed ? "mb-6 mt-3 gap-4" : "mb-4 mt-1 gap-2")}>
        <div
          className={cn(
            "flex min-w-0 items-center gap-2",
            collapsed ? "justify-center px-1" : "px-2",
          )}
        >
          {!collapsed && (
            <>
              <div className="grid size-6 flex-shrink-0 place-content-center">
                <div className="flex size-4 items-center justify-center rounded bg-woot-blue text-[10px] font-bold text-white">
                  C
                </div>
              </div>
              <div className="h-3 w-px flex-shrink-0 bg-border" />
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Trocar de conta"
              className={cn(
                "flex min-w-0 items-center gap-1 rounded-lg px-1 py-1.5 font-medium hover:bg-muted",
                collapsed ? "justify-center" : "flex-grow",
              )}
            >
              <WootAvatar name={session?.account.name ?? "?"} size="sm" />
              {!collapsed && (
                <>
                  <span className="flex-grow truncate text-start">
                    {session?.account.name ?? "..."}
                  </span>
                  <ChevronsUpDown className="size-4 flex-shrink-0 text-muted-foreground" />
                </>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Contas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {session?.accounts.map((account) => (
                <DropdownMenuItem
                  key={account.id}
                  onSelect={() => switchAccount(account.id)}
                  className="gap-2"
                >
                  <WootAvatar name={account.name} size="sm" />
                  <span className="flex-grow truncate">{account.name}</span>
                  {account.id === session.accountId && <Check className="size-4 text-woot-blue" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Busca + nova conversa */}
        <div className={cn("flex gap-2", collapsed ? "flex-col items-center" : "px-2")}>
          <button
            type="button"
            title="Busca global (⌘K) — chega no M11"
            className={cn(
              "flex h-7 items-center gap-2 rounded-lg border border-border bg-muted/50 px-2 text-muted-foreground transition-colors hover:bg-muted",
              collapsed ? "size-8 justify-center px-0" : "w-full",
            )}
          >
            <Search className="size-4 flex-shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-grow text-start">Buscar...</span>
                <kbd className="pointer-events-none select-none text-[10px] tracking-wide">⌘K</kbd>
              </>
            )}
          </button>
          <button
            type="button"
            title="Nova conversa — chega no M4"
            aria-label="Nova conversa"
            className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted sm:h-7 sm:size-auto sm:px-2"
          >
            <PenLine className="size-4" />
          </button>
        </div>
      </div>

      {/* Árvore de navegação */}
      <nav
        className={cn(
          "grid min-h-0 flex-grow gap-2 overflow-y-auto pb-5",
          collapsed ? "px-1" : "px-2",
        )}
      >
        <ul className={cn("flex min-w-0 list-none flex-col gap-0.5", collapsed && "items-center")}>
          {NAV.map((group) => {
            const GroupIcon = group.icon;
            const hasChildren = group.children !== undefined;
            const open = openGroups[group.label] ?? false;
            const groupActive =
              isActive(group.to) || (group.children ?? []).some((c) => isActive(c.to));
            if (collapsed) {
              return (
                <li key={group.label}>
                  <Link
                    to={group.to ?? "/app"}
                    title={group.label}
                    aria-label={group.label}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      groupActive && "bg-woot-nav-active-bg text-woot-blue",
                    )}
                  >
                    <GroupIcon className="size-4" />
                  </Link>
                </li>
              );
            }
            return (
              <li key={group.label}>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
                    groupActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.label)}
                      aria-expanded={open}
                      className="flex flex-grow items-center gap-2 rounded hover:text-foreground"
                    >
                      <GroupIcon className="size-4 flex-shrink-0" />
                      <span className="flex-grow truncate text-start font-medium">
                        {group.label}
                      </span>
                      <ChevronDown
                        className={cn("size-3.5 transition-transform", !open && "-rotate-90")}
                      />
                    </button>
                  ) : (
                    <Link
                      to={group.to ?? "/app"}
                      className="flex flex-grow items-center gap-2 hover:text-foreground"
                    >
                      <GroupIcon className="size-4 flex-shrink-0" />
                      <span className="flex-grow truncate font-medium">{group.label}</span>
                    </Link>
                  )}
                </div>
                {hasChildren && open && (
                  <ul className="ml-4 flex flex-col gap-px border-l border-border pl-2">
                    {(group.children ?? []).length === 0 && (
                      <li className="px-2 py-1 text-xs text-muted-foreground/70">
                        Nada aqui ainda
                      </li>
                    )}
                    {(group.children ?? []).map((leaf) => {
                      const LeafIcon = leaf.icon;
                      const active = isActive(leaf.to);
                      const content = (
                        <>
                          {LeafIcon && <LeafIcon className="size-3.5 flex-shrink-0" />}
                          <span className="flex-grow truncate">{leaf.label}</span>
                        </>
                      );
                      return (
                        <li key={leaf.label}>
                          {leaf.to && !leaf.soon ? (
                            <Link
                              to={leaf.to}
                              className={cn(
                                "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted",
                                active
                                  ? "bg-woot-nav-active-bg font-medium text-woot-blue"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {content}
                            </Link>
                          ) : (
                            <span
                              title="Chega nos próximos módulos"
                              className="flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground/60"
                            >
                              {content}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Rodapé: perfil */}
      <div className="flex-shrink-0 border-t border-border px-1 py-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Minha conta"
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-muted",
              collapsed && "justify-center px-0",
            )}
          >
            <span className="relative flex-shrink-0">
              <WootAvatar name={session?.user.name ?? "?"} size="sm" />
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-background",
                  session?.user.availability === "busy"
                    ? "bg-amber-500"
                    : session?.user.availability === "offline"
                      ? "bg-slate-400"
                      : "bg-green-500",
                )}
              />
            </span>
            {!collapsed && (
              <>
                <span className="min-w-0 flex-grow text-start">
                  <span className="block truncate font-medium">{session?.user.name ?? "..."}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {session?.user.email ?? ""}
                  </span>
                </span>
                <ChevronRight className="size-4 flex-shrink-0 text-muted-foreground" />
              </>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuLabel>{session?.user.name ?? "Minha conta"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {AVAILABILITY.map((item) => (
              <DropdownMenuItem
                key={item.value}
                onSelect={() => void setAvailability(item.value)}
                className="gap-2"
              >
                <span className={cn("size-2 rounded-full", item.dot)} />
                {item.label}
                {session?.user.availability === item.value && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void logout()} className="gap-2">
              <LogOut className="size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Alça de redimensionar */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionar barra lateral"
        onPointerDown={(e) => {
          e.preventDefault();
          setResizing(true);
        }}
        onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
        className="group absolute right-0 top-0 z-40 hidden h-full w-1 cursor-col-resize md:block"
      >
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-px bg-transparent transition-colors group-hover:bg-woot-blue",
            resizing && "bg-woot-blue",
          )}
        />
      </div>
    </aside>
  );
}
