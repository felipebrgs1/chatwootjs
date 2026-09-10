# R1 — Saneamento, seed rico e medidor de paridade

## 1. Objetivo

Deixar a base confiável para as fases R2–R12: corrigir o bug do sino, ter um
dataset demo rico e determinístico, e2e e screenshots que rodam 2× sem ritual
manual, e um **medidor de paridade** que transforma o progresso em número.

## 2. Referência Chatwoot

- `chatwoot/app/models/notification_setting.rb` + callback de criação em
  `account_user.rb` (linha cria settings default para o vínculo).
- `chatwoot/app/controllers/**` + `chatwoot/config/routes.rb` (inventário alvo).
- `chatwoot/app/javascript/dashboard/routes/**` (áreas do front).
- `chatwoot/db/seeds.rb` e `Seeders::AccountSeeder` (riqueza do seed demo).

## 3. Tarefa

1. **`notification_settings` default** — o vínculo conta/usuário deve criar a
   linha com todos os tipos ligados (como o Rails faz), em:
   - `signUp` (dono da conta), `inviteAgent`, `acceptInvitation`;
   - seed, para Ada/Alan.
   - `getNotificationSettings` passa a tratar **linha ausente = tudo ligado**
     (default do Rails), eliminando o modo "tudo mutado".
2. **Seed rico e determinístico** (`packages/db/src/seed.ts`, idempotente):
   - 2 inboxes: Website (`Site Demo`, já existia) + API (`API Demo`);
   - 3 times (`suporte`, `vendas`, `financeiro`) com membros;
   - 5 labels; 3 canned responses; 2 macros; 2 automações;
   - 10 contatos (com empresa/telefone/local) + `contact_inboxes`;
   - 6 conversas com status variados (open/resolved/pending/snoozed),
     assignees e prioridades diferentes, com mensagens;
   - 1 `csat_survey_responses` numa conversa resolvida;
   - notificações de exemplo para Ada/Alan (sino populado).
3. **`scripts/e2e.mjs` idempotente** — não depender do seed: cria a própria
   conversa via canal API (`POST .../api_channel/conversations`), valida que ela
   aparece na lista, carrega na UI, envia mensagem, resolve, e mantém os checks
   de relatório/auditoria/sino/busca/captain/superadmin. Roda 2× seguidas com o
   mesmo resultado.
4. **`scripts/shot.mjs`** — defaults corretos (`WEB_URL` :3001, `SERVER_URL`
   :3000), conversa escolhida via API (não hardcode), token do widget obtido
   via API, esperas por elemento em vez de `waitForTimeout` cego.
5. **`scripts/parity-report.mjs`** — parse de `chatwoot/app/controllers` +
   `chatwoot/config/routes.rb` × `apps/server/src/routes` × `apps/web/src/routes`;
   imprime cobertura por área (API e front), lista controllers sem mapa e
   aceita `--json` e `--write-doc` (`docs/specs/paridade-mapa.md`).
6. **`docs/specs/paridade-mapa.md`** gerado com a baseline da medição.

## 4. Aceite

- [ ] `bun scripts/e2e.mjs` verde **duas execuções seguidas** sem re-seed.
- [ ] `bun scripts/parity-report.mjs` roda e imprime baseline por área
      (DDL 100% é da trilha D; API/front medidos).
- [ ] `bun run db:seed` (e `SEED_FORCE=1`) criam o dataset rico sem erro e sem
      duplicar em execuções repetidas.
- [ ] Usuário recém-criado/agente convidado recebe `notification_settings`
      default e o sino funciona sem intervenção manual.
- [ ] `bun run check-types` e `bunx oxlint` continuam verdes.
- [ ] `bun scripts/schema-diff.mjs` + `bun scripts/db-roundtrip-check.mjs`
      continuam verdes (nenhuma mudança de DDL nesta fase).

## 5. Done

PR/commit com: correção do default de notificações, seed rico, e2e e shot
corrigidos, `parity-report.mjs` + `paridade-mapa.md` com a baseline, e
`R1 [x] done` no `000-indice.md`.
