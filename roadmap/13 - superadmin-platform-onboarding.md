# 13 — Superadmin, Platform API e onboarding

> **Estágio:** 13/15 · **Status:** 🟡 13% (API ponderado) — 1 de 3 áreas verdes (superadmin ✅; platform ❌; onboarding ❌); front de onboarding ❌ · **Depende de:** 12 (auth/conta); usa 01/04/11
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`)
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

O módulo fecha as três superfícies que ficam fora do dashboard de conta: o
console **superadmin** (`/super_admin/*`), a **Platform API v1**
(`/platform/api/v1/*`, apps server-to-server) e o **onboarding** (da conta,
no dashboard, e da instalação, no primeiro boot).

Critérios objetivos de 100% (todos verificáveis por smoke/parity-report):

1. **Console superadmin (API):** as actions públicas dos 14 controllers
   `super_admin/*` + `devise/sessions#new/create/destroy` respondem no mesmo
   path/método com os mesmos params e semântica de status (200; 401 sem
   sessão; 404; 422 em erro de form; redirects/notices viram efeito
   equivalente + JSON `{ data }`/`{ error }`). O `parity-report` não pode
   registrar action do recorte sem rota correspondente.
2. **Console superadmin (UI):** telas React equivalentes às páginas
   Administrate (`app/views/super_admin/**` + `app/dashboards/*.rb`) para
   dashboard, settings, instance status, app configs, installation configs,
   accounts (editar/seed/reset), users, account_users, agent bots,
   push diagnostics, platform apps e access tokens — com tokens de
   `packages/ui` (sem design system novo).
3. **Platform API v1:** as 21 actions dos 5 controllers respondem em
   `/platform/api/v1/*` com autenticação `api_access_token` (AccessToken com
   owner `PlatformApp`) + `platform_app_permissibles`, mesmos 401/403/422 e
   payloads dos `app/views/platform/api/v1/**`.
4. **Onboarding da conta:** `PATCH .../onboarding` (cursor
   `custom_attributes.onboarding_step`, steps `account_details`/
   `inbox_setup`, 422 para step inválido), `GET .../help_center_generation`
   (stub OSS), criação do inbox WebWidget e wizard 1:1 (account details +
   inbox setup, canais detectados, status com polling + guard de rota).
5. **Onboarding de instalação:** `GET/POST /installation/onboarding` criando
   conta + admin confirmado via `AccountBuilder`, com guard de "instalação
   nova" e tela 1:1.

**Não conta como 100%:** ter só os endpoints novos sem conferir payload dos
jbuilders/dashboards; telas sem estados vazio/loading/erro; enterprise
(help center real, billing), e-mails reais (fase 14) ou profile/MFA
(módulo 12); qualquer DDL novo (a trilha D já fechou o schema).

## 2. Estado atual (medido)

| Subárea                      | Status | Evidência no nosso repo                                                                                                                                                  | Lacuna principal                                                                                                                                                                                      |
| ---------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Console superadmin (API)     |   🟡   | `apps/server/src/routes/super-admin.ts` (9 rotas: sign_in, accounts GET/DELETE, users GET/DELETE, installation_configs GET/PUT, platform_apps GET, platform_banners GET) | dashboard, settings/refresh, instance_status, app_config, accounts update/create/seed/reset_cache, account_users, users create/update/avatar/resend, agent_bots, push diagnostics, platform_apps CRUD |
| Console superadmin (serviço) |   🟡   | `packages/core/src/services/super-admin.ts` (sign-in, list/delete, configs, apps/banners)                                                                                | instance status, dashboard stats, seed/reset cache, account_users, push test, avatar                                                                                                                  |
| Console superadmin (UI)      |   🟡   | `apps/web/src/routes/superadmin.tsx` + `superadmin/{login,accounts}.tsx` (3 telas, abas accounts/users/settings)                                                         | dashboard, nav Administrate, demais páginas, edição de conta/usuário                                                                                                                                  |
| Auth de platform app         |   ❌   | Tabelas prontas: `packages/db/src/schema/platform.ts` (`platform_apps`, `platform_app_permissibles`) e `schema/auth.ts` (`access_tokens`)                                | sem middleware `api_access_token`/permissibles; `access_tokens` só é usado p/ refresh (`services/auth.ts`)                                                                                            |
| Platform API v1              |   ❌   | 0 rotas; `paridade-mapa.md`: platform 24 ações Rails × 0 rotas                                                                                                           | 5 controllers / 21 actions                                                                                                                                                                            |
| Onboarding da conta (API)    |   ❌   | 0 rotas; `paridade-mapa.md`: onboarding 4 ações × 0 rotas                                                                                                                | update + help_center_generation + web widget inbox                                                                                                                                                    |
| Front do onboarding          |   ❌   | `paridade-mapa.md` front `onboarding: ❌`; nenhum arquivo com "onboarding" em `apps/web/src`                                                                             | wizard account-details/inbox-setup + guard                                                                                                                                                            |
| Onboarding de instalação     |   ❌   | 0 rotas/telas                                                                                                                                                            | `/installation/onboarding` + `AccountBuilder`                                                                                                                                                         |
| Seed/demo e e2e              |   🟡   | `packages/db/src/seed.ts` cria `superadmin@demo.test` e `admin@demo.test`; `scripts/e2e.mjs` loga e lista contas do superadmin                                           | sem platform app/token de demo, sem seed de conta (ação do console), sem fluxo de onboarding no e2e/shot                                                                                              |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                                                                                                                                                 | O que dita para nós                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `app/controllers/super_admin/{dashboard,settings,instance_statuses,app_configs,push_diagnostics,accounts,users,account_users,agent_bots,installation_configs,platform_apps,platform_banners,access_tokens}_controller.rb` e `devise/sessions_controller.rb` | contrato de paths/params/status do console                                                              |
| `app/dashboards/{account,user,account_user,agent_bot,platform_app,platform_banner,installation_config,access_token}_dashboard.rb`                                                                                                                           | campos/labels dos forms e colunas de lista                                                              |
| `app/views/super_admin/**` (`dashboard/index`, `settings/show`, `instance_statuses/show`, `app_configs/show`, `push_diagnostics/show`, `accounts/{show,edit,_seed_data,_reset_cache}`, `users/{show,_impersonate}`)                                         | UI/comportamento (Administrate)                                                                         |
| `app/controllers/platform_controller.rb` + `platform/api/v1/{accounts,account_users,users,agent_bots,email_channel_migrations}_controller.rb`                                                                                                               | contrato da Platform API e auth `api_access_token`                                                      |
| `app/views/platform/api/v1/**` (jbuilders)                                                                                                                                                                                                                  | payloads `_account`, `_user`, `_agent_bot`, `users/token`                                               |
| `config/routes.rb` (l. 58/592-611/720-764)                                                                                                                                                                                                                  | paths: `resource :onboarding`, namespace `platform`, namespace `super_admin`, `installation/onboarding` |
| `app/controllers/api/v1/accounts/onboardings_controller.rb`                                                                                                                                                                                                 | steps, cursor e envelope do onboarding                                                                  |
| `app/controllers/installation/onboarding_controller.rb` + `app/builders/account_builder.rb` + `app/services/onboarding/web_widget_creation_service.rb`                                                                                                      | instalação e criação do inbox WebWidget                                                                 |
| `app/javascript/superadmin_pages/views/dashboard/Index.vue` (+playground) e `entrypoints/superadmin_pages.js`                                                                                                                                               | dashboard stats + chart                                                                                 |
| `app/javascript/dashboard/routes/dashboard/onboarding/**` (`Index.vue`, `InboxSetup.vue`, `shared/*`, `account-details/*`, `inbox-setup/*`), `dashboard/api/onboarding.js` e `dashboard/routes/index.js`                                                    | wizard, canais detectados, polling e guard por `onboarding_step`                                        |
| `app/views/installation/onboarding/index.html.erb`                                                                                                                                                                                                          | tela de instalação                                                                                      |
| `config/installation_config.yml` + `lib/config_loader.rb`                                                                                                                                                                                                   | catálogo de configs exibido em `/super_admin/app_config`                                                |
| `app/services/notification/push_test_service.rb`                                                                                                                                                                                                            | formato dos resultados de push diagnostics                                                              |
| Tabelas `access_tokens`, `platform_apps`, `platform_app_permissibles`, `installation_configs`, `platform_banners`, `notification_subscriptions`, `email_templates`                                                                                          | dados (DDL já fechado na trilha D — não alterar)                                                        |

## 4. Lacunas detalhadas

### 4.1 API

**Console superadmin** (paths `/super_admin/*`; sem sessão → 401; form inválido → 422; `{ error }` no envelope do repo):

- [ ] `POST /super_admin/sign_in` — devise `SessionsController#create` (form `super_admin[email|password]`; inválido → erro). Hoje só existe `POST /super_admin/auth/sign_in`; adicionar alias 1:1 e manter o atual. (13-1)
- [ ] `GET /super_admin/logout` — `sessions#destroy`; JWT é stateless: responder 200 e limpar estado no client. (13-1)
- [ ] `GET /super_admin` — `dashboard#index` (Accept JSON): `chartData` (30 dias, `[data, count]`), `accountsCount`, `usersCount`, `inboxesCount`, `conversationsCount` (Rails usa estimativa `reltuples`; podemos usar COUNT exato — (verificar) se importa). (13-6)
- [ ] `GET /super_admin/settings` — `settings#show` (identifier da instalação + grade de features; billing/plan é enterprise → fora). (13-6)
- [ ] `GET /super_admin/settings/refresh` — `settings#refresh` (`Internal::CheckNewVersionsJob`); nosso equivalente: revalidar versão local do pacote e responder (sem ChatwootHub). (13-6)
- [ ] `GET /super_admin/instance_status` — `instance_statuses#show` com métricas nomeadas: `Chatwoot edition` (Community/Custom), `Chatwoot version`, `Git SHA`, `Database Migrations` (pending/completed), `Postgres alive` (true/false) e `Redis alive`/`Redis version`/`connected_clients`/`maxclients`/`used_memory_human`/`used_memory_peak_human`/`total_system_memory_human`/`maxmemory`/`maxmemory_policy`. Sem `REDIS_URL`, manter só `Redis alive: false` sem quebrar a página. (13-6)
- [ ] `POST /super_admin/accounts` e `PATCH /super_admin/accounts/:id` — form `account[name|locale|status]` (+ `suspension_category`/`suspension_reason` no OSS, gravando `internal_attributes.suspensions`); 422 com errors. (13-7)
- [ ] `POST /super_admin/accounts/:id/seed` — `Internal::SeedAccountJob`; condicionado a `ENABLE_ACCOUNT_SEEDING` (default fora de produção) e destrutivo (limpa a conta). Reusar a lógica de `packages/db/src/seed.ts` como função exportada. (13-7)
- [ ] `POST /super_admin/accounts/:id/reset_cache` — `Account#reset_cache_keys`; não usamos Redis/IndexedDB cache no app atual → endpoint idempotente documentado (no-op controlado, (verificar) se há cache a invalidar). (13-7)
- [ ] `DELETE /super_admin/accounts/:id` — `DeleteObjectJob` (nosso `deleteAccountCascade` já existe, hoje sync). (13-7)
- [ ] `POST /super_admin/account_users`, `GET /super_admin/account_users/:id` (redireciona para o user no Rails), `DELETE /super_admin/account_users/:id` — params `account_user[account_id|user_id|role]`; destroy com erro de validação → flash de erro. (13-7)
- [ ] `POST /super_admin/users`, `PATCH /super_admin/users/:id`, `DELETE /super_admin/users/:id/avatar`, `POST /super_admin/users/:id/resend_confirmation` — form `user[name|avatar|display_name|email|password|confirmed_at|type]`; `password` blank não sobrescreve; `confirmed_at` presente → skip reconfirmation. Reenvio aqui gera token/expiração; envio de e-mail real fica na fase 14. (13-8)
- [ ] `GET/POST /super_admin/agent_bots`, `GET/PATCH/DELETE /super_admin/agent_bots/:id`, `DELETE /super_admin/agent_bots/:id/avatar` — form `name|avatar|account_id|description|outgoing_url`; exibir `access_token` associado. (13-8)
- [ ] `GET /super_admin/app_config?config=` e `POST /super_admin/app_config` — params `app_config[KEY]`; allowlist OSS: `GENERAL_CONFIGS` + grupos `facebook/shopify/email/linear/slack/instagram/tiktok/whatsapp_embedded/notion/google/captain`; escrita `locked: false` e idempotente (`first_or_create`); aviso de restart para `RESTART_REQUIRED_CONFIG_KEYS`. (13-9)
- [ ] `POST /super_admin/installation_configs` e `PATCH /super_admin/installation_configs/:id` — `installation_config[name|value]`, `locked: false`, escopo `editable`; manter `PUT /:name` como alias interno do nosso client. (13-9)
- [ ] `GET /super_admin/push_diagnostics?user_query=` (id numérico ou e-mail), `POST /super_admin/push_diagnostics` (`user_id`, `subscription_ids[]`, `push_title`, `push_body`) e `POST /super_admin/push_diagnostics/destroy_subscriptions` — resultados `{ id, type, device, token_tail, status: success|failure|skipped, message }`; sem VAPID/FCM configurado → `skipped` com motivo (espelha `PushTestService`). (13-10)
- [ ] `GET/POST /super_admin/platform_apps`, `GET/PATCH/DELETE /super_admin/platform_apps/:id` (form `name`; token no show) e `GET /super_admin/access_tokens[/:id]` (owner polimórfico; token mascarado). (13-10)
- [ ] `GET/POST/PATCH/DELETE /super_admin/platform_banners` — no OSS o Rails responde **404** (cloud-only). Fora do aceite de paridade; manter CRUD interno mínimo (tabela existe). (13-10)

**Platform API v1** (`/platform/api/v1/*`):

- [ ] Auth estilo `PlatformController`: header `api_access_token` (ou `HTTP_API_ACCESS_TOKEN`) → `AccessToken` cujo owner é `PlatformApp`; inválido → 401 `{ "error": "Invalid access_token" }`; recurso fora de `platform_app_permissibles` → 401 `{ "error": "Non permissible resource" }`. Middleware próprio, separado do JWT de conta. (13-2)
- [ ] `GET /platform/api/v1/accounts` (só permissíveis de tipo Account), `POST` (cria conta + permissible), `GET/PATCH/DELETE /:id`. Payload `_account.json.jbuilder`: `id,name,locale,domain,support_email,features,limits,status`; PATCH aplica `features{}` habilitando/desabilitando flags; DELETE → `head :ok`. (13-3)
- [ ] `GET/POST /platform/api/v1/accounts/:account_id/account_users` e `DELETE /platform/api/v1/accounts/:account_id/account_users/destroy?user_id=`. Create é `find_or_initialize_by(user_id)`; destroy → `head :ok`. (13-3)
- [ ] `POST /platform/api/v1/users` (find_or_create por e-mail, skip_confirmation, permissible), `GET/PATCH/DELETE /:id`, `GET /:id/login` → `{ url }` (SSO; depende do fluxo de login SSO — módulo 12/(verificar)), `POST /:id/token` → `{ access_token, expiry: null, user: {...} }`. Payload `_user.json.jbuilder`: `access_token, account_id, accounts[], available_name, avatar_url, confirmed, display_name, message_signature, email, id, name, provider, pubsub_token, role, ui_settings, uid`. (13-4)
- [ ] `GET/POST /platform/api/v1/agent_bots`, `GET/PATCH/DELETE /:id`, `DELETE /:id/avatar`; `avatar_url` processado em job; payload `_agent_bot`: `id,name,description,outgoing_url,account_id,access_token`. (13-5)
- [ ] `POST /platform/api/v1/accounts/:account_id/email_channel_migrations` — flag `EMAIL_CHANNEL_MIGRATION` desligada → 403 `{ error: 'Email channel migration is not enabled' }`; `migrations` vazio → 422; > 25 itens → 422; providers `google|microsoft` (senão erro por item); por item cria `Channel::Email` + inbox; resposta 200 `{ results: [{ email, inbox_id, channel_id, status: 'success' } | { email, status: 'error', message }] }`. (13-5)

**Onboarding** (`/api/v1/accounts/:account_id/onboarding` — admin):

- [ ] `PATCH /api/v1/accounts/:account_id/onboarding` — body `onboarding_step` + `name,locale,industry,company_size,timezone,referral_source,user_role,website`; step fora de `account_details|inbox_setup` → 422 `{ error: 'Invalid onboarding step' }`. `account_details`: grava nome/locale e mescla `custom_attributes`; avança para `inbox_setup` **somente** em cloud (nosso: `DEPLOYMENT_ENV`/config — (verificar)), senão remove `onboarding_step` (fim); `inbox_setup`: remove o cursor. Replays/out-of-order são no-op (só age se o cursor atual bate). Resposta = payload de update de conta. (13-11)
- [ ] `GET /api/v1/accounts/:account_id/onboarding/help_center_generation` — OSS responde stub `{ generation_id: null, state: null, articles_count: 0, categories_count: 0 }` (geração real é enterprise → fora). (13-11)
- [ ] Efeito do `account_details` em cloud: `Onboarding::WebWidgetCreationService` — reusa inbox WebWidget existente; sem `custom_attributes.website`/`brand_info.domain` não cria; cria `channel_web_widgets` (cor/título/tagline do `brand_info` com defaults) + inbox com o nome da conta + `InboxMember(user)`. (13-11)
- [ ] `GET /installation/onboarding` e `POST /installation/onboarding` — form `user[name|company|email|password]` + `subscribe_to_updates`; guard de instalação nova (Rails usa Redis `CHATWOOT_INSTALLATION_ONBOARDING`; nosso equivalente a definir — (verificar)); `AccountBuilder`: conta com `custom_attributes.onboarding_step='account_details'` + usuário admin confirmado (`type='SuperAdmin'` no Rails; nosso drift usa tabela `super_admins` — decidir o vínculo, (verificar)); erros viram flash/422; `subscribe_to_updates` → ChatwootHub (fora). (13-13)

### 4.2 Front

- [ ] Shell `/superadmin` — sidebar com a ordem do Administrate (Dashboard, Accounts, Users, Access Tokens, Installation Configs, Agent Bots, Platform Apps, Platform Banners, Instance Status, Settings) + topbar; hoje `apps/web/src/routes/superadmin.tsx` só tem header. (13-11)
- [ ] `/superadmin` dashboard — cards Accounts/Users/Inboxes/Conversations + BarChart 30d; ref `superadmin_pages/views/dashboard/Index.vue`. (13-11)
- [ ] `/superadmin/accounts` (lista com busca/ordem, editar, seed, reset cache, destroy, account_users), `/superadmin/accounts/:id` (show + botões de `_seed_data`/`_reset_cache`), `/superadmin/users` (lista/novo/editar, avatar, resend confirmation), `/superadmin/account_users/new`, `/superadmin/app_config?config=`, `/superadmin/installation_configs`, `/superadmin/instance_status`, `/superadmin/settings` (features EE marcadas como fora), `/superadmin/push_diagnostics`, `/superadmin/platform_apps`, `/superadmin/platform_banners`, `/superadmin/access_tokens`. (13-12)
- [ ] Onboarding: rotas `/app/accounts/:accountId/onboarding` (account details) e `/app/accounts/:accountId/onboarding/inbox-setup`; ref `dashboard/routes/dashboard/onboarding/**`. Componentes: layout/seções/form rows/selects, linhas de canal, dialog de todos os canais, status rows com polling de 5s (WebWidget via lista de inboxes; help center via API). Canais detectados derivados de `custom_attributes.brand_info` (`socials`, `email_provider`, `domain`) com fallback default; banner de restrição Meta é cloud → fora. Guard: `onboarding_step` ∈ steps + role admin + conta ativa → redireciona para o step; sem step e estando no wizard → volta ao dashboard. Enrichment (Firecrawl) é externo: tratar `onboarding_step='enrichment'` como espera com timeout. (13-14)
- [ ] `/installation/onboarding` — formulário (name, company, e-mail, senha, checkbox) + estado de erro; ref view ERB. (13-13)
- [ ] Usar somente componentes/tokens de `packages/ui`; confirmar nomes de arquivo de rota com `routeTree.gen.ts` (padrão atual: flat, ex. `widget-preview.tsx`). (13-12/13-14)

### 4.3 Dados, jobs e realtime (quando aplicável)

- [ ] Tabelas já existentes a usar (sem DDL): `access_tokens` (owner `PlatformApp`/`User`/`AgentBot`), `platform_apps`, `platform_app_permissibles`, `installation_configs`, `platform_banners`, `notification_subscriptions` (módulo 11), `accounts.custom_attributes` (`onboarding_step`, `brand_info`, `help_center_generation_id`), `email_templates` (escopo instalação) e `inboxes`/`channel_web_widgets`/`channel_email`. `super_admins` é drift-permitido (`docs/specs/drift-permitido.md`) — não mexer. (13-2/13-11/13-13)
- [ ] Jobs/serviços: seed da conta (extrair de `packages/db/src/seed.ts` uma função reutilizável), reset cache (no-op documentado), check de versão (settings#refresh), push test service (VAPID/FCM via env; `skipped` sem credencial), avatar-from-URL, reenvio de confirmação (token + status). (13-7/13-8/13-9/13-10)
- [ ] Catálogo de configs: portar `chatwoot/config/installation_config.yml` para catálogo TS (nome, tipo `text|boolean|code|secret|select`, descrição, default) usado pela tela de app configs — dados só de leitura. (13-9)
- [ ] Realtime: nada específico deste módulo (o console não usa `/cable`).

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                                     | Arquivos-alvo                                                                                                                                                                                 | Depende           |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 13-1  | Auth do console: alias `POST /super_admin/sign_in`, `GET /super_admin/logout`, proteção das rotas e seed de `super_admins` | `apps/server/src/routes/super-admin.ts`, `packages/core/src/services/super-admin.ts`                                                                                                          | —                 |
| 13-2  | Middleware e serviço da Platform API: `api_access_token`, permissibles, criação de AccessToken do PlatformApp              | `apps/server/src/middlewares/platform.ts` (novo), `packages/core/src/services/platform.ts` (novo)                                                                                             | —                 |
| 13-3  | Platform API: accounts + account_users                                                                                     | `apps/server/src/routes/platform/accounts.ts` (novo), `packages/core/src/services/platform.ts`                                                                                                | 13-2              |
| 13-4  | Platform API: users (create/show/update/destroy/login/token)                                                               | `apps/server/src/routes/platform/users.ts` (novo), `packages/core/src/services/platform.ts`                                                                                                   | 13-2              |
| 13-5  | Platform API: agent_bots (+avatar) e email_channel_migrations                                                              | `apps/server/src/routes/platform/agent-bots.ts`, `.../email-channel-migrations.ts` (novos), `packages/core/src/services/platform.ts` + `inboxes.ts`                                           | 13-2              |
| 13-6  | Superadmin backend: dashboard stats, settings show/refresh, instance_status                                                | `apps/server/src/routes/super-admin.ts`, `packages/core/src/services/super-admin.ts` (+ serviço de instance status)                                                                           | 13-1              |
| 13-7  | Superadmin backend: accounts (create/update/seed/reset_cache/destroy) + account_users                                      | `apps/server/src/routes/super-admin.ts`, `packages/core/src/services/super-admin.ts`, `packages/db/src/seed.ts` (função exportada)                                                            | 13-6              |
| 13-8  | Superadmin backend: users (create/update/avatar/resend_confirmation) + agent_bots admin                                    | idem + `packages/core/src/services/agent-bots.ts`                                                                                                                                             | 13-6              |
| 13-9  | Superadmin backend: app_configs + installation_configs + catálogo de configs                                               | `apps/server/src/routes/super-admin.ts`, `packages/core/src/services/super-admin.ts`, `packages/core/src/lib/installation-config.ts` (novo)                                                   | 13-6              |
| 13-10 | Superadmin backend: push_diagnostics + platform_apps/access_tokens/banners                                                 | idem + `packages/core/src/services/notifications.ts` (push test)                                                                                                                              | 13-6, 11          |
| 13-11 | Superadmin UI: shell/nav, dashboard, settings, instance status, app configs/installation configs                           | `apps/web/src/routes/superadmin.tsx` + `apps/web/src/routes/superadmin/*.tsx` (novos)                                                                                                         | 13-6, 13-9        |
| 13-12 | Superadmin UI: accounts/users/account_users, push diagnostics, platform apps, access tokens                                | `apps/web/src/routes/superadmin/*.tsx`                                                                                                                                                        | 13-7, 13-8, 13-10 |
| 13-13 | Onboarding da conta (API): update + help_center_generation + web widget inbox                                              | `apps/server/src/routes/v1/onboarding.ts` (novo), `packages/core/src/services/onboarding.ts` (novo), `apps/server/src/routes/v1/index.ts`                                                     | —                 |
| 13-14 | Front do onboarding: wizard account details + inbox setup, canais detectados, polling e guard                              | `apps/web/src/routes/_auth/app/onboarding.tsx` + `onboarding/inbox-setup.tsx` (novos) e componentes em `apps/web/src/components/onboarding/**`                                                | 13-13             |
| 13-15 | Onboarding de instalação: `GET/POST /installation/onboarding`, AccountBuilder e tela                                       | `apps/server/src/routes/installation.ts` (novo), `packages/core/src/services/account-builder.ts` (novo), `apps/web/src/routes/installation/onboarding.tsx` (novo), `apps/server/src/index.ts` | 13-1              |
| 13-16 | Seed/demo (platform app + token), e2e, shot e ajuste do `parity-report` (fragmento `onboarding` singular)                  | `packages/db/src/seed.ts`, `scripts/e2e.mjs`, `scripts/shot.mjs`, `scripts/parity-report.mjs`                                                                                                 | 13-1..13-15       |

## 6. Aceite

```bash
bun run check-types && bunx oxlint && bun run check
bun scripts/schema-diff.mjs && bun scripts/db-roundtrip-check.mjs   # DDL intocado (trilha D)
bun run db:seed
bun scripts/parity-report.mjs            # superadmin/platform/onboarding sem action faltante
bun scripts/parity-report.mjs --write-doc
bun scripts/e2e.mjs                      # 2× seguidas, com os checks novos
bun scripts/shot.mjs                     # superadmin/* e onboarding/* em shots/

# Platform API — token válido e inválido
curl -s -H 'api_access_token: <token-do-platform-app>' localhost:3000/platform/api/v1/accounts
curl -s -o /dev/null -w '%{http_code}\n' -H 'api_access_token: invalido' localhost:3000/platform/api/v1/accounts   # 401

# Onboarding (self-hosted: account_details encerra o step)
curl -s -X PATCH -H "Authorization: Bearer <jwt-admin>" -H 'Content-Type: application/json' \
  localhost:3000/api/v1/accounts/1/onboarding \
  -d '{"onboarding_step":"account_details","name":"Demo","website":"https://demo.test"}'
curl -s -X PATCH -H "Authorization: Bearer <jwt-admin>" -H 'Content-Type: application/json' \
  localhost:3000/api/v1/accounts/1/onboarding -d '{"onboarding_step":"invalido"}'                    # 422

# Instalação
curl -s localhost:3000/installation/onboarding
```

- [ ] Todos os endpoints do §4.1 com path/método/status do Rails e payload dos jbuilders/dashboards (13-1..13-15), provado por smoke local.
- [ ] `bun scripts/e2e.mjs` cobre: login superadmin → stats do dashboard → seed/reset cache idempotentes → cria platform app e usa o token na Platform API (inclui 401) → fluxo de onboarding self-hosted; verde 2× seguidas.
- [ ] `bun scripts/shot.mjs` gera comparações lado a lado de superadmin (dashboard/accounts/settings) e onboarding (account details/inbox setup).
- [ ] `bun scripts/parity-report.mjs` com superadmin sem action faltante e `platform`/`onboarding` fora do ❌; `schema-diff`/roundtrip/drift-lint inalterados.
- [ ] Platform API: token inválido → 401; recurso sem permissible → 401; migração com flag off → 403; `migrations` vazio/>25 → 422.

## 7. Fora de escopo

- **Enterprise** (`chatwoot/enterprise/`): `super_admin/accounts` (limits, captain_models, `manually_managed_features`, `all_features`), `enterprise/api/v1/accounts/onboardings#help_center_generation` (geração real de help center com IA/Firecrawl), `super_admin/enterprise_base_controller`, `response_documents`/`responses`.
- **Billing/planos:** `ChatwootHub` (plan details, upgrade buttons, checkout, `register_instance`) e configs `CHATWOOT_CLOUD_*`; `platform_banners` é cloud-only no Rails (404 no OSS) — nosso CRUD interno não entra no aceite de paridade.
- **Serviços externos:** enrichment de conta (Firecrawl/Clearbit/Context.dev), push relay (`ENABLE_PUSH_RELAY_SERVER`), banner de restrição Meta (`DISABLE_META_*`).
- **Infra Rails:** Sidekiq Web (`/monitoring/sidekiq`), devise HTML com cookie/CSRF (nosso console usa JWT), ActiveStorage (avatar via URL/storage próprio).
- **Outros módulos:** envio real de e-mails de confirmação/convite (fase 14), impersonate SSO e MFA/profile (módulo 12), CRUD de `notification_subscriptions` do usuário (módulo 11), `reset_access_token`/`avatar` de profile (módulo 12).
- **i18n e pipeline/CI** (decisão de escopo R0).

## 8. Definição de done

1. Todas as tarefas `13-1..13-16` com aceite local verde e marcadas no checklist.
2. `bun run check-types`, `bunx oxlint` e `bun run check` sem diffs; `bun scripts/parity-report.mjs` com o módulo 13 nas 3 áreas (superadmin/platform/onboarding) e front `onboarding` coberto; `docs/specs/paridade-mapa.md` regenerado.
3. `bun scripts/e2e.mjs` com os checks novos passando 2× seguidas; `shots/` com superadmin + onboarding capturados.
4. Nenhum drift de DDL (`schema-diff`, `db-roundtrip-check`, `drift-lint` verdes) e nenhum arquivo de `chatwoot/` alterado.
5. Spec/índice da fase atualizado com as evidências (comandos + saídas) para marcar `13` como 100% no roadmap.
