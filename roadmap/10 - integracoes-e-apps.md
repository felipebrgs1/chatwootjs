# 10 — Integrações e Apps

> **Estágio:** 10/15 · **Status:** 1 de 12 subáreas verdes · 0 de 2 áreas de API (0% ponderado) · **Depende de:** 01, 09
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`)
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

Entregar o catálogo de integrações OSS e os apps acoplados ao dashboard: `dashboard_apps`
(CRUD + embed iframe na conversa), `integrations/apps` (catálogo), `integrations/hooks`
(genérico), Slack, Linear, Notion, Shopify, Dyte (account + widget), OAuth de integração,
`branded_email_layouts` e a UI `settings/integrations` 1:1 com o v4.

Critérios objetivos de 100% (todos verificáveis localmente, sem credencial real):

1. **API 1:1:** as 36 actions da área `integrations` (24 de `integrations/*`, 5 de
   `dashboard_apps`, 2 de `branded_email_layouts`, 1 de `slack_uploads`, 2 de callbacks
   Linear/Shopify, 1 de `api/v1/integrations/webhooks`, 1 de `widget/integrations/dyte`)
   **e** as actions de integração da área `oauth_authorizations` (Notion authorization/callback)
   respondem no mesmo path/método, com o mesmo
   status e o **mesmo envelope do Rails** — inclusive onde ele foge do `{ data, meta }`:
   `apps#index` → `{ payload: [...] }`, `dashboard_apps#index` e `linear#*` → array/objeto
   cru, `dashboard_apps#destroy` → 204, `hooks#destroy`/`slack#destroy` → 200 vazio,
   `branded_email_layout` → `{ branded_email_layout: ... }`.
2. **Hooks:** `integrations_hooks` em uso real; `process_event` devolve
   `{ message }`, `{ message: null }` ou `{ error }` 422 como o Rails; `visible_properties`
   filtram `settings` na resposta.
3. **Dashboard Apps:** CRUD + abas iframe na conversa com o protocolo do original
   (`chatwoot-dashboard-app:fetch-info` → evento `appContext` com conversa/contato/agente/
   atributos/tema).
4. **Slack ponta a ponta com mock HTTP:** OAuth `create` → canais → `reference_id`/
   `message_mode` → `chat.postMessage` no mock a cada mensagem → webhook inbound assinado
   (`url_verification` e `event_callback message`) cria mensagem na thread.
5. **Linear ponta a ponta com mock GraphQL:** teams/entities/create/link/unlink/linked/
   search + mensagens de atividade na conversa + callback OAuth + revoke no destroy.
6. **Notion, Shopify e Dyte** com mock: authorization/callback criam hook; orders com
   `admin_url`; Dyte cria meeting e mensagem `content_type=integrations` (dashboard e
   widget do contato).
7. **branded_email_layouts:** show/update admin-only, flag `branded_email_templates`,
   validação de `{{ content_for_layout }}` e limite de 256 KB; `null`/vazio apaga.
8. **UI 1:1:** rotas `settings/integrations` (cards), `dashboard_apps`, `webhook`,
   `:integration_id`, `slack`, `linear`, `notion`, `shopify` com estados vazio/loading/
   erro, e abas de dashboard apps na conversa — comparação lado a lado com o v4.
9. **Aceite local verde:** `check-types`, `oxlint`, `parity-report` (módulo 10 sobe),
   `db-roundtrip-check` (sem drift) e `scripts/e2e-integrations.mjs`.

**Não conta como 100%:** mock que responde sem request registrado; UI sem chamar a API
real; alterar DDL (trilha D fechada); declarar providers funcionando sem payload de teste;
e incluir os apps `openai`, `dialogflow`, `google_translate` e `leadsquared` (ver §7).

## 2. Estado atual (medido)

| Subárea                                     | Status | Evidência no nosso repo                                                                                                                                | Lacuna principal                                                |
| ------------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Dashboard apps (API + embed)                |   ❌   | tabela `dashboard_apps` em `packages/db/src/schema/inbox-members.ts`; nenhum service/rota/view                                                         | CRUD 1:1, abas + iframe `Frame` na conversa                     |
| Catálogo `integrations/apps`                |   ❌   | sem equivalente de `config/integration/apps.yml`; `integrations_hooks` sem uso                                                                         | index/show, `active?`/`enabled?`/`action`/`hooks`               |
| Hooks (create/update/process_event/destroy) |   ❌   | tabela `integrations_hooks` em `packages/db/src/schema/webhooks.ts`                                                                                    | service + rotas + policy admin (process_event livre p/ agente)  |
| Slack                                       |   ❌   | padrão aproveitável em `packages/core/src/services/agent-bots.ts` (listener + fetch)                                                                   | OAuth, canais, envio via job, webhook inbound assinado, uploads |
| Linear                                      |   ❌   | —                                                                                                                                                      | 8 actions + callback + activity messages                        |
| Notion                                      |   ❌   | —                                                                                                                                                      | authorization + callback + destroy                              |
| Shopify                                     |   ❌   | —                                                                                                                                                      | auth/orders/callback/destroy                                    |
| Dyte                                        |   ❌   | —                                                                                                                                                      | meetings (account + widget) e bolha `integrations`              |
| OAuth de integração                         |   ❌   | flags `linear_integration`/`notion_integration`/`shopify_integration`/`branded_email_templates` já geradas em `packages/core/src/lib/feature-flags.ts` | base de `state` assinado, authorization e callbacks             |
| `branded_email_layouts`                     |   ❌   | tabela `email_templates` em `packages/db/src/schema/platform.ts`; sem service/rota                                                                     | show/update + resolução de layout                               |
| UI `settings/integrations`                  |   ❌   | `apps/web/src/routes/_auth/app/settings/` não tem `integrations/`; sidebar lista só "Webhooks" (`apps/web/src/components/app-sidebar.tsx`)             | Index, páginas por app, DashboardApps, hooks, Slack             |
| Webhooks de saída (card "webhook")          |   ✅   | `packages/core/src/services/webhooks.ts` + `apps/server/src/routes/v1/webhooks.ts` + `apps/web/.../settings/webhooks.tsx`                              | só falta o card no catálogo apontando para a página existente   |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                                                            | O que dita para nós                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `app/controllers/api/v1/accounts/integrations/*`                                                                                                                       | contrato das 24 actions (apps, hooks, slack, linear, notion, shopify, dyte)   |
| `app/controllers/api/v1/accounts/dashboard_apps_controller.rb` + `app/views/api/v1/models/_dashboard_app.json.jbuilder`                                                | CRUD e shape `{ id, title, content, created_at }`                             |
| `app/controllers/api/v1/accounts/branded_email_layouts_controller.rb` + `app/models/email_template.rb`                                                                 | show/update, flag, `{{ content_for_layout }}`, 256 KB                         |
| `app/controllers/api/v1/integrations/webhooks_controller.rb` + `lib/integrations/slack/incoming_message_builder.rb`                                                    | webhook inbound do Slack (HMAC, `url_verification`, `message`, `link_shared`) |
| `lib/integrations/slack/{hook_builder,channel_builder,send_on_slack_service}.rb` + `app/jobs/send_on_slack_job.rb`                                                     | OAuth/canais/envio outbound                                                   |
| `lib/integrations/linear/*` + `app/services/linear/activity_message_service.rb` + `app/controllers/linear/callbacks_controller.rb`                                     | GraphQL, activity messages e callback OAuth                                   |
| `app/controllers/api/v1/accounts/notion/authorizations_controller.rb` + `app/controllers/notion/callbacks_controller.rb`                                               | OAuth do Notion                                                               |
| `app/controllers/api/v1/accounts/integrations/shopify_controller.rb` + `app/controllers/shopify/callbacks_controller.rb` + `app/helpers/shopify/integration_helper.rb` | auth/orders/callback com JWT de `state`                                       |
| `lib/integrations/dyte/processor_service.rb` + `lib/dyte.rb`                                                                                                           | RealtimeKit (meetings/participantes)                                          |
| `app/controllers/api/v1/accounts/oauth_authorization_controller.rb` + `app/controllers/oauth_callback_controller.rb`                                                   | base de OAuth/state (admin-only; canais ficam em 04/09)                       |
| `config/integration/apps.yml` + `app/models/integrations/{app,hook}.rb`                                                                                                | catálogo, `active?`, `enabled?`, `hook_type`, `allow_multiple_hooks`          |
| `app/javascript/dashboard/routes/dashboard/settings/integrations/**` + `components/widgets/DashboardApp/Frame.vue` + `components/widgets/conversation/linear/**`       | UI e comportamento a portar                                                   |
| `db/schema.rb` (`dashboard_apps`, `integrations_hooks`, `email_templates`)                                                                                             | dados — DDL já fechado na trilha D, **não alterar**                           |

## 4. Lacunas detalhadas

> Envelopes divergentes por action estão anotados em cada bullet; o smoke deve comparar
> com o jbuilder do Rails, não com o padrão `{ data }` genérico. **Status de permissão:**
> o Rails devolve **401** via Pundit (`NotAuthorizedError`); nosso `requireAdmin` hoje
> devolve **403** — padronizar/decidir antes de congelar o smoke (`(verificar)`).

### 4.1 API

**Dashboard apps** — `apps/server/src/routes/v1/dashboard-apps.ts` + `packages/core/src/services/dashboard-apps.ts`:

- [ ] `GET /api/v1/accounts/:account_id/dashboard_apps` — `DashboardAppsController#index` — 200 **array cru** `[{ id, title, content, created_at }]`; **membro autenticado** (policy `index?`/`show?` = true); create/update/destroy admin-only.
- [ ] `GET .../dashboard_apps/:id` — `#show` — 200 objeto; 404 inexistente.
- [ ] `POST .../dashboard_apps` — `#create` — body `{ dashboard_app: { title, content: [{ type, url }] } }`, `user_id` = auth; 200 objeto (Rails **não** usa 201).
- [ ] `PATCH .../dashboard_apps/:id` — `#update` — 200 objeto; 422 `title`/`url` inválidos.
- [ ] `DELETE .../dashboard_apps/:id` — `#destroy` — **204** `head :no_content`; 404 se não for da conta.

**Catálogo de apps** — `apps/server/src/routes/v1/integrations/apps.ts` + `packages/core/src/services/integrations-apps.ts`:

- [ ] `GET .../integrations/apps` — `AppsController#index` — 200 `{ payload: [app] }`; só apps `active?(account)`; membro recebe shape básico, admin recebe params do apps.yml + `action`; sempre `hooks` da conta.
- [ ] `GET .../integrations/apps/:id` — `#show` — 200 objeto app direto (sem wrapper); 404 app inexistente.

**Hooks** — `apps/server/src/routes/v1/integrations/hooks.ts` + `packages/core/src/services/integrations-hooks.ts`:

- [ ] `POST .../integrations/hooks` — `HooksController#create` — admin (HookPolicy); body `{ hook: { app_id, inbox_id?, status?, settings: {} } }`; 200 hook (shape `_hook.json.jbuilder` com `settings` filtrado por `visible_properties`); 422 feature/validação.
- [ ] `PATCH .../integrations/hooks/:id` — `#update` — admin; só `status` e `settings`; 200 hook.
- [ ] `POST .../integrations/hooks/:id/process_event` — `#process_event` — body `{ event }`; **agente permitido** (`process_event?` true); `{ message }` / `{ message: null }` / `{ error }` 422.
- [ ] `DELETE .../integrations/hooks/:id` — `#destroy` — admin; **200 vazio** (`head :ok`, não 204).
- [ ] `GET .../integrations/hooks/:id` — rota existe no Rails sem action no controller (`(verificar)`): front antigo chama `showHook`; decidir 404 explícito e registrar a divergência.

**Slack** — `apps/server/src/routes/v1/integrations/slack.ts` + `packages/core/src/services/slack.ts`:

- [ ] `POST .../integrations/slack` — `#create` — admin; body `{ code, inbox_id? }`; troca OAuth em `https://slack.com/api/oauth.v2.access` com `SLACK_CLIENT_ID`/`SECRET`; cria hook `status: disabled`; 200 **app partial**.
- [ ] `GET .../integrations/slack/list_all_channels` — `#list_all_channels` — 200 `[{ id, name }]` (private primeiro, depois public paginado); erro do Slack → 422.
- [ ] `PATCH .../integrations/slack` — `#update` — `{ reference_id }` → `conversations.join` + `enabled` + `channel_name`; `{ message_mode: "two_way"|"alert" }` → merge em `settings`; 422 `{ error: invalid_channel_id }`.
- [ ] `DELETE .../integrations/slack` — `#destroy` — 200 vazio; 404 se não houver hook `slack`.
- [ ] `POST /api/v1/integrations/webhooks` — `Integrations::WebhooksController#create` — HMAC SHA256 `v0:{ts}:{raw_body}` vs `X-Slack-Signature`, tolerância 5 min, 401 se inválido, **skip se `SLACK_SIGNING_SECRET` vazio**; `url_verification` → `{ challenge }`; `event_callback` mensagem (subtype vazio/`file_share`) cria mensagem via `reference_id`; `link_shared` agenda unfurl; `render json: response` (nil → `null`).
- [ ] `GET /slack_uploads?blob_key=&sender_type=` — `SlackUploadsController#show` — 302 para o blob (resize 250 se imagem) ou fallback `{FRONTEND_URL}/integrations/slack/{sender_type}.png`.

**Linear** — `apps/server/src/routes/v1/integrations/linear.ts` + `packages/core/src/services/linear.ts`:

- [ ] `GET .../integrations/linear/teams` — 200 array de teams; 422 `{ error }`.
- [ ] `GET .../integrations/linear/team_entities?team_id=` — 200 `{ users, projects, states, labels }`; 422 sem `team_id`.
- [ ] `POST .../integrations/linear/create_issue` — body `team_id`, `title`, `conversation_id`, demais opcionais; 200 `{ id, title, identifier }` + mensagem de atividade `issue_created`; 422 validação.
- [ ] `POST .../integrations/linear/link_issue` — `{ conversation_id, issue_id, title }` → 200 `{ id, link, link_id }` + atividade `issue_linked`.
- [ ] `POST .../integrations/linear/unlink_issue` — `{ conversation_id, link_id, issue_id }` → 200 `{ link_id }` + atividade `issue_unlinked`.
- [ ] `GET .../integrations/linear/linked_issues?conversation_id=` — 200 array (attachments da URL da conversa).
- [ ] `GET .../integrations/linear/search_issue?q=` — 200 array; `q` vazio → 422 `{ error: "Specify search string with parameter q" }`.
- [ ] `DELETE .../integrations/linear/destroy` — admin; revoga token (`POST https://api.linear.app/oauth/revoke`, fallback `refresh_token`) e apaga hook; 200; falha do revoke só loga.
- [ ] `GET /linear/callback` — troca `code` em `https://api.linear.app/oauth/token`; valida `state` JWT HS256 `{ sub: account_id, iat }`; cria/atualiza hook enabled com `token_type/expires_in/expires_on/scope/refresh_token`; 302 para `settings/integrations/linear`; sem code/state → 302 base.

**Notion** — `apps/server/src/routes/v1/integrations/notion.ts` + callback:

- [ ] `POST /api/v1/accounts/:account_id/notion/authorization` — `AuthorizationsController#create` — admin; 200 `{ success: true, url }` com `state` assinado (Rails usa `to_sgid`; nosso equivalente JWT — `(verificar)`) e basic auth; 422 `{ success: false }`.
- [ ] `GET /notion/callback` — troca `code` em `https://api.notion.com/v1/oauth/token`; cria hook enabled com `workspace_name/id/icon`, `bot_id`, `owner`; 302 `settings/integrations/notion`.
- [ ] `DELETE .../integrations/notion/destroy` — admin; 200 vazio.

**Shopify** — `apps/server/src/routes/v1/integrations/shopify.ts` + callback:

- [ ] `POST .../integrations/shopify/auth` — sem gate admin no Rails (front restringe a admin — `(verificar)`); body `{ shop_domain }`; 422 sem domínio; `{ redirect_url }` para `https://{shop}/admin/oauth/authorize?client_id=&scope=read_customers,read_orders,read_fulfillments&redirect_uri={FRONTEND_URL}/shopify/callback&state={JWT}`.
- [ ] `GET .../integrations/shopify/orders?contact_id=` — 200 `{ orders: [...] }` com `admin_url`; 422 `Contact information missing`; 404 sem hook.
- [ ] `DELETE .../integrations/shopify` — admin; 200; erro do provider → 422 `{ error }`.
- [ ] `GET /shopify/callback` — valida `state` JWT, troca `code` em `https://{shop}/admin/oauth/access_token`, cria hook com `reference_id = shop`; 302 `settings/integrations/shopify` ou `?error=true`.

**Dyte** — `apps/server/src/routes/v1/integrations/dyte.ts` + widget:

- [ ] `POST .../integrations/dyte/create_a_meeting` — body `{ conversation_id }` (display_id); cria meeting (`POST /accounts/{account}/realtime/kit/{app}/meetings`) e mensagem `content_type=integrations` com `data.meeting_id`/`participants`; 200 payload; 422 sem credenciais.
- [ ] `POST .../integrations/dyte/add_participant_to_meeting` — `{ message_id }`; 422 se `content_type != "integrations"`; reusa participant por `Client:{id}` e devolve token; 200/422.
- [ ] `POST /public/api/v1/widgets/:website_token/integrations/dyte/add_participant_to_meeting` — ação gêmea no widget para o contato; seguir o path do módulo 09 (`(verificar)` o path exato do nosso widget).

**OAuth de integração e branded email** — `packages/core/src/services/oauth.ts` + `branded-email-layouts.ts`:

- [ ] Base de `OauthAuthorizationController#check_authorization` (admin) + `state` assinado com expiração de 15 min e propósito `onboarding`/`default`; reuso por Notion/Linear/Shopify (canais Google/Microsoft/Instagram/TikTok/Twitter ficam nos módulos 04/09).
- [ ] `GET /api/v1/accounts/:account_id/branded_email_layout` — admin; 200 `{ branded_email_layout: body | null }`.
- [ ] `PATCH /api/v1/accounts/:account_id/branded_email_layout` — admin; sem flag `branded_email_templates` → 422 `'Branded email templates feature is not enabled'`; `"null"`/vazio apaga; exige `{{ content_for_layout }}` e ≤ 256 KB; 200 `{ branded_email_layout }`.

### 4.2 Front

- [ ] `_auth/app/settings/integrations/index.tsx` — `Index.vue` + `IntegrationItem.vue` — cards com logo, nome, descrição, status Enabled/Disabled e botão Configure; busca por nome/descrição; `GET integrations/apps`.
- [ ] `_auth/app/settings/integrations/dashboard_apps.tsx` — `DashboardApps/{Index,Modal,Row}.vue` — tabela Nome/Endpoint/Ações, modal criar/editar (`type: 'frame'` + URL), confirmação de exclusão.
- [ ] `_auth/app/settings/integrations/webhook.tsx` — card "webhook" cai no `Webhooks/Index.vue`; reaproveitar `apps/web/.../settings/webhooks.tsx` (rota atual `/app/settings/webhooks` vira alias/redirect — `(verificar)`).
- [ ] `_auth/app/settings/integrations/$integrationId.tsx` — `IntegrationHooks.vue` + `Single/MultipleIntegrationHooks.vue` + `NewHook.vue` — single vs multiple, hook account vs inbox, formulário a partir de `settings_form_schema`, enable/disable e delete.
- [ ] `_auth/app/settings/integrations/slack.tsx` — `Slack.vue` + `SelectChannelWarning.vue` + `SlackMessageMode.vue` — consome `?code=`, select de canal, modo `two_way`/`alert`, desconectar.
- [ ] `_auth/app/settings/integrations/linear.tsx` — `Linear.vue` — connect/reconnect/disconnect; painel de issues na conversa (`components/widgets/conversation/linear/{CreateIssue,IssuesList,LinkIssue,IssueHeader}.vue`) no painel do contato.
- [ ] `_auth/app/settings/integrations/notion.tsx` — `Notion.vue` — botão authorize chama `POST notion/authorization` e redireciona para `url`.
- [ ] `_auth/app/settings/integrations/shopify.tsx` — `Shopify.vue` — valida `*.myshopify.com`, chama `auth`, redireciona; pedidos no painel do contato — `(verificar)` paridade do orders.
- [ ] Conversa (`apps/web/src/components/conversations/`) — abas de dashboard apps acima da thread + `Frame.tsx`: iframe, listener `chatwoot-dashboard-app:fetch-info` → `postMessage({ event: 'appContext', data: { conversation, contact, currentAgent, customAttributes, theme } })`, reenvio ao trocar tema.
- [ ] Conversa — bolha para `content_type=integrations` (Dyte) com join/entrar e `VideoCallButton` no composer (`components-next/message/bubbles/Dyte.vue`, `widgets/VideoCallButton.vue`).
- [ ] `app-sidebar.tsx` — item "Integrações" em Configurações apontando para `/app/settings/integrations`; strings pt-BR no padrão das settings atuais (sem trabalho de i18n neste módulo).

### 4.3 Dados, jobs e realtime

- [ ] Usar sem DDL: `dashboard_apps.content` (jsonb), `integrations_hooks` (`status`, `hook_type`, `reference_id`, `access_token`, `settings`, `app_id`) e `email_templates` (`name='base'`, `template_type=0 layout`, `locale` en, `account_id`).
- [ ] Jobs no padrão `jobs.dispatch` + registro no boot (como `registerWebhookJob`): `send_on_slack` (message.created → `chat.postMessage`), `slack_unfurl`, `update_slack_message`; `linear.activity_message` pode ser síncrono como no Rails.
- [ ] Realtime: mensagem criada por webhook do Slack e por Dyte deve passar pelo mesmo caminho de `publish("message.created")` (padrão `packages/core/src/services/agent-bots.ts`) para aparecer no WS.
- [ ] Gateways externos com base URL sobrescrevível por env para mock (nunca hardcode): `SLACK_API_URL`, `LINEAR_API_URL`, `NOTION_API_URL`, `SHOPIFY_SHOP_DOMAIN`, `DYTE_API_URL`; credenciais via `.env` (`SLACK_CLIENT_ID/SECRET/SIGNING_SECRET`, `LINEAR_CLIENT_ID/SECRET`, `NOTION_CLIENT_ID/SECRET`, `SHOPIFY_CLIENT_ID/SECRET`) + `FRONTEND_URL`.
- [ ] Feature flags: `integrations`, `linear_integration`, `notion_integration`, `shopify_integration`, `branded_email_templates` já mapeadas em `packages/core/src/lib/feature-flags.ts` — ler de `accounts.feature_flags` sem novo mecanismo.
- [ ] Provedores externos e credenciais (para implementar e mockar):

| Integração | Precisa para funcionar                                 | Endpoints externos                                                                                | Mock/aceite                                             |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Slack      | `SLACK_CLIENT_ID/SECRET/SIGNING_SECRET`                | `oauth.v2.access`, `conversations.list/join`, `chat.postMessage`, `chat.unfurl`, `files.uploadV2` | mock registra requests; assinatura HMAC gerada no teste |
| Linear     | `LINEAR_CLIENT_ID/SECRET` (+ refresh)                  | `POST /graphql`, `POST /oauth/token`, `POST /oauth/revoke`                                        | mock GraphQL com canary de queries                      |
| Notion     | `NOTION_CLIENT_ID/SECRET`                              | `/v1/oauth/authorize`, `/v1/oauth/token`                                                          | mock devolve `workspace_*`/`bot_id`                     |
| Shopify    | `SHOPIFY_CLIENT_ID/SECRET`                             | `/admin/oauth/authorize`, `/admin/oauth/access_token`, `customers/search.json`, `orders.json`     | mock por `shop_domain` + state JWT                      |
| Dyte       | settings do hook (`account_id`, `app_id`, `api_token`) | `POST .../realtime/kit/{app}/meetings`, participants, token                                       | mock RealtimeKit com preset `group-call-host`           |

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                           | Arquivos-alvo                                                                                                                              | Depende                                 |
| ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| 10-1  | Service + schemas de dashboard apps (CRUD, admin-only, 204 no destroy)                           | `packages/core/src/services/dashboard-apps.ts`, `packages/core/src/schemas/dashboard-apps.ts`                                              | —                                       |
| 10-2  | Rotas `dashboard_apps` + mount `/api/v1`                                                         | `apps/server/src/routes/v1/dashboard-apps.ts`, `apps/server/src/routes/v1/index.ts`                                                        | 10-1                                    |
| 10-3  | Página Dashboard Apps (lista/modal/delete)                                                       | `apps/web/src/routes/_auth/app/settings/integrations/dashboard_apps.tsx`                                                                   | 10-2                                    |
| 10-4  | Embed na conversa: abas + `Frame` iframe/postMessage/tema                                        | `apps/web/src/components/conversations/Frame.tsx`, `ConversationsPage.tsx`                                                                 | 10-2, 01                                |
| 10-5  | Catálogo de apps (config apps.yml, `active?`, `enabled?`, `action`, state JWT)                   | `packages/core/src/services/integrations-apps.ts`, `packages/core/src/lib/integration-apps.ts`                                             | —                                       |
| 10-6  | Rotas `integrations/apps` (index `{payload}`, show)                                              | `apps/server/src/routes/v1/integrations/apps.ts`                                                                                           | 10-5                                    |
| 10-7  | Service de hooks + `process_event` + policy (admin; process_event agente)                        | `packages/core/src/services/integrations-hooks.ts`, `packages/core/src/schemas/integrations.ts`                                            | 10-5                                    |
| 10-8  | Rotas de hooks (200 vazio no destroy, 422 do process_event)                                      | `apps/server/src/routes/v1/integrations/hooks.ts`                                                                                          | 10-7                                    |
| 10-9  | Front: index de integrações + cards + hooks/formulários                                          | `apps/web/src/routes/_auth/app/settings/integrations/index.tsx`, `$integrationId.tsx`, `new-hook.tsx`                                      | 10-6, 10-8                              |
| 10-10 | Slack service: OAuth, canais (join/enabled), message_mode, destroy                               | `packages/core/src/services/slack.ts`                                                                                                      | 10-7                                    |
| 10-11 | Slack inbound: HMAC, `url_verification`, `message`/`file_share`, `link_shared`                   | `apps/server/src/routes/v1/integrations-webhooks.ts`, `packages/core/src/services/slack-incoming.ts`                                       | 10-10                                   |
| 10-12 | Slack outbound: job `send_on_slack` + listener `message.created` (texto + anexos)                | `packages/core/src/services/slack-send.ts`, `packages/core/src/jobs/*`                                                                     | 10-10                                   |
| 10-13 | `GET /slack_uploads` com redirect/avatar fallback                                                | `apps/server/src/routes/slack-uploads.ts`                                                                                                  | 14 (storage)                            |
| 10-14 | Front Slack (canal, warning, message mode, `?code=`)                                             | `apps/web/src/routes/_auth/app/settings/integrations/slack.tsx`                                                                            | 10-10                                   |
| 10-15 | Linear service: GraphQL + 8 actions + activity messages                                          | `packages/core/src/services/linear.ts`, `packages/core/src/services/linear-activity.ts`                                                    | 10-7                                    |
| 10-16 | Linear callback + state JWT + revoke no destroy                                                  | `apps/server/src/routes/linear-callback.ts`, `packages/core/src/services/linear-auth.ts`                                                   | 10-15                                   |
| 10-17 | Front Linear + painel de issues na conversa                                                      | `apps/web/src/routes/_auth/app/settings/integrations/linear.tsx`, `apps/web/src/components/conversations/linear/*`                         | 10-15                                   |
| 10-18 | Notion: authorization + callback + destroy + front                                               | `apps/server/src/routes/v1/notion-authorization.ts`, `apps/server/src/routes/notion-callback.ts`, `apps/web/.../integrations/notion.tsx`   | 10-5, 10-7                              |
| 10-19 | Shopify: auth/orders/callback/destroy + front                                                    | `apps/server/src/routes/v1/integrations/shopify.ts`, `apps/server/src/routes/shopify-callback.ts`, `apps/web/.../integrations/shopify.tsx` | 10-5, 10-7                              |
| 10-20 | Dyte: service account + ação widget + bolha `integrations`/`VideoCallButton` + front             | `packages/core/src/services/dyte.ts`, `apps/server/src/routes/v1/integrations/dyte.ts`, `apps/web/.../integrations/dyte.tsx`               | 09                                      |
| 10-21 | `branded_email_layouts` show/update + validações e flag                                          | `packages/core/src/services/branded-email-layouts.ts`, `apps/server/src/routes/v1/branded-email-layout.ts`                                 | 10-7                                    |
| 10-22 | Base OAuth de integração (state assinado/expiração/admin) compartilhada                          | `packages/core/src/services/oauth.ts`                                                                                                      | —                                       |
| 10-23 | Harness de mock HTTP + env overrides + docs por integração                                       | `scripts/mock-integrations.mjs`, `.env.example`, `docs/integracoes/*.md`                                                                   | —                                       |
| 10-24 | E2E do módulo (hook Slack no mock, dashboard app, Linear, Dyte)                                  | `scripts/e2e-integrations.mjs`                                                                                                             | 10-4, 10-11, 10-12, 10-15, 10-20, 10-23 |
| 10-25 | Front: item na sidebar + rotas e conferência do `parity-report` (fragmentos OAuth `(verificar)`) | `apps/web/src/components/app-sidebar.tsx`, `scripts/parity-report.mjs`                                                                     | 10-2, 10-6, 10-8, 10-9                  |
| 10-26 | Evidência visual + atualizar `roadmap.md`/`paridade-mapa.md`                                     | `shots/`, `roadmap.md`, `docs/specs/paridade-mapa.md`                                                                                      | todas                                   |

## 6. Aceite

```bash
# qualidade e guarda de DDL
bun run check-types && bunx oxlint
bun scripts/db-roundtrip-check.mjs && bun scripts/schema-diff.mjs

# métrica do módulo (esperado: área integrations ✅; front integrations ✅)
bun scripts/parity-report.mjs --json

# fluxo global continua verde
bun scripts/e2e.mjs

# específico do módulo (mock HTTP em :4599 registra requests)
bun scripts/mock-integrations.mjs &
bun scripts/e2e-integrations.mjs

# visual (API :3000 + web :3001 no ar)
bun scripts/shot.mjs
```

- [ ] Smoke cobre os 36 paths de §4.1 com o status/envelope do Rails (incluindo `{ payload }`, arrays crus, 204/200 vazios e `{ branded_email_layout }`).
- [ ] Dashboard app: criar app apontando para um iframe local de teste que responde `chatwoot-dashboard-app:fetch-info`; a conversa mostra a aba e o `appContext` recebido contém `conversation`, `contact`, `currentAgent`, `customAttributes` e `theme`.
- [ ] E2E de hook (Slack): nova mensagem incoming → `chat.postMessage` registrado no mock com `channel` = `reference_id`; `alert` não cria mensagem de resposta no Chatwoot; `url_verification` → `{ challenge }`; assinatura inválida/stale → 401.
- [ ] Linear via mock: `create_issue` gera activity message na thread; `link/unlink/linked/search` com payloads do mock; `destroy` chama `oauth/revoke`.
- [ ] Notion/Shopify/Dyte via mock: authorization/callback criam hook enabled; `orders` devolve `admin_url`; Dyte cria meeting + bolha `integrations` no dashboard e no widget.
- [ ] `branded_email_layouts`: PATCH com `{{ content_for_layout }}` persiste em `email_templates` (`base`/layout/en); sem flag → 422; `"null"` apaga; GET reflete.
- [ ] Visual lado a lado (`shots/`) de `settings/integrations` (index, dashboard_apps, webhook, slack, linear, notion, shopify) e das abas de dashboard apps na conversa.
- [ ] `bun scripts/parity-report.mjs --write-doc` regenera `docs/specs/paridade-mapa.md` com o módulo 10 atualizado, sem regressão nos demais módulos.

## 7. Fora de escopo

- **Enterprise** (licença separada): calls/voice, SLA, custom roles, captain avançado, campaign analytics, `reporting_events` — não entram aqui.
- **Apps `openai`, `dialogflow`, `google_translate` e `leadsquared`:** o CRUD genérico de hooks aceita criá-los, mas `process_event`/processors (IA, bot, tradução, CRM) ficam para os módulos 15/04/14; no pino o próprio `Integrations::Hook#process_event` devolve `'No processor found'`.
- **OAuth/callbacks de canal** (Google/Microsoft/Instagram/TikTok/Twitter/Facebook): módulos 04 e 09 reusam a base de OAuth daqui, mas os controllers e o `oauth_callback_controller` de e-mail não são entregues neste módulo.
- **i18n e pipeline/CI:** decisão de escopo do roadmap; nenhuma tarefa aqui.
- **E-mail transacional com o layout (render final):** módulo 14; aqui só persistimos/validamos o `email_templates`.
- **Slash commands do Slack:** o pino 4.17.1 não tem processor de `command` no `IncomingMessageBuilder` (payload sem `type` é ignorado) — documentar e marcar `(verificar)` se surgir requisito.
- **Dyte legado (preset `group_call_host`) e credenciais antigas:** só compatibilidade de leitura do settings, sem UI nova.

## 8. Definição de done

Para marcar o módulo 10 como 100% no `roadmap.md`:

1. Tarefas `10-1`…`10-26` concluídas e marcadas no doc.
2. Aceite de §6 verde, incluindo `scripts/e2e-integrations.mjs` commitado com mock HTTP e requests registrados (nada de "funciona na minha máquina" sem evidência).
3. `parity-report`: área `integrations` ✅ (API e front) e `oauth_authorizations` coberta pelas rotas de integração (ou parser alinhado e justificado no doc — `(verificar)` os fragmentos `/authorizations`/`/callbacks`).
4. `bun scripts/db-roundtrip-check.mjs` + `schema-diff` sem drift (nenhuma DDL nova).
5. `docs/specs/paridade-mapa.md` regenerado, `roadmap.md` atualizado para 🟡/✅ conforme o aceite, e `shots/` com as telas do módulo.
