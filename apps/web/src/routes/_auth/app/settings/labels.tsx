import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Checkbox } from "@chatwootjs/ui/components/checkbox";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/labels")({
  component: LabelsSettings,
});

interface ApiLabel {
  id: number;
  title: string;
  color: string;
  description: string | null;
  show_on_sidebar: boolean;
}

// Paridade com validations.js do Rails/Vue: mín. 2 chars, sem espaços
// (só letras, números, hífen e underline), sempre minúsculo.
const titleSchema = z
  .string()
  .trim()
  .min(2, "Mínimo de 2 caracteres")
  .regex(/^[A-Za-z0-9_-]+$/, "Só letras, números, hífen e underline (sem espaços)");

const schema = z.object({
  title: titleSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  description: z.string().optional(),
  show_on_sidebar: z.boolean(),
});

type Values = z.infer<typeof schema>;

function randomColor(): string {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i += 1) color += letters[Math.floor(Math.random() * 16)];
  return color;
}

/**
 * Configurações · Labels 1:1 com settings/labels/Index do v4: header com
 * busca + contador + botão, tabela Nome/Descrição/Cor/Ações e modais de
 * criar/editar/excluir.
 */
function LabelsSettings() {
  const { session } = useSessionContext();
  const [labels, setLabels] = useState<ApiLabel[] | null>(null);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ApiLabel | null>(null);
  const [deleting, setDeleting] = useState<ApiLabel | null>(null);
  const isAdmin = session?.account.role === "administrator";

  async function refresh(): Promise<void> {
    const data = await apiFetch<{ labels: ApiLabel[] }>(
      `/api/v1/accounts/${session!.accountId}/labels`,
    );
    setLabels(data.labels);
  }

  useEffect(() => {
    if (session) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return labels ?? [];
    return (labels ?? []).filter(
      (l) => l.title.toLowerCase().includes(q) || (l.description ?? "").toLowerCase().includes(q),
    );
  }, [labels, query]);

  if (!session) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-woot-bg">
      {/* Header 1:1 com BaseSettingsHeader */}
      <header className="shrink-0 px-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-xl font-medium text-woot-slate-12">Labels</h1>
                {(labels?.length ?? 0) > 0 && (
                  <span className="text-sm text-woot-slate-11">
                    {labels!.length} {labels!.length === 1 ? "label" : "labels"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-woot-slate-11">
                Labels ajudam a categorizar e priorizar conversas. Dá para aplicar numa conversa ou
                contato pelo painel lateral.{" "}
                <a
                  href="https://www.chatwoot.com/hc/user-guide/en/articles/1155907"
                  target="_blank"
                  rel="noreferrer"
                  className="text-woot-blue hover:underline"
                >
                  Saiba mais sobre labels
                </a>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-woot-slate-11" />
                <Input
                  type="search"
                  placeholder="Buscar labels..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-8 w-56 pl-8"
                />
              </div>
              {isAdmin && (
                <Button size="sm" onClick={() => setAdding(true)} className="gap-2">
                  <Plus className="size-4" /> Adicionar label
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto w-full max-w-5xl pb-6">
          {labels === null ? (
            <p className="py-10 text-center text-sm text-woot-slate-11">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-woot-slate-11">
              {query ? "Nenhuma label para essa busca." : "Nenhuma label nesta conta."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-woot-slate-11">
                    <th className="px-4 py-2.5 font-medium">Nome</th>
                    <th className="px-4 py-2.5 font-medium">Descrição</th>
                    <th className="px-4 py-2.5 font-medium">Cor</th>
                    {isAdmin && <th className="px-4 py-2.5 text-right font-medium">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((label) => (
                    <tr
                      key={label.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <td className="px-4 py-2.5 text-woot-slate-12">{label.title}</td>
                      <td className="max-w-64 truncate px-4 py-2.5 text-woot-slate-11">
                        {label.description || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center">
                          <span
                            className="mr-2 size-4 rounded border border-solid border-border"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="text-woot-slate-12">{label.color}</span>
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5">
                          <span className="flex flex-shrink-0 justify-end gap-3">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Editar"
                              aria-label={`Editar ${label.title}`}
                              onClick={() => setEditing(label)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="Excluir"
                              aria-label={`Excluir ${label.title}`}
                              onClick={() => setDeleting(label)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {adding && (
        <LabelDialog
          accountId={session.accountId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void refresh();
          }}
        />
      )}
      {editing && (
        <LabelDialog
          accountId={session.accountId}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          label={deleting}
          accountId={session.accountId}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

/** Modal criar/editar (AddLabel/EditLabel do v4). */
function LabelDialog({
  accountId,
  initial,
  onClose,
  onSaved,
}: {
  accountId: number;
  initial?: ApiLabel;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? "",
      color: initial?.color ?? randomColor(),
      description: initial?.description ?? "",
      show_on_sidebar: initial?.show_on_sidebar ?? true,
    },
  });
  const [error, setError] = useState<string | null>(null);
  const color = useWatch({ control: form.control, name: "color" });
  const showOnSidebar = useWatch({ control: form.control, name: "show_on_sidebar" });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <h2 className="mb-1 text-base font-semibold text-woot-slate-12">
          {initial ? "Editar label" : "Adicionar label"}
        </h2>
        <p className="mb-3 text-sm text-woot-slate-11">
          Labels agrupam conversas com o mesmo tema.
        </p>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              const body = JSON.stringify({ ...values, title: values.title.toLowerCase() });
              if (initial) {
                await apiFetch(`/api/v1/accounts/${accountId}/labels/${initial.id}`, {
                  method: "PATCH",
                  body,
                });
              } else {
                await apiFetch(`/api/v1/accounts/${accountId}/labels`, {
                  method: "POST",
                  body,
                });
              }
              onSaved();
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
            <Label htmlFor="label-title">Nome da label</Label>
            <Input id="label-title" placeholder="Nome da label" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="label-desc">Descrição</Label>
            <Input
              id="label-desc"
              placeholder="Descrição da label"
              {...form.register("description")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="label-color">Cor</Label>
            <div className="flex items-center gap-2">
              <Input
                id="label-color"
                type="color"
                {...form.register("color")}
                className="h-9 w-14 cursor-pointer px-1"
              />
              <span className="text-sm text-woot-slate-11">{color?.toUpperCase()}</span>
            </div>
            {form.formState.errors.color && (
              <p className="text-xs text-destructive">{form.formState.errors.color.message}</p>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-woot-slate-12">
            <Checkbox
              checked={showOnSidebar}
              onCheckedChange={(v) => form.setValue("show_on_sidebar", v === true)}
            />
            Mostrar label na sidebar
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {initial ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Modal confirmar exclusão (woot-delete-modal do v4). */
function DeleteDialog({
  label,
  accountId,
  onClose,
  onDeleted,
}: {
  label: ApiLabel;
  accountId: number;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
        <h2 className="mb-1 text-base font-semibold text-woot-slate-12">Confirmar exclusão</h2>
        <p className="mb-4 text-sm text-woot-slate-11">
          Tem certeza que deseja excluir <strong>{label.title}</strong>?
        </p>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Não, manter
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError(null);
              void apiFetch(`/api/v1/accounts/${accountId}/labels/${label.id}`, {
                method: "DELETE",
              })
                .then(onDeleted)
                .catch((err: unknown) => {
                  setError(err instanceof ApiError ? err.message : "Falha ao excluir");
                  setBusy(false);
                });
            }}
          >
            Sim, excluir
          </Button>
        </div>
      </div>
    </div>
  );
}
