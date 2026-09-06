# M2 — Inboxes & Channels (+ working hours)

Depende de: **M1**. Paralelizável com M3. Desbloqueia: M4.

## 1. Objetivo

Caixas de entrada por canal (Website, API, Email + stubs dos demais),
membros por inbox, horário comercial e política de atribuição.

## 2. Referência Chatwoot

- `chatwoot/app/models/{inbox,channel/*,inbox_member,working_hour,inbox_assignment_policy,assignment_policy,dashboard_app}.rb`
- `chatwoot/app/controllers/api/v1/accounts/inboxes_controller.rb`
- Vue: `dashboard/routes/dashboard/settings/inbox/` (lista + wizard "Add inbox")

## 3. DB (`packages/db/src/schema/m2.ts`)

- `inboxes (id, account_id, channel_type, channel_id, name, greeting_enabled,
greeting_message, csat_survey_enabled, enable_auto_assignment,
working_hours_enabled, out_of_office_message, allow_messages_after_resolved,
lock_to_single_conversation, sender_name_type, created_at, updated_at)`
- Um `channel_*` por tipo (colunas iguais ao Rails):
  `channel_web_widgets (website_url, widget_color, welcome_title,
welcome_tagline, hmac_token, pre_chat_form_enabled, ...,
website_token unique)`,
  `channel_api (identifier unique, hmac_token)`,
  `channel_email (email, imap_*, smtp_*, provider)`,
  `channel_facebook_pages, channel_instagrams, channel_twitters,
channel_telegrams, channel_whatsapps, channel_sms, channel_line`
  (campos reais do `schema.rb`; os externos ganham provider no M10).
- `inbox_members (id, inbox_id, user_id, unique(inbox_id, user_id))`
- `working_hours (id, inbox_id, day_of_week 0-6, open_hour, close_hour,
closed_all_day, open_all_day)`
- `inbox_assignment_policies, assignment_policies`
- `dashboard_apps (id, account_id, user_id, title, content)` (integrações embed)

## 4. API

| Método           | Path                                                       | Obs                                                                        |
| ---------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| GET/POST         | `/api/v1/accounts/:id/inboxes`                             | `channel: { type, ...attrs }` validado por canal (Zod discriminated union) |
| GET/PATCH/DELETE | `/api/v1/accounts/:id/inboxes/:inbox_id`                   | inclui `channel` serializado                                               |
| GET/POST/DELETE  | `/api/v1/accounts/:id/inboxes/:inbox_id/inbox_members`     | gerenciar agentes                                                          |
| GET/PUT          | `/api/v1/accounts/:id/inboxes/:inbox_id/working_hours`     | array 7 dias                                                               |
| GET/PUT          | `/api/v1/accounts/:id/inboxes/:inbox_id/assignment_policy` | `auto_assignment` on/off                                                   |
| GET              | `/api/v1/inboxes/:id`                                      | detalhe tipado por canal (para o front de settings)                        |

Regra: agente só vê inboxes onde é membro (admin vê todas) — espelhar
`InboxPolicy` do Rails.

## 5. Front

- `settings/inboxes` (lista com ícone por canal + busca) e wizard
  `settings/inboxes/new` em 2 passos: escolher canal → configurar (igual Vue).
- Página da inbox: abas `Settings / Agents / Working Hours / Configuration`
  (Website mostra snippet do widget + cores + saudação; API mostra token).
- Banner "fora de horário" na conversa quando `working_hours_enabled` e fechado.

## 6. Aceite

- [ ] Criar inbox Website + API + Email; cada uma gera seu `channel_*`.
- [ ] Agente fora de `inbox_members` não lista a inbox (API + front).
- [ ] Working hours salva 7 dias e o banner de fechado aparece corretamente.
- [ ] Deletar inbox remove canal + membros (cascade).

## 7. Done

Migration + wizard + páginas de settings por canal + testes (policy de membros,
validação por canal).
