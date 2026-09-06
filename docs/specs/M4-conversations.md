# M4 — Conversations & Messages (coração do produto) ⚠️ maior módulo

Depende de: **M1, M2, M3**. Desbloqueia: M5, M6.

## 1. Objetivo

A tela de Conversas 1:1 (lista + thread + detalhes), com todos os status,
atribuição, snooze, prioridade, notas privadas, anexos, participantes e realtime.

## 2. Referência Chatwoot

- `chatwoot/app/models/{conversation,message,attachment,conversation_participant,mention,csat_survey_response}.rb`
- `conversations_controller.rb` (+ `toggle_status`, `assign`, `send_email_transcript`?)
  e `messages_controller.rb` — copiar params e códigos de status
- Vue: `dashboard/routes/dashboard/conversation/` (lista, `ConversationView`,
  `ReplyBox`, `ConversationHeader`, `ContactPanel`)

## 3. DB (`packages/db/src/schema/m4.ts`)

- `conversations (id, account_id, inbox_id, contact_id, contact_inbox_id,
team_id, assignee_id, status 0 open/1 resolved/2 pending/3 snoozed,
priority 0 none/1 low/2 medium/3 high/4 urgent, identifier,
snoozed_until, first_reply_created_at, last_activity_at, waiting_since,
unread_incoming_messages_count, cached_label_list text[],
custom_attributes jsonb, additional_attributes jsonb, created_at, updated_at)`
  - índices `(account_id, status)`, `(assignee_id)`, `(inbox_id)`, `(contact_id)`
- `messages (id, account_id, inbox_id, conversation_id, message_type
0 incoming/1 outgoing/2 activity/3 template, content, content_type,
content_attributes jsonb (in_reply_to, submitted_email...), private boolean,
status 0 sent/1 delivered/2 read/3 failed, source_id, sender_type/id,
created_at, updated_at)` + índice `(conversation_id, created_at)`
- `attachments (id, message_id, account_id, file_type 0 image/1 audio/2 video/3 file,
external_url, extension, fallback_title, meta jsonb)`
- `conversation_participants (conversation_id, user_id)` (seguidores/agentes extras)
- `mentions (conversation_id, user_id, mentioned_by)`
- `csat_survey_responses (conversation_id, contact_id, rating 1-5, feedback_message)`

## 4. API

| Método          | Path                                           | Obs                                                                                                                                                                                                   |
| --------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET             | `/api/v1/accounts/:id/conversations`           | `status, assignee_type (me/unassigned/all), inbox_id, team_id, labels[], q, sortBy (latest_created/created_at_asc/priority/waiting_since), page` + `meta { mine_count, unassigned_count, all_count }` |
| GET             | `/api/v1/accounts/:id/conversations/:conv_id`  | inclui contact, inbox, labels, meta                                                                                                                                                                   |
| POST            | `/.../conversations/:id/toggle_status`         | `{ status }` (+ `snoozed_until` se snoozed) — gera activity message                                                                                                                                   |
| POST            | `/.../conversations/:id/assignments`           | `{ assignee_id }` (0 = remover) — gera activity                                                                                                                                                       |
| POST            | `/.../conversations/:id/team`                  | `{ team_id }`                                                                                                                                                                                         |
| POST            | `/.../conversations/:id/priority`              | `{ priority }`                                                                                                                                                                                        |
| POST            | `/.../conversations/:id/labels`                | `{ labels: [] }`                                                                                                                                                                                      |
| POST            | `/.../conversations/:id/mute` / `unmute`       |                                                                                                                                                                                                       |
| POST            | `/.../conversations/:id/read`                  | zera unread                                                                                                                                                                                           |
| GET/POST        | `/.../conversations/:id/messages`              | POST: `{ content, private, content_attributes, template_params? }`; outgoing exige inbox membro                                                                                                       |
| POST            | `/.../conversations/:id/upload`                | multipart → S3/MinIO → attachment                                                                                                                                                                     |
| GET/POST/DELETE | `/.../conversations/:id/participants`          |                                                                                                                                                                                                       |
| GET             | `/api/v1/accounts/:id/conversations/search?q=` | busca global (usada no M11 também)                                                                                                                                                                    |
| GET             | `/api/v1/accounts/:id/conversations/meta`      | contadores por status/filtro                                                                                                                                                                          |

Cada mutação publica no realtime: `conversation.updated`, `message.created`,
`conversation.read`, `presence` — via `packages/core/realtime`.

## 5. Front (layout 3+1 painéis, idêntico ao Vue)

- `conversations/index` + `conversations/$conversationId` (query espelha filtros).
- **Lista:** busca, chips Open/Pending/Resolved/Snoozed/All, filtros avançados
  (inbox/team/label), sort, cards com avatar, preview, badge inbox, prioridade,
  `waiting since` (amarelo >1h, vermelho >4h), unread count.
- **Header:** nome contato + inbox + `#id` + assign/team/priority/snooze/more.
- **Thread:** bolhas (incoming cinza esq / outgoing azul dir), notas privadas
  amarelas, activity cinza central, anexos (imagem inline, áudio player, arquivo),
  citação `in_reply_to`, auto-scroll, optimistic send, indicador de digitação.
- **ReplyBox:** tabs Responder/Nota privada, `//` canned (M6), emoji, attach,
  gravar áudio (MediaRecorder → upload), templates (WhatsApp, M6+).
- **Details:** tabs Contato (editável) / Conversas anteriores / Ações
  (macros, labels, custom attrs, participantes).

## 6. Aceite

- [ ] Duas abas logadas: enviar mensagem numa reflete na outra < 1s (WS).
- [ ] Status/assign/team/priority/snooze/labels persistem + geram activity message.
- [ ] Filtros (mine/unassigned/all, inbox, team, label, sort) batem com contadores.
- [ ] Anexo imagem/áudio/arquivo sobe e renderiza; áudio gravado funciona.
- [ ] Snooze reabre a conversa após `snoozed_until` (job/verificação).
- [ ] Optimistic send com rollback em erro 422.

## 7. Done

Migration + endpoints + realtime + tela completa + upload S3/MinIO +
testes (filtros, policies inbox-member, activity messages) + screenshots
side-by-side com o Chatwoot.
