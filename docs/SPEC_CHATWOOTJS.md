# ChatwootJS — SPEC 1:1 (Hono + Drizzle + Zod + React + TanStack Router)

> Objetivo: recriar o **Chatwoot open-source 1:1** (funcional + visual) usando stack JS moderna.
> Fonte da verdade funcional/visual: `./chatwoot/` (Rails + Vue) já clonado no repo. Tudo abaixo deve manter **paridade de comportamento, rotas, permissões e layout**.
> Stack fixada por conveniência: **HonoJS (API), Drizzle (ORM/Postgres), Zod (validação), React 19 + TanStack Router + TanStack Query + Tailwind/shadcn, Bun + Turbo**.

Leia este spec de cima para baixo. Cada módulo `M0–M12` é independente para desenvolver com agentes em paralelo (respeitando dependências), com **DB + API + Front + Critérios de aceite**.

---

## 1. Princípios 1:1 (não-negociáveis)

1. **Paridade de API:** expor `POST /api/v1/...` e `/api/v2/...` com mesmos paths/query/body do Chatwoot Rails sempre que viável (facilita portar widget, integrações e testes). Zod schemas devem espelhar os params do Rails.
2. **Paridade de modelo:** tabelas Drizzle com mesmos nomes/colunas/tipos do `chatwoot/db/schema.rb` (snake_case no banco, camelCase só na borda via mapper). Não "reinventar" nomes.
3. **Paridade visual:** dashboard deve ser indistinguível do Chatwoot: sidebar escura estreita (ícones) + sidebar secundária de conta + lista de conversas (3ª coluna) + painel de conversa + painel de detalhes (4ª coluna colapsável). Widget web idêntico (bolha canto inferior direito, `window.chatwootSettings`).
4. **Permissões idênticas:** roles `agent / administrator`, + `super_admin` global. Escopos por `account_users.role`, `inbox_members`, `team_members`. Cada endpoint checa `account_id` da URL.
5. **Realtime idêntico:** Rails usa ActionCable (`/cable`). Aqui: **WebSocket Hono (`/cable`) com protocolo JSON compatível** (`conversation.created/updated`, `message.created`, `presence`, `typing`). Front usa mesmo store mental (TanStack Query + subscription que invalida).
6. **Sem tRPC no domínio Chatwoot:** o `packages/api` com tRPC do Better-T-Stack deve ser **congelado/removido** ou mantido só para `health`. Todo domínio Chatwoot é **Hono REST + `zValidator`**. Motivo: paridade com Chatwoot, webhooks e widget.
7. **i18n:** `pt-BR` + `en` desde o dia 1 (Chatwoot usa i18n em Rails+Vue; aqui `i18next` no web + tabelas sem strings hard-coded).

---

## 2. Arquitetura alvo (monorepo atual)

```
apps/
  server/          # Hono API (Bun). Monta /api/v1, /api/v2, /auth, /cable, /webhooks/*
  web/             # Dashboard React (porta 3001). TanStack Router file-based
  widget/          # NOVO: widget embeddável (React leve, build IIFE) — M5
packages/
  db/              # Drizzle: schema/*, migrations, seed. ÚNICO dono do SQL
  api/             # DEPRECAR tRPC OU transformar em lib de services usados pelo Hono
                   # Recomendado: packages/core (services, policies, jobs) — ver M0
  ui/              # shadcn primitives + WootUI theme (cores, botões, badges)
  config/          # tsconfig base, oxlint/oxfmt
                   # (sem package env: server usa process.env, web usa import.meta.env diretamente)
docs/
  SPEC_CHATWOOTJS.md  # este arquivo
```

### 2.1 Convenções fixas

| Camada   | Convenção                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API      | `apps/server/src/routes/v1/<recurso>.ts` → `new Hono<{Variables:{auth: AuthCtx}}>()`, `zValidator('json'                                                                                                                                                                                                                                                                                                                | 'query' | 'param', schema)`, handler fino → chama `packages/core/services/*`. Resposta `{ payload / meta }` igual Rails (`render json:`). Erros `{ error, attributes }` com status Rails (401/403/404/422). |
| Auth     | Devise Token Auth do Chatwoot → **JWT access (15min) + refresh rotation (30d) + `access-token/client/uid` headers compat** (para widget antigo). bcrypt `password_digest`. Tabelas `users`, `account_users`, `access_tokens`. Middleware `authAccount()` injeta `accountId`, `currentUser`, `role`.                                                                                                                     |
| DB       | Drizzle `pgTable('accounts', {...})` etc. em `packages/db/src/schema/<dominio>.ts`. `drizzle-orm` + `drizzle-kit` migrate. Nunca SQL cru fora de migration. Mapper `toApi()` converte snake→camel só na borda.                                                                                                                                                                                                          |
| Front    | TanStack Router: `apps/web/src/routes/_auth/app/accounts/$accountId/{dashboard,conversations,contacts,reports,campaigns,settings,helpcenter}.tsx`. Data: TanStack Query `queryKey ['account', id, 'conversations', filters]` + `useCable()` hook. Formulários: React Hook Form + Zod resolver. UI: Tailwind + `packages/ui` (shadcn). Tema Woot: sidebar `#1f2937`-like, acento `#1f93ff` (Chatwoot blue), fonte Inter. |
| Jobs     | BullMQ (Redis) para: envio de e-mail/WhatsApp, automações, campanhas, reports rollup, data-import. `packages/core/jobs/*`. Em dev pode ser in-process; interface idêntica.                                                                                                                                                                                                                                              |
| Storage  | ActiveStorage → S3-compatível (MinIO em dev via docker-compose) + tabela `attachments` (id, message_id, file_type, external_url, meta).                                                                                                                                                                                                                                                                                 |
| Realtime | `apps/server/src/cable.ts`: WS `GET /cable?token=...`. Canais `RoomChannel(account_id)`, `PresenceChannel`. Eventos JSON `{ event, data }`. Front `useCable(accountId)` reconecta com backoff.                                                                                                                                                                                                                          |

### 2.2 ENV / Infra (docker-compose.yml estender)

`.env` único na raiz para front + back (`DATABASE_URL`, `CORS_ORIGIN`, `VITE_SERVER_URL`, + futuros `REDIS_URL`, `JWT_SECRET`, `S3_*`). Vite lê via `envDir: <raiz>`; Hono/Drizzle carregam via `process.loadEnvFile(<raiz>/.env)` sem sobrescrever o ambiente (compose vence).

`postgres:16`, `redis:7`, `minio`, `apps/server (3000)`, `apps/web (3001)`. Vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `FRONTEND_URL`, `S3_*`, `WHATSAPP_*` (só M10).

---

## 3. Modelo de dados (Drizzle — espelho do `schema.rb`)

Mapear **todos** estes modelos do `chatwoot/app/models` (não cortar). Ordem de criação = ordem de dependência:

```
M1: users, super_admins, accounts, account_users, access_tokens, user_sessions?, installation_configs, platform_apps?
M2: inboxes, channel_* (channel_web_widget, channel_api, channel_email, channel_facebook_page, channel_instagram, channel_twitter_profile, channel_telegram, channel_whatsapp, channel_sms, channel_line, channel_voice?), inbox_members, working_hours, inbox_assignment_policies, assignment_policies, dashboard_apps
M3: contacts, contact_inboxes, contact_merge? (lógico), labels, custom_attribute_definitions (+ values via jsonb em contacts/conversations), folders?
M4: conversations (+ conversation_parts lógicos), messages, attachments, conversation_participants, mentions, notes (private notes = message.message_type=1? manter igual Rails: message_type 0 incoming/1 outgoing/2 activity/3 template), csat_survey_responses
M6: teams, team_members, canned_responses, macros (+ macro_actions), automation_rules (+ conditions/actions jsonb), custom_filters, webhooks, campaigns, labels (já M3), notification_settings, notification_subscriptions, notifications
M8: reporting_events, reporting_events_rollup
M9: portals, categories, articles, folders, kbase?
M12: data_imports (+ items/errors/mappings), audit? (audited gem → tabela audit_logs própria), agent_bots (+ agent_bot_inboxes), integrations_hooks/integrations (jsonb), email_templates, platform_banners
```

> Regra: cada `pgTable` com `id serial pk`, `account_id fk cascade`, `created_at/updated_at timestamptz`, `additional_attributes jsonb`, `custom_attributes jsonb` onde o Rails tem. Índices iguais (`account_id, status`, `inbox_id`, `contact_id`, `conversation_id`, `identifier` unique por canal).

Referência de checagem: `chatwoot/db/schema.rb` + `chatwoot/app/models/*.rb`. O PR de cada módulo deve listar "tabelas portadas: X/Y".

---

## 4. Mapa funcional 1:1 (o que deve existir no fim)

Portar estes fluxos (nomes iguais ao Rails/Vue):

- **Auth:** sign_up/sign_in/sign_out, reset password, invite agent (`/app/accounts/:id/settings/agents`), OAuth? (só se no OSS), `superadmin` login separado.
- **Onboarding/conta:** criar conta, `account_users`, trocar `account_id` na URL, `availability_status` (online/busy/offline).
- **Caixa de entrada:** lista Conversas com filtros (Mine/Unassigned/All, status open/pending/resolved/snoozed, inbox/team/label, sort latest/created/priority/waiting-longest), busca, `bulk actions` (assign/label/status), `snooze_until`, `priority` (urgent/high/medium/low), `private notes`, `participants/followers`, `typing indicator`, `read/unread`, `merge?` (conversas: não; contatos: sim).
- **Mensagens:** texto, emoji, anexos (imagem/áudio/vídeo/arquivo), áudio gravado, `content_attributes` (in_reply_to, submitted_email), templates WhatsApp/Instagram, `private`, `activity messages` (assigned/status changed), `email` com CC/BCC, citação/resposta.
- **Contatos:** CRUD, `contact_inboxes`, merge, block/mute?, `segments/filters salvos`, import CSV (data_imports), `notes`, `labels`, `custom attributes`, timeline de conversas.
- **Canais/Inboxes:** Website (widget config: greeting, colors, widget bubble), API channel, Email (IMAP/SMTP + encaminhamento), WhatsApp (Cloud API + provider), Facebook/Instagram (OAuth Meta), Telegram (bot token), Twitter/X, SMS (Twilio/Bandwidth), Line, Voice (Team dail? stub). Cada inbox: agentes, teams, working hours, greeting, CSAT, auto-assignment, webhook, digest.
- **Teams:** CRUD + membros + auto-assign round-robin.
- **Roteamento/atribuição:** manual, auto (`assignment_policy`: round_robin / least_busy?), `inbox_assignment_policy`.
- **Automação:** `automation_rules` (event: created/updated + conditions + actions), `macros` (run on conversation), `agent_bots` (Captain stub).
- **Respostas prontas:** `canned_responses` com short_code, search `//`.
- **Campanhas:** `ongoing` (trigger) e `one_off` (bulk WhatsApp/SMS/e-mail), audiência por filtros/labels.
- **Relatórios:** Overview (conversations count, incoming, resolutions, avg first response/resolution, reply time, CSAT), Agent/Team/Inbox/Label breakdown, export CSV. `reporting_events` alimentado por jobs.
- **Central de ajuda:** `portals` (slug, custom domain), `categories`, `articles` (draft/published, wysiwyg), `portal public front` (`/hc/:slug`).
- **Configurações:** conta (name, locale, feature flags), agentes, inboxes, labels, teams, canned, automations, macros, webhooks, integrations (Slack, Linear? via dashboard_apps), custom attributes, working hours/business hours, audit logs (enterprise? manter stub OSS), billing stub.
- **Notificações:** sino, `notification_settings` por tipo, push/email.
- **Apps mobile/API pública:** fora do MVP, mas API REST deve ser compatível.
- **Superadmin:** `/super_admin` (contas, usuários, installation_configs, platform_apps, jobs).

---

## 5. Frontend 1:1 (parecer Chatwoot)

### 5.1 Layout (obrigatório)

```
+--------+-----------+--------------+----------------+-----------+
| icon   | account   | conversation | message thread | details   |
| rail   | sidebar   | list         |                | (contact/ |
| 56px   | 220px     | 320px        | flex-1         | previous/ |
| dark   | light     | light        | white          | actions)  |
+--------+-----------+--------------+----------------+-----------+
```

- **Icon rail (sempre):** logo, Conversas, Contatos, Relatórios, Campanhas, Central de ajuda, Configurações (engrenagem embaixo), sino, avatar/availability. Igual `chatwoot/app/javascript/dashboard/components/layout`.
- **Account sidebar:** seletor de conta, search `⌘K`, menu contextual por seção (ex.: Settings lista: General, Agents, Inboxes, Labels, Teams...).
- **Conversation list:** search, chips de status (Open/Pending/Resolved/Snoozed/All), filtros avançados (saved views `custom_filters`), cards com avatar, preview, badges (inbox icon, priority, unread count, waiting since amarelo/vermelho).
- **Thread:** header (contato + inbox + ID + actions: assign/team/priority/snooze/more), bolhas (incoming cinza esquerda, outgoing azul direita ou branco conforme tema Chatwoot v4), private notes amarelas, activity cinza centralizada, editor rico embaixo com tabs Reply/Private note, canned `//`, emoji, attach, áudio, templates.
- **Details:** tabs Contact / Previous conversations / Actions (macros, labels, custom attributes, participants).
- Tema claro default (Chatwoot light) + dark mode (Chatwoot tem). Fonte Inter, radius 8, `packages/ui` tokens.

### 5.2 Rotas front (TanStack Router, espelhar Vue router)

```
/auth/{login,signup,reset-password,invitation}
/app/accounts/$accountId/
  dashboard (overview home)
  conversations/{index,$id}  (query: status, assignee, inbox, team, label, q, sortBy, conversationType)
  contacts/{index,$id}
  reports/{index,overview,agents,teams,inboxes,labels,csat}
  campaigns/{index,$id}
  helpcenter/portals/{portalSlug}/{categories,articles}
  settings/{general,agents,inboxes/$inboxId,labels,teams,canned,automations,macros,webhooks,integrations,custom-attributes,working-hours,audit-logs}
  notifications
/super-admin/{accounts,users,settings}
/hc/$portalSlug (portal público)
/widget-preview (debug M5)
```

Cada rota: loader valida `accountId` + prefetch Query; `notFound` → redirect dashboard.

---

## 6. Módulos de desenvolvimento (contrato por módulo)

> Formato: `Objetivo → DB → API (Hono+Zod) → Front → Aceite`. Implementar nesta ordem. Cada módulo = 1 PR (ou 1 task de agente).

### M0 — Fundação, limpeza e WootUI (pré-requisito de tudo)

- Remover/congelar tRPC do domínio (manter só `GET /health`); criar `packages/core/{services,policies,jobs,mailers,realtime}` + `apps/server/src/{routes,middlewares,cable}.ts`.
- Drizzle base: `db client`, `migrate`, `seed:minimal` (1 conta demo, 1 admin, 1 inbox website).
- `packages/ui`: tokens Woot (cores Chatwoot, `Button/Badge/Avatar/Tooltip/Dropdown/Sheet/Dialog/Input/Editor`), `Toaster`, `EmptyState`, `WootAvatar`, `StatusBadge`, `PriorityBadge`.
- App shell `_auth` com icon rail + account switcher mockado.
- **Aceite:** `bun dev` sobe web+server+db; `GET /health` 200; seed loga no dashboard mock.

### M1 — Auth, Accounts, Users, Roles

- DB: `users (name,email,password_digest,availability_status,ui_settings jsonb)`, `accounts (name,locale,status,feature_flags jsonb)`, `account_users (user_id,account_id,role 0 agent/1 admin)`, `access_tokens`, `super_admins`, `installation_configs`.
- API: `POST /auth/sign_in|sign_up|sign_out`, `POST /auth/password|reset`, `GET /api/v1/profile`, `GET/PATCH /api/v1/accounts/:id`, `GET/POST/PATCH/DELETE /api/v1/accounts/:id/agents` (invite), `.../account_users`, `PUT /api/v1/profile/availability`.
- Front: `/auth/*`, invite flow, account switcher, settings>general/agents, availability dropdown no avatar.
- **Aceite:** criar conta → convidar agente → login agente vê só contas dele; admin gerencia roles; 403 se trocar `accountId` sem vínculo.

### M2 — Inboxes & Channels (+ working hours)

- DB: `inboxes (account_id,channel_type,channel_id,name,greeting_enabled,csat,working_hours_enabled,auto_assignment,allow_messages_after_resolved)`, `channel_web_widget|channel_api|channel_email|channel_*`, `inbox_members`, `working_hours (day_of_week,open_hour,close_hour,closed_all_day)`, `inbox_assignment_policies`.
- API: `CRUD /api/v1/accounts/:id/inboxes`, `GET /api/v1/inboxes/:id` (tipado por canal), `POST .../inboxes/:id/set_agent_bot?`, `.../inbox_members`, `.../working_hours`, `POST /api/v1/accounts/:id/channels/*` (cada canal com zod próprio: ex. telegram `bot_token`, email `imap/smtp`, whatsapp `phone_number/api_key`).
- Front: settings>inboxes (lista com ícones por canal + wizard "Add inbox" idêntico ao Chatwoot), inbox settings page, agentes/horário/CSAT.
- **Aceite:** criar inbox Website + API + Email stub; working hours bloqueia "fora de horário" (banner); membros limitam visibilidade.

### M3 — Contacts, Labels, Custom Attributes

- DB: `contacts (account_id,name,email,phone,identifier,location,company,avatar_url,blocked?,custom_attributes jsonb,additional_attributes jsonb)`, `contact_inboxes (contact_id,inbox_id,source_id)`, `labels (title,color,description,show_on_sidebar)`, `custom_attribute_definitions (model 0 contact/1 conversation, key,type,values)`.
- API: `CRUD /api/v1/accounts/:id/contacts` (search `q`, filter `labels[]`, sort, page), `POST .../contacts/:id/contact_inboxes`, `POST .../contacts/:id/merge`, `.../contacts/:id/notes?` (via notes/messages activity), `CRUD .../labels`, `CRUD .../custom_attributes`, `POST .../contacts/import` (CSV → data_import job).
- Front: contacts index (tabela + search + labels + import/export), contact drawer (custom attrs editáveis), settings>labels/custom-attributes.
- **Aceite:** criar/buscar/filtrar/merge/import CSV; labels aparecem nas conversas.

### M4 — Conversations & Messages (coração) ⚠️ maior módulo

- DB: `conversations (account_id,inbox_id,contact_id,team_id,assignee_id,status 0 open/1 resolved/2 pending/3 snoozed,priority,identifier,snoozed_until,first_reply_created_at,waiting_since,unread_count,cached_label_list,custom_attributes jsonb,additional_attributes jsonb)`, `messages (conversation_id,account_id,inbox_id,message_type 0 incoming/1 outgoing/2 activity/3 template,content,content_type,content_attributes jsonb,private,sender_*,source_id,status)`, `attachments`, `conversation_participants`, `mentions`, `csat_survey_responses`.
- API: `GET /api/v1/accounts/:id/conversations` (filtros: `status, assignee_type(me/unassigned/all), inbox_id, team_id, labels[], q, sortBy, page, conversation_type`), `GET .../conversations/:id`, `POST .../conversations/:id/toggle_status|assign|team|priority|snooze|mute|unread|read|reply?` (espelhar `conversations_controller.rb`), `GET/POST .../conversations/:id/messages`, `DELETE .../messages/:id?` (só activity/privada conforme Rails), `POST .../upload` (attachments), `.../participants`, `.../labels`.
- Realtime: publicar `conversation.updated/message.created` no `/cable`.
- Front: página Conversations 3-painéis completa (lista + thread + details), editor (reply/private note, canned `//`, emoji, attach, gravar áudio), actions header, snooze dialog, typing indicator, auto-scroll, optimistic send.
- **Aceite:** abrir conversa → enviar mensagem como agente → aparece realtime em 2 abas; trocar status/assign/priority/snooze persiste + gera activity message; anexos sobem para MinIO/S3.

### M5 — Widget Website + Channel API

- Novo `apps/widget` (build `widget.js` IIFE < 200kb): bolha, `window.chatwootSettings {websiteToken, locale, position, launcherTitle}`, pré-chat form, thread, unread badge, som, persist `contact/session` em localStorage, polling/WS.
- API pública: `POST /public/api/v1/widgets/...` (config, contact, conversation, messages, set_user) idêntica ao `chatwoot/app/controllers/api/v1/widget/*` + `POST /api/v1/accounts/:id/api_channel/...`.
- Front dashboard: preview + code snippet (`settings>inboxes>website>configuration`).
- **Aceite:** embedar snippet em HTML estático → abrir conversa no dashboard M4 realtime; refresh mantém sessão.

### M6 — Teams, Assignment, Canned, Macros, Automations, Webhooks

- DB: `teams, team_members, canned_responses (short_code,content), macros (actions jsonb,visibility), automation_rules (event_name,conditions jsonb,actions jsonb,active)`, `webhooks (url,subscriptions[])`.
- API: CRUD teams/canned/macros/automations/webhooks + `POST .../macros/:id/execute`, automation executor (job on conversation.created/updated/message.created).
- Front: settings pages + macros dropdown no thread + automations builder (condições/ações igual Vue) + `//` autocomplete.
- **Aceite:** regra "novo ticket urgente → assign team X + label Y + webhook dispara"; macro aplica tudo de 1 clique; `//atalho` insere canned.

### M7 — Campaigns

- DB: `campaigns (inbox_id,title,message,trigger_rules jsonb,campaign_type 0 ongoing/1 one_off,campaign_status,scheduled_at,audience jsonb)`.
- API: CRUD + `POST .../campaigns/:id/trigger` (one_off dispara job por audience).
- Front: campaigns index + builder (audience preview igual Chatwoot).
- **Aceite:** campanha one_off para contatos com label → mensagens chegam (M4/M5).

### M8 — Reports & CSAT

- DB: `reporting_events (account_id,conversation_id,inbox_id,team_id,user_id,label,name,value,event_start_time,event_end_time)`, `reporting_events_rollup` (job horário).
- API: `GET /api/v1/accounts/:id/reports/{summary,agents,teams,inboxes,labels,overview}` (`since,until,timezone_offset,group_by`), `GET .../csat`, `POST .../conversations/:id/csat` + survey via widget/e-mail.
- Front: reports pages com mesmos KPI cards + gráficos (Recharts) + export CSV.
- **Aceite:** números batem com seed (criar 50 conversas fake → summary coerente); CSAT enviado pelo widget aparece.

### M9 — Help Center / Knowledge Base

- DB: `portals (account_id,name,slug,color,homepage_link,page_title,header_text)`, `categories (portal_id,locale,name,slug,position)`, `articles (portal_id,category_id,title,content,status,views,author_id,slug)`, `folders?`.
- API: `CRUD /api/v1/accounts/:id/portals/.../categories/.../articles` + público `GET /hc/api/:portalSlug/...`.
- Front: settings/helpcenter editor (lexical/tiptap) + público `/hc/$portalSlug` idêntico ao portal Chatwoot.
- **Aceite:** publicar artigo → acessível sem login no portal público.

### M10 — Canais externos (Meta/Telegram/Twitter/Email/WhatsApp/SMS/Line/Voice)

- Um submódulo por canal, todos atrás da interface `ChannelProvider {send(message), webhookHandler}` em `packages/core/channels/*`.
- Webhooks: `POST /webhooks/{whatsapp,facebook,instagram,telegram,twitter,sms,line,email}` com verificação (hub.challenge etc.) + enfileirar inbound → M4.
- Front: wizard OAuth/token por canal (espelhar Vue).
- Ordem sugerida: Email → Telegram → WhatsApp Cloud → Facebook/Instagram → Twitter → SMS → Line → Voice(stub).
- **Aceite por canal:** receber mensagem externa → cria contact_inbox+conversa; responder no dashboard → chega no app externo.

### M11 — Notifications, Presence, Search global, Filtros salvos

- DB: `notifications, notification_settings, notification_subscriptions, custom_filters (name,query jsonb,visibility)`.
- API: `GET /api/v1/notifications`, `.../notification_settings`, `.../custom_filters` + WS presence/typing.
- Front: sino, `⌘K` search global (conversas+contatos+artigos), saved views na lista.
- **Aceite:** menção/assign gera notificação realtime; filtro salvo reabre mesma query.

### M12 — Superadmin, Audit, Imports, AgentBots/Captain(stub), Polimento 1:1

- `GET /super_admin/*` (contas, users, configs), `audit_logs`, `data_imports` UI, `agent_bots` CRUD + Captain stub (responder via LLM opcional, flag).
- QA 1:1: comparar cada página com `chatwoot/` lado a lado (checklist visual), cobrir testes: Vitest (unit) + Playwright (e2e conversa ponta-a-ponta) + `bun run check-types`.
- **Aceite final:** rodar `docker compose up` → seed → login → widget → conversa → relatório sem erro; Lighthouse ok; README com demo.

---

## 7. Ordem de execução recomendada (com dependências)

```
M0 → M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9 → M10 → M11 → M12
              (M2 e M3 podem rodar em paralelo após M1; M7/M8/M9 em paralelo após M6)
```

Cada módulo entrega: migration Drizzle + seed + rotas Hono + testes de API + tela(s). Não iniciar M4 sem M1–M3 merged.

---

## 8. Padrão de código (para agentes)

**Backend (Hono):**

```ts
// apps/server/src/routes/v1/conversations.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { ConversationQuerySchema, AssignBodySchema } from "@chatwootjs/core/schemas";
import { listConversations, assignConversation } from "@chatwootjs/core/services/conversations";
import { authAccount } from "../../middlewares/auth";
const app = new Hono().use(authAccount);
app.get("/", zValidator("query", ConversationQuerySchema), async (c) => {
  const q = c.req.valid("query");
  const { accountId } = c.var.auth;
  const { data, meta } = await listConversations(accountId, q);
  return c.json({ data: data.map(toApiConversation), meta });
});
export default app;
```

**Drizzle:**

```ts
// packages/db/src/schema/conversations.ts
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  status: integer("status").notNull().default(0),
  // ... espelhar schema.rb
});
```

**Front (TanStack Router + Query):**

```tsx
// apps/web/src/routes/_auth/app/accounts/$accountId/conversations.$conversationId.tsx
export const Route = createFileRoute("...")({
  loader: ({ params }) => prefetchConversation(params.conversationId),
  component: ConversationPage, // <ConversationList/> + <Thread/> + <DetailsPanel/>
});
```

---

## 9. Critérios visuais (front "parecido com Chatwoot")

- Copiar espaçamentos/cores do `chatwoot/app/javascript/dashboard/assets/scss` e `WootUI`: rail `#1F2937`, fundo `#F9FAFB`, cards brancos `rounded-lg border`, azul `#1F93FF` para outgoing/primário.
- Ícones Lucide com mesmos nomes semânticos (inbox, users, bar-chart, megaphone, book, settings, bell).
- Tabelas com mesma coluna/ordem; dialogs/sheets com mesmos títulos/botões (em pt-BR/en).
- Validação: screenshot side-by-side com Chatwoot original anexado no PR de cada módulo.

---

## 10. O que NÃO fazer

- Não trocar Postgres por SQLite; não trocar Drizzle por Prisma; não reintroduzir tRPC no domínio; não renomear `account_id/inbox_id` para camel no banco; não criar design system próprio (usar Woot tokens).
- Não pular M0 (shell + theme) — front sem shell diverge visualmente e dá retrabalho.

---

## 11. Próximo passo imediato

1. Executar **M0** (criar `packages/core`, congelar tRPC, theme Woot, seed).
2. Depois **M1** (auth real) — a partir daí o dashboard deixa de ser mock.
3. Usar `chatwoot/` como referência viva: cada PR cita `chatwoot/app/{models,controllers}/<arquivo>.rb` + `chatwoot/app/javascript/dashboard/routes/dashboard/<pasta>` portados.

_Spec versionada: v1 — stack Hono/Drizzle/Zod/React+TRouter. Ajustar só por ADR em `docs/`._
