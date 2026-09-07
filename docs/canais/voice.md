# Canal Voice (Twilio + stub)

Sem provedor configurado, a chamada é **registrada como mensagem** na conversa
(`[Chamada <status> de <from>]`), permitindo assign/notas/automações em cima.

## Voz via Twilio

Na aba Configuração da inbox (canal API identificado), preencha:

- `voice_provider = twilio`
- `voice_twiml_url` (ex.: `https://seu-host/webhooks/voice/twiml`)
- `voice_status_callback` (ex.: `https://seu-host/webhooks/voice?identifier=<id>`)
- `voice_twilio_account_sid` / `voice_twilio_auth_token` / `voice_twilio_from`
  (opcionais se `TWILIO_*` estiverem no `.env`)

Com isso, respostas do agente na conversa **originam uma chamada**
(`POST .../Accounts/{sid}/Calls.json` com `Url` = TwiML). Chamadas recebidas
seguem registradas como mensagem via status callback. `source_id = "voice:<CallSid>"`.

`GET /webhooks/voice/twiml` retorna TwiML (`<Say>` + `<Record>`; `?say=` e
`?record=false` opcionais) — aponte como VoiceUrl do número no console Twilio.

## Criar a inbox

Settings → Inboxes → Nova → Voice: `identifier` (cria inbox `Channel::Api`
identificada). Provedor de voz (ex.: Twilio Voice) aponta o status callback
para:

```
POST /webhooks/voice?identifier=<identifier>
```

aceitando JSON ou form (`CallSid`, `From`, `To`, `CallStatus`). TwiML padrão: `GET /webhooks/voice/twiml`. Sem
`identifier`, resolve pela inbox SMS com o `To` correspondente.

## Idempotência

`messages.source_id = "voice:<CallSid>"`.
