# Canal Line

Inbound: `POST /webhooks/line` (Messaging API → ChatwootJS), com verificação
HMAC-SHA256 (`x-line-signature` vs `line_channel_secret`, best-effort).
Outbound: push `POST https://api.line.me/v2/bot/message/push`.

## Criar a inbox

LINE Developers → canal Messaging API → Settings → Inboxes → Nova → Line:
`line_channel_id`, `line_channel_secret`, `line_channel_token`.
Webhook URL no console Line: `https://seu-host/webhooks/line`.

## Mídia

Imagem/vídeo/áudio/arquivo chegam como `line-content:<message_id>` (download
exige o channel token, como no Rails). Texto preservado; stickers viram
attachment `image` com fallback `sticker`.

## Idempotência

`messages.source_id = "line:<message_id>"`. Eventos que não são `message`
(follow, join…) são ignorados.
