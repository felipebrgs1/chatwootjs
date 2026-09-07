import {
  Ban,
  Check,
  ChevronRight,
  Download,
  FileAudio,
  FileText,
  FileVideo,
  MessageSquarePlus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { Textarea } from "@chatwootjs/ui/components/textarea";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import { CompanyPicker, type PickedCompany } from "@/components/companies/CompanyPicker";
import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/contacts/$contactId")({
  component: ContactDetailPage,
});

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";

interface ApiContact {
  id: number;
  name: string;
  email: string | null;
  phone_number: string | null;
  identifier: string | null;
  location: string;
  country_code: string;
  company_id: number | null;
  company: { id: number; name: string; domain: string | null } | null;
  blocked: boolean;
  custom_attributes: Record<string, unknown>;
  additional_attributes: Record<string, unknown>;
  last_activity_at: string | null;
  created_at: string;
}

interface ApiLabel {
  id: number;
  title: string;
  color: string;
}

interface ApiNote {
  id: number;
  content: string;
  user_id: number | null;
  user_name: string | null;
  created_at: string;
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

interface AttachmentItem {
  id: number;
  file_type: "image" | "audio" | "video" | "file";
  external_url: string | null;
  fallback_title: string | null;
  extension: string | null;
  created_at: string;
  message_id: number;
  conversation_id: number;
}

interface AttrDefinition {
  id: number;
  attribute_key: string;
  attribute_display_name: string | null;
  attribute_display_type: number;
  attribute_values: string[];
}

interface ApiInbox {
  id: number;
  name: string;
  channel_type: string | null;
}

type Tab = "attributes" | "history" | "notes" | "media" | "merge";

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: "attributes", label: "Atributos" },
  { value: "history", label: "Histórico" },
  { value: "notes", label: "Notas" },
  { value: "media", label: "Mídia" },
  { value: "merge", label: "Mesclar" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function attachmentUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${SERVER_URL}${url}`;
}

/**
 * Ver contato 1:1 com ContactManageView do v4: breadcrumb + ações no topo,
 * perfil + form no centro e sidebar com abas (Atributos, Histórico, Notas,
 * Mídia, Mesclar).
 */
function ContactDetailPage() {
  const { contactId } = Route.useParams();
  const id = Number(contactId);
  const navigate = useNavigate();
  const { session } = useSessionContext();
  const [contact, setContact] = useState<ApiContact | null>(null);
  const [tab, setTab] = useState<Tab>("attributes");
  const [blocking, setBlocking] = useState(false);
  const [composing, setComposing] = useState(false);

  async function reload(): Promise<void> {
    if (!session) return;
    const d = await apiFetch<{ contact: ApiContact }>(
      `/api/v1/accounts/${session.accountId}/contacts/${id}`,
    );
    setContact(d.contact);
  }

  const accountId = session?.accountId;

  useEffect(() => {
    if (accountId === undefined) return;
    void apiFetch<{ contact: ApiContact }>(`/api/v1/accounts/${accountId}/contacts/${id}`)
      .then((d) => setContact(d.contact))
      .catch(() => {});
  }, [accountId, id]);

  if (!session) return null;
  const isAdmin = session.account.role === "administrator";

  async function toggleBlock(): Promise<void> {
    if (!contact) return;
    setBlocking(true);
    try {
      const d = await apiFetch<{ contact: ApiContact }>(
        `/api/v1/accounts/${session!.accountId}/contacts/${contact.id}`,
        { method: "PATCH", body: JSON.stringify({ blocked: !contact.blocked }) },
      );
      setContact(d.contact);
    } finally {
      setBlocking(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-woot-bg">
      {/* Coluna principal */}
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 shrink-0 px-6">
          <div className="mx-auto flex w-full max-w-[40.625rem] flex-col items-start justify-between gap-2 py-7 xs:flex-row xs:items-center">
            <nav aria-label="Navegação" className="flex min-w-0 items-center gap-1 text-sm">
              <Link
                to="/app/contacts"
                className="shrink-0 text-woot-slate-11 hover:text-woot-slate-12 hover:underline"
              >
                Contatos
              </Link>
              <ChevronRight className="size-4 shrink-0 text-woot-slate-10" />
              <span className="truncate font-medium text-woot-slate-12">
                {contact?.name || "..."}
              </span>
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={blocking || !contact}
                onClick={() => void toggleBlock()}
                className="gap-2"
              >
                <Ban className="size-3.5" />
                {contact?.blocked ? "Desbloquear" : "Bloquear contato"}
              </Button>
              <Button size="sm" onClick={() => setComposing(true)} className="gap-2">
                <MessageSquarePlus className="size-3.5" />
                Enviar mensagem
              </Button>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-6">
          <div className="mx-auto w-full max-w-[40.625rem] py-4">
            {contact === null ? (
              <p className="py-10 text-center text-sm text-woot-slate-11">Carregando...</p>
            ) : (
              <ContactProfile
                contact={contact}
                accountId={session.accountId}
                isAdmin={isAdmin}
                onChanged={setContact}
                onDeleted={() => void navigate({ to: "/app/contacts" })}
              />
            )}
          </div>
          {/* Abas empilhadas no mobile */}
          <div className="mx-auto w-full max-w-[40.625rem] pb-8 lg:hidden">
            {contact && (
              <DetailTabs
                contact={contact}
                accountId={session.accountId}
                tab={tab}
                onTab={setTab}
                onChanged={reload}
              />
            )}
          </div>
        </main>
      </div>

      {/* Sidebar desktop */}
      {contact && (
        <aside className="hidden h-full min-h-0 w-full min-w-52 max-w-md shrink-0 flex-col border-l border-border bg-card lg:flex">
          <DetailTabs
            contact={contact}
            accountId={session.accountId}
            tab={tab}
            onTab={setTab}
            onChanged={reload}
          />
        </aside>
      )}

      {composing && contact && (
        <ComposeDialog
          contact={contact}
          accountId={session.accountId}
          onClose={() => setComposing(false)}
        />
      )}
    </div>
  );
}

/** Perfil + form + excluir (coluna central, 1:1 com ContactDetails). */
function ContactProfile({
  contact,
  accountId,
  isAdmin,
  onChanged,
  onDeleted,
}: {
  contact: ApiContact;
  accountId: number;
  isAdmin: boolean;
  onChanged: (contact: ApiContact) => void;
  onDeleted: () => void;
}) {
  const additional = contact.additional_attributes ?? {};
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const [name, setName] = useState(contact.name ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone_number ?? "");
  const [company, setCompany] = useState<PickedCompany | null>(contact.company);
  const [city, setCity] = useState(str(additional["city"]));
  const [country, setCountry] = useState(str(additional["country"]));
  const [bio, setBio] = useState(str(additional["description"]));
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
      const d = await apiFetch<{ contact: ApiContact }>(
        `/api/v1/accounts/${accountId}/contacts/${contact.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim() || null,
            phone_number: phone.trim() || null,
            company_id: company?.id ?? null,
            additional_attributes: {
              city: city.trim(),
              country: country.trim(),
              description: bio.trim(),
            },
          }),
        },
      );
      onChanged(d.contact);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(): Promise<void> {
    await apiFetch(`/api/v1/accounts/${accountId}/contacts/${contact.id}`, {
      method: "DELETE",
    });
    onDeleted();
  }

  return (
    <div className="flex flex-col items-start gap-8 pb-6">
      <div className="flex flex-col items-start gap-3">
        <WootAvatar name={contact.name || "?"} className="size-[72px] text-2xl" />
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-medium text-woot-slate-12">{contact.name}</h3>
          <div className="flex flex-col gap-1.5">
            {contact.identifier && (
              <span className="inline-flex items-center gap-1 text-sm text-woot-slate-11">
                {contact.identifier}
              </span>
            )}
            <span className="inline-flex flex-wrap items-center gap-1 text-sm text-woot-slate-11">
              <span title={contact.created_at}>Criado em {fmtDate(contact.created_at)}</span>
              {" • "}
              <span title={contact.last_activity_at ?? ""}>
                Última atividade {fmtDate(contact.last_activity_at)}
              </span>
            </span>
          </div>
        </div>
        <ContactLabels contactId={contact.id} accountId={accountId} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="grid w-full gap-3 sm:grid-cols-2"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="d-name">Nome</Label>
          <Input id="d-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="d-company">Empresa</Label>
          <CompanyPicker
            accountId={accountId}
            value={company}
            onChange={setCompany}
            inputId="d-company"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="d-email">E-mail</Label>
          <Input
            id="d-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="d-phone">Telefone</Label>
          <Input id="d-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="d-city">Cidade</Label>
          <Input id="d-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="d-country">País</Label>
          <Input id="d-country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="d-bio">Bio</Label>
          <Textarea
            id="d-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
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
            <h6 className="text-base font-medium text-woot-slate-12">Excluir contato</h6>
            <span className="text-sm text-woot-slate-11">
              Remove o contato e todo o histórico. Não dá para desfazer.
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
              Excluir contato
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Chips de etiqueta com adicionar/remover (toggle por dropdown simples). */
function ContactLabels({ contactId, accountId }: { contactId: number; accountId: number }) {
  const [labels, setLabels] = useState<ApiLabel[] | null>(null);
  const [all, setAll] = useState<ApiLabel[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    void apiFetch<{ labels: ApiLabel[] }>(
      `/api/v1/accounts/${accountId}/contacts/${contactId}/labels`,
    )
      .then((d) => setLabels(d.labels))
      .catch(() => {});
    void apiFetch<{ labels: ApiLabel[] }>(`/api/v1/accounts/${accountId}/labels`).then((d) =>
      setAll(d.labels),
    );
  }, [accountId, contactId]);

  async function toggle(title: string): Promise<void> {
    const current = (labels ?? []).map((l) => l.title);
    const next = current.includes(title) ? current.filter((t) => t !== title) : [...current, title];
    const d = await apiFetch<{ labels: string[] }>(
      `/api/v1/accounts/${accountId}/contacts/${contactId}/labels`,
      { method: "POST", body: JSON.stringify({ labels: next }) },
    );
    // Reconcilia títulos retornados com cor conhecida (ou padrão).
    setLabels(
      d.labels.map((t, i) => {
        const known = all.find((a) => a.title === t) ?? labels?.find((l) => l.title === t);
        return known ?? { id: -i, title: t, color: "#1f93ff" };
      }),
    );
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(labels ?? []).map((label) => (
        <span
          key={label.id}
          className="group inline-flex items-center gap-1 rounded-md border border-border bg-woot-slate-3/60 px-2 py-0.5 text-xs text-woot-slate-12"
        >
          <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
          {label.title}
          <button
            type="button"
            aria-label={`Remover ${label.title}`}
            onClick={() => void toggle(label.title)}
            className="text-woot-slate-10 opacity-0 transition-opacity group-hover:opacity-100 hover:text-woot-slate-12"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <div className="relative">
        <button
          type="button"
          aria-label="Adicionar etiqueta"
          onClick={() => setOpen((v) => !v)}
          className="grid size-6 place-content-center rounded-md border border-dashed border-border text-woot-slate-11 hover:bg-muted hover:text-woot-slate-12"
        >
          <Plus className="size-3.5" />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-48 w-48 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
            {all.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">Sem etiquetas na conta.</p>
            )}
            {all.map((label) => {
              const active = (labels ?? []).some((l) => l.title === label.title);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => void toggle(label.title)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 truncate text-start">{label.title}</span>
                  {active && <Check className="size-3.5 text-woot-slate-11" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Sidebar de abas (desktop) / seção empilhada (mobile). */
function DetailTabs({
  contact,
  accountId,
  tab,
  onTab,
  onChanged,
}: {
  contact: ApiContact;
  accountId: number;
  tab: Tab;
  onTab: (tab: Tab) => void;
  onChanged: (() => Promise<void>) | undefined;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-6 pb-3 pt-6">
        <div
          role="tablist"
          aria-label="Detalhes do contato"
          className="flex w-full gap-0.5 rounded-lg bg-muted p-0.5"
        >
          {TABS.map((t) => (
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
        {tab === "attributes" && (
          <AttributesTab contact={contact} accountId={accountId} onChanged={onChanged} />
        )}
        {tab === "history" && <HistoryTab contactId={contact.id} accountId={accountId} />}
        {tab === "notes" && <NotesTab contactId={contact.id} accountId={accountId} />}
        {tab === "media" && <MediaTab contactId={contact.id} accountId={accountId} />}
        {tab === "merge" && <MergeTab contact={contact} accountId={accountId} />}
      </div>
    </div>
  );
}

/** Aba Atributos: definitions do contato + valores editáveis. */
function AttributesTab({
  contact,
  accountId,
  onChanged,
}: {
  contact: ApiContact;
  accountId: number;
  onChanged: (() => Promise<void>) | undefined;
}) {
  const [defs, setDefs] = useState<AttrDefinition[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void apiFetch<{ custom_attribute_definitions: AttrDefinition[] }>(
      `/api/v1/accounts/${accountId}/custom_attribute_definitions?attribute_model=0`,
    ).then((d) => {
      setDefs(d.custom_attribute_definitions);
      const initial: Record<string, string> = {};
      for (const def of d.custom_attribute_definitions) {
        const v = contact.custom_attributes[def.attribute_key];
        initial[def.attribute_key] = v === undefined || v === null ? "" : String(v);
      }
      setValues(initial);
    });
  }, [accountId, contact.id, contact.custom_attributes]);

  async function save(): Promise<void> {
    setSaving(true);
    try {
      const custom_attributes: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v !== "") custom_attributes[k] = v;
      }
      await apiFetch(`/api/v1/accounts/${accountId}/contacts/${contact.id}`, {
        method: "PATCH",
        body: JSON.stringify({ custom_attributes }),
      });
      await onChanged?.();
    } finally {
      setSaving(false);
    }
  }

  if (defs === null) return <p className="text-xs text-muted-foreground">Carregando...</p>;
  if (defs.length === 0)
    return <p className="text-xs text-muted-foreground">Nenhum atributo de contato.</p>;

  return (
    <div className="flex flex-col gap-3">
      {defs.map((def) => (
        <div key={def.id} className="grid gap-1.5">
          <Label htmlFor={`attr-${def.attribute_key}`}>
            {def.attribute_display_name || def.attribute_key}
          </Label>
          {def.attribute_display_type === 5 ? (
            <Checkbox
              checked={values[def.attribute_key] === "true"}
              onCheckedChange={(v) =>
                setValues((prev) => ({ ...prev, [def.attribute_key]: v === true ? "true" : "" }))
              }
            />
          ) : def.attribute_display_type === 4 && def.attribute_values.length > 0 ? (
            <select
              id={`attr-${def.attribute_key}`}
              value={values[def.attribute_key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [def.attribute_key]: e.target.value }))
              }
              className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="">—</option>
              {def.attribute_values.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id={`attr-${def.attribute_key}`}
              type={
                def.attribute_display_type === 1
                  ? "number"
                  : def.attribute_display_type === 3
                    ? "date"
                    : "text"
              }
              value={values[def.attribute_key] ?? ""}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, [def.attribute_key]: e.target.value }))
              }
            />
          )}
        </div>
      ))}
      <div>
        <Button size="sm" disabled={saving} onClick={() => void save()}>
          Salvar atributos
        </Button>
      </div>
    </div>
  );
}

/** Aba Histórico: conversas do contato. */
function HistoryTab({ contactId, accountId }: { contactId: number; accountId: number }) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);

  useEffect(() => {
    void apiFetch<{ conversations: HistoryItem[] }>(
      `/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`,
    )
      .then((d) => setItems(d.conversations))
      .catch(() => setItems([]));
  }, [accountId, contactId]);

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
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="rounded-md bg-woot-slate-3 px-1.5 py-0.5 text-[11px] text-woot-slate-11">
                {statusLabel[item.status] ?? item.status}
              </span>
              <span className="text-[11px] text-woot-slate-10">
                {fmtDate(item.last_activity_at)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Aba Notas: criar, listar e apagar. */
function NotesTab({ contactId, accountId }: { contactId: number; accountId: number }) {
  const [notes, setNotes] = useState<ApiNote[] | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh(): Promise<void> {
    try {
      const d = await apiFetch<{ notes: ApiNote[] }>(
        `/api/v1/accounts/${accountId}/contacts/${contactId}/notes`,
      );
      setNotes(d.notes);
    } catch {
      setNotes([]);
    }
  }

  useEffect(() => {
    void apiFetch<{ notes: ApiNote[] }>(`/api/v1/accounts/${accountId}/contacts/${contactId}/notes`)
      .then((d) => setNotes(d.notes))
      .catch(() => setNotes([]));
  }, [accountId, contactId]);

  async function add(): Promise<void> {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/api/v1/accounts/${accountId}/contacts/${contactId}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: text.trim() }),
      });
      setText("");
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(noteId: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${accountId}/contacts/${contactId}/notes/${noteId}`, {
      method: "DELETE",
    });
    await refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escrever nota..."
          className="min-h-20"
        />
        <div>
          <Button size="sm" disabled={saving || !text.trim()} onClick={() => void add()}>
            Adicionar nota
          </Button>
        </div>
      </div>
      {notes === null ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma nota.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-border bg-woot-bg p-3">
              <p className="whitespace-pre-wrap text-sm text-woot-slate-12">{note.content}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-woot-slate-11">
                <span>
                  {note.user_name ?? "—"} · {fmtDate(note.created_at)}
                </span>
                <button
                  type="button"
                  aria-label="Apagar nota"
                  onClick={() => void remove(note.id)}
                  className="ml-auto text-woot-slate-10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Aba Mídia: imagens em grade + arquivos. */
function MediaTab({ contactId, accountId }: { contactId: number; accountId: number }) {
  const [items, setItems] = useState<AttachmentItem[] | null>(null);

  useEffect(() => {
    void apiFetch<{ attachments: AttachmentItem[] }>(
      `/api/v1/accounts/${accountId}/contacts/${contactId}/attachments`,
    )
      .then((d) => setItems(d.attachments))
      .catch(() => setItems([]));
  }, [accountId, contactId]);

  if (items === null) return <p className="text-xs text-muted-foreground">Carregando...</p>;
  if (items.length === 0) return <p className="text-xs text-muted-foreground">Nenhum anexo.</p>;

  const images = items.filter((a) => a.file_type === "image" && attachmentUrl(a.external_url));
  const files = items.filter((a) => a.file_type !== "image");

  return (
    <div className="flex flex-col gap-4">
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((a) => (
            <a
              key={a.id}
              href={attachmentUrl(a.external_url)!}
              target="_blank"
              rel="noreferrer"
              title={a.fallback_title ?? "imagem"}
            >
              <img
                src={attachmentUrl(a.external_url)!}
                alt={a.fallback_title ?? "anexo"}
                loading="lazy"
                className="aspect-square w-full rounded-lg border border-border object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((a) => (
            <li key={a.id}>
              <a
                href={attachmentUrl(a.external_url) ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-border bg-woot-bg px-3 py-2 text-xs text-woot-slate-12 hover:border-woot-blue"
              >
                {a.file_type === "audio" ? (
                  <FileAudio className="size-4 shrink-0 text-woot-slate-10" />
                ) : a.file_type === "video" ? (
                  <FileVideo className="size-4 shrink-0 text-woot-slate-10" />
                ) : (
                  <FileText className="size-4 shrink-0 text-woot-slate-10" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {a.fallback_title ?? `anexo.${a.extension ?? "bin"}`}
                </span>
                <Download className="size-3.5 shrink-0 text-woot-slate-10" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Aba Mesclar: busca outro contato e absorve neste (base mantida). */
function MergeTab({ contact, accountId }: { contact: ApiContact; accountId: number }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ApiContact[]>([]);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function search(value: string): void {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(() => {
      void apiFetch<{ contacts: ApiContact[] }>(
        `/api/v1/accounts/${accountId}/contacts?q=${encodeURIComponent(value.trim())}&per_page=8`,
      )
        .then((d) => setResults(d.contacts.filter((c) => c.id !== contact.id)))
        .catch(() => {});
    }, 300);
  }

  async function merge(childId: number): Promise<void> {
    setError(null);
    setMerging(true);
    try {
      await apiFetch(`/api/v1/accounts/${accountId}/contacts/${contact.id}/merge`, {
        method: "POST",
        body: JSON.stringify({ child_id: childId }),
      });
      await navigate({ to: "/app/contacts" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao mesclar");
    } finally {
      setMerging(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-woot-slate-11">
        O contato selecionado é absorvido por <strong>{contact.name}</strong> (conversas e inboxes
        vêm para cá).
      </p>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-woot-slate-11" />
        <Input
          placeholder="Buscar contato para mesclar..."
          value={q}
          onChange={(e) => search(e.target.value)}
          className="pl-8"
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <ul className="flex flex-col gap-2">
        {results.map((c) => (
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
            <Button size="sm" variant="outline" disabled={merging} onClick={() => void merge(c.id)}>
              Mesclar
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Dialog Enviar mensagem: inbox + texto → cria conversa e abre o thread. */
function ComposeDialog({
  contact,
  accountId,
  onClose,
}: {
  contact: ApiContact;
  accountId: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [inboxes, setInboxes] = useState<ApiInbox[]>([]);
  const [inboxId, setInboxId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<{ inboxes: ApiInbox[] }>(`/api/v1/accounts/${accountId}/inboxes`).then((d) => {
      setInboxes(d.inboxes);
      if (d.inboxes[0]) setInboxId(String(d.inboxes[0].id));
    });
  }, [accountId]);

  async function send(): Promise<void> {
    if (!inboxId || !message.trim()) {
      setError("Escolha a inbox e escreva a mensagem");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const d = await apiFetch<{ conversation: { id: number } }>(
        `/api/v1/accounts/${accountId}/conversations`,
        {
          method: "POST",
          body: JSON.stringify({
            inbox_id: Number(inboxId),
            contact_id: contact.id,
            message: { content: message.trim() },
          }),
        },
      );
      await navigate({
        to: "/app/conversations/$conversationId",
        params: { conversationId: String(d.conversation.id) },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao criar conversa");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <h2 className="mb-1 text-base font-semibold text-woot-slate-12">Enviar mensagem</h2>
        <p className="mb-3 text-sm text-woot-slate-11">para {contact.name}</p>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="compose-inbox">Inbox</Label>
            <select
              id="compose-inbox"
              value={inboxId}
              onChange={(e) => setInboxId(e.target.value)}
              className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
            >
              {inboxes.map((inbox) => (
                <option key={inbox.id} value={inbox.id}>
                  {inbox.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="compose-msg">Mensagem</Label>
            <Textarea
              id="compose-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva a primeira mensagem..."
              className="min-h-24"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={sending} onClick={() => void send()}>
              Criar conversa
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
