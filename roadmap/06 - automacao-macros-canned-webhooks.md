# 06 — Automação, Macros, Canned & Webhooks

> **Estágio:** 06/15 · **Status:** 🟡 0 de 6 subáreas ✅ (API ponderada 93% no recorte, mas paridade plena ainda não) · **Depende de:** 02 (Conversas & Mensagens); 05 (Times/Agentes) nas ações `assign_*`
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`): áreas `automation` 6 ações, `macros` 6, `canned` 4, `labels` 7, `webhooks` 4; cobertura por área é binária, a dívida real está na §4.
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

Entrega o motor de produtividade do Chatwoot: **regras de automação** (evento → condições → ações, com `clone` e execução imediata/adiada), **macros** (N ações em 1 clique, visibilidade pessoal/global), **respostas prontas** (`short_code` + gatilho `/` no composer), **webhooks de saída** (subscriptions, entrega assinada, retry) e **labels** (cor/descrição/`show_on_sidebar` + uso em conversas/contatos) — com as 5 páginas de settings 1:1 com o Vue.

Fluxo de referência que precisa ser 1:1 (ordem do Rails):

1. **Regra**: `POST /automation_rules` (admin) valida condições/ações no model e grava; `index`/`update`/`clone` devolvem `{payload}`, o `create` devolve o partial plano.
2. **Execução**: evento de domínio → `AutomationRuleListener` filtra por `event_name`/`active` → `ConditionsFilterService` avalia AND/OR → sem delay, `ActionService`; com delay (flag), `AutomationRulePendingExecution.schedule`; sweep pega `pending` vencido, revalida e executa (ou marca `skipped`).
3. **Macro**: `index` filtra global + pessoais do autor; `execute` recebe `conversation_ids` (display ids), enfileira `MacrosExecutionJob` e responde `head :ok`; cada ação roda isolada com o agente executor.
4. **Canned**: CRUD simples por conta (sem policy), `short_code` único, busca com `order_by_search`; o composer troca o comando `/short_code` pelo conteúdo.
5. **Webhook**: CRUD admin; `WebhookListener` monta o payload do evento e `Webhooks::Trigger` assina com HMAC (`ts.body`) e envia em ≤5s.

**100% quando (objetivo e testável):**

1. **API 1:1** — as 27 ações do recorte do `parity-report` (`automation` 6 + `macros` 6 + `canned` 4 + `labels` 7 + `webhooks` 4) respondem no mesmo path/método/status/envelope dos controllers do pino, incluindo `show`, `clone` e `execute` que hoje faltam ou divergem.
2. **Semântica 1:1** — eventos (`conversation_created/updated/opened/resolved/message_created`), atributos/operadores de `lib/filters/filter_keys.yml`, ações de `AutomationRule`/`Macro::ACTIONS_ATTRS`, `attribute_changed`, delay com a flag `delayed_automations` e arme no `conversation_created`.
3. **Webhook 1:1** — payload (`webhook_data` + `event` + `changed_attributes`), headers `X-Chatwoot-Timestamp`, `X-Chatwoot-Signature: sha256=<HMAC(ts.body)>` e `X-Chatwoot-Delivery`, e os 12 eventos de `Webhook::ALLOWED_WEBHOOK_EVENTS`.
4. **Front 1:1** — automação com run type/espera, macros com editor de nós, canned, labels e webhooks (secret) + autocomplete `/` no composer + macro na conversa, com comparação visual.
5. **Aceite local** — comandos da §6 verdes, e2e dos 3 fluxos novos e `parity-report` fechando o módulo.

**NÃO conta como 100%:** rota que devolve `{data}` nosso em vez do `payload`/registro cru do Rails; validação que aceita ação/operador que o Rails recusa; ação permitida que estoura em runtime; HMAC com cabeçalho diferente; página bonita sem o builder do Vue. Ficam de fora endpoints de integrações (módulo 10), labels do widget (09), relatórios por label (07) e webhooks inbound de canais (04/07). Nenhuma mudança de DDL.

## 2. Estado atual (medido)

| Subárea                                   | Status | Evidência no nosso repo                                                                                                                              | Lacuna principal                                                                                                                                                            |
| ----------------------------------------- | :----: | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automação — CRUD/`clone`                  |   🟡   | `apps/server/src/routes/v1/automation.ts`; `packages/core/src/services/automation.ts`                                                                | sem `GET show`; `create` 201 × 200; envelopes `{data}` × `payload` (e `create` plano); faltam `account_id`/`created_on`/`files`; index sem gate admin                       |
| Automação — motor (condições/ações/delay) |   🟡   | `services/automation.ts`, `services/conversation-actions.ts`, `jobs/automation.ts`                                                                   | 3 de 5 eventos; operadores/atributos incompletos; 3 ações validam mas estouram; delay sem flag `delayed_automations`; sem `attribute_changed`/`changed_attributes`          |
| Macros                                    |   🟡   | `routes/v1/macros.ts`, `services/macros.ts`, `components/conversations/{ConversationHeader,DetailsPanel}.tsx`                                        | 8 nomes de 16 ações (1 alias; faltam 9); `execute` por id interno/`{queued}`; sem `show`; sem `created_by`/`updated_by`; sem anexo/transcript; sender da mensagem nulo      |
| Respostas prontas (canned)                |   🟡   | `routes/v1/canned-responses.ts`, `services/canned-responses.ts`, `components/conversations/ReplyBox.tsx`                                             | envelope/registro cru; `limit`/ordem próprios; `requireAdmin` onde o pino não tem policy; composer sem variáveis/drafts                                                     |
| Webhooks de saída                         |   🟡   | `routes/v1/webhooks.ts`, `services/webhooks.ts`                                                                                                      | payload/HMAC/delivery errados; 3 de 12 eventos; `secret` ausente; `/test` extra fora do pino; sem `inbox`/`account_id`                                                      |
| Labels                                    |   🟡   | `services/contacts.ts` (labels), `routes/v1/labels.ts`, `routes/v1/contacts.ts`, `routes/v1/conversations.ts`, `app-sidebar.tsx`, `DetailsPanel.tsx` | sem `show` e sem `GET conversations/:id/labels`; envelopes; validação de título fraca; `show_on_sidebar` ignorado na sidebar; rename/delete não propaga `cached_label_list` |
| Settings UI + composer                    |   🟡   | `routes/_auth/app/settings/{automations,macros,canned,labels,webhooks}.tsx`; `components/settings/action-editor.tsx`                                 | automação sem builder por evento/run type/espera; macro sem editor de nós/readOnly; webhook sem secret; sem shots lado a lado                                               |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                                                                         | O que dita para nós                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `app/controllers/api/v1/accounts/{automation_rules,macros,canned_responses,webhooks,labels}_controller.rb` + `conversations/labels_controller.rb` + `contacts/labels_controller.rb` | contrato das actions do recorte (paths/status/envelope)                                                                     |
| `app/views/api/v1/accounts/**/*.json.jbuilder` + `app/views/api/v1/models/_macro.json.jbuilder`                                                                                     | envelope `payload` (index/show/update/clone/macros/webhooks/labels) e registro plano (create de automation, labels, canned) |
| `app/models/{automation_rule,macro,canned_response,webhook,label}.rb`                                                                                                               | listas permitidas, validações e escopos (`with_visibility`, `order_by_search`)                                              |
| `app/services/automation_rules/{condition_validation_service,conditions_filter_service,action_service}.rb` + `lib/filters/filter_keys.yml`                                          | operadores por atributo, AND/OR encadeado, custom attributes e `attribute_changed`                                          |
| `app/listeners/automation_rule_listener.rb` + `app/jobs/automation_rules/{trigger,process_pending_execution}_job.rb` + `app/models/automation_rule_pending_execution.rb`            | eventos, arme/sweep, `DUE_WINDOW` 3 dias, status e dedupe por episódio                                                      |
| `app/jobs/macros_execution_job.rb` + `app/services/macros/execution_service.rb`                                                                                                     | `conversation_ids` por `display_id`, ação por ação e `macro.executed`                                                       |
| `app/listeners/webhook_listener.rb`, `app/jobs/webhook_job.rb`, `lib/webhooks/trigger.rb`, `app/models/concerns/webhook_secretable.rb`                                              | 12 eventos, payload, HMAC, delivery id e timeout                                                                            |
| `app/policies/{automation_rule,macro,label,webhook}_policy.rb`                                                                                                                      | quem vê/cria/edita/executa (canned não tem policy — todo agente da conta)                                                   |
| `app/javascript/dashboard/routes/dashboard/settings/{automation,macros,canned,labels,integrations/Webhooks}/*` + `helper/automationHelper.js`                                       | UI, builder, validações e gatilhos                                                                                          |
| `db/schema.rb` → `automation_rules`, `automation_rule_pending_executions`, `macros`, `canned_responses`, `webhooks`, `labels`, `taggings`                                           | dados (DDL fechado na trilha D — não alterar)                                                                               |

## 4. Lacunas detalhadas

> Os IDs `06-x` dos checklists são os mesmos da tabela da §5 (ex.: 06-17 =
> builder de automação no front; 06-24 = e2e). Divergências de contrato entram
> como correção, não como novo endpoint.

### 4.1 API

Automação:

- [ ] **06-1** `GET /api/v1/accounts/:account_id/automation_rules/:id` (`AutomationRulesController#show`) — falta na rota; resposta `{ payload: { id, account_id, name, description, event_name, conditions, actions, created_on (epoch), active, execution_delay, files? } }`. Aproveitar e alinhar: `index` = `{ payload: [...] }`; `update`/`clone` = `{ payload: {...} }` **200** (hoje `clone` 201); `create` = partial **plano** (sem `payload` — o store Vue lê `response.data`), **200**; `destroy` = `head :ok` (200 vazio, hoje `{data:{ok}}`). Permissão: `index` admin-only (`AutomationRulePolicy`), hoje aberto.
- [ ] **06-2** Eventos completos: adicionar `conversation_opened` e `conversation_resolved` ao enum/listener (`AUTOMATION_RULE_EVENTS`), sem reprocessar evento originado por automação (`performed_by`) e ignorando activity/auto-reply no `message_created`; ao receber `conversation_created`, armar também regras **atrasadas** de `conversation_updated` (pino: `conversation_rules`).
- [ ] **06-3** Condições: as chaves permitidas já batem com `AutomationRule#conditions_attributes` (18) + custom attributes — falta validar **operador por atributo** conforme `lib/filters/filter_keys.yml` (ex.: `status` só `equal_to/not_equal_to`; `phone_number` aceita `starts_with`); aceitar/preservar `custom_attribute_type` (hoje o Zod descarta); aplicar a regra do `query_operator` (no máximo UMA condição sem operador — `query_operator_presence`); implementar o operador especial `attribute_changed` com `values: { from: [], to: [] }` (exige `changed_attributes` no evento).
- [ ] **06-4** Ações: `send_email_to_team`, `send_email_transcript` e `send_attachment` estão na lista permitida mas caem no `default` do `applyActionItems` (erro em runtime) — implementar (anexo via `active_storage_*`, e-mail enfileirado como no 14) ou rejeitar com 422 explícito; `send_webhook_event` deve emitir `automation_event.<event_name>` (hoje `automation_event` genérico) e `send_message`/`add_private_note` gravar `content_attributes.automation_rule_id` e sender nulo como o `ActionService`.
- [ ] **06-5** Delay: gate pela feature flag `delayed_automations` (`packages/core/src/lib/feature-flags.ts` bit já mapeado, hoje sempre ligado) e por `Account.feature_delayed_automations`; espelhar `AutomationRulePendingExecution.schedule` (episódio `status` para eventos de conversa, `message:<id>` para mensagem, `status_changed_at` como âncora, rearme) + sweep com `DUE_WINDOW` 3 dias, lock `processing`/`executing` e recheck de condições antes de executar; corrigir os **status** (pino: 0 `pending`, 1 `processing`, 2 `executed`, 3 `skipped`, 4 `executing`; hoje gravamos 3 = erro e 4 = skip e nunca marcamos `executing`).

Macros:

- [ ] **06-6** Ações: alinhar `MACRO_ACTION_NAMES` às 16 de `Macro::ACTIONS_ATTRS` (hoje 8 nomes, sendo `snooze` alias de `snooze_conversation`; faltam 9: `remove_assigned_agent`, `remove_assigned_team`, `mute_conversation`, `resolve_conversation`, `snooze_conversation`, `send_email_transcript`, `send_attachment`, `add_private_note`, `send_webhook_event`); `send_message`/`add_private_note` devem sair com o agente executor (`senderType/senderId`) e `send_webhook_event` com `event: "macro.executed"`.
- [ ] **06-7** `POST /api/v1/accounts/:account_id/macros/:macro_id/execute` — body `{ conversation_ids: [...] }` (hoje aceita `conversation_id`/query); Rails resolve por **`display_id`** (`MacrosExecutionJob`) e responde `head :ok` (200 vazio — hoje `{data:{queued}}`); executar conversa a conversa via job.
- [ ] **06-8** `GET /api/v1/accounts/:account_id/macros/:macro_id` (`#show`) — falta; resposta `{ payload: { id, name, visibility, created_by, updated_by, account_id, actions, files? } }`; `index` com `{payload}` e `order(:id)`; `create`/`update`/`show` também `{payload}` (200) e `destroy` `head :ok`; `set_visibility` força `personal` para agente (hoje 403 no update para `global`).

Respostas prontas:

- [ ] **06-9** Contrato canned (`CannedResponsesController`) — index **sem** `search` = relação completa (sem `limit`/ordem nossas), com `search` = `order_by_search` (prefixo de `short_code` 1, contém 0.5, conteúdo 0.2) e remoção de `\0`; resposta é o **registro cru** (`id, short_code, content, account_id, created_at, updated_at`), não `{data:{canned_responses}}`; `create`/`update` 200 com o mesmo registro; `destroy` `head :ok`. Permissão: o pino **não tem policy** (agente da conta pode CRUD); hoje exigimos admin.

Webhooks de saída:

- [ ] **06-10** Contrato (`WebhooksController`) — `index` = `{ payload: { webhooks: [...] } }`, `create`/`update` = `{ payload: { webhook: {...} } }` (200), `destroy` `head :ok`; campos `account_id`, `secret` (do `WebhookSecretable`) e `inbox: { id, name }`; recalcular `webhook_type` no update quando muda `inbox_id`; validação de subscriptions = `ALLOWED_WEBHOOK_EVENTS`.
- [ ] **06-11** Entrega: payload do evento = `webhook_data` da entidade + `event` + `changed_attributes` (não `{event,data,account_id,created_at}`); headers `X-Chatwoot-Delivery` (uuid), `X-Chatwoot-Timestamp` e `X-Chatwoot-Signature: sha256=<HMAC-SHA256(secret, "{ts}.{body}")>` (hoje manda o secret cru); timeout 5s (`WEBHOOK_TIMEOUT`) e retry do job `WebhookJob` (bull/backoff — conferir política do pino `(verificar)`).
- [ ] **06-12** Cobertura dos 12 eventos de `Webhook::ALLOWED_WEBHOOK_EVENTS` no listener (`conversation_status_changed`, `message_updated`, `contact_created/updated`, `inbox_created/updated`, `conversation_typing_on/off`, `webwidget_triggered`) e distinção `account_type` × `inbox_type` (webhook do `Channel::Api`, por inbox).
- [ ] **06-13** `POST /api/v1/accounts/:account_id/webhooks/:webhook_id/test` — **não existe no pino 4.17.1** (controller/rotas/UI); decidir `(verificar)`: remover para 1:1 ou registrar em `docs/specs/drift-permitido.md` como extra nosso.

Labels:

- [ ] **06-14** `GET /api/v1/accounts/:account_id/labels/:id` (`#show`) — falta; `index` = `{ payload: [{id,title,description,color,show_on_sidebar}] }`; `show`/`create`/`update` planos (200, hoje `{data:{label}}`/201); validar título como o Rails (`UNICODE_CHARACTER_NUMBER_HYPHEN_UNDERSCORE`, lowercase) e `show_on_sidebar` default; permissões: `index` agente/admin, `show/create/update/destroy` admin.
- [ ] **06-15** Uso em conversas/contatos: `GET /api/v1/accounts/:account_id/conversations/:id/labels` (ausente) = `{ payload: [titles] }`; `POST` idem, substituindo a lista (`update_labels`); `contacts/:id/labels` GET/POST com o mesmo `{payload}` (hoje `{data:{labels}}`); widget `create/destroy` (módulo 09).
- [ ] **06-16** Propagação de rename/delete de label (equivalente a `Labels::UpdateJob`/`RemoveAssociationsJob`): o rename já reflete via FK (`taggings.tag_id`), mas `conversations.cached_label_list` fica velho; no delete, remover `taggings` órfãos e atualizar o cache; refletir na sidebar.

**Permissões (pino × nosso) — comuns de divergir:**

| Área      | Rails (`*_policy.rb`)                                        | Nosso hoje            | Ação                                         |
| --------- | ------------------------------------------------------------ | --------------------- | -------------------------------------------- |
| Automação | admin em tudo                                                | index aberto a agente | fechar no 06-1 e esconder a página p/ agente |
| Macros    | index/create todos; global só admin; execute global ou autor | ok em geral           | `set_visibility` silencioso p/ agente (06-8) |
| Canned    | **sem policy** (agente CRUD)                                 | `requireAdmin`        | abrir no 06-9                                |
| Labels    | index agente/admin; CRUD admin                               | ok (falta `show`)     | manter no 06-14                              |
| Webhooks  | admin em tudo                                                | ok                    | manter no 06-10                              |

### 4.2 Front

- [ ] **06-17** `app/settings/automations` — builder 1:1 com `AutomationRuleForm.vue`: condições por evento com input correto (`search_select`, `multi_select`, `plain_text`, `multi_text`), operadores do evento (`operators.js`), **AutomationRunTypeSelector** (instantânea × com espera), **AutomationWaitCondition** (triggers `DELAYED_TRIGGERS`, `DEFAULT_DELAY_MINUTES` 240, faixa 10–43200), `AutomationInstantTrigger`, anexos e validação (`validateAutomation`); hoje `settings/automations.tsx` usa selects genéricos e delay em minutos cru (`components/settings/action-editor.tsx`).
- [ ] **06-18** `app/settings/macros` — editor de nós (`MacroNodes`/`MacroNode`/`MacroProperties`): inputs por ação (`search_select` agente/time, `multi_select` labels, textarea, url, attachment), cards de visibilidade global/pessoal, `readOnly` para macro global de outro autor e para agentes (global só admin), tabela Nome/Criado por/Atualizado por/Visibilidade + busca; hoje form inline + lista simples.
- [ ] **06-19** `app/settings/canned` e `app/settings/labels` — ajustar aos novos envelopes/campos e fechar paridade fina (tabela, confirmação de exclusão, busca com debounce já existente); usar `show_on_sidebar` para filtrar os atalhos de etiqueta na sidebar (`app-sidebar.tsx` hoje renderiza todas) e permitir aplicar labels em contato pelo painel.
- [ ] **06-20** `app/settings/webhooks` — exibir `secret` com revelar/copiar (`WebhookForm.vue`), subscription `inbox_updated` quando a config permitir, e consumir `{payload:{webhooks}}`; hoje `webhooks.tsx` não mostra secret.
- [ ] **06-21** Composer: gatilho `/` do pino no `ReplyBox.tsx` (sugestão, substituição do comando pelo conteúdo com variáveis resolvidas e strip de formatação por canal); validar o literal de aceite `//atalho` contra o comportamento do pino (`(verificar)`) e cobrir draft/reabertura. Macro em 1 clique na conversa (`ConversationHeader`/`DetailsPanel`) já existe — falta o modal de **custom attributes obrigatórios** antes de macro que resolve (`useMacroExecution.js`).

### 4.3 Dados, jobs e realtime

- [ ] **06-22** Realtime: publicar `message.updated` e `typing.on/off` de domínio (hoje `typing.*` só transita no `/cable`) e incluir `changed_attributes` no `conversation.updated` para alimentar `conversation_status_changed` e condições `attribute_changed`; listeners passam a disparar os 12 eventos de webhook.
- [ ] **06-23** Jobs: `macro.execute` e `webhook.deliver` já existem; adicionar jobs de label (rename/delete), recheck do pending execution e alinhamento de retry/backoff do `webhook.deliver`; `automation sweep` in-process + BullMQ.
- [ ] **06-24** Dados (sem DDL): usar `automation_rule_pending_executions` (já em uso nos itens 06-2/06-5), `taggings`/`conversations.cached_label_list` (labels) e `active_storage_attachments/blobs` (anexos de regra/macro) — nada de schema novo.

## 5. Tarefas (executáveis)

**Entrega A — Automação (06-1..06-5)**

| ID   | Tarefa                                                                                    | Arquivos-alvo                                                                         | Depende     |
| ---- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------- |
| 06-1 | `show` + envelopes/status/campos e gate admin                                             | `apps/server/src/routes/v1/automation.ts`, `packages/core/src/services/automation.ts` | —           |
| 06-2 | Eventos `opened/resolved` + arme delayed no `conversation_created`                        | `services/automation.ts`, `jobs/automation.ts`, `schemas/automation.ts`               | 02          |
| 06-3 | Condições/operadores do `filter_keys.yml` + `attribute_changed` + `custom_attribute_type` | `schemas/automation.ts`, `services/automation.ts`, `apps/web/src/lib/automation.ts`   | —           |
| 06-4 | Ações completas (anexo/e-mail/webhook por evento) + sender/content_attributes             | `services/conversation-actions.ts`, `schemas/automation.ts`                           | 14 (e-mail) |
| 06-5 | Gate `delayed_automations` + schedule/sweep fiéis ao pending execution                    | `services/automation.ts`, `lib/feature-flags.ts`, `jobs/automation.ts`                | —           |

**Entrega B — Macros (06-6..06-8)**

| ID   | Tarefa                                                             | Arquivos-alvo                                                                 | Depende |
| ---- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------- |
| 06-6 | 16 ações + `snooze_conversation` + `macro.executed` + sender       | `schemas/macros.ts`, `services/macros.ts`, `services/conversation-actions.ts` | —       |
| 06-7 | `execute` por `display_id`, body `conversation_ids` e `head :ok`   | `routes/v1/macros.ts`, `services/macros.ts`                                   | 02      |
| 06-8 | `show` + envelope `payload` + `created_by`/`updated_by` + order id | `routes/v1/macros.ts`, `services/macros.ts`                                   | —       |

**Entrega C — Canned e webhooks (06-9..06-13)**

| ID    | Tarefa                                                             | Arquivos-alvo                                                          | Depende |
| ----- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------- |
| 06-9  | Contrato canned (registro cru, `order_by_search`, `\0`, permissão) | `services/canned-responses.ts`, `routes/v1/canned-responses.ts`        | —       |
| 06-10 | Envelope `payload`, `secret`, `inbox`, `webhook_type`              | `routes/v1/webhooks.ts`, `services/webhooks.ts`, `schemas/webhooks.ts` | —       |
| 06-11 | Payload por evento + HMAC `Timestamp/Signature/Delivery` + timeout | `services/webhooks.ts`                                                 | 04      |
| 06-12 | 12 eventos + account/inbox type                                    | `jobs/automation.ts`, `services/webhooks.ts`, `realtime/index.ts`      | 02      |
| 06-13 | Reconciliar `/test` (não existe no pino)                           | `routes/v1/webhooks.ts`, `docs/specs/drift-permitido.md`               | —       |

**Entrega D — Labels (06-14..06-16)**

| ID    | Tarefa                                                               | Arquivos-alvo                                                                                        | Depende |
| ----- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------- |
| 06-14 | `show` + envelopes + validação unicode + permissões                  | `services/labels.ts` (novo, extraído de `contacts.ts`), `routes/v1/labels.ts`, `schemas/contacts.ts` | —       |
| 06-15 | `GET conversations/:id/labels` + envelopes de contacts/conversations | `routes/v1/conversations.ts`, `routes/v1/contacts.ts`, `services/labels.ts`                          | 02      |
| 06-16 | Propagação rename/delete (`cached_label_list`/taggings)              | `services/labels.ts`, `jobs/`                                                                        | —       |

**Entrega E — Front, realtime e aceite (06-17..06-24)**

| ID    | Tarefa                                                             | Arquivos-alvo                                                         | Depende          |
| ----- | ------------------------------------------------------------------ | --------------------------------------------------------------------- | ---------------- |
| 06-17 | Builder de automação (input por evento, run type, espera, anexo)   | `settings/automations.tsx`, `components/settings/*`                   | 06-2/06-3/06-5   |
| 06-18 | Editor de macros (nós, inputs por ação, readOnly, tabela)          | `settings/macros.tsx`, `components/settings/*`                        | 06-6/06-8        |
| 06-19 | Canned/labels fiéis + `show_on_sidebar` na sidebar                 | `settings/{canned,labels}.tsx`, `app-sidebar.tsx`, `DetailsPanel.tsx` | 06-9/06-14/06-15 |
| 06-20 | Webhooks com secret revelar/copiar + envelope                      | `settings/webhooks.tsx`, `lib/automation.ts`                          | 06-10            |
| 06-21 | Composer `/` (variáveis/draft) + modal de custom attrs da macro    | `components/conversations/ReplyBox.tsx`, `ConversationHeader.tsx`     | 02               |
| 06-22 | Eventos realtime (`message.updated`, typing, `changed_attributes`) | `realtime/index.ts`, `services/messages.ts`, `jobs/automation.ts`     | 02               |
| 06-23 | Jobs de label + recheck/retry de jobs                              | `services/labels.ts`, `jobs/`, `services/webhooks.ts`                 | 06-16            |
| 06-24 | E2E dos 3 fluxos + parity-report/shots                             | `scripts/e2e.mjs`, `docs/specs/paridade-mapa.md`                      | 06-1..06-23      |

## 6. Aceite

```bash
bun run check-types && bun run check
bun scripts/parity-report.mjs            # módulo 06 sem lacunas de área
bun scripts/e2e.mjs                      # fluxos novos verdes e idempotentes
bun scripts/schema-diff.mjs && bun scripts/db-roundtrip-check.mjs
bun scripts/shot.mjs                     # settings/{automations,macros,canned,labels,webhooks}

# contratos (exemplos; repetir por endpoint da §4.1)
curl -s -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/accounts/$ACC/automation_rules/1"     # {payload:{...}}
curl -s -X POST -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/accounts/$ACC/automation_rules/1/clone"
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"conversation_ids":[1]}' "$SERVER/api/v1/accounts/$ACC/macros/1/execute"                   # 200, corpo vazio
curl -s -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/accounts/$ACC/conversations/1/labels"   # {payload:["..."]}
curl -s -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/accounts/$ACC/canned_responses"         # [{id,short_code,content,account_id,created_at,updated_at}]
curl -s -H "Authorization: Bearer $TOKEN" "$SERVER/api/v1/accounts/$ACC/webhooks"                 # {payload:{webhooks:[...secret...]}}
```

- [ ] 100% dos endpoints da §4.1 com mesmo path/status/envelope do pino, provado pelos curls acima e `parity-report` sem pendência nas 5 áreas.
- [ ] E2E **regra urgente**: receiver local (`Bun.serve` efêmero no e2e) recebe o POST, valida `X-Chatwoot-Signature` e o payload do evento; conversa com mensagem "urgente" ganha label `urgente` + prioridade `urgent` + webhook.
- [ ] E2E **macro em 1 clique**: macro (label + prioridade) criada via API, executada pelo menu do `ConversationHeader`, aplicada na conversa (polling).
- [ ] E2E **`//atalho`**: canned `saudacao` criada via API, digitada no composer (`/` + short code; conferir literal `//` do aceite `(verificar)`) e enviada; mensagem presente no `GET messages`.
- [ ] `bun scripts/shot.mjs` com as 5 páginas lado a lado contra os screenshots do pino.
- [ ] `schema-diff`/roundtrip seguem verdes (nenhuma mudança de DDL).

## 7. Fora de escopo

- **Enterprise:** SLA/`add_sla`, custom roles, conversation workflow, capacity e relatórios drilldown (o enum `AUTOMATION_ACTION_TYPES` do Vue tem `add_sla`; não implementar).
- **Outros módulos:** labels do widget (09), relatórios por label (07), webhooks inbound de canais e OAuth (04/07), integrações/Dashboard Apps/Slack/etc. (10), envio real de e-mail de transcript/team (14 — aqui só enfileirar), superadmin.
- **Decisões globais:** i18n e pipeline/CI; DDL da trilha D (nenhuma tabela/coluna nova). O endpoint `/webhooks/:id/test` só entra se a decisão do 06-13 for mantê-lo como extra documentado.

## 8. Definição de done

- [ ] Tarefas 06-1..06-24 commitadas e `(verificar)` decididos com registro no doc: literal do gatilho canned, retry/timeout do webhook e o destino do `/test`.
- [ ] `bun run check && bun run check-types` verdes; `scripts/e2e.mjs` idempotente 2× seguidas com os 3 fluxos novos.
- [ ] `bun scripts/parity-report.mjs --write-doc` regenerado com o módulo 06 em 100% e `docs/specs/paridade-mapa.md` atualizado.
- [ ] Evidências no commit: saídas dos curls (envelopes conferidos contra os `.jbuilder`), logs do receiver HMAC e prints de `shots/` (não commitados por design).
- [ ] `roadmap.md` marca **06 — Automação, Macros, Canned & Webhooks** como 100%.
