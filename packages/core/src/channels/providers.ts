/**
 * M10 — Envio dashboard → plataforma (`ChannelProvider.send`).
 *
 * Cada provider usa `fetch` contra a API oficial com as credenciais da
 * linha `channel_*`. Sem credencial válida o envio falha com motivo visível
 * (a mensagem vai para `failed`, como no Rails) — nunca silencioso.
 */
import type { ChannelProvider, OutboundContext, OutboundMessage, SendResult } from "./types.js";

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function cfg(ctx: OutboundContext, key: string): string | undefined {
  const v = ctx.channelConfig[key];
  return typeof v === "string" && v ? v : undefined;
}

const telegram: ChannelProvider = {
  channel: "telegram",
  async send(ctx, msg): Promise<SendResult> {
    const token = cfg(ctx, "botToken");
    if (!token) throw new Error("Telegram: bot_token não configurado");
    if (!msg.contactSourceId) throw new Error("Telegram: chat_id do contato desconhecido");
    const text =
      msg.content ??
      msg.attachments
        .map((a) => a.url)
        .filter(Boolean)
        .join("\n") ??
      "";
    const res = await postJson(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {},
      {
        chat_id: msg.contactSourceId,
        text,
      },
    );
    if (!res.ok) throw new Error(`Telegram API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { result?: { message_id?: number } };
    return { sourceId: data.result?.message_id ? `telegram:${data.result.message_id}` : undefined };
  },
};

const whatsapp: ChannelProvider = {
  channel: "whatsapp",
  async send(ctx, msg): Promise<SendResult> {
    const providerConfig = (ctx.channelConfig.providerConfig ?? {}) as Record<string, unknown>;
    const provider = cfg(ctx, "provider") ?? "default";
    if (provider === "evolution") return sendViaEvolution(ctx, providerConfig, msg);
    if (provider === "twilio") return sendViaTwilioWhatsapp(ctx, providerConfig, msg);
    if (provider === "360dialog" || provider === "360_dialog")
      return sendVia360Dialog(providerConfig, msg);
    const token = cfg(ctx, "businessManagementToken") ?? process.env.WHATSAPP_API_KEY;
    const phoneNumberId =
      (ctx.channelConfig.providerConfig as Record<string, unknown> | undefined)?.phone_number_id ??
      process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      throw new Error(
        "WhatsApp: phone_number_id/token Meta não configurado (ver docs/canais/whatsapp.md)",
      );
    }
    if (!msg.contactPhone && !msg.contactSourceId) {
      throw new Error("WhatsApp: telefone do contato desconhecido");
    }
    const to = (msg.contactPhone ?? msg.contactSourceId ?? "").replace(/^\+/, "");
    const body =
      msg.isTemplate && msg.templateName
        ? {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: { name: msg.templateName, language: { code: "pt_BR" } },
          }
        : {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: msg.content ?? "" },
          };
    const res = await postJson(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        Authorization: `Bearer ${token}`,
      },
      body,
    );
    if (!res.ok) throw new Error(`WhatsApp Cloud ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { messages?: Array<{ id?: string }> };
    return { sourceId: data.messages?.[0]?.id ? `whatsapp:${data.messages[0].id}` : undefined };
  },
};

/** Envio via Twilio (WhatsApp): mesma Messages API do SMS, com prefixo `whatsapp:`. */
async function sendViaTwilioWhatsapp(
  ctx: OutboundContext,
  providerConfig: Record<string, unknown>,
  msg: OutboundMessage,
): Promise<SendResult> {
  const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
  const accountSid = str(providerConfig.twilio_account_sid) ?? process.env.TWILIO_ACCOUNT_SID;
  const authToken = str(providerConfig.twilio_auth_token) ?? process.env.TWILIO_AUTH_TOKEN;
  const rawFrom =
    str(providerConfig.twilio_from) ??
    cfg(ctx, "phoneNumber") ??
    process.env.TWILIO_WHATSAPP_NUMBER ??
    process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !rawFrom) {
    throw new Error(
      "WhatsApp (Twilio): TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/número não configurado " +
        "(env ou provider_config.twilio_*; ver docs/canais/whatsapp.md)",
    );
  }
  const withPrefix = (n: string): string => (n.startsWith("whatsapp:") ? n : `whatsapp:${n}`);
  const to = msg.contactPhone ?? msg.contactSourceId;
  if (!to) throw new Error("WhatsApp (Twilio): telefone do contato desconhecido");
  const form = new URLSearchParams({
    From: withPrefix(rawFrom),
    To: withPrefix(to),
    Body: msg.content ?? "",
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    },
  );
  if (!res.ok) throw new Error(`WhatsApp (Twilio) ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { sid?: string };
  return { sourceId: data.sid ? `twilio-wa:${data.sid}` : undefined };
}

/** Envio via 360Dialog (waba-v2): corpo estilo Cloud API, auth por `D360-API-KEY`. */
async function sendVia360Dialog(
  providerConfig: Record<string, unknown>,
  msg: OutboundMessage,
): Promise<SendResult> {
  const apiKey =
    (typeof providerConfig.api_key === "string" && providerConfig.api_key) ||
    process.env.D360_API_KEY;
  if (!apiKey) {
    throw new Error(
      "WhatsApp (360Dialog): api_key não configurada " +
        "(provider_config.api_key da inbox ou D360_API_KEY; ver docs/canais/whatsapp.md)",
    );
  }
  const to = (msg.contactPhone ?? msg.contactSourceId ?? "").replace(/^\+/, "");
  if (!to) throw new Error("WhatsApp (360Dialog): telefone do contato desconhecido");
  const body =
    msg.isTemplate && msg.templateName
      ? {
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: { name: msg.templateName, language: { code: "pt_BR" } },
        }
      : {
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: msg.content ?? "" },
        };
  const res = await postJson(
    "https://waba-v2.360dialog.io/messages",
    { "D360-API-KEY": apiKey },
    body,
  );
  if (!res.ok) throw new Error(`360Dialog ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { messages?: Array<{ id?: string }> };
  return { sourceId: data.messages?.[0]?.id ? `d360:${data.messages[0].id}` : undefined };
}

/** Envio via Evolution API (self-hosted): POST {base}/message/sendText|sendMedia/{instance}. */
async function sendViaEvolution(
  _ctx: OutboundContext,
  providerConfig: Record<string, unknown>,
  msg: {
    content: string | null;
    contactPhone: string | null;
    contactSourceId: string | null;
    conversationId: number;
    attachments: Array<{ url: string | null; fileType: string; fallbackTitle: string | null }>;
  },
): Promise<SendResult> {
  const str = (v: unknown, env: string | undefined): string | undefined =>
    (typeof v === "string" && v ? v : undefined) ?? env;
  const base = str(providerConfig.evolution_base_url, process.env.EVOLUTION_API_URL)?.replace(
    /\/$/,
    "",
  );
  const apikey = str(providerConfig.evolution_apikey, process.env.EVOLUTION_API_KEY);
  const instance = str(providerConfig.evolution_instance, undefined);
  if (!base || !apikey || !instance) {
    throw new Error(
      "WhatsApp (Evolution): evolution_base_url/instance/apikey não configurados " +
        "(provider_config da inbox ou EVOLUTION_API_URL/EVOLUTION_API_KEY; ver docs/canais/whatsapp.md)",
    );
  }
  const number = (msg.contactPhone ?? msg.contactSourceId ?? "").replace(/^\+/, "");
  if (!number) throw new Error("WhatsApp (Evolution): telefone do contato desconhecido");
  const headers = { apikey };
  const firstMedia = msg.attachments.find((a) => a.url);
  let res: Response;
  if (firstMedia) {
    const mediatype =
      firstMedia.fileType === "0" || firstMedia.fileType === "image"
        ? "image"
        : firstMedia.fileType === "2" || firstMedia.fileType === "video"
          ? "video"
          : firstMedia.fileType === "1" || firstMedia.fileType === "audio"
            ? "audio"
            : "document";
    res = await postJson(`${base}/message/sendMedia/${instance}`, headers, {
      number,
      mediatype,
      media: firstMedia.url,
      caption: msg.content ?? firstMedia.fallbackTitle ?? "",
      fileName: firstMedia.fallbackTitle ?? "arquivo",
    });
  } else {
    res = await postJson(`${base}/message/sendText/${instance}`, headers, {
      number,
      text: msg.content ?? "",
    });
  }
  if (!res.ok) throw new Error(`Evolution API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { key?: { id?: string } };
  return { sourceId: data.key?.id ? `evolution:${data.key.id}` : undefined };
}

const facebook: ChannelProvider = {
  channel: "facebook",
  async send(ctx, msg): Promise<SendResult> {
    const token = cfg(ctx, "pageAccessToken");
    if (!token) throw new Error("Facebook: page_access_token não configurado");
    if (!msg.contactSourceId) throw new Error("Facebook: psid do contato desconhecido");
    const res = await postJson(
      "https://graph.facebook.com/v21.0/me/messages",
      {},
      {
        recipient: { id: msg.contactSourceId },
        message: { text: msg.content ?? "" },
        access_token: token,
      },
    );
    if (!res.ok) throw new Error(`Facebook Send API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { message_id?: string };
    return { sourceId: data.message_id ? `facebook:${data.message_id}` : undefined };
  },
};

const instagram: ChannelProvider = {
  channel: "instagram",
  async send(ctx, msg): Promise<SendResult> {
    const token = cfg(ctx, "accessToken");
    const igId = cfg(ctx, "instagramId");
    if (!token || !igId) throw new Error("Instagram: access_token/instagram_id não configurado");
    if (!msg.contactSourceId) throw new Error("Instagram: igsid do contato desconhecido");
    const res = await postJson(
      `https://graph.facebook.com/v21.0/${igId}/messages`,
      {},
      {
        recipient: { id: msg.contactSourceId },
        message: { text: msg.content ?? "" },
        access_token: token,
      },
    );
    if (!res.ok) throw new Error(`Instagram Send API ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { message_id?: string };
    return { sourceId: data.message_id ? `instagram:${data.message_id}` : undefined };
  },
};

const twitter: ChannelProvider = {
  channel: "twitter",
  async send(_ctx, msg): Promise<SendResult> {
    // Account Activity API exige OAuth 1.0a por chamada — stub documentado.
    throw new Error(
      `Twitter/X: envio via API indisponível no MVP (conversa ${msg.conversationId} mantida; ver docs/canais/twitter.md)`,
    );
  },
};

const sms: ChannelProvider = {
  channel: "sms",
  async send(ctx, msg): Promise<SendResult> {
    const provider = cfg(ctx, "provider") ?? "twilio";
    const providerConfig = (ctx.channelConfig.providerConfig ?? {}) as Record<string, unknown>;
    const accountSid =
      (providerConfig.account_sid as string | undefined) ?? process.env.TWILIO_ACCOUNT_SID;
    const authToken =
      (providerConfig.auth_token as string | undefined) ?? process.env.TWILIO_AUTH_TOKEN;
    if (provider === "bandwidth") return sendViaBandwidth(providerConfig, msg);
    if (provider !== "twilio" && provider !== "default") {
      throw new Error(`SMS: provider "${provider}" não suportado (twilio/bandwidth)`);
    }
    const from = cfg(ctx, "phoneNumber") ?? process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !from) {
      throw new Error(
        "SMS: TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/número não configurado " +
          "(env ou provider_config.account_sid/auth_token; ver docs/canais/sms.md)",
      );
    }
    if (!msg.contactPhone && !msg.contactSourceId) {
      throw new Error("SMS: telefone do contato desconhecido");
    }
    const form = new URLSearchParams({
      From: from,
      To: msg.contactPhone ?? msg.contactSourceId ?? "",
      Body: msg.content ?? "",
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );
    if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { sid?: string };
    return { sourceId: data.sid ? `sms:${data.sid}` : undefined };
  },
};

const email: ChannelProvider = {
  channel: "email",
  async send(ctx, msg): Promise<SendResult> {
    const smtpHost = cfg(ctx, "smtpAddress");
    const smtpUser = cfg(ctx, "smtpLogin");
    const from = cfg(ctx, "email");
    if (!smtpHost || !smtpUser || !from) {
      throw new Error("Email: SMTP da inbox não configurado");
    }
    if (!msg.contactEmail) throw new Error("Email: e-mail do contato desconhecido");
    // Envio SMTP real via job dedicado (nodemailer é dependência opcional):
    // aqui valida endereçamento; o transporte usa o SMTP configurado na inbox.
    const { sendSmtpMail } = await import("./smtp.js");
    const messageId = await sendSmtpMail(ctx, {
      from,
      to: msg.contactEmail,
      subject: `Re: conversa #${msg.conversationId}`,
      text: msg.content ?? "",
    });
    return { sourceId: `email:${messageId}` };
  },
};

const line: ChannelProvider = {
  channel: "line",
  async send(ctx, msg): Promise<SendResult> {
    const token = cfg(ctx, "lineChannelToken");
    if (!token) throw new Error("Line: channel_token não configurado");
    if (!msg.contactSourceId) throw new Error("Line: userId do contato desconhecido");
    const res = await postJson(
      "https://api.line.me/v2/bot/message/push",
      {
        Authorization: `Bearer ${token}`,
      },
      {
        to: msg.contactSourceId,
        messages: [{ type: "text", text: msg.content ?? "" }],
      },
    );
    if (!res.ok) throw new Error(`Line Push ${res.status}: ${await res.text()}`);
    return {};
  },
};

/** Envio via Bandwidth Messaging v2: POST /users/{account}/messages/{appId} (basic auth). */
async function sendViaBandwidth(
  providerConfig: Record<string, unknown>,
  msg: OutboundMessage,
): Promise<SendResult> {
  const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
  const accountId = str(providerConfig.bandwidth_account_id) ?? process.env.BANDWIDTH_ACCOUNT_ID;
  const apiKey = str(providerConfig.bandwidth_api_key) ?? process.env.BANDWIDTH_API_KEY;
  const apiSecret = str(providerConfig.bandwidth_api_secret) ?? process.env.BANDWIDTH_API_SECRET;
  const applicationId =
    str(providerConfig.bandwidth_application_id) ?? process.env.BANDWIDTH_APPLICATION_ID;
  const from = str(providerConfig.bandwidth_from) ?? process.env.BANDWIDTH_PHONE_NUMBER;
  if (!accountId || !apiKey || !apiSecret || !applicationId || !from) {
    throw new Error(
      "SMS (Bandwidth): account_id/api_key/api_secret/application_id/número não configurados " +
        "(provider_config.bandwidth_* ou BANDWIDTH_*; ver docs/canais/sms.md)",
    );
  }
  const to = msg.contactPhone ?? msg.contactSourceId;
  if (!to) throw new Error("SMS (Bandwidth): telefone do contato desconhecido");
  const res = await postJson(
    `https://messaging.bandwidth.com/api/v2/users/${accountId}/messages/${applicationId}`,
    {
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
    },
    { to: [to], from, text: msg.content ?? "", applicationId },
  );
  if (res.status !== 202 && !res.ok)
    throw new Error(`Bandwidth ${res.status}: ${await res.text()}`);
  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return { sourceId: data.id ? `sms:bw-${data.id}` : undefined };
}

const voice: ChannelProvider = {
  channel: "voice",
  async send(ctx, msg): Promise<SendResult> {
    const attrs = (ctx.channelConfig.additionalAttributes ?? {}) as Record<string, unknown>;
    const voiceCfg = (attrs.voice ?? {}) as Record<string, unknown>;
    if (voiceCfg.voice_provider !== "twilio") {
      throw new Error(
        `Voice: sem provedor configurado (conversa ${msg.conversationId} registrada como stub; ` +
          "configure Twilio em Configuração da inbox; ver docs/canais/voice.md)",
      );
    }
    const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
    const accountSid = str(voiceCfg.twilio_account_sid) ?? process.env.TWILIO_ACCOUNT_SID;
    const authToken = str(voiceCfg.twilio_auth_token) ?? process.env.TWILIO_AUTH_TOKEN;
    const from =
      str(voiceCfg.twilio_from) ??
      process.env.TWILIO_VOICE_NUMBER ??
      process.env.TWILIO_PHONE_NUMBER;
    const twimlUrl = str(voiceCfg.twilio_twiml_url) ?? process.env.VOICE_TWIML_URL;
    if (!accountSid || !authToken || !from || !twimlUrl) {
      throw new Error(
        "Voice (Twilio): account_sid/auth_token/from/twiml_url não configurados " +
          "(Configuração da inbox ou TWILIO_*/VOICE_TWIML_URL; ver docs/canais/voice.md)",
      );
    }
    const to = msg.contactPhone ?? msg.contactSourceId;
    if (!to) throw new Error("Voice (Twilio): telefone do contato desconhecido");
    const form = new URLSearchParams({ To: to, From: from, Url: twimlUrl });
    const statusCallback = str(voiceCfg.twilio_status_callback) ?? process.env.VOICE_STATUS_URL;
    if (statusCallback) form.set("StatusCallback", statusCallback);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!res.ok) throw new Error(`Twilio Calls ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { sid?: string };
    return { sourceId: data.sid ? `voice:${data.sid}` : undefined };
  },
};

export const PROVIDERS: Record<string, ChannelProvider> = {
  telegram,
  whatsapp,
  facebook,
  instagram,
  twitter,
  sms,
  email,
  line,
  voice,
};

export function providerFor(channelType: string): ChannelProvider | null {
  const map: Record<string, ChannelProvider> = {
    "Channel::Telegram": telegram,
    "Channel::Whatsapp": whatsapp,
    "Channel::FacebookPage": facebook,
    "Channel::Instagram": instagram,
    "Channel::TwitterProfile": twitter,
    "Channel::Sms": sms,
    "Channel::Email": email,
    "Channel::Line": line,
  };
  return map[channelType] ?? null;
}
