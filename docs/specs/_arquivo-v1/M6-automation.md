# M6 — Teams, Assignment, Canned, Macros, Automations, Webhooks

Depende de: **M4**. Desbloqueia: M7, M8.

## 1. Objetivo

Roteamento (teams + auto-assign), respostas prontas, macros de 1 clique,
automações por regras e webhooks de saída.

## 2. Referência Chatwoot

- Models: `team, team_member, canned_response, macro, automation_rule,
automation_rule_pending_execution, webhook`
- Controllers: `teams_controller, canned_responses_controller,
macros_controller (+ /execute), automation_rules_controller, webhooks_controller`
- Vue: `settings/teams|macros|automation|webhooks` + builder de automação
  (eventos/condições/ações) + `//` autocomplete no ReplyBox

## 3. DB (`packages/db/src/schema/m6.ts`)

- `teams (id, account_id, name, description, allow_auto_assign, created_at, updated_at)`
- `team_members (team_id, user_id)`
- `canned_responses (id, account_id, short_code unique scoped, content)`
- `macros (id, account_id, name, visibility 0 personal/1 global, created_by_id,
actions jsonb [{ action_name, action_params }])`
- `automation_rules (id, account_id, name, description, event_name
(conversation_created/updated, message_created), conditions jsonb
[{ attribute_key, filter_operator, values }], actions jsonb, active)`
- `automation_rule_pending_executions (rule_id, conversation_id, scheduled_at)`
  (ações com delay, ex.: snooze)
- `webhooks (id, account_id, inbox_id?, url, subscriptions[] text)`

## 4. Infra — BullMQ (Redis 8) + troca de runner

- Substituir `InProcessRunner` por `BullMQRunner` (`@taskforcesh/bullmq-pro` NÃO — usar `bullmq` >= 5) em
  `packages/core/src/jobs/index.ts`: mesma interface `JobRunner` (`dispatch/on`),
  **nenhum service/chamador muda**. Fila padrão `chatwootjs` + prefixo `bull:{account}`.
- Ativação: se `REDIS_URL` estiver setado → `BullMQRunner`; senão mantém
  `InProcessRunner` (dev sem docker segue funcionando).
- `docker-compose.yml`: serviço `redis:8-alpine` com volume persistente +
  `REDIS_URL=redis://redis:6379/0` no server (já provisionado).
- Worker: roda no mesmo processo do server (`apps/server`) em `--production`;
  separar processo worker só se necessário depois (não criar `apps/worker` agora).
- Jobs desta spec em fila: `automation_rule.execute`,
  `automation_rule.execute_delayed` (delayed job p/ snooze, consumindo
  `automation_rule_pending_executions`), `webhook.deliver` (retry exponencial,
  até 3 tentativas, `removeOnComplete: 1000`).
- Idempotência: job reexecutável sem efeito duplicado (checar state antes de agir).

## 5. API + Jobs

| Método | Path                                                     | Obs                                        |
| ------ | -------------------------------------------------------- | ------------------------------------------ |
| CRUD   | `/api/v1/accounts/:id/teams` + `/teams/:id/team_members` |                                            |
| CRUD   | `/api/v1/accounts/:id/canned_responses`                  | busca `?search=` (para `//`)               |
| CRUD   | `/api/v1/accounts/:id/macros`                            |                                            |
| POST   | `/api/v1/accounts/:id/macros/:id/execute`                | `{ conversation_id }` aplica actions       |
| CRUD   | `/api/v1/accounts/:id/automation_rules`                  | valida conditions/actions por evento (Zod) |
| CRUD   | `/api/v1/accounts/:id/webhooks`                          | testa com `POST .../webhooks/:id/test`     |

- `packages/core/jobs/automation.ts`: listener dos eventos de domínio
  (`conversation.created/updated`, `message.created`) → avalia rules ativas
  (AND/OR de conditions) → executa actions (assign team/agent, add label,
  send message/webhook, change status/priority, snooze) + dispara `webhooks`
  (`conversation_created/updated/message_created/...` conforme subscriptions).
- Auto-assign: `assignment_policy` da inbox (round_robin entre membros online)
  executado ao criar conversa quando `enable_auto_assignment`.
- Macro actions suportadas (paridade Rails): `assign_agent, assign_team,
add_label, remove_label, send_message, change_status, change_priority, snooze`.

## 6. Front

- `settings/teams|macros|canned|automations|webhooks` (CRUDs iguais ao Vue;
  builder de automação com evento→condições→ações).
- ReplyBox: `//` autocomplete de canned; dropdown de macros no header da
  conversa; seletor de team no header (M4 já prevê o slot).

## 7. Aceite

- [ ] Regra "conversa criada + prioridade urgente → assign team X + label Y +
      dispara webhook" executa < 5s e aparece activity message.
- [ ] Macro de 1 clique aplica N ações corretamente.
- [ ] `//atalho` insere canned no ReplyBox.
- [ ] Round-robin distribui entre membros online da inbox.
- [ ] Webhook recebe payload no formato do Rails (comparar com doc do Chatwoot).
- [ ] Com `REDIS_URL` setado, `redis-cli keys 'bull:*'` mostra filas BullMQ e
      o runner ativo é `BullMQRunner`; sem `REDIS_URL`, dev segue in-process.
- [ ] Job falho (webhook 500) faz retry exponencial e não trava a fila.

## 8. Done

Migration + CRUDs + executor + jobs + builder + testes (rule matching,
macro execute, webhook delivery com retry).
