# M0 — Fundação, `packages/core`, WootUI, seed (PRÉ-REQUISITO)

## 1. Objetivo

Deixar o monorepo pronto para os módulos de domínio: API Hono REST padronizada,
`packages/core` com services/schemas, tema visual Woot, `.env` único funcionando,
seed mínimo e shell do dashboard. **Nada de tRPC no domínio Chatwoot.**

## 2. Referência Chatwoot

- `chatwoot/db/schema.rb` — nomes de tabelas/colunas (fonte da verdade do M0–M12)
- `chatwoot/app/javascript/dashboard/components/layout/` — estrutura do shell
- `chatwoot/app/javascript/dashboard/assets/scss/` — cores/espaçamentos Woot

## 3. DB (`packages/db`)

- [ ] Garantir `createDb()` + `db` export (já existe, usa `DATABASE_URL` do `.env` raiz).
- [ ] Criar `packages/db/src/seed.ts`: 1 conta demo (`Demo`), 1 admin
      (`admin@demo.test` / `password123`), 1 inbox Website, 3 contatos,
      5 conversas com mensagens. Rodar via `bun run --cwd packages/db src/seed.ts`
      (adicionar script `db:seed` no root `package.json`).
- [ ] Adicionar script root: `"db:seed": "turbo run db:seed -F @chatwootjs/db"`.

## 4. API (`apps/server` + `packages/core` NOVO)

Criar `packages/core/` (lib pura, sem HTTP):

```
packages/core/
  package.json          # nome @chatwootjs/core
  src/
    schemas/            # Zod por domínio (pagination.ts, id.ts, ...)
    services/           # regra de negócio chamada pelo Hono
    policies/           # can(action, role, resource) espelhando Pundit do Rails
    jobs/               # interface Job + runner in-process (BullMQ só no M6+)
    realtime/           # publish(accountId, event, data) — adapter WS/in-process
    lib/pagination.ts   # { page, per_page } -> { data, meta: { count, current_page } }
    lib/errors.ts       # NotFound, Forbidden, Unprocessable -> status Rails
    lib/mapper.ts       # snake_case DB -> camelCase API (toApi*)
```

- [ ] Congelar tRPC: remover `app.use("/trpc/*")` de `apps/server/src/index.ts`
      (manter `packages/api` no disco, sem uso). Rotas novas só Hono REST.
- [ ] Criar `apps/server/src/middlewares/auth.ts` (stub funcional):
      `authAccount()` lê `Authorization: Bearer <token>` (aceita token fake
      `demo-token` apontando p/ admin do seed até o M1 trocar por JWT real),
      injeta `c.var.auth = { userId, accountId, role }`.
- [ ] Criar `apps/server/src/routes/v1/_helpers.ts`: `ok(c, data, meta)`,
      `fail(c, err)` com formato `{ error, attributes }` + status 401/403/404/422.
- [ ] `GET /health` → `{ ok: true }` (para healthcheck docker).
- [ ] Habilitar CORS com `CORS_ORIGIN` (já existe) + métodos
      `GET,POST,PATCH,PUT,DELETE,OPTIONS`.

## 5. Front (`apps/web` + `packages/ui`)

- [ ] `packages/ui`: adicionar tokens Woot em `src/styles/globals.css`
      (`--woot-blue #1F93FF`, rail `#1F2937`, bg `#F9FAFB`, radius 8, fonte Inter) + componentes `WootAvatar`, `StatusBadge`, `PriorityBadge`, `EmptyState`.
- [x] App shell `_auth` (`apps/web/src/routes/_auth.tsx`): `AppSidebar` branca estilo Chatwoot v4
      (account switcher, busca ⌘K, árvore de navegação, perfil com disponibilidade) + `<Outlet/>`. Sem rail escuro (era o visual do Chatwoot v3). Verificado com screenshots em `shots/` (`bun scripts/shot.mjs`).
- [ ] `useCable(accountId)` hook stub em `apps/web/src/hooks/use-cable.ts`
      (conecta em `/cable`, reconecta com backoff).

## 6. Aceite

- [ ] `bun install && bun run db:push && bun run db:seed && bun run dev` sobe tudo sem erro.
- [ ] `GET /health` → 200 `{ ok: true }`.
- [ ] `GET /api/v1/accounts/1/conversations` com `Bearer demo-token` → 200
      (array vazio ou seed); sem token → 401.
- [x] Dashboard abre com sidebar v4 + lista de conversas, tema claro igual Chatwoot.
- [ ] `bun run check-types` passa.

## 7. Done (PR M0)

Seed + core + shell + health. Sem regra de negócio de domínio.
Atualizar este índice: M0 `[x] done` (já marcado — confirmar no merge).
