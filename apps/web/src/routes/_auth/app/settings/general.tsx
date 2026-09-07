import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";

import { useSessionContext } from "@/components/session-provider";
import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/general")({
  component: GeneralSettings,
});

const GeneralSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da conta"),
  locale: z.string().trim().min(1),
});

type GeneralInput = z.infer<typeof GeneralSchema>;

/**
 * Configurações · Geral 1:1 com settings/account/Index do v4: título,
 * seção geral (nome + idioma + salvar) e ID da conta.
 */
function GeneralSettings() {
  const { session, reload } = useSessionContext();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<GeneralInput>({ resolver: zodResolver(GeneralSchema) });
  const isAdmin = session?.account.role === "administrator";

  useEffect(() => {
    if (session) {
      form.reset({ name: session.account.name, locale: session.account.locale });
    }
  }, [session, form]);

  async function onSubmit(input: GeneralInput): Promise<void> {
    if (!session) return;
    setSaved(false);
    setError(null);
    try {
      await apiFetch(`/api/v1/accounts/${session.accountId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
      await reload();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  if (!session) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-woot-bg">
      <header className="shrink-0 px-6">
        <div className="mx-auto w-full max-w-5xl py-6">
          <h1 className="text-xl font-medium text-woot-slate-12">Geral</h1>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto px-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col pb-6">
          <section>
            <h2 className="text-base font-medium text-woot-slate-12">Conta</h2>
            <p className="mt-0.5 text-sm text-woot-slate-11">Nome e idioma padrão desta conta.</p>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-3 grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Nome da conta</Label>
                <Input
                  id="name"
                  disabled={!isAdmin}
                  placeholder="Minha empresa"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="locale">Idioma do painel</Label>
                <select
                  id="locale"
                  disabled={!isAdmin}
                  {...form.register("locale")}
                  className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                >
                  <option value="pt_BR">Português (BR)</option>
                  <option value="en">English</option>
                </select>
              </div>
              {!isAdmin && (
                <p className="text-sm text-woot-slate-11">
                  Só administradores podem alterar a conta.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              {saved && <p className="text-sm text-green-700">Conta atualizada.</p>}
              {isAdmin && (
                <div>
                  <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                    Atualizar
                  </Button>
                </div>
              )}
            </form>
          </section>
          <section className="mt-6 border-t border-border pt-4">
            <h2 className="text-base font-medium text-woot-slate-12">ID da conta</h2>
            <p className="mt-0.5 font-mono text-sm text-woot-slate-11">{session.accountId}</p>
          </section>
        </div>
      </main>
    </div>
  );
}
