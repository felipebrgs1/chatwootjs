import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/custom-attributes")({
  component: CustomAttributesSettings,
});

interface ApiCustomAttribute {
  id: number;
  attribute_model: number;
  attribute_key: string;
  attribute_display_name: string | null;
  attribute_display_type: number;
  attribute_values: string[];
}

const DISPLAY_TYPES = [
  { value: 0, label: "Texto" },
  { value: 1, label: "Número" },
  { value: 2, label: "Link" },
  { value: 3, label: "Data" },
  { value: 4, label: "Lista" },
  { value: 5, label: "Checkbox" },
] as const;

const schema = z.object({
  attribute_key: z
    .string()
    .trim()
    .min(1, "Informe a chave")
    .regex(/^[a-zA-Z0-9_]+$/, "Use letras, números e _"),
  attribute_display_name: z.string().trim().min(1, "Informe o nome"),
  attribute_display_type: z.coerce.number().int().min(0).max(5),
  attribute_values: z.string().optional(), // vírgula-separada quando lista
});

type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function CustomAttributesSettings() {
  const { session } = useSessionContext();
  const [items, setItems] = useState<ApiCustomAttribute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = session?.account.role === "administrator";
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      attribute_key: "",
      attribute_display_name: "",
      attribute_display_type: 0,
      attribute_values: "",
    },
  });

  async function refresh(): Promise<void> {
    const data = await apiFetch<{ custom_attribute_definitions: ApiCustomAttribute[] }>(
      `/api/v1/accounts/${session!.accountId}/custom_attribute_definitions?attribute_model=0`,
    );
    setItems(data.custom_attribute_definitions);
  }

  useEffect(() => {
    if (session) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function onSubmit(values: FormValues): Promise<void> {
    setError(null);
    try {
      await apiFetch(`/api/v1/accounts/${session!.accountId}/custom_attribute_definitions`, {
        method: "POST",
        body: JSON.stringify({
          attribute_model: 0,
          attribute_key: values.attribute_key,
          attribute_display_name: values.attribute_display_name,
          attribute_display_type: values.attribute_display_type,
          attribute_values:
            values.attribute_display_type === 4
              ? (values.attribute_values ?? "")
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean)
              : [],
        }),
      });
      form.reset({
        attribute_key: "",
        attribute_display_name: "",
        attribute_display_type: 0,
        attribute_values: "",
      });
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (Object.values(err.attributes ?? {})[0]?.[0] ?? err.message)
          : "Erro inesperado",
      );
    }
  }

  async function remove(id: number): Promise<void> {
    await apiFetch(`/api/v1/accounts/${session!.accountId}/custom_attribute_definitions/${id}`, {
      method: "DELETE",
    });
    await refresh();
  }

  const displayType = form.watch("attribute_display_type");

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-card px-6 py-4">
        <h1 className="text-lg font-semibold">Configurações · Atributos custom</h1>
        <p className="text-sm text-muted-foreground">Campos extras para contatos e conversas.</p>
      </header>
      <main className="grid max-w-xl content-start gap-4 p-6">
        {isAdmin && (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-3 rounded-lg border bg-card p-4"
          >
            <h2 className="text-sm font-medium">Novo atributo (contato)</h2>
            <div className="grid gap-1.5">
              <Label htmlFor="attribute_key">Chave</Label>
              <Input
                id="attribute_key"
                placeholder="ex.: nps"
                {...form.register("attribute_key")}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="attribute_display_name">Nome de exibição</Label>
              <Input id="attribute_display_name" {...form.register("attribute_display_name")} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="attribute_display_type">Tipo</Label>
              <select
                id="attribute_display_type"
                {...form.register("attribute_display_type")}
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm"
              >
                {DISPLAY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {Number(displayType) === 4 && (
              <div className="grid gap-1.5">
                <Label htmlFor="attribute_values">Valores (vírgula-separados)</Label>
                <Input id="attribute_values" {...form.register("attribute_values")} />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-fit">
              Criar
            </Button>
          </form>
        )}
        <section className="rounded-lg border bg-card">
          {items === null ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum atributo definido.</p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.attribute_display_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.attribute_key} ·{" "}
                      {DISPLAY_TYPES.find((t) => t.value === item.attribute_display_type)?.label}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${item.attribute_key}`}
                      onClick={() => void remove(item.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
