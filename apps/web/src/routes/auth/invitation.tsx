import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";

import { AuthCard, AuthFooterLink } from "@/components/auth-card";

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:3000";

export const Route = createFileRoute("/auth/invitation")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  component: InvitationPage,
});

const AcceptSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").optional(),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
});

function InvitationPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof AcceptSchema>>({ resolver: zodResolver(AcceptSchema) });

  async function onSubmit(input: z.infer<typeof AcceptSchema>): Promise<void> {
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/auth/invitation/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: input.password, name: input.name || undefined }),
      });
      if (!res.ok) throw new Error("Convite inválido ou expirado");
      await navigate({ to: "/auth/login" });
    } catch {
      setError("Convite inválido ou expirado");
    }
  }

  if (!token) {
    return (
      <AuthCard title="Convite">
        <p className="text-sm text-muted-foreground">Link de convite inválido.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Aceitar convite"
      subtitle="Defina sua senha para entrar na equipe."
      footer={
        <>
          Já tem conta? <AuthFooterLink to="/auth/login">Entrar</AuthFooterLink>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" autoComplete="name" {...form.register("name")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Criar acesso
        </Button>
      </form>
    </AuthCard>
  );
}
