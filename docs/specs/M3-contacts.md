# M3 — Contacts, Labels, Custom Attributes (+ import CSV)

Depende de: **M1**. Paralelizável com M2. Desbloqueia: M4.

## 1. Objetivo

CRM de contatos: CRUD, vínculo com inboxes, merge, notas, labels,
atributos customizáveis e importação CSV.

## 2. Referência Chatwoot

- `chatwoot/app/models/{contact,contact_inbox,label,custom_attribute_definition,data_import*}.rb`
- `contacts_controller.rb`, `contact_inboxes_controller.rb`,
  `contact_merges_controller.rb`, `labels_controller.rb`
- Vue: `dashboard/routes/dashboard/contacts/` + `settings/labels/`
  - `settings/customAttributes/`

## 3. DB (`packages/db/src/schema/m3.ts`)

- `contacts (id, account_id, name, email, phone_number, identifier,
country_code, city, company_name, avatar_url, blocked boolean,
custom_attributes jsonb, additional_attributes jsonb, last_activity_at,
created_at, updated_at)` + índices `(account_id, email)`, `(account_id, phone_number)`
- `contact_inboxes (id, contact_id, inbox_id, source_id, hmac_verified,
pubsub_token unique)`
- `labels (id, account_id, title unique scoped, color, description,
show_on_sidebar)`
- `custom_attribute_definitions (id, account_id, attribute_model 0 contact/1 conversation,
attribute_key, attribute_display_name, attribute_type 0-7, attribute_values jsonb)`
- `notes (id, account_id, contact_id, user_id, content)` (notas do contato)
- `data_imports (id, account_id, data_type, status, total_records,
processed_records)`, `data_import_items`, `data_import_errors`

## 4. API

| Método            | Path                                                | Obs                                                   |
| ----------------- | --------------------------------------------------- | ----------------------------------------------------- |
| GET               | `/api/v1/accounts/:id/contacts`                     | `q, labels[], sort (name/last_activity), page`        |
| POST/PATCH/DELETE | `/api/v1/accounts/:id/contacts[/:contact_id]`       | valida `custom_attributes` contra definitions         |
| POST              | `/api/v1/accounts/:id/contacts/:id/contact_inboxes` | vincular a inbox                                      |
| POST              | `/api/v1/accounts/:id/contacts/:id/merge`           | `{ child_id }` — move inboxes/conversas, deleta child |
| GET/POST          | `/api/v1/accounts/:id/contacts/:id/notes`           | notas internas                                        |
| CRUD              | `/api/v1/accounts/:id/labels`                       |                                                       |
| CRUD              | `/api/v1/accounts/:id/custom_attributes`            | `attribute_model` contact aqui (conversation no M4)   |
| POST              | `/api/v1/accounts/:id/contacts/import`              | CSV → `data_import` + job processa em background      |

## 5. Front

- `contacts/index` (tabela: nome, email, telefone, empresa, labels + busca +
  filtro por label + import/export CSV) e `contacts/:id` (drawer/página:
  dados editáveis, custom attrs, contact_inboxes, notas, timeline de conversas).
- `settings/labels` e `settings/custom-attributes` (CRUD com mesmos campos do Vue).

## 6. Aceite

- [ ] CRUD + busca + filtro por label funcionam; custom attrs por tipo
      (text/number/link/date/list/checkbox) validam.
- [ ] Merge move conversas/inboxes e apaga o secundário.
- [ ] Import CSV de 1000 linhas processa em job com progresso e erros listados.
- [ ] Labels criadas aparecem como opção nas conversas (M4).

## 7. Done

Migration + contatos + labels + custom attrs + import com job + testes
(merge, validação de custom attr, policy por conta).
