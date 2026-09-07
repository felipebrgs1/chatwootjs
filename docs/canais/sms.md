# Canal SMS (Twilio)

Inbound: `POST /webhooks/sms/twilio` (form-urlencoded do Twilio; responde
TwiML vazio — a resposta sai pelo dashboard).
Outbound: `POST https://api.twilio.com/2010-04-01/Accounts/<sid>/Messages.json`.

## Criar a inbox

Settings → Inboxes → Nova → SMS: `phone_number` (ex.: `+5511999990000`),
`provider = twilio` (padrão) ou `provider = bandwidth`.

### Bandwidth (provider = bandwidth)

Na criação, preencha (→ `provider_config`; ou `BANDWIDTH_*` no `.env`):

- `bandwidth_account_id`, `bandwidth_api_key`, `bandwidth_api_secret`
- `bandwidth_application_id` (Messaging application do painel)
- `phone_number` (número Bandwidth, ex.: `+5511999990000`)

Envio: `POST https://messaging.bandwidth.com/api/v2/users/{account}/messages/{appId}`
(basic auth api_key:api_secret). Inbound: webhook JSON da aplicação Bandwidth para
`POST https://seu-host/webhooks/sms/bandwidth` (evento `message-received`;
responde `200 {"ok": true}`). `source_id = "sms:bw-<id>"`.

## `.env`

```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+5511888880000   # fallback se a inbox não tiver número
BANDWIDTH_ACCOUNT_ID=<account-id>       # SMS via Bandwidth (ou provider_config)
BANDWIDTH_API_KEY=<api-token>           # SMS via Bandwidth (ou provider_config)
BANDWIDTH_API_SECRET=<api-secret>       # SMS via Bandwidth (ou provider_config)
BANDWIDTH_APPLICATION_ID=<app-id>       # SMS via Bandwidth (ou provider_config)
BANDWIDTH_PHONE_NUMBER=+5511888880000   # From padrão (ou phone_number da inbox)
```

Configure o webhook do número no console Twilio:
`https://seu-host/webhooks/sms/twilio` (HTTP POST).

Bandwidth: rota `POST /webhooks/sms/bandwidth` ativa (JSON Messaging v2).

## Idempotência

`messages.source_id = "sms:<MessageSid>"`. Mídias MMS (`NumMedia`) viram
attachments com `file_type` por MIME.
