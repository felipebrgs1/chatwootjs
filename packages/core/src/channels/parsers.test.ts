/**
 * M10 — Testes dos parsers de webhook (puros, sem DB): `bun test channels`.
 * Fixtures seguem o formato documentado de cada plataforma.
 */
import { describe, expect, test } from "bun:test";

import {
  parseEvolutionWebhook,
  parseFacebookWebhook,
  parseInboundEmail,
  parseInstagramWebhook,
  parseLineWebhook,
  parseTelegramUpdate,
  parseTwilioSms,
  parseTwitterWebhook,
  parseVoiceWebhook,
  parseWhatsappWebhook,
} from "./parsers";

describe("telegram", () => {
  test("texto + foto", () => {
    const msg = parseTelegramUpdate({
      update_id: 7,
      message: {
        message_id: 42,
        from: { id: 111, first_name: "Ada", last_name: "Lovelace" },
        chat: { id: 111 },
        date: 1_700_000_000,
        text: "olá",
      },
    });
    expect(msg?.sourceId).toBe("telegram:111:42");
    expect(msg?.contactName).toBe("Ada Lovelace");
    expect(msg?.content).toBe("olá");
  });

  test("update sem message → null", () => {
    expect(parseTelegramUpdate({ update_id: 8 })).toBeNull();
  });

  test("documento vira attachment file", () => {
    const msg = parseTelegramUpdate({
      update_id: 9,
      message: {
        message_id: 43,
        from: { id: 222 },
        chat: { id: 222 },
        date: 1,
        caption: "segue",
        document: { file_id: "abc", file_name: "nota.pdf" },
      },
    });
    expect(msg?.attachments[0]?.fileType).toBe("file");
    expect(msg?.attachments[0]?.remoteUrl).toBe("telegram-file:abc");
    expect(msg?.content).toBe("segue");
  });
});

describe("whatsapp", () => {
  test("texto + status", () => {
    const out = parseWhatsappWebhook({
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "999" },
                contacts: [{ wa_id: "5511999990000", profile: { name: "Alan" } }],
                messages: [
                  {
                    from: "5511999990000",
                    id: "wamid.1",
                    timestamp: "1",
                    type: "text",
                    text: { body: "oi" },
                  },
                ],
                statuses: [{ id: "wamid.0", status: "delivered", recipient_id: "5511999990000" }],
              },
            },
          ],
        },
      ],
    });
    const inbound = out.find((m) => !m.isStatusEvent);
    expect(inbound?.sourceId).toBe("whatsapp:wamid.1");
    expect(inbound?.contactPhone).toBe("+5511999990000");
    expect(inbound?.content).toBe("oi");
    expect(out.some((m) => m.isStatusEvent)).toBe(true);
  });

  test("imagem com caption", () => {
    const out = parseWhatsappWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: "5511888880000",
                    id: "wamid.2",
                    type: "image",
                    image: { id: "media1", caption: "foto" },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(out[0]?.attachments[0]?.remoteUrl).toBe("whatsapp-media:media1");
    expect(out[0]?.content).toBe("foto");
  });
});

describe("meta (facebook/instagram)", () => {
  const payload = {
    object: "page",
    entry: [
      {
        id: "PAGE1",
        messaging: [
          {
            sender: { id: "PSID1" },
            recipient: { id: "PAGE1" },
            timestamp: 1,
            message: { mid: "mid.1", text: "hello" },
          },
        ],
      },
    ],
  };
  test("facebook", () => {
    const out = parseFacebookWebhook(payload);
    expect(out[0]?.sourceId).toBe("facebook:mid.1");
    expect(out[0]?.contactSourceId).toBe("PSID1");
  });
  test("instagram", () => {
    const out = parseInstagramWebhook({ ...payload, object: "instagram" });
    expect(out[0]?.sourceId).toBe("instagram:mid.1");
  });
});

describe("twitter", () => {
  test("dm com texto", () => {
    const out = parseTwitterWebhook({
      direct_message_events: [
        {
          id: "dm1",
          message_create: { sender_id: "42", message_data: { text: "hi" } },
        },
      ],
      users: { "42": { name: "Bob", screen_name: "bob" } },
    });
    expect(out[0]?.sourceId).toBe("twitter:dm1");
    expect(out[0]?.contactName).toBe("Bob");
  });
});

describe("sms twilio", () => {
  test("corpo + mídia", () => {
    const msg = parseTwilioSms({
      MessageSid: "SM1",
      From: "+5511999990000",
      To: "+5511888880000",
      Body: "ping",
      NumMedia: "1",
      MediaUrl0: "https://example.com/a.jpg",
      MediaContentType0: "image/jpeg",
    });
    expect(msg?.sourceId).toBe("sms:SM1");
    expect(msg?.attachments[0]?.fileType).toBe("image");
  });
  test("sem sid → null", () => {
    expect(parseTwilioSms({ From: "+55" })).toBeNull();
  });
});

describe("email", () => {
  test("assunto prefixado + threading", () => {
    const msg = parseInboundEmail({
      messageId: "<abc@mail>",
      from: "User@Example.com",
      fromName: "User",
      subject: "Ajuda",
      textBody: "preciso de ajuda",
      inReplyTo: "<prev@mail>",
    });
    expect(msg?.sourceId).toBe("email:<abc@mail>");
    expect(msg?.contactEmail).toBe("user@example.com");
    expect(msg?.content).toBe("[Ajuda] preciso de ajuda");
    expect(msg?.contentAttributes.in_reply_to).toBe("<prev@mail>");
  });
});

describe("line", () => {
  test("texto", () => {
    const out = parseLineWebhook({
      events: [
        {
          type: "message",
          replyToken: "rt",
          source: { userId: "U1" },
          message: { id: "m1", type: "text", text: "konnichiwa" },
        },
      ],
    });
    expect(out[0]?.sourceId).toBe("line:m1");
    expect(out[0]?.content).toBe("konnichiwa");
  });
  test("não-mensagem ignorado", () => {
    expect(
      parseLineWebhook({ events: [{ type: "follow", source: { userId: "U1" } }] }),
    ).toHaveLength(0);
  });
});

describe("evolution", () => {
  test("texto simples", () => {
    const msg = parseEvolutionWebhook({
      event: "messages.upsert",
      instance: "loja",
      data: {
        key: { remoteJid: "5511999990000@s.whatsapp.net", fromMe: false, id: "WA1" },
        pushName: "Alan",
        message: { conversation: "oi" },
      },
    });
    expect(msg?.sourceId).toBe("evolution:WA1");
    expect(msg?.contactPhone).toBe("+5511999990000");
    expect(msg?.content).toBe("oi");
  });

  test("fromMe vira evento de status (sem loop)", () => {
    const msg = parseEvolutionWebhook({
      event: "messages.upsert",
      instance: "loja",
      data: {
        key: { remoteJid: "5511999990000@s.whatsapp.net", fromMe: true, id: "WA2" },
        message: { conversation: "resposta do agente" },
      },
    });
    expect(msg?.isStatusEvent).toBe(true);
  });

  test("grupo e outros eventos ignorados", () => {
    expect(
      parseEvolutionWebhook({
        event: "messages.upsert",
        data: {
          key: { remoteJid: "123@g.us", fromMe: false, id: "G1" },
          message: { conversation: "grupo" },
        },
      }),
    ).toBeNull();
    expect(parseEvolutionWebhook({ event: "connection.update" })).toBeNull();
  });
});

describe("voice stub", () => {
  test("registra chamada sem mídia", () => {
    const msg = parseVoiceWebhook({ callSid: "CA1", from: "+5511999990000", status: "completed" });
    expect(msg?.sourceId).toBe("voice:CA1");
    expect(msg?.attachments).toHaveLength(0);
  });
});
