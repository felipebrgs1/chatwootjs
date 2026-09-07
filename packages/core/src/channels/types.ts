/**
 * M10 — Canais externos. Interface única atrás da qual todos os canais
 * (Email, Telegram, WhatsApp, Facebook, Instagram, Twitter/X, SMS, Line,
 * Voice-stub) recebem e enviam mensagens através do dashboard.
 *
 * Referência Rails: `chatwoot/app/models/channel/*`,
 * `chatwoot/app/controllers/webhooks/*`, `chatwoot/app/services/channel/*`.
 */

/** Canais suportados (sufixo usado nas rotas `/webhooks/<canal>`). */
export type ExternalChannel =
  | "email"
  | "telegram"
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "twitter"
  | "sms"
  | "line"
  | "voice";

/** `Channel::X` (banco) → canal externo (rota/docs). */
export const CHANNEL_TYPE_TO_EXTERNAL: Record<string, ExternalChannel> = {
  "Channel::Email": "email",
  "Channel::Telegram": "telegram",
  "Channel::Whatsapp": "whatsapp",
  "Channel::FacebookPage": "facebook",
  "Channel::Instagram": "instagram",
  "Channel::TwitterProfile": "twitter",
  "Channel::Sms": "sms",
  "Channel::Line": "line",
};

/** Anexo normalizado vindo do webhook externo. */
export interface NormalizedAttachment {
  /** URL remota do arquivo (baixada no ingest quando possível). */
  remoteUrl: string | null;
  /** file_type do Rails: image/audio/video/file. */
  fileType: "image" | "audio" | "video" | "file";
  fallbackTitle: string | null;
}

/** Mensagem inbound normalizada (saída dos parsers, entrada do ingest). */
export interface NormalizedInbound {
  /** Identificador único da mensagem/plataforma (idempotência → `messages.source_id`). */
  sourceId: string;
  /** Identificador do contato na plataforma (→ `contact_inboxes.source_id`). */
  contactSourceId: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAvatarUrl: string | null;
  content: string | null;
  attachments: NormalizedAttachment[];
  contentAttributes: Record<string, unknown>;
  /** Quando o payload é evento de status/entrega (não cria mensagem). */
  isStatusEvent?: boolean;
}

/** Mensagem outbound (dashboard → externo). */
export interface OutboundMessage {
  messageId: number;
  accountId: number;
  conversationId: number;
  inboxId: number;
  content: string | null;
  isTemplate?: boolean;
  templateName?: string;
  attachments: Array<{ url: string | null; fileType: string; fallbackTitle: string | null }>;
  /** Contato destino (para endereçamento: telefone, psid, chat_id...). */
  contactSourceId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export interface SendResult {
  /** source_id retornado pela plataforma (atualiza `messages.source_id`). */
  sourceId?: string;
}

/**
 * Provider de canal. `send` faz dashboard → externo; o caminho
 * externo → dashboard passa pelos parsers (`parsers.ts`) + `ingestInbound`.
 */
export interface ChannelProvider {
  channel: ExternalChannel;
  send(ctx: OutboundContext, msg: OutboundMessage): Promise<SendResult>;
}

/** Contexto com as credenciais do canal (linha `channel_*` + inbox). */
export interface OutboundContext {
  accountId: number;
  inboxId: number;
  channelType: string;
  channelConfig: Record<string, unknown>;
  inboxName: string;
}
