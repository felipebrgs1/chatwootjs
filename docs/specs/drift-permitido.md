# drift-permitido — exceções declaradas à paridade de dump

> Como funciona: `scripts/schema-diff.mjs` lê deste arquivo SOMENTE os itens de
> lista no formato `- \`token\``no início da linha (tokens no meio do texto,
como menções em prosa, são ignorados). Token`tabela`libera a tabela;
token`tabela.coluna`(ou`coluna`sozinha) libera a coluna.
Cada entrada precisa de motivo, impacto no dump, plano e expiração —
sem esses campos, D5 quebra o CI (ver`D5-conformidade.md`).

## Exceções vigentes

- `super_admins` — tabela só nossa (o Rails usa flag em `users`, não tabela).
  Motivo: console superadmin local (v1). Impacto no dump: tabela **excluída
  do export** (`--exclude-table=super_admins`) em D4 e ignorada no import
  (D3); o dump de domínio continua restaurável nos dois sentidos sem ela.
  Plano: manter fora do dump de domínio; convergência futura (flag em
  `users`) só se o pino do Chatwoot exigir. Expira em: nunca (permanente
  até decisão explícita em contrário).

## Decisões D1 (registro, não exceções — sem efeito no diff)

- labels vs tags/taggings: sem conflito. O Rails tem as três tabelas
  (labels, tags, taggings); aqui labels e taggings já existiam e tags foi
  criada em D1. Colunas de taggings (apontam para labels em vez de tags)
  alinham em D2.
- channel_twitter_profiles: só o nome da constante TS divergia
  (channelTwitters); a tabela já tinha o nome Rails. Constante mantida
  para não tocar rotas/services em D1.
- audits: tabela renomeada via ALTER TABLE (migration D1, sem perda de
  dados); colunas ainda nossas para não quebrar o service — D2 alinha
  coluna-a-coluna com o Rails.

## Política de extras futuros (vale desde já, D5 fiscaliza)

Objetivo 1:1 com o Chatwoot, mas tabelas novas próprias são permitidas sem
quebrar import/export — com perda esperada só dos dados dessas tabelas no
lado Chatwoot (o Rails nunca as vê; ida-volta ChatwootJS → Chatwoot →
ChatwootJS não traz esses dados de volta; se um dia importar, guardar dump
paralelo só das tabelas extras).

1. **Tabela nova: prefixo obrigatório `chatwootjs_`** (nunca nome que possa
   colidir com tabela futura do Chatwoot) + entrada aqui + `--exclude-table`
   correspondente no export D4.
2. **Coluna nova em tabela do Rails: só `nullable` + com default**, registrada
   aqui (token `tabela.coluna`), e o export D4 deve removê-la; o `COPY` do
   dump do Chatwoot não lista a coluna e o import segue funcionando.
3. **Proibido**: mudar tipo, renomear ou remover coluna do Rails; FK de tabela
   do Rails apontando para tabela extra; `NOT NULL` sem default em coluna nova.

## Decisões D2 (registro, sem efeito no diff)

- `conversations.muted` removida → Rails: mute = resolve + `contacts.blocked=true`
  (+ activity message); `muted?` = `contact.blocked`. `unread_count` calculado
  (incoming após `agent_last_seen_at`), sem coluna.
- `access_tokens` 100% Rails (`owner_type/owner_id/token`); refresh/invite/reset
  usam a tabela com expiração derivada de `created_at` + TTL (30d/7d/2h).
- `accounts.locale` integer (enum `LANGUAGES_CONFIG`, API expõe código) e
  `feature_flags`/`feature_flags_ext_1` bitmask (`packages/core/src/lib/`
  `feature-flags.ts`, `locales.ts` gerados do pino; seed usa bits default).
- Sino sem `muted_flags`: mute = bits de e-mail+push desligados (derivado).
  Tipos de notificação gravados com os ints do enum Rails (2/4/5).
- `notifications` usa `primary_actor`; `custom_filters` só `filter_type`
  (visibility removida — filtros são pessoais); `reporting_events` sem
  `team_id`; `mentions` sem `mentioned_by`; `audits` com `associated`
  (conta) + `audited_changes`; `installation_configs.serialized_value`;
  `users` com colunas Devise (seed usa `uid=email`); `taggings` Rails puras
  (escopo por conta via join com `labels`).
- Migrations 0000–0010 (v1) substituídas por baseline única
  `0000_simple_chronomancer.sql` (squash: DDL reescrito em 86 tabelas;
  DBs de dev devem ser reconstruídos — `db:migrate` do zero + `db:seed`).
- `timestamp()` sem `withTimezone` = `timestamp` sem tz (igual ao Rails);
  `$defaultFn` é client-side e não conta como default DDL no diff.

## Histórico (já convergido — manter como registro)

(nenhum ainda)
