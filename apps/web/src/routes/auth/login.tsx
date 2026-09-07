import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { AuthPageShell, AuthSubtitleLink } from "@/components/auth-layout";
import { ApiError, signIn } from "@/lib/auth";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

// Strings de `dashboard/i18n/locale/pt_BR/login.json` do Chatwoot original.
const LoginSchema = z.object({
  email: z.email("Por favor, insira um endereço de e-mail válido"),
  password: z.string().min(1, "Por favor, insira um endereço de e-mail válido"),
});

type LoginInput = z.infer<typeof LoginSchema>;

const inputClassName =
  "h-auto rounded-md border-0 bg-slate-900/[0.04] px-3 py-3 text-sm placeholder:text-muted-foreground focus-visible:ring-1 dark:bg-white/[0.06]";

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
      const message =
        err instanceof ApiError
          ? "Usuário ou senha incorretos. Por favor, tente novamente."
          : "Não foi possível conectar ao servidor Chatwoot. Por favor, tente novamente.";
      setError(message);
      toast.error(message);
    }
  }

  return (
    <AuthPageShell
      title="Entrar no Chatwoot"
      subtitle={
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Ou <AuthSubtitleLink to="/auth/signup">Criar nova conta</AuthSubtitleLink>
        </p>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="text"
            autoComplete="email"
            placeholder="nome@empresa.com.br"
            data-testid="email_input"
            className={inputClassName}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <AuthSubtitleLink to="/auth/reset-password">
              <span className="text-sm normal-case">Esqueceu-se da sua senha?</span>
            </AuthSubtitleLink>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Senha"
            data-testid="password_input"
            className={inputClassName}
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          size="lg"
          data-testid="submit_button"
          disabled={form.formState.isSubmitting}
          className="h-12 w-full text-base"
        >
          {form.formState.isSubmitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
    </AuthPageShell>
  );
}
