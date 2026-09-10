# 14 — E-mail, Jobs & Realtime (infra)

> **Estágio:** 14/15 · **Status:** 0 de 6 subáreas verdes (4 🟡 e 2 ❌ — runner/WS/storage parciais; mailers e observabilidade ausentes) · **Depende de:** transversal (consome 02, 04, 07, 11, 12)
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`)
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

Este módulo é a infraestrutura transversal do produto: **fila/jobs**,
**e-mails transacionais**, **ActionCable multi-réplica** e **storage de
anexos**. O alvo não é tela nova: é tudo que o Rails faz "por baixo" continuar
funcionando igual quando o ChatwootJS atende 2 réplicas sem Sidekiq.

100% quando:

1. **Jobs:** todo gatilho assíncrono do Rails (`chatwoot/app/jobs/**`) tem
   handler nosso com o mesmo efeito e idempotência; toda recorrência de
   `chatwoot/config/schedule.yml` roda como job repetível (BullMQ) com
   `REDIS_URL` e in-process sem ele; falha tem retry (3 tentativas/backoff) e log.
2. **Mailers:** todo e-mail transacional OSS — confirmação/convite, reset de
   senha, transcript, notificação de agente, admin (import/export/desconexão),
   time/portal — sai por SMTP configurável (`SMTP_*`, espelho de
   `config/initializers/mailer.rb`), com o layout `layouts/mailer/base.liquid`
   e links `FRONTEND_URL`; envio é assíncrono (`deliverLater`) e verificado com
   SMTP fake/MailHog.
3. **Realtime:** `/cable` fala o protocolo do ActionCable (identifier
   `RoomChannel` com `pubsub_token`/`user_id`/`account_id`, frames `welcome`,
   `confirm_subscription`, `ping`) e entrega os eventos de `Events::Types`;
   com 2 réplicas + pub/sub Redis, evento publicado na réplica A chega ao
   socket da réplica B; presença/typing compartilhados.
4. **Storage:** disco local e S3-compatível, direct uploads (conversa e
   widget) e anexos **ActiveStorage importados de dump** servíveis por URL.
5. **Observabilidade mínima:** cada job loga nome, id, tentativa, duração e
   status; erro loga stack. Sem dashboard de filas (Sidekiq Web fica fora).

**Não conta como 100%:** e-mail que só faz `console.log`; job que depende de
`setInterval` local e duplica com 2 réplicas; WS que só funciona com 1
instância; anexo importado sem URL; `S3_BUCKET` sem direct upload.

> Nota: o `parity-report` só mede controllers × rotas; jobs/mailers/realtime/
> storage não têm área própria. A prova deste módulo é o aceite local (§6) +
> atualização do status no `roadmap.md`.

## 2. Estado atual (medido)

| Subárea                 | Status | Evidência no nosso repo                                                                                                                                                             | Lacuna principal                                                                                                                                                                    |
| ----------------------- | :----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runner/fila             |   🟡   | `packages/core/src/jobs/index.ts` (`InProcessRunner` + BullMQ quando `REDIS_URL`, `initJobs`); 13 registros no boot de `apps/server/src/index.ts`                                   | sem opções por job (fila/prioridade/delay), sem repeatable nativo; recorrências em `setInterval`                                                                                    |
| Cobertura de jobs       |   🟡   | 6 handlers `jobs.on` (`import.contacts`, `macro.execute`, `webhook.deliver`, `campaign.oneoff`, `email:poll-inbox`, `channel:send`) + listeners de automação/reporting/notificação  | Rails tem **98 arquivos de job** (`find chatwoot/app/jobs -name '*.rb'`); faltam ~1/3 das categorias: e-mail, export, templates sync, resolução, avatares, IP lookup, bulk/limpezas |
| Mailers transacionais   |   ❌   | `services/auth.ts:172` e `:328` só fazem `console.log` do token; `channels/smtp.ts` envia apenas resposta de `Channel::Email`; `nodemailer` já é dep (`packages/core/package.json`) | zero e-mail de plataforma (confirmação/convite, reset, transcript, notificação, admin/team/portal)                                                                                  |
| Realtime/ActionCable    |   🟡   | `apps/server/src/cable.ts`, `realtime/index.ts`, `realtime/presence.ts`, `apps/web/src/hooks/useCable.ts`                                                                           | bus in-process (2 réplicas não compartilham); auth só JWT; sem ping; presença in-memory; eventos faltando                                                                           |
| Storage                 |   🟡   | `lib/storage.ts` (local + S3), `GET /uploads/*` e upload em `apps/server/src/index.ts`/`services/messages.ts`                                                                       | sem direct uploads; `active_storage_*` importado não é servido; sem purge de objeto                                                                                                 |
| Observabilidade de jobs |   ❌   | handlers só usam `console.error` (ex.: `jobs/automation.ts:19`, `services/webhooks.ts:207`)                                                                                         | sem log de início/fim/duração/tentativa/falha                                                                                                                                       |

**Leitura da medição:** a base existe (runner, bus, storage local/S3, upload
multipart, 10 jobs de domínio funcionando e usados pelo e2e), mas os dois
eixos que destravam outros módulos estão vazios: **e-mail** (nenhum envio de
plataforma) e **multi-réplica** (bus e presença em memória). Jobs que o nosso
código executa inline e o Rails executa por job (atribuição, menções,
atividade, ingestão de webhook) podem continuar inline enquanto não houver
requisito de latência — o critério é não bloquear request longo nem duplicar
com 2 réplicas. DDL de apoio já existe: `active_storage_*`, `attachments`,
`notifications`, `access_tokens` e `data_imports` (trilha D) — nada de schema
novo.

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                                                     | O que dita para nós                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `app/jobs/**` (catálogo de ~100 jobs)                                                                                                                           | gatilho, fila e efeito de cada job assíncrono                                     |
| `app/mailers/**` + `app/views/mailers/**` + `app/views/layouts/mailer/base.liquid`                                                                              | mailers, templates e layout HTML                                                  |
| `app/views/devise/mailer/{confirmation,reset_password}_instructions.html.erb` + `app/builders/agent_builder.rb:34`                                              | confirmação e convite (convite = confirmação com link de senha)                   |
| `config/initializers/mailer.rb` + `config/initializers/devise.rb`                                                                                               | `SMTP_*`, `MAILER_SENDER_EMAIL`, `FRONTEND_URL`                                   |
| `config/sidekiq.yml` + `config/schedule.yml`                                                                                                                    | filas (`critical`…`mailers`…) e crons recorrentes                                 |
| `config/cable.yml` + `app/channels/room_channel.rb` + `lib/events/types.rb`                                                                                     | adapter Redis, stream por `pubsub_token`/`account_#`, presença e nomes de eventos |
| `config/storage.yml` + `app/models/attachment.rb` + `api/v1/accounts/conversations/direct_uploads_controller.rb` + `api/v1/widget/direct_uploads_controller.rb` | disk/S3, direct uploads e URL de blob                                             |
| `db/schema.rb` (`active_storage_*`, `attachments`)                                                                                                              | dados (DDL já fechado na trilha D — não alterar)                                  |
| `config/routes.rb` (`mount Sidekiq::Web => '/monitoring/sidekiq'`)                                                                                              | fora: não recriar dashboard de filas                                              |

## 4. Lacunas detalhadas

### 4.1 API

- [ ] `POST /api/v1/accounts/:account_id/conversations/:conversation_id/transcript` — Rails `Api::V1::Accounts::ConversationsController#transcript` (`config/routes.rb:183`) — param `email`; `200` com corpo vazio; `422 {error:'email param missing'}` sem e-mail; `429` fora do rate limit; enfileira `ConversationReplyMailer.conversation_transcript`. Implementar em `apps/server/src/routes/v1/conversations.ts` + `packages/core/src/services/conversations.ts`.
- [ ] `POST /api/v1/accounts/:account_id/conversations/:conversation_id/direct_uploads` — Rails `Conversations::DirectUploadsController < ActiveStorage::DirectUploadsController` (`routes.rb:177`) — body ActiveStorage (`{ blob: { filename, byte_size, checksum, content_type } }`) → `{ direct_upload: { url, headers }, attachable: { sgid } }` (**verificar** o formato exato do ActiveStorage no pino) — implementar rota + `storage().presignPut` (ver §5).
- [ ] `POST /api/v1/widget/direct_uploads` — Rails `Api::V1::Widget::DirectUploadsController` (`routes.rb:493`), auth por `website_token` — **cross-ref módulo 09**.
- [ ] `GET /rails/active_storage/blobs/redirect/:signed_id/:filename` (rota do engine ActiveStorage; **verificar** o formato do `signed_id` no pino) — serve `active_storage_blobs` importados (disco/S3) — hoje `toApiMessage` só devolve `external_url` (`services/messages.ts:90`) e anexo importado fica sem URL.
- [ ] **Verificar** no pino `email_transcript_enabled?`/`within_email_rate_limit?`: no OSS self-hosted o rate limit é sempre `true` (só `chatwoot_cloud?` limita); manter 200 sem gate de plano.

### 4.2 Front

- [ ] `auth/confirmation` — rota não existe em `apps/web/src/routes/auth/` (só `invitation`, `login`, `reset-password`, `signup`); o e-mail de confirmação aponta para `frontend_url('auth/confirmation', confirmation_token: ...)`; criar página + endpoint de confirmação real (hoje não há e-mail nem rota) — sem ela o link dá 404.
- [ ] Transcript no painel de detalhes — não há UI (Rails: modal com input de e-mail que chama `POST .../transcript`) — cross-ref módulo 02.
- [ ] Direct upload no composer com progresso — cross-ref módulo 02; widget idem módulo 09.
- [ ] Flags de e-mail/push por tipo na tela de notificações — cross-ref módulo 11 (hoje `apps/web/src/lib/notifications.ts` só lê `email_flags` da API).

### 4.3 Dados, jobs e realtime (quando aplicável)

**Jobs e fila**

- [ ] Recorrências: espelhar `config/schedule.yml` (trigger diário/horário/5min, IMAP 1min, atribuição periódica 30min, notificações antigas, limpezas) num agendador; hoje cada serviço registra seu próprio `setInterval` (`channels/email-poller.ts:59`, `services/conversations.ts:765`, `services/automation.ts:613`, `services/reporting.ts:672`) — com 2 réplicas o cron duplica.
- [ ] Opções por job (fila/prioridade/`delay`/`attempts`) espelhando `config/sidekiq.yml`; hoje `DEFAULT_JOB_OPTS` é global (`jobs/index.ts:51`) e o worker tem `concurrency: 5` numa única fila.
- [ ] Catálogo ainda ausente: `ConversationReplyEmailJob`, `Notification::EmailNotificationJob`, `Account::ContactsExportJob`, `Account::ConversationsResolutionSchedulerJob`, `Conversations::ResolutionJob`, `Conversations::UpdateMessageStatusJob`, `Notification::ReopenSnoozedNotificationsJob`/`RemoveOldNotificationJob`, `Avatar::*`, `ContactIpLookupJob`/`UserSessionIpLookupJob`, `BulkActionsJob`/`Contacts::BulkActionJob`, `DeleteObjectJob`, `Channels::WhatsApp::TemplatesSync*`/`HealthSync*`, `Channels::Twilio::TemplatesSyncJob`, `Inboxes::FetchImapEmailInboxesJob` (checagens `suspended?`/`reauthorization_required?`), `Inboxes::SyncWidgetPreChatCustomFieldsJob`/`UpdateWidgetPreChatCustomFieldsJob`, `Companies::FetchAvatarsJob`, `Account::BrandingEnrichmentJob`, `Conversations::ActivityMessageJob`, `Conversations::UserMentionJob`, `DataImports::{Intercom,Freshdesk}::*`, `Webhooks::{Facebook,Instagram,WhatsApp,Twilio,Telegram,Line,TikTok,Sms}EventsJob`, `EventDispatcherJob`, `Internal::*` de limpeza/seed, `Labels::*` (migração one-off pode ficar de fora — ver §7).

Mapeamento de filas (nomes internos; nenhuma API exposta) — **verificar**
prioridades e concorrência no pino:

| Fila do Rails (`sidekiq.yml`) | Usar no BullMQ para                                    |
| ----------------------------- | ------------------------------------------------------ |
| `critical`                    | `channel:send` e eventos de conversa/WS                |
| `high`                        | automações e atribuição                                |
| `mailers`                     | `mail.deliver` (notificação, transcript, reply)        |
| `scheduled_jobs`              | crons do agendador (14-2)                              |
| `low`                         | import/export, sync de templates, resoluções e limpeza |
| `default`                     | demais jobs de domínio                                 |

- [ ] `import.contacts` recebe as linhas no payload (`services/contacts.ts:846`) sem `data_imports.import_file`/storage; `DataImportJob` do Rails lê o arquivo anexado (ActiveStorage) e gera `failed_records` CSV.
- [ ] Rate limit de e-mail (`AccountEmailRateLimitable`): contador diário para transcript/notificações antes do envio (`Redis`, fallback memória) — **verificar** semântica self-hosted (sem limite).
- [ ] Idempotência/retry: garantir que reexecução após crash não duplica (webhook, import, e-mail poller — este já marca `\Seen`).

**Mailers**

- [ ] Transporte de plataforma com `SMTP_ADDRESS`, `SMTP_PORT`, `SMTP_AUTHENTICATION`, `SMTP_DOMAIN`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_SSL`, `SMTP_TLS`, `SMTP_ENABLE_STARTTLS_AUTO`, `SMTP_OPENSSL_VERIFY_MODE`, `MAILER_SENDER_EMAIL`, `FRONTEND_URL` (Rails `initializers/mailer.rb`); `channels/smtp.ts` cobre só o canal `Channel::Email`.
- [ ] Layout + templates: portar `layouts/mailer/base.liquid` e os templates de `conversation_reply_mailer` (4), `agent_notifications` (5), `administrator_notifications` (15: 1 compliance + 6 account + 5 channel + 3 integrations), `team_notifications` (3) e `portal_instructions_mailer` (1); textos em inglês do Rails (i18n fora).
- [ ] Gatilhos mudos: `services/auth.ts:172`/`:328` só logam token; convite do Rails é o e-mail de confirmação (`agent_builder.rb:34`) com link de reset para usuário convidado.
- [ ] `notify()` (`services/notifications.ts:330`) cria a linha e publica no bus, mas nunca enfileira e-mail; falta job que recheca `read_at`, usuário confirmado, `email_flags` e rate limit.
- [ ] **Verificar** "digest": no pino OSS não há mailer de digest; cada notificação vira um e-mail imediato (o "digest" do R0 é isso). CSAT também não tem mailer próprio: o link vai no `reply_with_summary` para mensagem `input_csat`.

**Realtime**

- [ ] Bus in-process (`realtime/index.ts:23`): `publish()` não cruza processos — com 2 réplicas cada socket só recebe o que a própria réplica publicou.
- [ ] Presença in-memory com TTL 90s (`realtime/presence.ts`), payload de um único usuário; Rails transmite `{account_id, users, contacts}` a cada ~20s (`room_channel.rb#broadcast_presence`) e `update_presence`.
- [ ] `/cable` autentica só `?token=<jwt>` (`cable.ts:46`); Rails usa `pubsub_token` + `user_id`/`account_id` (agente) e só `pubsub_token` (contato/widget); falta frame `ping` (~3s) e tolerância a resubscribe.
- [ ] Nomes/eventos divergentes: nosso bus usa `typing.on/off` e `conversation.updated`; Rails usa `conversation.typing_on/off`, `conversation.status_changed`, `message.updated`, `notification.deleted/updated`, `contact.updated`, `conversation.mentioned` (`lib/events/types.rb`); front só escuta os nomes antigos (`ConversationsPage.tsx:216`).
- [ ] Reconexão: `useCable.ts` tem backoff, mas não ressincroniza presença/unread ao re-subscribir.

**Storage**

- [ ] Direct uploads ausentes (`grep direct_upload` = 0); hoje só multipart `POST .../conversations/:id/upload` (`services/messages.ts:276`).
- [ ] `active_storage_attachments/blobs` existem no schema (D2) e nada as lê; import de dump não serve anexo (`toApiMessage` usa só `external_url`).
- [ ] Sem `DeleteObjectJob`: remover mensagem/anexo não apaga objeto no storage.

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                                                                                                                                                                                       | Arquivos-alvo                                                                                              | Depende     |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------- |
| 14-1  | Runner com opções por job (`queue`/`priority`/`delay`/`attempts`) e `jobs.on(name, handler, opts)`; in-process mantém fallback; BullMQ usa filas nomeadas com prioridade                                                                                                     | `packages/core/src/jobs/index.ts`                                                                          | —           |
| 14-2  | Agendador: tabela estática de crons (espelho de `schedule.yml`) + repeatable BullMQ (`repeat.pattern`) com `REDIS_URL`; sem Redis mantém `setInterval`                                                                                                                       | `packages/core/src/jobs/scheduler.ts`, `apps/server/src/index.ts`                                          | 14-1        |
| 14-3  | Migrar recorrências atuais para o agendador (email poller, snooze, automation sweep, reporting rollup) removendo `setInterval` duplicado; com 2 réplicas o cron roda uma vez                                                                                                 | `channels/email-poller.ts`, `services/{conversations,automation,reporting}.ts`                             | 14-2        |
| 14-4  | Observabilidade: wrapper de log `[jobs] name= id= attempt= duration_ms= status=` + stack em erro; expor em `/health` o runner ativo (`in-process`/`bullmq`)                                                                                                                  | `jobs/index.ts`, `apps/server/src/index.ts`                                                                | 14-1        |
| 14-5  | Transporte de e-mail: `MAIL_TRANSPORT=smtp\|fake`, SMTP_* do Rails, remetente `MAILER_SENDER_EMAIL`, `FRONTEND_URL`; fake grava `.eml`/JSON em `tmp/mail` (compatível com MailHog)                                                                                           | `packages/core/src/mail/transport.ts`, `.env.example`                                                      | —           |
| 14-6  | Mailer ActionMailer-ish: `mailer(template, payload).deliver()/.deliverLater()`, job `mail.deliver`, layout base 1:1 e catálogo de templates                                                                                                                                  | `packages/core/src/mail/{mailer,layout,templates}.ts`, `jobs/index.ts`                                     | 14-5        |
| 14-7  | E-mails de auth: confirmação (signup, troca de e-mail e convite) e reset; remover `console.log`; rotas `/auth/*` enfileiram `deliverLater`                                                                                                                                   | `services/auth.ts`, `apps/server/src/routes/auth.ts`, `mail/templates/auth.ts`                             | 14-6        |
| 14-8  | E-mail de notificação de agente: `notify()` enfileira conforme `email_flags`; handler recheca `read_at`/`confirmed_at`/rate limit; templates `conversation_creation`, `conversation_assignment`, `conversation_mention`, `assigned_/participating_conversation_new_message`  | `services/notifications.ts`, `mail/templates/agent.ts`                                                     | 14-6, 11    |
| 14-9  | Transcript: `POST .../conversations/:id/transcript` + job/mailer `conversation_transcript` (mensagens transcriptable, reply-to, 422/429) e link CSAT no `reply_with_summary`                                                                                                 | `routes/v1/conversations.ts`, `services/conversations.ts`, `mail/templates/transcript.ts`                  | 14-6        |
| 14-10 | Resposta por e-mail do canal Email: job `conversation_reply_email` (reply sem resumo/summary), headers `Message-ID`/`In-Reply-To`/`References`, CC/BCC, anexos (grandes como link, pequenos anexados)                                                                        | `channels/{smtp,outbound}.ts`, `mail/templates/reply.ts`                                                   | 14-6, 04    |
| 14-11 | E-mails de admin/team/portal: import completo/falhou, export completo, automação desabilitada, notificação de time, desconexão de canal/integração, CNAME do portal; chamar nos jobs/serviços                                                                                | `mail/templates/{admin,team,portal}.ts`, `services/{contacts,automation}.ts`                               | 14-6        |
| 14-12 | Data import completo: `import_file` via storage/ActiveStorage, `validate_source/start/retry/abandon`, `error_logs`/`skip_logs`, `failed_records` anexado, idempotente                                                                                                        | `services/contacts.ts`, `routes/v1/ops.ts`, `mail/templates/admin.ts`                                      | 14-6, 03/05 |
| 14-13 | Export de contatos: job `contacts.export` (CSV com colunas do Rails + labels), salva anexo e envia e-mail com link                                                                                                                                                           | `services/contacts.ts`, `mail/templates/admin.ts`                                                          | 14-11, 03   |
| 14-14 | Sync de templates/health WhatsApp (e templates Twilio): jobs + agendadores, idempotentes, com provider mockável                                                                                                                                                              | `channels/providers.ts`, `jobs/scheduler.ts`, `services/inboxes.ts`                                        | 14-2, 04    |
| 14-15 | Jobs restantes do catálogo: avatares (gravatar/url/favicon), IP lookup, resolução automática (`auto_resolve_after`), `update message status`, reopen/remove de notificações, `DeleteObjectJob`, bulk actions                                                                 | `jobs/*.ts` + serviços correspondentes                                                                     | 14-1        |
| 14-16 | Adapter Redis pub/sub: `initRealtime()` (ioredis, `REDIS_URL`), canal `chatwootjs:realtime`, identidade da instância anti-eco; sem Redis segue bus in-process                                                                                                                | `realtime/index.ts`, `apps/server/src/index.ts`                                                            | 14-1        |
| 14-17 | Presença compartilhada: estado em Redis com TTL 90s/heartbeat 20s, payload `{account_id, users, contacts}` e fallback in-memory                                                                                                                                              | `realtime/presence.ts`, `apps/server/src/cable.ts`                                                         | 14-16       |
| 14-18 | `/cable` compatível: aceitar `pubsub_token`+`user_id` (agente) e `pubsub_token` (contato/widget) além do JWT; frames `welcome`/`confirm_subscription`/`ping`/`reject_subscription`; `update_presence`; eventos com nomes do Rails (bus aceita aliases) + front atualizado    | `apps/server/src/cable.ts`, `realtime/index.ts`, `apps/web/src/hooks/useCable.ts`, `ConversationsPage.tsx` | 14-16       |
| 14-19 | Direct uploads: `POST .../conversations/:id/direct_uploads` + `POST /api/v1/widget/direct_uploads` (blob → URL assinada S3/PUT local) e uso no composer/widget                                                                                                               | `lib/storage.ts`, `routes/v1/conversations.ts`, `services/messages.ts`                                     | —           |
| 14-20 | Anexos ActiveStorage do import: resolver `active_storage_attachments`/`blobs` por `service_name` (disk/S3), rota de blob assinada, `toApiMessage`/mídia do contato usando a URL; copiar `storage/` do dump quando disponível                                                 | `lib/active-storage.ts`, `routes/v1`, `services/messages.ts`, `scripts/db-import-chatwoot.mjs`             | —           |
| 14-21 | Scripts de prova: `scripts/fake-smtp.mjs` (SMTP TCP sem dependência, grava `tmp/mail/*.eml`), `scripts/test-mailers.mjs` (convite/reset/transcript/notificação) e `scripts/test-ws-multi.mjs` (2 réplicas com `PORT`+`REDIS_URL`, 2 clientes WS, entrega cruzada + presença) | `scripts/*`                                                                                                | 14-1…14-18  |
| 14-22 | Docs e envs: `docs/infra/mail.md` + `docs/infra/realtime.md` (SMTP/MailHog, 2 réplicas, troubleshooting) e `.env.example` com SMTP_*/`FRONTEND_URL`                                                                                                                          | `docs/infra/*`, `.env.example`                                                                             | 14-21       |

**Ordem sugerida (cada bloco fecha com aceite verde):** 14-1…14-4 (fila) →
14-5…14-11 (mailers) → 14-16…14-18 (WS multi-réplica) → 14-12…14-15 (jobs de
domínio) → 14-19…14-20 (storage) → 14-21…14-22 (scripts/docs). Mailers
destravam 07/11/12 e o WS multi-réplica destrava o 11; por isso vêm antes do
restante do catálogo de jobs. Tarefas `14-x` podem ser fatiadas em PRs
menores, mas cada uma só marca `[x]` com o comando correspondente da §6.

## 6. Aceite

```bash
# qualidade e regressão (existentes)
bun run check-types && bunx oxlint
bun run check
bun scripts/parity-report.mjs --write-doc
bun scripts/e2e.mjs
bun scripts/db-roundtrip-check.mjs   # guarda D: nenhum DDL novo

# módulo 14 — SMTP fake (criado em 14-21)
bun scripts/fake-smtp.mjs &          # escuta :2525 e grava tmp/mail/
SMTP_ADDRESS=127.0.0.1 SMTP_PORT=2525 MAIL_TRANSPORT=smtp bun scripts/test-mailers.mjs

# módulo 14 — 2 réplicas WS (Redis do compose)
REDIS_URL=redis://localhost:6379/0 bun scripts/test-ws-multi.mjs
```

- [ ] fila: sem `REDIS_URL` roda in-process; com `REDIS_URL` 2 réplicas executam o mesmo pool, job com falha tenta 3× e não duplica efeito (provado pelos scripts da 14-21, incluindo job de falha proposital).
- [ ] e-mails: convite, reset, confirmação e transcript saem pelo SMTP fake (`tmp/mail/` ou MailHog) com layout base e link `FRONTEND_URL` (o `console.log` de token some).
- [ ] notificação por e-mail respeita `email_flags`, `read_at` e usuário não confirmado (teste unitário + script).
- [ ] 2 réplicas do server: evento publicado na réplica A chega ao WS conectado na B; presença de A aparece em B.
- [ ] `/cable` aceita identifier do Rails (`RoomChannel` com `pubsub_token`/`user_id`), responde a `ping` e reconecta com backoff + `presence.update` no resubscribe.
- [ ] anexo `active_storage_blob` importado de dump é servido por URL; direct upload devolve URL e o anexo aparece na thread/widget.
- [ ] jobs logam início/fim/duração/erro; `schema-diff` e `db-roundtrip-check` continuam verdes.

## 7. Fora de escopo

- **Enterprise** (licença separada): e-mails de SLA, `reporting_events` de drilldown, capacity/leaves, calls/voice.
- **i18n dos e-mails**: templates seguem o inglês do Rails; tradução fica fora do roadmap.
- **Pipeline/CI**: os aceites são locais (scripts commitados), como no restante do plano.
- **Sidekiq Web / `/monitoring/sidekiq`**: não recriar dashboard de filas; observabilidade = logs (§14-4).
- **Push/browser notifications (FCM/WebPush)**: `Notification::PushNotificationJob` fica para o módulo 11; aqui só e-mail.
- **ActionMailbox** (inbound): nosso inbound é `/webhooks/email` + poller IMAP (`channels/email-poller.ts`) — não migrar para ActionMailbox.
- **Providers GCS/Azure** do `storage.yml`: só disco local + S3-compatível.
- **Redis Sentinel/cluster** e adapter `async` do cable: fora; cobre-se o cenário 2 réplicas + Redis simples.
- **Jobs one-off de migração** (`app/jobs/migration/**`) e `MutexApplicationJob`: não portar.
- **APM/monitoramento** (`config/newrelic.yml`, `config/scout_apm.yml`, `elastic_apm.yml`): fora; observabilidade fica nos logs de job.
- **Entrega via `sendmail`** (fallback do Rails quando `SMTP_ADDRESS` está vazio): fora; o transporte é SMTP ou fake.
- **TUS/resumable upload** e antivírus de anexo: fora; direct upload simples (PUT assinado).

## 8. Definição de done

Para marcar `14 — E-mail, Jobs & Realtime (infra)` como 100% no `roadmap.md`:

1. Tarefas `14-1`…`14-22` marcadas `[x]` com o aceite da §6 verde localmente (2 execuções quando aplicável).
2. `bun run check-types`, `bunx oxlint`, `bun scripts/e2e.mjs` e `bun scripts/db-roundtrip-check.mjs` verdes; `parity-report` sem regressão.
3. `scripts/fake-smtp.mjs` + `scripts/test-mailers.mjs` provando os e-mails; `scripts/test-ws-multi.mjs` provando 2 réplicas (evento cruzado + presença).
4. Evidências commitadas: logs/artefatos em `tmp/` ignorados pelo git; doc `docs/infra/*` publicado e `.env.example` atualizado.
5. Status de `14` atualizado no `roadmap.md` (e linha correspondente no `docs/specs/000-indice.md` se o índice voltar a apontar para os docs de módulo).
