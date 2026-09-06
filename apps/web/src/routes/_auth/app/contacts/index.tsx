import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDownUp,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipsis,
  ListFilter,
  Plus,
  Search,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@chatwootjs/ui/components/dropdown-menu";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/contacts/")({
  component: ContactsPage,
});

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

interface ContactsMeta {
  count: number;
  current_page: number;
  total_pages: number;
  per_page: number;
}

const SORT_FIELDS = [
  { value: "name", label: "Nome" },
  { value: "email", label: "E-mail" },
  { value: "phone_number", label: "Telefone" },
  { value: "last_activity_at", label: "Última atividade" },
  { value: "created_at", label: "Criado em" },
] as const;

function companyOf(contact: ApiContact): string {
  if (contact.company) return contact.company.name;
  const raw = contact.additional_attributes["company_name"];
  return typeof raw === "string" ? raw : "";
}

async function listContacts(
  accountId: number,
  params: { q?: string; labels?: string; sort?: string; page?: number },
): Promise<{ contacts: ApiContact[]; meta: ContactsMeta }> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.labels) search.set("labels[]", params.labels);
  if (params.sort) search.set("sort", params.sort);
  search.set("page", String(params.page ?? 1));
  const qs = search.toString();
  return apiFetch(`/api/v1/accounts/${accountId}/contacts${qs ? `?${qs}` : ""}`);
}

/**
 * Contatos estilo Chatwoot v4 (components-next/Contacts): header com busca,
 * filtro, ordenação e ações; lista de cards expansíveis; rodapé de paginação.
 */
function ContactsPage() {
  const { session } = useSessionContext();
  const navigate = Route.useNavigate();
  const [contacts, setContacts] = useState<ApiContact[] | null>(null);
  const [meta, setMeta] = useState<ContactsMeta | null>(null);
  const [labels, setLabels] = useState<ApiLabel[]>([]);
  const [query, setQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [sortField, setSortField] = useState<string>("last_activity_at");
  const [sortDir, setSortDir] = useState<"" | "-">("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(
    async (opts?: { q?: string; label?: string; sort?: string; page?: number }) => {
      if (!session) return;
      const data = await listContacts(session.accountId, {
        q: opts?.q || undefined,
        labels: opts?.label || undefined,
        sort: opts?.sort,
        page: opts?.page ?? 1,
      });
      setContacts(data.contacts);
      setMeta(data.meta);
      setSelectedIds([]);
    },
    [session],
  );

  // Busca com debounce (300ms, igual ao original) + refetch em filtro/sort/página.
  useEffect(() => {
    if (!session) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void refresh({
        q: query,
        label: labelFilter,
        sort: `${sortDir}${sortField}`,
        page,
      });
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [session, query, labelFilter, sortField, sortDir, page, refresh]);

  useEffect(() => {
    if (!session) return;
    void apiFetch<{ labels: ApiLabel[] }>(`/api/v1/accounts/${session.accountId}/labels`).then(
      (d) => setLabels(d.labels),
    );
  }, [session]);

  if (!session) return null;

  const visibleIds = (contacts ?? []).map((c) => c.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  function toggleSelect(id: number, value?: boolean): void {
    setSelectedIds((prev) => {
      const has = prev.includes(id);
      const want = value ?? !has;
      if (want && !has) return [...prev, id];
      if (!want && has) return prev.filter((c) => c !== id);
      return prev;
    });
  }

  function toggleSelectAll(value: boolean): void {
    setSelectedIds((prev) => {
      if (value) return Array.from(new Set([...prev, ...visibleIds]));
      return prev.filter((id) => !visibleIds.includes(id));
    });
  }

  async function deleteSelected(): Promise<void> {
    if (!session) return;
    for (const id of selectedIds) {
      await apiFetch(`/api/v1/accounts/${session.accountId}/contacts/${id}`, {
        method: "DELETE",
      });
    }
    setSelectedIds([]);
    setPage(1);
    await refresh({ q: query, label: labelFilter, sort: `${sortDir}${sortField}`, page: 1 });
  }

  async function doImport(file: File): Promise<void> {
    if (!session) return;
    setImportResult("Enviando import...");
    try {
      const body = new FormData();
      body.append("data_file", file);
      const data = await apiFetch<{ data_import: { id: number } }>(
        `/api/v1/accounts/${session.accountId}/contacts/import`,
        { method: "POST", body },
      );
      const fresh = await apiFetch<{
        data_import: {
          processed_records: number | null;
          total_records: number | null;
          errors: Array<{ message: string | null }>;
        };
      }>(`/api/v1/accounts/${session.accountId}/contacts/import/${data.data_import.id}`);
      setImportResult(
        `Import #${data.data_import.id}: ${fresh.data_import.processed_records ?? 0}/${fresh.data_import.total_records ?? 0} processados` +
          (fresh.data_import.errors.length > 0
            ? ` · ${fresh.data_import.errors.length} erro(s)`
            : ""),
      );
    } catch (err) {
      setImportResult(err instanceof ApiError ? err.message : "Erro na import");
    }
    await refresh({ q: query, label: labelFilter, sort: `${sortDir}${sortField}`, page });
  }

  function doExport(): void {
    if (!session) return;
    void apiFetch<{ contacts: ApiContact[] }>(
      `/api/v1/accounts/${session.accountId}/contacts?per_page=100`,
    ).then(({ contacts: rows }) => {
      const lines = [
        "name,email,phone_number",
        ...rows.map((c) => `${c.name ?? ""},${c.email ?? ""},${c.phone_number ?? ""}`),
      ];
      const blob = new Blob([lines.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contacts.csv";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  const isFiltered = query.trim() !== "" || labelFilter !== "";
  const showEmptyState = contacts !== null && contacts.length === 0 && !isFiltered;
  const showEmptyText = contacts !== null && contacts.length === 0 && isFiltered;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-woot-bg">
      {/* Header 1:1 com ContactHeader do v4 */}
      <header className="sticky top-0 z-20 shrink-0 px-6">
        <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-2 py-6 sm:items-center">
          <span className="truncate text-xl font-medium text-woot-slate-12">Contatos</span>
          <div className="flex flex-shrink-0 flex-col items-center gap-4 sm:flex-row">
            <div className="relative w-full">
              <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-woot-slate-11" />
              <Input
                type="search"
                placeholder="Buscar contato..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-full pl-8"
              />
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Filtrar por etiqueta"
                  className="relative grid size-8 place-content-center rounded-lg text-woot-slate-11 transition-colors hover:bg-muted hover:text-woot-slate-12"
                >
                  <ListFilter className="size-4" />
                  {labelFilter && (
                    <span className="absolute right-1 top-1 size-2 rounded-full bg-woot-blue" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Filtrar por etiqueta</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={labelFilter}
                      onValueChange={(v) => {
                        setLabelFilter(v as string);
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="">Todas</DropdownMenuRadioItem>
                      {labels.map((label) => (
                        <DropdownMenuRadioItem key={label.id} value={label.title}>
                          {label.title}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Ordenar contatos"
                  className="grid size-8 place-content-center rounded-lg text-woot-slate-11 transition-colors hover:bg-muted hover:text-woot-slate-12"
                >
                  <ArrowDownUp className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={sortField}
                      onValueChange={(v) => {
                        setSortField(v as string);
                        setPage(1);
                      }}
                    >
                      {SORT_FIELDS.map((f) => (
                        <DropdownMenuRadioItem key={f.value} value={f.value}>
                          {f.label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Ordem</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={sortDir}
                      onValueChange={(v) => {
                        setSortDir(v as "" | "-");
                        setPage(1);
                      }}
                    >
                      <DropdownMenuRadioItem value="">Crescente</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="-">Decrescente</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Mais ações"
                  className="grid size-8 place-content-center rounded-lg text-woot-slate-11 transition-colors hover:bg-muted hover:text-woot-slate-12"
                >
                  <Ellipsis className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => setCreating(true)} className="gap-2">
                      <Plus className="size-4" /> Novo contato
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => fileRef.current?.click()} className="gap-2">
                      <Upload className="size-4" /> Importar CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => doExport()} className="gap-2">
                      <Download className="size-4" /> Exportar
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="h-4 w-px flex-shrink-0 bg-border" />
            <Button size="sm" onClick={() => setCreating(true)}>
              Novo contato
            </Button>
          </div>
        </div>
      </header>

      {/* Lista de cards */}
      <main className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto w-full max-w-5xl">
          {importResult && <p className="pt-2 text-xs text-muted-foreground">{importResult}</p>}
          {contacts === null ? (
            <p className="py-10 text-center text-sm text-woot-slate-11">Carregando...</p>
          ) : showEmptyState ? (
            <div className="flex flex-col items-center gap-3 pt-14 text-center">
              <WootAvatar name="+" size="lg" />
              <div>
                <p className="font-medium text-woot-slate-12">Nenhum contato ainda</p>
                <p className="text-sm text-woot-slate-11">
                  Adicione seu primeiro contato ou importe um CSV.
                </p>
              </div>
              <Button size="sm" onClick={() => setCreating(true)} className="gap-2">
                <Plus className="size-4" /> Novo contato
              </Button>
            </div>
          ) : showEmptyText ? (
            <p className="py-10 text-center text-base text-woot-slate-11">
              Nenhum contato encontrado.
            </p>
          ) : (
            <div className="flex flex-col gap-4 pb-6 pt-4">
              {selectedIds.length > 0 && (
                <BulkBar
                  count={selectedIds.length}
                  allChecked={allVisibleSelected}
                  onToggleAll={toggleSelectAll}
                  onClear={() => setSelectedIds([])}
                  onDelete={() => void deleteSelected()}
                />
              )}
              {contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  accountId={session.accountId}
                  expanded={expandedId === contact.id}
                  selected={selectedIds.includes(contact.id)}
                  selectable={selectedIds.length > 0}
                  onToggleExpand={() =>
                    setExpandedId((prev) => (prev === contact.id ? null : contact.id))
                  }
                  onSelect={(value) => toggleSelect(contact.id, value)}
                  onShowDetails={() =>
                    navigate({
                      to: "/app/contacts/$contactId",
                      params: { contactId: String(contact.id) },
                    })
                  }
                  onChanged={() =>
                    void refresh({
                      q: query,
                      label: labelFilter,
                      sort: `${sortDir}${sortField}`,
                      page,
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Rodapé de paginação */}
      {meta && meta.total_pages > 1 && (
        <footer className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-woot-bg px-6 py-2">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between text-xs text-woot-slate-11">
            <span>
              Mostrando página {meta.current_page} de {meta.total_pages} · {meta.count} contato(s)
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={meta.current_page <= 1}
                aria-label="Página anterior"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                disabled={meta.current_page >= meta.total_pages}
                aria-label="Próxima página"
                onClick={() => setPage((p) => Math.min(meta.total_pages, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </footer>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void doImport(file);
        }}
      />
      {creating && (
        <CreateContactDialog
          accountId={session.accountId}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setPage(1);
            void refresh({ q: "", label: "", sort: `${sortDir}${sortField}`, page: 1 });
          }}
        />
      )}
    </div>
  );
}

/** Barra de ações em massa (seleção via avatar). */
function BulkBar({
  count,
  allChecked,
  onToggleAll,
  onClear,
  onDelete,
}: {
  count: number;
  allChecked: boolean;
  onToggleAll: (value: boolean) => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 text-sm">
      <Checkbox checked={allChecked} onCheckedChange={(v) => onToggleAll(v === true)} />
      <span className="font-medium text-woot-slate-12">{count} selecionado(s)</span>
      <div className="ml-auto flex items-center gap-2">
        {confirming ? (
          <>
            <span className="text-xs text-woot-slate-11">Excluir {count} contato(s)?</span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
            >
              Confirmar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
              Excluir
            </Button>
            <Button variant="ghost" size="sm" onClick={onClear}>
              Limpar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** Card do contato 1:1 com ContactsCard do v4 (avatar, dados, expandir). */
function ContactCard({
  contact,
  accountId,
  expanded,
  selected,
  selectable,
  onToggleExpand,
  onSelect,
  onShowDetails,
  onChanged,
}: {
  contact: ApiContact;
  accountId: number;
  expanded: boolean;
  selected: boolean;
  selectable: boolean;
  onToggleExpand: () => void;
  onSelect: (value: boolean) => void;
  onShowDetails: () => void;
  onChanged: () => void;
}) {
  const [hoverAvatar, setHoverAvatar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const showCheckbox = hoverAvatar || selected || selectable;
  const company = companyOf(contact);

  async function remove(): Promise<void> {
    await apiFetch(`/api/v1/accounts/${accountId}/contacts/${contact.id}`, {
      method: "DELETE",
    });
    onChanged();
  }

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card transition-colors",
        selected && "bg-woot-slate-3/60 dark:bg-woot-slate-3/30",
      )}
    >
      <div className="flex items-center justify-start gap-4 p-4">
        <div
          className="relative shrink-0"
          onMouseEnter={() => setHoverAvatar(true)}
          onMouseLeave={() => setHoverAvatar(false)}
        >
          <WootAvatar name={contact.name || "?"} size="lg" />
          {showCheckbox && (
            <span
              role="checkbox"
              aria-checked={selected}
              aria-label={`Selecionar ${contact.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(!selected);
              }}
              className="absolute inset-0 z-10 grid cursor-pointer place-content-center rounded-full border border-border bg-card/70 backdrop-blur-[2px]"
            >
              <Checkbox checked={selected} className="pointer-events-none" tabIndex={-1} />
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="truncate text-base font-medium text-woot-slate-12">
              {contact.name || "(sem nome)"}
            </span>
            {company && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <Building2 className="mb-0.5 size-4 shrink-0 text-woot-slate-10" />
                <span className="truncate text-sm text-woot-slate-11">{company}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1">
            {contact.email && (
              <span className="max-w-72 truncate text-sm text-woot-slate-11" title={contact.email}>
                {contact.email}
              </span>
            )}
            {contact.email && <span className="h-3 w-px truncate bg-border" />}
            {contact.phone_number && (
              <span className="truncate text-sm text-woot-slate-11">{contact.phone_number}</span>
            )}
            {contact.phone_number && <span className="h-3 w-px truncate bg-border" />}
            {contact.location && (
              <span className="truncate text-sm text-woot-slate-11">{contact.location}</span>
            )}
            {contact.location && <span className="h-3 w-px truncate bg-border" />}
            <button
              type="button"
              onClick={onShowDetails}
              className="text-sm text-woot-blue hover:underline"
            >
              Ver detalhes
            </button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={expanded ? "Recolher" : "Expandir"}
          aria-expanded={expanded}
          onClick={onToggleExpand}
          className={cn("shrink-0 transition-transform", expanded && "rotate-180")}
        >
          <ChevronDown className="size-4" />
        </Button>
      </div>
      <div
        className={cn(
          "grid overflow-hidden transition-all duration-300 ease-in-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-4 border-t border-border p-6">
            {expanded && (
              <CardEditForm
                key={contact.id}
                contact={contact}
                accountId={accountId}
                saving={saving}
                onSaving={setSaving}
                onSaved={onChanged}
              />
            )}
            <div className="border-t border-border pt-4">
              {confirmDelete ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-woot-slate-11">
                    Excluir {contact.name || "este contato"}?
                  </span>
                  <Button variant="destructive" size="sm" onClick={() => void remove()}>
                    Confirmar exclusão
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
                  Excluir contato
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Form de edição inline do card (nome, e-mail, telefone, empresa). */
function CardEditForm({
  contact,
  accountId,
  saving,
  onSaving,
  onSaved,
}: {
  contact: ApiContact;
  accountId: number;
  saving: boolean;
  onSaving: (value: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(contact.name ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  const [phone, setPhone] = useState(contact.phone_number ?? "");
  const [company, setCompany] = useState(companyOf(contact));
  const [error, setError] = useState<string | null>(null);

  async function save(): Promise<void> {
    if (!name.trim()) {
      setError("Informe o nome");
      return;
    }
    setError(null);
    onSaving(true);
    try {
      await apiFetch(`/api/v1/accounts/${accountId}/contacts/${contact.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone_number: phone.trim() || null,
          additional_attributes: { company_name: company.trim() },
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao salvar");
    } finally {
      onSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`card-name-${contact.id}`}>Nome</Label>
        <Input
          id={`card-name-${contact.id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`card-company-${contact.id}`}>Empresa</Label>
        <Input
          id={`card-company-${contact.id}`}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`card-email-${contact.id}`}>E-mail</Label>
        <Input
          id={`card-email-${contact.id}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`card-phone-${contact.id}`}>Telefone</Label>
        <Input
          id={`card-phone-${contact.id}`}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={saving}>
          Atualizar
        </Button>
      </div>
    </form>
  );
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  email: z.string().optional(),
  phone_number: z.string().optional(),
  company_name: z.string().optional(),
  location: z.string().optional(),
});

type CreateValues = z.infer<typeof createSchema>;

function CreateContactDialog({
  accountId,
  onClose,
  onCreated,
}: {
  accountId: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", phone_number: "", company_name: "", location: "" },
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-lg">
        <h2 className="mb-3 text-base font-semibold">Novo contato</h2>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              await apiFetch(`/api/v1/accounts/${accountId}/contacts`, {
                method: "POST",
                body: JSON.stringify({
                  name: values.name,
                  email: values.email || undefined,
                  phone_number: values.phone_number || undefined,
                  location: values.location || undefined,
                  additional_attributes: values.company_name?.trim()
                    ? { company_name: values.company_name.trim() }
                    : undefined,
                }),
              });
              onCreated();
            } catch (err) {
              setError(
                err instanceof ApiError
                  ? (Object.values(err.attributes ?? {})[0]?.[0] ?? err.message)
                  : "Erro inesperado",
              );
            }
          })}
          className="grid gap-3"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="c-name">Nome</Label>
            <Input id="c-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="c-email">E-mail</Label>
              <Input id="c-email" type="email" {...form.register("email")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-phone">Telefone</Label>
              <Input id="c-phone" {...form.register("phone_number")} />
            </div>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="c-company">Empresa</Label>
              <Input id="c-company" {...form.register("company_name")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-location">Localização</Label>
              <Input id="c-location" {...form.register("location")} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Criar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
