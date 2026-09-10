# 01 — Dashboard

> **Estágio:** 01/15 · **Status:** 1 ✅ · 9 🟡 · 1 ❌ (shell existe; fidelidade v4 incompleta) · **Depende de:** — (baseline R1)
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`)
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora.

## 1. Objetivo e definição de 100%

Entrega o **shell do dashboard**: o chrome que envolve todas as páginas — layout
sidebar + área principal (4 colunas quando há conversa aberta: sidebar · lista ·
thread · detalhes), árvore de navegação orientada a dados, resize/colapso, temas
claro/escuro, command bar (⌘K), account switcher, perfil/disponibilidade, estados
vazios/loading/erro, rotas base do TanStack Router e comportamento mobile.

**100% quando (objetivo e testável):**

1. **Visual 1:1** — lado a lado em 1600×900 e 375×812 contra
   `chatwoot/.github/screenshots/dashboard.png`, `dashboard-dark.png` e o Vue 4.17.1
   (`components-next/sidebar/*`): sidebar branca, raio 8px, lucide, linhas `h-8`,
   tree-line, badges, rodapé de perfil e sombras dos painéis.
2. **Comportamento 1:1** — largura `200` default / `56` min / `320` max / colapso
   `< 160` com snap; duplo clique alterna colapsada↔expandida; largura persistida
   por usuário em `users.ui_settings.sidebar_width` (não só localStorage);
   accordion (1 grupo aberto), auto-expansão do grupo ativo, popover na versão
   colapsada, sort e minimização de subgrupos persistidos.
3. **Navegação 1:1** — todos os itens do `menuItems` do `Sidebar.vue` existem,
   apontam para rotas reais e respeitam role/feature flag. `Notificações` não é
   grupo da sidebar (é o sino) e não sobra item `soon`/morto.
4. **Estados do shell** — `/app/no-accounts`, `suspended`, 404 e error boundary com
   `EmptyState`; loading com skeleton; trocar de conta não perde rota nem sessão.
5. **Aceite local verde** — comandos da §6 + `parity-report` movendo as áreas front
   `commands`, `noAccounts` e `suspended` para ✅ (mais as áreas que o doc tocar).

**NÃO conta como 100%:** implementar conteúdo dos módulos 02–15 (thread, filtros,
relatórios, settings etc.), i18n, itens cloud/enterprise (changelog, billing,
upgrade, custom roles, SLA, calls, workflow), busca indexada por domínio (módulo 11
— aqui só o shell do command bar) nem alterar DDL.

## 2. Estado atual (medido)

| Subárea                         | Status | Evidência no nosso repo                                                                                            | Lacuna principal                                                                                          |
| ------------------------------- | :----: | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Shell / layout de 4 colunas     |   🟡   | `apps/web/src/routes/_auth.tsx:18-30`; `components/conversations/ConversationsPage.tsx:230-288`                    | sem mobile; URL sem `accounts/:accountId`; fundo `bg-n-surface-1` não replicado                           |
| Sidebar / árvore de navegação   |   🟡   | `components/app-sidebar.tsx:175-278`                                                                               | NAV hardcoded; sem Times/Pastas/badges/sort/popover; grupo `Notificações` inexistente no original         |
| Resize / colapso / persistência |   🟡   | `components/app-sidebar.tsx:682-716`                                                                               | default 240 e threshold 120 (original 200/160); sem snap; duplo clique reseta; largura só em localStorage |
| Account switcher                |   🟡   | `components/app-sidebar.tsx:419-458`; `session-provider.tsx:20-27`                                                 | sempre visível, sem role/sort/"nova conta", sem `set_active_account`                                      |
| Perfil / disponibilidade        |   🟡   | `components/app-sidebar.tsx:574-679`; `apps/server/src/routes/v1/profile.ts:32`                                    | sem auto-offline, atalhos, perfil/docs/changelog; disponibilidade só pulsa na rota de conversas           |
| Temas (dark mode)               |   🟡   | `components/theme-provider.tsx`; `packages/ui/src/styles/globals.css:44-106`                                       | só subconjunto `--woot-*`; faltam tokens `n-*`; sem comandos de aparência                                 |
| Command bar / ⌘K                |   🟡   | `components/search/CommandPalette.tsx`; botão inerte em `app-sidebar.tsx:462-477`                                  | abre só no teclado; apenas busca; sem go-to/aparência/atalhos/recentes                                    |
| Estados vazios / loading / erro |   🟡   | `packages/ui/.../empty-state.tsx`, `skeleton.tsx`; `apps/web/src/components/loader.tsx`                            | sem 404/error boundary/no-accounts/suspended; skeleton pouco usado                                        |
| Mobile / responsivo             |   ❌   | sem `matchMedia`/hook de viewport; único breakpoint do shell é `hidden md:block` no handle (`app-sidebar.tsx:691`) | sidebar fixa em qualquer largura; sem launcher/flyout                                                     |
| Dados (`users.ui_settings`)     |   ✅   | `packages/db/src/schema/auth.ts:207` (jsonb default `{}`)                                                          | DDL pronto — só passar a usar (`sidebar_width`)                                                           |
| Evidência visual / scripts      |   🟡   | `scripts/shot.mjs`                                                                                                 | shots não cobrem colapso, dark, ⌘K nem mobile                                                             |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                                                             | O que dita para nós                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `app/javascript/dashboard/routes/index.js` + `routes/dashboard/dashboard.routes.js` + `Dashboard.vue`                                                                   | rotas base account-scoped, shell, modais, mobile launcher                                  |
| `components-next/sidebar/Sidebar.vue`                                                                                                                                   | ordem/estrutura do `menuItems`, colapso, resize, árvore                                    |
| `components-next/sidebar/provider.js`                                                                                                                                   | constantes 200/56/320/160; `sidebar_width` em `ui_settings`                                |
| `components-next/sidebar/{SidebarGroup,SidebarSubGroup,SidebarGroupHeader,SidebarGroupLeaf,ChannelLeaf,SidebarUnreadBadge,SidebarSortMenu,SidebarCollapsedPopover}.vue` | árvore, tree-line, badges, sort, popover                                                   |
| `components-next/sidebar/{SidebarAccountSwitcher,SidebarProfileMenu,SidebarProfileMenuStatus}.vue`                                                                      | conta, perfil, disponibilidade, auto-offline                                               |
| `components-next/sidebar/MobileSidebarLauncher.vue`                                                                                                                     | flyout `<768px`, launcher e regras de rota                                                 |
| `components-next/sidebar/useSidebarKeyboardShortcuts.js`                                                                                                                | `$mod+/`, `$mod+Esc`, Alt+C/V/R/S                                                          |
| `routes/dashboard/commands/commandbar.vue` + `components/widgets/modal/WootKeyShortcutModal.vue` + `composables/commands/*`                                             | comandos go-to/aparência e modal de atalhos                                                |
| `helper/themeHelper.js` + `assets/scss/_next-colors.scss` + `composables/utils/useKbd.js`                                                                               | dark mode (classe `dark`, chave `color_scheme`) e símbolos de tecla                        |
| `composables/useUISettings.js` + `store/modules/auth.js` (`updateUISettings`)                                                                                           | persistência de `sidebar_width` via `PUT /api/v1/profile` (`{ profile: { ui_settings } }`) |
| `routes/dashboard/noAccounts/Index.vue` + `suspended/Index.vue`                                                                                                         | estados sem conta / conta suspensa                                                         |
| `db/schema.rb` → `users.ui_settings`                                                                                                                                    | dado (DDL fechado na trilha D — não alterar)                                               |

## 4. Lacunas detalhadas

### 4.1 API

Sem endpoints próprios: o shell usa apenas rotas de perfil **já existentes**. As
divergências abaixo são dívida do módulo 12 (perfil/segurança); aqui aparecem porque
o menu depende delas.

- [ ] `POST /api/v1/profile/availability` — Rails `profiles#availability` com
      `{ profile: { account_id, availability } }`; o nosso é `PUT /api/v1/profile/availability`
      com `{ availability }` (`apps/server/src/routes/v1/profile.ts:32`,
      `AvailabilityBodySchema`). Alinhar método/envelope no módulo 12; até lá o menu usa o existente.
- [ ] `POST /api/v1/profile/auto_offline` — Rails `profiles#auto_offline`
      (`{ profile: { account_id, auto_offline } }`); ausente no nosso server (R0 §3.1).
      Bloqueia o toggle "auto offline" (tarefa 01-8).
- [ ] `PUT /api/v1/profile/set_active_account` — Rails `profiles#set_active_account`;
      ausente. Melhora o account switcher (01-7), não bloqueia.
- [ ] `PATCH /api/v1/profile` — Rails `profiles#update` aceita `{ profile: { ui_settings } }`;
      o nosso aceita `{ ui_settings }` plano (`UpdateProfileSchema`). Usado por 01-2;
      alinhamento de envelope fica no módulo 12. (verificar)
- [ ] `GET /api/v1/accounts/:account_id/conversations/unread_counts` — Rails
      `conversations/unread_counts#index`; ausente (módulos 02/11). Alimenta os badges
      da sidebar (01-5) atrás da flag `conversation_unread_counts`.

### 4.2 Front

**Sidebar / árvore**

- [ ] `sidebar-items.ts` — refs `Sidebar.vue`/`SidebarGroup.vue` — menu dirigido por
      dados com a ordem canônica: Inbox, Conversas (Todas, Menções, Participando, Sem
      atendimento, Pastas, Times, Canais, Etiquetas), Contatos (Todos/Ativos/Segmentos/
      Etiquetados), Empresas, Relatórios (Visão geral/conversas/agente/etiqueta/inbox/
      time/CSAT), Campanhas (Live chat/SMS/WhatsApp), Help Center (Artigos/Categorias/
      Locales/Settings), Configurações (completa). Hoje `app-sidebar.tsx:175-278`
      hardcoda e cria o grupo `Notificações` que não existe no original. Arquivo a
      criar: `apps/web/src/components/sidebar/sidebar-items.ts`.
- [ ] Gating por role (`session.account.role === "administrator"` para itens de
      settings) e feature flags de `packages/core/src/lib/feature-flags.ts`
      (`advanced_assignment`, `data_import`, `conversation_unread_counts`, `companies`,
      `captain_tasks`); esconder enterprise (custom roles, SLA, conversation workflow,
      billing/calls) como o `Policy`/`usePolicy` do Vue.
- [ ] Accordion único (1 grupo aberto por vez) + auto-expansão do grupo do filho
      ativo + clique no ícone colapsado navega para o primeiro filho
      (`SidebarGroup.vue:200-235`). Hoje `openGroups` permite vários abertos.
- [ ] Tree-line dos subgrupos/filhos (`SidebarSubGroup`, `SidebarGroupLeaf`, classes
      `child-item`/`before:`), ativo `bg-n-alpha-2 text-n-slate-12`, hover em gradiente.
- [ ] `SidebarCollapsedPopover` (hover no ícone colapsado; único popover; fecha em
      blur/mouseleave; nested subgroups + sort) — `SidebarCollapsedPopover.vue`.
- [ ] `SidebarUnreadBadge` — `>99` vira `99+`; fontes: inbox/label/team/folder/
      mentions/participating/unattended atrás de flag.
- [ ] `SidebarSortMenu` — opções por seção (`created_desc/asc`, `alphabetical_asc/desc`,
      `unread_desc/asc`) persistidas em `chatwoot_sidebar_sort_preferences` com default
      por seção (`helper/sidebarSort.js`).
- [ ] Minimização de subgrupos em `sidebarMinimizedSections` com chave
      `${accountId}:${name}` (`SidebarSubGroup.vue`).
- [ ] `ChannelLeaf` — ícone por `channel_type` + identificador do canal
      (telefone/e-mail) + alerta `reauthorization_required`.
- [ ] Remover `soon` ("Menções", "Sem atendimento") e a duplicidade
      "Minha Inbox" ≡ "Todas as conversas" (ambos `/app` hoje).

**Resize / colapso**

- [ ] Extrair `provider` com constantes 200/56/320/160; snap no fim do resize
      (`< 160` → 56, senão salva); duplo clique alterna colapsada↔expandida; cursor e
      `user-select` no body durante o arrasto; separador acessível por teclado.
- [ ] Persistência: `users.ui_settings.sidebar_width` via `PATCH /api/v1/profile`
      (01-2), com fallback/migração da chave localStorage `cw_sidebar_width`; no mobile
      largura fixa (flyout).
- [ ] `_auth.tsx` — grid do shell com fundo `--woot-bg`/`n-surface-1` e overflow
      correto; a sidebar vive fora do scroll da página.

**Conta / perfil**

- [ ] `SidebarAccountSwitcher` — exibir só quando `accounts.length > 1`, ordenar por
      nome, mostrar role do vínculo (custom_role é enterprise), "nova conta" quando
      `createNewAccountFromDashboard` (cloud — verificar) e trocar via
      `set_active_account` + URL por conta.
- [ ] `SidebarProfileMenuStatus` — status online/busy/offline (verde/âmbar/slate) +
      toggle auto-offline com tooltip.
- [ ] `SidebarProfileMenu` — atalhos de teclado, configurações de perfil
      (`/app/settings/profile` — módulo 12), aparência, docs/changelog (verificar se
      cloud), console superadmin (já existe) e sair.
- [ ] Presença: mover o heartbeat `sendPresence` de
      `ConversationsPage.tsx:76-85` para `_auth.tsx`, senão a disponibilidade só pulsa
      na rota de conversas.

**Temas**

- [ ] Tokens: completar `n-*`/woot no `packages/ui/src/styles/globals.css`
      (`n-alpha-1/2`, `n-slate-3/4/5/9/10/11/12`, `n-strong`, `n-surface-1`,
      `n-solid-2/3`, `n-teal-9/11`, `n-amber-9`, `n-ruby-*`, `n-brand`) e trocar usos
      shadcn genéricos na sidebar pelos tokens equivalentes.
- [ ] Dark: classe `dark` (original aplica no `body`; nosso next-themes no `<html>`),
      `color-scheme` CSS e chave `color_scheme` (light/dark/auto) com migração de
      `vite-ui-theme`; comandos de aparência no ⌘K.

**Command bar / atalhos**

- [ ] Botão de busca da sidebar abre o palette (hoje inerte
      `app-sidebar.tsx:462-477`); `kbd` mostra ⌘ ou Ctrl conforme SO (`useKbd`).
- [ ] Palette em seções: Go-to (inbox, conversas, contatos, empresas, relatórios,
      campanhas, help center, configurações) + Aparência + recentes; navegação por
      setas/Enter; `Esc` fecha. Busca indexada por domínio fica no módulo 11.
- [ ] `WootKeyShortcutModal` — `$mod+/` abre, `$mod+Esc` fecha; Alt+C (`/app`),
      Alt+V (`/app/contacts`), Alt+R (`/app/reports`), Alt+S (`/app/settings/agents`)
      (`useSidebarKeyboardShortcuts.js`).
- [ ] Registro único de atalhos para não colidir com o composer/macros do módulo 02.

**Rotas e estados**

- [ ] `noAccounts` (EmptyState + sair), `suspended` (EmptyState + suporte/billing cloud
      — verificar) e 404/`errorComponent`; `defaultPendingComponent` com skeleton em vez
      de spinner. Ver `noAccounts/Index.vue` e `suspended/Index.vue`.
- [ ] Decidir URL account-scoped (`/app/accounts/:accountId/...`, como o
      `frontendURL` do Vue) vs manter `/app/...` + conta na sessão — impacto em deep
      links e em todos os módulos. (verificar)
- [ ] Guarda de conta: `accounts.length === 0` → no-accounts; conta suspensa →
      `suspended` (status vem de `account_users.status` — verificar). O mapa do
      `parity-report` casa a substring `noAccounts`; usar alias `no-accounts` no
      `WEB_AREAS` ou nomear o arquivo de forma compatível. (verificar)

**Mobile**

- [ ] `<768px`: sidebar vira flyout `fixed` com overlay, launcher flutuante no
      canto inferior esquerdo, fecha ao clicar fora/navegar; launcher oculto em rota
      de conversa (`MobileSidebarLauncher.vue`).

### 4.3 Dados, jobs e realtime (quando aplicável)

- [ ] `users.ui_settings` (jsonb, `packages/db/src/schema/auth.ts:207`) — passar a ler/
      gravar `sidebar_width`; sem DDL novo. Sort/minimização continuam em localStorage
      (`chatwoot_sidebar_sort_preferences`, `sidebarMinimizedSections`).
- [ ] Sem jobs. Realtime: só presença (heartbeat movido para o shell); badges de
      não-lidas dependem dos eventos/contadores dos módulos 02/11.
- [ ] Nenhuma migration: qualquer necessidade de schema é bug de escopo (trilha D fechada).

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                                 | Arquivos-alvo                                                                                | Depende        |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------- |
| 01-1  | Provider do shell: constantes 200/56/320/160, snap, duplo clique, cursor, separador acessível                          | `apps/web/src/components/sidebar/sidebar-provider.tsx` (novo), `components/app-sidebar.tsx`  | —              |
| 01-2  | Persistir `sidebar_width` em `users.ui_settings` com fallback/migração do localStorage                                 | `apps/web/src/lib/profile.ts` (novo), `sidebar-provider.tsx`                                 | 01-1           |
| 01-3  | `sidebar-items.ts` data-driven + gating role/flag/enterprise + accordion + auto-expand + remover `Notificações`/`soon` | `apps/web/src/components/sidebar/sidebar-items.ts` (novo), `app-sidebar.tsx`                 | 01-1           |
| 01-4  | Subcomponentes: Group/SubGroup/Leaf/Badge/ChannelLeaf                                                                  | `apps/web/src/components/sidebar/*` (novos)                                                  | 01-3           |
| 01-5  | Dados dinâmicos: Times, Canais, Etiquetas, Pastas + identifiers + badges atrás de flag                                 | `apps/web/src/components/sidebar/*`, `apps/web/src/lib/sidebar-data.ts`                      | 01-4; 02/05/11 |
| 01-6  | Sort por seção + minimização de subgrupos (chaves do original)                                                         | `apps/web/src/lib/sidebar-prefs.ts` (novo)                                                   | 01-4           |
| 01-7  | Account switcher 1:1 (condicional, role, sort, set_active_account, deep link)                                          | `app-sidebar.tsx`, `session-provider.tsx`, `lib/auth.ts`                                     | 01-1; 12       |
| 01-8  | Perfil: status + auto-offline + links (perfil/aparência/docs/changelog/superadmin)                                     | `apps/web/src/components/sidebar/SidebarProfileMenu.tsx` (novo)                              | 01-2; 12       |
| 01-9  | Tokens `n-*` completos + dark (`color_scheme`) + comandos de aparência                                                 | `packages/ui/src/styles/globals.css`, `components/theme-provider.tsx`                        | —              |
| 01-10 | Command bar shell: botão, ⌘K/Ctrl+K, seções go-to/aparência/recentes, kbd dinâmico                                     | `apps/web/src/components/commands/*` (novos), `CommandPalette.tsx`                           | 01-3           |
| 01-11 | Modal de atalhos (`$mod+/`, `$mod+Esc`) + Alt+C/V/R/S + registry anti-conflito                                         | `apps/web/src/components/commands/KeyboardShortcutsModal.tsx` (novo)                         | 01-10; 02      |
| 01-12 | Rotas/estados: noAccounts, suspended, 404, errorComponent, skeleton; guarda de conta                                   | `apps/web/src/routes/_auth/app/no-accounts.tsx`, `suspended.tsx`, `__root.tsx`, `loader.tsx` | 01-1           |
| 01-13 | Mobile: flyout + launcher + fechar ao navegar/clicar fora                                                              | `apps/web/src/components/sidebar/MobileSidebarLauncher.tsx` (novo), `_auth.tsx`              | 01-1           |
| 01-14 | Evidência: shots do shell (expandida/colapsada/dark/⌘K/mobile) + checks no e2e                                         | `scripts/shot.mjs`, `scripts/e2e.mjs`                                                        | 01-1..01-13    |
| 01-15 | Presença no shell (heartbeat em `_auth.tsx`)                                                                           | `apps/web/src/routes/_auth.tsx`, `components/conversations/ConversationsPage.tsx`            | —              |

## 6. Aceite

```bash
# qualidade
bun run check-types && bunx oxlint
bun run check                              # oxlint + oxfmt (AGENTS.md)

# métrica (front: commands/noAccounts/suspended deixam de ser ❌)
bun scripts/parity-report.mjs
bun scripts/parity-report.mjs --write-doc  # regenera docs/specs/paridade-mapa.md

# funcional + visual (API :3000 e web :3001 no ar)
bun scripts/e2e.mjs
bun scripts/shot.mjs

# guarda de DDL (nenhuma migration neste módulo)
bun scripts/db-roundtrip-check.mjs
```

- [ ] Largura da sidebar: 200 default, 56–320, snap `<160`, duplo clique alterna;
      após reload e após trocar de conta a largura continua a mesma (vinda de
      `ui_settings`) — prova manual/roteiro no e2e.
- [ ] Menu com paridade estrutural de `Sidebar.vue` (sem `Notificações`, sem `soon`),
      itens admin só para administrator e enterprise ausente; accordion + popover
      colapsado funcionando.
- [ ] Dark mode e sidebar colapsada lado a lado com `dashboard.png`/`dashboard-dark.png`
      registrados em `shots/` (comparação manual documentada no PR).
- [ ] ⌘K/Ctrl+K abre o palette de qualquer rota (tecla e botão da sidebar); `Esc`
      fecha; `$mod+/` abre o modal de atalhos; Alt+C/V/R/S navegam.
- [ ] `375×812`: launcher abre o flyout, navegar/clicar fora fecha; 404, error
      boundary, no-accounts e suspended renderizam EmptyState.
- [ ] `bun scripts/e2e.mjs` verde 2× (checks atuais + shell) e `shot.mjs` gera os
      PNGs novos sem erro.
- [ ] `bun scripts/parity-report.mjs --json`: áreas front `commands`, `noAccounts` e
      `suspended` cobertas (e nenhuma área regrediu).

## 7. Fora de escopo

- Conteúdo dos módulos 02–15: thread/composer/filtros (02), páginas de settings (03–06,
  10, 12), relatórios (07), help center (08), widget (09), integrações (10), busca
  indexada e notificações (11), onboarding (13), mailers/jobs/WS multi-réplica (14),
  Captain (15) — aqui só entram o card/rota na sidebar e o link.
- **Enterprise:** custom roles, SLA, calls/voice, capacity, copilot, conversation
  workflow, campaign analytics — itens escondidos/marcados "fora", nunca implementados.
- **Cloud/paywall:** `SidebarChangelogCard/Button`, billing, `UpgradePage`, "criar
  nova conta" (verificar), suporte via `window.$chatwoot` — citados só para gating.
- i18n (`pt-BR`/`en`) e pipeline/CI (decisão do R0).
- DDL/schema: qualquer mudança exige trilha D5; desnecessária aqui.
- Busca global por domínio (conversas/contatos/artigos/canned) e ações de conversa no
  command bar (macros/bulk/snooze) — módulos 11/02/06.

## 8. Definição de done

1. Tarefas `01-1..01-15` marcadas `[x]` e arquivos commitados (`check-types` e
   `oxlint` verdes; `bun run check` aplicado).
2. `bun scripts/e2e.mjs` verde 2× e `bun scripts/shot.mjs` com os PNGs do shell em
   `shots/` (não versionados); `db-roundtrip-check` intacto.
3. `bun scripts/parity-report.mjs --write-doc` regenerado; `commands`, `noAccounts` e
   `suspended` ✅ no front; linhas deste módulo sem ❌.
4. Este doc com todos os checkboxes de aceite marcados e status `✅` na tabela do
   `roadmap.md` (coluna Status do módulo 01).
5. Nenhuma divergência escondida: o que não der paridade (ex.: URL sem
   `accounts/:accountId`, se mantida) fica escrito no §4.2 com `(verificar)` resolvido
   e justificado — sem alterar schema.
