# D0 — Inventário, pino de versão e harness de diff

## 1. Objetivo

Criar a base factual da trilha D: **qual Chatwoot somos compatíveis, com o quê,
e como provar**. Ao fim de D0, qualquer agente ou CI consegue responder
"o que falta para o dump ser idêntico?" com um comando, sem adivinhação.

## 2. Referência Chatwoot

- `./chatwoot/db/schema.rb` (normativo para DDL — Rails `id: :serial`,
  `t.datetime` = `timestamp without time zone`, `t.bigint`, `t.jsonb`, `uuid`).
- `chatwoot/package.json` → versão (atual: **4.17.1** — repinar aqui se mudar).
- Extensões no topo do `schema.rb`: `pgcrypto, pg_stat_statements, pg_trgm,
vector, plpgsql`.
- `chatwoot/app/models/*.rb` (só para tirar dúvida de semântica, não de DDL).

## 3. Tarefa

1. **Pinar a versão:** criar `docs/specs/CHATWOOT_PIN.md` com versão do Chatwoot
   (`4.17.1`), data do pino e como repinar (onde olhar, o que regenerar).
   Todo D1–D5 referencia esse pino; mudar o Chatwoot sem atualizar o pino é erro.
2. **Inventário:** gerar `docs/specs/schema-inventario.md` (pode ser gerado por
   script e commitado) com, por tabela do `schema.rb`:
   `tabela | existe em packages/db? | nome Drizzle diverge? | nº colunas orig vs nossa`.
   Base: as 98 tabelas (`grep -E '^  create_table' chatwoot/db/schema.rb`).
   Marcar explicitamente os casos sabidos: `audits` (orig) vs `audit_logs` (nossa),
   `super_admins` (nossa, não existe no orig), `tags/taggings` (orig) vs `labels`
   (nossa), `channel_twitter_profiles` vs `channel_twitters` etc.
3. **Harness de diff:** criar `scripts/schema-diff.mjs` (Bun/Node puro, sem deps
   novas) que:
   - faz parse do `schema.rb` (tabelas, colunas com tipo/null/default, índices,
     FKs implícitas) e do `packages/db/src/schema/*.ts` (mesmo nível);
   - imprime resumo `tabelas faltantes / extras / colunas divergentes por tabela`
     e sai com código ≠ 0 se houver qualquer divergência **não declarada** em
     `docs/specs/drift-permitido.md`;
   - roda em < 30s sem banco (parse estático dos dois lados).
4. **Lista de exceções inicial:** criar `docs/specs/drift-permitido.md` vazio
   (ou só com infra sabidamente fora do dump de domínio, se provado). Nada de
   "coluna extra nossa" entra aqui sem justificativa de dump.

> Decisão arquitetural já tomada (não rediscutir em D1/D2): tipos Rails são
> normativos — `t.datetime` vira `timestamp` **sem** timezone, `bigint` não vira
> `integer`, `uuid` é tipo `uuid` com `gen_random_uuid()`, PK `id: :serial`
> continua `serial`. Quem hoje usa `timestamp(..., { withTimezone: true })`
> onde o Rails tem `datetime` está divergente e D2 corrige.

## 4. Aceite

- [ ] `bun scripts/schema-diff.mjs` existe, roda sem banco e lista as tabelas
      faltantes conhecidas (`captain_*`, `copilot_*`, `sla_*`, `calls`,
      `channel_tiktok`, `channel_twilio_sms`, `custom_roles`, `leaves`,
      `portals_members`, `integrations_hooks`, `active_storage_*`,
      `action_mailbox_inbound_emails`, `tags`, etc.).
- [ ] `docs/specs/CHATWOOT_PIN.md` existe e diz `4.17.1`.
- [ ] `docs/specs/schema-inventario.md` existe com as 98 tabelas classificadas.
- [ ] `docs/specs/drift-permitido.md` existe (vazio ou só infra justificada).

## 5. Done

PR com os 3 docs + script + saída de exemplo do diff colada na descrição.
Sem migrations, sem mudança de schema — D0 é só medição.
