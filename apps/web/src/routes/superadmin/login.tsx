import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { AuthCard } from "@/components/auth-card";
import { SuperApiError, getSuperToken, superSignIn } from "@/lib/superadmin";

export const Route = createFileRoute("/superadmin/login")({
  component: SuperLoginPage,
});

const LoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type LoginInput = z.infer<typeof LoginSchema>;

function SuperLoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });

  async function onSubmit(input: LoginInput): Promise<void> {
    setError(null);
    try {
      await superSignIn(input.email, input.password);
      await navigate({ to: "/superadmin/accounts" });
    } catch (err) {
      setError(err instanceof SuperApiError ? err.message : "Erro inesperado");
    }
  }

  if (getSuperToken()) {
    void navigate({ to: "/superadmin/accounts" });
  }

  return (
    <AuthCard title="Superadmin" subtitle="Acesso ao console de instalação">
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" {...form.register("password")} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          Entrar
        </Button>
      </form>
    </AuthCard>
  );
}
