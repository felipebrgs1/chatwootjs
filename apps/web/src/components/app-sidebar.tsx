import {
  AtSign,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  Contact,
  Folder,
  Globe,
  Inbox,
  LogOut,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquareQuote,
  Monitor,
  Moon,
  Palette,
  PenLine,
  Phone,
  Repeat,
  Search,
  Settings,
  SquareUser,
  Sun,
  Tag,
  ToyBrick,
  Users,
  Webhook,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@chatwootjs/ui/components/dropdown-menu";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { ChatwootLogo } from "@chatwootjs/ui/components/chatwoot-logo";
import { cn } from "@chatwootjs/ui/lib/utils";

import { useSessionContext } from "@/components/session-provider";
import { useTheme } from "@/components/theme-provider";
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
  search?: Record<string, unknown>;
  icon?: React.ComponentType<{ className?: string }>;
  /** dot colorido (etiquetas) */
  color?: string;
  /** channel_type (Canais) */
  channelType?: string | null;
  soon?: boolean;
  /** sub-grupo com folhas aninhadas (Pastas/Times/Canais/Etiquetas) */
  children?: NavLeaf[];
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  defaultOpen?: boolean;
  children?: NavLeaf[];
}

/** Ícone do canal por channel_type (paridade com ChannelIcon do v4). */
function ChannelIconFor({
  channelType,
  className,
}: {
  channelType: string | null;
  className?: string;
}) {
  const map: Record<string, React.ComponentType<{ className?: string }>> = {
    "Channel::WebWidget": Globe,
    "Channel::Api": Webhook,
    "Channel::Email": Mail,
    "Channel::Whatsapp": MessageCircle,
    "Channel::Sms": MessageCircle,
    "Channel::Telegram": MessageCircle,
    "Channel::Phone": Phone,
    "Channel::Line": MessageCircle,
  };
  const Icon = map[channelType ?? ""] ?? Inbox;
  return <Icon className={className ?? "size-3.5 flex-shrink-0"} />;
}

/**
 * Sidebar branca estilo Chatwoot v4: account switcher, busca, árvore de
 * navegação (Canais/Etiquetas/Times/Pastas como sub-grupos de Conversas) e
 * perfil no rodapé. Estrutura espelha components-next/sidebar/Sidebar.vue.
 */
export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, reload, switchAccount } = useSessionContext();
  const { setTheme, theme } = useTheme();
  const activeTheme = theme ?? "system";
  const accountId = session?.accountId;
  const [inboxes, setInboxes] = useState<
    Array<{ id: number; name: string; channel_type: string | null }>
  >([]);
  const [labels, setLabels] = useState<Array<{ id: number; title: string; color: string }>>([]);
  const [width, setWidth] = useState<number>(() => loadWidth());
  const [resizing, setResizing] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV_DEFAULT_OPEN.map((g) => [g, true])),
  );
  const asideRef = useRef<HTMLElement>(null);

  const collapsed = width < COLLAPSE_BELOW;
  const activePath = location.pathname;
  const currentSearch = location.search as Record<string, unknown>;

  useEffect(() => {
    localStorage.setItem(WIDTH_KEY, String(width));
  }, [width]);

  // inboxes + labels para os sub-grupos Canais/Etiquetas
  useEffect(() => {
    if (!accountId) return;
    void apiFetch<{
      inboxes: Array<{ id: number; name: string; channel_type: string | null }>;
    }>(`/api/v1/accounts/${accountId}/inboxes`)
      .then((d) => setInboxes(d.inboxes))
      .catch(() => {});
    void apiFetch<{ labels: Array<{ id: number; title: string; color: string }> }>(
      `/api/v1/accounts/${accountId}/labels`,
    )
      .then((d) => setLabels(d.labels))
      .catch(() => {});
  }, [accountId]);

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

  const NAV: NavGroup[] = [
    { label: "Minha Inbox", icon: Inbox, to: "/app" },
    {
      label: "Conversas",
      icon: MessageCircle,
      to: "/app",
      defaultOpen: true,
      children: [
        { label: "Todas as conversas", to: "/app", icon: Inbox },
        { label: "Menções", icon: AtSign, soon: true },
        { label: "Sem atendimento", icon: Clock, soon: true },
        {
          label: "Pastas",
          icon: Folder,
          children: [],
        },
        {
          label: "Times",
          icon: Users,
          children: [],
        },
        {
          label: "Canais",
          icon: Inbox,
          children: inboxes.map((inbox): NavLeaf => ({
            label: inbox.name,
            to: "/app",
            search: { inbox_id: inbox.id },
            channelType: inbox.channel_type,
          })),
        },
        {
          label: "Etiquetas",
          icon: Tag,
          children: labels.map((label) => ({
            label: label.title,
            to: "/app",
            search: { labels: [label.title] },
            color: label.color,
          })),
        },
      ],
    },
    {
      label: "Contatos",
      icon: Contact,
      to: "/app/contacts",
      defaultOpen: true,
      children: [{ label: "Todos os contatos", to: "/app/contacts", icon: Contact }],
    },
    {
      label: "Empresas",
      icon: Building2,
      to: "/app/companies",
      children: [{ label: "Todas as empresas", to: "/app/companies", icon: Building2 }],
    },
    {
      label: "Relatórios",
      icon: BarChart3,
      children: [{ label: "Visão geral", to: "/app/reports", icon: BarChart3 }],
    },
    {
      label: "Campanhas",
      icon: Megaphone,
      children: [
        {
          label: "Live chat",
          to: "/app/campaigns",
          search: { type: "ongoing" },
          icon: MessageCircle,
        },
        { label: "SMS", to: "/app/campaigns", search: { type: "one_off" }, icon: MessageCircle },
      ],
    },
    {
      label: "Central de Ajuda",
      icon: BookOpen,
      children: [{ label: "Todos os artigos", to: "/app/helpcenter", icon: BookOpen }],
    },
    {
      label: "Configurações",
      icon: Settings,
      defaultOpen: true,
      children: [
        { label: "Configurações da conta", to: "/app/settings/general", icon: Settings },
        { label: "Agentes", to: "/app/settings/agents", icon: SquareUser },
        { label: "Times", to: "/app/settings/teams", icon: Users },
        { label: "Inboxes", to: "/app/settings/inboxes", icon: Inbox },
        { label: "Etiquetas", to: "/app/settings/labels", icon: Tag },
        { label: "Atributos customizados", to: "/app/settings/custom-attributes", icon: PenLine },
        { label: "Automação", to: "/app/settings/automations", icon: Repeat },
        { label: "Macros", to: "/app/settings/macros", icon: ToyBrick },
        { label: "Respostas prontas", to: "/app/settings/canned", icon: MessageSquareQuote },
        { label: "Webhooks", to: "/app/settings/webhooks", icon: Webhook },
      ],
    },
  ];

  function isActive(to?: string): boolean {
    if (!to) return false;
    if (to === "/app") return activePath === "/app" || activePath === "/app/";
    return activePath === to || activePath.startsWith(`${to}/`);
  }

  function isLeafActive(leaf: NavLeaf): boolean {
    if (!isActive(leaf.to)) return false;
    if (!leaf.search) return true;
    if ("inbox_id" in leaf.search)
      return Number(currentSearch.inbox_id ?? 0) === Number(leaf.search.inbox_id);
    if ("labels" in leaf.search) {
      const current = currentSearch.labels;
      const wanted = leaf.search.labels as string[];
      return Array.isArray(current) && current.length === 1 && current[0] === wanted[0];
    }
    return Object.entries(leaf.search).every(
      ([k, v]) => String(currentSearch[k] ?? "") === String(v),
    );
  }

  function toggle(key: string): void {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
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

  function renderLeaf(leaf: NavLeaf, depth = 0): React.ReactNode {
    const active = isLeafActive(leaf);
    const content = (
      <>
        {leaf.channelType ? (
          <ChannelIconFor channelType={leaf.channelType} className="size-3.5 flex-shrink-0" />
        ) : leaf.color ? (
          <span
            className="size-2 flex-shrink-0 rounded-[2px]"
            style={{ backgroundColor: leaf.color }}
          />
        ) : (
          leaf.icon && <leaf.icon className="size-3.5 flex-shrink-0" />
        )}
        <span className="flex-grow truncate">{leaf.label}</span>
      </>
    );
    if (leaf.soon) {
      return (
        <li title="Chega nos próximos módulos" className="list-none">
          <span className="flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-muted-foreground/60">
            {content}
          </span>
        </li>
      );
    }
    if (!leaf.to) return null;
    return (
      <li className="list-none">
        <Link
          to={leaf.to}
          search={leaf.search}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted",
            active
              ? "bg-woot-nav-active-bg font-medium text-woot-blue"
              : "text-muted-foreground hover:text-foreground",
          )}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {content}
        </Link>
      </li>
    );
  }

  function renderSubGroup(leaf: NavLeaf): React.ReactNode {
    const LeafIcon = leaf.icon;
    const key = leaf.label;
    const open = openGroups[key] ?? false;
    const active = (leaf.children ?? []).some((c) => isLeafActive(c));
    return (
      <li className="list-none">
        <button
          type="button"
          onClick={() => toggle(key)}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition-colors",
            active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LeafIcon && <LeafIcon className="size-3.5 flex-shrink-0" />}
          <span className="flex-grow truncate text-start">{leaf.label}</span>
          <ChevronDown className={cn("size-3.5 transition-transform", !open && "-rotate-90")} />
        </button>
        {open &&
          ((leaf.children?.length ?? 0) > 0 ? (
            <ul className="ml-4 flex flex-col gap-px border-l border-border pl-1">
              {leaf.children!.map((child) => renderLeaf(child, 1))}
            </ul>
          ) : (
            <p className="ml-4 px-2 py-1 text-xs text-muted-foreground/70">Nada aqui ainda</p>
          ))}
      </li>
    );
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
                <ChatwootLogo className="size-5" />
              </div>
              <div className="h-3 w-px flex-shrink-0 bg-border" />
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Trocar de conta"
              className={cn(
                "flex min-w-0 items-center rounded-lg font-medium hover:bg-muted",
                collapsed ? "size-8 justify-center" : "flex-grow gap-1 px-1.5 py-1.5",
              )}
            >
              {collapsed ? (
                <ChatwootLogo className="size-5" />
              ) : (
                <>
                  <span className="flex-grow truncate text-start">
                    {session?.account.name ?? "..."}
                  </span>
                  <ChevronsUpDown className="size-4 flex-shrink-0 text-muted-foreground" />
                </>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Contas</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {session?.accounts.map((account) => (
                  <DropdownMenuItem
                    key={account.id}
                    onSelect={() => switchAccount(account.id)}
                    className="gap-2"
                  >
                    <span className="flex-grow truncate">{account.name}</span>
                    {account.id === session.accountId && (
                      <Check className="size-4 text-woot-blue" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
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
            const open = openGroups[group.label] ?? false;
            const groupActive =
              isActive(group.to) || (group.children ?? []).some((c) => isLeafActive(c));
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
                  {group.children !== undefined ? (
                    <button
                      type="button"
                      onClick={() => toggle(group.label)}
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
                {group.children !== undefined && open && (
                  <ul className="ml-4 flex flex-col gap-px border-l border-border pl-2">
                    {group.children.length === 0 && (
                      <li className="px-2 py-1 text-xs text-muted-foreground/70">
                        Nada aqui ainda
                      </li>
                    )}
                    {group.children.map((leaf) =>
                      leaf.children !== undefined ? (
                        <div key={leaf.label}>{renderSubGroup(leaf)}</div>
                      ) : (
                        <div key={leaf.label}>{renderLeaf(leaf)}</div>
                      ),
                    )}
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
            <DropdownMenuGroup>
              <DropdownMenuLabel>{session?.user.name ?? "Minha conta"}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {AVAILABILITY.map((item) => (
                <DropdownMenuItem
                  key={item.value}
                  onSelect={() => void setAvailability(item.value)}
                  className="gap-2"
                >
                  <span className={cn("size-2 rounded-full", item.dot)} />
                  {item.label}
                  {session?.user.availability === item.value && (
                    <Check className="ml-auto size-4" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <Palette className="size-4" />
                  Aparência
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44">
                  <DropdownMenuRadioGroup
                    value={activeTheme}
                    onValueChange={(value) => setTheme(value as string)}
                  >
                    <DropdownMenuRadioItem value="light" className="gap-2">
                      <Sun className="size-4" />
                      Claro
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark" className="gap-2">
                      <Moon className="size-4" />
                      Escuro
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system" className="gap-2">
                      <Monitor className="size-4" />
                      Sistema
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => void logout()} className="gap-2">
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuGroup>
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

const NAV_DEFAULT_OPEN = ["Conversas", "Contatos", "Configurações"];

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
