import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";

import { AuthPageShell, AuthSubtitleLink } from "@/components/auth-layout";
import { ApiError } from "@/lib/auth";

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPage,
});

// Strings de `dashboard/i18n/locale/pt_BR/resetPassword.json` do original.
const Step1 = z.object({ email: z.email("Por favor, insira um e-mail válido.") });
const Step2 = z.object({ password: z.string().min(8, "Mínimo de 8 caracteres") });

const inputClassName =
  "h-auto rounded-md border-0 bg-slate-900/[0.04] px-3 py-3 text-sm placeholder:text-muted-foreground focus-visible:ring-1 dark:bg-white/[0.06]";

function ResetPage() {
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step1 = useForm<z.infer<typeof Step1>>({ resolver: zodResolver(Step1) });
  const step2 = useForm<z.infer<typeof Step2>>({ resolver: zodResolver(Step2) });

  async function requestReset(input: z.infer<typeof Step1>): Promise<void> {
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/auth/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = (await res.json()) as { data: { reset_token?: string } };
      // Em dev a API devolve o token (sem e-mail configurado).
      setResetToken(body.data.reset_token ?? "sent");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  async function applyReset(input: z.infer<typeof Step2>): Promise<void> {
    setError(null);
    try {
      await fetch(`${SERVER_URL}/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: input.password }),
      });
      setDone(true);
    } catch {
      setError("Token inválido ou expirado");
    }
  }

  return (
    <AuthPageShell>
      <h1 className="mb-1 text-left text-2xl font-medium tracking-tight">Redefinir senha</h1>
      <p className="mb-4 text-sm font-normal leading-6 text-muted-foreground">
        Digite o endereço de e-mail que você usa para acessar o Chatwoot para obter as instruções de
        redefinição da senha.
      </p>
      {done ? (
        <p className="text-sm">
          Senha alterada!{" "}
          <AuthSubtitleLink to="/auth/login">Entre com a nova senha.</AuthSubtitleLink>
        </p>
      ) : resetToken === null ? (
        <form onSubmit={step1.handleSubmit(requestReset)} className="space-y-5">
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="Por favor, digite seu e-mail."
              className={inputClassName}
              {...step1.register("email")}
            />
            {step1.formState.errors.email && (
              <p className="text-xs text-destructive">{step1.formState.errors.email.message}</p>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            size="lg"
            disabled={step1.formState.isSubmitting}
            className="h-12 w-full text-base"
          >
            Enviar
          </Button>
        </form>
      ) : (
        <form onSubmit={step2.handleSubmit(applyReset)} className="space-y-5">
          <p className="text-sm text-muted-foreground">
            {resetToken === "sent"
              ? "Se o e-mail existir, você receberá o link de redefinição."
              : "Token de dev recebido — defina a nova senha:"}
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              className={inputClassName}
              {...step2.register("password")}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            size="lg"
            disabled={step2.formState.isSubmitting}
            className="h-12 w-full text-base"
          >
            Redefinir senha
          </Button>
        </form>
      )}
      <p className="mb-[-4px] mt-4 text-sm text-muted-foreground">
        Se você quiser voltar para a página de acesso,{" "}
        <AuthSubtitleLink to="/auth/login">clique aqui</AuthSubtitleLink>.
      </p>
    </AuthPageShell>
  );
}
