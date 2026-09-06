import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { Label } from "@my-better-t-app/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";

import { useSessionContext } from "@/components/session-provider";
import { apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/general")({
  component: GeneralSettings,
});

const GeneralSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da conta"),
  locale: z.string().trim().min(1),
});

type GeneralInput = z.infer<typeof GeneralSchema>;

function GeneralSettings() {
  const { session, reload } = useSessionContext();
  const form = useForm<GeneralInput>({ resolver: zodResolver(GeneralSchema) });
  const isAdmin = session?.account.role === "administrator";

  useEffect(() => {
    if (session) {
      form.reset({ name: session.account.name, locale: session.account.locale });
    }
  }, [session, form]);

  async function onSubmit(input: GeneralInput): Promise<void> {
    if (!session) return;
    await apiFetch(`/api/v1/accounts/${session.accountId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    await reload();
  }

  if (!session) return null;

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-lg font-semibold">Configurações · Geral</h1>
        <p className="text-sm text-muted-foreground">{session.account.name}</p>
      </header>
      <main className="max-w-xl p-6">
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 rounded-lg border bg-white p-4"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="name">Nome da conta</Label>
            <Input id="name" disabled={!isAdmin} {...form.register("name")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="locale">Idioma</Label>
            <select
              id="locale"
              disabled={!isAdmin}
              {...form.register("locale")}
              className="rounded-md border px-2 py-1.5"
            >
              <option value="pt_BR">Português (BR)</option>
              <option value="en">English</option>
            </select>
          </div>
          {!isAdmin && (
            <p className="text-sm text-muted-foreground">
              Só administradores podem alterar a conta.
            </p>
          )}
          {isAdmin && (
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Salvar
            </Button>
          )}
        </form>
      </main>
    </div>
  );
}
