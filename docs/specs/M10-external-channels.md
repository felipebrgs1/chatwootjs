# M10 — Canais externos (WhatsApp, Meta, Telegram, Email, SMS, Line, Voice)

Depende de: **M2, M4, M6**. Maior módulo depois do M4 — implementar por canal.

## 1. Objetivo

Receber e responder mensagens de cada canal externo através do dashboard,
atrás da interface única `ChannelProvider`.

## 2. Referência Chatwoot

- `chatwoot/app/models/channel/{whatsapp,facebook_page,instagram,telegram,twitter_profile,sms,email,line}.rb`
- `chatwoot/app/controllers/webhooks/*` + `chatwoot/app/services/channel/*`
- `chatwoot/lib/integrations/*` + docs de cada `channel_*` em `docs/`

## 3. Arquitetura (`packages/core/channels/`)

```ts
interface ChannelProvider {
  send(conversation, message): Promise<{ source_id }>; // dashboard -> externo
  handleWebhook(payload, headers): Promise<void>; // externo -> inbound
}
```

Inbound genérico: identifica `source_id` → `contact_inbox` (cria contato se
novo) → cria/atualiza conversa → cria message incoming → publica realtime

- dispara automações (M6). Outbound: message outgoing → provider.send →
  atualiza `status/source_id`.

Webhooks (paths iguais ao Rails onde existirem):

| Canal          | Rota                                                                               | Obs                                            |
| -------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| WhatsApp Cloud | `POST /webhooks/whatsapp` (+ `GET` verify `hub.*`)                                 | templates p/ outbound fora da janela 24h       |
| Facebook       | `POST /webhooks/facebook`                                                          | verify + `messaging` events                    |
| Instagram      | `POST /webhooks/instagram`                                                         | idem                                           |
| Telegram       | `POST /webhooks/telegram/:bot_token`                                               | Bot API                                        |
| Twitter/X      | `POST /webhooks/twitter`                                                           | CRC + DMs                                      |
| SMS (Twilio)   | `POST /webhooks/sms/:provider`                                                     | TwiML                                          |
| Email          | inbound IMAP poller (job repetível BullMQ) + `POST /webhooks/email` (Sendgrid/SES) | reply com CC/BCC, `in_reply_to` por Message-ID |
| Line           | `POST /webhooks/line`                                                              | signature HMAC                                 |
| Voice          | stub: cria conversa + registra chamada (sem mídia no MVP)                          |                                                |

## 4. Ordem por canal (um PR cada, nesta ordem)

1. **Email** — IMAP/SMTP por inbox (`channel_email`), polling job, threading.
2. **Telegram** — token do bot, polling ou webhook.
3. **WhatsApp Cloud** — `phone_number_id` + token Meta, templates aprovados.
4. **Facebook + Instagram** — OAuth Meta (app review fora do escopo; fluxo + code).
5. **Twitter/X** — Account Activity API.
6. **SMS** — Twilio (depois Bandwidth).
7. **Line** — Messaging API.
8. **Voice** — stub.

Cada PR: provider + webhook/poller + wizard no front (`settings/inboxes/new`
ganha o passo de credencial/OAuth do canal) + anexos por canal (imagem/áudio/
documento/sticker → attachment com `file_type` correto).

## 5. Aceite (por canal)

- [ ] Mensagem externa cria contato+conversa e aparece no dashboard realtime.
- [ ] Resposta do dashboard chega no app externo (com anexo quando suportado).
- [ ] Erro de envio marca message `failed` com motivo visível.
- [ ] Reconexão/retry não duplica mensagens (idempotência por `source_id`).

## 6. Done

Provider + webhook/poller + wizard + testes (payload real de cada plataforma
gravado como fixture) + doc de configuração em `docs/canais/<canal>.md`.
