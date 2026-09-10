# R0 — Roadmap para paridade 100% com o Chatwoot OSS (pino 4.17.1)

> **Status:** roadmap vigente. Substitui o roadmap v1 (`M0–M12`, arquivado em
> `_arquivo-v1/`) como plano de produto e dá sequência à trilha D (dump), que
> permanece concluída e virou guarda permanente.
>
> **Decisões de escopo (10/09/2026):**
>
> - ✅ **Dentro:** todo o produto OSS — `chatwoot/app/` (API v1/v2, public,
>   platform, super_admin, webhooks, auth), dashboard Vue, widget, canais,
>   automação, relatórios, help center, Captain OSS (tasks/preferences).
> - ❌ **Fora por decisão:** **i18n** (`pt-BR`/`en`) e **pipeline/CI**.
>   Aceites rodam **localmente** via scripts commitados; nenhum workflow novo.
> - ❌ **Fora por licença:** `chatwoot/enterprise/` (SLA, custom roles, capacity,
>   calls/voice, copilot, captain avançado, reporting_events, campaign
>   analytics). Lista do que ficaria de fora no Apêndice B.
> - 🎁 **Bônus já existentes:** Empresas, Audit Logs e Custom Attributes já
>   implementados (no Rails são Enterprise/parciais) — mantidos, não são dívida.

---

## 1. Definição de "100%"

Só consideramos 100% quando **os 6 eixos** abaixo estão verdes (medição em
`bun scripts/parity-report.mjs`, a ser criado na R1):

1. **DDL/dump (trilha D):** schema idêntico ao `schema.rb` do pino + roundtrip
   verde. **Já cumprido** — vira regressão obrigatória.
2. **API OSS:** toda action pública dos controllers OSS responde no mesmo
   path/método com mesmo status e envelope (`{ data, meta }` /
   `{ error, attributes }`), validada por inventário automatizado + smoke.
3. **Dashboard:** toda rota do Vue router OSS (excluindo `captain` enterprise,
   `billing` stub, `customRoles`, `sla`, `calls`) tem página funcional com
   dados reais.
4. **Widget:** paridade de API pública + comportamento (bolha, pré-chat,
   sessão, anexos, eventos, CSAT) e snippet embeddável.
5. **Canais:** inbound (webhook/poller) e outbound (provider) por canal, com
   idempotência por `source_id` e simulação testável sem credencial real.
6. **Realtime + jobs:** eventos equivalentes ao ActionCable, jobs assíncronos
   para tudo que no Rails é job, presença/typing; funciona com 2 réplicas do
   server (adapter Redis).

> Critério de "rota do dashboard coberta": navegação, estados vazio/loading/erro
> e comparação visual lado a lado com o screenshot do Chatwoot original.

---

## 2. Baseline medido (2026-09-10)

| Dimensão                | Medição                                                                              | Fonte                |
| ----------------------- | ------------------------------------------------------------------------------------ | -------------------- |
| DDL/dump                | `schema-diff`: 0 divergências; `roundtrip`: PASS                                     | scripts D            |
| Tabelas usadas pelo app | 57/99 (42 só schema: enterprise/IA/infra)                                            | `table-usage`        |
| API                     | 204 handlers; smoke 40/64 GET 200                                                    | `our-routes` + smoke |
| API Rails               | 187 controllers / 484 actions públicas (OSS + enterprise-dir excluded)               | inventário Rails     |
| Front                   | 38 rotas / 20 componentes vs **223 rotas nomeadas / 1.060 `.vue` / 654 componentes** | counts               |
| Widget                  | 18 KB, 8 endpoints vs 10 controllers / 23 actions                                    | pública              |
| Testes                  | 2 arquivos (345 linhas) vs 860 RSpec + 430 specs JS                                  | counts               |
| E2E                     | 13/13 (após fix do `notification_settings` default, não commitado)                   | `scripts/e2e.mjs`    |
| Qualidade               | `check-types` ok · `oxlint` 0/0                                                      | comandos             |

**Lacunas de produto confirmadas nesta medição:**

- **Bug do sino:** sem linha em `notification_settings`, nosso
  `getNotificationSettings()` marca **todos os tipos como mutados** e
  `notify()` retorna `null`. Seed/criação de agente não cria a linha → sino
  vazio por padrão (Rails cria).
- **E2E não idempotente:** resolve a única conversa aberta; a 2ª execução
  aborta. `scripts/shot.mjs` aponta para conversa 2 inexistente e WEB 3121.
- **Sem e-mail transacional:** convite e reset só fazem `console.log`, não
  enviam e-mail.
- **Sem auto-atribuição:** `assignment_policies` / `inbox_assignment_policies`
  existem no schema e não são usadas.
- **Sem API v2, integrations, platform API, public inbox API, OAuth de canais,
  bulk actions, drafts, unread counts, data imports completo, notificações
  completas, MFA.**

> **Baseline viva (R1):** `docs/specs/paridade-mapa.md`, gerado por
> `bun scripts/parity-report.mjs --write-doc` — API **26/33 áreas** (79%;
> **46% ponderado por ações**), front **15/28 áreas** (54%). É esse número que
> as fases R2–R12 precisam mover.

---

## 3. Mapa de paridade por área (OSS)

Legenda: ✅ paridade razoável · 🟡 parcial · ❌ ausente.
Referências: `chatwoot/app/controllers/**` + `config/routes.rb` do pino.

### 3.1 API `api/v1`

| Área / controller Rails                                                                                                                                                                                            | Status | Falta (resumo)                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts_controller` (show/create/update/cache_keys/update_active_at)                                                                                                                                             | 🟡     | `create`, `cache_keys`, `update_active_at`                                                                                                                          |
| `profiles_controller` (show/update/avatar/auto_offline/availability/set_active_account/resend_confirmation/reset_access_token)                                                                                     | 🟡     | `avatar`, `auto_offline`, `set_active_account`, `resend_confirmation`, `reset_access_token`                                                                         |
| `notification_subscriptions_controller` (create/destroy)                                                                                                                                                           | ❌     | endpoints + uso de `notification_subscriptions`                                                                                                                     |
| `agents_controller` (index/create/update/destroy/bulk_create)                                                                                                                                                      | 🟡     | `bulk_create`; convite sem e-mail                                                                                                                                   |
| `agent_bots_controller` (index/show/create/update/avatar/destroy/reset_access_token/reset_secret)                                                                                                                  | 🟡     | `avatar`, `reset_access_token`, `reset_secret`                                                                                                                      |
| `assignable_agents_controller` (index)                                                                                                                                                                             | ❌     | rota account-level                                                                                                                                                  |
| `assignment_policies_controller` (CRUD) + `assignment_policies/inboxes_controller` (show/create/destroy)                                                                                                           | ❌     | tudo + executor                                                                                                                                                     |
| `teams_controller` / `team_members_controller`                                                                                                                                                                     | ✅     | conferir envelopes                                                                                                                                                  |
| `inboxes_controller` (+ `assignable_agents`, `campaigns`, `avatar`, `agent_bot`, `set_agent_bot`, `reset_secret`)                                                                                                  | 🟡     | `campaigns`, `avatar`, `reset_secret`; WhatsApp extras                                                                                                              |
| `inbox_members_controller`                                                                                                                                                                                         | ✅     | —                                                                                                                                                                   |
| `inbox_csat_templates_controller` (show/create/analyze)                                                                                                                                                            | ❌     | tudo                                                                                                                                                                |
| WhatsApp health (`message_templates`, `sync_templates`, `health`, `register_webhook`, `whatsapp_business_management_token`)                                                                                        | ❌     | tudo                                                                                                                                                                |
| `bulk_actions_controller` (create)                                                                                                                                                                                 | ❌     | assign/label/status em lote                                                                                                                                         |
| `branded_email_layouts_controller` (show/update)                                                                                                                                                                   | ❌     | tudo                                                                                                                                                                |
| `callbacks_controller` (facebook_pages/register/reauthorize/instagram)                                                                                                                                             | ❌     | tudo                                                                                                                                                                |
| `oauth_authorization_controller`                                                                                                                                                                                   | ❌     | OAuth de canais Google/Microsoft                                                                                                                                    |
| `onboardings_controller` (update/help_center_generation)                                                                                                                                                           | ❌     | tudo                                                                                                                                                                |
| `contacts_controller` (index/search/import/export/active/show/filter/contactable_inboxes/destroy_custom_attributes/create/update/destroy/avatar)                                                                   | 🟡     | `import`/`export` completos, `active`, `filter`, `contactable_inboxes`, `avatar`, `destroy_custom_attributes`                                                       |
| `contacts/{conversations,contact_inboxes,labels,notes,attachments}`                                                                                                                                                | 🟡     | `notes#update`, demais conferir                                                                                                                                     |
| `actions/contact_merges_controller`                                                                                                                                                                                | ✅     | —                                                                                                                                                                   |
| `custom_attribute_definitions` / `custom_filters`                                                                                                                                                                  | ✅     | —                                                                                                                                                                   |
| `conversations_controller` (index/meta/search/attachments/show/create/update/filter/mute/unmute/transcript/toggle_status/toggle_priority/toggle_typing_status/update_last_seen/unread/destroy + custom_attributes) | 🟡     | `meta`, `search`, `attachments GET`, `create`, `update`, `filter`, `transcript`, `toggle_typing_status`, `update_last_seen`, `unread`, `destroy`, custom attributes |
| `conversations/assignments` / `participants`                                                                                                                                                                       | ✅     | —                                                                                                                                                                   |
| `conversations/labels_controller`                                                                                                                                                                                  | 🟡     | `index` (GET) confirmado ausente                                                                                                                                    |
| `conversations/messages_controller` (index/create/update/destroy/retry/translate)                                                                                                                                  | 🟡     | `update`, `retry`, `translate`                                                                                                                                      |
| `conversations/direct_uploads_controller`                                                                                                                                                                          | ❌     | upload direto p/ S3                                                                                                                                                 |
| `conversations/draft_messages_controller` (show/update/destroy)                                                                                                                                                    | ❌     | drafts                                                                                                                                                              |
| `conversations/unread_counts_controller` (index)                                                                                                                                                                   | ❌     | contadores                                                                                                                                                          |
| `csat_survey_responses_controller` (index/metrics/download)                                                                                                                                                        | ❌     | dashboard CSAT                                                                                                                                                      |
| `automation_rules` (CRUD + clone)                                                                                                                                                                                  | ✅     | —                                                                                                                                                                   |
| `macros` (CRUD + execute)                                                                                                                                                                                          | ✅     | —                                                                                                                                                                   |
| `canned_responses`                                                                                                                                                                                                 | ✅     | —                                                                                                                                                                   |
| `labels` / `webhooks`                                                                                                                                                                                              | ✅     | —                                                                                                                                                                   |
| `campaigns` (index/show/create/update/destroy)                                                                                                                                                                     | 🟡     | `show`; analytics é Enterprise                                                                                                                                      |
| `dashboard_apps_controller`                                                                                                                                                                                        | ❌     | tudo                                                                                                                                                                |
| `integrations/*` (apps, hooks, slack, linear, notion, shopify, dyte)                                                                                                                                               | ❌     | 24 actions                                                                                                                                                          |
| `data_imports_controller` (index/show/validate_source/create/start/retry/abandon/error_logs/skip_logs)                                                                                                             | ❌     | quase tudo + UI                                                                                                                                                     |
| `search_controller` (index/conversations/contacts/messages/articles)                                                                                                                                               | 🟡     | sub-rotas dedicadas                                                                                                                                                 |
| `portals_controller` (CRUD/archive/logo/send_instructions) + `articles` (reorder/edit) + `categories` (reorder) + bulk actions                                                                                     | 🟡     | ver R8                                                                                                                                                              |
| `notifications_controller` (index/read_all/update/unread/destroy/destroy_all/unread_count/snooze)                                                                                                                  | 🟡     | `unread_count`, `destroy`, `destroy_all`                                                                                                                            |
| `notification_settings_controller`                                                                                                                                                                                 | 🟡     | default correto (bug §2)                                                                                                                                            |
| `captain/{preferences,tasks}` (OSS)                                                                                                                                                                                | 🟡     | preferências + tasks reais (stub 501)                                                                                                                               |
| `reports` v1 (summary/agents/teams/inboxes/labels/overview/csat)                                                                                                                                                   | ✅     | validar números/params                                                                                                                                              |
| `upload_controller`                                                                                                                                                                                                | ✅     | —                                                                                                                                                                   |

### 3.2 API v2

| Área                                                                                                                                                                                                                                                    | Status | Falta             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------- |
| `api/v2/accounts/reports_controller` (index/summary/bot_summary/agents/inboxes/labels/teams/conversations_summary/conversation_traffic/drilldown/conversations/bot_metrics/inbox_label_matrix/first_response_time_distribution/outgoing_messages_count) | ❌     | tudo (15 actions) |
| `api/v2/accounts/live_reports_controller`                                                                                                                                                                                                               | ❌     | 2 actions         |
| `api/v2/accounts/summary_reports_controller`                                                                                                                                                                                                            | ❌     | 5 actions         |
| `api/v2/accounts/year_in_reviews_controller`                                                                                                                                                                                                            | ❌     | 1 action          |
| `api/v2/accounts_controller`                                                                                                                                                                                                                            | ❌     | 1 action          |

### 3.3 APIs públicas / plataforma / superadmin

| Área                                                                                                                               | Status | Falta                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| `public/api/v1/inboxes/{contacts,conversations,messages}` (12 actions)                                                             | ❌     | API do canal API (server-to-server)                                                         |
| `public/api/v1/portals/*` (7 actions + sitemap)                                                                                    | 🟡     | paths/sitemap/markdown/search                                                               |
| `public/api/v1/csat_survey_controller` (show/update)                                                                               | ❌     | página pública de CSAT                                                                      |
| `survey/responses_controller` (show)                                                                                               | ❌     | survey de satisfação                                                                        |
| `platform/api/v1/*` (21 actions)                                                                                                   | ❌     | platform API completa                                                                       |
| `super_admin/*` (37 actions + 3 devise)                                                                                            | 🟡     | dashboard, settings, instance statuses, app configs, account_users, seeds, push diagnostics |
| `installation/onboarding_controller` (index/create)                                                                                | ❌     | instalação/onboarding                                                                       |
| `auth`/`devise_overrides` (confirmação, omniauth, passwords, token validation)                                                     | 🟡     | confirmação real, omniauth, e-mails                                                         |
| `profile/mfa` (show/create/verify/destroy/backup_codes) + `profile/sessions`                                                       | ❌     | MFA + sessões                                                                               |
| `webhooks` externos (7) + twilio callbacks (2) + oauth callbacks (google/instagram/linear/microsoft/notion/shopify/tiktok/twitter) | 🟡     | shopify/tiktok/twilio + 8 callbacks OAuth                                                   |

### 3.4 Infra de produto

| Área                  | Status | Falta                                                                          |
| --------------------- | ------ | ------------------------------------------------------------------------------ |
| Jobs                  | 🟡     | jobs que faltam: data import, transcripts, e-mails, sync templates, rollups v2 |
| Mailers transacionais | ❌     | convite, reset, confirmação, transcript, CSAT, digest                          |
| Realtime              | 🟡     | adapter Redis p/ multi-réplica; eventos novos (typing já há)                   |
| Storage               | 🟡     | direct uploads; ActiveStorage no import de dump                                |
| Presença/availability | 🟡     | `auto_offline`, heartbeat                                                      |

---

## 4. Fases

Ordem de execução (cada fase fecha com aceite **local** verde):
`R1 → R2 → R3 → R4 → R5 → R6 → R7 → R8 → R9 → R10 → R11 → R12`.
Dependências anotadas em cada fase. Tamanho: **P** ≤ 1 semana-dev · **M** 1–2 ·
**G** 2–4+.

### R1 — Saneamento, seed rico e medidor de paridade · **P**

**Objetivo:** base confiável para medir e testar; corrigir bugs conhecidos.

**Tarefas**

1. `notification_settings` default: criar linha no vínculo conta/usuário
   (`createAgent`/`acceptInvitation`/seed). Callback `ensureNotificationSettings`.
2. Seed demo rico (`SEED_FORCE`): 2 inboxes (Website+API), 3 times, 5 labels,
   2 macros, 3 canned, 2 automações, 1 portal + artigos, 10 contatos,
   6 conversas (status variados), mensagens, CSAT, notificações. Determinístico.
3. Corrigir `scripts/e2e.mjs`: criar a própria conversa (não depender do seed),
   rodar 2× seguidas com mesmo resultado; manter 13 checks.
4. Corrigir `scripts/shot.mjs`: portas (`WEB_URL` default 3001), conversa por
   query real (não hardcode 2), esperar dados carregarem.
5. `scripts/parity-report.mjs`: parse de `chatwoot/app/controllers` (OSS) +
   `config/routes.rb` × `apps/server/src/routes` + `apps/web/src/routes`;
   imprime % por área e lista faltantes; aceita `--json`.
6. `docs/specs/paridade-mapa.md` gerado pelo script (ou seção no R0).

**Aceite**

- [ ] `bun scripts/e2e.mjs` 13/13 duas vezes seguidas sem re-seed manual.
- [ ] `bun scripts/parity-report.mjs` roda e mostra baseline atual (esperado:
      DDL 100%, API/OSS ~55–65%, front ~45–55%).
- [ ] `bun run db:seed` + `SEED_FORCE=1` criam dados ricos sem erro.
- [ ] Sino do agente recém-criado aparece sem ritual manual.

### R2 — Conversas e mensagens 100% · **G**

**Objetivo:** fechar o coração do produto (Rails `conversations_controller`,
`conversations/*`).

**API (lacunas do §3.1)**

- `GET /conversations/meta`, `GET /conversations/search`,
  `GET /conversations/:id/attachments`, `POST /conversations` (create),
  `PATCH /conversations/:id` (update), `POST /conversations/filter`,
  `POST /conversations/:id/transcript`, `POST .../toggle_typing_status`,
  `POST .../update_last_seen`, `POST .../unread`, `DELETE /conversations/:id`,
  `POST .../custom_attributes`, `POST .../destroy_custom_attributes`
- `messages`: `PATCH .../messages/:id`, `POST .../messages/:id/retry`,
  `POST .../messages/:id/translate`
- `draft_messages`: show/update/destroy · `unread_counts`: index ·
  `direct_uploads`: create · `conversations/labels` GET ·
  `bulk_actions`: create (assign/label/status)
- `csat_survey_responses`: index/metrics/download

**Realtime:** publicar `message.updated`, `conversation.typing` com payload
igual; reconexão.

**Front:** filtros avançados completos (inbox/team/label/status/assignee/
priority/type/sort + saved views), seleção múltipla + bulk bar, busca na
thread, transcript, drafts persistidos, reply/citação, mentions com autocomplete,
audio recorder, upload com preview, templates, email CC/BCC, read/unread,
typing, estados vazio/loading/erro.

**Aceite**

- [ ] Smoke de API cobre 100% dos endpoints acima com status/payload do Rails.
- [ ] E2E: conversa com anexo + áudio + nota privada + citação + menção + bulk
      assign + snooze + transcript.
- [ ] Paridade de payload conferida contra os specs Rails dos controllers.

### R3 — Atribuição, roteamento e presença · **M**

**Objetivo:** auto-atribuição como o Rails (OSS).

**Tarefas**

- `assignment_policies` CRUD + `assignment_policies/inboxes`
  (show/create/destroy) + validações Rails.
- Executor: `round_robin` e `least_busy` no `conversation.created`; respeitar
  `inbox.enable_auto_assignment` e vínculo agente/inbox; fila/ordem igual.
- `assignable_agents` account-level; assignee "Auto" no dropdown.
- `profiles/auto_offline`, `accounts/update_active_at`; heartbeat de presença.
- Front: settings/assignment-policy (página + editor), indicador "Auto".

**Aceite**

- [ ] Conversa criada sem assignee recebe agente conforme policy (teste com
      3 agentes, 2 inboxes, alternância determinística).
- [ ] Agente sem vínculo com a inbox nunca é escolhido.
- [ ] E2E de rodízio e de least_busy.

### R4 — Relatórios v2 + CSAT · **G**

**Objetivo:** paridade com `api/v2/accounts/reports|live_reports|summary_reports`
e CSAT.

**Tarefas**

- Implementar as 24 actions v2 (paths/params `since/until/timezone_offset/
group_by`, envelopes v2).
- CSAT: `csat_survey_responses` index/metrics/download + página pública
  (`public/api/v1/csat_survey` show/update) + survey.
- Alimentar métricas: `first_reply_created_at`, `waiting_since`,
  `reporting_events` (usar tabela; no Rails é Enterprise, mas está no schema e
  é necessária para drilldown).
- Front: reports Overview/Agents/Teams/Inboxes/Labels/CSAT/Live com drilldown,
  filtros e export CSV.
- Jobs de rollup (`reporting_events_rollup`).

**Aceite**

- [ ] Números batem com dataset do seed (script de conferência com `SELECT`).
- [ ] Cada endpoint v2 tem teste de contrato local.
- [ ] CSAT enviado pelo widget aparece em report e endpoint.

### R5 — Contatos, importação/exportação e campos · **M**

**Objetivo:** CRUD completo + CSV + data imports como o Rails.

**Tarefas**

- `contacts`: `filter`, `active`, `search`, `export`, `import`,
  `contactable_inboxes`, `avatar`, `destroy_custom_attributes`; notas
  `update`/`destroy`.
- `data_imports`: validate_source/create/start/retry/abandon/error_logs/
  skip_logs + `data_import_items`/`mappings` em uso + job de import +
  progresso.
- Front: settings/data (lista, wizard, logs), import/export na lista,
  filtros salvos/segmentos, merge com preview.

**Aceite**

- [ ] Import CSV de 100 contatos pela UI com logs corretos e idempotência.
- [ ] Export CSV no formato do Rails.
- [ ] Merge de contatos move conversas/labels/atributos.

### R6 — Widget + API pública de inbox · **G**

**Objetivo:** widget 100% e API server-to-server do canal API.

**Tarefas**

- Endpoints faltantes do widget (`campaigns`, `events`, `labels` create/destroy,
  `direct_uploads`, `inbox_members`, `set_user`, `destroy_custom_attributes`,
  `transcript`, `toggle_status`, `update_last_seen`, `process_update_contact`).
- `public/api/v1/inboxes/{contacts,conversations,messages}` (13 actions),
  autenticação por `inbox.identifier` + HMAC.
- Widget UI: pré-chat completo, unread badge, som, persistência de sessão,
  anexos, emoji, reply, CSAT, dark? (tema do site), acessibilidade.
- Dashboard: página de configuração do widget 1:1 (cores, mensagens, HMAC,
  allowed domains) + snippet.

**Aceite**

- [ ] Snippet embedado cria contato/conversa; refresh mantém sessão.
- [ ] Chamadas da API pública com HMAC inválido → 401.
- [ ] E2E widget: mensagem do widget aparece no dashboard e vice-versa.

### R7 — Canais externos completos · **G**

**Objetivo:** os 11 canais com fluxo completo (sem depender de credencial real
nos testes — simular payloads).

**Tarefas**

- OAuth/callbacks: Facebook/Instagram (`callbacks_controller`), Twitter,
  TikTok, Google, Microsoft, Notion, Linear, Shopify.
- WhatsApp: `manual_setup` (preview/connect/webhook_status/setup_webhook),
  `message_templates`/`sync_templates`, `health`, `register_webhook`,
  `whatsapp_business_management_token`; Twilio SMS.
- Canais sem uso: `channel_tiktok`, `channel_twilio_sms` (persistência+
  provider+webhook).
- Email: parser de reply/forward, anexos, CC/BCC, IMAP UID/backoff.
- Webhooks: shopify, tiktok, twilio callback/delivery_status.
- Docs por canal com payload de teste e curl.

**Aceite por canal**

- [ ] Webhook simulado cria `contact_inbox` + conversa + mensagem.
- [ ] Resposta no dashboard chama o provider (mock HTTP registrado).
- [ ] Idempotência por `source_id` (payload duplicado não duplica).

### R8 — Help Center e portal público · **M**

**Objetivo:** paridade de artigos/portal (Rails `articles`, `portals`,
`public/api/v1/portals`).

**Tarefas**

- Artigos: `edit`, `reorder`, bulk actions (translate/update_status/
  update_category/delete_articles); categorias `reorder`.
- Portal: `archive`, `logo`, `send_instructions`, `process_attached_logo`,
  `portals_members`, `related_categories`.
- API pública: paths do Rails (`/public/api/v1/portals/:slug/...`), `sitemap`,
  `show_markdown`, `tracking_pixel`, search.
- Front: portal público 1:1 (busca, categorias, artigo, locale do portal) +
  editor no dashboard.

**Aceite**

- [ ] Artigo publicado acessível sem login; busca e sitemap funcionando.
- [ ] Categorias reordenáveis com posição persistida.

### R9 — Integrações e Dashboard Apps · **M**

**Objetivo:** apps de dashboard e integrações OSS.

**Tarefas**

- `dashboard_apps` CRUD + embed no painel de detalhes (iframe).
- `integrations/apps` (index/show), `hooks` (create/update/process_event/
  destroy), Slack (channels/create/update/destroy), Linear (teams/entities/
  issues), Notion, Shopify, Dyte (meetings).
- `api/v1/integrations/webhooks` create.
- `branded_email_layouts` show/update.
- Front: settings/integrations 1:1 (cards, configuração, teste).

**Aceite**

- [ ] Slack hook: evento de conversa dispara payload no mock.
- [ ] Dashboard app aparece embutido na conversa.
- [ ] Linear: criar/vincular issue em conversa (mock).

### R10 — Superadmin, Platform API, perfil/segurança e onboarding · **G**

**Objetivo:** fechar admin global, API de plataforma e conta/segurança.

**Tarefas**

- `super_admin`: dashboard, settings (show/refresh), instance statuses
  (chatwoot_edition/version/postgres/redis), accounts (update/seed/reset_cache/
  destroy), account_users, users (create/update/resend_confirmation/avatar),
  app_configs, push diagnostics, agent_bots avatar.
- `platform/api/v1`: accounts, account_users, users (login/token), agent_bots,
  email_channel_migrations (21 actions) + platform apps/OAuth.
- Perfil: avatar, `set_active_account`, `reset_access_token`,
  `resend_confirmation`, sessions, MFA (show/create/verify/destroy/backup_codes).
- `agents/bulk_create`; agent_bots tokens/secrets.
- `onboardings` (update + help_center_generation) + `installation/onboarding`.

**Aceite**

- [ ] Login/token da Platform API funciona igual ao Rails.
- [ ] MFA TOTP habilitável e verificável.
- [ ] Onboarding cria conta+inbox+help center pelo fluxo.

### R11 — Notificações completas, e-mail transacional e realtime multi-réplica · **M**

**Objetivo:** paridade de notificações/e-mails e robustez de realtime.

**Tarefas**

- Notificações: `unread_count`, `update`, `destroy`, `destroy_all`,
  `notification_subscriptions` create/destroy; e-mail/push flags por tipo;
  íntegra do default (R1).
- Mailers: convite, reset, confirmação, transcript, CSAT, digest/notificação
  com layout HTML compatível e SMTP configurável (`SMTP_*`).
- Realtime: adapter Redis pub/sub quando `REDIS_URL` (2 réplicas → mesmo
  evento), reconexão com backoff e replay de `last_seen`?

**Aceite**

- [ ] E-mail de convite/reset sai por SMTP fake e chega no MailHog de teste.
- [ ] Duas instâncias do server: mensagem enviada na A aparece na B via WS.
- [ ] `unread_count` bate com `SELECT count`.

### R12 — Captain OSS, busca global e polimento visual 1:1 · **M**

**Objetivo:** última milha funcional e visual.

**Tarefas**

- Captain OSS: `preferences` (show/update) + `tasks`
  (rewrite/summarize/reply_suggestion/label_suggestion/follow_up) com flag
  `captain_enabled` e provider configurável (OpenAI/API key).
- Busca: sub-rotas `search/conversations|contacts|messages|articles` +
  command bar (`⌘K`) com atalhos.
- Polimento: dark mode, loading skeletons, empty states, densidade, scroll,
  atalhos, acessibilidade; checklist visual página-a-página contra
  `chatwoot/.github/screenshots` + navegação própria.
- Auditoria final: `parity-report` 100% e2e por fluxo.

**Aceite**

- [ ] `bun scripts/parity-report.mjs` → API OSS 100%, front OSS 100%.
- [ ] Checklist visual assinado por página (dashboard, conversas, contatos,
      inboxes, relatórios, help center, configurações, superadmin).
- [ ] E2E global: login → canais → conversa → automação → relatório → CSAT →
      help center → superadmin.

---

## 5. Grafo de dependências

```
R1 ─┬─ R2 ─┬─ R3
    │      ├─ R4
    │      └─ R5
    ├─ R6 ─ R7
    ├─ R8
    ├─ R9
    ├─ R10
    └─ R11 ─ R12
```

- R2 é pré-requisito de R3/R4/R5 (eventos e dados de conversa).
- R7 depende de R2 (inbound cria mensagem) e R6 (widget) para QA.
- R8/R9/R10 são paralelizáveis após R1.
- R12 fecha tudo (só depois de R2–R11).

---

## 6. Como medir o progresso

```bash
# 1. DDL/dump (permanente)
bun scripts/schema-diff.mjs && bun scripts/db-roundtrip-check.mjs

# 2. Paridade de superfície (R1 cria)
bun scripts/parity-report.mjs            # % por área
bun scripts/parity-report.mjs --json     # máquina

# 3. Saúde funcional
bun run check-types && bunx oxlint
bun scripts/e2e.mjs                       # fluxo ponta a ponta

# 4. Visual (R1 corrige)
bun scripts/shot.mjs                      # shots/ lado a lado
```

---

## 7. Riscos e mitigação

| Risco                                 | Impacto                   | Mitigação                                                |
| ------------------------------------- | ------------------------- | -------------------------------------------------------- |
| Superfície enorme sem testes          | Regressão silenciosa      | R1 mede; cada fase entrega smoke/e2e local               |
| Canais externos sem credenciais reais | "Funciona" não comprovado | aceite por payload simulado + mock HTTP + docs por canal |
| Relatórios v2 com semântica sutil     | Números divergentes       | conferir contra specs Rails + dataset fixo do seed       |
| Diferenças de envelope/status         | Integrações quebram       | teste de contrato por endpoint (R2 em diante)            |
| Escopo enterprise "vazar" para OSS    | Retrabalho                | Apêndice B congela o que está fora                       |
| i18n/pipeline fora                    | Dívida consciente         | registrado aqui; retomar só com ordem explícita          |

---

## 8. Governança

- Cada fase vira uma spec executável `R<n>-*.md` ao começar (formato D0–D5:
  Objetivo / Referência Chatwoot / Tarefa / Aceite / Done).
- `Impl [x] done` em `000-indice.md` só com o aceite cumprido localmente
  (comandos da spec verdes).
- Nenhuma mudança de DDL sem D5 (schema-diff/drift/roundtrip).
- i18n e pipeline **não** entram em nenhuma fase; se um dia entrarem, nascem
  como track separada.

---

## Apêndice A — Alvo de endpoints (inventário do pino)

- `chatwoot/app/controllers`: **187 controllers / 484 actions públicas**.
- Excluindo `concerns` (22), controllers-raiz de infraestrutura (~13),
  enterprise-gated no próprio OSS (~14) e helpers não-HTTP: **alvo ≈ 350–380
  endpoints de produto**.
- Hoje: **204 handlers** no server, cobrindo ~40–65% das áreas (ver §3).
- O `parity-report.mjs` (R1) mantém o número exato e a lista de faltantes.

## Apêndice B — Enterprise (fora do escopo, licença separada)

Se um dia virar objetivo, esta é a dívida (tabelas já existem no nosso schema
por causa da trilha D):

- **SLA:** `sla_policies`, `applied_slas`, `sla_events`, `agent_capacity_policies`,
  `leaves`, capacity limits + relatórios SLA.
- **Custom roles:** `custom_roles` + permissões por agente.
- **Calls/Voice:** `calls`, conference, WhatsApp calling, Twilio voice.
- **Captain avançado:** assistants, documents, faq suggestions, scenarios,
  custom tools, message reports, copilot (`copilot_threads/messages`).
- **Relatórios:** `reporting_events` (drilldowns enterprise), campaign analytics.
- **Outros:** `conversation_outcomes`, `article_embeddings`, SAML.

## Apêndice C — Inventários reproduzíveis

Gerados nesta sessão (scripts em `tmp/opencode`, conteúdo no histórico desta
conversa); o R1 commita versões equivalentes:

```bash
# Rails: controllers + actions públicas
bun tmp/rails-actions.mjs > tmp/rails-actions.txt

# Nosso server: rotas registradas (Hono)
bun tmp/our-routes2.mjs > tmp/our-routes.txt
```

> Nota: o parser de Rails considera métodos públicos como actions (inclui
> eventuais helpers); os números servem para priorização, não como contrato
> exato — o contrato é o `config/routes.rb` + specs.
