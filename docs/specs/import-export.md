# Import / export de dump com o Chatwoot original (D3 + D4)

> Pré-requisito: D2 (DDL idêntico ao `schema.rb` do pino em
> `docs/specs/CHATWOOT_PIN.md`). Ferramentas Postgres rodam **dentro do
> container** (`docker compose exec -T postgres`) — não precisa de
> `psql/pg_dump` local. `tmp/` é gitignored: dumps nunca são commitados.

## Import — Chatwoot → ChatwootJS (D3)

### 1. Gerar o dump no Chatwoot original

```bash
# Completo (schema + dados, recomendado):
pg_dump -Fc -f /tmp/chatwoot.dump "$RAILS_DATABASE_URL"
# ou plain SQL:
pg_dump -f /tmp/chatwoot.sql "$RAILS_DATABASE_URL"
# ou só dados (nosso DDL já é idêntico):
pg_dump --data-only -Fc -f /tmp/chatwoot-data.dump "$RAILS_DATABASE_URL"
```

### 2. Restaurar aqui

```bash
# Nosso banco precisa estar migrado (D2): bun run db:start && bun run db:migrate
CHATWOOT_DUMP=/tmp/chatwoot.dump bun scripts/db-import-chatwoot.mjs [--yes]
```

- `.sql` só-dados / fixture: carga **aditiva** (sem truncate).
- Dump **completo**: restaura num banco temporário, extrai só-dados e carrega
  após `TRUNCATE` das tabelas de domínio. Se o alvo já tem dados, exige `--yes`
  (ou `IMPORT_CONFIRM=1`). `super_admins` e `__drizzle_migrations` preservadas.
- FKs desligadas na carga (`session_replication_role=replica`, igual a
  `pg_restore --disable-triggers`), `setval` de todas as sequências + `ANALYZE`.
- Tabelas do dump ausentes no alvo (ex.: `schema_migrations`,
  `ar_internal_metadata` do Rails) são ignoradas com aviso.

### Limitações conhecidas

- `super_admins` é só nossa (Rails usa flag em `users`): não vem no import,
  sai no export. Recriar via seed (`superadmin@demo.test`) se precisar.
- Senhas: `encrypted_password` (Devise/bcrypt) é restaurado byte-identico —
  login funciona com a mesma senha. Se o hash for de outro algoritmo, o usuário
  usa "esqueci a senha" (`POST /auth/password`).
- `bun run db:seed` **pula sozinho** quando o banco já tem dados de outra conta
  (`SEED_FORCE=1` força a criação da Demo mesmo assim).

### Fixture (sem Chatwoot de verdade)

`tests/fixtures/chatwoot-mini.sql` — 1 conta, 2 usuários (`admin@fixture.test`,
`agent@fixture.test`, senha `password123`), 1 inbox API, 2 contatos, 2 conversas,
3 mensagens. Colunas explícitas, só DDL Rails. Importa em segundos:

```bash
CHATWOOT_DUMP=tests/fixtures/chatwoot-mini.sql bun scripts/db-import-chatwoot.mjs
```

## Export — ChatwootJS → Chatwoot (D4)

```bash
[TARGET_DB=chatwootjs] [OUT_PREFIX=./tmp/chatwootjs-compat] bun scripts/db-export-chatwoot.mjs
# gera <prefix>.dump (custom) + <prefix>.sql (plain), sem super_admins,
# --no-owner/--no-privileges, com setval das sequências.
```

### Restaurar no lado Rails (procedimento exato)

```bash
createdb rails_check
# via custom:
pg_restore --no-owner -d rails_check ./tmp/chatwootjs-compat.dump
# ou via plain:
psql -v ON_ERROR_STOP=1 -d rails_check -f ./tmp/chatwootjs-compat.sql
# marcar as 178 migrations do pino como aplicadas (gerado de chatwoot/db/migrate/):
psql -v ON_ERROR_STOP=1 -d rails_check -f scripts/rails-schema-migrations.sql
cd chatwoot && bin/rails db:migrate        # esperado: já em dia, zero pendências
bin/rails runner 'puts Conversation.count' # smoke
```

Por que o helper: `db:migrate` compara `db/migrate/*` com `schema_migrations`;
como nosso dump é só domínio (sem tabela do Rails), o helper declara as
versions do pino — sem ele o Rails tentaria rodar 178 migrations sobre tabelas
que já existem. `ar_internal_metadata` vai junto (`environment=production`).
**Regenerar `scripts/rails-schema-migrations.sql` a cada repin** (ver D5).

Sem Rails local, o equivalente validado aqui: restore num Postgres vazio +
helper aplicado sem erro + `SELECT count(*) FROM schema_migrations` = nº de
arquivos em `chatwoot/db/migrate` (178 no pino atual).

## Round-trip (D3+D4 juntos)

```bash
bun scripts/db-roundtrip-check.mjs   # KEEP=1 preserva os bancos rt_*
```

Cria `chatwootjs_rt_src` (migrado do zero) → importa a fixture → exporta →
restaura `.dump` em `chatwootjs_rt_dst` e `.sql` em `chatwootjs_rt_dst_sql` →
compara counts + conteúdo byte-a-byte (`COPY ... ORDER BY id`, diff nos dois
sentidos) nas 9 tabelas do núcleo + probe de sequência com ROLLBACK.
Verde = `== ROUNDTRIP PASS ==`.
