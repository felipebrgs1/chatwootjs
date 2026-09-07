import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/inboxes/new")({
  component: NewInbox,
});

// M10: todos os canais externos atrás da interface ChannelProvider.
// `voice` é stub (cria inbox API + registra chamadas; sem mídia no MVP).
type ChannelKind =
  | "web_widget"
  | "api"
  | "email"
  | "telegram"
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "twitter"
  | "sms"
  | "line"
  | "voice";

const CHANNELS: Array<{ kind: ChannelKind; label: string; description: string }> = [
  { kind: "web_widget", label: "Website", description: "Widget de chat no seu site" },
  { kind: "api", label: "API", description: "Crie conversas via API" },
  { kind: "email", label: "Email", description: "IMAP/SMTP ou encaminhamento" },
  { kind: "telegram", label: "Telegram", description: "Bot do Telegram via token" },
  { kind: "whatsapp", label: "WhatsApp", description: "WhatsApp Cloud API (Meta)" },
  { kind: "facebook", label: "Facebook", description: "Página do Facebook (Messenger)" },
  { kind: "instagram", label: "Instagram", description: "Direct do Instagram" },
  { kind: "twitter", label: "Twitter / X", description: "DMs via Account Activity API" },
  { kind: "sms", label: "SMS", description: "Twilio (depois Bandwidth)" },
  { kind: "line", label: "Line", description: "Line Messaging API" },
  { kind: "voice", label: "Voice (stub)", description: "Registra chamadas, sem mídia no MVP" },
];

const formSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da inbox"),
  website_url: z.string().optional(),
  welcome_title: z.string().optional(),
  welcome_tagline: z.string().optional(),
  identifier: z.string().optional(),
  email: z.string().optional(),
  forward_to_email: z.string().optional(),
  imap_address: z.string().optional(),
  imap_port: z.string().optional(),
  imap_login: z.string().optional(),
  imap_password: z.string().optional(),
  smtp_address: z.string().optional(),
  smtp_port: z.string().optional(),
  smtp_login: z.string().optional(),
  smtp_password: z.string().optional(),
  bot_name: z.string().optional(),
  bot_token: z.string().optional(),
  phone_number: z.string().optional(),
  provider: z.string().optional(),
  phone_number_id: z.string().optional(),
  business_management_token: z.string().optional(),
  evolution_base_url: z.string().optional(),
  evolution_instance: z.string().optional(),
  evolution_apikey: z.string().optional(),
  page_id: z.string().optional(),
  user_access_token: z.string().optional(),
  page_access_token: z.string().optional(),
  instagram_id: z.string().optional(),
  access_token: z.string().optional(),
  profile_id: z.string().optional(),
  twitter_access_token: z.string().optional(),
  twitter_access_token_secret: z.string().optional(),
  line_channel_id: z.string().optional(),
  line_channel_secret: z.string().optional(),
  line_channel_token: z.string().optional(),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

function num(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Validade padrão do token Meta (~60 dias). Fora do componente (regra react/purity). */
function defaultInstagramExpiry(): number {
  return Date.now() + 60 * 24 * 3600 * 1000;
}

function NewInbox() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<ChannelKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });
  const providerValue = useWatch({ control: form.control, name: "provider" });

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
    if (next === "sms") defaults.provider = "twilio";
    if (next === "whatsapp") defaults.provider = "default";
    form.reset(defaults);
  }

  async function onSubmit(values: FormValues): Promise<void> {
    if (!kind) return;
    setError(null);
    const accountId = Number(localStorage.getItem("cw_account_id"));

    let channel: Record<string, unknown>;
    switch (kind) {
      case "web_widget":
        channel = {
          type: "Channel::WebWidget",
          website_url: values.website_url ?? "",
          welcome_title: values.welcome_title,
          welcome_tagline: values.welcome_tagline,
        };
        break;
      case "api":
        channel = { type: "Channel::Api", identifier: values.identifier ?? values.name };
        break;
      case "email":
        channel = {
          type: "Channel::Email",
          email: values.email,
          forward_to_email: values.forward_to_email || values.email,
          imap_enabled: Boolean(values.imap_address),
          imap_address: values.imap_address || undefined,
          imap_port: num(values.imap_port),
          imap_login: values.imap_login || undefined,
          imap_password: values.imap_password || undefined,
          smtp_enabled: Boolean(values.smtp_address),
          smtp_address: values.smtp_address || undefined,
          smtp_port: num(values.smtp_port),
          smtp_login: values.smtp_login || undefined,
          smtp_password: values.smtp_password || undefined,
        };
        break;
      case "telegram":
        channel = {
          type: "Channel::Telegram",
          bot_name: values.bot_name || undefined,
          bot_token: values.bot_token,
        };
        break;
      case "whatsapp": {
        const providerConfig: Record<string, unknown> = {};
        if (values.phone_number_id) providerConfig.phone_number_id = values.phone_number_id;
        if (values.evolution_base_url)
          providerConfig.evolution_base_url = values.evolution_base_url;
        if (values.evolution_instance)
          providerConfig.evolution_instance = values.evolution_instance;
        if (values.evolution_apikey) providerConfig.evolution_apikey = values.evolution_apikey;
        channel = {
          type: "Channel::Whatsapp",
          phone_number: values.phone_number,
          provider: values.provider || "default",
          business_management_token: values.business_management_token || undefined,
          provider_config: Object.keys(providerConfig).length ? providerConfig : undefined,
        };
        break;
      }
      case "facebook":
        channel = {
          type: "Channel::FacebookPage",
          page_id: values.page_id,
          user_access_token: values.user_access_token,
          page_access_token: values.page_access_token,
        };
        break;
      case "instagram":
        channel = {
          type: "Channel::Instagram",
          instagram_id: values.instagram_id,
          access_token: values.access_token,
          // Token Meta expira em ~60 dias; renove em settings (M10).
          expires_at: defaultInstagramExpiry(),
        };
        break;
      case "twitter":
        channel = {
          type: "Channel::TwitterProfile",
          profile_id: values.profile_id,
          twitter_access_token: values.twitter_access_token,
          twitter_access_token_secret: values.twitter_access_token_secret,
        };
        break;
      case "sms":
        channel = {
          type: "Channel::Sms",
          phone_number: values.phone_number,
          provider: values.provider || "twilio",
        };
        break;
      case "line":
        channel = {
          type: "Channel::Line",
          line_channel_id: values.line_channel_id,
          line_channel_secret: values.line_channel_secret,
          line_channel_token: values.line_channel_token,
        };
        break;
      case "voice":
        // Stub: inbox API identificada; chamadas entram via POST /webhooks/voice?identifier=.
        channel = { type: "Channel::Api", identifier: values.identifier ?? values.name };
        break;
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

  const reg = form.register;
  const field = (id: keyof FormValues, label: string, props?: Record<string, unknown>) => (
    <div className="grid gap-1.5" key={id}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...reg(id)} {...props} />
    </div>
  );

  return (
    <div className="flex flex-1 flex-col bg-woot-bg">
      <header className="flex items-center gap-3 border-b bg-card px-6 py-4">
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
              className="flex items-center gap-3 rounded-lg border bg-card p-4 text-start transition-colors hover:border-woot-blue"
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
            className="grid gap-3 rounded-lg border bg-card p-4"
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
                {field("website_url", "URL do site", { type: "url" })}
                {field("welcome_title", "Título de boas-vindas")}
                {field("welcome_tagline", "Slogan de boas-vindas")}
              </>
            )}
            {(kind === "api" || kind === "voice") && (
              <>
                {field("identifier", "Identificador (webhook)")}
                {kind === "voice" && (
                  <p className="text-xs text-muted-foreground">
                    Chamadas entram via POST /webhooks/voice?identifier=&lt;este valor&gt;. Stub sem
                    mídia no MVP (ver docs/canais/voice.md).
                  </p>
                )}
              </>
            )}
            {kind === "email" && (
              <>
                {field("email", "E-mail da inbox", { type: "email" })}
                {field("forward_to_email", "Encaminhar para (opcional)", { type: "email" })}
                <p className="text-xs font-medium text-muted-foreground">IMAP (recebimento)</p>
                {field("imap_address", "Servidor IMAP")}
                {field("imap_port", "Porta IMAP (ex.: 993)", { inputMode: "numeric" })}
                {field("imap_login", "Usuário IMAP")}
                {field("imap_password", "Senha IMAP", { type: "password" })}
                <p className="text-xs font-medium text-muted-foreground">SMTP (envio)</p>
                {field("smtp_address", "Servidor SMTP")}
                {field("smtp_port", "Porta SMTP (ex.: 587)", { inputMode: "numeric" })}
                {field("smtp_login", "Usuário SMTP")}
                {field("smtp_password", "Senha SMTP", { type: "password" })}
              </>
            )}
            {kind === "telegram" && (
              <>
                {field("bot_name", "Nome do bot (opcional)")}
                {field("bot_token", "Token do bot (@BotFather)", { type: "password" })}
                <p className="text-xs text-muted-foreground">
                  Webhook: POST /webhooks/telegram/&lt;token&gt; (ver docs/canais/telegram.md).
                </p>
              </>
            )}
            {kind === "whatsapp" && (
              <>
                {field("phone_number", "Número (ex.: 5511999990000)")}
                {field("provider", "Provider (default ou evolution)")}
                {providerValue === "evolution" ? (
                  <>
                    {field("evolution_base_url", "Evolution base URL (ex.: https://evo:8080)")}
                    {field("evolution_instance", "Instance (Evolution)")}
                    {field("evolution_apikey", "API key (Evolution)", { type: "password" })}
                    <p className="text-xs text-muted-foreground">
                      Webhook na Evolution: POST /webhooks/evolution (ver docs/canais/whatsapp.md).
                    </p>
                  </>
                ) : (
                  <>
                    {field("phone_number_id", "Phone Number ID (Meta)")}
                    {field("business_management_token", "Token Meta (Business Management)", {
                      type: "password",
                    })}
                  </>
                )}
              </>
            )}
            {kind === "facebook" && (
              <>
                {field("page_id", "Page ID")}
                {field("user_access_token", "User access token", { type: "password" })}
                {field("page_access_token", "Page access token", { type: "password" })}
              </>
            )}
            {kind === "instagram" && (
              <>
                {field("instagram_id", "Instagram ID (conta profissional)")}
                {field("access_token", "Access token", { type: "password" })}
              </>
            )}
            {kind === "twitter" && (
              <>
                {field("profile_id", "Profile ID (for_user_id)")}
                {field("twitter_access_token", "Access token", { type: "password" })}
                {field("twitter_access_token_secret", "Access token secret", {
                  type: "password",
                })}
              </>
            )}
            {kind === "sms" && (
              <>
                {field("phone_number", "Número (ex.: +5511999990000)")}
                {field("provider", "Provider (twilio)")}
                <p className="text-xs text-muted-foreground">
                  Configure TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN no .env. Webhook: POST
                  /webhooks/sms/twilio.
                </p>
              </>
            )}
            {kind === "line" && (
              <>
                {field("line_channel_id", "Channel ID")}
                {field("line_channel_secret", "Channel secret", { type: "password" })}
                {field("line_channel_token", "Channel access token", { type: "password" })}
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
