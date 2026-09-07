# Canal Voice (stub)

Sem mídia no MVP: a chamada é **registrada como mensagem** na conversa
(`[Chamada <status> de <from>]`), permitindo assign/notas/automações em cima.
Mídia/áudio real entra após o M12.

## Criar a inbox

Settings → Inboxes → Nova → Voice: `identifier` (cria inbox `Channel::Api`
identificada). Provedor de voz (ex.: Twilio Voice) aponta o status callback
para:

```
POST /webhooks/voice?identifier=<identifier>
```

aceitando JSON ou form (`CallSid`, `From`, `To`, `CallStatus`). Sem
`identifier`, resolve pela inbox SMS com o `To` correspondente.

## Idempotência

`messages.source_id = "voice:<CallSid>"`.
