# 03 — Contatos e empresas

> **Estágio:** 03/15 · **Status:** 1 de 12 subáreas ✅ (empresas — bônus), 7 🟡 e 4 ❌ · **Depende de:** 01 (shell) · 02 (conversas/mensagens para timeline e merge) · R1 (medição/seed)
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`): API `contacts` 35 ações Rails × 19 rotas nossas; `data_imports` 9 × 11 (✅ por rota, mas validate/start/retry/abandon/logs ausentes no código); front `contacts` ✅ de fachada, `data` ❌
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

Entregar a gestão de contatos 1:1 com o Chatwoot OSS: lista com busca, ordenação, filtros
avançados e segmentos salvos; detalhe com abas (Atributos, Histórico, Notas, Mídia, Mesclar);
bloqueio/desbloqueio; campos customizados do contato; CSV (import/export) e data imports
(CSV legado + integrações Intercom/Freshdesk OSS). Empresas entram como **extra** (no Rails é
Enterprise; já temos por bônus) e não contam para o aceite.

Critério objetivo de 100%:

1. Toda action pública dos controllers do §3 responde no mesmo path/método, status e envelope
   do Rails (coleção em `{ payload, meta }`, item em objeto raiz, erros `{ error, attributes }`
   ou `{ message }`), provado por smoke de contrato.
2. `contacts` e `data_imports` zerados no `bun scripts/parity-report.mjs` (nenhuma action do
   inventário sem rota) e envelopes conferidos contra as views jbuilder do pino.
3. Todas as rotas do Vue router do módulo (contatos, segmentos, active, labels, settings/attributes,
   settings/data) têm página funcional com dados reais, estados vazio/loading/erro e comparação
   visual lado a lado (`bun scripts/shot.mjs`).
4. Import CSV de 100 contatos pela UI com `data_import` + logs corretos (pendentes/erros) e
   idempotência; export CSV no formato do Rails (`id,name,email,phone_number,labels`); merge
   move conversas/mensagens/notas/inboxes e some com o contato absorvido.

Não conta como 100%: rota existente devolvendo envelope divergente (`{ data }` em vez de
`payload`/raiz); página que só lista sem filtro/segmento; import que ignora labels, empresa,
cidade e custom attributes; merge que só apaga o filho sem mover conversas; empresas (bônus).

## 2. Estado atual (medido)

| Subárea                           | Status | Evidência no nosso repo                                                                                                     | Lacuna principal                                                                                                                                                                         |
| --------------------------------- | :----: | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API contatos — CRUD/lista         |   🟡   | `apps/server/src/routes/v1/contacts.ts`, `packages/core/src/services/contacts.ts`                                           | envelopes (`{data}` vs `payload`/raiz), `resolved_contacts`/`crm_v2`, `include_contact_inboxes`, sort `company_name/city/country`, 422 de contato online, validações de identifier/phone |
| API sub-recursos do contato       |   🟡   | notes, labels, conversations, attachments, `contact_inboxes` create e merge em `contacts.ts`                                | faltam `contactable_inboxes`, `contact_inboxes/filter`, `avatar` (DELETE), `destroy_custom_attributes`, notas `show`/`update`; timeline diverge (limite 50 vs 20, sem permission filter) |
| API filtros avançados (`filter`)  |   ❌   | —                                                                                                                           | `POST /contacts/filter` e a gramática do `filter_keys.yml` não existem                                                                                                                   |
| API CSV + data imports            |   ❌   | `startContactImport`/`GET /contacts/import/:id` (extra), `services/data-imports.ts` (só list/get)                           | `import_file` canônico, `export`, validate_source/create/start/retry/abandon/logs, `data_import_items`/`mappings`, gate `data_import`                                                    |
| API custom attribute definitions  |   🟡   | `routes/v1/custom-attributes.ts`, `services/contacts.ts:656`                                                                | enum de tipos errado (2+), falta `show`, payload aninhado, validações Rails (key/uniqueness/conflito)                                                                                    |
| API/UI custom filters (segmentos) |   ❌   | `engagement.ts:50`, `services/notifications.ts:482`                                                                         | fixa `filter_type=0` (conversation), sem `show`/`filter_type` no JSON, sem segmentos de contato na UI                                                                                    |
| Front lista de contatos           |   🟡   | `apps/web/src/routes/_auth/app/contacts/index.tsx`                                                                          | filtros avançados, rotas `active/labels/segments`, salvar/excluir segmento, bulk labels, import/export reais, infinite scroll                                                            |
| Front detalhe do contato          |   🟡   | `contactId.tsx` (abas Atributos/Histórico/Notas/Mídia/Mesclar)                                                              | avatar upload/delete, remover valor de atributo, editar nota, merge invertido (aberto = mergee), contactable inboxes no compose                                                          |
| Front settings/attributes         |   🟡   | `settings/custom-attributes.tsx`                                                                                            | tipos corretos (0,1,4,5,6,7), editar atributo, abas contato/conversa, validações                                                                                                         |
| Front settings/data               |   ❌   | —                                                                                                                           | Index (poll 5s), NewImportDialog (Intercom/Freshdesk), Show (progresso/logs/retry/abandon)                                                                                               |
| Empresas (bônus)                  |   ✅   | `routes/v1/companies.ts`, `services/companies.ts`, `components/companies/CompanyPicker.tsx`, `apps/web/.../app/companies/*` | manter; sem trabalho no aceite (Rails é Enterprise)                                                                                                                                      |
| Jobs e realtime                   |   🟡   | `registerContactImportJob` (`services/contacts.ts:882`), `realtime/index.ts`                                                | job de export, import de integração, eventos `contact.created/updated/deleted/merged`                                                                                                    |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                                           | O que dita para nós                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `app/controllers/api/v1/accounts/contacts_controller.rb`                                                                                              | index/search/active/filter/import/export/show/create/update/destroy/avatar/contactable_inboxes/destroy_custom_attributes |
| `app/controllers/api/v1/accounts/contacts/{notes,contact_inboxes,conversations,attachments,labels}_controller.rb`                                     | notas, inboxes do contato, timeline, mídia e etiquetas                                                                   |
| `app/controllers/api/v1/accounts/actions/contact_merges_controller.rb` + `app/actions/contact_merge_action.rb`                                        | merge (`base_contact_id`/`mergee_contact_id`) e o que é movido                                                           |
| `app/controllers/api/v1/accounts/contact_inboxes_controller.rb`                                                                                       | `contact_inboxes#filter` (inbox+source_id)                                                                               |
| `app/controllers/api/v1/accounts/custom_attribute_definitions_controller.rb` + `app/models/custom_attribute_definition.rb`                            | tipos/validações obrigatórias e enum                                                                                     |
| `app/controllers/api/v1/accounts/custom_filters_controller.rb` + `app/models/custom_filter.rb`                                                        | `filter_type` (conversation/contact/report), limite 1000                                                                 |
| `app/controllers/api/v1/accounts/data_imports_controller.rb` + `app/jobs/data_import_job.rb`                                                          | validate_source/create/start/retry/abandon/logs e CSV legado                                                             |
| `app/services/contacts/{filter_service,contactable_inboxes_service,bulk_*}.rb`, `app/helpers/filters/filter_helper.rb`, `lib/filters/filter_keys.yml` | gramática de filtros e regras de inboxes contactáveis                                                                    |
| `app/views/api/v1/accounts/contacts/**` + `app/views/api/v1/models/_{contact,note,custom_filter}.json.jbuilder`                                       | contratos de envelope e campos (payload/raiz, `contact_inboxes`, `user`)                                                 |
| `db/schema.rb` (`contacts`, `notes`, `custom_filters`, `data_imports*`, `taggings`)                                                                   | dados — DDL já fechado na trilha D, **não alterar**                                                                      |
| `app/javascript/dashboard/routes/dashboard/contacts/**` + `components-next/Contacts/**`                                                               | UI: `ContactsIndex`, `ContactManageView`, `ContactsBulkActionBar`, `contactFilterItems`, `ContactMerge`, `FilterInput`   |
| `app/javascript/dashboard/routes/dashboard/settings/{attributes,data}/**`                                                                             | UI: `AddAttribute`/`EditAttribute`/`Index`, `data/Index                                                                  | Show | NewImportDialog`, `importSources`, `importStatus` |

## 4. Lacunas detalhadas

### 4.1 API

> Envelopes conferidos nas views do pino: **coleção** (contacts index/search/active/filter,
> notes index, labels, conversations, attachments, data_imports index) em
> `{ payload: [...], meta }`; **item** (show/update/create de contato, merge, contact_inboxes
> create/filter, attach…) em objeto raiz — exceto `contacts#create`, que é
> `{ payload: { contact, contact_inbox } }`. Nosso helper `ok()` responde `{ data }`; cada
> bullet abaixo inclui o alinhamento a fazer.
>
> Auth dos exemplos: `Authorization: Bearer <jwt>` (o que funciona hoje). Chatwoot também
> aceita o header `api_access_token` — entrará junto com a paridade de auth no módulo 12.

- [ ] `GET /api/v1/accounts/:account_id/contacts` — `contacts#index` — `include_contact_inboxes` (default `true`; `false` desliga), `resolved_contacts` (só email/phone/identifier não vazios; com `crm_v2` = `contact_type=lead`), sort `company_name|city|country`, meta `{ count, current_page }` — hoje `contacts.ts:35` devolve `{ data: { contacts }, meta }` sem inboxes.
- [ ] `GET /contacts/active` — `contacts#active` — ids online do `OnlineStatusTracker` (nosso `listPresence`), mesmo envelope do index.
- [ ] `GET /contacts/search` — `contacts#search` — `q` obrigatório (em branco ⇒ 422 `{ error: "Specify search string with parameter q" }`), `meta.has_more` (+1 registro) e scroll infinito no front.
- [ ] `POST /contacts/filter` — `contacts#filter` — `Contacts::FilterService`: corpo `{ payload: [{ attribute_key, filter_operator, values, query_operator, custom_attribute_type? }] }`, última condição sem `query_operator`; atributos/operadores de `filter_keys.yml` (contacts) + custom attributes com cast (`text`, `numeric`, `date`, `boolean`); 422 para `InvalidAttribute/InvalidOperator/InvalidValue` via `render_could_not_create_error`.
- [ ] `POST /contacts/import` — `contacts#import` — multipart com **`import_file`** (não `data_file`); 422 se ausente; 200 `head`; cria `data_imports` (`data_type=contacts`) com arquivo anexado; remover/ajustar o extra `GET /contacts/import/:import_id` (Rails lê status em `/data_imports/:id`).
- [ ] `POST /contacts/export` — `contacts#export` — body `{ column_names?, payload?, label? }`; 200 `head`; job gera CSV com BOM, colunas default `id,name,email,phone_number,labels`; e-mail do link fica para 14.
- [ ] `POST /contacts` — `contacts#create` — `inbox_id`+`source_id` opcionais criam `contact_inbox`; multipart `avatar`; `avatar_url`; resposta `{ payload: { contact, contact_inbox } }` (201).
- [ ] `PATCH /contacts/:id` — `contacts#update` — aceita multipart (`avatar`/`avatar_url`), mescla `custom_attributes`/`additional_attributes` e responde contato raiz; `blocked` usa o mesmo PATCH (bloquear/desbloquear).
- [ ] `DELETE /contacts/:id` — `contacts#destroy` — 422 `{ message }` se o contato estiver online (presença); hoje sempre 200.
- [ ] `DELETE /contacts/:id/avatar` — `contacts#avatar` — remove o anexo e devolve o contato raiz; payload do contato ganha `thumbnail`.
- [ ] `GET /contacts/:id/contactable_inboxes` — `contacts#contactable_inboxes` — `{ payload: [{ inbox, source_id }] }` pelas regras de `Contacts::ContactableInboxesService` (email=só com e-mail; whatsapp/sms=só com phone; api/website com `contact_inbox` existente ou uuid).
- [ ] `POST /accounts/:account_id/contact_inboxes/filter` — `contact_inboxes#filter` — `inbox_id`+`source_id`; 404 se não achar; contato raiz.
- [ ] `POST /contacts/:id/contact_inboxes` — `contacts/contact_inboxes#create` — aceita `source_id` e HMAC (`hmac_verified`), resposta objeto raiz (hoje `{ data: { contact_inbox } }`).
- [ ] `POST /contacts/:id/destroy_custom_attributes` — `contacts#destroy_custom_attributes` — body `custom_attributes: [chaves]`; contato raiz.
- [ ] `GET/POST /contacts/:id/notes` e `GET/PATCH/DELETE /contacts/:id/notes/:id` — `contacts/notes` — index em array raiz, item em objeto raiz com `user` aninhado; faltam `show` e `update` (hoje `{ data: { notes } }` e sem `user`).
- [ ] `GET /contacts/:id/conversations` — timeline limitada a **20**, ordenada por `last_activity_at desc` e filtrada por `Conversations::PermissionFilterService` — `{ payload: [...] }` (hoje limite 50, sem permission filter).
- [ ] `GET /contacts/:id/attachments` — paginação (`page`, `RESULTS_PER_PAGE=100`) e `meta.total_count`; hoje sem paginação/meta.
- [ ] `GET/POST /contacts/:id/labels` — `{ payload: [labels] }`; o POST substitui o conjunto (nosso título normalizado) — hoje `{ data: { labels } }`.
- [ ] `POST /accounts/:account_id/actions/contact_merge` — `contact_merges#create` — `base_contact_id`/`mergee_contact_id`; contato base raiz; mesmo id devolve o base sem erro; mover conversas, mensagens, contact_inboxes e notas e fundir `identifier/name/email/phone/additional/custom` (hoje rota `POST /contacts/:id/merge` com `{ child_id }` e **sem** mover conversas/mensagens).
- [ ] `GET/POST /custom_attribute_definitions`, `GET/PATCH/DELETE /:id` — array/objeto raiz; body aninhado `custom_attribute_definition`; destroy **204**; `attribute_model` conversation=0/contact=1; corrigir enum de tipos para text 0, number 1, currency 2, percent 3, link 4, date 5, list 6, checkbox 7 (hoje `contacts.ts:135` desloca de 2 em diante); `attribute_values` obrigatório na UI para list (verificar regra no model); `default_value` **não** está no `permitted_payload` do Rails OSS; falta `show`.
- [ ] `GET/POST /custom_filters`, `GET/PATCH/DELETE /:id` — array/objeto raiz; index por `filter_type` (conversation/contact/report) e por usuário; JSON expõe `filter_type` **string** (hoje devolvemos `model_type` e fixamos conversation); falta `show`; limite `Limits::MAX_CUSTOM_FILTERS_PER_USER = 1000`.
- [ ] `GET/POST /data_imports`, `GET /:id` — index `{ payload: [...] }`; show em objeto raiz + `import_errors`, `skip_logs` e `skip_logs_filters`; `create` para Intercom/Freshdesk (`name`, `source_provider`, `access_token`, `domain`, `import_types`), gate da feature `data_import`, 422 "Another data import is already in progress."; hoje só list/get e envelope `{ data }`.
- [ ] `POST /data_imports/validate_source`, `POST /data_imports/:id/start|retry|abandon`, `GET /data_imports/:id/error_logs|skip_logs` — `validate_source` devolve `{ valid, totals }`/422; `start`/`retry` reenfileiram por estágio (`:enqueue`/`:not_stalled`/`:access_token_missing`); `abandon` grava `abandoned_at`; logs em CSV (`created_at,kind,source_object_type,source_object_id,error_code,message,details`).

### 4.2 Front

- [ ] `contacts` — rotas aninhadas `segments/:segmentId`, `labels/:label` e `active` (`routes.js` do pino) — portar para `index.tsx` + rotas novas em `apps/web/src/routes/_auth/app/contacts/`; título do header muda por contexto de filtro atual.
- [ ] Filtros — `FilterInput` + `contactFilterItems/index.js` + `FilterOperatorTypes` — painel de filtros (`name`, `email`, `phone_number`, `identifier`, `country_code`, `city`, `company_name`, `created_at`, `last_activity_at`, `blocked`, `labels`), preview de filtros aplicados e `filterQueryGenerator` (remove `query_operator` do último); salvar como segmento (`POST custom_filters` tipo contact).
- [ ] Segmentos — `ContactsListLayout` + `CreateSegmentDialog`/`DeleteSegmentDialog` — listar por `customViews`, abrir/editar/excluir e aplicar o `query` salvo em `POST /contacts/filter`.
- [ ] Busca/ordenação — `ContactSortMenu` persiste `contacts_sort_by` em `uiSettings`; busca com debounce 300ms usa `GET /contacts/search` + `hasMore` (scroll infinito), não a lista paginada atual.
- [ ] Ações de header — `ContactHeader`/`ContactMoreActions` + `ContactImportDialog`/`ContactExportDialog` — importar via `import_file` (link do CSV de exemplo), exportar dialog (payload/label do segmento ativo), "novo contato" multipart.
- [ ] Bulk bar — `ContactsBulkActionBar` — seleção, `BulkLabelActions` add/remove via `POST /bulk_actions` (`type: 'Contact'`, módulo 02) e delete em lote (Policy administrator) — hoje são N `DELETE` sequenciais.
- [ ] Detalhe — `ContactDetails`/`ContactsForm` — avatar upload/delete (`DELETE /contacts/:id/avatar`), `thumbnail`, campos (`company_id` via CompanyPicker bônus, `additional_attributes`), estados vazio/loading/erro.
- [ ] Abas do detalhe — `ContactCustomAttributes` (remover valor via `destroy_custom_attributes`; hoje só salva), `ContactNotes` (editar via PATCH; hoje só cria/apaga), `ContactHistory` (timeline 20 itens do Rails), `ContactMedia` (paginação/meta), `ContactMerge` (o contato aberto é o **mergee**; escolhe o **base** na busca, com preview dos contatos e confirmação — hoje a semântica é invertida e sem preview).
- [ ] Compose — `ComposeConversation`/`fetchContactableInboxes` — usar `GET /contacts/:id/contactable_inboxes` para escolher inbox (hoje lista todas as inboxes e cria conversa direto) — verificar limite com o módulo de conversas.
- [ ] `settings/attributes` — `AddAttribute`/`EditAttribute`/`Index` — tipos 0/1/4/5/6/7, abas conversa/contato, validações (chave única, formato, conflito com atributos padrão) e confirmar exclusão.
- [ ] `settings/data` — `Index` (poll 5s conforme `importStatus.js`), `NewImportDialog` (Intercom/Freshdesk com token/domain/import_types), `Show` (progresso, `import_errors`, `skip_logs`, botões retry/abandon, download CSV) — página nova + entrada no menu de settings.

### 4.3 Dados, jobs e realtime

- [ ] Usar `data_imports`, `data_import_errors`, `data_import_items` e `data_import_mappings` (já no schema da trilha D) no import CSV e nas integrações; hoje o CSV legado grava só `data_imports`+`data_import_errors`.
- [ ] Job `import.contacts` (existe) ganha paridade com `DataImportJob`: labels aprovadas (erro para label desconhecida), `company_name`/`city` em `additional_attributes`, custom attributes, dedupe por identifier/email/phone com merge, `failed_records` CSV e status `completed` mesmo com rejeitados.
- [ ] Job novo de export (`Account::ContactsExportJob`) + job de import de integração Intercom/Freshdesk com `cursor`/`stats`/`processing_errors` e staged restart (`retry`/`abandon`).
- [ ] Gate de feature `data_import` (`feature_flags_ext_1` bit 2 em `packages/core/src/lib/feature-flags.ts`) nos endpoints e na UI; `resolved_contacts` respeita `crm_v2`; `companies` só como bônus.
- [ ] Realtime: adicionar `contact.created`, `contact.updated`, `contact.deleted` e `contact.merged` ao `RealtimeEvent` e publicar nos services de contatos (create/update/delete/merge); hoje o barramento só tem conversation/message/presence/typing.
- [ ] Presença: `GET /contacts/active` consome `packages/core/src/realtime/presence.ts`; excluir contato online deve falhar com 422 (mesma fonte).

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                                                                                                                       | Arquivos-alvo                                                                                                              | Depende          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 03-1  | Contrato base de contatos: envelopes `payload`/raiz, `include_contact_inboxes`, `resolved_contacts`/`crm_v2`, sorts `company_name/city/country`, validações de email/identifier/phone e 422 de delete online | `apps/server/src/routes/v1/contacts.ts`, `packages/core/src/services/contacts.ts`, `packages/core/src/schemas/contacts.ts` | R1               |
| 03-2  | `POST /contacts/filter` + serviço de filtros (`filter_keys.yml` + custom attributes + erros 422)                                                                                                             | `packages/core/src/services/contact-filters.ts` (novo), `routes/v1/contacts.ts`                                            | 03-1             |
| 03-3  | `GET /contacts/search` (q obrigatório, `has_more`) e `GET /contacts/active` (presença)                                                                                                                       | `routes/v1/contacts.ts`, `services/contacts.ts`, `realtime/presence.ts`                                                    | 03-1             |
| 03-4  | Import CSV canônico (`import_file` → `data_imports` + job com labels/company/city/custom attrs/dedupe/rejected CSV)                                                                                          | `services/contacts.ts`, `jobs/`, `routes/v1/contacts.ts`                                                                   | 03-1             |
| 03-5  | Export CSV (`POST /contacts/export` + job + BOM/colunas Rails + `label`/`payload`)                                                                                                                           | `services/contacts.ts`, `jobs/`, `routes/v1/contacts.ts`                                                                   | 03-2             |
| 03-6  | Create/update completos: `inbox_id`/`source_id`, avatar upload/delete, `thumbnail`, multipart                                                                                                                | `services/contacts.ts`, `schemas/contacts.ts`, storage `.uploads` (verificar)                                              | 03-1             |
| 03-7  | `contactable_inboxes`, `contact_inboxes/filter` e `contact_inboxes#create` com `source_id`/HMAC                                                                                                              | `services/contacts.ts`, `routes/v1/contacts.ts`, `routes/v1/index.ts`                                                      | 03-1             |
| 03-8  | Notas `show`/`update`, `destroy_custom_attributes`, timeline 20 + permission filter e anexos paginados                                                                                                       | `services/contacts.ts`, `routes/v1/contacts.ts`                                                                            | 03-1             |
| 03-9  | Merge canônico (`actions/contact_merge`): mover conversas/mensagens/inboxes/notas, fundir attrs e semântica base/mergee                                                                                      | `services/contacts.ts`, `routes/v1/index.ts`, `routes/v1/contacts.ts`                                                      | 03-1             |
| 03-10 | Data imports completos (validate/create/start/retry/abandon/error_logs/skip_logs) + gate `data_import` + lock de import em andamento                                                                         | `packages/core/src/services/data-imports.ts`, `routes/v1/ops.ts`/`routes/v1/data-imports.ts`                               | 03-4             |
| 03-11 | Custom attributes: `show`, enum de tipos correto, payload aninhado, list/`attribute_values`, validações Rails e destroy 204                                                                                  | `services/contacts.ts`, `routes/v1/custom-attributes.ts`, `schemas/contacts.ts`                                            | 03-1             |
| 03-12 | Custom filters de contato: `filter_type=contact`, `filter_type` no JSON, `show`, limite 1000, posse do dono                                                                                                  | `services/notifications.ts`, `routes/v1/engagement.ts`, `schemas/`                                                         | 03-1             |
| 03-13 | Front lista: filtros avançados, segmentos, active/labels, sort persistido, busca com `has_more`, bulk labels (módulo 02), import/export dialogs                                                              | `apps/web/src/routes/_auth/app/contacts/index.tsx`, `apps/web/src/components/contacts/*` (novos)                           | 03-2             |
| 03-14 | Front settings/data: Index (poll), wizard Intercom/Freshdesk, Show com logs/retry/abandon                                                                                                                    | `apps/web/src/routes/_auth/app/settings/data/*` (novos)                                                                    | 03-10            |
| 03-15 | Front detalhe: avatar, remover custom attribute, editar nota, merge invertido com preview, estados                                                                                                           | `apps/web/src/routes/_auth/app/contacts/$contactId.tsx`, `components/contacts/*`                                           | 03-6, 03-8, 03-9 |
| 03-16 | Front settings/attributes: tipos 0/1/4/5/6/7, editar, abas contato/conversa, validações                                                                                                                      | `apps/web/src/routes/_auth/app/settings/custom-attributes.tsx` (+ edição)                                                  | 03-11            |
| 03-17 | Realtime de contatos (`contact.created/updated/deleted/merged`) publicado nos services                                                                                                                       | `packages/core/src/realtime/index.ts`, `services/contacts.ts`                                                              | 03-1             |
| 03-18 | Smoke/E2E do módulo e medição: estender `scripts/e2e.mjs` (criar→filtrar→nota→merge→export→import 100) e zerar `contacts`/`data_imports` no `parity-report`                                                  | `scripts/e2e.mjs`, `docs/specs/paridade-mapa.md`                                                                           | 03-1…03-17       |

## 6. Aceite

```bash
# qualidade e medição
bun run check-types && bun run check
bun scripts/parity-report.mjs            # contacts e data_imports sem faltantes
bun scripts/schema-diff.mjs && bun scripts/db-roundtrip-check.mjs   # DDL intacto (regressão D)

# smoke de contrato (API no :3000; ACC/TOKEN do seed; Bearer funciona hoje)
curl -s "http://localhost:3000/api/v1/accounts/$ACC/contacts?include_contact_inboxes=true&sort=-last_activity_at" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "http://localhost:3000/api/v1/accounts/$ACC/contacts/filter" -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"payload":[{"attribute_key":"email","filter_operator":"contains","values":["@"],"query_operator":null}]}'
curl -s "http://localhost:3000/api/v1/accounts/$ACC/contacts/active?page=1" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "http://localhost:3000/api/v1/accounts/$ACC/contacts/export" -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"column_names":["id","name","email","phone_number","labels"]}'
curl -s -X POST "http://localhost:3000/api/v1/accounts/$ACC/actions/contact_merge" -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"base_contact_id":1,"mergee_contact_id":2}'
curl -s -X POST "http://localhost:3000/api/v1/accounts/$ACC/data_imports/validate_source" -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"source_provider":"intercom","access_token":"x"}'

# funcional e visual
bun scripts/e2e.mjs
bun scripts/shot.mjs                     # /app/contacts, /app/contacts/:id, /app/settings/attributes, /app/settings/data
```

- [ ] Todos os endpoints do §4.1 com mesmo path/método/status/envelope do Rails, provado pelo smoke acima (payload vs raiz e `meta` conferidos).
- [ ] `bun scripts/parity-report.mjs` → `contacts` e `data_imports` sem ações faltantes; doc `paridade-mapa.md` regenerado.
- [ ] E2E estendido: criar contato → `filter` → nota (criar/editar) → merge movendo conversas → export → import de CSV com 100 linhas e logs, rodando 2× seguidas (idempotência).
- [ ] Import pela UI (`settings/data`) mostra progresso/logs; export gera `id,name,email,phone_number,labels` com BOM; segmento salvo reaplica o filtro.
- [ ] Comparação visual lado a lado (shots) das páginas de lista, detalhe (5 abas), `settings/attributes` e `settings/data`.
- [ ] `bun run check-types && bun run check` verdes; `schema-diff`/roundtrip verdes (nenhum DDL novo).

## 7. Fora de escopo

- **Enterprise:** `companies` (nosso bônus já entregue — manter, sem paridade de aceite), `contacts/calls#create` (voice), overrides enterprise de contato.
- **Widget:** `api/v1/widget/contacts#show/update/set_user/destroy_custom_attributes` — módulo do widget (09).
- **API pública de inbox:** `public/api/v1/inboxes/contacts#show/create/update` — 09.
- **Busca global:** `search/contacts` dedicado — 11 (aqui usamos `GET /contacts/search` da lista).
- **Bulk actions:** controller `bulk_actions#create` — módulo de conversas/02; aqui só consumimos para labels/delete em lote.
- **Mailers** de import/export (e-mail com link do CSV, `contact_import_complete`) — 14.
- **i18n, pipeline/CI e DDL novo** — decisão do R0; schema já fechado na trilha D.

## 8. Definição de done

Commitado e verde: (1) §4.1/§4.2/§4.3 com todos os checkboxes marcados e evidência de smoke
anexada à spec do módulo; (2) `bun scripts/parity-report.mjs` sem faltantes em `contacts` e
`data_imports` e `docs/specs/paridade-mapa.md` regenerado; (3) `scripts/e2e.mjs` estendido
passando 2× e `bun scripts/shot.mjs` com os shots do módulo; (4) `bun run check-types` +
`bun run check` e `schema-diff`/roundtrip verdes; (5) módulo marcado como 100% no
`roadmap.md` com link para os shots e para os logs do import/export. Empresas ficam como
bônus documentado, sem bloquear o aceite.
