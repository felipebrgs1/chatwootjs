# M11 — Notifications, Presence, Busca global, Filtros salvos

Depende de: **M4** (eventos), **M1** (usuários).

## 1. Objetivo

Sino de notificações funcional, presença/digitação realtime, `⌘K` global
e views salvas na lista de conversas.

## 2. Referência Chatwoot

- Models: `notification, notification_setting, notification_subscription,
custom_filter`
- `notifications_controller.rb`, `notification_settings_controller.rb`,
  `custom_filters_controller.rb`
- Vue: `NotificationBell`, `availability` presence via ActionCable,
  `SearchModal (⌘K)`, `CustomViews` na sidebar de conversas

## 3. DB

- `notifications (id, account_id, user_id, notificable_type/id, notification_type
(assigned_conversation/new_message/participating...), read_at, snoozed_until,
created_at)` + índice `(user_id, read_at)`
- `notification_settings (user_id, account_id, email_flags jsonb,
push_flags jsonb, flags jsonb)` — preferências por tipo
- `notification_subscriptions (user_id, account_id, identifier, subscription_type)`
  (push subscriptions)
- `custom_filters (id, account_id, user_id, name, model_type, query jsonb,
visibility)` — views salvas

Emissores: assign/mention/nova mensagem em conversa participada → cria
notification + publica `notification.created` no `/cable` (respeita settings).

## 4. API

| Método  | Path                                                   | Obs                                            |
| ------- | ------------------------------------------------------ | ---------------------------------------------- |
| GET     | `/api/v1/notifications`                                | paginado, `?read=false`, inclui unread_count   |
| POST    | `/api/v1/notifications/read_all`                       |                                                |
| POST    | `/api/v1/notifications/:id/read` / `unread` / `snooze` |                                                |
| GET/PUT | `/api/v1/accounts/:id/notification_settings`           | flags por tipo                                 |
| CRUD    | `/api/v1/accounts/:id/custom_filters`                  | salva query da lista (filtros M4 serializados) |

Realtime (`/cable`): `presence.update` (online/busy/offline por agente,
heartbeat 30s), `typing.on/off` (por conversa+usuário/contato), já consumidos
pelo M4/M5 — aqui entra o server-side + lista "quem está online".

## 5. Front

- Sino no rail com badge + dropdown (lista, marcar lidas, snooze) + página
  `/notifications`.
- `⌘K`: busca unificada (conversas + contatos + artigos M9 + canned M6),
  usando `conversations/search` + endpoints de cada domínio.
- Sidebar da lista de conversas: seção "Views" (custom_filters, criar a partir
  dos filtros atuais, renomear/deletar).

## 6. Aceite

- [ ] Assign/menção gera notificação realtime (< 2s) e badge incrementa;
      respeita `notification_settings` desligado.
- [ ] Presença do agente atualiza para outros agentes; typing aparece no
      thread (M4) e no widget (M5).
- [ ] `⌘K` retorna resultados dos 4 domínios com navegação por teclado.
- [ ] View salva reabre exatamente os mesmos filtros/contadores.

## 7. Done

Migration + emissores + sino + `⌘K` + views + testes (emissão por evento,
settings on/off, serialização de filtros).
