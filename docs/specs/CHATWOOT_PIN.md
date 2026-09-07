# CHATWOOT_PIN — versão de referência para a trilha D

- **Versão pinada:** Chatwoot **`4.17.1`** (`chatwoot/package.json`).
- **Data do pino:** 2026-09-07.
- **Artefato normativo de DDL:** `chatwoot/db/schema.rb` nessa versão
  (98 tabelas; extensões `pgcrypto, pg_stat_statements, pg_trgm, vector, plpgsql`).
- **Diretório de referência:** `./chatwoot/` (só leitura — nunca editar).

## Como repinar (procedimento, não atalho)

1. Atualizar o checkout/clone em `./chatwoot/` para a tag nova e confirmar
   `chatwoot/package.json` + `chatwoot/db/schema.rb`.
2. Atualizar este arquivo (versão + data).
3. Regenerar `docs/specs/schema-inventario.md` e rodar
   `bun scripts/schema-diff.mjs` — o delta vira o escopo de PRs D1/D2-like.
4. Revalidar D3 (import) e D4 (export/round-trip) contra o pino novo.
5. Só então considerar o pino movido. Regra permanente: `main` importa/exporta
   contra o pino declarado aqui, nunca contra "latest" flutuante
   (detalhe e CI em `D5-conformidade.md`).

Mudar `./chatwoot/` sem atualizar este pino e os artefatos acima é erro.
