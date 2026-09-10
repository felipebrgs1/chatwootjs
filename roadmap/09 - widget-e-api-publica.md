# 09 — Widget e API pública

> **Estágio:** 09/15 · **Status:** 0 ✅ · 3 🟡 · 3 ❌ (API do widget e client existem com paths/contratos divergentes; inbox API, CSAT público e realtime ausentes) · **Depende de:** 02 (conversas/mensagens) e 07 (CSAT)
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`)
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

O módulo fecha o **canal Website** de ponta a ponta: a API pública do widget
(`api/v1/widget/*`), a API server-to-server do canal API
(`public/api/v1/inboxes/*`), o CSAT público e o **widget embeddável** 1:1
(bolha, pré-chat, sessão, anexos, eventos, CSAT) + a tela de configuração no
dashboard.

**100% quando (objetivo e testável):**

1. **API do widget 1:1** — as 23 actions OSS dos 10 controllers
   `api/v1/widget/*` respondem no mesmo path/método/status/envelope do Rails
   (`chatwoot/config/routes.rb:492-528`), com `website_token` + header
   `X-Auth-Token` (JWT `{source_id, inbox_id}`) e HMAC quando configurado.
2. **API pública de inbox 1:1** — 13 actions em `/public/api/v1/inboxes/...`
   (identificador = `channel_api.identifier`), HMAC opcional/obrigatório e
   webhook assinado no `webhook_url` para eventos de mensagem.
3. **CSAT público** — `public/api/v1/csat_survey#show/update` (uuid da conversa,
   lock de 14 dias) e a página `/survey/responses/:id`.
4. **Widget client 1:1** — snippet oficial (`chatwootSettings` + `chatwootSDK.run`)
   embute em página de terceiro; fluxo config → sessão → pré-chat → conversa →
   texto/anexo/áudio → resposta por WS → unread/som → reply/typing → CSAT;
   `window.$chatwoot` e eventos `chatwoot:*` completos.
5. **Dashboard e aceite** — config do widget na inbox (cor, títulos, pré-chat,
   HMAC, domínios, reply time) com preview; comandos da §6 verdes com as áreas
   `widget` e `public_inbox` sem lacunas no `parity-report`.

**NÃO conta como 100%:** manter as rotas atuais `/public/api/v1/widgets/*`;
widget que só embute em `localhost` (CORS); polling no lugar de WS; Dyte
(módulo 10); help center dentro do widget (módulo 08); envio real do e-mail de
transcript (módulo 14); i18n do widget; pipeline/CI; qualquer DDL novo.

## 2. Estado atual (medido)

| Subárea                        | Status | Evidência no nosso repo                                                                                             | Lacuna principal                                                                             |
| ------------------------------ | :----: | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| API do widget (contrato Rails) |   🟡   | `apps/server/src/routes/public.ts` (9 handlers em `/public/api/v1/widgets`), `packages/core/src/services/widget.ts` | base path/métodos/auth/envelopes divergem; faltam ~15 actions                                |
| API pública de inbox (HMAC)    |   ❌   | só `apps/server/src/routes/v1/api-channel.ts` (JWT de agente)                                                       | 13 actions `/public/api/v1/inboxes/*`, HMAC e webhook de saída                               |
| CSAT público                   |   ❌   | `apps/server/src/routes/public.ts:142` (`POST /csat` custom)                                                        | `public/api/v1/csat_survey` + `/survey/responses/:id` + `input_csat`                         |
| Widget client (embed)          |   🟡   | `apps/widget/src/*` (IIFE 18 KB, Shadow DOM — ADR-001)                                                              | anexos, áudio, reply, typing, unread dialog, dark, `$chatwoot`/`chatwootSDK` completos, CORS |
| Realtime do widget             |   ❌   | polling 4 s (`apps/widget/src/widget.ts:27`); `apps/server/src/cable.ts` só JWT de agente                           | RoomChannel por `pubsub_token` + eventos `conversation.typing_*` etc.                        |
| Config do widget no dashboard  |   🟡   | `apps/web/src/routes/_auth/app/widget-preview.tsx`; `settings/inboxes/$inboxId.tsx:327-352` (snippet + saudação)    | editar cor/títulos/pré-chat/HMAC/domínios/reply time                                         |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                           | O que dita para nós                                                  |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `app/controllers/api/v1/widget/*.rb` + `app/views/api/v1/widget/**/*.jbuilder` + `config/routes.rb:492-528`           | contrato e envelopes exatos do widget                                |
| `app/controllers/public/api/v1/{inboxes_controller,inboxes/*,csat_survey_controller}.rb` + `config/routes.rb:619-641` | contrato da API pública de inbox + CSAT                              |
| `app/views/public/api/v1/models/{contact,conversation,message,inbox,csat_survey}.json.jbuilder`                       | shape dos payloads públicos                                          |
| `app/controllers/widgets_controller.rb` + `app/views/widgets/show.html.erb`                                           | página/iframe do widget (nosso Shadow DOM substitui — ADR-001)       |
| `app/javascript/entrypoints/sdk.js` + `app/javascript/sdk/*`                                                          | bolha, `chatwootSettings`, cookies, `$chatwoot`, postMessage/eventos |
| `app/javascript/widget/` (`App.vue`, `components/*`, `store/modules/*`, `api/*`)                                      | comportamento do app do widget (home/prechat/thread/unread/csat)     |
| `app/javascript/widget/helpers/actionCable.js` + `app/channels/room_channel.rb`                                       | pubsub por `contact_inboxes.pubsub_token` e lista de eventos         |
| `app/services/widget/token_service.rb` + `app/controllers/concerns/website_token_helper.rb`                           | `X-Auth-Token` (JWT 180 dias) e `set_web_widget`/`set_contact`       |
| `app/models/channel/web_widget.rb`, `channel/api.rb`, `concerns/webhook_secretable.rb` + `lib/webhooks/trigger.rb`    | HMAC (`hmac_token`/`hmac_mandatory`) e assinatura do webhook         |
| `db/schema.rb` → `channel_web_widgets`, `channel_api`, `contact_inboxes`, `messages`, `csat_survey_responses`         | dados (DDL fechado na trilha D — não alterar)                        |

## 4. Lacunas detalhadas

### 4.1 API

**Divergência estrutural atual** (bloqueia o 1:1)

- [ ] **Base path** — nosso mount é `/public/api/v1/widgets` (`index.ts:78`); o
      Rails usa `/api/v1/widget/*` (`routes.rb:492`). Trocar mount,
      `apps/widget/src/api.ts:1` e `scripts/parity-report.mjs:94,297`.
- [ ] **Auth** — Rails usa `X-Auth-Token` (JWT do `Widget::TokenService`, 180
      dias, `{source_id, inbox_id}`); o nosso usa `contact_token` =
      `contact_inboxes.pubsub_token` (`services/widget.ts:73-82`). Implementar o JWT
      (o `pubsub_token` fica só para o WS).
- [ ] **Envelope** — Rails devolve objeto cru (`configs#create` →
      `{website_channel_config, contact, global_config}`) e `messages#index` →
      `{payload, meta}`; o nosso devolve `{data: ...}` em tudo. Ajustar action a action.
- [ ] **Status e erros** — `conversations#create` responde 200 (nosso 201);
      `events`/`labels` 204; `toggle_typing`/`update_last_seen` head 200;
      `toggle_status` 403 sem `end_conversation`; `set_web_widget` → 404
      `{error: 'web widget does not exist'}`/401 `{error: 'Account is suspended'}`;
      HMAC inválido → 401 `{error: 'HMAC failed: Invalid Identifier Hash Provided'}`.

**Actions do widget (faltantes ou divergentes)** — alvo
`apps/server/src/routes/widget.ts` (novo) + `packages/core/src/services/widget.ts`:

- [ ] `POST /api/v1/widget/config` — `ConfigsController#create` — cria
      `contact_inbox` quando não há token; devolve `website_channel_config`
      (`auth_token`, `avatar_url`, `enabled_features`, `enabled_languages`, `locale`,
      `portal`, `pre_chat_form_options`, `reply_time`, `timezone`, `utc_off_set`,
      `working_hours*`, flags) + `contact` + `global_config`. Hoje é um GET reduzido.
- [ ] `GET /api/v1/widget/contact` + `PATCH /api/v1/widget/contact` — `#show` e
      `#update` — flags `{id, has_email, has_name, has_phone_number, identifier}` e
      `ContactIdentifyAction`; HMAC quando `identifier` presente (prechat anônimo
      segue sem HMAC).
- [ ] `PATCH .../contact/set_user` + `POST .../contact/destroy_custom_attributes`
      — `#set_user` troca de contato quando `identifier` difere, devolve
      `widget_auth_token` novo e exige HMAC com `hmac_mandatory`; `destroy_custom_attributes`
      remove chaves do contato.
- [ ] `GET /api/v1/widget/conversations` — `#index` — **a última conversa** do
      contato na inbox (`{id=display_id, inbox_id, contact_last_seen_at, status}`),
      não uma lista.
- [ ] `POST /api/v1/widget/conversations` — `#create` — em transação:
      `process_update_contact` + conversa com `additional_attributes` (browser,
      referer, `initiated_at`) + primeira mensagem + `labels[]` + `custom_attributes`.
- [ ] `POST .../conversations/update_last_seen` — head 200 +
      `Conversations::UpdateMessageStatusJob`; hoje é `PUT /conversations/:id/read`.
- [ ] `POST .../conversations/transcript` — 200/429/402 (e-mail fica no módulo 14).
- [ ] `POST .../conversations/toggle_typing` + `GET .../conversations/toggle_status`
      — `{typing_status: on|off}` → dispatch `conversation.typing_on/off`, head 200;
      resolve se `end_conversation?`, senão 403.
- [ ] `POST .../conversations/set_custom_attributes` e
      `.../destroy_custom_attributes` — set/remove no nível da conversa.
- [ ] `GET /api/v1/widget/messages` — flat, `before`/`after`, sem notas privadas,
      `{payload: [...], meta: {contact_last_seen_at}}`; hoje nested em
      `GET /conversations/:id/messages`.
- [ ] `POST /api/v1/widget/messages` — flat; JSON **ou multipart**
      (`message[attachments][]`); cria conversa se não houver; aplica `labels[]`;
      campos `echo_id`, `reply_to`, `referer_url`, `timestamp`; resposta é a mensagem
      crua.
- [ ] `PATCH /api/v1/widget/messages/:id` — `input_email` (`submitted_email` +
      identify) e `submitted_values` (CSAT); ausente.
- [ ] `POST /api/v1/widget/events` + labels (`POST /labels`,
      `DELETE /labels/:id`) — 204; `{name, event_info}` dispara
      `campaign.triggered`/`webwidget.triggered`; labels set/remove etiqueta existente.
- [ ] `GET /api/v1/widget/inbox_members` +
      `GET /api/v1/widget/campaigns` — `{payload: [{id, name, avatar_url,
availability_status}]}` e array com `id`=display_id, `trigger_rules`,
      `trigger_only_during_business_hours`, `message`, `sender` (hoje só embutido no
      config como `ongoing_campaigns`).
- [ ] `POST /api/v1/widget/direct_uploads` — ActiveStorage direct upload (S3),
      `DIRECT_UPLOADS_ENABLED` + `MAXIMUM_FILE_UPLOAD_SIZE`; nosso storage não tem
      presign (`packages/core/src/lib/storage.ts`). (verificar shape do Rails)
- [ ] `POST /api/v1/widget/integrations/dyte/add_participant_to_meeting` — **fora**
      (módulo 10, integrações).

**API pública de inbox (server-to-server)** — alvo
`apps/server/src/routes/public-inbox.ts` (novo) +
`packages/core/src/services/public-inbox.ts` (novo):

- [ ] `GET /public/api/v1/inboxes/:inbox_id` — `InboxesController#show` —
      `:inbox_id` = `channel_api.identifier`; `{identifier,
identity_validation_enabled, name, timezone, working_hours,
working_hours_enabled, csat_survey_enabled, greeting_enabled}`.
- [ ] `POST .../contacts` — cria `contact_inbox` (`source_id` ou uuid v4) e
      devolve `{source_id, pubsub_token, id, name, email, phone_number}`.
- [ ] `GET/PATCH .../contacts/:id` — `ContactIdentifyAction`; `process_hmac` (401
      quando obrigatório e inválido; marca `hmac_verified`).
- [ ] `GET/POST .../contacts/:contact_id/conversations` e
      `GET .../conversations/:id` — index respeita `hmac_verified`; create usa o
      builder do Rails; show por `display_id`.
- [ ] `POST .../conversations/:id/toggle_status`, `.../toggle_typing` e
      `.../update_last_seen` — resolve/typing/head (mesmos eventos do widget).
- [ ] `GET/POST .../conversations/:conversation_id/messages` e
      `PATCH .../messages/:id` — mensagens cruas; anexos multipart; CSAT lock 14 dias.
- [ ] **Webhook de saída** — `channel_api.webhook_url` + `secret` →
      `POST {event,...}` com `X-Chatwoot-Delivery`, `X-Chatwoot-Timestamp`,
      `X-Chatwoot-Signature: sha256=HMAC(secret, "ts.body")`; falha em
      `message_created` marca a mensagem `failed` (`chatwoot/lib/webhooks/trigger.rb:54-74`).
      Hoje `fireWebhooks` só cobre webhooks de conta (`services/webhooks.ts:150`).
- [ ] Nosso `POST .../api_channel/conversations` (`routes/v1/api-channel.ts:12`)
      usa JWT de agente — não substitui a API pública.

**CSAT público**

- [ ] `GET/PATCH /public/api/v1/csat_survey/:id` — `:id` = `conversation.uuid`;
      shape `{id, csat_survey_response, display_type, content, inbox_avatar_url,
inbox_name, locale, conversation_id, created_at}`; update em
      `submitted_values.csat_survey_response`; 422 após 14 dias.
- [ ] `GET /survey/responses/:id` — página HTML do survey
      (`Survey::ResponsesController#show`, entrypoint `survey.js`).
- [ ] Nosso `POST /public/api/v1/widgets/csat` é custom; realinhar para
      `input_csat`/`PATCH messages/:id` (relatórios continuam no módulo 07).

### 4.2 Front

**Widget client** (`apps/widget/src/*`, IIFE 18 KB — ADR-001 vanilla + Shadow DOM)

- [ ] `window.chatwootSettings` parcial (`widget.ts:6-14`): falta `type`,
      `widgetStyle`, `showPopoutButton`, `showUnreadMessagesDialog`,
      `useBrowserLanguage`, `baseDomain`, `welcomeTitle/welcomeDescription`,
      `available/unavailableMessage`, `enableFileUpload`, `enableEmojiPicker`,
      `enableEndConversation` — espelhar `sdk/settingsHelper.js`/`sdk.js:50-81` com
      default e validação.
- [ ] Expor `window.chatwootSDK.run({websiteToken, baseUrl})` para o snippet
      oficial (`chatwoot/app/views/widget_tests/index.html.erb:29-41`); hoje só
      `chatwootSettings` (`main.ts:17-27`).
- [ ] Completar `window.$chatwoot` (`main.ts:6-13` tem só `setUser/reset/toggle`):
      `toggleBubbleVisibility`, `popoutChatWindow`, `setCustomAttributes`,
      `deleteCustomAttribute`, `setConversationCustomAttributes`,
      `deleteConversationCustomAttribute`, `setLabel`, `removeLabel`, `setLocale`,
      `setColorScheme`; e disparar `chatwoot:ready/error/on-message/postback/opened/
closed/on-start-conversation` (`sdk.js:58-217`).
- [ ] Sessão: hoje localStorage `cw_widget_<token>` (`widget.ts:69-93`); original
      usa cookies `cw_conversation` + `cw_user_<token>` (domínio base) e JWT na URL;
      `reset()` deve limpar e recriar a sessão. (verificar equivalência no Shadow DOM)
- [ ] Bolha/painel: existem (launcher, badge, campanha, home/thread) — falta
      `type: expanded_bubble`, `widgetStyle: flat`, botão popout e dialog de não
      lidas (`UnreadMessageList.vue`).
- [ ] Pré-chat: hoje nome+e-mail fixos (`widget.ts:390`); original usa
      `pre_chat_form_options.pre_chat_fields` (campos/obrigatoriedade), mensagem e
      `PhoneInput`.
- [ ] Anexos e áudio: portar preview imagem/vídeo/arquivo (`ImageBubble`,
      `VideoBubble`, `FileBubble`), teto de tamanho e gravação/envio; nosso
      `sound.ts` toca beep sintético, o original toca `public/audio/widget/ding.mp3`
      após interação (`AudioNotificationHelper`). (verificar gravador no widget)
- [ ] Thread: reply (`reply_to` + `ReplyToChip`), typing (`toggle_typing` +
      `AgentTypingBubble`), dialog de não lidas (`UnreadMessageList.vue`) e dark mode
      (`dark`/`setColorScheme`, `App.vue:377-390`).
- [ ] Realtime: trocar polling 4 s (`widget.ts:27,364-366`) por WS com sync por
      `before/after` e backoff (ver 4.3).
- [ ] CSAT: estrelas fixas e endpoint custom; portar `input_csat`,
      `display_type` (emoji/star) e feedback.
- [ ] CORS: rotas públicas do widget precisam refletir a origem (hoje só
      `CORS_ORIGIN`, `index.ts:38-47`), senão o embed só funciona em `localhost`.
- [ ] i18n do widget: **fora** (decisão do R0); manter as strings atuais.

**Dashboard**

- [ ] `widget-preview.tsx` já carrega o `widget.js` real; falta link direto da
      inbox e estados de erro.
- [ ] Aba `configuration` (`$inboxId.tsx:327-352`) só tem snippet + saudação;
      faltam `widget_color`, `welcome_title/tagline`, `pre_chat_form_enabled/options`,
      `hmac_mandatory` (exibir `hmac_token`), `allowed_domains`, `reply_time`,
      `continuity_via_email` e flags.
- [ ] `updateInbox` já aceita os campos básicos (`services/inboxes.ts:507-518`),
      mas `allowed_domains`/`pre_chat_form_options`/`reply_time` não estão no
      `UpdateInboxSchema` (`schemas/inboxes.ts:129-171`) — expor com os mesmos nomes.

### 4.3 Dados, jobs e realtime (quando aplicável)

- [ ] Tabelas prontas (sem DDL): `channel_web_widgets` e `channel_api` com HMAC,
      domínios, pré-chat, reply time e flags (`schema/channels.ts:18-40,256-285`);
      `contact_inboxes.hmac_verified/pubsub_token`; `messages.content_type/
content_attributes` (`input_csat`/`input_email`/`submitted_values`; `echo_id` é
      virtual) e `csat_survey_responses`.
- [ ] Jobs: `UpdateMessageStatusJob` (update_last_seen → status de entrega);
      transcript (módulo 14); webhook do canal API com assinatura e fallback de falha
      → mensagem `failed`; campanhas one-off já têm job.
- [ ] Realtime: `/cable` aceita hoje só JWT de agente (`apps/server/src/cable.ts`);
      o widget conecta com `pubsub_token` do `contact_inboxes`
      (`room_channel.rb:current_user`) e recebe `message.created/updated`,
      `conversation.typing_on/off`, `conversation.status_changed/created`,
      `presence.update` e `contact.merged` — hoje usamos `typing.on/off` e não há
      auth de contato.

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                      | Arquivos-alvo                                                                                            | Depende     |
| ----- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------- |
| 09-1  | Zod do widget/inbox API (params, ids, anexos, `submitted_values`)                                           | `packages/core/src/schemas/widget.ts` (novo)                                                             | —           |
| 09-2  | `Widget::TokenService` (JWT 180d) + middleware `X-Auth-Token`/`website_token`                               | `packages/core/src/lib/tokens.ts`, `apps/server/src/middlewares/widget-auth.ts` (novo)                   | 09-1        |
| 09-3  | HMAC helper (widget e `channel_api`) + `hmac_verified`                                                      | `packages/core/src/lib/hmac.ts` (novo)                                                                   | —           |
| 09-4  | Rotas canônicas `/api/v1/widget/*` (configs+contacts) + CORS público + parity-report                        | `apps/server/src/routes/widget.ts` (novo), `index.ts`, `services/widget.ts`, `scripts/parity-report.mjs` | 09-2, 09-3  |
| 09-5  | Conversations do widget (index/create/update_last_seen/transcript/toggle_typing/toggle_status/custom attrs) | `routes/widget.ts`, `services/widget.ts`                                                                 | 09-4        |
| 09-6  | Messages flat (index/create/update; multipart/anexos; echo/reply/labels)                                    | `routes/widget.ts`, `services/widget.ts`, `services/messages.ts`                                         | 09-4        |
| 09-7  | Events, labels, inbox_members e campaigns no contrato Rails                                                 | `routes/widget.ts`, `services/widget.ts`, `services/campaigns.ts`                                        | 09-4        |
| 09-8  | Direct uploads (presign S3/local) + teto de arquivo                                                         | `lib/storage.ts`, `routes/widget.ts`                                                                     | 09-4        |
| 09-9  | API pública de inbox (13 actions + HMAC)                                                                    | `routes/public-inbox.ts` (novo), `services/public-inbox.ts` (novo), `schemas/widget.ts`                  | 09-3        |
| 09-10 | Webhook de saída do canal API (assinatura + falha → `failed`)                                               | `services/webhooks.ts`, `services/messages.ts`, listeners                                                | 09-9        |
| 09-11 | CSAT público (`csat_survey` + página `/survey/responses/:id` + `input_csat`)                                | `routes/public.ts`, `services/csat.ts` (novo), `apps/web` ou página estática                             | 07          |
| 09-12 | Widget: api/session/settings + `chatwootSDK.run` + `$chatwoot`/eventos                                      | `apps/widget/src/api.ts`, `widget.ts`, `main.ts`                                                         | 09-4        |
| 09-13 | Widget: WS (pubsub token), typing/presença, reconexão + sync                                                | `apps/server/src/cable.ts`, `apps/widget/src/widget.ts`                                                  | 09-12       |
| 09-14 | Widget: anexos, áudio, reply, unread dialog, dark, pré-chat configurável                                    | `apps/widget/src/widget.ts`, `styles.ts`, `sound.ts`                                                     | 09-12       |
| 09-15 | Dashboard: config do widget na inbox + preview                                                              | `$inboxId.tsx`, `schemas/inboxes.ts`, `services/inboxes.ts`, `widget-preview.tsx`                        | 09-4        |
| 09-16 | Seed/demo/smoke: inbox Website com HMAC, `/widget-demo` com setUser e evidência e2e                         | `packages/db/src/seed*`, `apps/server/src/index.ts`, `scripts/e2e.mjs`                                   | 09-5..09-15 |

## 6. Aceite

```bash
# qualidade + métrica
bun run check-types && bun run check
bun scripts/parity-report.mjs            # áreas widget e public_inbox
bun scripts/parity-report.mjs --write-doc

# funcional (API :3000 e web :3001 no ar)
bun scripts/e2e.mjs                       # fluxo do widget entra aqui
bun scripts/db-roundtrip-check.mjs        # guarda DDL: nenhuma migration nova

# 1) config canônico do widget (POST /api/v1/widget/config, sem envelope data)
TOKEN=...; curl -s -X POST http://localhost:3000/api/v1/widget/config \
  -H 'Content-Type: application/json' \
  -d "{\"website_token\":\"$TOKEN\"}" | jq '.website_channel_config.website_token, .contact.pubsub_token'

# 2) HMAC da API pública: hash inválido → 401
curl -si -X PATCH "http://localhost:3000/public/api/v1/inboxes/$IDENT/contacts/$SOURCE_ID" \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"user-1","identifier_hash":"deadbeef"}' | head -1

# 3) webhook assinado do canal API (eco em /tmp/opencode/echo-webhook.mjs, porta 4600)
node /tmp/opencode/echo-webhook.mjs &     # imprime headers e body recebidos
curl -s -X POST "http://localhost:3000/public/api/v1/inboxes/$IDENT/contacts/$SOURCE_ID/conversations/$CONV/messages" \
  -H 'Content-Type: application/json' -d '{"content":"ping webhook"}'

# 4) embed com o snippet oficial
curl -s "http://localhost:3000/widget-demo?website_token=$TOKEN" | grep -c chatwootSDK.run
```

- [ ] `parity-report --json`: áreas `widget` e `public_inbox` sem lacunas (Dyte no
      módulo 10) e `--write-doc` regenerado.
- [ ] Smoke action a action com path/método/status/envelope iguais às specs
      `chatwoot/spec/controllers/api/v1/widget/*` e
      `chatwoot/spec/requests/public/api/v1/**`.
- [ ] HMAC: inválido → 401 `{error:"HMAC failed..."}`; válido marca
      `contact_inboxes.hmac_verified` e libera as conversas do contato.
- [ ] Webhook: o eco recebe `X-Chatwoot-Signature: sha256=...` conferindo com o
      `secret`; resposta não-2xx em `message_created` marca a mensagem `failed`.
- [ ] Embed em host de terceiro: snippet oficial cria contato/conversa; refresh
      mantém sessão; resposta chega por WS com unread/som; anexo/áudio enviam;
      CSAT pós-resolver e dark mode funcionam.
- [ ] Dashboard: cor/título/pré-chat/HMAC/domínios salvam e refletem no widget; preview real; evidência em `shots/`.
- [ ] Nenhuma migration/DDL nova (`db-roundtrip-check` verde).

## 7. Fora de escopo

- **Enterprise:** `disable_branding`, campaign analytics, copilot/captain, SLA,
  calls/voice — nada disso entra no widget.
- **Dyte** (`integrations/dyte#add_participant_to_meeting`) — módulo 10
  (integrações).
- **Help center no widget** (`widget/api/article.js`, `getMostReadArticles`) —
  módulo 08.
- **Envio real do e-mail de transcript** — módulo 14 (aqui só o contrato 200/429/402).
- **Relatórios CSAT** (módulo 07) — aqui só a submissão pública/survey.
- **i18n do widget** e **pipeline/CI** — decisão do R0.
- **DDL/schema** — qualquer necessidade exige trilha D5; desnecessária aqui.
- **Widget React/iframe** — decisão ADR-001 (vanilla + Shadow DOM continuam).

## 8. Definição de done

1. Tarefas `09-1..09-16` marcadas `[x]`, commitadas, com `check-types`/`oxlint`/
   `oxfmt` verdes (`bun run check`).
2. `bun scripts/parity-report.mjs --json` com `widget` e `public_inbox` ✅ e
   `--write-doc` regenerado; nenhuma outra área regrediu.
3. `bun scripts/e2e.mjs` verde 2× incluindo o fluxo do widget; HMAC, webhook
   assinado e embed provados no aceite; `db-roundtrip-check` intacto.
4. Este doc com os checkboxes da §6 marcados e a linha 09 do `roadmap.md`
   atualizada; divergências remanescentes documentadas no §4 — sem tocar no schema.
