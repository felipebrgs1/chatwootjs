# Canal Telegram

Inbound: `POST /webhooks/telegram/:bot_token` (Bot API → ChatwootJS).
Outbound: `POST https://api.telegram.org/bot<token>/sendMessage`.

## Criar a inbox

1. Fale com `@BotFather` → `/newbot` → copie o token.
2. Settings → Inboxes → Nova → Telegram → `bot_name` + `bot_token`.
3. Registre o webhook no Telegram (troque `TOKEN` e o host):

```bash
curl "https://api.telegram.org/botTOKEN/setWebhook" \
  -d "url=https://seu-host/webhooks/telegram/TOKEN"
```

## Anexos

Foto/voz/vídeo/documento/sticker chegam como `telegram-file:<file_id>`.
O download exige `getFile` com o token — o ingest persiste o `file_id` em
`attachments.external_url`; a resolução para URL https é feita no envio/
pré-visualização (mesmo comportamento do Rails, que guarda o `file_id`).

## Idempotência

`messages.source_id = "telegram:<chat_id>:<message_id>"`.
