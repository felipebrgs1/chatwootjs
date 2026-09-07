# D3 — Import: dump do Chatwoot original → nosso banco

## 1. Objetivo

Provar que podemos ser **alimentados** pelo Chatwoot: dado um `pg_dump` de um
Chatwoot original no pino D0, restaurar no nosso banco e operar sobre esses dados.
É o sentido "Chatwoot → ChatwootJS" da compatibilidade.

## 2. Referência Chatwoot

- Dump gerado pelo Chatwoot pinado (`pg_dump -Fc` ou `--data-only` + `--schema-only`).
- `chatwoot/db/seeds.rb` (para gerar massa de teste) e `schema.rb` (ordem de restore).
- Nossos pontos de entrada: `packages/db` (migrate/seed), `scripts/*`.

## 3. Tarefa

1. Criar `scripts/db-import-chatwoot.sh` (ou `.mjs`) que, dado um arquivo de dump
   (variável `CHATWOOT_DUMP`, default `./tmp/chatwoot.dump`) e `DATABASE_URL`:
   - valida pré-condições (banco nosso migrado até D2, Postgres mesma major);
   - restaura schema+dados (`pg_restore`/`psql`) com ordem que respeite FKs
     (ou `--disable-triggers` documentado quando fiel ao procedimento Rails);
   - corrige sequências (`setval` por tabela) e roda `ANALYZE`;
   - imprime relatório: tabelas/linhas importadas, sequências ajustadas, avisos.
2. Documentar em `docs/specs/import-export.md` (seção import): como gerar o dump
   no Chatwoot original (comando exato), como rodar o import aqui, limitações
   conhecidas (ex.: o que fazer com `super_admins` nossa e com tabelas em
   `drift-permitido.md`).
3. Smoke pós-import: `db:seed` **não** pode ser obrigatório após import
   (seed deve ser idempotente e pular quando há dados); app (`dev`) sobe e
   lista contas/usuários/conversas importadas.
4. Fixture mínima versionada: `tests/fixtures/chatwoot-mini.sql` (poucas linhas
   por tabela do núcleo: accounts, users, account_users, inboxes, contacts,
   contact_inboxes, conversations, messages) gerada **a partir do DDL Rails**,
   para CI/local sem precisar de um Chatwoot de verdade.

## 4. Aceite

- [ ] `CHATWOOT_DUMP=./tmp/chatwoot.dump bun scripts/db-import-chatwoot.sh`
      restaura sem violação de FK/unique/not-null e ajusta sequências
      (inserir nova linha após import não colide ID).
- [ ] Com dados importados: `bun run dev` sobe; login funciona para um usuário
      importado (mesmo e-mail; senha pode ser resetada — documentar); dashboard
      lista conversas/mensagens importadas.
- [ ] `tests/fixtures/chatwoot-mini.sql` importa do zero em < 60s e serve de
      base para D4/D5.

## 5. Done

PR com script + doc + fixture + evidência (log de import + screenshot ou
`SELECT count(*)` por tabela do núcleo na descrição). Sem mudança de DDL
fora de bug provado pelo restore (se provado, voltar para D2).
