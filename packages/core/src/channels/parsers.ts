/**
 * M10 — Parsers puros de webhooks (sem DB, sem I/O): payload bruto →
 * `NormalizedInbound[]`. Cobertos por `parsers.test.ts` com fixtures reais
 * (formato documentado de cada plataforma).
 */
import type { NormalizedAttachment, NormalizedInbound } from "./types.js";

function att(
  remoteUrl: string | null,
  fileType: NormalizedAttachment["fileType"] = "file",
  fallbackTitle: string | null = null,
): NormalizedAttachment {
  return { remoteUrl, fileType, fallbackTitle };
}

function base(
  sourceId: string,
  contactSourceId: string,
  extra: Partial<NormalizedInbound> = {},
): NormalizedInbound {
  return {
    sourceId,
    contactSourceId,
    contactName: null,
    contactEmail: null,
    contactPhone: null,
    contactAvatarUrl: null,
    content: null,
    attachments: [],
    contentAttributes: {},
    ...extra,
  };
}

// ---- Telegram (Bot API: POST /webhooks/telegram/:bot_token) ----

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name?: string; last_name?: string; username?: string };
    chat: { id: number; type?: string };
    date: number;
    text?: string;
    caption?: string;
    photo?: Array<{ file_id: string }>;
    voice?: { file_id: string };
    video?: { file_id: string };
    document?: { file_id: string; file_name?: string };
    sticker?: { file_id: string; emoji?: string };
  };
}

export function parseTelegramUpdate(payload: TelegramUpdate): NormalizedInbound | null {
  const msg = payload.message;
  if (!msg || msg.chat == null) return null;
  const from = msg.from;
  const name = from
    ? [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || null
    : null;
  // file_id não é URL direta (exige getFile com o bot_token); o ingest resolve.
  const attachments: NormalizedAttachment[] = [];
  if (msg.photo?.length) {
    const last = msg.photo[msg.photo.length - 1]!;
    attachments.push(att(`telegram-file:${last.file_id}`, "image"));
  }
  if (msg.voice) attachments.push(att(`telegram-file:${msg.voice.file_id}`, "audio"));
  if (msg.video) attachments.push(att(`telegram-file:${msg.video.file_id}`, "video"));
  if (msg.document)
    attachments.push(
      att(`telegram-file:${msg.document.file_id}`, "file", msg.document.file_name ?? null),
    );
  if (msg.sticker)
    attachments.push(
      att(`telegram-file:${msg.sticker.file_id}`, "image", msg.sticker.emoji ?? "sticker"),
    );
  return base(`telegram:${msg.chat.id}:${msg.message_id}`, String(msg.chat.id), {
    contactName: name,
    contactSourceId: String(from?.id ?? msg.chat.id),
    content: msg.text ?? msg.caption ?? (attachments.length ? null : ""),
    attachments,
    contentAttributes: { telegram_update_id: payload.update_id },
  });
}

// ---- WhatsApp Cloud API (POST /webhooks/whatsapp) ----

export interface WhatsappWebhook {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: { display_phone_number?: string; phone_number_id?: string };
        messages?: Array<{
          from: string;
          id: string;
          timestamp?: string;
          type: string;
          text?: { body?: string };
          image?: { id?: string; mime_type?: string; caption?: string };
          audio?: { id?: string; mime_type?: string };
          video?: { id?: string; mime_type?: string; caption?: string };
          document?: { id?: string; mime_type?: string; filename?: string };
          sticker?: { id?: string };
        }>;
        statuses?: Array<{ id: string; status: string; recipient_id?: string }>;
        contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
      };
    }>;
  }>;
}

export function parseWhatsappWebhook(payload: WhatsappWebhook): NormalizedInbound[] {
  const out: NormalizedInbound[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;
      const profileName = value.contacts?.[0]?.profile?.name ?? null;
      for (const status of value.statuses ?? []) {
        out.push(
          base(`whatsapp-status:${status.id}`, status.recipient_id ?? "unknown", {
            isStatusEvent: true,
            contentAttributes: { whatsapp_status: status.status },
          }),
        );
      }
      for (const m of value.messages ?? []) {
        const attachments: NormalizedAttachment[] = [];
        let content: string | null = m.text?.body ?? null;
        const media = m.image ?? m.audio ?? m.video ?? m.document ?? m.sticker;
        if (media && "id" in (media ?? {}) && (media as { id?: string }).id) {
          const kind =
            m.type === "image"
              ? "image"
              : m.type === "audio"
                ? "audio"
                : m.type === "video"
                  ? "video"
                  : "file";
          attachments.push(
            att(
              `whatsapp-media:${(media as { id: string }).id}`,
              kind,
              (media as { filename?: string }).filename ??
                (m.type === "image" || m.type === "video"
                  ? ((m as { image?: { caption?: string }; video?: { caption?: string } }).image
                      ?.caption ??
                    (m as { video?: { caption?: string } }).video?.caption ??
                    null)
                  : null),
            ),
          );
          if (content == null) {
            content =
              (m as { image?: { caption?: string } }).image?.caption ??
              (m as { video?: { caption?: string } }).video?.caption ??
              null;
          }
        }
        out.push(
          base(`whatsapp:${m.id}`, m.from, {
            contactName: profileName,
            contactPhone: `+${m.from}`,
            content,
            attachments,
            contentAttributes: { whatsapp_message_type: m.type },
          }),
        );
      }
    }
  }
  return out;
}

// ---- Facebook / Instagram (POST /webhooks/facebook|instagram) ----

export interface MetaWebhook {
  object?: string;
  entry?: Array<{
    id?: string;
    messaging?: Array<{
      sender?: { id?: string };
      recipient?: { id?: string };
      timestamp?: number;
      message?: {
        mid?: string;
        text?: string;
        attachments?: Array<{ type?: string; payload?: { url?: string } }>;
      };
    }>;
    changes?: Array<{ field?: string; value?: Record<string, unknown> }>;
  }>;
}

function parseMetaMessaging(
  payload: MetaWebhook,
  prefix: "facebook" | "instagram",
): NormalizedInbound[] {
  const out: NormalizedInbound[] = [];
  for (const entry of payload.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      const senderId = ev.sender?.id;
      const mid = ev.message?.mid;
      if (!senderId || !mid) continue;
      const attachments: NormalizedAttachment[] = [];
      for (const a of ev.message?.attachments ?? []) {
        const kind =
          a.type === "image"
            ? "image"
            : a.type === "video"
              ? "video"
              : a.type === "audio"
                ? "audio"
                : "file";
        attachments.push(att(a.payload?.url ?? null, kind));
      }
      out.push(
        base(`${prefix}:${mid}`, senderId, {
          content: ev.message?.text ?? (attachments.length ? null : ""),
          attachments,
          contentAttributes: { [`${prefix}_page_id`]: entry.id ?? null },
        }),
      );
    }
  }
  return out;
}

export function parseFacebookWebhook(payload: MetaWebhook): NormalizedInbound[] {
  return parseMetaMessaging(payload, "facebook");
}

export function parseInstagramWebhook(payload: MetaWebhook): NormalizedInbound[] {
  return parseMetaMessaging(payload, "instagram");
}

// ---- Twitter/X (Account Activity API: POST /webhooks/twitter) ----

export interface TwitterWebhook {
  direct_message_events?: Array<{
    id?: string;
    created_timestamp?: string;
    message_create?: {
      sender_id?: string;
      message_data?: {
        text?: string;
        attachment?: { media?: { media_url?: string; type?: string } };
      };
    };
  }>;
  users?: Record<string, { name?: string; screen_name?: string; profile_image_url?: string }>;
}

export function parseTwitterWebhook(payload: TwitterWebhook): NormalizedInbound[] {
  const out: NormalizedInbound[] = [];
  for (const ev of payload.direct_message_events ?? []) {
    const senderId = ev.message_create?.sender_id;
    if (!senderId || !ev.id) continue;
    const user = payload.users?.[senderId];
    const media = ev.message_create?.message_data?.attachment?.media;
    const attachments: NormalizedAttachment[] = [];
    if (media?.media_url) {
      attachments.push(
        att(
          media.media_url,
          media.type === "photo" ? "image" : media.type === "video" ? "video" : "file",
        ),
      );
    }
    out.push(
      base(`twitter:${ev.id}`, senderId, {
        contactName: user?.name ?? (user?.screen_name ? `@${user.screen_name}` : null),
        contactAvatarUrl: user?.profile_image_url ?? null,
        content: ev.message_create?.message_data?.text ?? (attachments.length ? null : ""),
        attachments,
      }),
    );
  }
  return out;
}

// ---- SMS Twilio (POST /webhooks/sms/:provider, form-urlencoded) ----

export interface TwilioSmsPayload {
  MessageSid?: string;
  From?: string;
  To?: string;
  Body?: string;
  NumMedia?: string;
  [key: string]: unknown;
}

export function parseTwilioSms(payload: TwilioSmsPayload): NormalizedInbound | null {
  if (!payload.MessageSid || !payload.From) return null;
  const numMedia = Number(payload.NumMedia ?? 0);
  const attachments: NormalizedAttachment[] = [];
  for (let i = 0; i < numMedia; i += 1) {
    const url = payload[`MediaUrl${i}`];
    const contentType = payload[`MediaContentType${i}`];
    if (typeof url === "string" && url) {
      const kind =
        typeof contentType === "string" && contentType.startsWith("image/")
          ? "image"
          : typeof contentType === "string" && contentType.startsWith("audio/")
            ? "audio"
            : typeof contentType === "string" && contentType.startsWith("video/")
              ? "video"
              : "file";
      attachments.push(att(url, kind));
    }
  }
  return base(`sms:${payload.MessageSid}`, payload.From, {
    contactPhone: payload.From,
    content: payload.Body ?? (attachments.length ? null : ""),
    attachments,
    contentAttributes: { sms_to: payload.To ?? null, sms_provider: "twilio" },
  });
}

// ---- Email (IMAP poller + POST /webhooks/email Sendgrid/SES) ----

export interface InboundEmail {
  messageId: string;
  from: string;
  fromName?: string;
  to?: string;
  cc?: string[];
  subject?: string;
  textBody?: string;
  htmlBody?: string;
  inReplyTo?: string;
  attachments?: Array<{ url?: string; filename?: string; contentType?: string }>;
}

export function parseInboundEmail(email: InboundEmail): NormalizedInbound | null {
  if (!email.messageId || !email.from) return null;
  const attachments: NormalizedAttachment[] = (email.attachments ?? []).map((a) =>
    att(
      a.url ?? null,
      a.contentType?.startsWith("image/")
        ? "image"
        : a.contentType?.startsWith("audio/")
          ? "audio"
          : a.contentType?.startsWith("video/")
            ? "video"
            : "file",
      a.filename ?? null,
    ),
  );
  const subject = email.subject ? `[${email.subject}] ` : "";
  const content = `${subject}${email.textBody ?? ""}`.trim() || null;
  return base(`email:${email.messageId}`, email.from.toLowerCase(), {
    contactName: email.fromName ?? null,
    contactEmail: email.from.toLowerCase(),
    content,
    attachments,
    contentAttributes: {
      email_subject: email.subject ?? null,
      email_cc: email.cc ?? [],
      in_reply_to: email.inReplyTo ?? null,
    },
  });
}

// ---- Line (POST /webhooks/line) ----

export interface LineWebhook {
  events?: Array<{
    type?: string;
    replyToken?: string;
    source?: { type?: string; userId?: string };
    message?: { id?: string; type?: string; text?: string };
    postback?: { data?: string };
  }>;
}

export function parseLineWebhook(payload: LineWebhook): NormalizedInbound[] {
  const out: NormalizedInbound[] = [];
  for (const ev of payload.events ?? []) {
    if (ev.type !== "message" || !ev.message || !ev.source?.userId) continue;
    const kind = ev.message.type;
    const attachments: NormalizedAttachment[] =
      kind === "image" || kind === "video" || kind === "audio" || kind === "file"
        ? [
            att(
              `line-content:${ev.message.id}`,
              kind === "image"
                ? "image"
                : kind === "video"
                  ? "video"
                  : kind === "audio"
                    ? "audio"
                    : "file",
            ),
          ]
        : kind === "sticker"
          ? [att(`line-content:${ev.message.id}`, "image", "sticker")]
          : [];
    out.push(
      base(`line:${ev.message.id}`, ev.source.userId, {
        content: kind === "text" ? (ev.message.text ?? "") : null,
        attachments,
        contentAttributes: { line_reply_token: ev.replyToken ?? null },
      }),
    );
  }
  return out;
}

// ---- Evolution API (gateway WhatsApp self-hosted: POST /webhooks/evolution) ----

export interface EvolutionWebhook {
  event?: string;
  instance?: string;
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean; id?: string };
    pushName?: string;
    messageType?: string;
    messageTimestamp?: number;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string; url?: string };
      videoMessage?: { caption?: string; url?: string };
      audioMessage?: { url?: string };
      documentMessage?: { title?: string; fileName?: string; url?: string };
      stickerMessage?: { url?: string };
    };
  };
}

export function parseEvolutionWebhook(payload: EvolutionWebhook): NormalizedInbound | null {
  if (payload.event !== "messages.upsert") return null;
  const key = payload.data?.key;
  const remoteJid = key?.remoteJid ?? "";
  // Grupos (@g.us) e status (@broadcast) não viram conversa no MVP.
  if (!remoteJid.endsWith("@s.whatsapp.net") || !key?.id) return null;
  const number = remoteJid.replace(/@s\.whatsapp\.net$/, "");
  // Eco do nosso próprio envio (fromMe): não cria mensagem (evita loop).
  if (key.fromMe) {
    return base(`evolution:${key.id}`, number, {
      isStatusEvent: true,
      contentAttributes: { evolution_echo: true },
    });
  }
  const m = payload.data?.message ?? {};
  const content =
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    null;
  const attachments: NormalizedAttachment[] = [];
  if (m.imageMessage)
    attachments.push(
      att(
        m.imageMessage.url ?? `evolution-media:${key.id}`,
        "image",
        m.imageMessage.caption ?? null,
      ),
    );
  if (m.videoMessage)
    attachments.push(
      att(
        m.videoMessage.url ?? `evolution-media:${key.id}`,
        "video",
        m.videoMessage.caption ?? null,
      ),
    );
  if (m.audioMessage)
    attachments.push(att(m.audioMessage.url ?? `evolution-media:${key.id}`, "audio"));
  if (m.documentMessage)
    attachments.push(
      att(
        m.documentMessage.url ?? `evolution-media:${key.id}`,
        "file",
        m.documentMessage.fileName ?? m.documentMessage.title ?? null,
      ),
    );
  if (m.stickerMessage)
    attachments.push(att(m.stickerMessage.url ?? `evolution-media:${key.id}`, "image", "sticker"));
  return base(`evolution:${key.id}`, number, {
    contactName: payload.data?.pushName ?? null,
    contactPhone: `+${number}`,
    content,
    attachments,
    contentAttributes: { evolution_instance: payload.instance ?? null },
  });
}

// ---- Voice (stub: POST /webhooks/voice — sem mídia no MVP) ----

export interface VoiceWebhook {
  callSid?: string;
  from?: string;
  to?: string;
  status?: string;
}

export function parseVoiceWebhook(payload: VoiceWebhook): NormalizedInbound | null {
  if (!payload.callSid || !payload.from) return null;
  return base(`voice:${payload.callSid}`, payload.from, {
    contactPhone: payload.from,
    content: `[Chamada ${payload.status ?? "registrada"} de ${payload.from}]`,
    contentAttributes: { voice_call_sid: payload.callSid, voice_to: payload.to ?? null },
  });
}
