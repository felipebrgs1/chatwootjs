import { ChevronRight, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { Textarea } from "@chatwootjs/ui/components/textarea";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";
import type { ApiCompany } from "./index";

export const Route = createFileRoute("/_auth/app/companies/$companyId")({
  component: CompanyDetailPage,
});

interface CompanyContact {
  id: number;
  name: string;
  email: string | null;
  phone_number: string | null;
}

interface ContactsMeta {
  count: number;
  current_page: number;
  total_pages: number;
  per_page: number;
}

interface HistoryItem {
  id: number;
  display_id: number;
  status: string;
  inbox_id: number;
  inbox_name: string | null;
  last_activity_at: string | null;
  preview: string | null;
}

interface CompanyNote {
  id: number;
  content: string;
  contact_id: number;
  contact_name: string;
  user_name: string | null;
  created_at: string;
}

type Tab = "history" | "notes" | "contacts";

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: "history", label: "Histórico" },
  { value: "notes", label: "Notas" },
  { value: "contacts", label: "Contatos" },
];

/**
 * Ver empresa 1:1 com CompanyDetailView do v4: breadcrumb no topo, perfil +
 * form no centro e sidebar com abas (Histórico, Notas, Contatos).
 */
function CompanyDetailPage() {
  const { companyId } = Route.useParams();
  const id = Number(companyId);
  const navigate = useNavigate();
  const { session } = useSessionContext();
  const [company, setCompany] = useState<ApiCompany | null>(null);
  const [tab, setTab] = useState<Tab>("history");

  const accountId = session?.accountId;

  useEffect(() => {
    if (accountId === undefined) return;
    void apiFetch<{ company: ApiCompany }>(`/api/v1/accounts/${accountId}/companies/${id}`)
      .then((d) => setCompany(d.company))
      .catch(() => {});
  }, [accountId, id]);

  if (!session) return null;
  const isAdmin = session.account.role === "administrator";

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-woot-bg">
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 shrink-0 px-6">
          <div className="mx-auto flex w-full max-w-[40.625rem] flex-col items-start justify-between gap-2 py-7 xs:flex-row xs:items-center">
            <nav aria-label="Navegação" className="flex min-w-0 items-center gap-1 text-sm">
              <Link
                to="/app/companies"
                className="shrink-0 text-woot-slate-11 hover:text-woot-slate-12 hover:underline"
              >
                Empresas
              </Link>
              <ChevronRight className="size-4 shrink-0 text-woot-slate-10" />
              <span className="truncate font-medium text-woot-slate-12">
                {company?.name || "..."}
              </span>
            </nav>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-6">
          <div className="mx-auto w-full max-w-[40.625rem] py-4">
            {company === null ? (
              <p className="py-10 text-center text-sm text-woot-slate-11">Carregando...</p>
            ) : (
              <CompanyProfile
                company={company}
                accountId={session.accountId}
                isAdmin={isAdmin}
                onChanged={setCompany}
                onDeleted={() => void navigate({ to: "/app/companies" })}
              />
            )}
          </div>
          <div className="mx-auto w-full max-w-[40.625rem] pb-8 lg:hidden">
            {company && (
              <DetailTabs
                company={company}
                accountId={session.accountId}
                tab={tab}
                onTab={setTab}
              />
            )}
          </div>
        </main>
      </div>

      {company && (
        <aside className="hidden h-full min-h-0 w-full min-w-52 max-w-md shrink-0 flex-col border-l border-border bg-card lg:flex">
          <DetailTabs company={company} accountId={session.accountId} tab={tab} onTab={setTab} />
        </aside>
      )}
    </div>
  );
}

function CompanyProfile({
  company,
  accountId,
  isAdmin,
  onChanged,
  onDeleted,
}: {
  company: ApiCompany;
  accountId: number;
  isAdmin: boolean;
  onChanged: (company: ApiCompany) => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(company.name);
  const [domain, setDomain] = useState(company.domain ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function save(): Promise<void> {
    if (!name.trim()) {
      setError("Informe o nome");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const d = await apiFetch<{ company: ApiCompany }>(
        `/api/v1/accounts/${accountId}/companies/${company.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            domain: domain.trim() || null,
            description: description.trim() || null,
          }),
        },
      );
      onChanged(d.company);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(): Promise<void> {
    await apiFetch(`/api/v1/accounts/${accountId}/companies/${company.id}`, {
      method: "DELETE",
    });
    onDeleted();
  }

  return (
    <div className="flex flex-col items-start gap-8 pb-6">
      <div className="flex flex-col items-start gap-3">
        <span className="grid size-[72px] place-content-center rounded-full bg-woot-slate-3 text-2xl text-woot-slate-11">
          {company.name.charAt(0).toUpperCase()}
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-medium text-woot-slate-12">{company.name}</h3>
          <div className="flex flex-col gap-1.5">
            {company.domain && <span className="text-sm text-woot-slate-11">{company.domain}</span>}
            <span className="text-sm text-woot-slate-11">{company.contacts_count} contato(s)</span>
          </div>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="grid w-full gap-3 sm:grid-cols-2"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="co-name">Nome</Label>
          <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="co-domain">Domínio</Label>
          <Input
            id="co-domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="empresa.com"
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="co-desc">Descrição</Label>
          <Textarea
            id="co-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-20"
          />
        </div>
        {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={saving}>
            Atualizar
          </Button>
        </div>
      </form>
      {isAdmin && (
        <div className="flex w-full flex-col items-start gap-4 border-t border-border pt-6">
          <div className="flex flex-col gap-2">
            <h6 className="text-base font-medium text-woot-slate-12">Excluir empresa</h6>
            <span className="text-sm text-woot-slate-11">
              Os contatos são mantidos, só o vínculo é removido.
            </span>
          </div>
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="destructive" size="sm" onClick={() => void remove()}>
                Confirmar exclusão
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
              Excluir empresa
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DetailTabs({
  company,
  accountId,
  tab,
  onTab,
}: {
  company: ApiCompany;
  accountId: number;
  tab: Tab;
  onTab: (tab: Tab) => void;
}) {
  const tabs = TABS.map((t) =>
    t.value === "contacts" ? { ...t, label: `Contatos (${company.contacts_count})` } : t,
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-6 pb-3 pt-6">
        <div
          role="tablist"
          aria-label="Detalhes da empresa"
          className="flex w-full gap-0.5 rounded-lg bg-muted p-0.5"
        >
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => onTab(t.value)}
              className={cn(
                "flex-1 truncate rounded-md px-1 py-1.5 text-xs transition-colors",
                tab === t.value
                  ? "bg-card font-medium text-woot-slate-12 shadow-sm"
                  : "text-woot-slate-11 hover:text-woot-slate-12",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">
        {tab === "history" && <HistoryTab companyId={company.id} accountId={accountId} />}
        {tab === "notes" && <NotesTab companyId={company.id} accountId={accountId} />}
        {tab === "contacts" && <ContactsTab company={company} accountId={accountId} />}
      </div>
    </div>
  );
}

function HistoryTab({ companyId, accountId }: { companyId: number; accountId: number }) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    void apiFetch<{ conversations: HistoryItem[] }>(
      `/api/v1/accounts/${accountId}/companies/${companyId}/conversations`,
    )
      .then((d) => setItems(d.conversations))
      .catch(() => setItems([]));
  }, [accountId, companyId]);

  if (items === null) return <p className="text-xs text-muted-foreground">Carregando...</p>;
  if (items.length === 0) return <p className="text-xs text-muted-foreground">Nenhuma conversa.</p>;

  const statusLabel: Record<string, string> = {
    open: "Aberta",
    pending: "Pendente",
    resolved: "Resolvida",
    snoozed: "Adiada",
  };

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            to="/app/conversations/$conversationId"
            params={{ conversationId: String(item.id) }}
            className="flex items-center gap-3 rounded-xl border border-border bg-woot-bg px-3 py-2.5 transition-colors hover:border-woot-blue"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-woot-slate-12">
                #{item.display_id} · {item.inbox_name ?? "Inbox"}
              </span>
              {item.preview && (
                <span className="block truncate text-xs text-woot-slate-11">{item.preview}</span>
              )}
            </span>
            <span className="rounded-md bg-woot-slate-3 px-1.5 py-0.5 text-[11px] text-woot-slate-11">
              {statusLabel[item.status] ?? item.status}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function NotesTab({ companyId, accountId }: { companyId: number; accountId: number }) {
  const [notes, setNotes] = useState<CompanyNote[] | null>(null);

  useEffect(() => {
    void apiFetch<{ notes: CompanyNote[] }>(
      `/api/v1/accounts/${accountId}/companies/${companyId}/notes`,
    )
      .then((d) => setNotes(d.notes))
      .catch(() => setNotes([]));
  }, [accountId, companyId]);

  if (notes === null) return <p className="text-xs text-muted-foreground">Carregando...</p>;
  if (notes.length === 0)
    return <p className="text-xs text-muted-foreground">Nenhuma nota nos contatos.</p>;

  return (
    <ul className="flex flex-col gap-2">
      {notes.map((note) => (
        <li key={note.id} className="rounded-xl border border-border bg-woot-bg p-3">
          <p className="whitespace-pre-wrap text-sm text-woot-slate-12">{note.content}</p>
          <p className="mt-1 text-xs text-woot-slate-11">
            {note.contact_name} · {note.user_name ?? "—"} ·{" "}
            {new Date(note.created_at).toLocaleDateString("pt-BR")}
          </p>
        </li>
      ))}
    </ul>
  );
}

function ContactsTab({ company, accountId }: { company: ApiCompany; accountId: number }) {
  const [items, setItems] = useState<CompanyContact[] | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CompanyContact[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load(p = page): Promise<void> {
    const d = await apiFetch<{ contacts: CompanyContact[]; meta: ContactsMeta }>(
      `/api/v1/accounts/${accountId}/companies/${company.id}/contacts?page=${p}`,
    );
    setItems(d.contacts);
    setTotalPages(d.meta.total_pages);
    setPage(d.meta.current_page);
  }

  useEffect(() => {
    void load(1).catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, company.id]);

  function search(value: string): void {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(() => {
      void apiFetch<{ contacts: CompanyContact[] }>(
        `/api/v1/accounts/${accountId}/contacts?q=${encodeURIComponent(value.trim())}&per_page=8`,
      )
        .then((d) => setResults(d.contacts))
        .catch(() => {});
    }, 300);
  }

  async function add(contactId: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${accountId}/companies/${company.id}/contacts`, {
      method: "POST",
      body: JSON.stringify({ contact_id: contactId }),
    });
    setQ("");
    setResults([]);
    await load(1);
  }

  async function remove(contactId: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${accountId}/companies/${company.id}/contacts/${contactId}`, {
      method: "DELETE",
    });
    await load(page);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-woot-slate-11" />
        <Input
          placeholder="Buscar contato para vincular..."
          value={q}
          onChange={(e) => search(e.target.value)}
          className="pl-8"
        />
      </div>
      {results.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-border bg-woot-bg p-1">
          {results.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted"
            >
              <WootAvatar name={c.name || "?"} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-woot-slate-12">
                  {c.name || "(sem nome)"}
                </span>
                {c.email && (
                  <span className="block truncate text-xs text-woot-slate-11">{c.email}</span>
                )}
              </span>
              <Button size="sm" variant="outline" onClick={() => void add(c.id)}>
                <Plus className="size-3.5" /> Vincular
              </Button>
            </li>
          ))}
        </ul>
      )}
      {items === null ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum contato vinculado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-woot-bg px-3 py-2"
            >
              <WootAvatar name={c.name || "?"} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-woot-slate-12">
                  {c.name || "(sem nome)"}
                </span>
                {c.email && (
                  <span className="block truncate text-xs text-woot-slate-11">{c.email}</span>
                )}
              </span>
              <Link
                to="/app/contacts/$contactId"
                params={{ contactId: String(c.id) }}
                className="shrink-0 text-xs text-woot-blue hover:underline"
              >
                Ver
              </Link>
              <button
                type="button"
                aria-label={`Desvincular ${c.name}`}
                onClick={() => void remove(c.id)}
                className="shrink-0 text-woot-slate-10 hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-woot-slate-11">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => {
                const p = page - 1;
                setPage(p);
                void load(p);
              }}
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => {
                const p = page + 1;
                setPage(p);
                void load(p);
              }}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
