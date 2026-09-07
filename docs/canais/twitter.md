# Canal Twitter / X (DMs)

Inbound: `POST /webhooks/twitter` (Account Activity API) + `GET` CRC
(`crc_token` → `response_token` HMAC-SHA256).
Outbound: **indisponível no MVP** — o envio pela API exige OAuth 1.0a por
chamada; a mensagem vai para `failed` com o motivo visível no thread
(mesmo contrato de erro dos outros canais, sem silencioso).

## Criar a inbox

Settings → Inboxes → Nova → Twitter: `profile_id` (vai em `for_user_id`),
`twitter_access_token`, `twitter_access_token_secret`.

## `.env`

```bash
TWITTER_CONSUMER_SECRET=<api-secret-do-app>
```

Registre a webhook URL `https://seu-host/webhooks/twitter` no portal do
desenvolvedor X e crie a subscription da conta.

## Idempotência

`messages.source_id = "twitter:<dm_id>"`.
