# AGENTS.md — ChatwootJS

> Instruções para agentes (humanos ou IA) trabalhando neste repo.
> Fonte da verdade funcional/visual: `./chatwoot/` (Chatwoot Rails+Vue clonado, **só leitura** — nunca editar).

## Objetivo

Recriar o **Chatwoot open-source 1:1** (comportamento, API e visual) com stack JS moderna:
**HonoJS + Drizzle + Zod + React 19 + TanStack Router/Query + Tailwind/shadcn + Bun + Turbo + Postgres + Caddy.**

## Specs (obrigatório ler antes de codar)

- `docs/SPEC_CHATWOOTJS.md` — visão, arquitetura, layout, princípios 1:1.
- `docs/specs/000-indice.md` — progresso da **trilha D (compatibilidade de dump
  bidirecional com o Chatwoot original)**, **duas colunas**:
  `Spec` (documento escrito) e `Impl` (código finalizado).
- `docs/specs/D0..D5` — uma spec executável por etapa (DB-first + scripts + aceite).
- Roadmap v1 (`M0..M12`, app 1:1) arquivado em `docs/specs/_arquivo-v1/` —
  **não é mais o plano vigente; não implementar Ms sem ordem explícita**.
- Ordem: `D0 → D1 → D2 → (D3+D4) → D5`.
- **Ao terminar o código de uma etapa** (aceite cumprido): marcar `Impl` como `[x] done` no índice.

## Layout do monorepo

```
apps/server   # API Hono (Bun, :3000): /auth, /api/v1, /api/v2, /cable, /webhooks/*, /health
apps/web      # Dashboard React (Vite, :3001) + apps/widget (M5, IIFE embeddável)
apps/widget   # (M5) widget.js — window.chatwootSettings
packages/db   # Drizzle: schema/*, migrations, seed — ÚNICO dono do SQL
packages/core # @chatwootjs/core: schemas Zod, services, policies, jobs, realtime, tokens
packages/ui   # shadcn + tema Woot (Chatwoot v4: sidebar branca, system font, raio 8px)
scripts/shot.mjs  # screenshots via playwright-core (ignorado pelo git)
shots/            # saída dos screenshots (ignorado pelo git)
```

## Convenções (não-negociáveis)

1. **API 1:1 com o Rails**: mesmos paths/query/body (`/api/v1/...`), mesmos status (401/403/404/422), formato `{ data, meta }` e `{ error, attributes }`. Zod espelha os params do Rails.
2. **Banco espelha `chatwoot/db/schema.rb` no pino de `docs/specs/CHATWOOT_PIN.md`**: tabelas/colunas snake_case (`account_id`, não `accountId`); camelCase só na borda via mapper. Tipos Rails são normativos (`datetime` = `timestamp` sem timezone, `bigint` ≠ `integer`, `uuid` com `gen_random_uuid()`). Migrations via `drizzle-kit generate` + `db:migrate`. Nunca SQL cru fora de migration/seed. **Nenhum drift de DDL sem registrar em `docs/specs/drift-permitido.md` (trilha D5).**
3. **Sem tRPC no domínio** (`packages/api` congelado). Todo domínio é Hono REST + `zValidator`. Handlers finos → `services` no core.
4. **Visual 1:1 com o Chatwoot v4** (`chatwoot/.github/screenshots/dashboard.png`): sidebar branca redimensionável + lista de conversas + thread + painel de detalhes. Sem rail escuro (era o v3). Validar com `bun scripts/shot.mjs` (API no :3000, web no :3001).
5. **`.env` único na raiz** (front+back). Server/Drizzle carregam via `src/env.ts` (primeiro import). Nunca commitar `.env` (ver `.env.example`).
6. **Auth**: JWT access 15min + refresh opaco com rotação. `authAccount()` valida vínculo com `:account_id` (403 cross-account). Roles `agent/administrator`.
7. **Pacotes escopados `@chatwootjs/*`** (`core`, `db`, `ui`, `api`, `config`). Nunca reintroduzir outro escopo.
8. **i18n pt-BR + en** nas strings visíveis (sem texto hard-coded fora desses dois idiomas).
9. ** sempre rodar bun run check e resolver os conflitos**

## Comandos

```bash
bun install && bun run db:start && bun run db:migrate && bun run db:seed && bun run dev
bun run check-types   # tsc em todos os pacotes
bun run check         # oxlint + oxfmt
bun run db:seed       # re-seed idempotente (Ada admin, Alan agente)
bun scripts/shot.mjs  # screenshots (precisa API :3000 + web :3001 no ar)
```

## O que NÃO fazer

- Não trocar Postgres/Drizzle/Hono/Caddy; não renomear colunas do banco; não criar design system próprio; não editar `./chatwoot/`; não pular a spec do módulo; não commitar `.env`, `shots/`, `dist/`.
