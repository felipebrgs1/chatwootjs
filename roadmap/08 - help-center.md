# 08 — Help Center

> **Estágio:** 08/15 · **Status:** 0 de 8 subáreas verdes (7 🟡, 1 ❌) · **Depende de:** 01 (shell/rotas) e 14 (mailer/storage do `send_instructions` e do logo)
> **Medição:** 10/09/2026 — `bun scripts/parity-report.mjs` (`docs/specs/paridade-mapa.md`: área `helpcenter` = 35 ações Rails × ~14 rotas nossas; o front aparece ✅ no heurístico por área, mas a cobertura real é parcial)
> **Escopo:** Chatwoot OSS 4.17.1 (pino). Enterprise, i18n e pipeline: fora. DDL 100% pela trilha D — este módulo **não altera schema**.

## 1. Objetivo e definição de 100%

Entregar a Central de Ajuda igual ao OSS: CRUD de portais/categorias/artigos no dashboard, API pública anônima do portal (`/hc/...`, como o Rails — não `/hc/api`) e portal público 1:1 com home, busca, categoria, artigo e locale.

**100% quando:**

- Toda action OSS dos controllers do módulo responde no mesmo path/método/status/envelope: `portals` (8), `articles` (7), `categories` (6), `articles/bulk_actions` (4), `public/api/v1/portals` (2), `public/.../articles` (4), `public/.../categories` (2) e `public/.../search` (1) — **34 ações**.
- Os envelopes reais dos jbuilders são respeitados (portais no topo; artigos/categorias em `{ payload: <obj> }`; listas `{ payload, meta }`) — detalhado em §4.1.
- O dashboard tem todas as rotas nomeadas de `helpcenter.routes.js` com dados reais, estados vazio/loading/erro e comparação visual lado a lado.
- O portal público cobre home, busca (10/página), categoria, artigo, locale, markdown renderizado, autor, artigos associados, SEO e `theme`/`show_plain_layout`.
- Fluxo objetivo: criar portal → categoria → artigo → publicar no dashboard e abrir `/hc/:slug/articles/:article_slug` **sem login**, com markdown renderizado e view contada pelo pixel.

**Não conta como 100%:** `translate` real (enterprise; no OSS responde 501), `ssl_status`/Cloudflare, `knowledge_base_manage` de custom roles, i18n das strings de UI.

## 2. Estado atual (medido)

| Subárea                      | Status | Evidência no nosso repo                                                                          | Lacuna principal                                                                                                                                                                                    |
| ---------------------------- | :----: | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API dashboard — portais      |   🟡   | `apps/server/src/routes/v1/portals.ts` + `packages/core/src/services/portals.ts`                 | sem `show`/`archive`/`logo`/`send_instructions`/`process_attached_logo`/`config`/`inbox_id`; `:portal_id` numérico (Rails usa slug); envelope `{ data }` e create 201 (Rails: portal no topo e 200) |
| API dashboard — categorias   |   🟡   | idem (`listCategories`/`createCategory`/`updateCategory`/`deleteCategory`)                       | sem `show`, `reorder`, `related_category_ids`, locale, ícones, `parent/associated`, `meta.articles_count`                                                                                           |
| API dashboard — artigos      |   🟡   | idem (`listArticles`/`createArticle`/`updateArticle`/`deleteArticle`/`setArticleStatus`)         | sem `show`/`edit`, filtros (`query/status/author_id/category_slug/page`) + meta counts, `reorder`, status `archived`, `draft_title/draft_content`, `author_id`, `associated_article_id`, `meta`     |
| API dashboard — bulk actions |   ❌   | não existe                                                                                       | `translate` (501 OSS), `update_status`, `update_category`, `delete_articles`                                                                                                                        |
| API pública do portal        |   🟡   | `apps/server/src/routes/hc.ts` montado em `/hc/api` (2 rotas)                                    | paths fora do Rails; faltam portal/categoria JSON, busca, locale, `sitemap.xml`, `.md`, `.png` e envelopes                                                                                          |
| Front dashboard              |   🟡   | `apps/web/src/routes/_auth/app/helpcenter.tsx` (página única) + `apps/web/src/lib/helpcenter.ts` | sem rotas separadas (artigos/categorias/locales/config), tabs, busca, paginação, bulk, drag reorder, editor full, drafts/diff                                                                       |
| Portal público               |   🟡   | `apps/web/src/routes/hc/$portalSlug.tsx` (home + busca no cliente + artigo)                      | sem locale, categoria, markdown renderizado, autor/associados, SEO, `sitemap`/pixel, layout documentation                                                                                           |
| Dados, jobs e storage        |   🟡   | `packages/db/src/schema/portals.ts` (tabelas D completas)                                        | `config`/`draft_*`/`meta`/`related_categories` sem uso; `portals_members` sem uso OSS; logo exige integração com ActiveStorage (tabelas existem, nenhum service usa)                                |

## 3. Referências do original (pino 4.17.1)

| Referência (`chatwoot/...`)                                                                                                  | O que dita para nós                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/controllers/api/v1/accounts/portals_controller.rb`                                                                      | 8 actions, slug como `:id`, `blob_id`→logo, `inbox_id`→`channel_web_widget_id`, `config` (analytics só admin), `custom_domain`, archive/logo/send_instructions |
| `app/controllers/api/v1/accounts/articles_controller.rb`                                                                     | index com filtros/meta, show/edit, create (author válido, status draft), update com autosave de draft, destroy, reorder                                        |
| `app/controllers/api/v1/accounts/categories_controller.rb`                                                                   | CRUD + `related_category_ids`, `reorder`, filtro `locale`                                                                                                      |
| `app/controllers/api/v1/accounts/articles/bulk_actions_controller.rb`                                                        | translate (501), update_status, update_category, delete_articles                                                                                               |
| `app/models/article.rb` / `category.rb` / `portal.rb`                                                                        | enum `draft:0/published:1/archived:2`, posições em passos de 10, slugs reservados (`search/articles/categories`), `markdown`, config jsonb                     |
| `app/controllers/public/api/v1/portals*` + `app/controllers/concerns/portal_home_data.rb`                                    | paths `/hc/...`, locale/draft locales, recommended/popular, layouts classic/documentation, plain/theme                                                         |
| `app/views/api/v1/accounts/{portals,articles,categories}/*.jbuilder` + `app/views/public/api/v1/portals/**`                  | contrato exato de payload/meta e JSON público                                                                                                                  |
| `lib/chatwoot_markdown_renderer.rb` + `lib/custom_markdown_renderer.rb`                                                      | conteúdo é markdown; público renderiza (tabelas, embeds, `^sup^`, larguras)                                                                                    |
| `app/javascript/dashboard/routes/dashboard/helpcenter/*` + `components-next/HelpCenter/**` + `store/modules/helpCenter*`     | rotas/UX/páginas do dashboard e shape lido (`response.data.payload`)                                                                                           |
| `app/javascript/portal/*`                                                                                                    | componentes Vue do portal público (busca, sugestões, TOC)                                                                                                      |
| `db/schema.rb` — `portals`, `portals_members`, `categories`, `related_categories`, `folders`, `articles`, `active_storage_*` | dados (DDL fechado na trilha D — **não alterar**)                                                                                                              |

## 4. Lacunas detalhadas

### 4.1 API

**Convergência de paths (paths atuais → Rails):**

| Hoje (ChatwootJS)                                           | Rails (alvo)                                                                                                     | Ação                                                         |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `GET /hc/api/:portal_slug`                                  | `GET /hc/:slug/:locale.json` (portal no topo) + HTML `GET /hc/:slug/:locale` (SPA)                               | reescrever `hc.ts`; client do portal deixa de usar `/hc/api` |
| `GET /hc/api/:portal_slug/articles/:slug`                   | `GET /hc/:slug/articles/:article_slug.json`                                                                      | idem                                                         |
| `PATCH/DELETE /portals/:portal_id` (numérico)               | `PATCH/DELETE /portals/:id` com `:id` = **slug**                                                                 | trocar param e lookup                                        |
| `POST .../articles/:id/publish` e `/unpublish` (inventados) | `PATCH .../articles/:id { status }` e `PATCH .../articles/bulk_actions/update_status`                            | remover as rotas inventadas                                  |
| `{ data: { ... } }` e 201 em create                         | portal no topo (+`meta`); artigo/categoria em `{ payload: <obj> }`; listas `{ payload: [..], meta }`; create 200 | mappers de resposta (server + `apiFetch`)                    |

> Nota: o front oficial posta JSON **flat** (`ParamsWrapper` do Rails embala em `portal`/`article`/`category`); nossos schemas Zod já são flat — manter e também aceitar o wrapper explícito `(verificar)`.

**Dashboard — portais** (`apps/server/src/routes/v1/portals.ts` + `packages/core/src/services/portals.ts`):

- [ ] `GET /api/v1/accounts/:account_id/portals` — `portals#index` — `{ payload: [portal], meta: { current_page, portals_count } }`; hoje `{ data: { portals } }` sem meta.
- [ ] `GET /api/v1/accounts/:account_id/portals/:slug` — `portals#show` — portal no topo com `config`, `inbox`, `logo` e `meta` (counts de artigos/categorias + `default_locale`).
- [ ] `POST /api/v1/accounts/:account_id/portals` — `portals#create` — 200; aceitar `inbox_id`, `blob_id` e `portal.config` (analytics só admin).
- [ ] `PATCH /api/v1/accounts/:account_id/portals/:slug` — `portals#update` — 200; merge de `config`; `custom_domain`/homepage normalizados.
- [ ] `DELETE /api/v1/accounts/:account_id/portals/:slug` — `portals#destroy` — `head :ok` (200 sem corpo; hoje devolvemos JSON).
- [ ] `PATCH .../portals/:slug/archive` — `portals#archive` — `archive: true`, 200 sem corpo.
- [ ] `DELETE .../portals/:slug/logo` — `portals#logo` — purge do anexo, 200 sem corpo.
- [ ] `POST .../portals/:slug/send_instructions` — `portals#send_instructions` — body `{ email }`; 422 `{ error }` sem e-mail/domínio; sucesso `{ message }` 200 (job do módulo 14).
- [ ] `blob_id` em create/update → `process_attached_logo` (ActiveStorage; storage do módulo 14) — `(verificar)` abordagem de upload.
- [ ] `GET .../portals/:slug/ssl_status` — **Enterprise** (fora; rota pode responder 404/501 no OSS).

**Dashboard — artigos** (mesmos arquivos):

- [ ] `GET .../portals/:slug/articles` — `articles#index` — query `locale/query/status/author_id/category_slug/page`; `{ payload: [article], meta: { all_articles_count, archived_articles_count, articles_count, current_page, draft_articles_count, mine_articles_count, published_count } }`; ordem posição (com categoria) ou `updated_at desc`; paginação.
- [ ] `GET .../portals/:slug/articles/:id` — `articles#show` — `{ payload: <article> }`.
- [ ] `GET .../portals/:slug/articles/:id/edit` — `articles#edit` — mesmo payload de `show` (usado pelo dashboard; `(verificar)` necessidade real).
- [ ] `POST .../portals/:slug/articles` — `articles#create` — 200; status default `draft`; `author_id` restrito à conta (422 `{ error }`); `associated_article_id` resolve root.
- [ ] `PATCH .../portals/:slug/articles/:id` — `articles#update` — 200; `draft_title`/`draft_content` isolados não tocam `updated_at`; inválido → 422 `{ error }`.
- [ ] `DELETE .../portals/:slug/articles/:id` — `articles#destroy` — 200 sem corpo.
- [ ] `POST .../portals/:slug/articles/reorder` — `articles#reorder` — body `{ positions_hash }` → `{ positions }` com rebalance em passos de 10.
- [ ] Campos: status `archived` (2), `draft_title/draft_content`, `author_id`, `associated_article_id`, `meta`, `position`, `locale`, slug reservado (`search/articles/categories`).

**Dashboard — categorias:**

- [ ] `GET .../portals/:slug/categories?locale=` — `categories#index` — `{ payload, meta: { current_page, categories_count } }` (paginado).
- [ ] `GET .../portals/:slug/categories/:id` — `categories#show` — `{ payload: <category> }` + `related_categories`/`parent_category`/`root_category` + `meta.articles_count(locale)`.
- [ ] `POST`/`PATCH .../categories/:id` — aceitar `related_category_ids`, `icon`, `icon_color`, `parent_category_id`, `associated_category_id`, `locale`.
- [ ] `DELETE .../portals/:slug/categories/:id` — `categories#destroy` — 200 sem corpo (nulifica artigos; remove folders).
- [ ] `POST .../portals/:slug/categories/reorder` — body `{ positions_hash }`, 200 sem corpo.

**Dashboard — bulk actions** (`POST/PATCH/DELETE .../articles/bulk_actions/...`):

- [ ] `PATCH update_status` — `{ ids, status }`; status inválido/nenhum artigo → 422 `{ error }`; sucesso 200 sem corpo.
- [ ] `PATCH update_category` — `{ ids, category_id }` do portal; erros 422.
- [ ] `DELETE delete_articles` — `{ ids }`; erros 422; sucesso 200 sem corpo.
- [ ] `POST translate` — **OSS responde 501** (`head :not_implemented`); não implementar tradução.

**API pública** (`apps/server/src/routes/hc.ts`, montado como no Rails — fora de `/api`):

- [ ] `GET /hc/:slug` — 302 para `/hc/:slug/:default_locale` (só GET; no SPA, redirecionar para o locale default).
- [ ] `GET /hc/:slug/:locale` (`show`) — JSON portal no topo (`custom_domain/header_text/homepage_link/name/page_title/slug/categories/logo/meta`) e HTML home.
- [ ] `GET /hc/:slug/:locale/articles` — `{ payload: [article], meta: { articles_count } }`; filtros `query/sort=views/page/per_page` (máx 100); busca usa o mesmo endpoint (`articles.json?query=`).
- [ ] `GET /hc/:slug/:locale/articles` com `category_slug` + `GET .../categories/:category_slug` (+ `/articles`) — categoria localizada por `slug+locale`; 404 se não achar.
- [ ] `GET /hc/:slug/:locale/categories` — `{ payload: [category] }` (position asc).
- [ ] `GET /hc/:slug/articles/:article_slug` — JSON artigo no topo (content **markdown→HTML**), 404 se rascunho.
- [ ] `GET /hc/:slug/articles/:article_slug.md` — `text/markdown; charset=utf-8`; 404 se não publicado.
- [ ] `GET /hc/:slug/articles/:article_slug.png` — pixel 1×1 `image/png`, incrementa views se publicado, cache privado 24h.
- [ ] `GET /hc/:slug/sitemap.xml` — `urlset` com artigos publicados (`loc` no domínio custom ou root + `lastmod`).
- [ ] Locale: `default_locale` do portal; artigos de categoria herdam o locale; `draft_locales` não aparecem em `public_locale_codes`; `theme=dark|light` e `show_plain_layout=true`.

### 4.2 Front

- [ ] Rotas `/_auth/app/helpcenter/*` espelhando `helpcenter.routes.js`: artigos (index/new/edit, por portal/locale/categoria), categorias, locales, settings e new — arquivo base atual vira shell com as rotas novas.
- [ ] `HelpCenterLayout` + sidebar (Artigos/Categorias/Locales/Config) + `PortalSwitcher` + estados vazio/loading/erro.
- [ ] Lista de artigos: tabs (`ARTICLE_TABS`: all/mine/published/draft/archived), busca com debounce, paginação, filtro por categoria, cards com ações, bulk bar (status/categoria/excluir), drag reorder na visão de categoria.
- [ ] Editor de artigo: `FullEditor` (WootWriter), autosave de `draft_title/draft_content` em publicados, painel de diff, preview, author/categoria/associado, publicar/despublicar/arquivar, copiar link público.
- [ ] Categorias: CRUD, drag reorder (posição persistida), related categories, locale, ícone/cor, empty state.
- [ ] Locales: default/allowed/draft locales, traduções de `name/page_title/header_text`, popular content (categorias/artigos), contadores.
- [ ] Configurações do portal: base (nome/slug/cor/header/page title/homepage), logo (upload/purge), domínio custom + envio de instruções CNAME, layout classic/documentation, live chat widget (inbox), analytics, excluir portal.
- [ ] Portal público no SPA: `/hc/:slug` (redirect ao locale), `/:locale` (home), `/:locale/search`, `/:locale/categories/:category_slug`, `/articles/:article_slug`; markdown renderizado (tabelas/embeds/sup), autor/data, associados, meta/SEO (`page_title`), tema e plain; client deixando `/hc/api`.
- [ ] Comparação visual lado a lado (`chatwoot/.github/screenshots` + portal real) para home, categoria e artigo.

### 4.3 Dados, jobs e realtime (quando aplicável)

- [ ] `portals.config` (jsonb) já existe: passar a persistir `allowed_locales`, `default_locale`, `draft_locales`, `layout`, `social_profiles`, `locale_translations`, `popular_content`, `analytics`.
- [ ] `articles.draft_title`, `draft_content`, `meta`, `author_id`, `associated_article_id` e status `archived` já existem: passar a usar (o mapper atual trata 2 como `draft`).
- [ ] `related_categories` já existe: gravar/lançar em create/update de categoria.
- [ ] `portals_members`: sem controller/rota/uso no OSS 4.17.1 (verificado por grep; `(verificar)` enterprise) — nada a implementar; manter DDL intocado.
- [ ] `folders`: sem API/UI no OSS; manter apenas a limpeza no delete de categoria.
- [ ] Jobs: `PortalInstructionsMailer.send_cname_instructions` (módulo 14) e `increment_view_count` via pixel; sem evento de `/cable` neste módulo.

## 5. Tarefas (executáveis)

| ID    | Tarefa                                                                                                                                    | Arquivos-alvo                                                                                               | Depende          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------- |
| 08-1  | Convergir contrato do dashboard: `:id` = slug, respostas top-level/`{payload,meta}`, 200 sem corpo em destroy, create 200; mappers        | `apps/server/src/routes/v1/portals.ts`, `packages/core/src/services/portals.ts`, `apps/web/src/lib/auth.ts` | —                |
| 08-2  | Portais: `show`, `archive`, `logo`, `send_instructions`, `process_attached_logo`, `config`, `inbox_id`, `custom_domain`                   | idem + upload/storage                                                                                       | 14               |
| 08-3  | Categorias: `show`, `reorder`, locale, related, ícones, parent/associated, `meta.articles_count`, paginação                               | idem + `packages/core/src/schemas/portals.ts`                                                               | 08-1             |
| 08-4  | Artigos: index filtros/meta/paginação, `show`, `edit`, `reorder`, `archived`, drafts, author/associated, `meta`                           | idem                                                                                                        | 08-1             |
| 08-5  | Bulk actions (update_status/update_category/delete_articles) + `translate` 501                                                            | `apps/server/src/routes/v1/portals.ts` + service                                                            | 08-4             |
| 08-6  | API pública nos paths do Rails: JSON de portal/artigo/categoria, busca, locale/draft locales, `.md`, `.png`, `sitemap.xml`, markdown→HTML | `apps/server/src/routes/hc.ts`, `packages/core/src/services/portals.ts`                                     | 08-4             |
| 08-7  | Estrutura de rotas do dashboard + layout/sidebar/switcher                                                                                 | `apps/web/src/routes/_auth/app/helpcenter/**`                                                               | 01, 08-1         |
| 08-8  | Front de artigos: tabs, busca, paginação, bulk, reorder, editor/autosave/diff/preview                                                     | components do dashboard                                                                                     | 08-4, 08-7       |
| 08-9  | Front de categorias, locales e configurações do portal                                                                                    | components do dashboard                                                                                     | 08-2, 08-3, 08-7 |
| 08-10 | Portal público 1:1: rotas com locale, home, busca, categoria, artigo (markdown/associados/SEO/tema)                                       | `apps/web/src/routes/hc/**`, `apps/web/src/lib/helpcenter.ts`                                               | 08-6             |
| 08-11 | Seed rico de HC + checks de HC no e2e (publicar sem login) + shot do portal                                                               | `packages/db/src/seed.ts`, `scripts/e2e.mjs`, `scripts/shot.mjs`                                            | 08-1..08-10      |

## 6. Aceite

```bash
# qualidade
bun run check-types && bunx oxlint

# métrica do módulo (helpcenter deve sair de ~14 para as ~34 ações OSS)
bun scripts/parity-report.mjs --write-doc

# regressão global + novo check de HC
bun scripts/e2e.mjs

# fluxo "publicar artigo sem login" (API :3000 + web :3001 no ar)
TOKEN=$(curl -s localhost:3000/auth/sign_in -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.test","password":"password123"}' | jq -r '.data.access_token')
ACC=$(curl -s localhost:3000/api/v1/accounts -H "Authorization: Bearer $TOKEN" | jq -r '.data.accounts[0].id')
curl -s -X POST "localhost:3000/api/v1/accounts/$ACC/portals" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"HC E2E","slug":"hc-e2e","color":"#1f93ff"}'
curl -s -X POST "localhost:3000/api/v1/accounts/$ACC/portals/hc-e2e/categories" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Geral","slug":"geral","locale":"pt_BR"}'
ART=$(curl -s -X POST "localhost:3000/api/v1/accounts/$ACC/portals/hc-e2e/articles" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"Olá","content":"# Olá\n\n**mundo**"}' | jq -r '.payload.id')
curl -s -X PATCH "localhost:3000/api/v1/accounts/$ACC/portals/hc-e2e/articles/$ART" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"published"}'
# sem login: JSON, markdown, pixel, sitemap e busca
curl -s localhost:3000/hc/hc-e2e/pt_BR.json
curl -s localhost:3000/hc/hc-e2e/articles/ola.json
curl -s localhost:3000/hc/hc-e2e/articles/ola.md
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' localhost:3000/hc/hc-e2e/articles/ola.png
curl -s localhost:3000/hc/hc-e2e/sitemap.xml
curl -s 'localhost:3000/hc/hc-e2e/pt_BR/articles.json?query=ola'
```

- [ ] `check-types`/`oxlint` verdes e `parity-report` com `helpcenter` cobrindo as 34 ações (sem regressão nas demais áreas).
- [ ] Smoke acima prova: paths/status/envelopes do Rails, artigo publicado visível **sem auth**, busca/sitemap/markdown/pixel respondendo.
- [ ] `bun scripts/e2e.mjs` verde com o check de publicar artigo sem login; `bun scripts/shot.mjs` gera home/categoria/artigo do portal para comparação lado a lado.

## 7. Fora de escopo

- Enterprise: `translate` real, `ssl_status`/Cloudflare, custom roles (`knowledge_base_manage`), layouts/recursos enterprise.
- i18n da UI do nosso app (pt-BR/en) e pipeline/CI (decisão R0).
- Busca global de artigos no command bar (módulo 11) — aqui só a busca do portal.
- `portals_members`/`folders`: sem uso OSS; sem API/UI neste módulo.
- Alterações de DDL: schema já fechado na trilha D; só usar colunas existentes.

## 8. Definição de done

- Todas as tarefas `08-1..08-11` com `[x]` e os arquivos acima commitados.
- Aceite da §6 verde localmente, incluindo o fluxo publicar→ver sem login e a comparação visual do portal.
- `docs/specs/paridade-mapa.md` regenerado pelo `parity-report` e `roadmap.md` com o status do módulo 08 atualizado.
- Nenhum drift de schema (`schema-diff`/roundtrip continuam verdes) e nenhuma rota `/hc/api` remanescente no client.
