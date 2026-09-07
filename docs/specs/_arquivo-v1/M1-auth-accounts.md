# M1 — Auth, Accounts, Users, Roles

Depende de: **M0**. Desbloqueia: M2, M3.

## 1. Objetivo

Login real com JWT, contas, convite de agentes, roles `agent/administrator`,
`super_admin` global e troca de disponibilidade. Substituir o `demo-token` do M0.

## 2. Referência Chatwoot

- `chatwoot/app/models/{user,account,account_user,super_admin}.rb`
- `chatwoot/app/controllers/{sessions,registrations,passwords}_controller.rb`
  (Devise) + `chatwoot/app/controllers/api/v1/accounts_controller.rb`
  - `chatwoot/app/controllers/api/v1/account_users_controller.rb`

## 3. DB (`packages/db/src/schema/m1.ts`)

Espelhar `schema.rb` (nomes snake_case, `account_id` FK cascade onde houver):

- `users (id, name, email unique, password_digest bcrypt, availability_status
0 online/1 busy/2 offline, ui_settings jsonb, created_at, updated_at)`
- `accounts (id, name, locale default pt_BR, status, feature_flags jsonb,
created_at, updated_at)`
- `account_users (id, user_id, account_id, role 0 agent/1 administrator,
availability_status, auto_offline, unique(user_id, account_id))`
- `access_tokens (id, owner_type, owner_id, token_digest unique)` — refresh rotation
- `super_admins (id, email unique, password_digest)`
- `installation_configs (id, name unique, value jsonb, locked)`

## 4. API (`apps/server/src/routes/`)

Schemas em `packages/core/src/schemas/auth.ts`. Senha: bcrypt 12 rounds.
Access JWT 15min + refresh 30d com rotação (`access-token/client/uid` headers
compatíveis com o widget antigo do Chatwoot).

| Método       | Path                                         | Obs                                                                               |
| ------------ | -------------------------------------------- | --------------------------------------------------------------------------------- |
| POST         | `/auth/sign_up`                              | `{ name, email, password, account_name }` → cria user+account+account_user(admin) |
| POST         | `/auth/sign_in`                              | `{ email, password }` → access+refresh                                            |
| POST         | `/auth/sign_out`                             | revoga refresh                                                                    |
| POST         | `/auth/password`                             | forgot → gera token (log em dev)                                                  |
| POST         | `/auth/password/reset`                       | `{ token, password }`                                                             |
| GET          | `/api/v1/profile`                            | usuário atual                                                                     |
| PATCH        | `/api/v1/profile`                            | nome, disponibilidade, `ui_settings`                                              |
| GET/PATCH    | `/api/v1/accounts/:account_id`               | só membros; PATCH só admin                                                        |
| GET/POST     | `/api/v1/accounts/:account_id/agents`        | convite (gera `account_users` + e-mail/log)                                       |
| PATCH/DELETE | `/api/v1/accounts/:account_id/agents/:id`    | troca role / remove (só admin)                                                    |
| GET          | `/api/v1/accounts/:account_id/account_users` | lista membros                                                                     |
| PUT          | `/api/v1/profile/availability`               | `{ availability: online\|busy\|offline }`                                         |

`authAccount()`: valida JWT, carrega `account_users` da `account_id` da URL →
403 se sem vínculo. Admin-only via `policies`: `requireRole(c, 'administrator')`.

## 5. Front

- Rotas: `/auth/{login,signup,reset-password}`, `/auth/invitation?token=`
  (aceitar convite → setar senha).
- `settings/general` (nome da conta, locale) + `settings/agents`
  (tabela, convidar, trocar role, remover) — layout igual Vue
  (`chatwoot/app/javascript/dashboard/routes/dashboard/settings/agents`).
- Seletor de contas no sidebar + dropdown de disponibilidade no avatar.
- Guard de rota: sem token → `/auth/login`; `accountId` sem vínculo → 403 page.

## 6. Aceite

- [ ] Sign up cria conta e loga; sign in/out funcionam; refresh rotaciona.
- [ ] Admin convida agente → agente aceita, vê só as contas dele.
- [ ] Trocar `accountId` na URL sem vínculo → 403 (API e front).
- [ ] Agente não acessa `settings/agents` (403 + item oculto no menu).
- [ ] Disponibilidade online/busy/offline persiste e aparece no avatar.

## 7. Done

Migration + seed atualizado (admin + agente demo) + testes de API
(sign_in, invite, 403 cross-account) + telas auth/settings.
