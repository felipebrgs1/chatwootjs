import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/inboxes/new")({
  component: NewInbox,
});

type ChannelKind = "web_widget" | "api" | "email";

const CHANNELS: Array<{ kind: ChannelKind; label: string; description: string }> = [
  { kind: "web_widget", label: "Website", description: "Widget de chat no seu site" },
  { kind: "api", label: "API", description: "Crie conversas via API" },
  { kind: "email", label: "Email", description: "IMAP/SMTP ou encaminhamento" },
];

const formSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da inbox"),
  website_url: z.string().optional(),
  welcome_title: z.string().optional(),
  welcome_tagline: z.string().optional(),
  identifier: z.string().optional(),
  email: z.string().optional(),
  forward_to_email: z.string().optional(),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

function NewInbox() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<ChannelKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  function pick(next: ChannelKind): void {
    setKind(next);
    setError(null);
    const defaults: Partial<FormValues> = {};
    if (next === "web_widget") {
      defaults.website_url = "https://";
      defaults.welcome_title = "Olá!";
      defaults.welcome_tagline = "Como podemos ajudar?";
    }
    if (next === "email") defaults.email = "";
    form.reset(defaults);
  }

  async function onSubmit(values: FormValues): Promise<void> {
    if (!kind) return;
    setError(null);
    const accountId = Number(localStorage.getItem("cw_account_id"));

    let channel: Record<string, unknown>;
    if (kind === "web_widget") {
      channel = {
        type: "Channel::WebWidget",
        website_url: values.website_url ?? "",
        welcome_title: values.welcome_title,
        welcome_tagline: values.welcome_tagline,
      };
    } else if (kind === "api") {
      channel = { type: "Channel::Api", identifier: values.identifier ?? values.name };
    } else {
      channel = {
        type: "Channel::Email",
        email: values.email,
        forward_to_email: values.forward_to_email || values.email,
      };
    }

    try {
      const data = await apiFetch<{ inbox: { id: number } }>(
        `/api/v1/accounts/${accountId}/inboxes`,
        {
          method: "POST",
          body: JSON.stringify({ name: values.name, channel }),
        },
      );
      void navigate({
        to: "/app/settings/inboxes/$inboxId",
        params: { inboxId: String(data.inbox.id) },
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (Object.values(err.attributes ?? {})[0]?.[0] ?? err.message)
          : "Erro inesperado",
      );
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="flex items-center gap-3 border-b bg-white px-6 py-4">
        <Link to="/app/settings/inboxes">
          <Button variant="ghost" size="icon" aria-label="Voltar">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Nova caixa de entrada</h1>
          <p className="text-sm text-muted-foreground">
            {kind ? "Configure o canal" : "Escolha o canal"}
          </p>
        </div>
      </header>
      <main className="grid max-w-xl content-start gap-4 p-6">
        {!kind &&
          CHANNELS.map((channel) => (
            <button
              key={channel.kind}
              type="button"
              onClick={() => pick(channel.kind)}
              className="flex items-center gap-3 rounded-lg border bg-white p-4 text-start transition-colors hover:border-woot-blue"
            >
              <span className="grid size-9 flex-shrink-0 place-content-center rounded-lg bg-woot-nav-active-bg text-woot-blue font-semibold">
                {channel.label[0]}
              </span>
              <span>
                <span className="block font-medium">{channel.label}</span>
                <span className="block text-xs text-muted-foreground">{channel.description}</span>
              </span>
            </button>
          ))}
        {kind && (
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-3 rounded-lg border bg-white p-4"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="name">Nome da inbox</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            {kind === "web_widget" && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="website_url">URL do site</Label>
                  <Input id="website_url" type="url" {...form.register("website_url")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="welcome_title">Título de boas-vindas</Label>
                  <Input id="welcome_title" {...form.register("welcome_title")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="welcome_tagline">Slogan de boas-vindas</Label>
                  <Input id="welcome_tagline" {...form.register("welcome_tagline")} />
                </div>
              </>
            )}
            {kind === "api" && (
              <div className="grid gap-1.5">
                <Label htmlFor="identifier">Identificador (webhook)</Label>
                <Input id="identifier" {...form.register("identifier")} />
              </div>
            )}
            {kind === "email" && (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="email">E-mail da inbox</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="forward_to_email">Encaminhar para (opcional)</Label>
                  <Input
                    id="forward_to_email"
                    type="email"
                    {...form.register("forward_to_email")}
                  />
                </div>
              </>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setKind(null)}>
                Trocar canal
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Criar inbox
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
