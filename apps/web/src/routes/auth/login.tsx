import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { Label } from "@my-better-t-app/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";

import { AuthCard, AuthFooterLink } from "@/components/auth-card";
import { ApiError, signIn } from "@/lib/auth";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

const LoginSchema = z.object({
  email: z.email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type LoginInput = z.infer<typeof LoginSchema>;

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  async function onSubmit(input: LoginInput): Promise<void> {
    setError(null);
    try {
      await signIn(input.email, input.password);
      await navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
    }
  }

  return (
    <AuthCard
      title="Entrar"
      footer={
        <>
          <AuthFooterLink to="/auth/signup">Criar conta</AuthFooterLink>
          {" · "}
          <AuthFooterLink to="/auth/reset-password">Esqueci a senha</AuthFooterLink>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
            autoComplete="current-password"
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
        <p className="text-xs text-muted-foreground">Demo: admin@demo.test / password123</p>
      </form>
    </AuthCard>
  );
}
