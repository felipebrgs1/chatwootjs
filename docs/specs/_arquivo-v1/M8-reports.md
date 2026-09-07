# M8 — Reports & CSAT

Depende de: **M4, M6**. Paralelizável com M7, M9.

## 1. Objetivo

Relatórios Overview/Agent/Team/Inbox/Label + CSAT — mesmos KPIs e gráficos
do Chatwoot, alimentados por `reporting_events`.

## 2. Referência Chatwoot

- Models: `reporting_event, reporting_events_rollup`
- `reports_controller.rb` (`summary, agents, teams, inboxes, labels, overview`),
  `csat_survey_responses_controller.rb`
- Vue: `dashboard/routes/dashboard/reports/` (KPI cards + gráficos + export CSV)
- Workers que geram eventos: first_response, resolution, reply_time, csat

## 3. DB

- `reporting_events (id, account_id, conversation_id, inbox_id, team_id, user_id,
label, name (first_response/resolution/reply_time/csat/incoming...),
value, value_in_business_hours, event_start_time, event_end_time,
created_at)` + índices `(account_id, name, created_at)`
- `reporting_events_rollup` (agregado horário/diário — job noturno, agendado
  via BullMQ repeatable job — roda pelo `JobRunner` do M6, mesma fila `chatwootjs`)

Emissores (jobs/hooks no domínio, não Controller):

- mensagem outgoing primeira do agente → `first_response`
- conversa resolvida → `resolution` (+ `reply_time` médio)
- resposta CSAT (widget/email) → `csat` (+ `csat_survey_responses` no M4)

## 4. API

| Método | Path                                              | Obs                                                                                                                                                                                        |
| ------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/v1/accounts/:id/reports/summary`            | `since, until, timezone_offset` → `{ conversations_count, incoming_messages_count, outgoing_messages_count, resolutions_count, avg_first_response_time, avg_resolution_time, reply_time }` |
| GET    | `/api/v1/accounts/:id/reports/agents?since&until` | por agente                                                                                                                                                                                 |
| GET    | `/api/v1/accounts/:id/reports/teams`              | por team                                                                                                                                                                                   |
| GET    | `/api/v1/accounts/:id/reports/inboxes`            | por inbox                                                                                                                                                                                  |
| GET    | `/api/v1/accounts/:id/reports/labels`             | por label                                                                                                                                                                                  |
| GET    | `/api/v1/accounts/:id/reports/overview`           | série temporal p/ gráficos                                                                                                                                                                 |
| GET    | `/api/v1/accounts/:id/reports/csat`               | distribuição 1–5 + taxa resposta                                                                                                                                                           |
| POST   | `/api/v1/accounts/:id/conversations/:id/csat`     | registra resposta (link do e-mail/widget)                                                                                                                                                  |

Todos com `timezone_offset` (minutos) igual ao Rails.

## 5. Front

- `reports/index` (overview: KPI cards + line/bar charts via Recharts +
  seletor de período + export CSV) e abas Agents/Teams/Inboxes/Labels/CSAT
  (tabelas ordenáveis iguais ao Vue).

## 6. Aceite

- [ ] Seed de 50 conversas fake → summary coerente (contagens e médias conferem
      via SQL manual).
- [ ] CSAT respondido no widget aparece no relatório CSAT.
- [ ] Trocar período/timezone muda os números corretamente.
- [ ] Export CSV baixa os dados da tabela visível.

## 7. Done

Migration + emissores + endpoints + telas + job rollup + testes
(cálculo de first_response/resolution com fixtures).
