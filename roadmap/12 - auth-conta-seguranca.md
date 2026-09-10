# 12 — Auth, Conta & Segurança

> **Estágio:** 12/15 · **Status:** 11 subáreas — 0 ✅ · 7 🟡 · 4 ❌ · **Depende de:** — (front: 01; confirmação/reset/convite por e-mail: 14)
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`): API do módulo
> **3/3 áreas, ponderado 41%** (14/34 ações: auth 9, perfil 15, accounts 10); front `profile`/`security` ❌.
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

Fechar tudo que envolve entrar, sair e gerenciar a própria conta/segurança: cadastro, confirmação de
e-mail, reset/troca de senha, convite de agente, sessão (JWT + rotação), perfil, presença, MFA/TOTP,
sessões ativas e configurações da conta — com o **mesmo path/método/status/envelope do Rails OSS**.

Critérios objetivos de 100%:

1. Toda action pública dos controllers `devise_overrides/*`, `auth/resend_confirmations`,
   `api/v1/profiles`, `api/v1/profile/{mfa,sessions}` e `api/v1/accounts` responde no mesmo
   path/método/status (200/201/401/403/404/409/422) e envelope (root partial, `{data:…}`,
   `{payload:…}`, `head :ok`) — provado por smoke/curl na seção 6.
2. Os fluxos completos funcionam ponta a ponta: **cadastro → confirmação → login**, **convite →
   aceite**, **reset (token e e-mail)**, **MFA setup → login com OTP/backup**, **revogar sessão**,
   **trocar de conta ativa**.
3. Telas de auth (`login`, `signup`, `reset`, `confirmation`, `verify-email`, `invitation`) e de
   settings (`profile`, `general`) com paridade visual lado a lado e estados vazio/loading/erro.
4. `bun scripts/parity-report.mjs` → módulo 12 ponderado **100%** e front `profile` ✅
   (`security` é SAML/Enterprise — ver §7).

**Não conta como 100%:** endpoint existir com path/envelope divergente; MFA só no back sem a tela;
convite/reset apenas com `console.log` (e-mail real é dependência do módulo 14); DDL novo.

## 2. Estado atual (medido)

| Subárea                                         | Status | Evidência no nosso repo                                                                                                       | Lacuna principal                                                                                                                                             |
| ----------------------------------------------- | :----: | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sessão (sign_in/out/refresh/validate)           |   🟡   | `apps/server/src/routes/auth.ts`, `packages/core/src/lib/tokens.ts`, `apps/server/src/middlewares/auth.ts`                    | sem headers `client/expiry/token-type`; sem MFA/limite de sessão/gate de confirmação; `DELETE /auth/sign_out` e envelope de `validate_token` divergem        |
| Cadastro + confirmação                          |   ❌   | `/auth/sign_up` extra (`auth.ts`); `users.confirmed_at` nunca usado (`packages/db/src/seed.ts`)                               | falta `POST /api/v1/accounts` (AccountBuilder), `POST /auth/confirmation`, `POST /resend_confirmation`, `confirmed_at`                                       |
| Reset de senha                                  |   🟡   | `forgotPassword`/`resetPassword` em `packages/core/src/services/auth.ts`; `apps/web/src/routes/auth/reset-password.tsx`       | divergem path/método/envelope do Rails (`POST/PUT /auth/password`); token só no `console.log`; reset não confirma usuário                                    |
| Convite de agente                               |   🟡   | `inviteAgent`/`acceptInvitation` (`services/auth.ts`), `POST /accounts/:id/agents`, `apps/web/src/routes/auth/invitation.tsx` | Rails usa confirmação Devise + e-mail; nosso `/auth/invitation/accept` é fluxo próprio; convite sem e-mail                                                   |
| Perfil (show/update/avatar/tokens)              |   🟡   | `apps/server/src/routes/v1/profile.ts`, `getProfile`/`updateProfile` (`services/auth.ts`)                                     | payload camelCase e enxuto; sem avatar, `display_name`, `message_signature`, troca de senha, `phone_number`, `reset_access_token`/API token                  |
| Presença/availability                           |   🟡   | `PUT /profile/availability` (`profile.ts`) atualiza `users.availability_status`                                               | Rails atualiza `account_users.availability` (enum online 0/offline 1/busy 2); falta `auto_offline` e `set_active_account`; nosso map troca busy/offline      |
| MFA/TOTP                                        |   ❌   | — (grep zero em `apps/server/src` e `packages/core/src`)                                                                      | rotas `profile/mfa` + fluxo de login 206 + backup codes; colunas `users.otp_*` prontas no DDL                                                                |
| Sessões ativas                                  |   ❌   | — (grep zero; `user_sessions` só no schema)                                                                                   | `GET/DELETE /api/v1/profile/sessions`, tracking por `client`, 409 do limite de 25                                                                            |
| Conta (show/update/cache_keys/update_active_at) |   🟡   | `apps/server/src/routes/v1/accounts.ts`, `getAccount`/`updateAccount`                                                         | resposta `{data:{account}}` com 3 campos; faltam `domain/support_email/settings/custom_attributes/cache_keys`, `update_active_at`, `latest_chatwoot_version` |
| Exclusão de conta/usuário                       |   ❌   | `super-admin.ts` tem `DELETE /super_admin/accounts/:id` e `/users/:id` (módulo 13)                                            | self-service `DELETE /auth` (verificar) e UI de delete (Cloud/Enterprise) sem trilha                                                                         |
| Front auth + settings profile/general           |   🟡   | `apps/web/src/routes/auth/*` (4 telas), `settings/general.tsx`                                                                | faltam `auth/confirmation`, `auth/verify-email`, `settings/profile` (+ mfa), avatar/presença/token; link de perfil no rodapé                                 |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                              | O que dita para nós                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/routes.rb` (L3–9, L47–51, L470–487)                                                                                              | mount `devise_token_auth` em `/auth` + `POST /resend_confirmation`; actions de `accounts`, `profile`, `profile/mfa`, `profile/sessions`                                                                    |
| `app/controllers/devise_overrides/sessions_controller.rb`                                                                                | sign_in com MFA (206 `mfa_required`/`mfa_token`), limite de 25 sessões (409 picker), `user_not_confirmed`                                                                                                  |
| `app/controllers/devise_overrides/passwords_controller.rb`                                                                               | `POST /auth/password` → `{message}` 200; `PUT /auth/password` → payload de auth + confirma usuário                                                                                                         |
| `app/controllers/devise_overrides/confirmations_controller.rb`                                                                           | `POST /auth/confirmation` (`confirmation_token`) → login direto; 422 `Invalid token`/`Already confirmed`                                                                                                   |
| `app/controllers/devise_overrides/token_validations_controller.rb` + `app/views/devise/token.json.jbuilder`                              | `GET /auth/validate_token` → `{payload:{success, data:<user>}}`                                                                                                                                            |
| `app/controllers/auth/resend_confirmations_controller.rb`                                                                                | `POST /resend_confirmation` → sempre `head :ok`                                                                                                                                                            |
| `app/controllers/concerns/auth_helper.rb` + `config/initializers/devise_token_auth.rb`                                                   | headers `access-token/client/expiry/token-type/uid`; `max_number_of_devices=25`, token 2 meses, `remove_tokens_after_password_reset`                                                                       |
| `app/controllers/api/v1/profiles_controller.rb` + `app/views/api/v1/profiles/*`                                                          | show/update/avatar/availability/auto_offline/set_active_account/resend_confirmation/reset_access_token (root partial `_user`)                                                                              |
| `app/controllers/api/v1/profile/mfa_controller.rb` + `app/services/mfa/*`                                                                | show/create/verify/destroy/backup_codes; TOTP + 10 backup codes (`XXXXXXXX` = usado)                                                                                                                       |
| `app/controllers/api/v1/profile/sessions_controller.rb` + `app/models/user_session.rb`                                                   | index (array root) e destroy (422 se for a sessão atual); throttle de atividade 5 min                                                                                                                      |
| `app/controllers/api/v1/accounts_controller.rb`, `app/builders/{account,agent}_builder.rb`                                               | `POST /api/v1/accounts` (signup), `show/update/cache_keys/update_active_at`; convite = user + account_user + `send_confirmation_instructions`                                                              |
| `app/views/api/v1/models/_user.json.jbuilder` / `_account.json.jbuilder`                                                                 | payload normativo (snake_case, `accounts[]`, `access_token` de API, `confirmed`, `avatar_url`)                                                                                                             |
| `app/javascript/v3/views/{login,signup,auth/confirmation,auth/verify-email,auth/password/Edit,auth/reset/password,login/Index}.vue`      | telas/fluxos de auth                                                                                                                                                                                       |
| `app/javascript/dashboard/routes/dashboard/settings/{profile,security,account}` + `store/modules/auth.js`, `dashboard/api/{auth,mfa}.js` | UI de perfil/MFA/sessões/token; security é SAML (Enterprise)                                                                                                                                               |
| Tabelas (DDL fechado na trilha D)                                                                                                        | `access_tokens`, `user_sessions`, `users.confirmed_at/confirmation_token/reset_password_token/otp_*`, `account_users.availability/auto_offline/active_at/inviter_id`, `account_saml_settings` (só leitura) |

## 4. Lacunas detalhadas

### 4.1 API

- [ ] `POST /auth/sign_in` — Rails `DeviseOverrides::Sessions#create` — body `{email,password}` →
      `{data:<user>}` + headers Devise; `206 {mfa_required,mfa_token}` se MFA; `409 {sessions_limit_reached,sessions}`;
      `401 {error,error_code:'user_not_confirmed'}` — completar `auth.ts` + `services/auth.ts` (**12-1**, **12-8**, **12-9**).
- [ ] `GET /auth/sign_in` — Rails `sessions#new` — redirect 302 para `/app/login?error=access-denied`
      (rota trivial) — junto do OmniAuth (**12-10**).
- [ ] `DELETE /auth/sign_out` — Rails `sessions#destroy` — `head :ok` com headers de sessão — nosso é
      `POST /auth/sign_out` com `{refresh_token}`: manter o body como extensão, aceitar `DELETE` — (**12-1**).
- [ ] `GET /auth/validate_token` — Rails `token_validations#validate_token` — `200 {payload:{success:true,data:<user>}}`;
      `401` — hoje devolvemos `{data:{user}}` — ajustar envelope sem quebrar o front — (**12-4**).
- [ ] `POST /api/v1/accounts` — Rails `AccountsController#create` + `AccountBuilder` — body
      `{account_name,user_full_name,email,password,locale?,h_captcha_client_response?}`; web sem sessão →
      `200 {email}`; logado/api-only → `send_auth_headers` + `{data:{id,email,account_id,…}}`; 422
      `UserExists`/`InvalidParams` — criar rota em `apps/server/src/routes/v1/accounts.ts`; front migra
      do `/auth/sign_up` (**12-2**; captcha: verificar).
- [ ] `POST /auth/confirmation` — Rails `confirmations#create` — body `{confirmation_token}` → `{data:<user>}`
  - headers; 422 `{message:'Invalid token'|'Already confirmed'}` — implementar com
    `users.confirmation_token` (digest) + `confirmed_at` (**12-3**).
- [ ] `POST /resend_confirmation` — Rails `Auth::ResendConfirmations#create` — body `{email,h_captcha_client_response?}`
      → sempre `200 head` (não vaza existência) — raiz do server (fora de `/api/v1`) (**12-3**).
- [ ] `POST /auth/password` — Rails `passwords#create` — `200 {message}` sempre; dispara e-mail de reset
      (hoje só `console.log` — depende do módulo 14); `PUT /auth/password` com
      `{reset_password_token,password,password_confirmation}` → `{data:<user>}` + headers; 422
      `{message:'Invalid token',redirect_url:'/'}`; reset confirma o usuário — (**12-5**).
- [ ] `DELETE /auth` (registrations destroy) — Rails `DeviseTokenAuth::Registrations#destroy` (verificar
      envelope/status) — auto-exclusão de usuário; não usado pela UI OSS do dashboard — (**12-11**).
- [ ] OmniAuth `GET /auth/omniauth/:provider` + callback `omniauth_success` — OSS, mas exige provider
      Google configurado; testável com mock do auth_hash (verificar) — (**12-10**).
- [ ] `GET /api/v1/profile` — Rails `profiles#show` — root partial `_user`: `id,name,email,display_name,
avatar_url,confirmed,message_signature,provider,uid,pubsub_token,ui_settings,access_token` (API token),
      `account_id,role,inviter_id,accounts[]` (`availability,auto_offline,active_at,role,status`) — ajustar
      `toApiUser` para snake_case/campos Rails (**12-6**).
- [ ] `PUT/PATCH /api/v1/profile` — Rails `profiles#update` — body nested `profile[...]`: `name,email,
display_name,message_signature,avatar,ui_settings,phone_number` + `password,password_confirmation,
current_password` (422 se senha atual errada); troca de e-mail dispara reconfirmação
      (`unconfirmed_email`) — (**12-6**, **12-7**).
- [ ] `DELETE /api/v1/profile/avatar` — Rails `profiles#avatar` — remove anexo e devolve partial raiz (**12-7**).
- [ ] `POST /api/v1/profile/availability` — Rails `profiles#availability` — body `{profile:{account_id,availability}}`
      → `account_users.availability` + partial raiz — substituir o `PUT` atual (que grava em `users` e troca
      busy/offline) — (**12-8**).
- [ ] `POST /api/v1/profile/auto_offline` — Rails `profiles#auto_offline` — body `{profile:{account_id,auto_offline}}`
      → `account_users.auto_offline` + partial raiz (**12-8**).
- [ ] `PUT /api/v1/profile/set_active_account` — Rails `profiles#set_active_account` — body `{profile:{account_id}}`
      → `account_users.active_at = now`, `head :ok` (**12-8**).
- [ ] `POST /api/v1/profile/resend_confirmation` — Rails `profiles#resend_confirmation` — `head :ok`;
      só envia se `!confirmed?` (**12-3**).
- [ ] `POST /api/v1/profile/reset_access_token` — Rails `profiles#reset_access_token` — regenera o
      **API access token** (`access_tokens` owner `User`) e devolve partial `_user` com o novo token (**12-6**).
- [ ] `GET/POST/DELETE /api/v1/profile/mfa` — Rails `mfa#show/create/destroy` — show:
      `{feature_available,enabled,backup_codes_generated?,remaining_backup_codes?}`; create:
      `{provisioning_url,secret}`; destroy (body `{password,otp_code|backup_code}`): `{enabled:false}`;
      403 `{error}` (feature indisponível) e 422 `{error}` (chaves `errors.mfa.*`: already_enabled/
      not_enabled/invalid_code/invalid_credentials) — no Rails `feature_available` depende das chaves de
      ActiveRecord encryption; no nosso, de `ENABLE_MFA`/chave própria (verificar) (**12-9**).
- [ ] `POST /api/v1/profile/mfa/verify` + `/backup_codes` — Rails `mfa#verify` (`{enabled:true,backup_codes:[10]}`)
      e `#backup_codes` (`{backup_codes:[10]}`); OTP `{otp_code}`, backup `{backup_code}` (**12-9**).
- [ ] `GET /api/v1/profile/sessions` — Rails `sessions#index` — **array root** com `id,browser_name,
browser_version,device_name,platform_name,platform_version,ip_address,city,country,country_code,
last_activity_at,created_at,current` (**12-12**).
- [ ] `DELETE /api/v1/profile/sessions/:id` — Rails `sessions#destroy` — `head :ok`; `422
{error:<mensagem i18n de "não pode revogar a sessão atual">}`; remove o token do client revogado (**12-12**).
- [ ] `GET /api/v1/accounts/:id` — Rails `accounts#show` — root `_account` (`settings,created_at,
custom_attributes,domain,features,id,locale,name,support_email,status,cache_keys`) +
      `latest_chatwoot_version` (Redis; `null` sem Redis) — hoje `{data:{account}}` com 3 campos (**12-13**).
- [ ] `PATCH/PUT /api/v1/accounts/:id` — Rails `accounts#update` — `name,locale,domain,support_email,
settings(auto_resolve_*,audio_transcriptions),custom_attributes(...)` + onboarding_step — ampliar
      `UpdateAccountSchema`/`updateAccount` (**12-13**).
- [ ] `GET /api/v1/accounts/:id/cache_keys` — Rails `accounts#cache_keys` — `200 {cache_keys:{label,inbox,
team,canned_response}}` (timestamps; hoje sem Redis: derivar de `max(updated_at)` por tabela —
      verificar semântica) (**12-14**).
- [ ] `POST /api/v1/accounts/:id/update_active_at` — Rails `accounts#update_active_at` — `head :ok`,
      `account_users.active_at = now` — chamar no heartbeat/troca de conta (**12-14**).
- [ ] `GET /api/v1/accounts` (nossa extensão; Rails não tem index v1) — manter para o seletor, mas o
      partial `_user.accounts[]` passa a ser a fonte primária (**12-6**).

### 4.2 Front

- [ ] `/auth/login` — ref. `v3/views/login/Index.vue` — adicionar passo MFA (`MfaVerification.vue`),
      tratar 409 (picker de sessões) e `error_code` (`user_not_confirmed`, `access-denied`) — `apps/web/src/routes/auth/login.tsx` (**12-15**).
- [ ] `/auth/signup` — ref. `v3/views/auth/signup/*` — só `email`+`password` (nome/conta derivados do
      e-mail por `getCredentialsFromEmail`), requisitos de senha e redirect para `/auth/verify-email`;
      postar em `api/v1/accounts` — `apps/web/src/routes/auth/signup.tsx` (**12-2**, **12-15**).
- [ ] `/auth/verify-email` (nova) — ref. `v3/views/auth/verify-email/Index.vue` — aviso + botão
      “Reenviar confirmação” → `POST /resend_confirmation` — `apps/web/src/routes/auth/verify-email.tsx` (**12-15**).
- [ ] `/auth/confirmation` (nova) — ref. `v3/views/auth/confirmation/Index.vue` — consome
      `?confirmation_token=` → `POST /auth/confirmation` → entra no app (ou back para login) (**12-15**).
- [ ] `/auth/password/edit` (nova) — ref. `v3/views/auth/password/Edit.vue` — `?reset_password_token=`
  - senha/confirmação → `PUT /auth/password`; `/auth/reset-password` vira só o pedido por e-mail —
    `apps/web/src/routes/auth/*.tsx` (**12-15**).
- [ ] `/auth/invitation` — ref. confirmação Devise — decidir entre consumir `POST /auth/confirmation`
      direto ou manter o passo de senha como extensão (verificar); link do e-mail aponta para cá (**12-6**, **12-15**).
- [ ] `/app/settings/profile` (nova) — ref. `dashboard/settings/profile/Index.vue` — avatar, dados
      básicos, assinatura, idioma/fonte, hotkeys, troca de senha, MFA, sessões ativas, API token e
      preferências (notificações ficam no módulo 11) — `apps/web/src/routes/_auth/app/settings/profile.tsx` (**12-16**).
- [ ] `/app/settings/profile/mfa` (nova) — ref. `MfaSettings.vue`/`MfaSetupWizard.vue`/`MfaStatusCard.vue` —
      wizard QR + verificação + backup codes e ações de gerenciamento (**12-16**).
- [ ] `/app/settings/general` — ref. `settings/account/Index.vue` — ampliar com domínio/support email
      condicionais e `AccountId`/`BuildInfo`; deleção de conta só se feature cloud (fora — §7) (**12-13**, **12-17**).
- [ ] `/app/settings/security` — ref. `settings/security/Index.vue` — é **SAML (Enterprise)** e no OSS
      self-hosted a própria rota Vue não é registrada: fica fora deste módulo (**12-17**, §7).
- [ ] Rodapé do dashboard — ref. menu de perfil Vue — devolver link “Configurações do perfil” e usar
      `account_users.availability`; ao trocar conta chamar `set_active_account`/`update_active_at` —
      `apps/web/src/components/app-sidebar.tsx` (**12-8**, **12-16**).

### 4.3 Dados, jobs e realtime

- [ ] `users`: passar a usar `confirmed_at/confirmation_token/confirmation_sent_at/unconfirmed_email`
      (reconfirmação na troca de e-mail), `reset_password_*`, `otp_secret/otp_required_for_login/otp_backup_codes/consumed_timestep`,
      `display_name/message_signature/ui_settings/custom_attributes` — **sem DDL** (**12-3**, **12-6**, **12-9**).
- [ ] `account_users`: `availability` (online 0 · offline 1 · busy 2), `auto_offline` (default true),
      `active_at`, `inviter_id` — corrigir o enum e a tabela usados hoje (**12-8**).
- [ ] `user_sessions`: gravar no sign_in/sign_up (client, ip, user-agent parseado), atualizar
      `last_activity_at` com throttle de 5 min e apagar sessões sem token ativo (**12-12**).
- [ ] `access_tokens`: API token do usuário (owner type `User`, regenerado no `reset_access_token`) +
      nossos tipos opacos (`refresh`, `password_reset`, `invitation`, `confirmation`); formatos/token de
      convite (verificar) (**12-3**, **12-6**).
- [ ] Jobs/e-mail: `send_confirmation_instructions` e `send_reset_password_instructions` via módulo 14
      (hoje `console.log`) — **12-3/12-5/12-6 só fecham com o 14**; eventos de cache (`ACCOUNT_CACHE_INVALIDATED`)
      para `cache_keys` (verificar) (**12-14**).

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                                                                      | Arquivos-alvo                                                                                                                                       | Depende    |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 12-1  | Headers Devise (`access-token/client/expiry/token-type/uid`), `DELETE /auth/sign_out` e envelope do login (`{data:<user>}` + `refresh_token` como extensão) | `apps/server/src/routes/auth.ts`, `packages/core/src/services/auth.ts`, `packages/core/src/lib/tokens.ts`                                           | —          |
| 12-2  | `POST /api/v1/accounts` (AccountBuilder/captcha verificar) + front migrado do `/auth/sign_up`                                                               | `apps/server/src/routes/v1/accounts.ts`, `packages/core/src/services/auth.ts`, `apps/web/src/routes/auth/signup.tsx`                                | 12-1       |
| 12-3  | Confirmação: `POST /auth/confirmation`, `POST /resend_confirmation`, `POST /profile/resend_confirmation`, tokens/`confirmed_at` e reconfirmação             | `packages/core/src/services/auth.ts`, `apps/server/src/routes/auth.ts`, `apps/server/src/routes/v1/profile.ts`, `packages/core/src/schemas/auth.ts` | 12-2, 14   |
| 12-4  | `validate_token` no envelope `{payload:{success,data}}` + gate `user_not_confirmed` no sign_in                                                              | `apps/server/src/routes/auth.ts`, `packages/core/src/services/auth.ts`                                                                              | 12-3       |
| 12-5  | Reset 1:1: `POST /auth/password` (`{message}`) e `PUT /auth/password` (confirma usuário, revoga tokens)                                                     | `apps/server/src/routes/auth.ts`, `packages/core/src/services/auth.ts`, `packages/core/src/schemas/auth.ts`                                         | 14         |
| 12-6  | Perfil API: partial `_user` completo + `PUT/PATCH`, troca de e-mail/senha e API token (`reset_access_token`)                                                | `packages/core/src/services/auth.ts`, `apps/server/src/routes/v1/profile.ts`, `packages/core/src/schemas/auth.ts`                                   | 12-1       |
| 12-7  | Avatar do usuário (upload/remoção via storage)                                                                                                              | `apps/server/src/routes/v1/profile.ts`, `packages/core/src/lib/storage.ts`, `packages/core/src/services/auth.ts`                                    | 12-6       |
| 12-8  | `availability`/`auto_offline`/`set_active_account` em `account_users` (enum 0/1/2) + rodapé/seletor                                                         | `apps/server/src/routes/v1/profile.ts`, `packages/core/src/services/auth.ts`, `apps/web/src/components/app-sidebar.tsx`                             | 12-6       |
| 12-9  | MFA/TOTP completo (show/create/verify/destroy/backup_codes) + login 206 + cifra do segredo                                                                  | `packages/core/src/services/mfa.ts` (novo), `apps/server/src/routes/v1/profile.ts`, `apps/server/src/routes/auth.ts`                                | 12-1, 12-6 |
| 12-10 | OmniAuth Google (callback `omniauth_success`) com mock de auth_hash (verificar provider/escopo)                                                             | `apps/server/src/routes/auth.ts`, `packages/core/src/services/auth.ts`                                                                              | 12-3       |
| 12-11 | Auto-exclusão `DELETE /auth` (verificar contrato) e caminho de exclusão no console (13)                                                                     | `apps/server/src/routes/auth.ts`, `apps/server/src/routes/super-admin.ts`                                                                           | 12-6       |
| 12-12 | Sessões: tracking por `client` + `GET/DELETE /profile/sessions` + limite 25/409 picker                                                                      | `packages/core/src/services/sessions.ts` (novo), `apps/server/src/routes/v1/profile.ts`, `packages/core/src/services/auth.ts`                       | 12-1       |
| 12-13 | Conta: `show`/`update` completos (root `_account`, domain/support_email/settings/custom_attributes)                                                         | `apps/server/src/routes/v1/accounts.ts`, `packages/core/src/services/auth.ts`, `packages/core/src/schemas/auth.ts`                                  | —          |
| 12-14 | `cache_keys` + `update_active_at`                                                                                                                           | `apps/server/src/routes/v1/accounts.ts`, `packages/core/src/services/auth.ts`                                                                       | 12-13      |
| 12-15 | Telas de auth: MFA no login, verify-email, confirmation, password/edit, reset e invitation                                                                  | `apps/web/src/routes/auth/*.tsx`, `apps/web/src/lib/auth.ts`                                                                                        | 12-1–12-5  |
| 12-16 | Settings profile + MFA no dashboard (avatar, senha, API token, sessões, footer)                                                                             | `apps/web/src/routes/_auth/app/settings/profile*.tsx`, `apps/web/src/components/app-sidebar.tsx`                                                    | 12-6–12-12 |
| 12-17 | Settings general: domínio/support email condicionais, `AccountId`/`BuildInfo` (SAML/security fica fora — §7)                                                | `apps/web/src/routes/_auth/app/settings/general.tsx`                                                                                                | 12-13      |
| 12-18 | Smoke/curl de todos os endpoints do §4.1 + evidências no `parity-report` e shots                                                                            | `scripts/parity-report.mjs` (mapa já cobre), `scripts/shot.mjs`                                                                                     | 12-1–12-17 |
| 12-19 | Atualizar `docs/specs/paridade-mapa.md`/`roadmap.md` (módulo 12 ✅) com aceite cumprido                                                                     | `docs/specs/paridade-mapa.md`, `roadmap.md`                                                                                                         | 12-18      |

## 6. Aceite

```bash
bun run check-types && bunx oxlint
bun scripts/parity-report.mjs --write-doc   # módulo 12 ponderado → 100%; front profile ✅
bun scripts/e2e.mjs                         # 13/13 continua verde
bun scripts/shot.mjs                        # shots de /auth/* e settings/profile|general

# --- fluxo 1: cadastro → confirmação → login ---
curl -sX POST localhost:3000/api/v1/accounts -H 'content-type: application/json' \
  -d '{"account_name":"Acme","user_full_name":"Ana","email":"ana@acme.test","password":"password123"}'
# dev: token no log da API / e-mail no MailHog (módulo 14)
curl -sX POST localhost:3000/auth/confirmation -H 'content-type: application/json' \
  -d '{"confirmation_token":"<token>"}'
curl -sX POST localhost:3000/auth/sign_in -H 'content-type: application/json' \
  -d '{"email":"ana@acme.test","password":"password123"}' -D -   # headers access-token/client/uid/expiry/token-type

# --- fluxo 2: convite → aceite ---
curl -sX POST localhost:3000/api/v1/accounts/1/agents -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"email":"bob@acme.test","role":"agent"}'   # 201
# e-mail (14) → /auth/confirmation?confirmation_token=... → login

# --- fluxo 3: reset de senha (token e e-mail) ---
curl -sX POST localhost:3000/auth/password -H 'content-type: application/json' \
  -d '{"email":"ana@acme.test"}'                                                       # 200 {message}
curl -sX PUT localhost:3000/auth/password -H 'content-type: application/json' \
  -d '{"reset_password_token":"<t>","password":"nova12345","password_confirmation":"nova12345"}'

# --- fluxo 4: MFA/TOTP ---
curl -sX POST localhost:3000/api/v1/profile/mfa -H "Authorization: Bearer $TOKEN"      # provisioning_url+secret
curl -sX POST localhost:3000/api/v1/profile/mfa/verify -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"otp_code":"123456"}'                       # backup_codes[10]
curl -sX POST localhost:3000/auth/sign_in -H 'content-type: application/json' \
  -d '{"email":"ana@acme.test","password":"nova12345"}'                                # 206 mfa_required
curl -sX POST localhost:3000/auth/sign_in -H 'content-type: application/json' \
  -d '{"mfa_token":"<t>","otp_code":"123456"}'                                         # 200 + headers

# --- fluxo 5: sessões e conta ---
curl -s localhost:3000/api/v1/profile/sessions -H "Authorization: Bearer $TOKEN"       # array root
curl -sX DELETE localhost:3000/api/v1/profile/sessions/2 -H "Authorization: Bearer $TOKEN"  # 200 ou 422 se atual
curl -s localhost:3000/api/v1/accounts/1/cache_keys -H "Authorization: Bearer $TOKEN"
curl -sX POST localhost:3000/api/v1/accounts/1/update_active_at -H "Authorization: Bearer $TOKEN"
```

- [ ] §4.1 com path/método/status/envelope iguais ao Rails (401/403/404/409/422) provado pelos curls.
- [ ] Fluxos completos verdes: cadastro→confirmação→login; convite→aceite; reset token/e-mail
      (MailHog do 14); MFA setup→login OTP/backup; revogação de sessão; troca de conta ativa.
- [ ] Telas de auth + settings profile/general com comparação visual lado a lado (`shots/`) e
      estados vazio/loading/erro; `parity-report` front `profile` ✅.
- [ ] `check-types`, `oxlint`, `e2e` 13/13 sem regressão; DDL intacto (`schema-diff` + roundtrip).

## 7. Fora de escopo

- **Enterprise (fora por licença):** SAML (`settings/security`, login SAML, `account_saml_settings`
  fica apenas como tabela lida pelo dump — não usada aqui), custom roles, `toggle_deletion`/deleção
  de conta na nuvem, auditoria enterprise de sessão.
- **Exclusão self-service de conta:** só existe no cloud/enterprise; no OSS a deleção é via superadmin
  (`DELETE /super_admin/accounts/:id` e `/users/:id`, módulo 13) e Platform API (13). O módulo 12 só
  cobre auto-exclusão de usuário `DELETE /auth` (verificar) e delega UI cloud ao módulo 13.
- **OAuth de login (OmniAuth Google):** entra como tarefa OSS (12-10), mas providers/callbacks de
  canais ficam no módulo 10; sem credencial real o teste é por mock (verificar).
- **hCaptcha/rate-limit:** validação só quando as chaves existem (verificar); rate-limit de
  `resend_confirmation` não é Rack::Attack nosso — depende de decisão de infra.
- **Preferências de notificação/som:** módulo 11. **Mailers/layout/SMTP:** módulo 14.
  **i18n e pipeline/CI:** fora do roadmap inteiro.
- **DDL:** nenhuma coluna nova; `access_tokens`/`user_sessions`/`users.otp_*` já bastam.

## 8. Definição de done

Para marcar 12 ✅ no `roadmap.md`:

1. Tarefas `12-1`…`12-19` `[x]`, com §4.1 sem nenhum item aberto.
2. `bun run check-types` + `bunx oxlint` verdes; `bun scripts/e2e.mjs` 13/13; DDL com
   `schema-diff`/roundtrip PASS (sem drift novo).
3. `scripts/parity-report.mjs` regerado: módulo **12 ponderado 100%** (34/34 ações) e front
   `profile` ✅; `docs/specs/paridade-mapa.md` + `roadmap.md` atualizados.
4. Evidências commitadas no doc: saída dos curls dos 5 fluxos, screenshots em `shots/` (login,
   signup, verify-email, confirmation, reset, profile, mfa, general) e o recorte do relatório.
5. Nenhum `console.log` de token em produção: convite/reset/confirmação saem por e-mail (módulo 14)
   e o token em dev só aparece sob flag (`NODE_ENV !== 'production'`).
