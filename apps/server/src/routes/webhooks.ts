/**
 * M10 — Webhooks públicos dos canais externos (sem auth; verificação por
 * token/assinatura de cada plataforma).
 *
 * Rotas (métodos espelham o Rails onde existem):
 * - GET/POST /webhooks/whatsapp, /webhooks/facebook, /webhooks/instagram
 * - POST /webhooks/whatsapp/twilio (Twilio WhatsApp), POST /webhooks/360dialog
 * - POST /webhooks/evolution (Evolution API, gateway WhatsApp self-hosted)
 * - POST /webhooks/telegram/:bot_token, /webhooks/twitter, /webhooks/sms/:provider
 *   (twilio form-urlencoded ou bandwidth JSON),
 *   POST /webhooks/email, /webhooks/line, /webhooks/voice (+ GET /voice/twiml)
 *
 * Inbound: parser puro → resolve inbox → `ingestInbound` (idempotente por
 * `source_id` → contato+conversa+mensagem, realtime via M4).
 */
import { db } from "@chatwootjs/db";
import {
  findInboxByChannel,
  ingestInbound,
  type LineWebhook,
  parseBandwidthSms,
  parseEvolutionWebhook,
  parseFacebookWebhook,
  parseInboundEmail,
  parseInstagramWebhook,
  parseLineWebhook,
  parseTelegramUpdate,
  parseTwilioSms,
  parseTwilioWhatsapp,
  parseTwitterWebhook,
  parseVoiceWebhook,
  parseWhatsappWebhook,
  type NormalizedInbound,
} from "@chatwootjs/core";
import { eq } from "drizzle-orm";
import { Hono } from "hono";

const app = new Hono();

async function ingestAll(
  accountId: number,
  inboxId: number,
  items: NormalizedInbound[],
): Promise<{ ingested: number; deduplicated: number }> {
  let ingested = 0;
  let deduplicated = 0;
  for (const item of items) {
    const r = await ingestInbound(accountId, inboxId, item);
    if (r.deduplicated) deduplicated += 1;
    else ingested += 1;
  }
  return { ingested, deduplicated };
}

function verifyChallenge(
  c: { req: { query: (k: string) => string | undefined } },
  envToken: string | undefined,
): Response | null {
  const q = c.req.query.bind(c.req);
  if (q("hub.mode") !== "subscribe") return null;
  const token = q("hub.verify_token");
  const challenge = q("hub.challenge") ?? "";
  if (envToken && token !== envToken) return new Response("Forbidden", { status: 403 });
  return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

// ---- WhatsApp Cloud ----

app.get("/whatsapp", (c) => {
  const res = verifyChallenge(c, process.env.WHATSAPP_VERIFY_TOKEN);
  return res ?? c.text("Forbidden", 403);
});

app.post("/whatsapp", async (c) => {
  try {
    const payload = await c.req.json();
    const items = parseWhatsappWebhook(payload);
    const first = payload?.entry?.[0]?.changes?.[0]?.value;
    const phoneNumberId = first?.metadata?.phone_number_id as string | undefined;
    const displayNumber = first?.metadata?.display_phone_number as string | undefined;
    const inbox = await findInboxByChannel("Channel::Whatsapp", async (inboxRow) => {
      const row = await db.query.channelWhatsapps.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      if (!row) return false;
      const cfg = (row.providerConfig ?? {}) as Record<string, unknown>;
      if (phoneNumberId && cfg.phone_number_id === phoneNumberId) return true;
      if (displayNumber && row.phoneNumber === displayNumber) return true;
      return false;
    });
    if (!inbox) return c.json({ error: "inbox not found for phone_number_id" }, 404);
    const counts = await ingestAll(inbox.accountId, inbox.id, items);
    return c.json({ ok: true, ...counts });
  } catch (err) {
    console.error("[webhooks/whatsapp]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

// ---- WhatsApp via Twilio (form-urlencoded; To/From com prefixo `whatsapp:`) ----

app.post("/whatsapp/twilio", async (c) => {
  try {
    const body = await c.req.parseBody();
    const flat: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) flat[k] = typeof v === "string" ? v : String(v);
    const item = parseTwilioWhatsapp(flat);
    if (!item) return c.json({ error: "invalid whatsapp payload" }, 422);
    const dest = (item.contentAttributes.whatsapp_to as string | undefined) ?? undefined;
    const inbox = await findInboxByChannel("Channel::Whatsapp", async (inboxRow) => {
      const row = await db.query.channelWhatsapps.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      if (!row) return false;
      if (row.provider !== "twilio" && row.provider !== "default") return false;
      if (!dest) return row.provider === "twilio";
      const norm = (n: string): string => n.replace(/^whatsapp:\+?/, "").replace(/^\+/, "");
      return norm(row.phoneNumber) === norm(dest);
    });
    if (!inbox) return c.json({ error: "whatsapp twilio inbox not found" }, 404);
    const counts = await ingestAll(inbox.accountId, inbox.id, [item]);
    // TwiML vazio (só confirma recebimento; a resposta sai pelo dashboard).
    c.header("Content-Type", "text/xml");
    return c.body(`<Response/><!-- ingested=${counts.ingested} -->`, 200);
  } catch (err) {
    console.error("[webhooks/whatsapp/twilio]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

// ---- 360Dialog (mesmo formato Cloud API; resolve pela inbox provider=360dialog) ----

app.post("/360dialog", async (c) => {
  try {
    const payload = await c.req.json();
    const items = parseWhatsappWebhook(payload);
    const first = payload?.entry?.[0]?.changes?.[0]?.value;
    const phoneNumberId = first?.metadata?.phone_number_id as string | undefined;
    const displayNumber = first?.metadata?.display_phone_number as string | undefined;
    const inbox = await findInboxByChannel("Channel::Whatsapp", async (inboxRow) => {
      const row = await db.query.channelWhatsapps.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      if (!row) return false;
      if (row.provider !== "360dialog" && row.provider !== "360_dialog") return false;
      const cfg = (row.providerConfig ?? {}) as Record<string, unknown>;
      if (phoneNumberId && cfg.phone_number_id === phoneNumberId) return true;
      if (displayNumber && row.phoneNumber === displayNumber) return true;
      return false;
    });
    if (!inbox) return c.json({ error: "360dialog inbox not found" }, 404);
    const counts = await ingestAll(inbox.accountId, inbox.id, items);
    return c.json({ ok: true, ...counts });
  } catch (err) {
    console.error("[webhooks/360dialog]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

app.post("/evolution", async (c) => {
  try {
    const payload = await c.req.json();
    const item = parseEvolutionWebhook(payload);
    if (!item) return c.json({ ok: true, ingested: 0, deduplicated: 0 });
    const instance = payload?.instance as string | undefined;
    const queryInstance = c.req.query("instance");
    const inbox = await findInboxByChannel("Channel::Whatsapp", async (inboxRow) => {
      const row = await db.query.channelWhatsapps.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      if (!row) return false;
      const cfg = (row.providerConfig ?? {}) as Record<string, unknown>;
      if (cfg.provider !== "evolution" && row.provider !== "evolution") return false;
      if (queryInstance) return cfg.evolution_instance === queryInstance;
      if (instance && cfg.evolution_instance) return cfg.evolution_instance === instance;
      // Sem instance vinculada: aceita se for a única inbox Evolution (dev/homolog).
      return true;
    });
    if (!inbox) return c.json({ error: "evolution inbox not found" }, 404);
    const counts = await ingestAll(inbox.accountId, inbox.id, [item]);
    return c.json({ ok: true, ...counts });
  } catch (err) {
    console.error("[webhooks/evolution]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

// ---- Facebook ----

app.get("/facebook", (c) => {
  const res = verifyChallenge(c, process.env.FACEBOOK_VERIFY_TOKEN);
  return res ?? c.text("Forbidden", 403);
});

app.post("/facebook", async (c) => {
  try {
    const payload = await c.req.json();
    const pageId = payload?.entry?.[0]?.id as string | undefined;
    const inbox = await findInboxByChannel("Channel::FacebookPage", async (inboxRow) => {
      const row = await db.query.channelFacebookPages.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      return !!row && (!pageId || row.pageId === pageId);
    });
    if (!inbox) return c.json({ error: "facebook inbox not found" }, 404);
    const counts = await ingestAll(inbox.accountId, inbox.id, parseFacebookWebhook(payload));
    return c.json({ ok: true, ...counts });
  } catch (err) {
    console.error("[webhooks/facebook]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

// ---- Instagram ----

app.get("/instagram", (c) => {
  const res = verifyChallenge(c, process.env.FACEBOOK_VERIFY_TOKEN);
  return res ?? c.text("Forbidden", 403);
});

app.post("/instagram", async (c) => {
  try {
    const payload = await c.req.json();
    const igId = payload?.entry?.[0]?.id as string | undefined;
    const inbox = await findInboxByChannel("Channel::Instagram", async (inboxRow) => {
      const row = await db.query.channelInstagrams.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      return !!row && (!igId || row.instagramId === igId);
    });
    if (!inbox) return c.json({ error: "instagram inbox not found" }, 404);
    const counts = await ingestAll(inbox.accountId, inbox.id, parseInstagramWebhook(payload));
    return c.json({ ok: true, ...counts });
  } catch (err) {
    console.error("[webhooks/instagram]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

// ---- Telegram (token na URL identifica a inbox) ----

app.post("/telegram/:bot_token", async (c) => {
  try {
    const token = c.req.param("bot_token");
    const payload = await c.req.json();
    const inbox = await findInboxByChannel("Channel::Telegram", async (inboxRow) => {
      const row = await db.query.channelTelegrams.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      return row?.botToken === token;
    });
    if (!inbox) return c.json({ error: "telegram inbox not found" }, 404);
    const item = parseTelegramUpdate(payload);
    if (!item) return c.json({ ok: true, ingested: 0, deduplicated: 0 });
    const counts = await ingestAll(inbox.accountId, inbox.id, [item]);
    return c.json({ ok: true, ...counts });
  } catch (err) {
    console.error("[webhooks/telegram]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

// ---- Twitter/X (CRC + DMs) ----

app.get("/twitter", async (c) => {
  const crc = c.req.query("crc_token");
  const secret = process.env.TWITTER_CONSUMER_SECRET;
  if (!crc || !secret) return c.text("Forbidden", 403);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(crc));
  const b64 = Buffer.from(sig).toString("base64");
  return c.json({ response_token: `sha256=${b64}` });
});

app.post("/twitter", async (c) => {
  try {
    const payload = await c.req.json();
    const forUserId = payload?.for_user_id as string | undefined;
    const inbox = await findInboxByChannel("Channel::TwitterProfile", async (inboxRow) => {
      const row = await db.query.channelTwitters.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      return !!row && (!forUserId || row.profileId === forUserId);
    });
    if (!inbox) return c.json({ error: "twitter inbox not found" }, 404);
    const counts = await ingestAll(inbox.accountId, inbox.id, parseTwitterWebhook(payload));
    return c.json({ ok: true, ...counts });
  } catch (err) {
    console.error("[webhooks/twitter]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

// ---- SMS (Twilio form-urlencoded; Bandwidth JSON no mesmo :provider) ----

app.post("/sms/:provider", async (c) => {
  try {
    const providerParam = c.req.param("provider");
    if (providerParam === "bandwidth") {
      const payload = await c.req.json();
      const item = parseBandwidthSms(payload);
      if (!item) return c.json({ error: "invalid sms payload" }, 422);
      const to = item.contentAttributes.sms_to as string | undefined;
      const inbox = await findInboxByChannel("Channel::Sms", async (inboxRow) => {
        const row = await db.query.channelSms.findFirst({
          where: (t) => eq(t.id, inboxRow.channelId),
        });
        if (!row) return false;
        if (row.provider !== "bandwidth") return false;
        return !to || row.phoneNumber === to;
      });
      if (!inbox) return c.json({ error: "sms inbox not found" }, 404);
      const counts = await ingestAll(inbox.accountId, inbox.id, [item]);
      return c.json({ ok: true, ...counts });
    }
    const body = await c.req.parseBody();
    const flat: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) flat[k] = typeof v === "string" ? v : String(v);
    const item = parseTwilioSms(flat);
    if (!item) return c.json({ error: "invalid sms payload" }, 422);
    const to = typeof flat.To === "string" ? flat.To : undefined;
    const inbox = await findInboxByChannel("Channel::Sms", async (inboxRow) => {
      const row = await db.query.channelSms.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      return !!row && (!to || row.phoneNumber === to);
    });
    if (!inbox) return c.json({ error: "sms inbox not found" }, 404);
    const counts = await ingestAll(inbox.accountId, inbox.id, [item]);
    // TwiML vazio (só confirma recebimento; a resposta sai pelo dashboard).
    c.header("Content-Type", "text/xml");
    return c.body(`<Response/><!-- ingested=${counts.ingested} -->`, 200);
  } catch (err) {
    console.error("[webhooks/sms]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

// ---- Email inbound (SendGrid Inbound Parse / SES → JSON normalizado) ----

app.post("/email", async (c) => {
  try {
    const payload = await c.req.json();
    const item = parseInboundEmail(payload);
    if (!item) return c.json({ error: "invalid email payload" }, 422);
    const to = payload?.to as string | undefined;
    const inbox = await findInboxByChannel("Channel::Email", async (inboxRow) => {
      const row = await db.query.channelEmail.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      return !!row && (!to || row.email.toLowerCase() === to.toLowerCase());
    });
    if (!inbox) return c.json({ error: "email inbox not found" }, 404);
    const counts = await ingestAll(inbox.accountId, inbox.id, [item]);
    return c.json({ ok: true, ...counts });
  } catch (err) {
    console.error("[webhooks/email]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

// ---- Line (assinatura HMAC best-effort) ----

app.post("/line", async (c) => {
  try {
    const raw = await c.req.text();
    const payload = JSON.parse(raw) as LineWebhook & { destination?: string };
    const inbox = await findInboxByChannel("Channel::Line", async (inboxRow) => {
      const row = await db.query.channelLines.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      if (!row) return false;
      if (payload.destination && row.lineChannelId !== payload.destination) return false;
      const signature = c.req.header("x-line-signature");
      if (signature && row.lineChannelSecret) {
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(row.lineChannelSecret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"],
        );
        const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
        const expected = Buffer.from(sig).toString("base64");
        if (expected !== signature) {
          console.warn("[webhooks/line] assinatura inválida");
          return false;
        }
      }
      return true;
    });
    if (!inbox) return c.json({ error: "line inbox not found" }, 404);
    const counts = await ingestAll(inbox.accountId, inbox.id, parseLineWebhook(payload));
    return c.json({ ok: true, ...counts });
  } catch (err) {
    console.error("[webhooks/line]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

// ---- Voice: TwiML para chamadas Twilio (VoiceUrl da inbox) ----

app.get("/voice/twiml", (c) => {
  const say = c.req.query("say") ?? "Sua chamada foi recebida. Um atendente já vai falar com você.";
  const record = c.req.query("record") !== "false";
  const twiml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<Response><Say voice="alice" language="pt-BR">${say.replace(/[<>&]/g, "")}</Say>` +
    (record ? `<Record/>` : ``) +
    `</Response>`;
  c.header("Content-Type", "text/xml");
  return c.body(twiml, 200);
});

// ---- Voice (stub: registra a chamada como mensagem; ?identifier= resolve a inbox API) ----

app.post("/voice", async (c) => {
  try {
    const payload = await c.req.json().catch(() => ({}));
    const body = await c.req.parseBody().catch(() => ({}));
    const merged = {
      ...(body as Record<string, unknown>),
      ...(payload as Record<string, unknown>),
    };
    const item = parseVoiceWebhook({
      callSid: (merged.CallSid as string | undefined) ?? (merged.callSid as string | undefined),
      from: (merged.From as string | undefined) ?? (merged.from as string | undefined),
      to: (merged.To as string | undefined) ?? (merged.to as string | undefined),
      status: (merged.CallStatus as string | undefined) ?? (merged.status as string | undefined),
    });
    if (!item) return c.json({ error: "invalid voice payload" }, 422);
    const identifier = c.req.query("identifier");
    const to = item.contactPhone;
    const inbox = await findInboxByChannel("Channel::Api", async (inboxRow) => {
      const row = await db.query.channelApi.findFirst({
        where: (t) => eq(t.id, inboxRow.channelId),
      });
      if (!row) return false;
      if (identifier) return row.identifier === identifier;
      return true;
    }).then(
      async (apiInbox) =>
        apiInbox ??
        (await findInboxByChannel("Channel::Sms", async (inboxRow) => {
          const row = await db.query.channelSms.findFirst({
            where: (t) => eq(t.id, inboxRow.channelId),
          });
          return !!row && (!to || row.phoneNumber === to);
        })),
    );
    if (!inbox) return c.json({ error: "voice inbox not found (use ?identifier=)" }, 404);
    const counts = await ingestAll(inbox.accountId, inbox.id, [item]);
    return c.json({ ok: true, ...counts });
  } catch (err) {
    console.error("[webhooks/voice]", err);
    return c.json({ error: "ingest failed" }, 500);
  }
});

export default app;
