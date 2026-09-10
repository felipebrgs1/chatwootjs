# Mapa de paridade — Chatwoot 4.17.1 (OSS) × ChatwootJS

> Gerado por `bun scripts/parity-report.mjs --write-doc` (não editar à mão).
> Baseline: 2026-09-10 · API 26/33 áreas (79%) · ponderado por ações 46% · Front 15/28 (54%).

## API

| Área | Rails (ações) | Status | Nossas rotas |
| --- | ---: | :-: | ---: |
| accounts | 10 | ✅ | 3 |
| auth | 9 | ✅ | 8 |
| perfil | 15 | ✅ | 3 |
| agents | 6 | ✅ | 6 |
| agent_bots | 16 | ✅ | 11 |
| inboxes | 24 | ✅ | 25 |
| whatsapp | 5 | ✅ | 3 |
| assignment | 9 | ❌ | 0 |
| contacts | 35 | ✅ | 19 |
| custom_filters | 5 | ✅ | 8 |
| conversations | 56 | ✅ | 29 |
| csat | 6 | ✅ | 3 |
| automation | 6 | ✅ | 5 |
| macros | 6 | ✅ | 5 |
| canned | 4 | ✅ | 4 |
| labels | 7 | ✅ | 8 |
| teams | 9 | ✅ | 9 |
| webhooks | 4 | ✅ | 22 |
| campaigns | 6 | ✅ | 6 |
| integrations | 36 | ❌ | 0 |
| data_imports | 9 | ✅ | 11 |
| reports_v2 | 24 | ❌ | 0 |
| notifications | 12 | ✅ | 13 |
| search | 6 | ✅ | 10 |
| helpcenter | 35 | ✅ | 14 |
| captain | 7 | ✅ | 11 |
| oauth_authorizations | 16 | ❌ | 0 |
| widget | 24 | ✅ | 9 |
| platform | 24 | ❌ | 0 |
| public_inbox | 13 | ❌ | 0 |
| superadmin | 40 | ✅ | 9 |
| webhooks_externos | 11 | ✅ | 22 |
| onboarding | 4 | ❌ | 0 |

## Front

| Área | Status |
| --- | :-: |
| conversations | ✅ |
| contacts | ✅ |
| companies | ✅ |
| campaigns | ✅ |
| helpcenter | ✅ |
| inbox-settings | ✅ |
| agents | ✅ |
| teams | ✅ |
| labels | ✅ |
| canned | ✅ |
| macros | ✅ |
| automation | ✅ |
| attributes | ✅ |
| auditlogs | ✅ |
| reports | ✅ |
| profile | ❌ |
| security | ❌ |
| data | ❌ |
| assignment-policy | ❌ |
| integrations | ❌ |
| templates | ❌ |
| agent-bots | ❌ |
| onboarding | ❌ |
| customviews | ❌ |
| commands | ❌ |
| noAccounts | ❌ |
| suspended | ❌ |
| upgrade | ❌ |
| captain (enterprise) | — |
| calls (enterprise) | — |
| sla (enterprise) | — |
| custom-roles (enterprise) | — |
| conversation-workflow (enterprise) | — |
| billing (stub) | — |

## Por módulo do roadmap

| # | Módulo | Áreas API cobertas | Ponderado por ações |
| -: | --- | :-: | ---: |
| 01 | Dashboard | — | — |
| 02 | Conversas & Mensagens | 1/1 | 52% |
| 03 | Contatos & Empresas | 1/1 | 54% |
| 04 | Inboxes & Canais | 2/2 | 93% |
| 05 | Atribuição, Times & Agentes | 2/3 | 63% |
| 06 | Automação, Macros, Canned & Webhooks | 5/5 | 93% |
| 07 | Relatórios & CSAT | 1/2 | 10% |
| 08 | Help Center | 1/1 | 40% |
| 09 | Widget & API Pública | 1/2 | 24% |
| 10 | Integrações & Apps | 0/2 | 0% |
| 11 | Notificações, Busca & Comandos | 2/2 | 100% |
| 12 | Auth, Conta & Segurança | 3/3 | 41% |
| 13 | Superadmin, Platform & Onboarding | 1/3 | 13% |
| 14 | E-mail, Jobs & Realtime | — | — |
| 15 | Captain & IA | 1/1 | 100% |

## Exclusões

- Infraestrutura/root: health, swagger, asset links, widget tests.
- `concerns/` (não são endpoints).
- Enterprise (licença separada): captain avançado, calls, SLA, custom roles, conversation workflow, billing.
- i18n e pipeline/CI (decisão de escopo R0).
