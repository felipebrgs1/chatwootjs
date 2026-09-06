import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Plus, Search, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { WootAvatar } from "@chatwootjs/ui/components/woot-avatar";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/contacts")({
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
  blocked: boolean;
  custom_attributes: Record<string, unknown>;
  additional_attributes: Record<string, unknown>;
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

async function listContacts(
  accountId: number,
  params: { q?: string; labels?: string; page?: number },
): Promise<{ contacts: ApiContact[]; meta: { count: number; total_pages: number } }> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.labels) search.set("labels[]", params.labels);
  search.set("page", String(params.page ?? 1));
  const qs = search.toString();
  return apiFetch(`/api/v1/accounts/${accountId}/contacts${qs ? `?${qs}` : ""}`);
}

function ContactsPage() {
  const { session } = useSessionContext();
  const [contacts, setContacts] = useState<ApiContact[] | null>(null);
  const [labels, setLabels] = useState<ApiLabel[]>([]);
  const [query, setQuery] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [selected, setSelected] = useState<ApiContact | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  async function refresh(q = query, label = labelFilter): Promise<void> {
    const data = await listContacts(session!.accountId, {
      q: q || undefined,
      labels: label || undefined,
    });
    setContacts(data.contacts);
  }

  useEffect(() => {
    if (!session) return;
    void refresh();
    void apiFetch<{ labels: ApiLabel[] }>(`/api/v1/accounts/${session.accountId}/labels`).then(
      (d) => setLabels(d.labels),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Contatos</h1>
          <p className="text-sm text-muted-foreground">CRM da conta.</p>
        </div>
        <div className="flex gap-2">
          <ImportButton
            accountId={session.accountId}
            importing={importing}
            onResult={(msg) => setImportResult(msg)}
            onDone={() => {
              setImporting(false);
              void refresh();
            }}
          />
          <ExportButton accountId={session.accountId} />
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="size-4" /> Novo contato
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-3 overflow-y-auto p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome, email, telefone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void refresh(query, labelFilter);
              }}
              className="w-72 pl-8"
            />
          </div>
          <select
            value={labelFilter}
            onChange={(e) => {
              setLabelFilter(e.target.value);
              void refresh(query, e.target.value);
            }}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="">Todas as labels</option>
            {labels.map((label) => (
              <option key={label.id} value={label.title}>
                {label.title}
              </option>
            ))}
          </select>
          {importResult && <span className="text-xs text-muted-foreground">{importResult}</span>}
        </div>
        <section className="rounded-lg border bg-white">
          {contacts === null ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : contacts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum contato encontrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-start">Nome</th>
                  <th className="px-4 py-2 text-start">E-mail</th>
                  <th className="px-4 py-2 text-start">Telefone</th>
                  <th className="px-4 py-2 text-start">Localização</th>
                  <th className="px-4 py-2 text-start">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelected(contact)}
                    className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                  >
                    <td className="px-4 py-2 font-medium">{contact.name || "(sem nome)"}</td>
                    <td className="px-4 py-2">{contact.email ?? "—"}</td>
                    <td className="px-4 py-2">{contact.phone_number ?? "—"}</td>
                    <td className="px-4 py-2">{contact.location || "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(contact.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
      {creating && (
        <CreateContactDialog
          accountId={session.accountId}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void refresh();
          }}
        />
      )}
      {selected && (
        <ContactDrawer
          contact={selected}
          accountId={session.accountId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ImportButton({
  accountId,
  importing,
  onResult,
  onDone,
}: {
  accountId: number;
  importing: boolean;
  onResult: (msg: string) => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          onResult("Enviando import...");
          try {
            const body = new FormData();
            body.append("data_file", file);
            const data = await apiFetch<{ data_import: { id: number; status: number } }>(
              `/api/v1/accounts/${accountId}/contacts/import`,
              { method: "POST", body },
            );
            const fresh = await apiFetch<{
              data_import: {
                status: number;
                processed_records: number | null;
                total_records: number | null;
                errors: Array<{ message: string | null }>;
              };
            }>(`/api/v1/accounts/${accountId}/contacts/import/${data.data_import.id}`);
            onResult(
              `Import #${data.data_import.id}: ${fresh.data_import.processed_records ?? 0}/${fresh.data_import.total_records ?? 0} processados` +
                (fresh.data_import.errors.length > 0
                  ? ` · ${fresh.data_import.errors.length} erro(s)`
                  : ""),
            );
          } catch (err) {
            onResult(err instanceof ApiError ? err.message : "Erro na import");
          }
          onDone();
        }}
      />
      <Button
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="gap-2"
      >
        <Upload className="size-4" /> Importar CSV
      </Button>
    </>
  );
}

function ExportButton({ accountId }: { accountId: number }) {
  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={() => {
        // CSV simples gerado no cliente (mesma lista da API).
        void apiFetch<{ contacts: ApiContact[] }>(
          `/api/v1/accounts/${accountId}/contacts?per_page=100`,
        ).then(({ contacts }) => {
          const rows = [
            "name,email,phone_number",
            ...contacts.map((c) => `${c.name ?? ""},${c.email ?? ""},${c.phone_number ?? ""}`),
          ];
          const blob = new Blob([rows.join("\n")], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "contacts.csv";
          a.click();
          URL.revokeObjectURL(url);
        });
      }}
    >
      <Download className="size-4" /> Exportar
    </Button>
  );
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  email: z.string().optional(),
  phone_number: z.string().optional(),
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
    defaultValues: { name: "", email: "", phone_number: "", location: "" },
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg border bg-white p-5 shadow-lg">
        <h2 className="mb-3 text-base font-semibold">Novo contato</h2>
        <form
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              await apiFetch(`/api/v1/accounts/${accountId}/contacts`, {
                method: "POST",
                body: JSON.stringify(values),
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
          <div className="grid gap-1.5">
            <Label htmlFor="c-email">E-mail</Label>
            <Input id="c-email" type="email" {...form.register("email")} />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="c-phone">Telefone</Label>
              <Input id="c-phone" {...form.register("phone_number")} />
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

function ContactDrawer({
  contact,
  accountId,
  onClose,
}: {
  contact: ApiContact;
  accountId: number;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ApiContact>(contact);
  const [notes, setNotes] = useState<ApiNote[] | null>(null);
  const [noteText, setNoteText] = useState("");
  const [editing, setEditing] = useState(false);
  const editForm = useForm({
    defaultValues: {
      name: detail.name,
      email: detail.email ?? "",
      phone_number: detail.phone_number ?? "",
      location: detail.location,
    },
  });

  useEffect(() => {
    void apiFetch<{ contact: ApiContact }>(
      `/api/v1/accounts/${accountId}/contacts/${contact.id}`,
    ).then((d) => setDetail(d.contact));
    void apiFetch<{ notes: ApiNote[] }>(
      `/api/v1/accounts/${accountId}/contacts/${contact.id}/notes`,
    ).then((d) => setNotes(d.notes));
  }, [accountId, contact.id]);

  async function addNote(): Promise<void> {
    if (!noteText.trim()) return;
    await apiFetch(`/api/v1/accounts/${accountId}/contacts/${detail.id}/notes`, {
      method: "POST",
      body: JSON.stringify({ content: noteText }),
    });
    setNoteText("");
    const d = await apiFetch<{ notes: ApiNote[] }>(
      `/api/v1/accounts/${accountId}/contacts/${detail.id}/notes`,
    );
    setNotes(d.notes);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <button
        type="button"
        aria-label="Fechar"
        className="flex-1 cursor-default"
        onClick={onClose}
      />
      <aside className="flex w-full max-w-md flex-col overflow-y-auto border-l bg-white p-5">
        <div className="mb-4 flex items-center gap-3">
          <WootAvatar name={detail.name || "?"} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">{detail.name || "(sem nome)"}</h2>
            <p className="truncate text-sm text-muted-foreground">{detail.email ?? "—"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        {editing ? (
          <form
            onSubmit={editForm.handleSubmit(async (values) => {
              await apiFetch(`/api/v1/accounts/${accountId}/contacts/${detail.id}`, {
                method: "PATCH",
                body: JSON.stringify(values),
              });
              const fresh = await apiFetch<{ contact: ApiContact }>(
                `/api/v1/accounts/${accountId}/contacts/${detail.id}`,
              );
              setDetail(fresh.contact);
              setEditing(false);
            })}
            className="grid gap-3 rounded-lg border p-3"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="e-name">Nome</Label>
              <Input id="e-name" {...editForm.register("name")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-email">E-mail</Label>
              <Input id="e-email" {...editForm.register("email")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-phone">Telefone</Label>
              <Input id="e-phone" {...editForm.register("phone_number")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="e-location">Localização</Label>
              <Input id="e-location" {...editForm.register("location")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Salvar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-2 rounded-lg border p-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Telefone</dt>
              <dd>{detail.phone_number || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Localização</dt>
              <dd>{detail.location || "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Criado em</dt>
              <dd>{new Date(detail.created_at).toLocaleDateString("pt-BR")}</dd>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-1 w-fit"
              onClick={() => setEditing(true)}
            >
              Editar
            </Button>
          </dl>
        )}

        {/* Custom attributes */}
        <h3 className="mt-4 text-sm font-medium">Atributos custom</h3>
        <dl className="grid gap-2 rounded-lg border p-3 text-sm">
          {Object.keys(detail.custom_attributes).length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum.</p>
          ) : (
            Object.entries(detail.custom_attributes).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{key}</dt>
                <dd className="truncate">{String(value)}</dd>
              </div>
            ))
          )}
        </dl>

        {/* Notas */}
        <h3 className="mt-4 text-sm font-medium">Notas</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Adicionar nota..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addNote();
            }}
          />
          <Button variant="outline" size="sm" onClick={() => void addNote()}>
            +
          </Button>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {notes === null ? (
            <li className="text-xs text-muted-foreground">Carregando...</li>
          ) : notes.length === 0 ? (
            <li className="text-xs text-muted-foreground">Nenhuma nota.</li>
          ) : (
            notes.map((note) => (
              <li key={note.id} className="rounded-lg border p-3 text-sm">
                <p>{note.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {note.user_name ?? "—"} · {new Date(note.created_at).toLocaleDateString("pt-BR")}
                </p>
              </li>
            ))
          )}
        </ul>
      </aside>
    </div>
  );
}
