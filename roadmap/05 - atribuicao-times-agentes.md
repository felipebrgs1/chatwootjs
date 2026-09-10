# 05 — Atribuição, times e agentes

> **Estágio:** 05/15 · **Status:** 🟡 63% (API ponderado) — 0 ✅ · 6 🟡 · 3 ❌ (times/agentes básicos de pé; policies e executor 1:1 ausentes) · **Depende de:** 02, 04
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`): API `agents` ✅ (6/6 ações), `teams` ✅ (9/9), `assignment` ❌ (0/9); front `agents`/`teams` ✅ de fachada e `assignment-policy` ❌.
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

Entrega a **atribuição de conversas** do Chatwoot OSS: CRUD de times e membros,
CRUD de agentes (+ convite em lote), assignable agents, CRUD de assignment
policies e vínculo com inboxes, o **executor de auto-atribuição V2
(`round_robin`)** e a presença/disponibilidade dos agentes — com as telas de
settings (agentes, times, assignment policy) e o dropdown de assignee.

**100% quando (objetivo e testável):**

1. **API 1:1** — todas as actions OSS de `agents_controller` (6),
   `assignable_agents_controller` (1), `assignment_policies_controller` (5),
   `assignment_policies/inboxes_controller` (1),
   `inboxes/assignment_policies_controller` (3), `teams_controller` (5) e
   `team_members_controller` (4) respondem no mesmo path/método/status/envelope
   do Rails; áreas `agents`, `teams` e `assignment` do `parity-report` ✅.
2. **Executor 1:1** — conversa nova sem assignee em inbox com
   `enable_auto_assignment` + policy habilitada recebe agente por **round-robin**
   entre membros **online** da inbox (∩ time quando a conversa tem time e
   `allow_auto_assign`), respeitando `fair_distribution_limit/window`,
   `exclude_older_than_hours` e `conversation_priority`; resolve/snooze
   redistribuem; agente sem vínculo nunca é escolhido; sem online → fica sem
   assignee.
3. **Presença** — `account_users.availability`/`auto_offline` são a fonte
   (fallback em `users.availability`), com `POST /profile/availability`,
   `POST /profile/auto_offline` e `POST /accounts/:id/update_active_at`; o
   heartbeat alimenta o executor e o evento `presence.update`.
4. **Front 1:1** — páginas `settings/agents`, `settings/teams` e
   `settings/assignment-policy`, card/toggle de auto-assign no inbox settings e
   dropdown de assignee com assignable agents + presença + auto-atribuição.
5. **Aceite local verde** — comandos da §6, com o bloco determinístico de rodízio
   (3 agentes / 2 inboxes) no `bun scripts/e2e.mjs`.

**NÃO conta como 100%:** "least-busy" improvisado sem fila (o OSS só tem
`round_robin`; `balanced` é enterprise), auto-assign escolhendo agente sem
vínculo/offline, front sem os status/envelopes do Rails, e-mail/capacity ou DDL novo.

## 2. Estado atual (medido)

| Subárea                                | Status | Evidência no nosso repo                                                                                                              | Lacuna principal                                                                                                                                                                                                            |
| -------------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Times e membros (API)                  |   🟡   | `apps/server/src/routes/v1/teams.ts`; `packages/core/src/services/teams.ts`                                                          | `GET/PATCH/DELETE /teams/:team_id/team_members` (collection, `user_ids[]`) ausente/divergente; POST devolve todos (Rails devolve só os adicionados); erro 422 vs 401 `Invalid User IDs`; faltam `icon/icon_color/is_member` |
| Agentes (API)                          |   🟡   | `apps/server/src/routes/v1/accounts.ts:38-75`; `packages/core/src/services/auth.ts:266-419`                                          | sem `bulk_create`; create/update sem `availability/auto_offline/name`; `_agent` sem `availability_status/auto_offline/thumbnail/provider/available_name`; destroy não apaga `user` órfão                                    |
| Assignable agents (API)                |   ❌   | `apps/server/src/routes/v1/inboxes.ts:138`; `packages/core/src/services/inboxes.ts:799-805`                                          | só inbox-level e com `{ assignable_agents }`; falta o account-level `?inbox_ids[]` (interseção das inboxes + administradores) e o envelope `{ payload }` (+ `include_agent_bots`)                                           |
| Assignment policies (API)              |   ❌   | DDL pronto em `packages/db/src/schema/inbox-members.ts:19-84`                                                                        | CRUD, validações Rails, vínculo singleton inbox↔policy e `assigned_inbox_count` ausentes                                                                                                                                    |
| Executor de auto-atribuição            |   🟡   | `packages/core/src/jobs/automation.ts:22-57`; `packages/core/src/services/teams.ts:217-245`                                          | least-busy sobre `users.availability`, só no `conversation.created`; sem policy/round-robin/fila, time, rate limit, resolve/snooze e varredura periódica                                                                    |
| Presença / availability / auto_offline |   🟡   | `packages/core/src/services/auth.ts:435-452`; `apps/server/src/routes/v1/profile.ts:32-38`; `packages/core/src/realtime/presence.ts` | Rails é account_user-scoped; faltam `auto_offline`, `update_active_at` e heartbeat no executor; método `PUT` vs `POST`                                                                                                      |
| Front settings agentes/times           |   🟡   | `apps/web/src/routes/_auth/app/settings/agents.tsx`; `settings/teams.tsx`; `settings/teams/new.tsx`                                  | agentes sem availability/auto_offline/bulk; times sem `GET team_members`, sync N+1 e sem `FinishSetup`/`AgentSelector`/icon                                                                                                 |
| Front `settings/assignment-policy`     |   ❌   | `apps/web/src/components/app-sidebar.tsx:266-267` (só Agentes/Times)                                                                 | rota, menu, lista, form e vínculo de inbox ausentes                                                                                                                                                                         |
| Front dropdown de assignee             |   🟡   | `apps/web/src/components/conversations/DetailsPanel.tsx:302-316`                                                                     | lista todos os agentes (não os assignable da inbox); sem presença/ordenação e sem indicador de auto-atribuição                                                                                                              |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                                                     | O que dita para nós                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `app/controllers/api/v1/accounts/{agents,assignable_agents,teams,team_members}_controller.rb`                                                                   | contrato dos CRUDs de agentes/times                                                                         |
| `app/controllers/api/v1/accounts/assignment_policies_controller.rb` + `assignment_policies/inboxes_controller.rb` + `inboxes/assignment_policies_controller.rb` | CRUD de policies e vínculo com inbox                                                                        |
| `app/models/assignment_policy.rb` + `app/policies/{assignment_policy,user,team,team_member}_policy.rb`                                                          | validações/enums (`round_robin` no OSS) e permissões (admin)                                                |
| `app/services/auto_assignment/{assignment_service,round_robin_selector,inbox_round_robin_service,rate_limiter,agent_assignment_service}.rb`                     | executor V2 (fila round-robin, prioridade, rate limit) e V1 legado                                          |
| `app/jobs/auto_assignment/{assignment_job,periodic_assignment_job}.rb` + `config/schedule.yml:58-61` + `config/features.yml:199,247`                            | job coalescido por inbox, varredura a cada 30 min; `assignment_v2` on (OSS) e `advanced_assignment` premium |
| `app/models/concerns/{auto_assignment_handler,inbox_agent_availability,availability_statusable}.rb`                                                             | gatilhos (status open/resolved/snoozed), membros online e availability com `auto_offline`                   |
| `app/views/api/v1/models/_{agent,team}.json.jbuilder` + `assignment_policies/_assignment_policy.json.jbuilder`                                                  | payloads exatos (campos e envelopes `{ payload }`)                                                          |
| `app/javascript/dashboard/routes/dashboard/settings/{agents,teams,assignmentPolicy}/` + `api/{agents,teams,assignableAgents,assignmentPolicies}.js`             | telas, chamadas e store do front                                                                            |
| `app/javascript/dashboard/composables/useAgentsList.js` + `routes/dashboard/conversation/ConversationAction.vue`                                                | dropdown de assignee (assignable agents, presença, "Ninguém")                                               |
| `db/schema.rb` → `assignment_policies`, `inbox_assignment_policies`, `account_users.availability/auto_offline`                                                  | dados (DDL já fechado na trilha D — não alterar)                                                            |

## 4. Lacunas detalhadas

### 4.1 API

- [ ] **05-1** `GET /api/v1/accounts/:account_id/teams/:team_id/team_members` — Rails
      `TeamMembersController#index` — array de `_agent` (qualquer agente); nosso
      `GET /teams/:team_id` já embute `members`, mas a rota não existe.
- [ ] **05-1** `PATCH /api/v1/accounts/:account_id/teams/:team_id/team_members` — Rails
      `#update` — body `{ user_ids: [] }`, adiciona/remove na mesma transação e
      devolve a lista completa; 401 `{ error: 'Invalid User IDs' }` se algum id
      não for da conta. Hoje ausente.
- [ ] **05-1** `DELETE /api/v1/accounts/:account_id/teams/:team_id/team_members` — Rails
      `#destroy` — body `{ user_ids: [] }`, 200 vazio; hoje nossa rota é
      `DELETE .../team_members/:user_id` (path/body divergentes).
- [ ] **05-1** `POST .../team_members` — alinhar o retorno: Rails devolve **só os
      recém-adicionados** (`Team#add_members`) e 401 para id inválido; o nosso
      devolve todos (`addTeamMembers`) e 422 (`assertAgentsInAccount`).
- [ ] **05-1** `GET /teams` / `GET /teams/:id` — expor `icon`, `icon_color`, `account_id` e
      `is_member` do `_team.json.jbuilder` (hoje sem esses campos).
- [ ] **05-3** `GET /api/v1/accounts/:account_id/assignable_agents?inbox_ids[]=...` —
      Rails `AssignableAgentsController#index` — **interseção** dos membros das
      inboxes + administradores da conta; `include_agent_bots=1` anexa bots
      (`assignee_type: 'AgentBot'`); envelope `{ payload: [...] }`; 403/404 para
      inbox fora da conta. Hoje só existe a rota inbox-level.
- [ ] **05-3** `GET /api/v1/accounts/:account_id/inboxes/:inbox_id/assignable_agents` —
      alinhar envelope Rails `{ payload: [...] }` (hoje `{ assignable_agents }`)
      e conteúdo (`Inbox#assignable_agents`).
- [ ] **05-2** `POST /api/v1/accounts/:account_id/agents/bulk_create` — Rails
      `AgentsController#bulk_create` — body `{ emails: [] }`, admin; 200 vazio
      (`head :ok`); ignora e-mail inválido/já membro (log) e limpa
      `account.custom_attributes['onboarding_step']`. Ausente.
- [ ] **05-2** `POST /agents` — completar params Rails `name, email, role, availability,
  auto_offline` (hoje só `email/name/role`) e resposta `_agent` com
      `availability_status`, `auto_offline`, `confirmed`, `provider`,
      `available_name`, `thumbnail`.
- [ ] **05-2** `PATCH /agents/:id` — Rails atualiza `name` (User) e
      `role/availability/auto_offline` (AccountUser); o nosso só troca `role`
      (`UpdateAgentSchema`).
- [ ] **05-2** `DELETE /agents/:id` — Rails destrói o `account_user` e agenda a deleção do
      `user` se ficar órfão (`DeleteObjectJob`); o nosso só remove o vínculo
      (users órfãos acumulam). Decidir e registrar. (verificar)
- [ ] **05-4** `GET/POST/PATCH/DELETE /api/v1/accounts/:account_id/assignment_policies(/:id)`
      — CRUD Rails (body wrapper `assignment_policy`); validações: `name`
      presente/único por conta, `fair_distribution_limit/window > 0`,
      `exclude_older_than_hours` inteiro > 0 ou nil; 422/404/401 e resposta com
      `assigned_inbox_count` + timestamps epoch.
- [ ] **05-5** `GET /assignment_policies/:assignment_policy_id/inboxes` —
      `AssignmentPolicies::InboxesController#index` — `{ inboxes: [...] }`;
      no OSS o controller só tem `index` (as rotas `create/destroy` do resource
      caem em action inexistente — a escrita é pela rota singleton abaixo).
      (verificar)
- [ ] **05-5** `GET/POST/DELETE /accounts/:account_id/inboxes/:inbox_id/assignment_policy`
      — singleton: GET 404 se não houver; POST `{ assignment_policy_id }`
      substitui o vínculo (remove o antigo) e retorna a policy; DELETE remove e
      retorna 200; 404 inbox/policy; 401 agente.
- [ ] **05-2** `GET /accounts/:account_id/agents` — alinhar `_agent.json.jbuilder` e a
      ordenação `order_by_full_name` (hoje em ordem de `account_users`).
- [ ] **05-6** `POST /api/v1/profile/availability` + `POST /profile/auto_offline` — Rails
      com `{ profile: { account_id, ... } }`; nosso `PUT /profile/availability`
      não aceita `account_id` e grava em `users.availability` (global) — mover
      para `account_users` (dívida compartilhada com 01/12).
- [ ] **05-6** `POST /api/v1/accounts/:account_id/update_active_at` —
      `AccountsController#update_active_at` — grava `account_users.active_at`
      do vínculo logado, 200 vazio (usado pelo heartbeat). Ausente.

### 4.2 Front

**Settings · Agentes**

- [ ] **05-10** `settings/agents` — refs `agents/Index.vue`, `AddAgent.vue`,
      `EditAgent.vue` — completar `availability`/`auto_offline`, e-mail só no
      create, link de convite, "reenviar convite" (módulo 12) e sort por nome.
- [ ] **05-10** `settings/agents` — "adicionar vários" via `bulk_create` (onboarding),
      com defaults do `AgentBuilder` (`availability: offline`,
      `auto_offline: false`). (verificar onde o Vue expõe hoje)

**Settings · Times**

- [ ] **05-11** `settings/teams` — refs `teams/Index.vue`, `Create/Index.vue`,
      `Edit/Index.vue`, `FinishSetup.vue`, `AgentSelector.vue`,
      `helpers/validations.js` — fluxo em etapas (criar time → escolher agentes →
      concluir), busca/seleção com disponibilidade, "você é membro",
      `allow_auto_assign` e validações.
- [ ] **05-11** `TeamForm` — trocar o sync N+1 (POST/DELETE por membro) por
      `GET/POST/PATCH /team_members` com `user_ids` em lote; exibir
      `icon`/`icon_color` quando houver.

**Settings · Assignment policy**

- [ ] **05-12** Nova rota `settings/assignment-policy` — refs `assignmentPolicy/Index.vue`,
      `AgentAssignmentIndexPage/Create/Edit` + `AgentAssignmentPolicyForm.vue` +
      dialogs — lista (nome/status/inboxes), form com `assignment_order`
      (`round_robin`; `balanced` premium bloqueado), `conversation_priority`
      (`earliest_created`/`longest_waiting`), fair distribution,
      `exclude_older_than_hours` (DurationInput) e vínculo de inboxes
      (add/remove/navegar); gating `assignment_v2` + admin. Capacity
      (`AgentCapacity*`) é premium: não portar.

**Inbox settings + dropdown**

- [ ] **05-13** `settings/inboxes/:inbox_id` (aba Agentes) — ref
      `inbox/settingsPage/CollaboratorsPage.vue` — toggle
      `enable_auto_assignment`, card "Default policy/Policy ligada" com atalho
      para editar e remover; esconder capacity (premium).
- [ ] **05-14** Dropdown de assignee (`DetailsPanel`/header) — refs `ConversationAction.vue` +
      `useAgentsList.js` + `api/assignableAgents.js` — usar os assignable agents
      da(s) inbox(es) (account-level com `inbox_ids`), ordenar por presença,
      "Ninguém" só com assignee e indicar auto-atribuição quando a inbox tem
      `enable_auto_assignment` + policy (no pino 4.17.1 o rótulo "Auto assign"
      aparece no picker de menções/time — confirmar a superfície). (verificar)

### 4.3 Dados, jobs e realtime (quando aplicável)

- [ ] **05-4/05-7** `assignment_policies` + `inbox_assignment_policies` (DDL pronto,
      `packages/db/src/schema/inbox-members.ts:19-84`) — passar a usar; unique
      `(account_id, name)` e unique `(inbox_id)` já garantem as regras do Rails.
- [ ] **05-6** `account_users.availability` + `auto_offline` (DDL pronto,
      `packages/db/src/schema/auth.ts:76-77`) — passar a ser a fonte da verdade;
      `users.availability` vira fallback (`AvailabilityStatusable`).
- [ ] **05-7** `inbox_members` + `teams`/`team_members` — filtro do executor: online ∩
      membros da inbox, e ∩ membros do time quando a conversa tem time e
      `allow_auto_assign`.
- [ ] **05-7** Fila round-robin e rate limit: Rails usa lista Redis por inbox
      (`ROUND_ROBIN_AGENTS`, resetada a cada mudança de membresia) e chaves por
      (inbox, agente) para `fair_distribution_limit/window`; nossa presença é um
      `Map` em memória (`realtime/presence.ts`) — decidir Redis vs estado do
      server (sem DDL) e, sem Redis, ter equivalente determinístico no teste.
      (verificar)
- [ ] **05-8** Jobs: `AssignmentJob` coalescido por inbox (in-flight 5 min) +
      `PeriodicAssignmentJob` a cada 30 min (`config/schedule.yml:58-61`); nosso
      runner (`jobs/index.ts`, in-process/BullMQ) ainda não tem agendador.
- [ ] **05-9** Realtime/atividade: auto-assign publica `conversation.updated`, cria a
      activity "(auto-assignment)" e notifica o agente (`assigned_conversation`);
      o Rails roda em `after_save` quando o status muda (open/resolved/snoozed),
      gated por `inbox.enable_auto_assignment?` + `assignment_v2` — hoje só
      tratamos `conversation.created` (`jobs/automation.ts:54`).

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                                                                    | Arquivos-alvo                                                                                                                                                                                          | Depende     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| 05-1  | Team members em lote: `GET/PATCH/DELETE /team_members` (collection, `user_ids`), POST só adicionados, 401 `Invalid User IDs`, `icon/icon_color/is_member` | `apps/server/src/routes/v1/teams.ts`, `packages/core/src/services/teams.ts`, `packages/core/src/schemas/teams.ts`                                                                                      | —           |
| 05-2  | Agentes: `bulk_create`, create/update com `availability/auto_offline/name`, payload `_agent` completo e ordenação                                         | `apps/server/src/routes/v1/accounts.ts`, `packages/core/src/services/auth.ts`, `packages/core/src/schemas/auth.ts`                                                                                     | —           |
| 05-3  | Assignable agents account-level (`?inbox_ids[]`, interseção + admins, `include_agent_bots`) e envelope `payload` no inbox-level                           | `apps/server/src/routes/v1/accounts.ts`, `packages/core/src/services/inboxes.ts`                                                                                                                       | —           |
| 05-4  | Assignment policies: CRUD + validações + payload jbuilder                                                                                                 | `apps/server/src/routes/v1/assignment-policies.ts` (novo), `packages/core/src/services/assignment-policies.ts` (novo), `packages/core/src/schemas/assignment-policies.ts` (novo), `routes/v1/index.ts` | —           |
| 05-5  | Vínculo inbox↔policy: `GET /assignment_policies/:id/inboxes` + `GET/POST/DELETE /inboxes/:inbox_id/assignment_policy` (singleton, substitui)              | `routes/v1/assignment-policies.ts`, `routes/v1/inboxes.ts`, `services/assignment-policies.ts`                                                                                                          | 05-4        |
| 05-6  | Presença account-scoped: gravar em `account_users`, `POST /profile/auto_offline`, métodos POST, `update_active_at` e presença no executor                 | `routes/v1/profile.ts`, `routes/v1/accounts.ts`, `services/auth.ts`, `realtime/presence.ts`                                                                                                            | 05-2        |
| 05-7  | Executor V2 `round_robin`: fila por inbox, policy, prioridade/idade, time, rate limit e claim atômico                                                     | `packages/core/src/services/auto-assignment.ts` (novo), `services/teams.ts`, `packages/core/src/jobs/automation.ts`                                                                                    | 05-4/05-5   |
| 05-8  | Jobs: `AssignmentJob` coalescido por inbox + `PeriodicAssignmentJob` (30 min) no runner                                                                   | `packages/core/src/jobs/auto-assignment.ts` (novo), `packages/core/src/jobs/index.ts`, `jobs/automation.ts`                                                                                            | 05-7        |
| 05-9  | Atividade/notificação do auto-assign (`conversation.updated`, `assigned_conversation`) e redistribuição em resolve/snooze                                 | `services/conversations.ts`, `jobs/automation.ts`, `services/notifications.ts`                                                                                                                         | 05-7        |
| 05-10 | Front agentes: availability/auto_offline + bulk invite + campos do `_agent`                                                                               | `apps/web/src/routes/_auth/app/settings/agents.tsx`                                                                                                                                                    | 05-2        |
| 05-11 | Front times 1:1 (etapas, AgentSelector, sync em lote, icon)                                                                                               | `apps/web/src/routes/_auth/app/settings/teams.tsx`, `settings/teams/new.tsx`, `settings/teams/$teamId.tsx`, `apps/web/src/lib/automation.ts`                                                           | 05-1        |
| 05-12 | Front assignment-policy: rota + menu + lista + form + vínculo de inbox (gating `assignment_v2`)                                                           | `apps/web/src/routes/_auth/app/settings/assignment-policy*.tsx` (novos), `apps/web/src/lib/assignment-policies.ts` (novo), `apps/web/src/components/app-sidebar.tsx`                                   | 05-4/05-5   |
| 05-13 | Inbox settings: toggle auto assignment + card da policy                                                                                                   | `apps/web/src/routes/_auth/app/settings/inboxes/$inboxId.tsx`                                                                                                                                          | 05-5/05-12  |
| 05-14 | Dropdown de assignee: assignable agents + presença + indicador de auto-atribuição                                                                         | `apps/web/src/components/conversations/DetailsPanel.tsx`, `apps/web/src/lib/conversations.ts`, `apps/web/src/lib/agents.ts` (novo)                                                                     | 05-3/05-6   |
| 05-15 | Aceite: bloco determinístico de rodízio no e2e (3 agentes/2 inboxes) + métrica + shots                                                                    | `scripts/e2e.mjs`, `scripts/parity-report.mjs`, `scripts/shot.mjs`                                                                                                                                     | 05-1..05-14 |

## 6. Aceite

```bash
# qualidade
bun run check-types && bunx oxlint
bun run check

# métrica (assignment 0→✅; front assignment-policy ✅; agents/teams mantêm ✅)
bun scripts/parity-report.mjs
bun scripts/parity-report.mjs --write-doc

# funcional + visual (API :3000 e web :3001 no ar)
bun scripts/e2e.mjs
bun scripts/shot.mjs

# guarda de DDL (nenhuma migration neste módulo)
bun scripts/db-roundtrip-check.mjs
```

- [ ] Contratos: smoke/curl de todos os endpoints §4.1 com os status/envelopes do
      Rails (401/403/404/422), incluindo `bulk_create` (200 vazio) e o singleton
      da inbox (404 sem policy).
- [ ] **Rodízio determinístico** no `bun scripts/e2e.mjs`: setup limpa fila +
      policies, garante **3 agentes** (A, B, C) na **inbox 1** e **2** (B, C) na
      **inbox 2**, os 3 online (heartbeat WS `{action:'presence'}`), policy
      `round_robin` + `enable_auto_assignment` nas duas inboxes; cria 3 conversas
      sem assignee em cada inbox via canal API; asserção: inbox 1 = **A→B→C** e
      inbox 2 = **B→C→B** (fila própria por inbox, resetada no setup); o agente
      sem vínculo (A na inbox 2) nunca é escolhido; roda 2× com o mesmo resultado.
- [ ] `least_busy`/`balanced` fora do OSS: policy com `balanced` → 422 (enum não
      existe no OSS) e nenhuma seleção por balanced sem `advanced_assignment`.
- [ ] `longest_waiting` atribui primeiro a conversa com `last_activity_at` mais
      antigo; `exclude_older_than_hours` exclui backlog velho; com
      `fair_distribution_limit=1` o rodízio alterna agentes em vez de concentrar.
- [ ] Inbox com `enable_auto_assignment=false` ou sem agente online mantém a
      conversa sem assignee (executor não escolhe offline).
- [ ] Front: settings/agentes (availability/auto_offline/bulk), settings/times
      (etapas + PATCH em lote), settings/assignment-policy (CRUD + vínculo) e
      card/toggle no inbox settings — screenshots lado a lado em `shots/`.
- [ ] Dropdown de assignee mostra só assignable agents da inbox + presença e
      reflete o estado de auto-atribuição quando configurado. (verificar)
- [ ] `bun scripts/e2e.mjs` verde 2× seguidas e `parity-report` sem ❌ nas áreas
      `agents`/`teams`/`assignment` e front `assignment-policy`.

## 7. Fora de escopo

- **Enterprise:** `balanced`/least-busy (`advanced_assignment` premium), capacity
  e leaves (`agent_capacity_policies` etc.), `enterprise/api/v1/accounts/agents_controller`
  (create/update enterprise), custom roles, SLA, copilot.
- E-mail transacional do convite (módulo 14) — aqui só token/link de convite.
- `bulk_actions`/atribuição em lote de conversas (módulo 02), relatórios de
  agentes/times (07), notificações completas (11).
- i18n (`pt-BR`/`en`) e pipeline/CI (decisão do R0).
- DDL/schema: qualquer mudança exige trilha D5; usar apenas as tabelas existentes.

## 8. Definição de done

1. Tarefas `05-1..05-15` marcadas `[x]` e arquivos commitados (`check-types` e
   `oxlint` verdes; `bun run check` aplicado).
2. `bun scripts/e2e.mjs` verde 2× com o bloco determinístico de rodízio; nenhuma
   regressão nos checks atuais; `db-roundtrip-check` intacto.
3. `bun scripts/parity-report.mjs --write-doc` regenerado: API `assignment` ✅
   (e `agents`/`teams` sem regressão), front `assignment-policy` ✅.
4. Este doc com o aceite marcado e o status do módulo 05 atualizado em
   `roadmap.md` e `docs/specs/paridade-mapa.md`.
5. Nenhuma divergência escondida: o que não der paridade (ex.: fila round-robin
   sem Redis, user órfão, superfície "Auto" do dropdown) fica escrito no §4 com
   `(verificar)` resolvido e justificado.
