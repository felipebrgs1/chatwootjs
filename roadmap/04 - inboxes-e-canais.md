# 04 — Inboxes e Canais

> **Estágio:** 04/15 · **Status:** 2 de 26 subáreas verdes · 18 parciais · 6 ausentes · **Depende de:** 02 (histórico R1) · canal a canal (toca 05/07/09/15)
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`)
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise (calls/voice, conference, captain avançado), i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

O módulo entrega **a configuração de inboxes e os canais OSS**: CRUD da inbox, membros,
`assignable_agents`, campanhas por inbox, avatar, `reset_secret`, agent bot, horário comercial,
CSAT (config + templates), greeting/out-of-office, config de auto-assignment e, canal a canal:
persistência, inbound (webhook/poller), outbound (provider), webhook público e UI de configuração.

Critério objetivo de 100%:

1. Toda action dos controllers `inboxes`, `inbox_members`, `inbox_csat_templates`,
   `channels/twilio_channels`, `whatsapp/manual_setup`, `callbacks`, `*/authorizations` e
   `oauth_authorization` responde no mesmo path/método/status do pino, com os campos do jbuilder
   (envelope mapeado pelo repo).
2. Cada canal cria/edita pela UI e prova: webhook simulado cria `contact_inbox` + conversa +
   mensagem; outbound com provider mockado (HTTP registrado); payload duplicado não duplica
   (`source_id`).
3. `settings/inboxes` (lista, wizard, detalhe) navegável lado a lado com os screenshots do
   Chatwoot, com estados vazio/loading/erro.

**Não conta como 100%:** validar credencial real de Meta/Twilio/X; mudar DDL (trilha D fechada);
Enterprise (voice/calling real, conference); widget e API pública (09); executor de
auto-atribuição (05); respostas CSAT e relatórios (07); Captain `analyze` (15).

## 2. Estado atual (medido)

| Subárea                                  | Status | Evidência no nosso repo                                                                | Lacuna principal                                                                                                            |
| ---------------------------------------- | :----: | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| CRUD de inbox                            |   🟡   | `apps/server/src/routes/v1/inboxes.ts`, `packages/core/src/services/inboxes.ts`        | serializer não bate com `_inbox.json.jbuilder`; `destroy` só apaga canal de WebWidget/Api/Email; resposta sem `{ message }` |
| Membros (`inbox_members`)                |   🟡   | `inboxes.ts` (GET/POST/PUT/DELETE aninhados)                                           | Rails é account-level (`/inbox_members/...`); campos do partial `_agent` incompletos                                        |
| `assignable_agents` (member)             |   🟡   | `listAssignableAgents`                                                                 | Rails = membros + administradores; hoje devolve só membros; account-level é 05                                              |
| Campanhas por inbox                      |   ❌   | —                                                                                      | `GET /inboxes/:id/campaigns` ausente (account-level existe em `routes/v1/campaigns.ts`)                                     |
| Avatar da inbox                          |   ❌   | —                                                                                      | `DELETE /inboxes/:id/avatar` e upload no PATCH ausentes; `avatar_url` não serializado                                       |
| `reset_secret`                           |   ❌   | —                                                                                      | `POST /inboxes/:id/reset_secret` (só `Channel::Api`, 404 senão) ausente                                                     |
| Working hours / business hours           |   🟡   | `GET/PUT /inboxes/:id/working_hours`, `WorkingHoursForm`                               | Rails recebe `working_hours[]` no PATCH e serializa `weekly_schedule`; rota extra é divergência                             |
| CSAT (config + templates)                |   ❌   | —                                                                                      | `csat_config` não serializado/atualizado; `csat_template` show/create/analyze ausentes                                      |
| Greeting / out-of-office / pós-resolvido |   🟡   | campos em `inboxes.ts` e `widget.ts`                                                   | nenhum envio automático no inbound (`isOutsideWorkingHours` não é usado)                                                    |
| Agent bot por inbox                      |   🟡   | `routes/v1/ops.ts`, `services/agent-bots.ts`                                           | Rails é `POST .../set_agent_bot` com `{ agent_bot }`; hoje é `PUT .../agent_bot`                                            |
| Canal Website/Widget                     |   ✅   | create/update + `toApiInbox`; widget em `services/widget.ts`                           | faltam `selected_feature_flags`, `reply_time`, `allowed_domains`, `web_widget_script`                                       |
| Canal API                                |   🟡   | `routes/v1/api-channel.ts`, `createApiChannelConversation`                             | outbound para `webhook_url` não existe; `agent_reply_time_window` sem validação; API pública é 09                           |
| Canal Email                              |   🟡   | `channels/email-poller.ts`, `channels/smtp.ts`, `POST /webhooks/email`                 | UID/backoff, HTML→texto, anexos IMAP, CC/BCC e quote-strip de resposta ausentes                                             |
| Canal Telegram                           |   ✅   | `POST /webhooks/telegram/:bot_token` + provider `sendMessage`                          | envio de mídia (getFile) e `bot_name` na edição apenas                                                                      |
| WhatsApp Cloud (+360dialog)              |   🟡   | `POST /webhooks/whatsapp`, provider cloud/360dialog                                    | provider `whatsapp_cloud`/`default`, manual setup, templates sync, health, register webhook e business token ausentes       |
| WhatsApp Evolution (extensão nossa)      |   🟡   | `POST /webhooks/evolution`, provider evolution                                         | não existe no upstream; provider_config próprio — manter documentado e testado                                              |
| Facebook / Instagram                     |   🟡   | create por `inboxes`, webhooks `/webhooks/facebook` e `/webhooks/instagram`, providers | OAuth (`register_facebook_page`, `facebook_pages`, `reauthorize_page`), avatar e `reauthorization_required` ausentes        |
| Twitter/X                                |   🟡   | `GET/POST /webhooks/twitter` (CRC + DM), provider stub                                 | `twitter/authorization` + `twitter/callback` ausentes; outbound OAuth 1.0a só stub `failed`                                 |
| SMS (Twilio/Bandwidth)                   |   🟡   | `Channel::Sms` com providers twilio/bandwidth, webhooks                                | Rails usa `Channel::TwilioSms` + `POST /channels/twilio_channel`, callbacks `/twilio/*` e `content_templates`               |
| Canal Line                               |   🟡   | `POST /webhooks/line` + provider push                                                  | path Rails é `/webhooks/line/:line_channel_id`; envio de mídia ausente                                                      |
| Canal TikTok                             |   ❌   | `channel_tiktok` no schema (sem uso)                                                   | criação, inbound `/webhooks/tiktok`, outbound e reauthorize ausentes                                                        |
| Voice (Twilio stub)                      |   🟡   | `docs/canais/voice.md`, provider `voice`, `/webhooks/voice`                            | upstream é Enterprise; nosso stub é extensão — sem alvo de paridade, só regressão                                           |
| OAuth authorizations + callbacks         |   ❌   | —                                                                                      | 16 actions (facebook/instagram/twitter/tiktok/google/microsoft/whatsapp) ausentes                                           |
| Paths dos webhooks externos              |   🟡   | `routes/webhooks.ts`                                                                   | divergem dos do Rails (`whatsapp/:phone_number`, `sms/:phone_number`, `line/:line_channel_id`)                              |
| Front `settings/inboxes`                 |   🟡   | `index.tsx`, `new.tsx`, `$inboxId.tsx`                                                 | wizard sem ChannelFactory por canal; faltam pre-chat form, business hours visual, CSAT, health/reauthorize                  |
| Docs por canal                           |   🟡   | `docs/canais/*.md` (9 arquivos)                                                        | faltam WhatsApp manual/health, TikTok, Twilio callbacks e payloads de webhook completos                                     |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                 | O que dita para nós                                                                                |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `app/controllers/api/v1/accounts/inboxes_controller.rb` + `app/views/api/v1/accounts/inboxes/*`             | CRUD, campaigns, avatar, reset_secret, set_agent_bot, update de working hours/csat_config          |
| `app/controllers/api/v1/accounts/inbox_members_controller.rb` + views                                       | contrato account-level dos membros (`payload` com partial `_agent`)                                |
| `app/controllers/api/v1/accounts/inbox_csat_templates_controller.rb`                                        | templates CSAT (show/create) + analyze (Captain)                                                   |
| `app/controllers/api/v1/accounts/concerns/whatsapp_health_management.rb` + `app/services/whatsapp/*`        | sync/message_templates/health/register_webhook/business token e manual setup                       |
| `app/controllers/api/v1/accounts/channels/twilio_channels_controller.rb`                                    | criação de `Channel::TwilioSms` (`POST /channels/twilio_channel`)                                  |
| `app/controllers/api/v1/accounts/callbacks_controller.rb`                                                   | Facebook pages (register/facebook_pages/reauthorize)                                               |
| `app/controllers/{google,microsoft,instagram,tiktok,twitter}/**` + `oauth_authorization_controller.rb`      | authorizations e callbacks OAuth                                                                   |
| `app/models/channel/*.rb` (`EDITABLE_ATTRS`, `PROVIDERS`, `reauthorized!`)                                  | atributos editáveis e validações por canal; providers do WhatsApp                                  |
| `app/models/inbox.rb` + `app/models/concerns/out_of_offisable.rb`                                           | `assignable_agents` (membros+admins), `weekly_schedule`, `callback_webhook_url`, `OFFISABLE_ATTRS` |
| `app/views/api/v1/models/_inbox.json.jbuilder`                                                              | campos do serializer (flat + por canal, com segredos só para admin)                                |
| `app/controllers/webhooks/**` + `config/routes.rb` (linhas 664–713)                                         | paths e verificação dos webhooks públicos                                                          |
| `app/javascript/dashboard/routes/dashboard/settings/inbox/**` + `api/inboxes.js`, `api/assignableAgents.js` | rotas, wizard, abas e chamadas exatas da UI                                                        |
| `db/schema.rb` (tabelas `inboxes`, `channel_*`, `working_hours`, `active_storage_*`)                        | dados — DDL já fechado na trilha D; não alterar                                                    |

## 4. Lacunas detalhadas

### 4.1 API

Configuração da inbox:

- [ ] **(04-1)** `GET /inboxes` e `GET /inboxes/:id` — Rails `InboxesController#index/show` — serializar como `_inbox.json.jbuilder`: adicionar `avatar_url`, `csat_config`, `auto_assignment_config`, `callback_webhook_url`, `help_center`, `sender_name_type`, `business_name`, `selected_feature_flags`, `reply_time`, `allowed_domains`, `web_widget_script`, `hmac_token`/`secret`/`webhook_url`/`inbox_identifier`/`provider_config`/`message_templates` (segredos só para admin), `reauthorization_required`, `line_channel_id`, `tweets_enabled`; hoje só há `channel` aninhado.
- [ ] **(04-2)** `PATCH /inboxes/:id` — aceitar `working_hours[]` (Rails `update_working_hours`), `csat_config` formatado, `portal_id`, `sender_name_type`, `business_name`, `avatar` e `selected_feature_flags`; validar e-mail (`validate_email_channel`) e chamar `reauthorized!` no update de canal.
- [ ] **(04-3)** `GET /inboxes/:id/campaigns` — Rails member — usar `listCampaigns` filtrando por inbox; envelope fiel ao `campaigns.json.jbuilder`.
- [ ] **(04-4)** `DELETE /inboxes/:id/avatar` — head 200; upload no PATCH via `active_storage_*` + `lib/storage.ts`; `avatar_url` no serializer.
- [ ] **(04-5)** `POST /inboxes/:id/reset_secret` — somente `Channel::Api` (404 nos demais), regenerar `secret` e devolver a inbox (jbuilder `reset_secret`).
- [ ] **(04-6)** `DELETE /inboxes/:id` — apagar o canal de **qualquer** tipo (hoje só WebWidget/Api/Email) e responder `{ message }` como o Rails; remover em transação/job.
- [ ] **(04-7)** Membros — portar os paths Rails: `GET /api/v1/accounts/:account_id/inbox_members/:inbox_id`, `POST /inbox_members`, `PATCH /inbox_members/update`, `DELETE /inbox_members/destroy` (body `user_ids`); agente com os campos do partial `_agent` (`account_id`, `auto_offline`, `confirmed`, `provider`, `available_name`, `thumbnail`). Manter as rotas aninhadas atuais como alias.
- [ ] **(04-8)** `GET /inboxes/:id/assignable_agents` — Rails `@inbox.assignable_agents` = membros + administradores (uniq); account-level `GET /assignable_agents?inbox_ids[]` fica em 05.
- [ ] **(04-9)** `POST /inboxes/:id/set_agent_bot` com body `{ agent_bot: id | null }` (Rails); hoje é `PUT /inboxes/:id/agent_bot`. Manter GET `{ agent_bot }` e o PUT como alias.
- [ ] **(04-10)** Working hours: aceitar/serializar `working_hours` no PATCH e no show (7 dias criados no create); a rota `GET/PUT /working_hours` vira extensão documentada.
- [ ] **(04-11)** Greeting/out-of-office — job no inbound (1ª mensagem da conversa, 1×/dia, `messages.today.template.empty?`) com `content_attributes.template` e realtime; respeitar `allow_messages_after_resolved`.
- [ ] **(04-12)** Auto-assignment — serializar/atualizar `auto_assignment_config` e `enable_auto_assignment` (executor em 05); assignee "Auto" no front.
- [ ] **(04-13)** CSAT config — normalizar `csat_config` (`display_type`, `message`, `button_text`, `language`, `survey_rules`, `template`) no create/update e devolver no serializer.

WhatsApp:

- [ ] **(04-14)** Provider do WhatsApp: aceitar `whatsapp_cloud` e `default` (360dialog) como o pino, `validate_provider_config`, sync de templates no create (job).
- [ ] **(04-15)** `GET /inboxes/:id/message_templates` (`{ payload, meta: { last_sync_attempt_at } }`, filtro `name`), `POST .../sync_templates`, `GET .../health` (400 fora do cloud), `POST .../register_webhook`, `PUT .../whatsapp_business_management_token` (204).
- [ ] **(04-16)** Manual setup: `POST /whatsapp/manual/preview`, `POST /whatsapp/manual/connect` (201, cria inbox com `provider_config.source = manual_setup_v2`), `GET /whatsapp/manual/:inbox_id/webhook_status`, `POST /whatsapp/manual/:inbox_id/setup_webhook`; erros 422 com `{ message }`.
- [ ] **(04-17)** CSAT templates: `GET /inboxes/:id/csat_template`, `POST /inboxes/:id/csat_template` (201 com `{ template }`) e `POST .../csat_template/analyze` (403 sem Captain → 15); validar canal WhatsApp/Twilio WhatsApp.

Canais externos:

- [ ] **(04-18)** `Channel::Api`: no `channel:send`, POST para `webhook_url` (mensagem outgoing ao cliente) com `source_id`; validar `additional_attributes.agent_reply_time_window`.
- [ ] **(04-19)** Website/Widget: persistir `selected_feature_flags` (feature_flags), `reply_time`, `allowed_domains`, `continuity_via_email` e `hmac_token`/`web_widget_script` no serializer.
- [ ] **(04-20)** Facebook/Instagram: `POST/GET /callbacks/register_facebook_page`, `POST /callbacks/facebook_pages`, `POST /callbacks/reauthorize_page`, `POST /instagram/authorization` + `GET /instagram/callback`; avatar da página; `reauthorization_required`.
- [ ] **(04-21)** Google/Microsoft: `POST /google/authorization`, `POST /microsoft/authorization`, callbacks `GET /google/callback`, `GET /microsoft/callback` e `.well-known/microsoft-identity-association.json`; reauthorize de IMAP/SMTP.
- [ ] **(04-22)** Twitter/X: `POST /twitter/authorization` + `GET /twitter/callback` e outbound OAuth 1.0a (ou stub explícito com `failed` + motivo, como hoje).
- [ ] **(04-23)** TikTok: criação de `Channel::Tiktok` (wizard), inbound `POST /webhooks/tiktok`, outbound provider, `GET /tiktok/callback` (reauthorize).
- [ ] **(04-24)** Twilio/SMS: `POST /channels/twilio_channel` persistindo `channel_twilio_sms` (`medium`, `messaging_service_sid`, `content_templates`), callbacks `POST /twilio/callback` e `POST /twilio/delivery_status`; Bandwidth continua em `Channel::Sms` (`provider_config`).
- [ ] **(04-25)** Paths dos webhooks: aceitar `POST /webhooks/whatsapp/:phone_number` (e verify), `POST /webhooks/sms/:phone_number`, `POST /webhooks/line/:line_channel_id`, `POST /webhooks/tiktok`; manter os paths atuais como alias.
- [ ] **(04-26)** Email: quote-strip de reply/forward, HTML→texto, anexos e CC/BCC no parser; cursor de UID + backoff + pasta no IMAP; `verified_for_sending` no serializer.

### 4.2 Front

- [ ] **(04-27)** `settings/inboxes` lista + wizard 1:1 com `ChannelList.vue`/`ChannelFactory.vue`: entradas para todos os canais (incluir TikTok/Voice), `FinishSetup`, `AddAgents`, validações por canal; hoje `new.tsx` cobre 10 canais sem páginas dedicadas.
- [ ] **(04-28)** Detalhe `settings/inboxes/:id` 1:1 com `Settings.vue`: abas e formulários de business hours (WeeklyAvailability), pre-chat form (`PreChatForm/Settings.vue`), CSAT config/template, configuração por canal (health/reauthorize/templates no WhatsApp), avatar e agent bot — arquivos em `apps/web/src/routes/_auth/app/settings/inboxes/` + `packages/ui`.

### 4.3 Dados, jobs e realtime

- [ ] **(04-11)** Job de greeting/out-of-office ao criar conversa; publicar `message.created` via realtime (M4).
- [ ] **(04-14)** Job de sync de templates no create do WhatsApp (e `sync_templates` manual) atualizando `message_templates`/`message_templates_last_updated`.
- [ ] **(04-15)** Health check periódico gravando `phone_number_health`/`checked_at`/`error` (colunas já existentes).
- [ ] **(04-24)** Sync de `content_templates` do Twilio (`content_templates_last_updated`).
- [ ] **(04-30)** Harness de canal sem credencial: `fetch` mockado (Bun) para assertar outbound e `/webhooks/*` simulados ponta a ponta; nenhuma linha de DDL nova.

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                                                                                           | Arquivos-alvo                                                                    | Depende           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------- |
| 04-1  | Serializer `toApiInbox` 1:1 com `_inbox.json.jbuilder` (flat + campos por canal; segredos só admin)                                                                              | `packages/core/src/services/inboxes.ts`                                          | —                 |
| 04-2  | PATCH da inbox com `working_hours[]`, `csat_config`, `portal_id`, `sender_name_type`, `business_name`, `avatar`, `selected_feature_flags`; validação de e-mail e `reauthorized!` | `services/inboxes.ts`, `schemas/inboxes.ts`                                      | 04-1              |
| 04-3  | `GET /inboxes/:id/campaigns`                                                                                                                                                     | `apps/server/src/routes/v1/inboxes.ts`, `services/campaigns.ts`                  | —                 |
| 04-4  | Avatar: upload no PATCH + `DELETE .../avatar` (head 200) usando `active_storage_*`/`storage()`                                                                                   | `services/inboxes.ts`, `packages/core/src/lib/storage.ts`                        | 04-1              |
| 04-5  | `POST /inboxes/:id/reset_secret` (só API, 404 senão)                                                                                                                             | `routes/v1/inboxes.ts`, `services/inboxes.ts`                                    | —                 |
| 04-6  | Destroy completo do canal (todos os tipos) + `{ message }`                                                                                                                       | `services/inboxes.ts`                                                            | —                 |
| 04-7  | Paths Rails de `inbox_members` (show/create/update/destroy) + partial `_agent`                                                                                                   | `routes/v1/inboxes.ts`, `services/inboxes.ts`                                    | —                 |
| 04-8  | `assignable_agents` = membros + admins                                                                                                                                           | `services/inboxes.ts`                                                            | —                 |
| 04-9  | `POST .../set_agent_bot` (`{ agent_bot }`, aceita null) + GET `{ agent_bot }`                                                                                                    | `routes/v1/ops.ts`, `services/agent-bots.ts`                                     | —                 |
| 04-10 | `working_hours` no PATCH/show; 7 dias no create                                                                                                                                  | `services/inboxes.ts`, `$inboxId.tsx`                                            | 04-2              |
| 04-11 | Job de greeting/out-of-office no inbound + pós-resolvido                                                                                                                         | `packages/core/src/channels/inbound.ts`, `services/messages.ts`, `jobs/index.ts` | —                 |
| 04-12 | Serializar/atualizar `auto_assignment_config` (executor 05)                                                                                                                      | `services/inboxes.ts`                                                            | 04-1              |
| 04-13 | `csat_config` formatado no create/update/show                                                                                                                                    | `schemas/inboxes.ts`, `services/inboxes.ts`                                      | 04-1              |
| 04-14 | Provider WhatsApp `whatsapp_cloud`/`default` + validações + sync no create                                                                                                       | `schemas/inboxes.ts`, `channels/providers.ts`                                    | —                 |
| 04-15 | Endpoints WhatsApp: message_templates/sync/health/register_webhook/business token                                                                                                | `routes/v1/whatsapp.ts` (novo), `services/whatsapp.ts` (novo)                    | 04-14             |
| 04-16 | WhatsApp manual setup (preview/connect/webhook_status/setup_webhook)                                                                                                             | `routes/v1/whatsapp.ts`, `services/whatsapp.ts`                                  | 04-15             |
| 04-17 | CSAT templates show/create/analyze (analyze=15)                                                                                                                                  | `routes/v1/inboxes.ts`, `services/csat-templates.ts` (novo)                      | 04-14/04-24       |
| 04-18 | Outbound do `Channel::Api` para `webhook_url` + validação do reply window                                                                                                        | `channels/outbound.ts`, `channels/providers.ts`                                  | —                 |
| 04-19 | Website/Widget: feature flags, reply_time, allowed_domains, continuity, script/HMAC                                                                                              | `services/inboxes.ts`, `schemas/inboxes.ts`                                      | 04-1              |
| 04-20 | Facebook/Instagram OAuth (callbacks + authorization + reauthorize + avatar)                                                                                                      | `routes/v1/oauth.ts` (novo), `services/oauth.ts` (novo)                          | —                 |
| 04-21 | Google/Microsoft OAuth + `.well-known/microsoft-identity-association.json`                                                                                                       | `routes/v1/oauth.ts`, `services/oauth.ts`                                        | —                 |
| 04-22 | Twitter/X authorization + callback + outbound OAuth 1.0a (ou stub documentado)                                                                                                   | `routes/v1/oauth.ts`, `channels/providers.ts`                                    | —                 |
| 04-23 | TikTok: criação, inbound `/webhooks/tiktok`, outbound, reauthorize                                                                                                               | `services/inboxes.ts`, `routes/webhooks.ts`, `providers.ts`                      | —                 |
| 04-24 | Twilio: `POST /channels/twilio_channel` (`channel_twilio_sms`) + callbacks `/twilio/*`; Bandwidth em `Channel::Sms`                                                              | `routes/v1/twilio.ts` (novo), `services/twilio.ts` (novo)                        | —                 |
| 04-25 | Paths Rails dos webhooks (`:phone_number`/`:line_channel_id`/tiktok) + aliases                                                                                                   | `apps/server/src/routes/webhooks.ts`                                             | —                 |
| 04-26 | Email: parser reply/forward, HTML/anexos/CC-BCC, UID cursor/backoff                                                                                                              | `channels/parsers.ts`, `channels/email-poller.ts`, `channels/smtp.ts`            | —                 |
| 04-27 | Front lista/wizard 1:1 (ChannelList/ChannelFactory/FinishSetup/AddAgents, inclui TikTok/Voice)                                                                                   | `apps/web/src/routes/_auth/app/settings/inboxes/*`                               | 04-1              |
| 04-28 | Front detalhe 1:1 (business hours visual, pre-chat, CSAT, health/reauthorize, avatar)                                                                                            | `apps/web/src/routes/_auth/app/settings/inboxes/$inboxId.tsx`                    | 04-1/04-15        |
| 04-29 | Docs por canal: payloads de webhook + curl (WhatsApp manual/health, TikTok, Twilio callbacks)                                                                                    | `docs/canais/*.md`                                                               | 04-15/04-23/04-24 |
| 04-30 | Harness `scripts/e2e-channels.mjs`: webhooks simulados + outbound com fetch mock                                                                                                 | `scripts/e2e-channels.mjs`                                                       | 04-15             |

## 6. Aceite

```bash
# 0) base
bun install && bun run db:start && bun run db:migrate && bun run db:seed
bun run check-types && bun run check
bun scripts/parity-report.mjs          # rotas faltantes de inboxes/whatsapp/oauth zeradas ou justificadas
bun scripts/e2e.mjs                    # 13/13 (regressão)
bun scripts/e2e-channels.mjs           # criado em 04-30 (webhooks + outbound mockado)

# 1) token de admin (seed)
TOKEN=$(curl -sS http://localhost:3000/auth/sign_in -H 'content-type: application/json' \
  -d '{"email":"admin@demo.test","password":"password123"}' | jq -r '.data.access_token'); A=1

# 2) contrato da inbox: PATCH Rails com working_hours + csat_config
curl -sS -X PATCH "http://localhost:3000/api/v1/accounts/$A/inboxes/1" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{
    "working_hours_enabled": true,
    "working_hours": [{"day_of_week":1,"open_hour":9,"open_minutes":0,"close_hour":18,"close_minutes":0,"closed_all_day":false,"open_all_day":false}],
    "csat_config": {"display_type":"emoji","message":"Avalie o atendimento","button_text":"Enviar","language":"pt_BR","survey_rules":{"operator":"contains","values":[]}}
  }'

# 3) membros/agent bot/campanhas/avatar/reset_secret/csat_template
curl -sS -X POST   "http://localhost:3000/api/v1/accounts/$A/inbox_members" -H "Authorization: Bearer $TOKEN" -d '{"inbox_id":1,"user_ids":[2]}'
curl -sS -X POST   "http://localhost:3000/api/v1/accounts/$A/inboxes/1/set_agent_bot" -H "Authorization: Bearer $TOKEN" -d '{"agent_bot":null}'
curl -sS           "http://localhost:3000/api/v1/accounts/$A/inboxes/1/campaigns" -H "Authorization: Bearer $TOKEN"
curl -sS -X DELETE "http://localhost:3000/api/v1/accounts/$A/inboxes/1/avatar" -H "Authorization: Bearer $TOKEN" -o /dev/null -w '%{http_code}\n'
curl -sS -X POST   "http://localhost:3000/api/v1/accounts/$A/inboxes/1/reset_secret" -H "Authorization: Bearer $TOKEN"

# 4) inbound simulado por canal (sem credencial real)
# Website/Widget e API entram no e2e; abaixo os webhooks externos.
curl -sS -X POST "http://localhost:3000/webhooks/whatsapp/5511999990000" -H 'content-type: application/json' -d '{
  "object":"whatsapp_business_account","entry":[{"id":"WABA","changes":[{"field":"messages","value":{
    "messaging_product":"whatsapp","metadata":{"display_phone_number":"5511999990000","phone_number_id":"PNID_TEST"},
    "messages":[{"from":"5511888887777","id":"wamid.e2e-1","timestamp":"1726000000","type":"text","text":{"body":"olá"}}]}}]}]}'
# repetir o mesmo payload -> "ingested":0,"deduplicated":1

curl -sS -X POST "http://localhost:3000/webhooks/telegram/TOKEN_DO_BOT" -H 'content-type: application/json' \
  -d '{"update_id":1,"message":{"message_id":10,"from":{"id":55,"first_name":"Ana"},"chat":{"id":55,"type":"private"},"date":1726000000,"text":"oi"}}'
curl -sS -X POST "http://localhost:3000/webhooks/email" -H 'content-type: application/json' \
  -d '{"messageId":"<e2e-1@demo>","from":"cliente@exemplo.com","to":"suporte@demo.test","subject":"Ajuda","textBody":"preciso de ajuda"}'
curl -sS -X POST "http://localhost:3000/webhooks/sms/5511999990000" -d 'MessageSid=SM123&From=%2B5511888887777&To=%2B5511999990000&Body=oi'
curl -sS -X POST "http://localhost:3000/webhooks/line/1234567890" -H 'content-type: application/json' \
  -d '{"destination":"1234567890","events":[{"type":"message","message":{"id":"L1","type":"text","text":"oi"},"source":{"userId":"U1","type":"user"},"replyToken":"r","timestamp":1726000000,"mode":"active"}]}'
curl -sS -X POST "http://localhost:3000/webhooks/voice?identifier=api-demo" -H 'content-type: application/json' \
  -d '{"CallSid":"CA1","From":"+5511888887777","To":"+5511999990000","CallStatus":"completed"}'
curl -sS "http://localhost:3000/webhooks/twitter?crc_token=abc"                      # com TWITTER_CONSUMER_SECRET
curl -sS "http://localhost:3000/webhooks/instagram?hub.mode=subscribe&hub.verify_token=$FB_TOKEN&hub.challenge=123"
```

- [ ] **04-1..04-30** concluídas; `parity-report` sem rotas faltantes nas áreas `inboxes`, `whatsapp` e `oauth_authorizations` (residual justificado no doc).
- [ ] `scripts/e2e-channels.mjs`: para cada canal, webhook → contato + conversa + mensagem; duplicado → `deduplicated`; resposta no dashboard → `fetch` mock registrado e `messages.status = sent` + `source_id`; erro de credencial → `failed` com `channel_error`.
- [ ] `bun scripts/e2e.mjs` 13/13 e `bun scripts/shot.mjs` gerando `inboxes-index`, `inboxes-new`, `inbox-detail` para comparação lado a lado.
- [ ] `bun run check-types` e `bun run check` verdes; `bun scripts/schema-diff.mjs` e `bun scripts/db-roundtrip-check.mjs` continuam passando (nenhum DDL novo).
- [ ] `docs/canais/*.md` com payload de teste + curl de cada webhook e instruções de mock.

## 7. Fora de escopo

- **Enterprise:** voice/calling real (Twilio Voice, WhatsApp Calling, conference), campaign analytics, SLA, custom roles.
- **Captain:** `csat_template/analyze` fica como 403 até 15 (captain) — o endpoint em si é 04-17.
- **Outros módulos:** widget/API pública com HMAC (09), executor de auto-assignment (05), CSAT respostas/relatórios (07), import/export de contatos (03), integrações Notion/Linear/Shopify (10), platform API (13).
- **Sem base no pino:** holidays (não há tabela/rota no 4.17.1); i18n e CI (decisão R0).
- **DDL:** nenhuma alteração — trilha D fechada; avatar/CSAT usam tabelas já existentes.

## 8. Definição de done

- Tasks **04-1 a 04-30** commitadas com aceite acima verde localmente.
- `bun scripts/parity-report.mjs` refletindo as áreas de inboxes/canais (atualizar `docs/specs/paridade-mapa.md` via `--write-doc`).
- `scripts/e2e-channels.mjs` e docs por canal commitados (evidência de simulação sem credencial).
- Nenhum drift de DDL (`schema-diff`/`roundtrip` verdes) e nenhum arquivo de `chatwoot/` tocado.
- Registrar `Impl [x] done` no roadmap quando `e2e.mjs`, `e2e-channels.mjs`, `check-types` e `check` estiverem verdes.
