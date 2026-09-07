# Canal Instagram (Direct)

Inbound: `POST /webhooks/instagram` (+ `GET` verify `hub.*`, mesmo
`FACEBOOK_VERIFY_TOKEN`).
Outbound: `POST https://graph.facebook.com/v21.0/<ig_id>/messages`.

## Criar a inbox

Pré-requisito: conta profissional vinculada a uma Página do Facebook.
Settings → Inboxes → Nova → Instagram: `instagram_id` + `access_token`.
O token expira em ~60 dias (`expires_at` = criação + 60d) — renove no Meta e
atualize a linha `channel_instagram` (wizard de refresh entra no M11).

## Idempotência

`messages.source_id = "instagram:<mid>"`.
