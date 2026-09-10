# 02 — Conversas e mensagens

> **Estágio:** 02/15 · **Status:** 1 de 11 subáreas ✅ (ciclo de vida básico), 7 🟡 e 3 ❌ · **Depende de:** 01 (histórico R1)
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`): área API `conversations` 56 ações Rails × 29 rotas nossas; front `conversations` ✅ de fachada.
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

Fechar o coração do produto: **toda action pública** dos controllers Rails de
conversas/mensagens (OSS) responde no **mesmo path, método, status e payload**, e
o dashboard reproduz o fluxo real de atendimento do Chatwoot v4.

Fluxo de referência que precisa ser 1:1 (ordem do Rails):

1. Lista carrega `GET /conversations` (envelope `{data:{meta,payload}}`; counts
   `mine/assigned/unassigned/all`; filtros status/assignee/inbox/team/labels/
   conversation_type + sort/paginação).
2. Abrir conversa: `GET /conversations/:id` + `GET /conversations/:id/messages`
   (últimas 20) + `POST .../update_last_seen` (limpa não-lidas).
3. Responder: `POST .../messages` (outgoing/private, `echo_id` otimista) com
   anexos, áudio, citação, menção, CC/BCC e templates; WS devolve
   `message.created`.
4. Ações: status/priority/assign/team/labels/mute/snooze/typing/transcript/
   custom attributes/custom filters; eventos WS equivalentes ao `actionCable.js`.
5. Lote: `POST /bulk_actions` (assign/label/status/snooze) + barra de seleção.

Critério objetivo de 100%:

1. **API**: as 56 ações da área `conversations` do `parity-report`
   (`conversations_controller`, `conversations/*`, `bulk_actions_controller`,
   `csat_survey_responses_controller`) têm rota Hono no mesmo path, com
   params/status/envelope conferidos contra os `.jbuilder` do pino.
2. **Realtime**: eventos `message.created/updated`, `conversation.updated/read/`
   `deleted`, `conversation.typing_on/off` e `conversation.unread_count_changed`
   chegam iguais ao `actionCable.js`; `conversation_id` do payload de mensagem =
   `display_id`.
3. **Front**: enviar e receber mensagem de todos os tipos (texto, nota privada,
   activity, áudio, imagem, vídeo, arquivo, e-mail, CSAT, location, embed,
   template, fallback) com citação, menção, draft, anexo com preview, retry,
   tradução, transcript, read/unread, filtros avançados, views salvas, seleção
   múltipla e bulk bar.
4. **Aceite local** verde: `check-types`/`oxlint`, `parity-report` sem lacunas na
   área, `e2e.mjs` estendido e comparação visual via `scripts/shot.mjs`.

**Não conta como 100%:** tela “bonita” sem contrato igual; endpoint que só
existe como rota sem payload do Rails; realtime com nomes de evento internos
(`typing.on`); anexo servido por `external_url` nosso em vez de `data_url`;
criar conversa sem gerar `display_id`/atividade/evento como o builder Rails.

## 2. Estado atual (medido)

| Subárea                                                                                   | Status | Evidência no nosso repo                                                                                                            | Lacuna principal                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | :----: | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lista/meta/filtro/search/attachments                                                      |   🟡   | `apps/server/src/routes/v1/conversations.ts` (`/`, `/search`); `packages/core/src/services/conversations.ts` (`listConversations`) | faltam `meta`, `filter`, `attachments`; sem `assigned_count`, `updated_within`, `conversation_type`, `source_id`, envelope `{meta,payload}`                                                       |
| Ciclo de vida básico (show/create/toggle_status/priority/labels/mute/snooze/participants) |   ✅   | `services/conversations.ts` + `services/messages.ts` (`sendAgentMessage`)                                                          | divergências: `assignments`/`participants` devolvem `{data:{conversation}}`; `/priority` em vez de `/toggle_priority`; faltam update/destroy/transcript/typing/last_seen/unread/custom attributes |
| Mensagens (index/create/destroy/upload)                                                   |   🟡   | `services/messages.ts`, `packages/core/src/schemas/messages.ts`                                                                    | faltam `update`/`retry`/`translate`; delete é hard-delete; `content_type` fixo em `"text"`; anexo sem `data_url`/`thumb_url`                                                                      |
| Sub-recursos (drafts, unread_counts, direct_uploads, labels GET, attachments GET)         |   ❌   | nenhuma rota/serviço (grep em `apps/server/src`, `packages/core/src`)                                                              | implementar 7 endpoints (§4.1)                                                                                                                                                                    |
| Bulk actions                                                                              |   ❌   | ausente; macros/automações usam `services/conversation-actions.ts`                                                                 | `POST /accounts/:account_id/bulk_actions` + job                                                                                                                                                   |
| CSAT survey responses                                                                     |   ❌   | `apps/server/src/routes/v1/reports.ts` (`GET /reports/csat`) em path divergente                                                    | `GET /csat_survey_responses{,/metrics,/download}`                                                                                                                                                 |
| Realtime                                                                                  |   🟡   | `packages/core/src/realtime/index.ts`, `apps/server/src/cable.ts`, `apps/web/src/hooks/useCable.ts`                                | eventos internos `typing.on/off`; faltam `message.updated`, `conversation.deleted`, `unread_count_changed`; payload com id interno                                                                |
| Front lista/filtros/views                                                                 |   🟡   | `apps/web/src/components/conversations/ConversationList.tsx`, `ConversationsPage.tsx`                                              | filtro avançado, `conversation_type`, paginação, seleção/bulk bar, menu de contexto                                                                                                               |
| Front thread/bolhas                                                                       |   🟡   | `apps/web/src/components/conversations/Thread.tsx`                                                                                 | bolhas email/csat/location/embed/contact/form/fallback; busca na thread; paginação p/ trás; retry/translate                                                                                       |
| Front reply box                                                                           |   🟡   | `ReplyBox.tsx`                                                                                                                     | drafts persistidos, menções `@`, CC/BCC de e-mail, templates, preview de anexo antes do envio                                                                                                     |
| Front header/detalhes                                                                     |   🟡   | `ConversationHeader.tsx`, `DetailsPanel.tsx`, rota `_auth/app/conversations/$conversationId.tsx`                                   | transcript, custom attributes da conversa, arquivos compartilhados, marcar não lida, copy id                                                                                                      |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                                               | O que dita para nós                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/controllers/api/v1/accounts/conversations_controller.rb`                                                                                             | contrato de `index/meta/search/attachments/show/create/update/filter/transcript/toggle_status/toggle_priority/toggle_typing_status/update_last_seen/unread/destroy` + custom attributes |
| `app/controllers/api/v1/accounts/conversations/{base,messages,draft_messages,unread_counts,direct_uploads,labels,participants,assignments}_controller.rb` | sub-recursos; `base_controller` resolve `:conversation_id` por **`display_id`**; mensagens `update/retry/translate`                                                                     |
| `app/controllers/api/v1/accounts/bulk_actions_controller.rb` + `BulkActionsJob`                                                                           | `type/action_name/ids/labels/fields/snoozed_until` em lote                                                                                                                              |
| `app/controllers/api/v1/accounts/csat_survey_responses_controller.rb`                                                                                     | `index/metrics/download` (CSV)                                                                                                                                                          |
| `app/finders/{conversation_finder,message_finder}.rb`                                                                                                     | params de filtro/ordenação e paginação (`before/after/filter_internal_messages`)                                                                                                        |
| `app/views/api/v1/models/_{message,attachment,conversation,csat_survey_response}.json.jbuilder`, `.../conversations/**/*.jbuilder`                        | payload/envelope exatos (inclui `data_url`, `meta`, `payload`)                                                                                                                          |
| `app/javascript/dashboard/helper/actionCable.js` + `store/modules/{conversationSearch,conversations}.js` + `api/inbox/conversation.js`                    | nomes de eventos e chamadas do front                                                                                                                                                    |
| `app/javascript/dashboard/components-next/message/{Message.vue,bubbles/*,constants.js}`                                                                   | variantes/bolhas e `content_type` (0..12)                                                                                                                                               |
| `app/javascript/dashboard/routes/dashboard/conversation/*`                                                                                                | `ConversationView`, filtros, `SharedFiles`, `ConversationInfo/CustomAttributes`                                                                                                         |
| `db/schema.rb` + tabelas `conversations/messages/attachments/csat_survey_responses/mentions`                                                              | dados (DDL fechado na trilha D — não alterar); drafts usam Redis                                                                                                                        |

## 4. Lacunas detalhadas

> Os IDs `02-x` dos checklists são os mesmos da tabela da §5 (ex.: 02-21 =
> filtros avançados no front; 02-20 = eventos realtime).

### 4.1 API

Collection:

- [ ] **02-1** `GET /api/v1/accounts/:account_id/conversations/meta` — `ConversationsController#meta` — resposta **raiz** `{ meta: { mine_count, assigned_count, unassigned_count, all_count } }` (sem `data`) — `ConversationFinder#perform_meta_only`; reusar `listConversations` (hoje falta `assigned_count = all - unassigned`).
- [ ] **02-2** `POST /api/v1/accounts/:account_id/conversations/filter` — `#filter` — body `{ payload: [{ attribute_key, filter_operator, values, query_operator }], page }`; 422 com `render_could_not_create_error` p/ atributo/operador inválido; resposta `{ meta, payload }` — `Conversations::FilterService`; criar AST (`equal_to/not_equal_to/contains/does_not_contain`, `and/or`).
- [ ] **02-3** `GET /api/v1/accounts/:account_id/conversations/:conversation_id/attachments` — `#attachments` — `page` (100/página), resposta `{ meta: { total_count }, payload: [attachment] }`; usa `attachments` + `messages` já existentes (espelhar `listContactAttachments`).
- [ ] **02-4** `GET /conversations` e `GET /conversations/search` — completar `ConversationFinder`: `assigned_count`, `updated_within`, `conversation_type` (`mention`/`participating`/`unattended`), `source_id`, `sort_by` completo (`last_activity_at_asc/desc`, `created_at_asc/desc`, `priority_asc/desc`, `waiting_since_asc/desc`, `unread`), `page` real; `/search` não força `status=open`; envelope Rails `{ meta, payload }`. **(verificar)** decisão sobre `id` = `display_id` (URLs e payload do Rails usam display_id; hoje usamos id interno em rotas, e2e e widget).

Ciclo de vida:

- [ ] **02-5** `PATCH /conversations/:id` (update de `priority`) e `POST .../toggle_priority` — `#update`/`#toggle_priority` — manter `/priority` como alias; resposta = partial da conversa na raiz (hoje `{data:{conversation}}`).
- [ ] **02-6** `DELETE /conversations/:id` — `#destroy` — `Conversations::DeleteService` (remove mensagens/anexos/notificações e notifica contato), `head :ok`; publicar `conversation.deleted`; autorização `:destroy?`.
- [ ] **02-7** `POST .../transcript` — `#transcript` — 422 `{ error: 'email param missing' }` sem `email`; 429 fora do rate limit; e-mail real depende do módulo 14 (aqui enfileirar job e retornar 200).
- [ ] **02-8** `POST .../toggle_typing_status` — params `typing_status` (`typing_on`/`typing_off`) e `is_private`; publica `conversation.typing_on/off` com `conversation_id` (display_id) e `user`; manter o WS atual como transporte.
- [ ] **02-9** `POST .../update_last_seen` e `POST .../unread` — `update_last_seen`: marca notificações da conversa como lidas, throttle de 1h quando não há não-lidas, atualiza `agent_last_seen_at`/`assignee_last_seen_at` e publica `conversation.unread_count_changed`; `unread`: `agent_last_seen_at = última incoming - 1s`; manter `/read` como alias.
- [ ] **02-10** `POST .../custom_attributes` e `POST .../destroy_custom_attributes` — body `{ custom_attributes: {...}, merge?: bool }`; validar contra `custom_attribute_definitions` (14); resposta `{ custom_attributes }`; usar `conversations.custom_attributes` (coluna já existe).
- [ ] **02-11** `POST .../assignments` + `POST .../team` + participants — alinhar payload Rails: agent retorna partial do agente, team retorna o time, `participants#show` retorna **array** de agentes, `update/destroy` recebem `{ user_ids }` e sincronizam; validar contra `assignable_agents` da inbox (422 `Invalid participant IDs`); hoje `DELETE /participants/:user_id` e `{data:{...}}` divergem.

Mensagens:

- [ ] **02-12** `GET .../conversations/:id/messages` — `MessageFinder`: `before` (20 antes), `after` (100 depois), `filter_internal_messages`, página inicial 20; envelope `{ meta: { labels, additional_attributes, contact, assignee, agent_last_seen_at, assignee_last_seen_at }, payload: [message] }`; hoje só `after`, limite 500 e `{data:{messages}}`.
- [ ] **02-13** `PATCH .../messages/:id`, `POST .../messages/:id/retry` e `POST .../messages/:id/translate`:
  - update: `Messages::StatusUpdateService`, **403** fora de API inbox (`{ error: 'Message status update is only allowed for API inboxes' }`), params `status`/`external_error`, resposta = partial.
  - retry: só `status=failed`; limpa `source_id` exceto API/web widget; enfileira `SendReplyJob`; resposta = partial.
  - translate: `target_language`; cacheia em `content_attributes.translations`; provider Google configurável/mock `(verificar)`; resposta `{ content }`; 422 em erro.
- [ ] **02-14** `POST .../messages`, `DELETE .../messages/:id` e alias `POST .../upload` — `Messages::MessageBuilder`: mapear `content_type` inteiro 0..12 (`text`, `input_text`, `input_email`, `input_csat`, `incoming_email`, `cards`, `form`, `article`, `integrations`, `sticker`, `voice_call`), `content_attributes` (`in_reply_to`, `email`, `deleted`, `translations`, `external_error`), aceitar `attachments: []`, `echo_id`; payload de anexo Rails (`data_url`, `thumb_url`, `file_size`, `message_id`, `account_id`, `transcribed_text`). Delete é **soft** (`content='deleted'`, `deleted:true`, apaga anexos) com resposta = partial — hoje hard-delete + `{ok:true}`.

Sub-recursos:

- [ ] **02-15** `GET/PATCH/DELETE .../draft_messages` — `draft_messages_controller` — Redis key `CONVERSATION::<conversation_id>::DRAFT_MESSAGE` (id interno); show `{has_draft:false}` ou `{has_draft:true, message}`; update body `{draft_message:{message}}` → 200; destroy → 200; usar `ioredis` (`REDIS_URL`, já é dependência) e fallback in-process sem Redis `(verificar)`.
- [ ] **02-16** `GET /conversations/unread_counts` — `unread_counts_controller` — 403 se flag `conversation_unread_counts` off (já mapeada em `feature-flags.ts`); resposta `{ payload: counts }`; invalidar/publicar `conversation.unread_count_changed` em mensagens, visitas e participantes.
- [ ] **02-17** `POST .../direct_uploads` e `GET .../labels` — direct upload (blob assinado; usar `S3StorageProvider` quando `S3_BUCKET`, fallback local; retorno com `signed_id`/`url` compatível `(verificar)` campos exatos); labels `#index` → `{ payload: labels }` (hoje só o `POST` que substitui a lista).
- [ ] **02-18** `POST /api/v1/accounts/:account_id/bulk_actions` — `bulk_actions_controller#create` — `{ type: 'Conversation'|'Contact', action_name, ids: [], labels: [{add:[],remove:[]}], fields: [{status, assignee_id, team_id}], snoozed_until }`; 200 `head :ok`, 422 p/ tipo desconhecido; job `BulkActionsJob` (`packages/core/src/jobs`).

CSAT:

- [ ] **02-19** `GET /api/v1/accounts/:account_id/csat_survey_responses` (+ `/metrics`, `/download`) — index paginado (25/página) com filtros `user_ids/inbox_id/team_id/rating/created_at`; metrics `{ total_count, ratings_count, total_sent_messages_count }`; download CSV `csat_report.csv`; reaproveitar `getCsatReport`/`reporting.ts` e adicionar rota com o path Rails (não em `reports.ts`).

### 4.2 Front

Lista/consulta:

- [ ] **02-21** `app/conversations` — filtros avançados: painel com `attribute_key`/`filter_operator`/`values` + `query_operator`, enviando `POST /filter`; hoje só status/sort (`ConversationList.tsx`).
- [ ] **02-22** Lista — abas de `conversation_type` (menções, participando, não atendidas), paginação (`current_page`/`total_count`) e “atualizado há” (`updated_within`).
- [ ] **02-23** Lista — **seleção múltipla** + bulk bar (assign/label/status/snooze/delete) usando `POST /bulk_actions`; hover/ações do card + menu de contexto (“marcar como lida/não lida”, copiar id).
- [ ] **02-24** Thread — busca dentro da conversa (Cmd+F, `conversationSearch` do Rails) com highlight/navegação; carregar mensagens antigas ao subir o scroll (`before`).

Editor/thread:

- [ ] **02-25** ReplyBox — **drafts persistidos** (autosave debounced + restore ao abrir) via `draft_messages`; **menções** `@agente` com autocomplete; citação de mensagem (selecionar mensagem → `in_reply_to`); preview/chips de anexo antes de enviar.
- [ ] **02-26** ReplyBox — e-mail: campos **CC/BCC** (`content_attributes.email.cc_emails/bcc_emails`), templates (WhatsApp) e assinatura `(verificar)`; manter toolbar markdown, canned `/`, emoji e gravador que já existem.
- [ ] **02-27** Thread — bolhas por `content_type`/`file_type`: `Email/Index.vue` (cabeçalho de e-mail), `CSAT.vue` (rating), `Location.vue` (mapa), `Embed.vue` (OG preview), `Contact.vue`, `Form.vue`, `Fallback.vue`/`Unsupported.vue`; `Dyte` (módulo 10), `VoiceCall` (enterprise, fora), `InstagramStory` (módulo 04); status/erro com **retry** (`MessageError.vue`) e **translate** (`TranslationToggle.vue`).

Painel/estados:

- [ ] **02-28** Header/Detalhes — modal de **transcript** (e-mail), marcar não lida (`unread`), editar custom attributes da conversa, painel **SharedFiles** (attachments da conversa), “conversas anteriores” já existe (`DetailsPanel.tsx`), polir copiar id/nome/inbox.
- [ ] **02-29** Estados vazios/loading/erro na lista, thread e detalhes (skeletons de `packages/ui`); layout `condensed/expanded` e o switch `SwitchLayout.vue` do Rails (`ConversationView.vue`).

### 4.3 Dados, jobs e realtime

- [ ] **02-20** Realtime: publicar `message.updated` (update/retry/translate/delete), `conversation.deleted`, `conversation.unread_count_changed`; renomear `typing.on/off` → `conversation.typing_on/off`; `data.conversation_id` = `display_id` nos payloads de mensagem; assinatura de `actionCable.js` (`message.updated`, `conversation.typing_on/off`, `conversation.unread_count_changed`).
- [ ] **02-10/02-14/02-19** Colunas já existentes a usar (sem DDL): `conversations.custom_attributes/cached_label_list/agent_last_seen_at/assignee_last_seen_at/waiting_since/first_reply_created_at/status_changed_at`; `messages.content_attributes` (translations, in_reply_to, deleted, email) e `content_type`; `attachments.meta/fallback_title`; `mentions`; `csat_survey_responses`.
- [ ] **02-7/02-13/02-18** Jobs: `SendReplyJob` do retry, e-mail de transcript e `BulkActionsJob` (usar `packages/core/src/jobs`); drafts em Redis (fora do DDL, como no Rails).
- [ ] **02-9/02-16** Unread counts: invalidar/publicar em `createIncomingMessage`, `markConversationRead`, `update_last_seen`, `unread` e mudança de participantes; feature flags `conversation_unread_counts` + `unread_count_for_filters`.

> **Divergências a corrigir (não só adicionar):** envelopes `{data}` vs `{meta,payload}`
> do Rails; `id` interno vs `display_id`; `/priority` vs `/toggle_priority`;
> `/read` vs `update_last_seen`; `typing.on/off`; hard-delete vs soft-delete;
> `content_type` fixo; anexo `external_url` vs `data_url`/`thumb_url`.

## 5. Tarefas (executáveis)

**Entrega A — Collection (02-1..02-4)**

| ID   | Tarefa                                                       | Arquivos-alvo                                                               | Depende |
| ---- | ------------------------------------------------------------ | --------------------------------------------------------------------------- | ------- |
| 02-1 | `GET /conversations/meta` + `assigned_count`                 | `routes/v1/conversations.ts`, `services/conversations.ts`                   | —       |
| 02-2 | `POST /conversations/filter` + AST de filtros                | `services/conversation-filters.ts` (novo), `schemas/conversations.ts`, rota | 02-1    |
| 02-3 | `GET /conversations/:id/attachments`                         | `services/conversations.ts`, rota                                           | —       |
| 02-4 | Contrato completo de `index`/`search` (params/meta/envelope) | `services/conversations.ts`, `schemas/conversations.ts`                     | —       |

**Entrega B — Ciclo de vida (02-5..02-11)**

| ID    | Tarefa                                                 | Arquivos-alvo                                                                            | Depende    |
| ----- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------- |
| 02-5  | `PATCH /conversations/:id` + `toggle_priority`         | rota, `services/conversations.ts`                                                        | —          |
| 02-6  | `DELETE /conversations/:id` + `conversation.deleted`   | `services/conversations.ts`, `realtime`                                                  | —          |
| 02-7  | `POST .../transcript` (422/429/200 + job)              | rota, `services/conversations.ts`, `jobs`                                                | 14 (envio) |
| 02-8  | `POST .../toggle_typing_status` + evento Rails         | rota, `services/conversations.ts`, `realtime`, `cable.ts`                                | —          |
| 02-9  | `update_last_seen` + `unread` (throttle, notificações) | `services/conversations.ts`, `services/notifications.ts`                                 | —          |
| 02-10 | Custom attributes de conversa (set/destroy/merge)      | `services/conversations.ts`, `schemas/conversations.ts`                                  | —          |
| 02-11 | `assignments`/`team`/`participants` com payload Rails  | rotas, `services/conversations.ts`, `services/messages.ts`, front `lib/conversations.ts` | —          |

**Entrega C — Mensagens (02-12..02-14)**

| ID    | Tarefa                                                                | Arquivos-alvo                                                         | Depende |
| ----- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | ------- |
| 02-12 | `messages#index` contrato (`before`/`filter_internal_messages`/meta)  | `services/messages.ts`, `schemas/messages.ts`, `lib/conversations.ts` | —       |
| 02-13 | `messages#update`/`retry`/`translate`                                 | `services/messages.ts`, `schemas/messages.ts`, rota                   | —       |
| 02-14 | Soft-delete + `content_type` 0..12 + anexo `data_url` (create/upload) | `services/messages.ts`, `schemas/messages.ts`                         | —       |

**Entrega D — Sub-recursos e lote (02-15..02-19)**

| ID    | Tarefa                                       | Arquivos-alvo                                             | Depende |
| ----- | -------------------------------------------- | --------------------------------------------------------- | ------- |
| 02-15 | Drafts Redis (show/update/destroy)           | `services/drafts.ts` (novo), rota, `lib/conversations.ts` | —       |
| 02-16 | `unread_counts` (flag, `{payload}`, eventos) | `services/conversations.ts`, rota, `feature-flags.ts`     | 02-9    |
| 02-17 | `direct_uploads` + `labels#index`            | `lib/storage.ts`, rota, `services/conversations.ts`       | —       |
| 02-18 | `bulk_actions#create` + `BulkActionsJob`     | `services/bulk-actions.ts` (novo), `jobs`, rota           | —       |
| 02-19 | CSAT responses `index/metrics/download`      | `services/reporting.ts`, rota nova, `schemas/reports.ts`  | —       |

**Entrega E — Realtime e front (02-20..02-30)**

| ID    | Tarefa                                                                   | Arquivos-alvo                                                           | Depende         |
| ----- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------- |
| 02-20 | Eventos realtime novos + nomes Rails + payload display_id                | `realtime/index.ts`, `cable.ts`, `services/*.ts`                        | 02-8/02-9       |
| 02-21 | Filtros avançados + `POST /filter` na UI                                 | `ConversationList.tsx`, `ConversationsPage.tsx`, `lib/conversations.ts` | 02-2            |
| 02-22 | Tabs `conversation_type` + paginação + `updated_within`                  | `ConversationList.tsx`, rota `$conversationId.tsx`                      | 02-4            |
| 02-23 | Seleção múltipla + bulk bar + menu de contexto                           | `ConversationList.tsx`, `ConversationsPage.tsx`                         | 02-18           |
| 02-24 | Busca na thread + paginação para trás                                    | `Thread.tsx`, `lib/conversations.ts`                                    | 02-12           |
| 02-25 | Drafts + menções + citação + preview de anexo                            | `ReplyBox.tsx`, `Thread.tsx`, `lib/conversations.ts`                    | 02-15/02-14     |
| 02-26 | CC/BCC e templates de e-mail/WhatsApp                                    | `ReplyBox.tsx`                                                          | 02-14           |
| 02-27 | Bolhas email/csat/location/embed/contact/form/fallback + retry/translate | `components/conversations/bubbles/*` (novo), `Thread.tsx`               | 02-13           |
| 02-28 | Transcript modal, unread, custom attrs, SharedFiles                      | `ConversationHeader.tsx`, `DetailsPanel.tsx`                            | 02-7/02-9/02-10 |
| 02-29 | Estados vazio/loading/erro + layout condensed/expanded                   | `ConversationsPage.tsx`, `ConversationList.tsx`, `packages/ui`          | —               |
| 02-30 | E2E estendido + smoke de contrato (curl)                                 | `scripts/e2e.mjs`, `scripts/*-smoke.mjs` (novo)                         | 02-1..02-20     |

## 6. Aceite

```bash
bun run check-types && bunx oxlint
bun scripts/parity-report.mjs          # área "conversations" sem lacunas (56 ações)
bun scripts/e2e.mjs                    # fluxo conversas/mensagens verde e idempotente

# contratos (exemplos; repetir por endpoint da §4.1)
curl -s -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/accounts/$ACC/conversations/meta"
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"payload":[{"attribute_key":"status","filter_operator":"equal_to","values":["open"],"query_operator":"AND"}]}' \
  "$SERVER/api/v1/accounts/$ACC/conversations/filter"
curl -s -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/accounts/$ACC/conversations/1/attachments?page=1"
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"custom_attributes":{"plan":"pro"},"merge":true}' \
  "$SERVER/api/v1/accounts/$ACC/conversations/1/custom_attributes"
curl -s -X POST -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/accounts/$ACC/conversations/1/messages/9/retry"
curl -s -X POST -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/accounts/$ACC/conversations/1/draft_messages" \
  -H 'Content-Type: application/json' -d '{"draft_message":{"message":"rascunho"}}'
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"type":"Conversation","action_name":"assign","ids":[1,2],"fields":[{"assignee_id":3}]}' \
  "$SERVER/api/v1/accounts/$ACC/bulk_actions"
bun scripts/shot.mjs                   # lista + thread + drawer lado a lado
```

- [ ] 100% dos endpoints da §4.1 com mesmo path/status/envelope do Rails, provado por smoke por curl (comandos acima) e `parity-report` sem pendências na área.
- [ ] `bun scripts/e2e.mjs` estendido: anexo + áudio + nota privada + citação + menção + bulk assign + snooze + transcript + draft + read/unread.
- [ ] Realtime com 2 abas: `message.created/updated`, `conversation.typing_on/off`, `conversation.deleted` e `unread_count_changed` chegam com payload igual ao `actionCable.js`.
- [ ] Drafts persistem entre reloads; `unread_counts` respeita a flag (403 sem ela); `filter` devolve 422 com mensagem para operador inválido.
- [ ] `bun scripts/shot.mjs`: lista com filtros avançados, thread com bolhas email/CSAT/áudio e painel de detalhes comparados aos screenshots do original.

## 7. Fora de escopo

- **Enterprise:** `ai_assignee`, `reporting_events`/drilldowns, copilot, SLA, calls, custom roles, conversation workflow, `csat_survey_responses#update` (review notes).
- **Outros módulos:** API do widget e pública de inbox (09), canais/OAuth (04), relatórios v2 e página pública de CSAT/survey (07), contatos/notas/anexos de contato (03), atribuição automática e presença (05), envio real de e-mail (14) — aqui só o contrato/enqueue.
- **Decisões globais:** i18n e pipeline/CI; DDL (trilha D já fechada — nenhuma mudança de schema neste módulo).

## 8. Definição de done

- [ ] Tarefas 02-1..02-30 commitadas; nenhum `(verificar)` pendente sem decisão registrada (em especial `display_id` e provider de translate).
- [ ] `bun run check && bun run check-types` verdes; `scripts/e2e.mjs` idempotente 2× seguidas.
- [ ] `bun scripts/parity-report.mjs --write-doc` regenerado com a área `conversations` sem lacunas e `docs/specs/paridade-mapa.md` atualizado.
- [ ] Evidências anexadas no commit: saída do smoke/curl, prints de `shots/` e diff dos envelopes conferidos contra os `.jbuilder` do pino.
- [ ] `roadmap.md` marca **02 — Conversas e mensagens** como 100%.
