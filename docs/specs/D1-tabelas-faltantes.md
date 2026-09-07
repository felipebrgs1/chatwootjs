# D1 — Tabelas faltantes (nomes Rails exatos)

## 1. Objetivo

Fechar o gap de **tabelas**: toda tabela de `chatwoot/db/schema.rb` (pino D0)
existe em `packages/db` com o **nome Rails exato**, e nenhuma tabela nossa
fora do original permanece sem registro. Ao fim de D1, o diff de _tabelas_
(D0) zera — o de _colunas_ fica para D2.

## 2. Referência Chatwoot

- `chatwoot/db/schema.rb` — as ~36 tabelas que não temos (lista exata sai de
  `bun scripts/schema-diff.mjs`; inclui no mínimo):
  `account_saml_settings, action_mailbox_inbound_emails, active_storage_attachments,
active_storage_blobs, active_storage_variant_records, agent_capacity_policies,
agent_sessions, applied_slas, article_embeddings, calls, campaign_recipients,
captain_* (9), channel_tiktok, channel_twilio_sms, conversation_outcomes,
copilot_messages, copilot_threads, custom_roles, data_import_mappings,
inbox_capacity_limits, integrations_hooks, leaves, platform_app_permissibles,
portals_members, related_categories, sla_events, sla_policies, tags,
user_sessions` — mais `audits`, `tags/taggings` onde hoje temos nomes próprios.
- Casos de renomeação obrigatória (nossos nomes atuais → nome Rails):
  `audit_logs` → `audits`, `channel_twitters` → `channel_twitter_profiles`,
  checar `labels` vs `tags/taggings` (no Rails, labels de conversa são
  `taggings` sobre `tags`; não inventar semântica — espelhar DDL e resolver
  o mapeamento da API em D2).

## 3. Tarefa

1. Criar um arquivo de schema por domínio faltante em
   `packages/db/src/schema/` (ex.: `captain.ts`, `sla.ts`, `calls.ts`,
   `active-storage.ts`, `tags.ts`, `custom-roles.ts`, `portals-members.ts`,
   `integrations-hooks.ts`, …), cada `pgTable` com o **nome de tabela Rails**
   e colunas **mínimas fiéis** (tipos finais vêm em D2 — aqui o crítico é o
   nome da tabela existir com PK equivalente e `account_id` onde o Rails tem).
2. Resolver divergências de nome existente **por rename com migration**
   (nunca duas tabelas paralelas): `audit_logs`→`audits`,
   `channel_twitters`→`channel_twitter_profiles`; decidir `labels` vs
   `tags/taggings` e registrar a decisão em `docs/specs/drift-permitido.md`
   se algo nosso ficar temporariamente.
3. Tratar `super_admins` (nossa, inexistente no Rails — lá é flag em `users`):
   registrar em `drift-permitido.md` com plano (manter fora do dump de domínio
   em D3/D4 ou migrar para flag) — não deixar silencioso.
4. Migrations via `drizzle-kit generate` + `db:migrate`. Nunca SQL cru fora de
   migration/seed (convenção do repo).

## 4. Aceite

- [ ] `bun scripts/schema-diff.mjs` reporta **zero tabelas faltantes e zero
      extras não declaradas** (só o que está em `drift-permitido.md`).
- [ ] `bun run db:migrate` aplica do zero num Postgres vazio sem erro.
- [ ] `bun run check` e `bun run check-types` verdes.

## 5. Done

PR com novos arquivos de schema + migrations + `drift-permitido.md` atualizado

- saída do diff de tabelas zerado na descrição. Sem exigir paridade de colunas
  (isso é D2).
