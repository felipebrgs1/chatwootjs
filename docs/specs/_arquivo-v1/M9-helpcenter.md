# M9 — Help Center / Knowledge Base

Depende de: **M1**. Paralelizável com M7, M8.

## 1. Objetivo

Portais de ajuda com categorias e artigos (draft/published) + portal público
`/hc/:slug` sem login — paridade com o Help Center do Chatwoot.

## 2. Referência Chatwoot

- Models: `portal, category, article, folder, kbase`
- `portals_controller, categories_controller, articles_controller`
  (API v1 autenticada) + controllers públicos do portal
- Vue: `dashboard/routes/dashboard/helpcenter/` (editor) + `portal` público
  (`chatwoot/app/javascript/portal/`)

## 3. DB

- `portals (id, account_id, name, slug unique, color, page_title, header_text,
homepage_link, archived, created_at, updated_at)`
- `categories (id, portal_id, account_id, name, slug, description, locale,
position, created_at, updated_at)`
- `articles (id, portal_id, category_id, account_id, author_id, title, slug,
content (html sanitizado), description, status 0 draft/1 published,
views, position, locale, created_at, updated_at)` + índice `(portal_id, status)`
- `folders?` — só se existir no `schema.rb` atual; senão ignorar.

## 4. API

Autenticada (dashboard):

| Método | Path                                                   | Obs                                     |
| ------ | ------------------------------------------------------ | --------------------------------------- |
| CRUD   | `/api/v1/accounts/:id/portals`                         |                                         |
| CRUD   | `/api/v1/accounts/:id/portals/:portal_slug/categories` | `position` reorder via PATCH            |
| CRUD   | `/api/v1/accounts/:id/portals/:portal_slug/articles`   | `status` draft/published, `category_id` |
| POST   | `/.../articles/:id/publish` / `unpublish`              |                                         |

Pública (sem auth, por slug):

| Método | Path                                  | Obs                                |
| ------ | ------------------------------------- | ---------------------------------- |
| GET    | `/hc/api/:portal_slug`                | portal + categorias (só published) |
| GET    | `/hc/api/:portal_slug/articles/:slug` | artigo + incrementa `views`        |

Sanitizar HTML do artigo no server (allowlist igual ao Rails/ActionText).

## 5. Front

- Dashboard: `helpcenter/portals` (lista) + editor de portal/categoria/artigo
  (TipTap, draft autosave, preview, publish) — layout igual ao Vue.
- Público: rota `/hc/$portalSlug` (home com busca + categorias) e
  `/hc/$portalSlug/articles/$slug` (artigo, tema com `color` do portal).

## 6. Aceite

- [ ] Criar portal → categoria → artigo draft → publish → acessível sem login
      em `/hc/:slug` com busca funcionando.
- [ ] Draft não aparece no público; unpublish remove.
- [ ] Views incrementam por acesso único.
- [ ] HTML malicioso é sanitizado.

## 7. Done

Migration + CRUDs + portal público + editor + testes (visibilidade draft,
sanitização, views).
