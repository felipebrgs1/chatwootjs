# 11 — Notificações, Busca & Comandos

> **Estágio:** 11/15 · **Status:** 0 de 8 subáreas verdes (7 🟡 + 1 ❌) · **Depende de:** histórico R1 (`notification_settings` default) · 02 (eventos de conversa/mensagem) · 14 (fila de jobs/e-mails)
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`)
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

Entregar o **sino completo** (API account-scoped + UI + realtime + preferências + WebPush),
a **busca global** (API e página de resultados) e a **command bar `⌘K`** com atalhos e ações,
além das **views salvas** (`custom_filters` + CustomViews no dashboard) — tudo 1:1 com o OSS 4.17.1.

**100% significa:**

1. As 12 actions OSS de notificações (`index/read_all/update/unread/destroy/destroy_all/`
   `unread_count/snooze`, `notification_settings#show/update` e
   `notification_subscriptions#create/destroy`) respondem no **mesmo path account-scoped, método,
   status e envelope** do Rails (DDL já fechado na trilha D).
2. As 6 actions de busca (`search#index/conversations/contacts/messages/articles` + a busca pública de
   portal, coberta no módulo 08) respondem `{ payload: {...} }` com paginação de 15 e filtros
   (`page/since/until/from/inbox_id`), respeitando visibilidade de inbox do agente.
3. `custom_filters` (index/show/create/update/destroy) casa com o Rails (array puro, `filter_type`,
   limite de 1000 por usuário) e o dashboard mostra/salva/edita/exclui views na sidebar e na lista.
4. O sino e a página de notificações têm paridade visual/funcional com `inbox-view` (badge, filtros
   snoozed/read, marcar lida/não lida, snooze, excluir, excluir lidas/todas, som e push do browser).
5. Realtime emite `notification.created|updated|deleted` com payload
   `{ notification, unread_count, count }`, e o front atualiza o estado sem refetch.
6. Jobs equivalentes: `DeleteNotificationJob`, `RemoveDuplicateNotificationJob`,
   `ReopenSnoozedNotificationsJob`, `RemoveOldNotificationJob` (o envio de e-mail/push é o módulo 14).
7. A command bar `⌘K` tem as seções/ações do `ninja-keys` (navegação, inbox, conversa, aparência,
   macros, bulk, snooze) e a busca global navega para resultados reais.

**Não conta como 100%:** manter `/api/v1/notifications?account_id=` (legado nosso) como contrato
principal; usar `@nome` como token de menção; devolver `{ data: { notifications } }`; UI de busca
apenas no palette sem página de resultados; views salvas limitadas a `filter_type=0`.

## 2. Estado atual (medido)

| Subárea                                | Status | Evidência no nosso repo                                                                                                                                                                                            | Lacuna principal                                                                                                                                                                                                                           |
| -------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API de notificações                    |   🟡   | `apps/server/src/routes/v1/notifications.ts` (GET `/notifications`, `read_all`, `:id/read`, `:id/unread`, `:id/snooze` com `?account_id=`); `packages/core/src/services/notifications.ts`                          | Path fora do `/accounts/:account_id`; faltam `update`, `destroy`, `destroy_all`, `unread_count`; envelope/shape divergentes; index não filtra `read`/`snoozed`                                                                             |
| Preferências (`notification_settings`) |   🟡   | `apps/server/src/routes/v1/engagement.ts` (GET/PUT), `get/updateNotificationSettings` em `packages/core/src/services/notifications.ts`, UI de "sino por tipo" em `apps/web/src/routes/_auth/app/notifications.tsx` | Params `email_flags/push_flags/muted_flags` (flat) vs `notification_settings.selected_*`; resposta `{data}` vs raw; sem PATCH; R1 liga todos os tipos, Rails liga só `conversation_assignment` (`AccountUser#create_notification_setting`) |
| Subscriptions / WebPush                |   ❌   | Tabela `notification_subscriptions` existe em `packages/db/src/schema/notifications.ts` sem nenhum uso                                                                                                             | `POST/DELETE /api/v1/notification_subscriptions`, builder por `identifier` (endpoint/device_id), VAPID + `sw.js`                                                                                                                           |
| Realtime do sino                       |   🟡   | `packages/core/src/realtime/index.ts` tem só `notification.created`; `notify()` publica em `packages/core/src/services/notifications.ts`; `NotificationBell.tsx` escuta e refaz fetch                              | `notification.updated/deleted`; payload `{notification, unread_count, count}`; entrega por token de usuário                                                                                                                                |
| Sino + página de notificações          |   🟡   | `apps/web/src/components/notifications/NotificationBell.tsx`, `apps/web/src/routes/_auth/app/notifications.tsx`, item "Notificações" em `apps/web/src/components/app-sidebar.tsx`                                  | Sem snooze/excluir/destroy_all/unread_count na UI; página 1:1 (`inbox_view` com lista + detalhe e filtros) ausente; sem som                                                                                                                |
| Busca global                           |   🟡   | `packages/core/src/services/search.ts`, `GET /accounts/:account_id/search` em `engagement.ts`, `apps/web/src/components/search/CommandPalette.tsx`                                                                 | Sem `messages` nem sub-rotas; resposta `{data}` + `canned_responses` vs `{payload}`; sem paginação/filtros (`page/since/until/from/inbox_id`); sem página `SearchView`                                                                     |
| Command bar (`⌘K`)                     |   🟡   | Só o palette de busca em `apps/web/src/components/search/CommandPalette.tsx`                                                                                                                                       | Ações/seções do `ninja-keys`, atalhos, árvore de snooze e eventos de comando                                                                                                                                                               |
| Views salvas (`custom_filters`)        |   🟡   | `customFilters` GET/POST/PATCH/DELETE em `engagement.ts`; save/apply/delete em `apps/web/src/components/conversations/ConversationsPage.tsx`                                                                       | Envelope/status divergentes; `filter_type=1/2` não suportado; sem `show`; sem limite; sem editar; sem sidebar/segmentos de contato                                                                                                         |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                                                                                                      | O que dita para nós                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/controllers/api/v1/accounts/notifications_controller.rb` + `app/finders/notification_finder.rb` + `app/views/api/v1/accounts/notifications/index.json.jbuilder`                                             | Contrato de `index/read_all/update/unread/destroy/destroy_all/unread_count/snooze`; defaults de filtro (`read_at: nil`, `snoozed_until: nil`), `includes[]`, `sort_order`, página 15 e envelope `data.meta + data.payload` |
| `app/models/notification.rb`, `app/listeners/notification_listener.rb`, `app/builders/notification_builder.rb`, `app/services/messages/{new_message_notification_service,mention_service}.rb`                    | Tipos (1–8, OSS usa 1–5), quando cada notificação nasce, supressões (bloqueado/visibilidade) e `secondary_actor`                                                                                                           |
| `app/controllers/api/v1/accounts/notification_settings_controller.rb`, `app/models/notification_setting.rb`, `app/models/account_user.rb`                                                                        | Flags `selected_email_flags/selected_push_flags` (prefixo `email_/push_`), `all_*_flags` e default do vínculo                                                                                                              |
| `app/controllers/api/v1/notification_subscriptions_controller.rb`, `app/builders/notification_subscription_builder.rb`, `app/javascript/dashboard/helper/pushHelper.js`                                          | Create/destroy por `identifier` e registro WebPush (VAPID)                                                                                                                                                                 |
| `app/controllers/api/v1/accounts/search_controller.rb`, `app/services/search_service.rb`, `app/views/api/v1/accounts/search/*`, `app/javascript/dashboard/modules/search/*`                                      | Sub-rotas, `{payload}`, paginação/filtros e a página `SearchView` (abas + recentes)                                                                                                                                        |
| `app/javascript/dashboard/routes/dashboard/commands/commandbar.vue`, `composables/commands/*`, `helper/commandbar/*`                                                                                             | Seções/ações do `ninja-keys`, atalhos e snooze (NLP/`CmdBarConversationSnooze`)                                                                                                                                            |
| `app/javascript/dashboard/routes/dashboard/inbox/*`, `components-next/sidebar/Sidebar.vue`, `settings/profile/{NotificationPreferences,AudioNotifications}.vue`, `helper/AudioAlerts/*`, `helper/actionCable.js` | Badge, lista/detalhe (`inbox_view`), preferências tipo × email/push, push do browser, som e handlers realtime                                                                                                              |
| `app/controllers/api/v1/accounts/custom_filters_controller.rb`, `app/models/custom_filter.rb`, `components/ChatList.vue`, `routes/dashboard/customviews/DeleteCustomViews.vue`                                   | Contrato e UI de views salvas (conversation/contact/report)                                                                                                                                                                |
| `app/jobs/notification/*.rb` + `config/schedule.yml`                                                                                                                                                             | Dedupe, delete, reabertura de snooze e retenção (300/usuário, 1 mês)                                                                                                                                                       |
| `db/schema.rb` → `notifications`, `notification_settings`, `notification_subscriptions`, `custom_filters`, `mentions`                                                                                            | Dados (DDL já fechado na trilha D — não alterar)                                                                                                                                                                           |

> Nota de verificação: os caminhos citados no inventário bruto (`components-next/notification`,
> `components-next/commandbar`, `components-next/search`) **não existem** no 4.17.1; a UI real está em
> `routes/dashboard/inbox`, `routes/dashboard/commands` e `modules/search` (acima).

## 4. Lacunas detalhadas

### 4.1 API

- [ ] `GET /api/v1/accounts/:account_id/notifications` — Rails `Notifications#index` — responde
      `{ data: { meta: { unread_count, count, current_page }, payload: [notification...] } }`, com
      default **só não lidas e não snoozadas**, `includes[]=read|snoozed`, `page` e `sort_order=asc|desc`
      (15/página). Hoje: `GET /api/v1/notifications?account_id=` devolve `{ data: { notifications, unread_count, meta } }`.
      Implementar em `apps/server/src/routes/v1/notifications.ts` + serviço/schema no core; migrar o web e o e2e.
- [ ] `PATCH /api/v1/accounts/:account_id/notifications/:id` — `update` — body `{ read_at: true }`;
      responde a notificação. Hoje só existe `POST /api/v1/notifications/:id/read`.
- [ ] `POST /api/v1/accounts/:account_id/notifications/read_all` — body opcional
      `primary_actor_type` + `primary_actor_id` (marca só a conversa) e 200 **sem corpo**. Hoje ignora os
      params e devolve `{ data: { updated } }`.
- [ ] `GET /api/v1/accounts/:account_id/notifications/unread_count` — retorna o **inteiro puro**
      (sem envelope). Ausente.
- [ ] `POST /api/v1/accounts/:account_id/notifications/destroy_all` — body `{ type: "read"|"all" }`,
      enfileira o job e responde 200 vazio. Ausente.
- [ ] `DELETE /api/v1/accounts/:account_id/notifications/:id` — 200 vazio (dispara `notification.deleted`). Ausente.
- [ ] `POST /api/v1/accounts/:account_id/notifications/:id/unread` — 200 com a notificação (hoje
      `{ data: { notification } }` no path global). Ajustar ao shape Rails.
- [ ] `POST /api/v1/accounts/:account_id/notifications/:id/snooze` — body `snoozed_until` em **epoch
      seconds** (`DateRangeHelper#parse_date_time` usa `%s`; o front manda `getUnixTime`) e
      `meta.last_snoozed_at = nil`. Hoje o schema exige ISO datetime (`NotificationSnoozeBodySchema` em
      `packages/core/src/schemas/notifications.ts`) → 422 para o payload real do front.
- [ ] `GET|PUT|PATCH /api/v1/accounts/:account_id/notification_settings` — Rails `show` responde
      **raw** `{ id, user_id, account_id, all_email_flags, selected_email_flags, all_push_flags, selected_push_flags }`
      e `update` aceita `{ notification_settings: { selected_email_flags: [...], selected_push_flags: [...] } }`
      (flags com prefixo `email_`/`push_`). Hoje: PUT flat (`email_flags/push_flags/muted_flags`) e
      `{ data: { notification_settings } }`; adicionar PATCH e apelidar `muted_flags` apenas como derivado interno.
- [ ] `POST /api/v1/notification_subscriptions` — global (sem `account_id`), body
      `{ notification_subscription: { subscription_type: "browser_push"|"fcm", subscription_attributes: {...} } }`;
      upsert pelo `identifier` (endpoint p/ browser_push, `device_id` p/ fcm) **movendo** a subscription
      de outro usuário; resposta raw. Ausente.
- [ ] `DELETE /api/v1/notification_subscriptions?push_token=` — apaga só a subscription do
      `current_user` (não vaza para outro usuário) e 200 vazio. Ausente.
- [ ] `GET /api/v1/accounts/:account_id/search` — `Search#index` — resposta **`{ payload: { conversations, contacts, messages, articles } }`**
      (sem `data`), 15/página. Hoje devolve `{ data: { conversations, contacts, articles, canned_responses } }`.
- [ ] `GET /api/v1/accounts/:account_id/search/{conversations,contacts,messages,articles}` — sub-rotas
      com `q`, `page`, `since`, `until`, `from=contact:<id>|agent:<id>`, `inbox_id`; mensagens dos últimos
      3 meses + acesso por inbox (`assigned_inboxes`/admin); contatos ordenados por `last_activity_at`;
      artigos via `text_search`. Ausentes (só existe `/search`).
- [ ] `GET /accounts/:account_id/search` não pode 422 com `q` vazio (Rails devolve vazio) — hoje
      `z.string().min(1)` em `engagement.ts` rejeita.
- [ ] `custom_filters`: `GET /custom_filters?filter_type=` devolve **array puro** escopado ao usuário,
      `GET /:id` (show), `POST` body `{ custom_filter: { name, filter_type, query } }` (raw, 200),
      `PATCH /:id` (raw), `DELETE /:id` → **204**, limite `Limits::MAX_CUSTOM_FILTERS_PER_USER = 1000`.
      Hoje: `{data: {...}}`/201/200 e sem `filter_type`, `show`, limite, e com `visibility` inventado.

### 4.2 Front

- [ ] `NotificationBell.tsx` — portar `Sidebar` (badge da Inbox) + `routes/dashboard/inbox`:
      dropdown com marcar lida/não lida, excluir, snooze (`SNOOZE_OPTIONS` + modal custom), contadores
      vindos do evento e link "ver todas"; hoje só lista 10 não lidas. Referência:
      `chatwoot/app/javascript/dashboard/routes/dashboard/inbox/{InboxList,InboxView}.vue` +
      `components-next/sidebar/Sidebar.vue`; alvo `apps/web/src/components/notifications/NotificationBell.tsx`.
- [ ] Página `/app/notifications` — paridade com `inbox_view`: lista paginada (scroll infinito),
      filtros "snoozed/read" + sort, detalhe da conversa embutido (reusar Thread), "marcar todas",
      "excluir todas", "excluir lidas", vazio/loading. Alvo:
      `apps/web/src/routes/_auth/app/notifications.tsx` (+ rota de detalhe) e `app-sidebar.tsx`.
- [ ] Preferências de e-mail/push por tipo — portar `settings/profile/NotificationPreferences.vue`
      (grade tipo × email/push, toggle de permissão do browser via `pushHelper.js`) e
      `AudioNotifications.vue` + `AudioAlert*/` (som por evento/condição/tom). A rota `settings/profile`
      ainda não existe (módulo 12): entregar componente/lógica aqui e plugar lá (verificar).
- [ ] WebPush — `sw.js` + VAPID (`window.chatwootConfig.vapidPublicKey`) + subscribe/unsubscribe:
      registrar/remover `notification_subscriptions` ao ligar/desligar o toggle; alvo
      `apps/web/public/sw.js` (novo), lib de push (novo) e a página de preferências.
- [ ] Busca global — página `SearchView` (`accounts/:accountId/search/:tab?`, abas
      all/contacts/conversations/messages/articles, `RecentSearches`, filtros de período/agente/inbox e
      paginação) e links do palette; alvo novo em `apps/web/src/routes/_auth/app/` +
      `components/search/` (referência `chatwoot/.../modules/search/*`).
- [ ] Command bar — portar `commands/commandbar.vue` + `composables/commands/*` para o
      `CommandPalette.tsx`: seções (GENERAL/REPORTS/SETTINGS/…), ações `goto_*`, filtros da inbox,
      ações de conversa, bulk, macros, aparência e árvore de snooze; atalhos de teclado equivalentes.
      Ações profundas dependem dos módulos 02/06.
- [ ] Views salvas — paridade com `components/ChatList.vue` + `customviews/DeleteCustomViews.vue`:
      pastas na sidebar, salvar/editar/excluir com modal e confirmação, segmentos de contatos
      (`filter_type=1`); hoje só um dropdown simples em `ConversationsPage.tsx` (sem editar, sem sidebar).

### 4.3 Dados, jobs e realtime

- [ ] Semântica do registro: Rails usa `primary_actor = Conversation` sempre (`PRIMARY_ACTORS`) e
      `secondary_actor = Message` (nova mensagem/menção) ou `User` (assign/creation); `last_activity_at`
      e `meta` são usados na ordenação/snooze. Hoje `notify()` grava `primary_actor = Message` para
      mensagens e não preenche `last_activity_at`/`meta` — alinhar em `packages/core/src/services/notifications.ts`.
- [ ] Emissores completos: `conversation_creation` (criação/bot handoff, membros da inbox, pula
      `pending`, só se subscrito), `conversation_assignment` (✅ existe), `assigned_conversation_new_message`
      (assignee, tipo 3) separado de `participating_conversation_new_message` (tipo 5), dedupe por
      `secondary_actor` da mensagem, supressão de contato bloqueado (exceto menção) e checagem de
      visibilidade (`ConversationPolicy#show?`). Hoje o emitter manda tipo 5 para assignee e participantes,
      sem `secondary_actor` nem dedupe/bloqueio/visibilidade.
- [ ] Menções 1:1: só em **nota privada**, token `(mention://user/<id>/<nome>)`/`(mention://team/<id>/<nome>)`,
      interseção com membros da inbox + admins, `self_mention` ignorada, menção vira `conversation_participant`,
      e `secondary_actor = message`. Hoje `processMentions` usa `@nome` em qualquer mensagem, sem filtro de
      inbox e sem adicionar participante (`services/notifications.ts` + chamada em `services/messages.ts`).
- [ ] Realtime: adicionar `notification.updated`/`notification.deleted` ao `RealtimeEvent`
      (`packages/core/src/realtime/index.ts`) e publicar nos fluxos de read/unread/snooze/destroy/read_all
      com `{ notification, unread_count, count }` (referência `ActionCableListener` +
      `helper/actionCable.js`); hoje só `notification.created`.
- [ ] Jobs: `DeleteNotificationJob` (destroy_all), `RemoveDuplicateNotificationJob` (índice
      `uniq_primary_actor_per_account_notifications`), `ReopenSnoozedNotificationsJob` (cron; reabre e
      zera `read_at`) e `RemoveOldNotificationJob` (>1 mês; 300/usuário). Usar a fila do módulo 14;
      hoje `packages/core/src/jobs` só tem automação.
- [ ] Push/e-mail (`Notification::PushNotificationJob`/`EmailNotificationJob`, `fcm_push_data`) ficam
      no módulo 14; aqui só a subscription e os flags que os disparam.

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                                                                                                   | Arquivos-alvo                                                                                                                                                                    | Depende                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 11-1  | Migrar notificações para `/accounts/:account_id/notifications` com `index` 1:1 (meta/payload, filtros `read`/`snoozed`, page 15, sort) e `update`/`destroy`/`destroy_all`/`unread_count` | `apps/server/src/routes/v1/notifications.ts`, `packages/core/src/services/notifications.ts`, `packages/core/src/schemas/notifications.ts`, `apps/web/src/lib/notifications.ts`   | —                      |
| 11-2  | `read_all` por `primary_actor`, `unread`/`snooze` com epoch e status/envelopes Rails                                                                                                     | idem 11-1                                                                                                                                                                        | 11-1                   |
| 11-3  | Jobs de notificação (delete/dedupe/reopen/retention) + cron local                                                                                                                        | `packages/core/src/jobs/` (novo), `packages/core/src/services/notifications.ts`                                                                                                  | 14                     |
| 11-4  | `notification_settings` 1:1 (`selected_*`, `all_*`, PATCH, resposta raw) + default do vínculo só `conversation_assignment` em criação/convite/seed                                       | `apps/server/src/routes/v1/engagement.ts`, `packages/core/src/services/notifications.ts`, criação de vínculo (`agents`, seed), `apps/web/src/routes/_auth/app/notifications.tsx` | 11-1                   |
| 11-5  | `notification_subscriptions` create/destroy + builder por `identifier` (move subscription entre usuários)                                                                                | `apps/server/src/routes/v1/` (nova rota), `packages/core/src/services/subscriptions.ts` (novo), schemas                                                                          | —                      |
| 11-6  | WebPush: `sw.js`, VAPID e subscribe/unsubscribe no toggle de permissão                                                                                                                   | `apps/web/public/sw.js`, lib de push (novo), página de preferências                                                                                                              | 11-5                   |
| 11-7  | Realtime `notification.updated/deleted` + payload `{notification, unread_count, count}` e handlers no front                                                                              | `packages/core/src/realtime/index.ts`, `packages/core/src/services/notifications.ts`, `apps/web/src/hooks/useCable.ts`, `NotificationBell.tsx`                                   | 11-1                   |
| 11-8  | Emissores 1:1: `conversation_creation`, `assigned_conversation_new_message` vs participating, `secondary_actor`, dedupe, bloqueio e visibilidade                                         | `packages/core/src/services/notifications.ts`, `services/conversations.ts`, `services/messages.ts`                                                                               | 02                     |
| 11-9  | Menções 1:1: nota privada, `(mention://...)`, filtro inbox/admins, participants e self-mention                                                                                           | `packages/core/src/services/notifications.ts`, `packages/core/src/services/messages.ts`                                                                                          | 11-8                   |
| 11-10 | Sino completo: dropdown com read/unread/delete/snooze (presets + modal), contadores do evento e badge                                                                                    | `apps/web/src/components/notifications/NotificationBell.tsx` (+ modal snooze)                                                                                                    | 11-1, 11-2, 11-7       |
| 11-11 | Página `inbox_view` 1:1: lista paginada, filtros snoozed/read + sort, detalhe da conversa, mark-all/delete-all/delete-read                                                               | `apps/web/src/routes/_auth/app/notifications.tsx`, `components/notifications/*`, `app-sidebar.tsx`                                                                               | 11-10                  |
| 11-12 | Preferências do perfil (grade tipo × email/push) + som (`AudioAlerts`)                                                                                                                   | componentes novos em `apps/web/src/components/settings/`, rota `settings/profile` (com 12; verificar)                                                                            | 11-4, 11-6             |
| 11-13 | Busca API: sub-rotas + `messages`, `{payload}`, paginação/`since/until/from/inbox_id`, acesso por inbox, `q` opcional                                                                    | `packages/core/src/services/search.ts`, `apps/server/src/routes/v1/engagement.ts`, schemas de busca                                                                              | 02                     |
| 11-14 | Página `SearchView` (abas, recentes, filtros, paginação) + ajustes do palette para os links reais                                                                                        | `apps/web/src/routes/_auth/app/` (novo), `apps/web/src/components/search/*`                                                                                                      | 11-13                  |
| 11-15 | Command bar `⌘K` com seções/ações/atalhos (navegação, inbox, conversa, aparência, macros, bulk, snooze)                                                                                  | `apps/web/src/components/search/CommandPalette.tsx` (+ `components/commands/*` novos)                                                                                            | 11-14; ações com 02/06 |
| 11-16 | Views salvas 1:1: wrapper `custom_filter`, `filter_type`, `show`, limite 1000, 204 no delete + sidebar/editar/segmentos                                                                  | `apps/server/src/routes/v1/engagement.ts`, `packages/core/src/services/notifications.ts`, `ConversationsPage.tsx`, `app-sidebar.tsx`                                             | —                      |
| 11-17 | Testes/evidência: contract smoke dos endpoints, e2e assign→sino→read, shots das 3 telas                                                                                                  | `scripts/e2e.mjs`, `packages/core/src/services/*.test.ts`, `scripts/shot.mjs`                                                                                                    | 11-1…11-16             |

## 6. Aceite

```bash
bun run check-types && bunx oxlint
bun scripts/db-roundtrip-check.mjs
bun scripts/parity-report.mjs --write-doc
bun scripts/e2e.mjs
bun scripts/shot.mjs
```

Smoke manual de contrato (mesmos path/status/envelope do Rails):

```bash
# index account-scoped, default não-lidas e não-snoozed
curl -s "$SERVER/api/v1/accounts/$ACC/notifications" -H "Authorization: Bearer $TOKEN" | jq '.data.meta, (.data.payload|length)'
# unread_count devolve inteiro puro
curl -s "$SERVER/api/v1/accounts/$ACC/notifications/unread_count" -H "Authorization: Bearer $TOKEN"
# settings raw com selected_*/all_*
curl -s "$SERVER/api/v1/accounts/$ACC/notification_settings" -H "Authorization: Bearer $TOKEN" | jq 'keys'
# subscription idempotente por endpoint
curl -s -X POST "$SERVER/api/v1/notification_subscriptions" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"notification_subscription":{"subscription_type":"browser_push","subscription_attributes":{"endpoint":"e1","p256dh":"k","auth":"a"}}}' | jq '.id, .subscription_type'
# busca com payload sem data
curl -s "$SERVER/api/v1/accounts/$ACC/search?q=test" -H "Authorization: Bearer $TOKEN" | jq 'keys'
```

- [ ] **e2e assign→sino→read** em `scripts/e2e.mjs`: agente A atribui a conversa → agente B recebe
      `notification.created` (WS com `{notification, unread_count, count}`) → `GET .../notifications`
      lista o item em `data.payload` → `PATCH .../notifications/:id {read_at:true}` → `unread_count` cai
      e o badge/estado do sino reflete sem refetch; `read_all` por `primary_actor_id` também coberto.
- [ ] Todos os endpoints do §4.1 com mesmo path/método/status/envelope (smoke acima) e DDL intacto
      (`db-roundtrip-check` verde).
- [ ] `bun scripts/parity-report.mjs --write-doc` mostra as áreas `notifications`, `search` e
      `custom_filters` com as ações do módulo cobertas (nenhum controller OSS do módulo fora).
- [ ] Visual lado a lado em `shots/`: `/app/notifications`, busca global e command bar vs
      `chatwoot/.github/screenshots` (ou screenshots do 4.17.1), com vazio/loading/erro.
- [ ] WebPush: com permissão concedida, a subscription aparece em `notification_subscriptions`; revogar
      remove; falha de permissão não quebra a página.

## 7. Fora de escopo

- **Enterprise:** notificações de SLA (tipos 6–8), reporting/campaigns, copilot e calls.
- **I18n e pipeline/CI** (decisão de escopo do roadmap).
- **Envio de e-mail/push** (`EmailNotificationJob`/`PushNotificationJob`, SMTP, FCM, digest) → módulo 14;
  aqui ficam apenas flags e a subscription.
- **Contadores de não lidas por conversa/filtro** (`conversation_unread_counts`, `filtered_unread_counts`)
  → módulo 02; a inbox badge desta página usa `notifications` (OSS 4.17.1).
- **Busca pública do portal** (`public/api/v1/portals/search#index`) e `public/api/v1/portals/search`
  enterprise → módulos 08/09.
- **Busca avançada com Elasticsearch/OpenSearch** (`advanced_search`, `search_with_gin`): fica a
  implementação SQL (ILIKE), com o mesmo contrato de params.
- **Widget unread badge / som do widget** → módulo 09.

## 8. Definição de done

1. Tarefas `11-1`…`11-17` marcadas `[x]` com as evidências (saída de comandos/curls) no PR.
2. `bun run check-types && bunx oxlint` e `bun scripts/db-roundtrip-check.mjs` verdes.
3. `bun scripts/e2e.mjs` verde **duas vezes seguidas** com o fluxo assign→sino→read incluído.
4. `bun scripts/parity-report.mjs --write-doc` regenerado; `docs/specs/paridade-mapa.md` sem lacunas
   nas áreas `notifications`, `search` e `custom_filters`.
5. `shots/` com as três telas comparadas (sino/página, busca, command bar) e estados vazio/loading/erro.
6. Status desta linha atualizado em `roadmap.md` (11 → ✅) e no arquivo do paridade-mapa.
