# schema-inventario — Chatwoot pinado × packages/db

> Gerado em D0 a partir de `chatwoot/db/schema.rb` (pino `CHATWOOT_PIN.md`) e
> `packages/db/src/schema/*.ts`. Totais: **orig 98 tabelas / ~957 colunas declaradas
> (+ id implícito na maioria); nossas 62 tabelas / 624 colunas**. Detalhe por coluna:
> `bun scripts/schema-diff.mjs`. Legenda: `N×M` = colunas orig × nossas
> (id implícito do Rails contado no lado orig).

## 1. As 98 tabelas do Chatwoot

| Tabela (Rails)                       | Em packages/db? | const @ arquivo                                     | Nome diverge?  | Cols orig×nossas |
| ------------------------------------ | --------------- | --------------------------------------------------- | -------------- | ---------------- |
| `access_tokens`                      | sim             | `accessTokens` @ `auth.ts`                          | não            | 6×6              |
| `account_saml_settings`              | **não**         | —                                                   | — (D1 cria)    | 9×—              |
| `account_users`                      | sim             | `accountUsers` @ `auth.ts`                          | não            | 12×8             |
| `accounts`                           | sim             | `accounts` @ `auth.ts`                              | não            | 15×7             |
| `action_mailbox_inbound_emails`      | **não**         | —                                                   | — (D1 cria)    | 6×—              |
| `active_storage_attachments`         | **não**         | —                                                   | — (D1 cria)    | 6×—              |
| `active_storage_blobs`               | **não**         | —                                                   | — (D1 cria)    | 9×—              |
| `active_storage_variant_records`     | **não**         | —                                                   | — (D1 cria)    | 3×—              |
| `agent_bot_inboxes`                  | sim             | `agentBotInboxes` @ `platform.ts`                   | não            | 7×7              |
| `agent_bots`                         | sim             | `agentBots` @ `platform.ts`                         | não            | 10×10            |
| `agent_capacity_policies`            | **não**         | —                                                   | — (D1 cria)    | 7×—              |
| `agent_sessions`                     | **não**         | —                                                   | — (D1 cria)    | 19×—             |
| `applied_slas`                       | **não**         | —                                                   | — (D1 cria)    | 8×—              |
| `article_embeddings`                 | **não**         | —                                                   | — (D1 cria)    | 6×—              |
| `articles`                           | sim             | `articles` @ `portals.ts`                           | não            | 20×16            |
| `assignment_policies`                | sim             | `assignmentPolicies` @ `inbox-members.ts`           | não            | 12×12            |
| `attachments`                        | sim             | `attachments` @ `messages.ts`                       | não            | 12×12            |
| `audits`                             | **não**         | —                                                   | — (D1 cria)    | 15×—             |
| `automation_rule_pending_executions` | sim             | `automationRulePendingExecutions` @ `automation.ts` | não            | 11×11            |
| `automation_rules`                   | sim             | `automationRules` @ `automation.ts`                 | não            | 11×10            |
| `calls`                              | **não**         | —                                                   | — (D1 cria)    | 18×—             |
| `campaign_recipients`                | **não**         | —                                                   | — (D1 cria)    | 17×—             |
| `campaigns`                          | sim             | `campaigns` @ `campaigns.ts`                        | não            | 20×14            |
| `canned_responses`                   | sim             | `cannedResponses` @ `canned-responses.ts`           | não            | 6×6              |
| `captain_assistant_responses`        | **não**         | —                                                   | — (D1 cria)    | 12×—             |
| `captain_assistants`                 | **não**         | —                                                   | — (D1 cria)    | 9×—              |
| `captain_custom_tools`               | **não**         | —                                                   | — (D1 cria)    | 15×—             |
| `captain_documents`                  | **não**         | —                                                   | — (D1 cria)    | 13×—             |
| `captain_faq_observations`           | **não**         | —                                                   | — (D1 cria)    | 10×—             |
| `captain_faq_suggestions`            | **não**         | —                                                   | — (D1 cria)    | 11×—             |
| `captain_inboxes`                    | **não**         | —                                                   | — (D1 cria)    | 5×—              |
| `captain_message_reports`            | **não**         | —                                                   | — (D1 cria)    | 9×—              |
| `captain_scenarios`                  | **não**         | —                                                   | — (D1 cria)    | 10×—             |
| `categories`                         | sim             | `categories` @ `portals.ts`                         | não            | 14×10            |
| `channel_api`                        | sim             | `channelApi` @ `channels.ts`                        | não            | 10×10            |
| `channel_email`                      | sim             | `channelEmail` @ `channels.ts`                      | não            | 26×26            |
| `channel_facebook_pages`             | sim             | `channelFacebookPages` @ `channels.ts`              | não            | 8×8              |
| `channel_instagram`                  | sim             | `channelInstagrams` @ `channels.ts`                 | sim — ver nota | 7×7              |
| `channel_line`                       | sim             | `channelLines` @ `channels.ts`                      | sim — ver nota | 7×7              |
| `channel_sms`                        | sim             | `channelSms` @ `channels.ts`                        | não            | 7×7              |
| `channel_telegram`                   | sim             | `channelTelegrams` @ `channels.ts`                  | sim — ver nota | 6×6              |
| `channel_tiktok`                     | **não**         | —                                                   | — (D1 cria)    | 9×—              |
| `channel_twilio_sms`                 | **não**         | —                                                   | — (D1 cria)    | 16×—             |
| `channel_twitter_profiles`           | sim             | `channelTwitters` @ `channels.ts`                   | sim — ver nota | 8×8              |
| `channel_web_widgets`                | sim             | `channelWebWidgets` @ `channels.ts`                 | não            | 17×17            |
| `channel_whatsapp`                   | sim             | `channelWhatsapps` @ `channels.ts`                  | sim — ver nota | 13×13            |
| `companies`                          | sim             | `companies` @ `companies.ts`                        | não            | 11×11            |
| `contact_inboxes`                    | sim             | `contactInboxes` @ `contacts.ts`                    | não            | 8×8              |
| `contacts`                           | sim             | `contacts` @ `contacts.ts`                          | não            | 18×18            |
| `conversation_outcomes`              | **não**         | —                                                   | — (D1 cria)    | 19×—             |
| `conversation_participants`          | sim             | `conversationParticipants` @ `conversations.ts`     | não            | 6×6              |
| `conversations`                      | sim             | `conversations` @ `conversations.ts`                | não            | 29×27            |
| `copilot_messages`                   | **não**         | —                                                   | — (D1 cria)    | 7×—              |
| `copilot_threads`                    | **não**         | —                                                   | — (D1 cria)    | 7×—              |
| `csat_survey_responses`              | sim             | `csatSurveyResponses` @ `messages.ts`               | não            | 13×10            |
| `custom_attribute_definitions`       | sim             | `customAttributeDefinitions` @ `labels.ts`          | não            | 13×13            |
| `custom_filters`                     | sim             | `customFilters` @ `notifications.ts`                | não            | 8×9              |
| `custom_roles`                       | **não**         | —                                                   | — (D1 cria)    | 7×—              |
| `dashboard_apps`                     | sim             | `dashboardApps` @ `inbox-members.ts`                | não            | 7×7              |
| `data_import_errors`                 | sim             | `dataImportErrors` @ `data-imports.ts`              | não            | 10×10            |
| `data_import_items`                  | sim             | `dataImportItems` @ `data-imports.ts`               | não            | 14×13            |
| `data_import_mappings`               | **não**         | —                                                   | — (D1 cria)    | 11×—             |
| `data_imports`                       | sim             | `dataImports` @ `data-imports.ts`                   | não            | 22×15            |
| `email_templates`                    | sim             | `emailTemplates` @ `platform.ts`                    | não            | 9×9              |
| `folders`                            | sim             | `folders` @ `portals.ts`                            | não            | 6×6              |
| `inbox_assignment_policies`          | sim             | `inboxAssignmentPolicies` @ `inbox-members.ts`      | não            | 5×5              |
| `inbox_capacity_limits`              | **não**         | —                                                   | — (D1 cria)    | 6×—              |
| `inbox_members`                      | sim             | `inboxMembers` @ `inbox-members.ts`                 | não            | 5×5              |
| `inboxes`                            | sim             | `inboxes` @ `inboxes.ts`                            | não            | 23×22            |
| `installation_configs`               | sim             | `installationConfigs` @ `auth.ts`                   | não            | 6×6              |
| `integrations_hooks`                 | **não**         | —                                                   | — (D1 cria)    | 11×—             |
| `labels`                             | sim             | `labels` @ `labels.ts`                              | não            | 8×8              |
| `leaves`                             | **não**         | —                                                   | — (D1 cria)    | 12×—             |
| `macros`                             | sim             | `macros` @ `macros.ts`                              | não            | 9×8              |
| `mentions`                           | sim             | `mentions` @ `conversations.ts`                     | não            | 7×8              |
| `messages`                           | sim             | `messages` @ `messages.ts`                          | não            | 19×18            |
| `notes`                              | sim             | `notes` @ `contacts.ts`                             | não            | 7×7              |
| `notification_settings`              | sim             | `notificationSettings` @ `notifications.ts`         | não            | 7×8              |
| `notification_subscriptions`         | sim             | `notificationSubscriptions` @ `notifications.ts`    | não            | 7×8              |
| `notifications`                      | sim             | `notifications` @ `notifications.ts`                | não            | 14×10            |
| `platform_app_permissibles`          | **não**         | —                                                   | — (D1 cria)    | 6×—              |
| `platform_apps`                      | sim             | `platformApps` @ `platform.ts`                      | não            | 4×4              |
| `platform_banners`                   | sim             | `platformBanners` @ `platform.ts`                   | não            | 6×6              |
| `portals`                            | sim             | `portals` @ `portals.ts`                            | não            | 15×12            |
| `portals_members`                    | **não**         | —                                                   | — (D1 cria)    | 3×—              |
| `related_categories`                 | **não**         | —                                                   | — (D1 cria)    | 5×—              |
| `reporting_events`                   | sim             | `reportingEvents` @ `reporting.ts`                  | não            | 12×14            |
| `reporting_events_rollups`           | sim             | `reportingEventsRollups` @ `reporting.ts`           | não            | 11×11            |
| `sla_events`                         | **não**         | —                                                   | — (D1 cria)    | 10×—             |
| `sla_policies`                       | **não**         | —                                                   | — (D1 cria)    | 10×—             |
| `taggings`                           | sim             | `taggings` @ `labels.ts`                            | não            | 8×7              |
| `tags`                               | **não**         | —                                                   | — (D1 cria)    | 3×—              |
| `team_members`                       | sim             | `teamMembers` @ `teams.ts`                          | não            | 5×5              |
| `teams`                              | sim             | `teams` @ `teams.ts`                                | não            | 9×9              |
| `user_sessions`                      | **não**         | —                                                   | — (D1 cria)    | 16×—             |
| `users`                              | sim             | `users` @ `auth.ts`                                 | não            | 32×8             |
| `webhooks`                           | sim             | `webhooks` @ `webhooks.ts`                          | não            | 10×10            |
| `working_hours`                      | sim             | `workingHours` @ `inbox-members.ts`                 | não            | 12×12            |

## 2. Tabelas nossas fora do Rails (extras)

| Tabela nossa   | Situação                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `audit_logs`   | **renomear p/ `audits` em D1** — Rails tem `audits` (audited gem), DDL diferente                     |
| `super_admins` | **só nossa** — Rails usa flag em `users`; destino decidido em D1, registrado em `drift-permitido.md` |

## 3. Casos de nome sabidamente sensíveis

- `audits` (orig) × `audit_logs` (nossa): rename obrigatório em D1.
- `tags` + `taggings` (orig, sistema de labels de conversa) × `labels` (nossa):
  as duas existem no Rails como tabelas **distintas** (`labels` = etiquetas de conta
  com título/cor; `tags`/`taggings` = motor de tagueamento polimórfico). Manter as três DDLs em D1;
  o mapeamento da API resolve-se em D2.
- `channel_twitter_profiles` existe com nome de tabela correto; só a const
  (`channelTwitters`) difere — sem impacto em dump (D1 pode renomear a const por higiene).
- `portals_members` (orig) tem `id: false` (sem PK) — única tabela sem PK; D1 deve
  reproduzir sem PK serial.
- PKs no Rails: 84 tabelas com `id` bigint (default), 13 com `id: :serial`, 1 sem PK.
  Nossos schemas usam `serial("id")` em **todas** — D2 alinha tipo de PK por tabela.

## 4. Divergências sistêmicas (valem p/ quase todas as 60 tabelas comuns)

Saída completa em `bun scripts/schema-diff.mjs` (sai ≠0). Resumo da última rodada:

- **38 tabelas faltantes** (lista na §1 e no script): `captain_*` (9), `copilot_*` (2),
  `sla_*` + `applied_slas` (4), `active_storage_*` (3), `calls`, `channel_tiktok`,
  `channel_twilio_sms`, `custom_roles`, `leaves`, `portals_members`, `integrations_hooks`,
  `tags`, `conversation_outcomes`, `campaign_recipients`, `data_import_mappings`,
  `inbox_capacity_limits`, `agent_capacity_policies`, `agent_sessions`, `article_embeddings`,
  `account_saml_settings`, `action_mailbox_inbound_emails`, `platform_app_permissibles`,
  `related_categories`, `user_sessions`, `audits`.
- **~253 divergências de tipo**: padrão dominante `t.datetime` (242 ocorrências no Rails =
  `timestamp` **sem** timezone) × nosso `timestamp(..., { withTimezone: true })` (145 usos,
  todos COM tz); `t.bigint` (154) × nosso `integer`; `uuid` × `varchar`; PK `bigint` × `serial`.
- **~104 divergências de nulabilidade** (ex.: `account_users.role`, `access_tokens.owner_type`).
- **37 tabelas com índices de nome Rails ausente** no nosso lado (parte coberta por
  `.unique()` sem nome — D2 nomeia todos).
- **Colunas faltantes mais críticas** (lado orig → implementar em D1/D2): `users` (+26,
  Devise: `encrypted_password`, `uid`, `tokens`, `otp_*`, `confirmation_*`, `sign_in_*`…),
  `accounts` (+8: `domain`, `support_email`, `limits`, `custom_attributes`, `settings`…),
  `notifications` (+6 atores `primary_actor_*`/`secondary_actor_*`, `meta`, `last_activity_at`),
  `conversations` (+4: `campaign_id`, `sla_policy_id`, `assignee_agent_bot_id`,
  `ai_assignee_type`), `data_imports` (+7), `campaigns` (+6), `articles` (+4), `portals` (+3),
  `messages` (+1 `sentiment`), `inboxes` (+1 `portal_id`), `custom_filters` (`filter_type`).
- **Colunas extras nossas** a resolver em D1/D2 (renomear, mover ou registrar):
  `conversations.muted`, `conversations.unread_incoming_messages_count`,
  `account_users.availability_status` (orig: `availability`), `users.password_digest`
  (orig: Devise `encrypted_password`), `access_tokens.token_digest/expires_at`,
  `reporting_events.team_id/label`, `taggings.account_id`,
  `notification_subscriptions.account_id/subscribed_at`, `custom_filters.model_type/visibility`,
  `mentions.mentioned_by`, `installation_configs.value` (orig: `serialized_value`).
- Tipos Rails sem builder nativo no nosso schema hoje: `t.vector` (embeddings/Captain) e
  `t.json` (`account_saml_settings`, `messages`, `users`, `article_embeddings`,
  `captain_assistant_responses`, `captain_faq_suggestions`) — decisão em D1/D2.
