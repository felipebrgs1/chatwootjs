import { zodResolver } from "@hookform/resolvers/zod";
import {
  Camera,
  Check,
  Globe,
  Mail,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Phone,
  PhoneCall,
  Send,
  ThumbsUp,
  Webhook,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@chatwootjs/ui/components/button";
import { Input } from "@chatwootjs/ui/components/input";
import { Label } from "@chatwootjs/ui/components/label";

import { ApiError, apiFetch } from "@/lib/auth";

export const Route = createFileRoute("/_auth/app/settings/inboxes/new")({
  component: NewInbox,
});

// Espelha o create-flow do Chatwoot original (InboxChannels.vue + ChannelList.vue
// + AddAgents.vue): CHANNEL → INBOX → AGENT → FINISH, com o wizard lateral e a
// grade de canais na primeira etapa. Ordem, títulos e descrições iguais aos
// i18n INBOX_MGMT.ADD.AUTH.CHANNEL.* / CREATE_FLOW.* (traduzidos; sem Twitter,
// que o original removeu do seletor; TikTok só aparece com app configurado).
type ChannelKind =
  | "website"
  | "facebook"
  | "whatsapp"
  | "sms"
  | "email"
  | "api"
  | "telegram"
  | "line"
  | "instagram"
  | "voice"
  | "whatsapp_call";

type Step = "channel" | "inbox" | "agents" | "finish";

const STEPS: Array<{ key: Step; title: string; body: string }> = [
  { key: "channel", title: "Escolher canal", body: "Escolha o provedor que você quer integrar." },
  { key: "inbox", title: "Criar inbox", body: "Autentique sua conta e crie uma inbox." },
  { key: "agents", title: "Adicionar agentes", body: "Adicione agentes à inbox criada." },
  { key: "finish", title: "Pronto!", body: "Tudo pronto para começar!" },
];

interface ChannelMeta {
  kind: ChannelKind;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  beta?: boolean;
  /** Título/descrição da etapa de configuração (ADD.*.TITLE/DESC). */
  setupTitle: string;
  setupDesc: string;
  submitLabel: string;
}

const CHANNELS: ChannelMeta[] = [
  {
    kind: "website",
    title: "Website",
    description: "Crie um widget de live-chat",
    icon: Globe,
    setupTitle: "Canal de site",
    setupDesc: "Crie um canal para o seu site e comece a atender pelo widget.",
    submitLabel: "Criar inbox",
  },
  {
    kind: "facebook",
    title: "Facebook",
    description: "Conecte sua página do Facebook",
    icon: ThumbsUp,
    setupTitle: "Facebook",
    setupDesc: "Conecte sua página do Facebook.",
    submitLabel: "Criar inbox",
  },
  {
    kind: "whatsapp",
    title: "WhatsApp",
    description: "Atenda seus clientes no WhatsApp",
    icon: MessageCircle,
    setupTitle: "Canal de WhatsApp",
    setupDesc: "Comece a atender seus clientes pelo WhatsApp.",
    submitLabel: "Criar canal de WhatsApp",
  },
  {
    kind: "sms",
    title: "SMS",
    description: "Integre SMS com Twilio ou Bandwidth",
    icon: MessageSquare,
    setupTitle: "Canal de SMS",
    setupDesc: "Comece a atender seus clientes por SMS.",
    submitLabel: "Criar canal de SMS",
  },
  {
    kind: "email",
    title: "Email",
    description: "Conecte com Gmail, Outlook ou outros provedores",
    icon: Mail,
    setupTitle: "Canal de e-mail",
    setupDesc: "Integre sua caixa de e-mail.",
    submitLabel: "Criar canal de e-mail",
  },
  {
    kind: "api",
    title: "API",
    description: "Crie um canal personalizado com nossa API",
    icon: Webhook,
    setupTitle: "Canal de API",
    setupDesc: "Integre com o canal de API e comece a atender.",
    submitLabel: "Criar canal de API",
  },
  {
    kind: "telegram",
    title: "Telegram",
    description: "Configure o Telegram com o token do bot",
    icon: Send,
    setupTitle: "Canal de Telegram",
    setupDesc: "Integre com o canal de Telegram.",
    submitLabel: "Criar canal de Telegram",
  },
  {
    kind: "line",
    title: "Line",
    description: "Integre seu canal Line",
    icon: MessagesSquare,
    setupTitle: "Canal LINE",
    setupDesc: "Integre com o canal LINE.",
    submitLabel: "Criar canal LINE",
  },
  {
    kind: "instagram",
    title: "Instagram",
    description: "Conecte sua conta do Instagram",
    icon: Camera,
    setupTitle: "Instagram",
    setupDesc: "Conecte sua conta do Instagram.",
    submitLabel: "Criar inbox",
  },
  {
    kind: "voice",
    title: "Voice",
    description: "Integre com o Twilio Voice",
    icon: Phone,
    beta: true,
    setupTitle: "Canal de voz",
    setupDesc: "Integre o Twilio Voice e atenda por chamadas.",
    submitLabel: "Criar inbox",
  },
  {
    kind: "whatsapp_call",
    title: "Chamada WhatsApp",
    description: "Receba chamadas de voz no seu número WhatsApp",
    icon: PhoneCall,
    beta: true,
    setupTitle: "Chamada WhatsApp",
    setupDesc: "Receba chamadas de voz no seu número WhatsApp.",
    submitLabel: "Criar inbox",
  },
];

const formSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome válido para a inbox"),
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
  bot_token: z.string().optional(),
  phone_number: z.string().optional(),
  provider: z.string().optional(),
  phone_number_id: z.string().optional(),
  business_management_token: z.string().optional(),
  evolution_base_url: z.string().optional(),
  evolution_instance: z.string().optional(),
  evolution_apikey: z.string().optional(),
  d360_api_key: z.string().optional(),
  twilio_account_sid: z.string().optional(),
  twilio_auth_token: z.string().optional(),
  bandwidth_account_id: z.string().optional(),
  bandwidth_api_key: z.string().optional(),
  bandwidth_api_secret: z.string().optional(),
  bandwidth_application_id: z.string().optional(),
  page_id: z.string().optional(),
  user_access_token: z.string().optional(),
  page_access_token: z.string().optional(),
  instagram_id: z.string().optional(),
  access_token: z.string().optional(),
  line_channel_id: z.string().optional(),
  line_channel_secret: z.string().optional(),
  line_channel_token: z.string().optional(),
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

interface Agent {
  id: number;
  name: string;
  email: string;
}

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
  const [step, setStep] = useState<Step>("channel");
  const [channel, setChannel] = useState<ChannelMeta | null>(null);
  const [inboxId, setInboxId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [savingAgents, setSavingAgents] = useState(false);
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });
  const providerValue = useWatch({ control: form.control, name: "provider" });

  function pick(next: ChannelMeta): void {
    setChannel(next);
    setError(null);
    const defaults: Partial<FormValues> = {};
    if (next.kind === "website") {
      defaults.website_url = "https://";
      defaults.welcome_title = "Olá!";
      defaults.welcome_tagline = "Como podemos ajudar?";
    }
    if (next.kind === "sms") defaults.provider = "twilio";
    if (next.kind === "whatsapp") defaults.provider = "default";
    form.reset(defaults);
    setStep("inbox");
  }

  function backToChannels(): void {
    setStep("channel");
    setChannel(null);
    setError(null);
  }

  async function onSubmit(values: FormValues): Promise<void> {
    if (!channel) return;
    setError(null);
    const accountId = Number(localStorage.getItem("cw_account_id"));

    let channelPayload: Record<string, unknown>;
    switch (channel.kind) {
      case "website":
        channelPayload = {
          type: "Channel::WebWidget",
          website_url: values.website_url ?? "",
          welcome_title: values.welcome_title,
          welcome_tagline: values.welcome_tagline,
        };
        break;
      case "api":
        channelPayload = { type: "Channel::Api", identifier: values.identifier ?? values.name };
        break;
      case "email":
        channelPayload = {
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
        channelPayload = { type: "Channel::Telegram", bot_token: values.bot_token };
        break;
      case "whatsapp": {
        const providerConfig: Record<string, unknown> = {};
        if (values.phone_number_id) providerConfig.phone_number_id = values.phone_number_id;
        if (values.evolution_base_url)
          providerConfig.evolution_base_url = values.evolution_base_url;
        if (values.evolution_instance)
          providerConfig.evolution_instance = values.evolution_instance;
        if (values.evolution_apikey) providerConfig.evolution_apikey = values.evolution_apikey;
        if (values.d360_api_key) providerConfig.api_key = values.d360_api_key;
        if (values.twilio_account_sid)
          providerConfig.twilio_account_sid = values.twilio_account_sid;
        if (values.twilio_auth_token) providerConfig.twilio_auth_token = values.twilio_auth_token;
        channelPayload = {
          type: "Channel::Whatsapp",
          phone_number: values.phone_number,
          provider: values.provider || "default",
          business_management_token: values.business_management_token || undefined,
          provider_config: Object.keys(providerConfig).length ? providerConfig : undefined,
        };
        break;
      }
      case "facebook":
        channelPayload = {
          type: "Channel::FacebookPage",
          page_id: values.page_id,
          user_access_token: values.user_access_token,
          page_access_token: values.page_access_token,
        };
        break;
      case "instagram":
        channelPayload = {
          type: "Channel::Instagram",
          instagram_id: values.instagram_id,
          access_token: values.access_token,
          // Token Meta expira em ~60 dias; renove em settings.
          expires_at: defaultInstagramExpiry(),
        };
        break;
      case "sms": {
        const providerConfig: Record<string, unknown> = {};
        if (values.bandwidth_account_id)
          providerConfig.bandwidth_account_id = values.bandwidth_account_id;
        if (values.bandwidth_api_key) providerConfig.bandwidth_api_key = values.bandwidth_api_key;
        if (values.bandwidth_api_secret)
          providerConfig.bandwidth_api_secret = values.bandwidth_api_secret;
        if (values.bandwidth_application_id)
          providerConfig.bandwidth_application_id = values.bandwidth_application_id;
        channelPayload = {
          type: "Channel::Sms",
          phone_number: values.phone_number,
          provider: values.provider || "twilio",
          provider_config: Object.keys(providerConfig).length ? providerConfig : undefined,
        };
        break;
      }
      case "line":
        channelPayload = {
          type: "Channel::Line",
          line_channel_id: values.line_channel_id,
          line_channel_secret: values.line_channel_secret,
          line_channel_token: values.line_channel_token,
        };
        break;
      case "voice":
      case "whatsapp_call":
        // Stub: inbox API identificada; chamadas entram via POST /webhooks/voice?identifier=.
        channelPayload = { type: "Channel::Api", identifier: values.identifier ?? values.name };
        break;
    }

    try {
      const data = await apiFetch<{ inbox: { id: number } }>(
        `/api/v1/accounts/${accountId}/inboxes`,
        {
          method: "POST",
          body: JSON.stringify({ name: values.name, channel: channelPayload }),
        },
      );
      setInboxId(data.inbox.id);
      setStep("agents");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (Object.values(err.attributes ?? {})[0]?.[0] ?? err.message)
          : "Erro inesperado",
      );
    }
  }

  // Carrega agentes ao entrar na etapa (AddAgents.vue: agents/get no mounted).
  useEffect(() => {
    if (step !== "agents") return;
    let active = true;
    const accountId = Number(localStorage.getItem("cw_account_id"));
    apiFetch<{ agents: Agent[] }>(`/api/v1/accounts/${accountId}/agents`)
      .then((data) => {
        if (active) setAgents(data.agents ?? []);
      })
      .catch((err: unknown) => {
        if (active) setAgentsError(err instanceof ApiError ? err.message : "Erro inesperado");
      });
    return () => {
      active = false;
    };
  }, [step]);

  function toggleAgent(id: number): void {
    setSelectedAgents((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  async function addAgents(): Promise<void> {
    if (!inboxId) return;
    if (!selectedAgents.length) {
      setAgentsError("Adicione pelo menos um agente à sua nova inbox");
      return;
    }
    setSavingAgents(true);
    setAgentsError(null);
    const accountId = Number(localStorage.getItem("cw_account_id"));
    try {
      await apiFetch(`/api/v1/accounts/${accountId}/inboxes/${inboxId}/inbox_members`, {
        method: "PUT",
        body: JSON.stringify({ user_ids: selectedAgents }),
      });
      setStep("finish");
    } catch (err) {
      setAgentsError(err instanceof ApiError ? err.message : "Erro inesperado");
    } finally {
      setSavingAgents(false);
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const pageTitle =
    step === "channel"
      ? "Escolha um canal"
      : step === "finish"
        ? "Pronto!"
        : "Conclua a configuração";

  const reg = form.register;
  const field = (id: keyof FormValues, label: string, props?: Record<string, unknown>) => (
    <div className="grid gap-1.5" key={id}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} {...reg(id)} {...props} />
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-2">
      <div className="block lg:hidden">
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
      </div>
      <div className="grid h-full min-h-[50dvh] grid-cols-1 rounded-xl border bg-card lg:grid-cols-8 lg:divide-x">
        <ol className="hidden h-fit gap-6 px-6 py-8 lg:col-span-2 lg:block">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <li key={s.key} className="flex gap-3">
                <span
                  className={
                    done
                      ? "grid size-6 flex-shrink-0 place-content-center rounded-full bg-woot-blue text-white"
                      : active
                        ? "grid size-6 flex-shrink-0 place-content-center rounded-full border-2 border-woot-blue text-woot-blue"
                        : "grid size-6 flex-shrink-0 place-content-center rounded-full border text-muted-foreground"
                  }
                >
                  {done ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span className="text-xs font-medium">{i + 1}</span>
                  )}
                </span>
                <span className="pb-6">
                  <span
                    className={`block text-sm font-medium ${active ? "text-woot-blue" : ""}`.trimEnd()}
                  >
                    {s.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">{s.body}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="flex min-h-0 flex-col lg:col-span-6">
          <div className="m-auto w-full">
            {step === "channel" && (
              <div className="mx-0 grid max-w-3xl grid-cols-1 gap-6 p-8 min-[480px]:grid-cols-2 sm:grid-cols-3">
                {CHANNELS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <button
                      key={c.kind}
                      type="button"
                      onClick={() => pick(c)}
                      className="relative -m-px flex cursor-pointer flex-col items-start justify-start gap-6 rounded-2xl border bg-card px-5 py-6 transition-all duration-200 hover:border-woot-blue hover:shadow-md"
                    >
                      <span className="grid size-10 place-content-center rounded-full bg-muted">
                        <Icon className="size-6 text-muted-foreground" />
                      </span>
                      <span className="flex flex-col items-start gap-1.5">
                        <span className="flex items-center gap-2">
                          <span className="text-start text-sm font-medium capitalize">
                            {c.title}
                          </span>
                          {c.beta && (
                            <span className="rounded bg-woot-nav-active-bg px-1.5 py-0.5 text-[11px] font-medium text-woot-blue">
                              Beta
                            </span>
                          )}
                        </span>
                        <span className="text-start text-sm text-muted-foreground">
                          {c.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {step === "inbox" && channel && (
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-3xl gap-3 p-8">
                <div>
                  <h2 className="text-base font-semibold">{channel.setupTitle}</h2>
                  <p className="text-sm text-muted-foreground">{channel.setupDesc}</p>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="name">Nome da inbox</Label>
                  <Input
                    id="name"
                    placeholder="Digite o nome da inbox (ex.: Acme Inc)"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                {channel.kind === "website" && (
                  <>
                    {field("website_url", "URL do site", { type: "url" })}
                    {field("welcome_title", "Título de boas-vindas")}
                    {field("welcome_tagline", "Slogan de boas-vindas")}
                  </>
                )}
                {(channel.kind === "api" ||
                  channel.kind === "voice" ||
                  channel.kind === "whatsapp_call") &&
                  field("identifier", "Identificador (webhook)")}
                {channel.kind === "email" && (
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
                {channel.kind === "telegram" && (
                  <>{field("bot_token", "Token do bot (@BotFather)", { type: "password" })}</>
                )}
                {channel.kind === "whatsapp" && (
                  <>
                    {field("phone_number", "Número (ex.: 5511999990000)")}
                    {field("provider", "Provider (default, evolution, twilio ou 360dialog)")}
                    {providerValue === "evolution" ? (
                      <>
                        {field("evolution_base_url", "Evolution base URL (ex.: https://evo:8080)")}
                        {field("evolution_instance", "Instance (Evolution)")}
                        {field("evolution_apikey", "API key (Evolution)", { type: "password" })}
                      </>
                    ) : providerValue === "twilio" ? (
                      <>
                        {field("twilio_account_sid", "Twilio Account SID (opcional, usa .env)")}
                        {field("twilio_auth_token", "Twilio Auth Token (opcional, usa .env)", {
                          type: "password",
                        })}
                        <p className="text-xs text-muted-foreground">
                          Webhook no console Twilio: POST /webhooks/whatsapp/twilio.
                        </p>
                      </>
                    ) : providerValue === "360dialog" ? (
                      <>
                        {field("d360_api_key", "API key (360Dialog)", { type: "password" })}
                        <p className="text-xs text-muted-foreground">
                          Webhook no painel 360Dialog: POST /webhooks/360dialog.
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
                {channel.kind === "facebook" && (
                  <>
                    {field("page_id", "Page ID")}
                    {field("user_access_token", "User access token", { type: "password" })}
                    {field("page_access_token", "Page access token", { type: "password" })}
                  </>
                )}
                {channel.kind === "instagram" && (
                  <>
                    {field("instagram_id", "Instagram ID (conta profissional)")}
                    {field("access_token", "Access token", { type: "password" })}
                  </>
                )}
                {channel.kind === "sms" && (
                  <>
                    {field("phone_number", "Número (ex.: +5511999990000)")}
                    {field("provider", "Provider (twilio ou bandwidth)")}
                    {providerValue === "bandwidth" && (
                      <>
                        {field("bandwidth_account_id", "Bandwidth Account ID")}
                        {field("bandwidth_api_key", "Bandwidth API Key")}
                        {field("bandwidth_api_secret", "Bandwidth API Secret", {
                          type: "password",
                        })}
                        {field("bandwidth_application_id", "Bandwidth Application ID")}
                        <p className="text-xs text-muted-foreground">
                          Webhook no painel Bandwidth: POST /webhooks/sms/bandwidth (JSON).
                        </p>
                      </>
                    )}
                  </>
                )}
                {channel.kind === "line" && (
                  <>
                    {field("line_channel_id", "Channel ID")}
                    {field("line_channel_secret", "Channel secret", { type: "password" })}
                    {field("line_channel_token", "Channel access token", { type: "password" })}
                  </>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={backToChannels}>
                    Voltar
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {channel.submitLabel}
                  </Button>
                </div>
              </form>
            )}

            {step === "agents" && (
              <div className="grid max-w-3xl content-start gap-4 p-8">
                <div>
                  <h2 className="text-base font-semibold">Agentes</h2>
                  <p className="text-sm text-muted-foreground">
                    Aqui você pode adicionar agentes à sua nova inbox. Só os agentes selecionados
                    terão acesso a ela.
                  </p>
                </div>
                <div className="grid gap-2">
                  {agents.map((agent) => (
                    <label
                      key={agent.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 hover:border-woot-blue"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAgents.includes(agent.id)}
                        onChange={() => toggleAgent(agent.id)}
                        className="size-4 accent-woot-blue"
                      />
                      <span className="grid size-8 flex-shrink-0 place-content-center rounded-full bg-woot-nav-active-bg text-sm font-semibold text-woot-blue">
                        {(agent.name || agent.email || "?")[0]?.toUpperCase()}
                      </span>
                      <span>
                        <span className="block text-sm font-medium">{agent.name}</span>
                        <span className="block text-xs text-muted-foreground">{agent.email}</span>
                      </span>
                    </label>
                  ))}
                  {!agents.length && !agentsError && (
                    <p className="text-sm text-muted-foreground">Carregando agentes…</p>
                  )}
                </div>
                {agentsError && <p className="text-sm text-destructive">{agentsError}</p>}
                <div>
                  <Button onClick={addAgents} disabled={savingAgents}>
                    Adicionar agentes
                  </Button>
                </div>
              </div>
            )}

            {step === "finish" && (
              <div className="grid max-w-3xl content-start gap-4 p-8 text-center">
                <span className="mx-auto grid size-12 place-content-center rounded-full bg-woot-nav-active-bg">
                  <Check className="size-6 text-woot-blue" />
                </span>
                <h2 className="text-base font-semibold">Mandou bem!</h2>
                <p className="text-sm text-muted-foreground">
                  Sua inbox foi criada com sucesso. Da próxima vez que um cliente mandar mensagem, a
                  conversa aparece automaticamente no dashboard.
                </p>
                <div>
                  <Link
                    to="/app/settings/inboxes/$inboxId"
                    params={{ inboxId: String(inboxId ?? "") }}
                  >
                    <Button>Ir para a inbox</Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
