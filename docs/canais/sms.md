# Canal SMS (Twilio)

Inbound: `POST /webhooks/sms/twilio` (form-urlencoded do Twilio; responde
TwiML vazio — a resposta sai pelo dashboard).
Outbound: `POST https://api.twilio.com/2010-04-01/Accounts/<sid>/Messages.json`.

## Criar a inbox

Settings → Inboxes → Nova → SMS: `phone_number` (ex.: `+5511999990000`),
`provider = twilio`.

## `.env`

```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+5511888880000   # fallback se a inbox não tiver número
```

Configure o webhook do número no console Twilio:
`https://seu-host/webhooks/sms/twilio` (HTTP POST).

Bandwidth: rota `POST /webhooks/sms/bandwidth` reservada; provider retorna
erro claro até a implementação (`provider "bandwidth" não suportado`).

## Idempotência

`messages.source_id = "sms:<MessageSid>"`. Mídias MMS (`NumMedia`) viram
attachments com `file_type` por MIME.
