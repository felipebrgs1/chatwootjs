# Upgrade do pino Chatwoot (D5)

> Procedimento executável para subir a versão de referência em
> `docs/specs/CHATWOOT_PIN.md`. Regra permanente: `main` sempre importa/exporta
> contra o pino declarado — nunca contra "latest" flutuante.

## Pré-requisitos

- `bun scripts/schema-diff.mjs` verde no pino atual (senão o delta mistura
  dívida velha com mudança nova).
- Postgres local via `docker compose up -d postgres`.

## Passo a passo

1. **Atualizar a referência.** Sincronizar `./chatwoot/` (só leitura) para a
   tag nova e confirmar `chatwoot/package.json` (versão) e
   `chatwoot/db/schema.rb` (DDL normativo).
   ```bash
   grep '"version"' chatwoot/package.json
   grep -c '^  create_table' chatwoot/db/schema.rb
   ```
2. **Mover o pino.** Atualizar versão + data em `docs/specs/CHATWOOT_PIN.md`.
   Se a major do Postgres do Chatwoot mudou, atualizar também a imagem em
   `docker-compose.yml` e no workflow `dump-conformance.yml`.
3. **Medir o delta.**
   ```bash
   bun scripts/schema-diff.mjs; echo "EXIT:$?"
   ```
   Regenerar `docs/specs/schema-inventario.md` (mesmo formato de D0) e anexar
   a saída do diff: tabelas novas/removidas viram escopo **D1-like**, colunas/
   tipos/índices viram escopo **D2-like**.
4. **Convergir o DDL.** Um PR (ou fatias, como D1/D2) com os schemas +
   migrations (`drizzle-kit generate` + `db:migrate` do zero). Nunca SQL cru
   fora de migration. Se o Chatwoot removeu tabela/coluna que usamos no app,
   o PR precisa incluir a adaptação mínima do `packages/core` + `apps/server`
   (sem mudar contrato de API além do inevitável — e documentado).
5. **Revalidar os dois sentidos.**
   ```bash
   bun run db:migrate                                  # do zero num banco limpo
   CHATWOOT_DUMP=/tmp/chatwoot-novo.dump bun scripts/db-import-chatwoot.mjs --yes
   bun scripts/db-export-chatwoot.mjs
   bun scripts/db-roundtrip-check.mjs                  # tem que dar ROUNDTRIP PASS
   ```
   Detalhe dos comandos em `docs/specs/import-export.md`. Se o Rails real
   estiver disponível, rodar `bin/rails db:migrate` sobre o nosso export e
   exigir zero pendências (D4).
6. **Fechar.** `drift-permitido.md` atualizado (entradas novas com
   Motivo/Impacto/Plano/Expira ou nada), `bun run check` verde, CI
   `dump-conformance` verde no PR. Só então merge — o pino só "moveu" aqui.

## Calendário

- Revisão do pino a cada release minor do Chatwoot (ou trimestral, o que vier
  primeiro): abrir issue "avaliar upgrade pino X.Y.Z" mesmo que a conclusão
  seja "manter".
- Revisão de `drift-permitido.md` na mesma cadência: cada entrada ainda vale?
  Expiradas convergem ou são re-justificadas (D5 item 2, fiscalizado pelo
  `drift-lint` no CI).
