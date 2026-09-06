import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { ActionRows } from "@/components/settings/action-editor";
import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";
import { MACRO_ACTIONS, listMacros, type Macro, type MacroAction } from "@/lib/automation";

export const Route = createFileRoute("/_auth/app/settings/macros")({
  component: MacrosSettings,
});

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  visibility: z.enum(["personal", "global"]),
});

type Values = z.infer<typeof schema>;

function MacrosSettings() {
  const { session } = useSessionContext();
  const [items, setItems] = useState<Macro[] | null>(null);
  const [actions, setActions] = useState<MacroAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const isAdmin = session?.account.role === "administrator";
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", visibility: "personal" },
  });

  async function refresh(): Promise<void> {
    setItems(await listMacros(session!.accountId));
  }

  useEffect(() => {
    if (session) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function reset(action?: Macro): void {
    setEditing(action?.id ?? null);
    form.reset({ name: action?.name ?? "", visibility: action?.visibility ?? "personal" });
    setActions(action?.actions ?? []);
  }

  async function onSubmit(values: Values): Promise<void> {
    setError(null);
    if (actions.length === 0) {
      setError("Adicione ao menos uma ação");
      return;
    }
    try {
      const body = JSON.stringify({ ...values, actions });
      if (editing) {
        await apiFetch(`/api/v1/accounts/${session!.accountId}/macros/${editing}`, {
          method: "PATCH",
          body,
        });
      } else {
        await apiFetch(`/api/v1/accounts/${session!.accountId}/macros`, {
          method: "POST",
          body,
        });
      }
      reset();
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  async function remove(id: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${session!.accountId}/macros/${id}`, {
      method: "DELETE",
    });
    await refresh();
  }

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Configurações · Macros</h1>
        <p className="text-sm text-muted-foreground">
          Aplique várias ações numa conversa com 1 clique.
        </p>
      </header>
      <main className="grid max-w-2xl content-start gap-4 p-6">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-3 rounded-lg border bg-white p-4"
        >
          <h2 className="text-sm font-medium">{editing ? "Editar macro" : "Nova macro"}</h2>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...form.register("name")} placeholder="Triagem urgente" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="visibility">Visibilidade</Label>
              <select
                id="visibility"
                {...form.register("visibility")}
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="personal">Pessoal</option>
                {isAdmin && <option value="global">Global</option>}
              </select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Ações</Label>
            <ActionRows actions={actions} options={MACRO_ACTIONS} onChange={setActions} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {editing ? "Salvar" : "Criar"}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={() => reset()}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
        <section className="rounded-lg border bg-white">
          {items === null ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 p-3">
                  <Zap className="mt-0.5 size-4 flex-shrink-0 text-woot-blue" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.name}
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                        {item.visibility === "global" ? "global" : "pessoal"}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.actions.map((a) => a.action_name).join(" · ")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${item.name}`}
                    onClick={() => reset(item)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${item.name}`}
                    onClick={() => void remove(item.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
