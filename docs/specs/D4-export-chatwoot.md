# D4 — Export: nosso banco → dump que o Rails aceita

## 1. Objetivo

Provar o sentido inverso: podemos **alimentar** o Chatwoot original. Nosso
`pg_dump` restaura num Postgres vazio onde o Rails pinado roda `db:migrate`
com zero pendências e sobe lendo os dados. É o espelho de D3.

## 2. Referência Chatwoot

- `chatwoot/bin/rails db:migrate db:schema:load` (comportamento esperado sobre
  nosso dump restaurado) e `chatwoot/db/schema.rb` do pino.
- `pg_dump`/`pg_restore`/`psql` padrão — sem formato proprietário.

## 3. Tarefa

1. Criar `scripts/db-export-chatwoot.mjs` (ou `.mjs`) que, a partir de
   `DATABASE_URL`, gera `./tmp/chatwootjs-compat.dump` (+ variante `.sql`)
   contendo schema+dados **restauráveis pelo Rails**:
   - exclui ou isola o que está em `drift-permitido.md` como "nosso e fora do
     Rails" (ex.: `super_admins` se ela permanecer) via `--exclude-table`,
     documentando cada exclusão — nada silencioso;
   - inclui `setval` de sequências; não embute `search_path`/owner que quebre
     o restore no ambiente Rails.
2. Estender `docs/specs/import-export.md` (seção export): comando exato de
   restore num Postgres vazio + `bin/rails db:migrate` (esperado: "já em dia")
   - `rails runner 'puts Conversation.count'` como smoke.
3. Teste de ida-e-volta (round-trip): fixture D3 → nosso banco → export D4 →
   banco "rails-like" vazio → diff de `count(*)` por tabela do núcleo e
   amostragem de linhas (`EXCEPT` nos dois sentidos deve dar vazio nas tabelas
   de domínio). Script: `scripts/db-roundtrip-check.mjs`.
4. Se o Rails reclamar de algo nosso (tipo, default, índice com nome diferente),
   o fix é em DDL (voltar para D2), não em gambiarra no export.

## 4. Aceite

- [ ] `bun scripts/db-export-chatwoot.mjs` gera dump que restaura com
      `psql`/`pg_restore` sem erro num Postgres vazio.
- [ ] Sobre esse restore, o `db:migrate` do Chatwoot pinado sai com
      **zero migrations pendentes** (ou, se o Rails criar `schema_migrations`
      próprias, documentar por que elas não contam como divergência).
- [ ] `bun scripts/db-roundtrip-check.mjs` passa: counts iguais e `EXCEPT`
      vazio nas tabelas do núcleo nos dois sentidos.

## 5. Done

PR com script de export + round-trip + doc + evidência (log do restore e do
`db:migrate` "up to date" + tabela de counts). Pode andar em paralelo com D3
após D2 do núcleo, mas só fecha com o round-trip verde.
