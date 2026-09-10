# 07 — Relatórios & CSAT

> **Estágio:** 07/15 · **Status:** 🟡 0 de 8 subáreas verdes (3 parciais) · **Depende de:** 02 (conversas/mensagens) · 09 (widget/CSAT público)
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`): `reports_v2` 0/24 ações · `csat` 3/6 ações · front `reports` ✅ só pela rota casca
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

O módulo entrega a camada analítica do produto: API v2 de relatórios
(timeseries, KPIs, summary por dimensão, CSVs), live reports (fila em tempo
real), year in review, dashboard CSAT e a captação de CSAT (widget, página
pública, survey e link por e-mail). É a fonte dos números exibidos no dashboard
e exportados em CSV.

Critérios objetivos de 100%:

1. **API 1:1** — as 23 actions dos controllers v2 (`reports` 15, `live_reports`
   2, `summary_reports` 5, `year_in_reviews` 1) respondem no mesmo path/método/
   status do Rails, com **JSON cru** (sem `{ data }`; exceção: `drilldown` →
   `{ meta, payload }`) e **CSV** (`text/csv` + `Content-Disposition`) nas
   actions de export. Erros: `{ error }` (ex.: 422 `invalid group_by`).
2. **CSAT 1:1** — `csat_survey_responses#index|metrics|download` com os mesmos
   filtros/paginação/CSV, e captação pública (`public/api/v1/csat_survey`
   show/update, `survey/responses#show`, update de mensagem `input_csat` com
   `submitted_values`, limite de 14 dias) criando `csat_survey_responses` +
   evento `csat`.
3. **Auth** — relatórios e dashboard CSAT são **administrator-only** (403 para
   agente), como `ReportPolicy`/`CsatSurveyResponsePolicy`; custom role
   `report_manage` é Enterprise (fora).
4. **Dados** — eventos canônicos com nomes Rails (`first_response`,
   `conversation_resolved`, `reply_time`, `conversation_bot_*`) com
   `value_in_business_hours` e rollup por account/agent/inbox. Zero DDL novo.
5. **Aceite numérico** — no dataset do seed, `SELECT` no Postgres e resposta da
   API batem para summary/agents/teams/inboxes/labels/CSAT (script novo
   `scripts/reports-check.mjs`).
6. **Front 1:1** — rotas Overview (live), Conversas, Agentes, Inboxes, Times,
   Labels, CSAT, Bot e Year in Review com gráficos Recharts, filtros,
   drilldown, export CSV e estados vazio/loading/erro, conferidas em `shots/`.

**Não conta como 100%:** manter só as rotas v1 atuais (`/api/v1/.../reports/*`,
envelope `{ data }`, datas `YYYY-MM-DD`); exibir KPI na tela sem bater com o
`SELECT`; só a ingestão do widget sem página pública/survey; drilldowns
enterprise (`reporting_events#index`), SLA e campaign analytics.

## 2. Estado atual (medido)

| Subárea                               | Status | Evidência no nosso repo                                                                                                                                                                                    | Lacuna principal                                                                                                                 |
| ------------------------------------- | :----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `reports` v2 (15 actions)             |   ❌   | Nenhum `/api/v2` montado (`apps/server/src/index.ts`); equivalentes parciais em `apps/server/src/routes/v1/reports.ts` + `packages/core/src/services/reporting.ts`                                         | Path/envelope v2, `since/until` epoch, métricas, CSVs, drilldown                                                                 |
| `live_reports` v2 (2 actions)         |   ❌   | Inexistente                                                                                                                                                                                                | Contadores open/unattended/unassigned/pending e agrupados por time/agente                                                        |
| `summary_reports` v2 (5 actions)      |   ❌   | `breakdown()` (reporting.ts:331) devolve `resolutions_count`; sem `avg_reply_time`/`resolved_conversations_count`/`channel`                                                                                | Shapes do Rails + `channel` com limite de 6 meses (422)                                                                          |
| `year_in_review` (1 action)           |   ❌   | `uiSettings` existe (`packages/db/src/schema/auth.ts:207`); sem builder/rota                                                                                                                               | Builder + cache por usuário/ano                                                                                                  |
| `csat_survey_responses` (3 actions)   |   ❌   | `getCsatReport` (reporting.ts:585) é agregação própria                                                                                                                                                     | Lista paginada 25/pág + `ratings_count` + `total_sent_messages_count` + CSV 8 colunas                                            |
| CSAT ingestão (widget/público/survey) |   🟡   | Widget com view CSAT (`apps/widget/src/widget.ts`), `POST /public/api/v1/widgets/csat` (public.ts:142), `POST /conversations/:id/csat` (conversations.ts:241) e `submitWidgetCsat` (widget.ts:345)         | Paths Rails, mensagem `input_csat`, página `/survey/responses/:id`, limite de 14 dias                                            |
| Eventos + rollups + jobs              |   🟡   | Tabelas em `packages/db/src/schema/reporting.ts`; emissores `registerReportingEmitters` (reporting.ts:94); rollup diário (reporting.ts:608); `first_reply_created_at`/`waiting_since` em `messages.ts:173` | Nomes (`resolution` vs `conversation_resolved`), `reply_time`/bot, business hours, rollup aditivo por dimensão, seed sem eventos |
| Front de relatórios                   |   🟡   | `apps/web/src/routes/_auth/app/reports.tsx` (6 abas, Recharts, CSV no browser), `apps/web/src/lib/reports.ts`, sidebar `app-sidebar.tsx:234`                                                               | Rotas/telas 1:1, drilldown, live, CSAT completo, Bot, Year in Review, vazio/loading/erro                                         |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                                                             | O que dita para nós                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `app/controllers/api/v2/accounts/reports_controller.rb`                                                                                                                 | 15 actions, params, JSON vs CSV, drilldown admin-only 401/422 |
| `app/controllers/api/v2/accounts/live_reports_controller.rb`                                                                                                            | 2 actions + `group_by` `team_id                               | assignee_id` (422 inválido) |
| `app/controllers/api/v2/accounts/summary_reports_controller.rb`                                                                                                         | 5 actions, `business_hours`, `channel` > 6 meses → 422        |
| `app/controllers/api/v2/accounts/year_in_reviews_controller.rb` + `app/builders/year_in_review_builder.rb`                                                              | `show` por `year`, cache em `users.ui_settings`               |
| `app/controllers/api/v1/accounts/csat_survey_responses_controller.rb` + views jbuilder/csv                                                                              | `index                                                        | metrics                     | download`, filtros, 25/pág, CSV |
| `app/controllers/public/api/v1/csat_survey_controller.rb`, `survey/responses_controller.rb`                                                                             | CSAT público e página do survey                               |
| `app/controllers/public/api/v1/inboxes/messages_controller.rb#update`, `api/v1/widget/messages_controller.rb#update`, `app/builders/csat_surveys/response_builder.rb`   | Submissão via `submitted_values` na mensagem `input_csat`     |
| `app/builders/v2/reports/*` + `app/services/reports/{data_source,report_metric_registry,raw_data_source}.rb`                                                            | Semântica das métricas, dimensões e timeseries                |
| `app/listeners/reporting_event_listener.rb` + `app/services/reporting_events/{rollup_service,event_metric_registry}.rb`                                                 | Nomes canônicos dos eventos e formato dos rollups             |
| `app/policies/report_policy.rb`, `app/policies/csat_survey_response_policy.rb`                                                                                          | Guarda administrator (403) no OSS                             |
| `app/javascript/dashboard/routes/dashboard/settings/reports/*`, `dashboard/api/{reports,liveReports,summaryReports,csatReports}.js`, `components-next/year-in-review/*` | UI/comportamento do front                                     |
| `db/schema.rb` (`reporting_events`, `reporting_events_rollups`, `csat_survey_responses`, `inbox_csat_templates`)                                                        | Dados (DDL da trilha D — não alterar)                         |

## 4. Lacunas detalhadas

### 4.1 API

Geral: admin-only em tudo (401 deslogado / 403 agente); `since`/`until` em
**epoch (segundos)** (`DateRangeHelper#parse_date_time` = `%s`);
`timezone_offset` em **horas** (`TimezoneHelper`: offset×3600; o front envia
`-getTimezoneOffset()/60`) — nosso `ReportsQuerySchema` usa `YYYY-MM-DD` e
minutos, alinhar.

**`api/v2/accounts/reports_controller`** (`apps/server/src/routes/v2/reports.ts` + `packages/core/src/services/reporting.ts`):

- [ ] `GET /api/v2/accounts/:account_id/reports` — `reports#index` — timeseries da métrica (`metric`, `type=account|inbox|agent|label|team` + `id`, `group_by=day|week|month|year|hour`, `business_hours`); JSON cru.
- [ ] `GET .../reports/summary` — KPIs atuais + `previous` (janela anterior de mesmo tamanho): `conversations_count`, `incoming_messages_count`, `outgoing_messages_count`, `avg_first_response_time`, `avg_resolution_time`, `resolutions_count`, `reply_time`.
- [ ] `GET .../reports/bot_summary` — `{ bot_resolutions_count, bot_handoffs_count }` (+ `previous`).
- [ ] `GET .../reports/agents` — **CSV** `agents_report.csv` (nome, conversas, 1ª resposta, resolução, reply time, resolvidas — formatado por `TimeFormatPresenter`).
- [ ] `GET .../reports/inboxes` — **CSV** `inboxes_report.csv` (nome do inbox + canal + métricas).
- [ ] `GET .../reports/labels` — **CSV** `labels_report.csv`.
- [ ] `GET .../reports/teams` — **CSV** `teams_report.csv`.
- [ ] `GET .../reports/conversations_summary` — **CSV** `conversations_summary_report.csv` (métricas do summary).
- [ ] `GET .../reports/conversation_traffic` — **CSV** heatmap (`days_before`, default 6 no front; `timezone_offset`): `['Start of the hour', <datas>]` + linhas `HH:00`.
- [ ] `GET .../reports/conversations` — `type` obrigatório (senão 422); `type=account` → `{open,unattended,unassigned,pending}`; demais tipos → métricas por agente paginadas (`page`, 25/pág).
- [ ] `GET .../reports/drilldown` — só administrator (senão 401); exige `metric|bucket_timestamp|since|until`, métrica registrada, `type` suportado e timestamp dentro do bucket (senão 422); resposta `{ meta, payload }` com paginação (`per_page` ≤ 100).
- [ ] `GET .../reports/bot_metrics` — `{ conversation_count, message_count, resolution_rate, handoff_rate }` (inboxes com bot ativo; handoff prevalece sobre resolução no mesmo range).
- [ ] `GET .../reports/inbox_label_matrix` — `{ inboxes:[{id,name}], labels:[{id,title}], matrix:[[count]] }` com filtros `inbox_ids[]`/`label_ids[]`.
- [ ] `GET .../reports/first_response_time_distribution` — por `channel_type`, buckets `'0-1h'`, `'1-4h'`, `'4-8h'`, `'8-24h'`, `'24h+'`.
- [ ] `GET .../reports/outgoing_messages_count` — `group_by=agent|team|inbox|label` (senão 422); `[{id,name,outgoing_messages_count}]`.

**`api/v2/accounts/live_reports_controller`:**

- [ ] `GET .../live_reports/conversation_metrics` — `{ open, unattended, unassigned, pending }`; filtro opcional `team_id`.
- [ ] `GET .../live_reports/grouped_conversation_metrics` — `group_by=team_id|assignee_id` (senão 422 `{ error: 'invalid group_by' }`) → `[{ open, unattended, unassigned, <group_by> }]`.

**`api/v2/accounts/summary_reports_controller`** (params `since`/`until`/`business_hours`):

- [ ] `GET .../summary_reports/agent` — `[{ id, conversations_count, resolved_conversations_count, avg_resolution_time, avg_first_response_time, avg_reply_time }]`.
- [ ] `GET .../summary_reports/team` — mesmo shape por time.
- [ ] `GET .../summary_reports/inbox` — mesmo shape por inbox.
- [ ] `GET .../summary_reports/label` — `[{ id, name, ..., resolved_conversations_count }]` por label.
- [ ] `GET .../summary_reports/channel` — `{ channel_type: { open, resolved, pending, snoozed, total } }`; range > 6 meses → 422.

**`api/v2/accounts/year_in_reviews_controller`:**

- [ ] `GET .../year_in_review?year=` (default 2025) — `{ year, total_conversations, busiest_day, support_personality }`; cache em `users.ui_settings["year_in_review_<account>_<year>"]`.

**`api/v1/accounts/csat_survey_responses_controller`** (admin-only; `since`/`until` epoch; filtros `user_ids[]`, `inbox_id`, `team_id`, `rating`, `sort=-created_at`):

- [ ] `GET .../csat_survey_responses` — array JSON direto (sem `{data}`) no partial do Rails: `id`, `rating`, `feedback_message`, `csat_review_notes`, `account_id`, `message_id`, `contact`, `assigned_agent`, `conversation_id` (display_id), `created_at` (epoch), 25/página.
- [ ] `GET .../csat_survey_responses/metrics` — `{ total_count, ratings_count: {1..5}, total_sent_messages_count }` (o último conta `messages.content_type='input_csat'` no range).
- [ ] `GET .../csat_survey_responses/download` — **CSV** `csat_report.csv` com 8 colunas (agente nome+e-mail, rating, feedback, nome/e-mail/telefone do contato, link da conversa, criação) + linha do período; `review_notes` é Enterprise (fora).

**Captação pública de CSAT:**

- [ ] `GET /public/api/v1/csat_survey/:id` — `:id` = `conversation.uuid`; localiza a mensagem `input_csat`; resposta crua: `{ id, csat_survey_response, display_type, content, inbox_avatar_url, inbox_name, locale, conversation_id, created_at }` (`display_type`/`content` vêm de `inbox.csat_config`).
- [ ] `PATCH /public/api/v1/csat_survey/:id` — body `{ message: { submitted_values: { csat_survey_response: { rating, feedback_message } } } }`; **422** se passou 14 dias da mensagem; resposta = mesmo partial.
- [ ] `GET /survey/responses/:id` — página HTML do survey (`chatwoot/app/javascript/survey/App.vue`); server serve o entrypoint e a página consome a API pública.
- [ ] Update de mensagem com `submitted_values` (mesma regra de 14 dias) em `PATCH /public/api/v1/inboxes/:inbox_id/contacts/:contact_id/conversations/:conversation_id/messages/:id` e `PATCH /api/v1/widget/messages/:id`, criando/atualizando `CsatSurveyResponse` por `message_id` (unique) — `CsatSurveys::ResponseBuilder`.
- [ ] Divergência declarada: `POST /api/v1/accounts/:account_id/conversations/:conversation_id/csat` e `POST /public/api/v1/widgets/csat` **não existem no Rails** (atalhos nossos). Manter durante a transição e depois redirecionar/remover.

### 4.2 Front

Rota raiz: `settings/reports` (nossa `/app/reports`; `reports.routes.js`).

- [ ] `overview` (LiveReports) — cards live (open/unattended/unassigned/pending + por agente/time) com refresh; refs `LiveReports.vue`, `AgentLiveReportContainer.vue`, `TeamLiveReportContainer.vue`, `StatsLiveReportsContainer.vue`.
- [ ] `conversation` (Index.vue) — KPIs (`ReportContainer`, `ChartElements/ChartStats`) + timeseries por métrica + heatmap (`heatmaps/ConversationHeatmapContainer`) + `ReportFilters`/`OverviewReportFilters`.
- [ ] `agents_overview` / `agents/:id`, `inboxes_overview` / `inboxes/:id`, `teams_overview` / `teams/:id`, `labels_overview` / `labels/:id` — tabelas de summary + show com gráficos; rotas antigas (`agent`, `inboxes`, `label`, `teams`) como redirect; refs `AgentReports*`, `InboxReports*`, `TeamReports*`, `LabelReports*`, `SummaryReports.vue`, `SummaryReportLink.vue`, `ReportDrilldownCard/Drawer` + `composables/useReportDrilldown.js`.
- [ ] `csat` (CsatResponses.vue) — `CsatFilters` (data/agentes/inbox/time/rating), `CsatMetrics` (cards + `CsatRatingDistribution`), `CsatTable` (paginação, `CsatExpandedRow`, `CsatContactCell`) e download CSV; `CsatEmptyState`/`CsatTableLoader` para vazio/loading; `CsatReviewNotesPaywall` é Enterprise (fora).
- [ ] `bot` (BotReports.vue + `BotMetrics.vue`) — cards de resoluções/handoffs + taxas.
- [ ] Year in Review — banner na home (`YearInReviewBanner`) + modal/slides (`IntroSlide`, `ConversationsSlide`, `BusiestDaySlide`, `PersonalitySlide`, `ThankYouSlide`) + `ShareModal`.
- [ ] Estados vazio/loading/erro em todas as rotas (skeleton, loader, aviso de falha de fetch).

### 4.3 Dados, jobs e realtime

- [ ] `reporting_events`: alinhar nomes canônicos do `ReportingEventListener` — `first_response` (início = `last_non_human_activity`), `conversation_resolved`, `reply_time`, `conversation_bot_resolved`, `conversation_bot_handoff`; hoje emitimos `resolution` e não emitimos `reply_time`/bot (reporting.ts:94).
- [ ] `reply_time`: emitir em mensagem de agente usando `waiting_since` (0 quando nil), como o listener Rails.
- [ ] `value_in_business_hours` + `business_hours=true`: calcular pelas working hours do inbox (coluna existe, sem uso no nosso código).
- [ ] Rollups: `RollupService` grava account/agent/inbox com upsert **aditivo** (`count = count + EXCLUDED.count`, `sum_value`, `sum_value_business_hours`) e métricas `resolutions_count`, `resolution_time`, `first_response`, `reply_time`, `bot_resolutions_count`, `bot_handoffs_count`; nosso `rollupDay` (reporting.ts:608) só grava `account`, por dia, e **substitui** valores.
- [ ] Seed determinístico (`packages/db/src/seed.ts`): `reporting_events` coerentes com as conversas/mensagens (first_response/conversation_resolved), `first_reply_created_at`/`status_changed_at`/`waiting_since` e o CSAT já existente (seed.ts:728) — sem isso o aceite `SELECT`×API não fecha.
- [ ] CSAT: persistir a mensagem `input_csat` (com `content_attributes.submitted_values`) e manter 1 resposta por `message_id`; hoje vinculamos à última mensagem outgoing.
- [ ] Realtime: live reports do Rails fazem polling no mount — nenhum evento novo de `/cable` é necessário. `(verificar)` se o banner de Year in Review escuta WS.

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                                                                                       | Arquivos-alvo                                                                                                      | Depende      |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------ |
| 07-1  | Montar router `/api/v2` + helpers (JSON cru, erro `{error}`, CSV `text/csv`+filename) e guarda `requireAdministrator` (403) para reports/CSAT                                | `apps/server/src/index.ts`, `apps/server/src/routes/v2/{index,_helpers}.ts`, `apps/server/src/middlewares/auth.ts` | —            |
| 07-2  | Zod v2: `since/until` epoch, `timezone_offset` (horas), `type/id/metric/group_by/business_hours`; query CSAT (`page`, `user_ids[]`, `inbox_id`, `team_id`, `rating`, `sort`) | `packages/core/src/schemas/reports.ts`                                                                             | 07-1         |
| 07-3  | Emissores: nomes Rails + `reply_time` + bot + `value_in_business_hours` (idempotência mantida)                                                                               | `packages/core/src/services/reporting.ts`                                                                          | 02           |
| 07-4  | Rollup aditivo por account/agent/inbox com `sum_value_business_hours` + backfill no boot                                                                                     | `packages/core/src/services/reporting.ts`                                                                          | 07-3         |
| 07-5  | `reports` JSON: `index` (timeseries), `summary` (+`previous`), `bot_summary`, `conversations`                                                                                | `packages/core/src/services/reporting.ts`, `apps/server/src/routes/v2/reports.ts`                                  | 07-2, 07-3   |
| 07-6  | CSVs: `agents`, `inboxes`, `labels`, `teams`, `conversations_summary`, `conversation_traffic` + `TimeFormatPresenter`                                                        | `packages/core/src/services/reporting.ts`, `apps/server/src/routes/v2/reports.ts`                                  | 07-5         |
| 07-7  | Builders restantes: `bot_metrics`, `inbox_label_matrix`, `first_response_time_distribution`, `outgoing_messages_count`, `drilldown` (`{meta,payload}`)                       | `packages/core/src/services/reporting.ts`, `apps/server/src/routes/v2/reports.ts`                                  | 07-5         |
| 07-8  | `live_reports`: `conversation_metrics` + `grouped_conversation_metrics`                                                                                                      | `packages/core/src/services/reporting.ts`, `apps/server/src/routes/v2/live-reports.ts`                             | 07-1         |
| 07-9  | `summary_reports`: agent/team/inbox/label/channel (+422 > 6 meses)                                                                                                           | `packages/core/src/services/reporting.ts`, `apps/server/src/routes/v2/summary-reports.ts`                          | 07-2         |
| 07-10 | `year_in_review` + cache em `users.ui_settings`                                                                                                                              | `packages/core/src/services/reporting.ts`, `apps/server/src/routes/v2/year-in-review.ts`                           | 07-2         |
| 07-11 | `csat_survey_responses` index/metrics/download + serializers do partial + contagem `input_csat`                                                                              | `packages/core/src/services/reporting.ts`, `apps/server/src/routes/v1/csat-survey-responses.ts`                    | 07-2         |
| 07-12 | CSAT público: `csat_survey` show/update, `submitted_values` no update de mensagem (widget + public inbox) com 14 dias, e página `/survey/responses/:id`                      | `apps/server/src/routes/public.ts`, `apps/server/src/routes/v1/conversations.ts`, `apps/web/src/routes/survey/`    | 09           |
| 07-13 | Front shell: subrotas de `reports` + filtros compartilhados + `ReportDrilldownDrawer` + estados vazio/loading/erro                                                           | `apps/web/src/routes/_auth/app/reports/`                                                                           | 07-5         |
| 07-14 | Front Overview/Conversas/Agentes/Inboxes/Times/Labels (index+show, gráficos Recharts, heatmap)                                                                               | `apps/web/src/routes/_auth/app/reports/`, `apps/web/src/lib/reports.ts`                                            | 07-13        |
| 07-15 | Front CSAT (filtros, cards, distribuição, tabela paginada, CSV) + Bot + Year in Review                                                                                       | idem + `apps/web/src/components/year-in-review/`                                                                   | 07-11, 07-13 |
| 07-16 | Seed de eventos/CSAT + `scripts/reports-check.mjs` (SELECT×API) + e2e/parity do módulo                                                                                       | `packages/db/src/seed.ts`, `scripts/reports-check.mjs`, `scripts/e2e.mjs`, `scripts/parity-report.mjs`             | 07-3..07-11  |

## 6. Aceite

```bash
# qualidade
bun run check-types && bunx oxlint

# contrato + números (novo)
bun scripts/reports-check.mjs          # SELECT × API no dataset do seed
bun scripts/e2e.mjs                    # fluxo global + relatório v2 + CSAT

# paridade de superfície
bun scripts/parity-report.mjs --write-doc   # reports_v2 e csat sobem; front reports

# visual
bun scripts/shot.mjs                   # shots/relatorios-*.png e shots/csat-*.png
```

- [ ] Critério 1 — contrato: as 23 actions v2 respondem 200 (admin), 403 (agente), JSON cru/CSV com `Content-Disposition` e 422 nos inválidos (`group_by`, `type` ausente, drilldown sem bucket, `channel` > 6 meses).
- [ ] Critério 2 — dataset do seed: 6 conversas, 1 `csat_survey_responses` e ≥1 `first_response`/`conversation_resolved`; `summary.conversations_count` = `SELECT count(*)` no range e o mesmo para agents/teams/inboxes/labels e `metrics.total_count`.
- [ ] Critério 3 — CSAT ponta a ponta: submit pelo widget/`csat_survey` cria linha + evento `csat`, aparece em `csat_survey_responses`, no `metrics` e no CSV `download`; após 14 dias → 422.
- [ ] Critério 4 — `bun scripts/parity-report.mjs`: recorte `reports_v2` 24/24 (23 deste módulo + `POST /api/v2/accounts` do 12) e `csat` 6/6 (hoje 0 e 3).
- [ ] Critério 5 — visual lado a lado de `shots/relatorios-*.png` (overview/live/CSAT/tabelas) com o Chatwoot local, incluindo vazio/loading/erro.

## 7. Fora de escopo

- **Enterprise**: `reporting_events#index` (`enterprise/api/v1/accounts/reporting_events_controller.rb`), SLA reports (`sla_reports`, `applied_slas`), campaign analytics, custom role `report_manage`, `csat_review_notes`/paywall, capacity.
- i18n (pt-BR/en) e pipeline/CI.
- DDL: nenhuma mudança (trilha D já fechou `reporting_events`, `reporting_events_rollups`, `csat_survey_responses` e `inbox_csat_templates`).
- Outros módulos: envio do e-mail de CSAT (14/mailers), configuração de CSAT do inbox no settings (04), widget avançado (09) — aqui só o contrato/consumo.

## 8. Definição de done

- [ ] `apps/server/src/index.ts` montando `/api/v2` com as 23 actions e guarda admin (403).
- [ ] `packages/core/src/services/reporting.ts` com emissores/rollup/builder alinhados ao Rails; `schema-diff`/`roundtrip` inalterados (zero DDL).
- [ ] `csat_survey_responses` (3 actions) + captação pública/survey/widget nos paths Rails.
- [ ] Front com as rotas listadas, estados e `shots/` comparados.
- [ ] `scripts/reports-check.mjs` e `scripts/e2e.mjs` verdes 2× seguidas; `parity-report` com `reports_v2` e `csat` cobertos.
- [ ] `check-types` + `oxlint` verdes; status deste módulo atualizado em `roadmap.md` e `docs/specs/paridade-mapa.md`.
