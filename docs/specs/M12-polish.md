# M12 — Superadmin, Auditoria, Imports UI, AgentBots, QA 1:1 (FINAL)

Depende de: **todos os anteriores**. Fecha o produto.

## 1. Objetivo

Console do superadmin, trilha de auditoria, UI de importações, AgentBots
(+ stub Captain/AI) e o QA de paridade 1:1 que libera o GA.

## 2. Referência Chatwoot

- `chatwoot/app/controllers/super_admin/*` + ActiveAdmin (`app/admin/`)
- Models: `agent_bot, agent_bot_inbox, audit? (gem audited)`,
  `platform_app, installation_config, email_template, platform_banner`
- Vue: `superadmin` (se existir) + `settings/audit-logs` (enterprise: stub OSS)
  - `Captain` (AI) em `dashboard/components-next/captain`

## 3. DB

- `agent_bots (id, account_id?, name, description, outgoing_url, bot_type)`
- `agent_bot_inboxes (agent_bot_id, inbox_id)`
- `audit_logs (id, account_id, user_id, action, auditable_type/id, changes jsonb,
created_at)` — escrita via hook genérico nos services (create/update/destroy
  dos recursos principais). Tabela própria (Rails usa `audits`; nome nosso
  evita colisão e documenta no PR).
- `platform_apps, email_templates, platform_banners` — espelhar `schema.rb`.

## 4. API

| Método | Path                                                         | Obs                                                                                           |
| ------ | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `*`    | `/super_admin/*`                                             | área separada: auth por `super_admins` (M1), CRUD contas/usuários/`installation_configs`/jobs |
| GET    | `/api/v1/accounts/:id/audit_logs`                            | paginado, filtro por ator/recurso (só admin)                                                  |
| CRUD   | `/api/v1/accounts/:id/agent_bots` + `/inboxes/:id/agent_bot` | vincular bot à inbox                                                                          |
| POST   | `/api/v1/accounts/:id/agent_bots/:id/webhook`                | Bot API: recebe evento, responde (formato Rails)                                              |
| GET    | `/api/v1/accounts/:id/data_imports`                          | status das importações (M3) — UI aqui                                                         |

Captain/AI (stub com flag): `POST .../captain/assist` (`reply_suggest/summarize/
rewrite`) atrás de `feature_flags.captain_enabled` + provider plugável
(OpenAI-compatível). Sem chave → 501 com mensagem clara. **Não bloquear o GA.**

## 5. Front

- `/super-admin/{accounts,users,settings}` (tabela de contas, login-as?,
  configs de instalação) — visual simples, não precisa ser 1:1 (ActiveAdmin).
- `settings/audit-logs` (timeline por ator/ação).
- Composer do M4 ganha botão ✨ (só com flag captain ligada).

## 6. QA 1:1 (checklist do GA)

- [ ] `docker compose up --build` → seed → login → widget → conversa →
      relatório, sem erro no console ou nos logs.
- [ ] Side-by-side de cada página vs `chatwoot/` original (anexar prints no PR):
      dashboard, conversas, contatos, relatórios, campanhas, helpcenter, settings.
- [ ] Playwright e2e: login → abre conversa → envia mensagem → resolve →
      relatório reflete. Vitest nos services críticos (policies, automation matching).
- [ ] `bun run check-types` + `bun run check` (lint/format) verdes.
- [ ] README final com demo (credenciais seed, snippet widget, matriz de canais).

## 7. Done (GA)

Tudo acima + índice `000-indice.md` com toda a coluna `Impl` em `[x] done` + tag `v1-parity`.
