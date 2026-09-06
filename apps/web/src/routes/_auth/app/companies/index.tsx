import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, ChevronDown, Plus, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";
import { cn } from "@chatwootjs/ui/lib/utils";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/companies/")({
  component: CompaniesPage,
});

export interface ApiCompany {
  id: number;
  name: string;
  domain: string | null;
  description: string | null;
  contacts_count: number;
  additional_attributes: Record<string, unknown>;
  custom_attributes: Record<string, unknown>;
  last_activity_at: string | null;
  created_at: string;
}

interface CompaniesMeta {
  count: number;
  current_page: number;
  total_pages: number;
  per_page: number;
}

async function listCompanies(
  accountId: number,
  params: { q?: string; page?: number },
): Promise<{ companies: ApiCompany[]; meta: CompaniesMeta }> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  search.set("page", String(params.page ?? 1));
  const qs = search.toString();
  return apiFetch(`/api/v1/accounts/${accountId}/companies${qs ? `?${qs}` : ""}`);
}

/**
 * Empresas estilo Chatwoot v4 (components-next/Companies): header com busca
 * e ação; lista de cards expansíveis; rodapé de paginação.
 */
function CompaniesPage() {
  const { session } = useSessionContext();
  const navigate = Route.useNavigate();
  const [companies, setCompanies] = useState<ApiCompany[] | null>(null);
  const [meta, setMeta] = useState<CompaniesMeta | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function refresh(q = query, p = page): Promise<void> {
    if (!session) return;
    const data = await listCompanies(session.accountId, { q: q || undefined, page: p });
    setCompanies(data.companies);
    setMeta(data.meta);
  }

  useEffect(() => {
    if (!session) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void refresh(query, page);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, query, page]);

  if (!session) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-woot-bg">
      <header className="sticky top-0 z-20 shrink-0 px-6">
        <div className="mx-auto flex w-full max-w-5xl items-start justify-between gap-2 py-6 sm:items-center">
          <span className="truncate text-xl font-medium text-woot-slate-12">Empresas</span>
          <div className="flex flex-shrink-0 items-center gap-4">
            <div className="relative w-full">
              <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-woot-slate-11" />
              <Input
                type="search"
                placeholder="Buscar empresa..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="h-8 w-full pl-8"
              />
            </div>
            <div className="h-4 w-px flex-shrink-0 bg-border" />
            <Button size="sm" onClick={() => setCreating(true)}>
              Nova empresa
            </Button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto w-full max-w-5xl">
          {companies === null ? (
            <p className="py-10 text-center text-sm text-woot-slate-11">Carregando...</p>
          ) : companies.length === 0 && !query ? (
            <div className="flex flex-col items-center gap-3 pt-14 text-center">
              <WootAvatar name="+" size="lg" />
              <div>
                <p className="font-medium text-woot-slate-12">Nenhuma empresa ainda</p>
                <p className="text-sm text-woot-slate-11">Cadastre a primeira empresa da conta.</p>
              </div>
              <Button size="sm" onClick={() => setCreating(true)} className="gap-2">
                <Plus className="size-4" /> Nova empresa
              </Button>
            </div>
          ) : companies.length === 0 ? (
            <p className="py-10 text-center text-base text-woot-slate-11">
              Nenhuma empresa encontrada.
            </p>
          ) : (
            <div className="flex flex-col gap-4 pb-6 pt-4">
              {companies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  accountId={session.accountId}
                  expanded={expandedId === company.id}
                  onToggleExpand={() =>
                    setExpandedId((prev) => (prev === company.id ? null : company.id))
                  }
                  onShowDetails={() =>
                    navigate({
                      to: "/app/companies/$companyId",
                      params: { companyId: String(company.id) },
                    })
                  }
                  onChanged={() => void refresh()}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {meta && meta.total_pages > 1 && (
        <footer className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-woot-bg px-6 py-2">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between text-xs text-woot-slate-11">
            <span>
              Mostrando página {meta.current_page} de {meta.total_pages} · {meta.count} empresa(s)
            </span>
          </div>
        </footer>
      )}

      {creating && (
        <CreateCompanyDialog
          accountId={session.accountId}
          onClose={() => setCreating(false)}
          onCreated={(company) => {
            setCreating(false);
            navigate({
              to: "/app/companies/$companyId",
              params: { companyId: String(company.id) },
            });
          }}
        />
      )}
    </div>
  );
}

function CompanyCard({
  company,
  accountId,
  expanded,
  onToggleExpand,
  onShowDetails,
  onChanged,
}: {
  company: ApiCompany;
  accountId: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onShowDetails: () => void;
  onChanged: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(company.name);
  const [domain, setDomain] = useState(company.domain ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(): Promise<void> {
    if (!name.trim()) {
      setError("Informe o nome");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await apiFetch(`/api/v1/accounts/${accountId}/companies/${company.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          domain: domain.trim() || null,
          description: description.trim() || null,
        }),
      });
      onChanged();
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
    onChanged();
  }

  return (
    <div className="relative rounded-xl border border-border bg-card transition-colors">
      <div className="flex items-center justify-start gap-4 p-4">
        <span className="grid size-10 shrink-0 place-content-center rounded-full bg-woot-slate-3 text-sm text-woot-slate-11">
          <Building2 className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="truncate text-base font-medium text-woot-slate-12">
              {company.name}
            </span>
            {company.domain && (
              <span className="truncate text-sm text-woot-slate-11">{company.domain}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1">
            <span className="text-sm text-woot-slate-11">{company.contacts_count} contato(s)</span>
            <span className="h-3 w-px truncate bg-border" />
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
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void save();
                }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <div className="grid gap-1.5">
                  <Label htmlFor={`co-name-${company.id}`}>Nome</Label>
                  <Input
                    id={`co-name-${company.id}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`co-domain-${company.id}`}>Domínio</Label>
                  <Input
                    id={`co-domain-${company.id}`}
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="empresa.com"
                  />
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor={`co-desc-${company.id}`}>Descrição</Label>
                  <Input
                    id={`co-desc-${company.id}`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                {error && <p className="text-xs text-destructive sm:col-span-2">{error}</p>}
                <div className="sm:col-span-2">
                  <Button type="submit" size="sm" disabled={saving}>
                    Atualizar
                  </Button>
                </div>
              </form>
            )}
            <div className="border-t border-border pt-4">
              {confirmDelete ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-woot-slate-11">
                    Excluir {company.name}? Os contatos são mantidos.
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
                  Excluir empresa
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  domain: z.string().optional(),
  description: z.string().optional(),
});

type CreateValues = z.infer<typeof createSchema>;

export function CreateCompanyDialog({
  accountId,
  onClose,
  onCreated,
}: {
  accountId: number;
  onClose: () => void;
  onCreated: (company: ApiCompany) => void;
}) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", domain: "", description: "" },
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-5 shadow-lg">
        <h2 className="mb-3 text-base font-semibold">Nova empresa</h2>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              const d = await apiFetch<{ company: ApiCompany }>(
                `/api/v1/accounts/${accountId}/companies`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    name: values.name,
                    domain: values.domain || undefined,
                    description: values.description || undefined,
                  }),
                },
              );
              onCreated(d.company);
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
            <Label htmlFor="co-new-name">Nome</Label>
            <Input id="co-new-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="co-new-domain">Domínio</Label>
            <Input id="co-new-domain" placeholder="empresa.com" {...form.register("domain")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="co-new-desc">Descrição</Label>
            <Input id="co-new-desc" {...form.register("description")} />
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
