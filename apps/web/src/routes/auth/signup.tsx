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
import { ApiError, signUp } from "@/lib/auth";

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
});

const SignupSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome"),
  accountName: z.string().trim().min(1, "Informe o nome da empresa").optional(),
  email: z.email("E-mail inválido"),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
});

type SignupInput = z.infer<typeof SignupSchema>;

function SignupPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignupInput>({ resolver: zodResolver(SignupSchema) });

  async function onSubmit(input: SignupInput): Promise<void> {
    setError(null);
    try {
      await signUp(input.name, input.email, input.password, input.accountName || undefined);
      await navigate({ to: "/app" });
    } catch (err) {
      const api = err instanceof ApiError ? err : null;
      setError(api?.attributes?.email?.[0] ?? api?.message ?? "Erro inesperado");
    }
  }

  return (
    <AuthCard
      title="Criar conta"
      subtitle="Sua conta já nasce com você como administrador."
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
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="accountName">Empresa</Label>
          <Input id="accountName" autoComplete="organization" {...form.register("accountName")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
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
          {form.formState.isSubmitting ? "Criando..." : "Criar conta"}
        </Button>
      </form>
    </AuthCard>
  );
}
