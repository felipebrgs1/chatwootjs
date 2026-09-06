import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";

import { AuthCard, AuthFooterLink } from "@/components/auth-card";
import { ApiError } from "@/lib/auth";

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPage,
});

const Step1 = z.object({ email: z.email("E-mail inválido") });
const Step2 = z.object({ password: z.string().min(8, "Mínimo de 8 caracteres") });

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
      // Em dev a API devolve o token (sem e-mail configurado — M10/M12).
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
    <AuthCard
      title="Recuperar senha"
      footer={
        <>
          Lembrou? <AuthFooterLink to="/auth/login">Entrar</AuthFooterLink>
        </>
      }
    >
      {done ? (
        <p className="text-sm">
          Senha alterada! <AuthFooterLink to="/auth/login">Entre com a nova senha.</AuthFooterLink>
        </p>
      ) : resetToken === null ? (
        <form onSubmit={step1.handleSubmit(requestReset)} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...step1.register("email")} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={step1.formState.isSubmitting}>
            Enviar link
          </Button>
        </form>
      ) : (
        <form onSubmit={step2.handleSubmit(applyReset)} className="grid gap-4">
          <p className="text-sm text-muted-foreground">
            {resetToken === "sent"
              ? "Se o e-mail existir, você receberá o link (envio real no M10)."
              : "Token de dev recebido — defina a nova senha:"}
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...step2.register("password")}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={step2.formState.isSubmitting}>
            Redefinir senha
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
