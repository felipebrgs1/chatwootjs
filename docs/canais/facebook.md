# Canal Facebook (Messenger)

Inbound: `POST /webhooks/facebook` (+ `GET` verify `hub.*`).
Outbound: Send API (`POST https://graph.facebook.com/v21.0/me/messages`).

## Criar a inbox

Settings → Inboxes → Nova → Facebook: `page_id`, `user_access_token`,
`page_access_token` (fluxo OAuth do app Meta fora do escopo — cole os tokens).

## `.env`

```bash
FACEBOOK_VERIFY_TOKEN=um-segredo-qualquer
```

Callback no app Meta: `https://seu-host/webhooks/facebook`.

## Idempotência

`messages.source_id = "facebook:<mid>"`. Anexos imagem/vídeo/áudio chegam com
URL direta do Meta em `attachments.external_url`.
