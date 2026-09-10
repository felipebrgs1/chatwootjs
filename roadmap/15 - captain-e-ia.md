# 15 — Captain & IA

> **Estágio:** 15/15 · **Status:** 0 de 9 subáreas ✅; 5 🟡 (stubs parciais) e 4 ❌ (ausentes) · **Depende de:** 02, 14
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`)
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

Entregar o **Captain OSS**: as 7 actions públicas dos 2 controllers OSS
(`captain/preferences` e `captain/tasks`) com IA plugável e mockável, mais a UI
que o Rails OSS mostra no dashboard — menu de IA no composer, sugestão de
labels no thread, refinamento por follow-up e a página de preferências
(modelos/features) para administradores.

Critério objetivo de 100%:

1. **API 1:1:** as 7 actions respondem no **mesmo path/método** do Rails
   (`/api/v1/accounts/:account_id/captain/...`), com status e envelope do pino
   (`{ providers, models, features }` e `{ message, follow_up_context? }` sem
   wrapper `data`; erros `{ error }` / 422 de validação).
2. **Flags/limites:** tasks respeitam `feature_flags.captain_tasks` (bit 61) e
   preferências/UI respeitam o master `captain_enabled` (alias local de
   `captain_integration`/`captain_integration_v2`, `packages/core/src/lib/feature-flags.ts`);
   sem flag ou sem chave de provider → **501** `{ error }` (convenção do repo).
3. **Provider real e testável:** OpenAI-compatível com resolução por
   `integrations_hooks` (app `openai`) → `installation_configs`
   (`CAPTAIN_OPEN_AI_*`) → env (`CAPTAIN_API_KEY`/`OPENAI_API_KEY`,
   `CAPTAIN_BASE_URL`, `CAPTAIN_MODEL`). Testes nunca chamam a internet: fetch
   mockado (unit) ou mock HTTP local (e2e).
4. **Front 1:1:** menu ✨ do composer com `improve`, 5 tons,
   `fix_spelling_grammar`, `reply_suggestion` e `summarize` gated por
   `captain_tasks`; card de labels aplicável/dispensável; caixa de follow-up do
   resultado; página `settings/captain` (admin) com modelo por feature e
   toggles OSS.
5. **Aceite local:** `check-types`, `oxlint`, testes de mock, `e2e.mjs` verde 2×
   e `parity-report` com as 7 actions cobertas; **nenhuma mudança de DDL**.

**Não conta como 100%:** só o `/captain/assist` atual (3 intents, envelope
`{ data: { result } }`, fora do contrato Rails); habilitar a flag sem portar os
endpoints; depender de chamada real à OpenAI no aceite; “parecido” sem os
envelopes/paths do pino; qualquer coisa de assistants/copilot (Enterprise).

## 2. Estado atual (medido)

| Subárea                            | Status | Evidência no nosso repo                                                                                                                                       | Lacuna principal                                                                                               |
| ---------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `preferences#show/update`          |   ❌   | sem rota `captain/preferences`; `apps/server/src/routes/v1/ops.ts` só tem `/assist`; `updateAccount` ignora `settings` (`packages/core/src/services/auth.ts`) | action, envelope `{providers, models, features}` e merge em `accounts.settings`                                |
| `tasks#rewrite`                    |   🟡   | `captainAssist` só tem `rewrite` simples (`packages/core/src/services/captain.ts`)                                                                            | 7 operações do Rails (5 tons + `fix_spelling_grammar` + `improve`), prompt/arquivo e `conversation_display_id` |
| `tasks#summarize/reply_suggestion` |   🟡   | `type: "summarize" \| "reply_suggest"` no stub, path errado (`/assist`) e resposta `{ data: { result } }`                                                     | path `.../tasks/*`, envelope `{ message, follow_up_context }`, contexto formatado como o Rails                 |
| `tasks#label_suggestion/follow_up` |   ❌   | nenhuma menção no core/server/web                                                                                                                             | endpoints, cache por conversa e `follow_up_context`                                                            |
| Flags/provider                     |   🟡   | `captainEnabledFor` lê alias `captain_enabled`; chave só por env (`CAPTAIN_API_KEY`/`OPENAI_API_KEY`); sem catálogo de modelos                                | `captain_tasks` (bit 61), `installation_configs`, hook `openai`, catálogo providers/models/features            |
| Composer (menu IA)                 |   🟡   | `ReplyBox.tsx` tem ✨ com 3 itens fixos (sem tons/fix/improve)                                                                                                | menu Rails (`CopilotMenuBar.vue`), operações e gate `captain_tasks`                                            |
| Thread (labels + follow-up)        |   ❌   | `DetailsPanel.tsx` tem aba Copilot stub (“chega no M12”)                                                                                                      | card de labels no thread, follow-up do resultado; Copilot real é Enterprise                                    |
| Preferências (UI)                  |   ❌   | nenhuma rota `settings/captain` no web; nenhum item em `app-sidebar.tsx`                                                                                      | página admin com `ModelSelector`/`FeatureToggle`                                                               |
| Testes/aceite                      |   🟡   | `scripts/e2e.mjs:190` valida 501 sem flag; `parity-report` marca `captain ✅` (contagem por path, enganosa)                                                   | testes com provider mockado, smoke das 7 actions, 501 por action                                               |

> Tabelas do dump já existem e **não serão alteradas**: `packages/db/src/schema/captain.ts`,
> `packages/db/src/schema/webhooks.ts` (`integrations_hooks`), `accounts.settings`
> e `installation_configs` (`packages/db/src/schema/auth.ts`).

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                                                           | O que dita para nós                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/controllers/api/v1/accounts/captain/preferences_controller.rb`                                                                                                   | contrato `show/update`, payload `{providers, models, features}`, merge de `captain_models`/`captain_features`, admin no update                   |
| `app/controllers/api/v1/accounts/captain/tasks_controller.rb`                                                                                                         | 5 actions, params (`content`, `operation`, `conversation_display_id`, `follow_up_context`, `message`) e envelope `{message, follow_up_context?}` |
| `lib/captain/{base_task_service,rewrite,summary,reply_suggestion,label_suggestion,follow_up}_service.rb`                                                              | regras de operação, prompts, limite de contexto, cache de labels, erros                                                                          |
| `lib/llm/models.rb`, `lib/llm/feature_router.rb`, `config/llm.yml`                                                                                                    | catálogo providers/models/features e resolução (conta → instalação → default)                                                                    |
| `config/installation_config.yml`, `super_admin/app_configs_controller.rb`                                                                                             | `CAPTAIN_OPEN_AI_API_KEY`, `CAPTAIN_OPEN_AI_MODEL`, `CAPTAIN_OPEN_AI_ENDPOINT`                                                                   |
| `config/integration/apps.yml` (app `openai`) + `integrations_hooks`                                                                                                   | `api_key` por conta e flag `label_suggestion` via hook OSS                                                                                       |
| `config/features.yml`                                                                                                                                                 | `captain_tasks` (OSS, default on, bit 61); `captain_integration`/`captain_integration_v2` (premium, bits 36/47)                                  |
| `app/javascript/dashboard/api/captain/tasks.js`, `composables/useCaptain.js`, `store/captain/preferences.js`                                                          | paths/params exatos e o que a UI espera consumir                                                                                                 |
| `components/widgets/WootWriter/{CopilotMenuBar,ReplyTopPanel}.vue`, `.../conversation/conversation/LabelSuggestion.vue`, `.../WootWriter/CopilotReplyBottomPanel.vue` | menu de IA, sugestão de labels e refinamento                                                                                                     |
| `routes/dashboard/settings/captain/{Index.vue,components/*}`                                                                                                          | página de preferências (modelos/toggles; seções enterprise bloqueadas)                                                                           |
| `app/policies/captain/tasks_policy.rb` + `accounts` policy                                                                                                            | qualquer agente pode tasks; update de preferências exige administrator                                                                           |
| `db/schema.rb` / tabelas                                                                                                                                              | `accounts.settings`, `integrations_hooks.settings`, `installation_configs` — DDL já fechado, só usar                                             |

## 4. Lacunas detalhadas

### 4.1 API

- [ ] **15-3** `GET /api/v1/accounts/:account_id/captain/preferences` — Rails
      `PreferencesController#show` — 200 **sem wrapper**: `{ providers, models,
features }`; qualquer agente da conta. Criar router `captain` dedicado
      (`apps/server/src/routes/v1/captain.ts`, montar em `index.ts`) e serviço no
      core. Não usar `ok()`/`{ data }` aqui.
- [ ] **15-3** `PATCH|PUT .../captain/preferences` — `#update` — admin
      (`requireAdmin`, 403 para agente); body `captain_models` e/ou
      `captain_features`, merge com os valores atuais, validação de feature/modelo
      conhecidos (`Llm::Models`) → 422; persiste em `accounts.settings` (jsonb;
      **sem DDL**). Divergência a decidir no aceite `(verificar)`: o Rails devolve
      422 `{ message, attributes }` (`RequestExceptionHandler`), nosso
      `UnprocessableError` emite `{ error, attributes }`.
- [ ] **15-4** `POST .../captain/tasks/rewrite` — params `content`, `operation`
      ∈ `fix_spelling_grammar|improve|casual|professional|friendly|confident|straightforward`,
      `conversation_display_id` — 200 `{ message, follow_up_context? }`; operação
      inválida → 422 `{ error }`. `features: 'editor'` nos prompts do Rails.
- [ ] **15-5** `POST .../captain/tasks/summarize` — `conversation_display_id` —
      200 `{ message, follow_up_context }`.
- [ ] **15-5** `POST .../captain/tasks/reply_suggestion` — `conversation_display_id`
      — usa nome/assinatura do agente logado — 200 `{ message, follow_up_context }`.
- [ ] **15-5** `POST .../captain/tasks/label_suggestion` — `conversation_display_id`
      — só com ≥3 mensagens incoming e labels cadastradas; retorna
      `{ message: "label1, label2" }` **sem** follow-up; cache por
      `conversation.id + last_activity_at` (Redis se `REDIS_URL`, senão sem cache).
- [ ] **15-5** `POST .../captain/tasks/follow_up` — `follow_up_context`
      (`event_name`, `original_context`, `last_response`, `conversation_history`,
      `channel_type`), `message`, `conversation_display_id` — 200
      `{ message, follow_up_context }` atualizado; contexto inválido → 422.
- [ ] **15-6** Flags/limites: tasks com `captain_tasks` (bit 61) desligado → 501
      `{ error }`; preferências/UI com `captain_enabled` (alias) desligado → 501;
      sem chave no resolvedor → 501; erro HTTP/vazio do provider → **503**
      (Rails devolve 401/403/422 internos — divergência consciente registrada;
      a instrução do módulo é preservar 501 no repo).
- [ ] **15-6** `POST .../captain/assist` — alias interno atual (usado por
      `ReplyBox.tsx` e `scripts/e2e.mjs`): manter redirecionando para os novos
      serviços/envelopes ou remover junto com o front canônico `(verificar)`.
- [ ] **15-1** Resolvedor de provider + catálogo LLM no core: ordem
      hook `openai` da conta → `installation_configs` `CAPTAIN_OPEN_AI_API_KEY/ENDPOINT/MODEL`
      → env `CAPTAIN_API_KEY|OPENAI_API_KEY` / `CAPTAIN_BASE_URL` / `CAPTAIN_MODEL`;
      default endpoint `https://api.openai.com/v1` e default de modelo do pino
      (`gpt-4.1-mini`; hoje o stub usa `gpt-4o-mini`). Catálogo local de
      `providers/models/features` (`config/llm.yml`-like) alimenta o payload de
      preferências. Formato exato de `settings` do hook openai `(verificar)`.

### 4.2 Front

- [ ] **15-8** `conversas/:id` — composer — referência
      `WootWriter/CopilotMenuBar.vue` + `ReplyTopPanel.vue`: menu ✨ com
      `improve`, troca de tom (casual/professional/friendly/confident/straightforward),
      `fix_spelling_grammar`, `reply_suggestion` e `summarize` (modo reply/nota),
      gated por `captain_tasks` — alterar `apps/web/src/components/conversations/ReplyBox.tsx`
      (extrair `CopilotMenu.tsx`); hoje há 3 itens fixos e gate no alias.
- [ ] **15-9** `conversas/:id` — thread — referência
      `conversation/conversation/LabelSuggestion.vue`: card com labels sugeridas,
      aplicar (pode remover labels) e dispensar; acionar após abrir a conversa
      quando feature ligada — criar `apps/web/src/components/conversations/LabelSuggestion.tsx`
      e renderizar em `Thread.tsx`.
- [ ] **15-10** `conversas/:id` — resultado da IA — referência
      `CopilotReplyBottomPanel.vue`: caixa de follow-up que reenvia
      `follow_up_context` + `message` e substitui o texto gerado — criar
      `apps/web/src/components/conversations/CopilotFollowUp.tsx` usado pelo
      composer/thread.
- [ ] **15-11** `settings/captain` — referência `routes/dashboard/settings/captain/Index.vue` + `ModelSelector.vue`/`FeatureToggle.vue`: página **admin** com Model
      Configuration (`editor`; `assistant`/`copilot` marcados Enterprise) e
      Features (`label_suggestion` OSS; `help_center_search`/`audio_transcription`
      Enterprise bloqueados) — criar rota `apps/web/src/routes/_auth/app/settings/captain.tsx`,
      link em `app-sidebar.tsx`; visível com `captain_enabled`.
- [ ] **15-8** `DetailsPanel.tsx` — aba Copilot: no Rails o Copilot flutuante é
      Enterprise; manter stub ou trocar por CTA para `settings/captain` quando
      admin `(verificar)`. **Não** portar `components/copilot/*`.
- [ ] **15-8** Erros da API em toast consistente (pt-BR): flag desligada, chave
      ausente, 503 do provider e 422 de operação/validação — i18n está fora do
      roadmap, então as strings ficam no componente.

### 4.3 Dados, jobs e realtime (quando aplicável)

- [ ] **15-3** Usar `accounts.settings` jsonb (`captain_models`,
      `captain_features`) — coluna já existe; nenhuma migration.
- [ ] **15-1** Ler `integrations_hooks` (app_id `openai`, status enabled,
      `settings.api_key`/`settings.label_suggestion`) quando existir; a criação
      desse hook é do módulo 10 (Integrações) e **não** entra aqui.
- [ ] **15-1** Ler `installation_configs` `CAPTAIN_OPEN_AI_*` quando existir
      (configuração via superadmin é do módulo 13).
- [ ] **15-5** Cache de `label_suggestion`: no Rails é Redis
      (`Redis::Alfred`, chave por conversa + `last_activity_at`); usar `ioredis`
      (já é dependência do core) quando `REDIS_URL` estiver setado e degradar
      para sem-cache sem ele.
- [ ] **15-5** Não há job/fila no fluxo OSS: as 5 tasks são síncronas; nenhum
      evento novo de `/cable`. Embeddings/filas são Enterprise (fora).

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                 | Arquivos-alvo                                                                                                         | Depende    |
| ----- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ---------- |
| 15-1  | Catálogo LLM (`providers/models/features`) + resolvedor de provider (hook → installation config → env) | `packages/core/src/lib/llm.ts`, `packages/core/src/services/captain.ts`                                               | —          |
| 15-2  | Schemas Zod de captain (preferências e tasks) com `conversation_display_id`                            | `packages/core/src/schemas/captain.ts`, `packages/core/src/index.ts`                                                  | —          |
| 15-3  | `preferences#show/update`: payload Rails, merge/validação e persistência em `accounts.settings`        | `packages/core/src/services/captain.ts`, `apps/server/src/routes/v1/captain.ts`, `apps/server/src/routes/v1/index.ts` | 15-1, 15-2 |
| 15-4  | `tasks/rewrite` com as 7 operações e prompts equivalentes                                              | `packages/core/src/services/captain.ts`                                                                               | 15-1, 15-2 |
| 15-5  | `summarize`, `reply_suggestion`, `label_suggestion` (cache) e `follow_up`                              | `packages/core/src/services/captain.ts`                                                                               | 15-4       |
| 15-6  | Gates/erros (501 flag/chave, 503 provider, 422 validação) e alias `/assist`                            | `packages/core/src/services/captain.ts`, `apps/server/src/routes/v1/captain.ts`                                       | 15-4, 15-5 |
| 15-7  | Testes unit com `fetch` mockado (20+ casos: operações, envelopes, flags, cache)                        | `packages/core/src/services/captain.test.ts`                                                                          | 15-6       |
| 15-8  | Menu ✨ do composer com operações Rails e gate `captain_tasks`                                         | `apps/web/src/components/conversations/ReplyBox.tsx`, `apps/web/src/components/conversations/CopilotMenu.tsx`         | 15-4…15-6  |
| 15-9  | Card de sugestão de labels no thread (aplicar/dispensar)                                               | `apps/web/src/components/conversations/LabelSuggestion.tsx`, `Thread.tsx`                                             | 15-5       |
| 15-10 | Caixa de follow-up do resultado (contexto + refino)                                                    | `apps/web/src/components/conversations/CopilotFollowUp.tsx`, `ReplyBox.tsx`                                           | 15-5       |
| 15-11 | Página `settings/captain` (admin): modelo por feature + toggles OSS                                    | `apps/web/src/routes/_auth/app/settings/captain.tsx`, `apps/web/src/components/app-sidebar.tsx`                       | 15-3, 15-8 |
| 15-12 | Aceite: smoke das 7 actions, mock HTTP local, e2e 501/200, docs e `.env.example`                       | `scripts/e2e.mjs`, `scripts/mock-llm.mjs`, `.env.example`, `docs/specs/paridade-mapa.md`, `roadmap.md`                | todas      |

## 6. Aceite

```bash
bun run check-types && bunx oxlint
bun test packages/core/src/services/captain.test.ts      # provider mockado (fetch)
bun scripts/mock-llm.mjs &                               # OpenAI-compatível local
CAPTAIN_API_KEY=mock CAPTAIN_BASE_URL=http://127.0.0.1:4123/v1 bun scripts/e2e.mjs
bun scripts/parity-report.mjs --write-doc                # captain: 7/7 actions
bun scripts/db-roundtrip-check.mjs                       # DDL intacto
```

- [ ] **15-3/15-4/15-5** As 7 actions existem no path/método Rails e devolvem
      200 com envelope do pino (`{providers, models, features}` e
      `{message, follow_up_context?}`), provado por smoke commitado.
- [ ] **15-6** Conta com `captain_tasks` desligado → **501** `{error}` em cada
      uma das 5 tasks; sem chave de provider → 501; update de preferências por
      agente (não admin) → 403.
- [ ] **15-7** Com provider mockado: `rewrite` (7 operações), `summarize`,
      `reply_suggestion`, `label_suggestion` e `follow_up` retornam os textos do
      mock; nenhum teste toca a internet.
- [ ] **15-8/15-9/15-10** UI: menu ✨ aplica sugestão/reescrita no rascunho, card
      de labels aplica labels na conversa, follow-up substitui o resultado.
- [ ] **15-11** `settings/captain` salva `captain_models`/`captain_features` e
      reflete no reload (admin); agente não vê a página.
- [ ] **15-12** `parity-report` acusa as 7 actions cobertas; `e2e.mjs` verde 2×
      seguidas; screenshots do menu e da página em `shots/` para comparar com o
      Vue original.

## 7. Fora de escopo

- **Enterprise (`chatwoot/enterprise/`)** — não planejado aqui: assistants,
  documents, FAQ/`faq_suggestions`, scenarios, custom tools, copilot
  (threads/messages/launcher), assistant stats/responses, agent sessions,
  message reports, inboxes de assistant, bulk actions e quotas/limites. As
  tabelas existem no nosso dump (`packages/db/src/schema/captain.ts`) e ficam
  sem uso; implementar exigiria embeddings (`article_embeddings`), jobs e todos
  esses controllers — fora por licença e por decisão do R0.
- **Copilot flutuante** (`components-next/copilot/*`, `components/copilot/*`):
  Enterprise; o stub de aba do `DetailsPanel` não vira Copilot.
- **“Ask Copilot”** no menu do editor (depende do Copilot Enterprise): não portar.
- **Configuração/criação do hook OpenAI** (tela de integrações) é do módulo 10;
  aqui só **lemos** o que existir.
- **Configuração de `installation_configs` pelo superadmin** é do módulo 13;
  aqui só lemos.
- **Provedores não-OpenAI** (Anthropic/Gemini `coming_soon` no pino): o catálogo
  os exibe, mas o cliente é só OpenAI-compatível (`/chat/completions`).
- **i18n** e **pipeline/CI**: decisão global, não entram (strings pt-BR/en).
- **DDL**: nenhuma alteração de schema; se faltar algo, registrar em
  `docs/specs/drift-permitido.md` (trilha D5) antes.

## 8. Definição de done

Para marcar `15` como 100% no `roadmap.md`:

1. Tarefas **15-1 … 15-12** commitadas com os checkboxes deste doc em `[x]`.
2. `bun run check-types && bunx oxlint`, `bun test packages/core/src/services/captain.test.ts`,
   `bun scripts/e2e.mjs` (2×), `bun scripts/parity-report.mjs --write-doc` e
   `bun scripts/db-roundtrip-check.mjs` verdes, com a saída colada no PR/commit.
3. `docs/specs/paridade-mapa.md` regenerado (captain 7/7) e a linha 15 do
   `roadmap.md` atualizada para `✅`.
4. Evidência visual em `shots/` (menu de IA, labels, follow-up, settings/captain).
5. Nenhum drift de DDL (`schema-diff` e roundtrip verdes) e nenhum arquivo de
   `chatwoot/enterprise/` copiado para o produto.
