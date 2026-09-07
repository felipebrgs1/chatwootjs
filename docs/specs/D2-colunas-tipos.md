# D2 — Paridade coluna-a-coluna (tipos, defaults, null, índices, FKs)

## 1. Objetivo

Transformar "mesmas tabelas" (D1) em "**mesmo DDL**": para cada tabela,
mesmas colunas, mesmos tipos Postgres, mesmos defaults, mesma nulabilidade,
mesmos índices/constraints/FKs/sequências e mesmas extensões. É o coração da
compatibilidade de dump — D3/D4 só testam o que D2 garantir.

## 2. Referência Chatwoot

- `chatwoot/db/schema.rb` (normativo, linha a linha) + `chatwoot/db/migrate/*`
  (só para entender defaults gerados, ex. `gen_random_uuid()`, `CURRENT_TIMESTAMP`).
- Exemplos reais de divergência já mapeada (corrigir todos, não só estes):
  - `conversations`: faltam `campaign_id, sla_policy_id, assignee_agent_bot_id,
ai_assignee_type`; `contact_id/contact_inbox_id/team_id` são `bigint` no
    Rails (nossos `integer` divergem); `uuid` é tipo `uuid` com
    `default gen_random_uuid()` (nosso `varchar(64)` diverge);
    `last_activity_at` default `CURRENT_TIMESTAMP`; `datetime` = `timestamp
**sem** timezone (nosso `withTimezone: true` diverge em todas as tabelas);
faltam vários índices (`identifier+account_id`, `uuid`unique,`campaign_id`…);
sobram colunas nossas (`muted`, `unread_incoming_messages_count` — mover,
    renomear ou registrar).
  - Regra geral: `t.datetime` → `timestamp({ withTimezone: false })`,
    `t.bigint` → `bigint`, `t.integer` → `integer`, `t.jsonb default {}` →
    `jsonb(...).default({})`, `id: :serial` → `serial().primaryKey()`.

## 3. Tarefa

1. Por tabela (ordem sugerida: `accounts, users, account_users, inboxes,
channel_*, contacts, contact_inboxes, conversations, messages, attachments`
   primeiro; resto depois), alinhar em `packages/db/src/schema/`:
   tipos, nulabilidade, defaults SQL (`sql\`CURRENT_TIMESTAMP\``,
`sql\`gen_random_uuid()\``), nomes de índices/ uniques/ checks **idênticos**
ao `schema.rb`, FKs com mesmo `onDelete`, sequências de `serial/bigserial`.
2. Garantir extensões via migration: `pgcrypto, pg_trgm, pg_stat_statements,
vector, plpgsql` (mesmo set do topo do `schema.rb`).
3. Cobrir tabelas Rails de infra como DDL fiel mesmo sem uso funcional:
   `active_storage_attachments/blobs/variant_records`,
   `action_mailbox_inbound_emails`, `schema_migrations`/`ar_internal_metadata`
   (estas duas últimas: ver D3 — o Rails as cria; nosso migrate não deve
   conflitar com elas).
4. Ajustar o mínimo necessário em `packages/core` + `apps/server` para o app
   continuar subindo e passando `check-types` com os tipos novos
   (ex.: `bigint` vira `string | number` no Drizzle — tratar na borda via mapper,
   sem mudar paths da API). **Nenhuma mudança de rota/contrato de API em D2.**
5. Zerar o diff de colunas de `bun scripts/schema-diff.mjs` (evoluí-lo em D2
   se o parse de D0 for insuficiente para defaults/índices).

## 4. Aceite

- [ ] `bun scripts/schema-diff.mjs` reporta **zero divergências**
      (tabelas + colunas + índices) fora de `drift-permitido.md`.
- [ ] `pg_dump --schema-only` do nosso banco vs `schema.rb` do pino:
      diff manual sem divergência de domínio (roteiro no PR; automação vira D5).
- [ ] `bun run db:migrate` do zero OK; `bun run check`, `check-types` verdes;
      seed (`db:seed`) roda e login no dashboard funciona (smoke).

## 5. Done

PR(s) por lote de tabelas com migrations + diff zerado na descrição.
Pode ser fatiado em 2–3 PRs (núcleo → canais → resto), desde que cada um
mantenha o aceite do seu lote e não quebre o smoke.
