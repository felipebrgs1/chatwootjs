# Canal Email

Inbound: poller IMAP (job `email:poll-inbox`, a cada 5 min) + `POST /webhooks/email`
(forward do SendGrid Inbound Parse / SES → JSON normalizado).
Outbound: SMTP da inbox via `nodemailer`.

## Criar a inbox

Settings → Inboxes → Nova → Email. Campos:

- `email` / `forward_to_email` (obrigatórios)
- IMAP (opcional): `imap_address`, `imap_port` (993), `imap_login`, `imap_password`
- SMTP (envio pelo dashboard): `smtp_address`, `smtp_port` (587), `smtp_login`, `smtp_password`

Sem `imapflow` instalado o poller avisa no log e o recebimento segue via
webhook/encaminhamento:

```bash
bun add imapflow --cwd packages/core
```

## Webhook (provedor → ChatwootJS)

`POST /webhooks/email` com JSON:

```json
{
  "messageId": "<abc@mail>",
  "from": "cliente@exemplo.com",
  "fromName": "Cliente",
  "to": "suporte@suaempresa.com",
  "cc": ["copia@exemplo.com"],
  "subject": "Ajuda",
  "textBody": "preciso de ajuda",
  "inReplyTo": "<anterior@mail>",
  "attachments": [
    { "url": "https://...", "filename": "nota.pdf", "contentType": "application/pdf" }
  ]
}
```

A inbox é resolvida pelo `to` (case-insensitive). Threading: `in_reply_to`
vai para `content_attributes`; o assunto é prefixado no conteúdo (`[Ajuda] …`),
igual ao Rails.

## Idempotência

`messages.source_id = "email:<messageId>"` — redelivery não duplica.
