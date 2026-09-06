# M5 — Widget Website + Channel API

Depende de: **M4** (usa conversas/mensagens). Desbloqueia: M7 (campanhas no widget).

## 1. Objetivo

Widget embeddável idêntico ao Chatwoot (`window.chatwootSettings`) + novo
`apps/widget`, e Channel API para integrações customizadas.

## 2. Referência Chatwoot

- `chatwoot/app/controllers/api/v1/widget/{configs,contacts,conversations,messages}.rb`
- `chatwoot/app/javascript/widget/` (bolha, `WidgetView`,UnreadBadge, som, pre-chat)
- `chatwoot/public/widget/chatwoot.js` (loader) + snippet em
  `settings/inboxes/.../configuration`

## 3. DB

Reusa M2/M3/M4 (`channel_web_widgets`, `contact_inboxes` com `pubsub_token`,
`channel_api`). Adicionar se faltar:

- `channel_api_inboxes?` — não; Channel API usa `inboxes` com `channel_api`.

## 4. API pública (sem auth de agente — `website_token` / `identifier`)

Base: `/public/api/v1/widgets` (paths iguais ao Rails):

| Método   | Path                                                | Obs                                                              |
| -------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| GET      | `/public/api/v1/widgets/config?website_token=`      | cores, saudação, greeting, CSAT, pre-chat                        |
| POST     | `/public/api/v1/widgets/contact?website_token=`     | upsert por `identifier/email` → `contact_inbox` + `pubsub_token` |
| POST     | `/public/api/v1/widgets/contact/update`             | `custom_attributes`                                              |
| GET/POST | `/public/api/v1/widgets/conversations`              | lista/cria (`contact_token`)                                     |
| GET/POST | `/public/api/v1/widgets/conversations/:id/messages` | thread/envio (`contact_token`)                                   |
| PUT      | `/public/api/v1/widgets/conversations/:id/read`     | marca lida                                                       |
| POST     | `/public/api/v1/widgets/csat`                       | resposta CSAT (liga M8)                                          |
| POST     | `/api/v1/accounts/:id/api_channel/conversations`    | Channel API autenticada (HMAC/bearer)                            |

Rate-limit por IP + validação de `website_token` em todas.

## 5. Front — `apps/widget` (NOVO)

- Build IIFE `widget.js` (< 200kb gzip) + loader `snippet.js`; preview em
  `/widget-preview` no dashboard.
- Bolha canto inferior direito (posição/cor do `website_token`), launcher com
  unread badge + som, janela: home (greeting), pré-chat form (se ativo),
  thread (bolhas iguais ao dashboard), indicador "agente digitando" via WS/polling.
- Sessão em `localStorage` (`cw_<token>: contact_token, conversation_id`);
  `window.chatwootSettings = { websiteToken, locale, position, launcherTitle,
hideMessageBubble, ... }` e `window.$chatwoot.setUser/reset` compatíveis.
- Dashboard: `settings/inboxes/:id>configuration` com snippet + cores + preview.

## 6. Aceite

- [ ] Colar snippet em HTML estático → widget abre, pré-chat cria contato,
      mensagem aparece no dashboard (M4) em realtime e resposta volta ao widget.
- [ ] Refresh mantém sessão; `setUser(identifier)` vincula contato existente.
- [ ] `hideMessageBubble`, `position`, `locale` do settings respeitados.
- [ ] Channel API: criar conversa + enviar mensagem com token da inbox API.

## 7. Done

`apps/widget` + API pública + snippet/settings + testes (fluxo anon→contato→conversa)

- página de preview no dashboard.
