# Canal WhatsApp (Cloud API)

Inbound: `POST /webhooks/whatsapp` (+ `GET` verify `hub.*`).
Outbound: `POST https://graph.facebook.com/v21.0/<phone_number_id>/messages`.
Templates: fora da janela de 24h o envio precisa de template aprovado
(`isTemplate` + `templateName` no outbound).

## Criar a inbox

Settings → Inboxes → Nova → WhatsApp. Dois providers (`provider`):

### A) Meta Cloud API (`provider = default`)

- `phone_number` (ex.: `5511999990000`)
- `phone_number_id` (Meta → `provider_config.phone_number_id`)
- `business_management_token` (token permanente do app Meta)

### B) Evolution API (`provider = evolution`)

Gateway WhatsApp self-hosted (Baileys) — sem app Meta, sem janela de 24h nem
templates. Na criação, com `provider = evolution`, preencha:

- `phone_number` (conectado na instância)
- `evolution_base_url` (ex.: `https://evo.suaempresa.com`; → `provider_config`)
- `evolution_instance` (nome da instância; → `provider_config`)
- `evolution_apikey` (global ou da instância; → `provider_config`)

Na instância Evolution, configure o webhook (Settings → Webhook ou via API):

```
URL: https://seu-chatwootjs/webhooks/evolution
Eventos: MESSAGES_UPSERT
```

Envio usa `POST {base}/message/sendText/{instance}` (texto) ou
`POST {base}/message/sendMedia/{instance}` (com anexo: image/video/audio/document
por `file_type`). Resposta: `source_id = "evolution:<id>"`.

### C) Twilio (provider = twilio)

Envio pela Messages API do Twilio (From/To com prefixo `whatsapp:`).
Na criação, com `provider = twilio`, preencha:

- `phone_number` (o número Twilio, ex.: `+5511888880000`)
- `twilio_account_sid` / `twilio_auth_token` (→ `provider_config`; opcional se
  `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` estiverem no `.env`)

Inbound: configure o webhook do número no console Twilio para
`POST https://seu-host/webhooks/whatsapp/twilio`
(form-urlencoded; responde TwiML vazio). `source_id = "twilio-wa:<MessageSid>"`.

### D) 360Dialog (provider = 360dialog)

Envio via `POST https://waba-v2.360dialog.io/messages` (corpo estilo Cloud API,
templates suportados). Na criação, com `provider = 360dialog`, preencha:

- `phone_number` (conectado no painel 360Dialog)
- `d360_api_key` (→ `provider_config.api_key`; opcional se `D360_API_KEY` no `.env`)

Inbound: configure o webhook no painel 360Dialog para
`POST https://seu-host/webhooks/360dialog`
(mesmo formato Cloud API). Requer `phone_number_id` em `provider_config` ou
`phone_number` igual ao display number.

Anti-loop: mensagens `fromMe` (eco do nosso envio) viram evento de status e
não criam mensagem. Grupos (`@g.us`) são ignorados no MVP.

## `.env`

```bash
WHATSAPP_VERIFY_TOKEN=um-segredo-qualquer   # usado no GET verify
WHATSAPP_API_KEY=<token-meta>               # fallback se a inbox não tiver token
WHATSAPP_PHONE_NUMBER_ID=<id>               # fallback se a inbox não tiver id
TWILIO_ACCOUNT_SID=AC...                    # WhatsApp via Twilio (ou provider_config)
TWILIO_AUTH_TOKEN=...                       # WhatsApp via Twilio (ou provider_config)
TWILIO_WHATSAPP_NUMBER=whatsapp:+55...      # From padrão (ou phone_number da inbox)
D360_API_KEY=<api-key>                      # WhatsApp via 360Dialog (ou provider_config)
```

Configure no app Meta a URL de callback `https://seu-host/webhooks/whatsapp`
com o mesmo verify token.

## Mídia

Imagem/áudio/vídeo/documento chegam como `whatsapp-media:<media_id>` (exige
download com o token Meta, como no Rails). Texto + caption preservados.

## Idempotência

`messages.source_id = "whatsapp:<wamid>"`. Eventos `statuses` (entregue/lido)
são reconhecidos e ignorados (não criam mensagem).
