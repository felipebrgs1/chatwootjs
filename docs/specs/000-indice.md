# Specs — ChatwootJS

> **Plano vigente:** [`../roadmap.md`](../roadmap.md) — paridade 100% por
> **módulo de produto**, com um doc executável por estágio em `../roadmap/`
> (ex.: `01 - dashboard.md`). Escopo: **Chatwoot OSS** pinado em
> `CHATWOOT_PIN.md` (4.17.1); **i18n**, **pipeline/CI** e **Enterprise** fora.
>
> A **trilha D** (compatibilidade de dump bidirecional) está concluída e vira
> guarda permanente: nenhum PR pode quebrar `schema-diff`/`drift-lint`/
> `roundtrip`, e upgrades do pino seguem `upgrade-chatwoot.md`.
>
> `R0-roadmap-100.md` + `R1-saneamento.md` ficam como **histórico**: definiram
> escopo, corrigiram o sino/seed/e2e e criaram o medidor
> (`scripts/parity-report.mjs` → `paridade-mapa.md`). O roadmap v1 (`M0–M12`)
> está arquivado em `_arquivo-v1/`; o que ele entregou é a baseline medida no
> R0 §2.

## Progresso — trilha R (vigente)

| Módulo | Spec                      | Descrição                                                         | Spec     | Impl     |
| ------ | ------------------------- | ----------------------------------------------------------------- | -------- | -------- |
| R0     | `R0-roadmap-100.md`       | Definição de 100%, mapa de paridade, fases R1–R12 e medidor       | [x] done | [x] done |
| R1     | `R1-saneamento.md`        | Saneamento (sino/seed/e2e/shots) + `parity-report` + baseline     | [x] done | [x] done |
| R2     | `R2-conversas.md`         | Conversas/mensagens 100% (endpoints + drafts + bulk + composer)   | [ ] todo | [ ] todo |
| R3     | `R3-atribuicao.md`        | Assignment policies, auto-assign round-robin/least-busy, presença | [ ] todo | [ ] todo |
| R4     | `R4-reports-v2-csat.md`   | API v2 de relatórios, live reports, CSAT (métricas/download)      | [ ] todo | [ ] todo |
| R5     | `R5-contatos-import.md`   | Contatos filter/export/avatar + data imports completo + segmentos | [ ] todo | [ ] todo |
| R6     | `R6-widget-public-api.md` | Widget 100% + `public/api/v1/inboxes` + configuração no dashboard | [ ] todo | [ ] todo |
| R7     | `R7-canais.md`            | OAuth/callbacks, WhatsApp management, TikTok/Twilio SMS, e-mail   | [ ] todo | [ ] todo |
| R8     | `R8-helpcenter.md`        | Artigos (bulk/reorder), portal público, portal members, sitemap   | [ ] todo | [ ] todo |
| R9     | `R9-integracoes.md`       | Dashboard apps + integrations (Slack/Linear/Notion/Shopify/Dyte)  | [ ] todo | [ ] todo |
| R10    | `R10-admin-platform.md`   | Superadmin completo, Platform API, MFA/sessões, onboarding        | [ ] todo | [ ] todo |
| R11    | `R11-notif-mailer-ws.md`  | Notificações completas, mailers transacionais, WS multi-réplica   | [ ] todo | [ ] todo |
| R12    | `R12-captain-polish.md`   | Captain OSS, busca global, polimento visual e auditoria final     | [ ] todo | [ ] todo |

> As specs R1–R12 são escritas **ao iniciar cada fase** (formato D0–D5:
> Objetivo / Referência Chatwoot / Tarefa / Aceite / Done). `Impl [x] done`
> exige o aceite local verde (`check-types`, `oxlint`, e2e/smoke da fase) e,
> quando a fase tocar `packages/db`, D5 verde.

## Progresso — trilha D (concluída, guarda permanente)

`Spec` = documento escrito. `Impl` = código finalizado — só vira `[x] done`
quando o aceite da spec estiver cumprido (comandos da spec passando em CI/local).

| Módulo | Spec                      | Descrição                                                     | Spec     | Impl     |
| ------ | ------------------------- | ------------------------------------------------------------- | -------- | -------- |
| D0     | `D0-inventario-diff.md`   | Pinar versão, inventário 98 tabelas + harness de diff         | [x] done | [x] done |
| D1     | `D1-tabelas-faltantes.md` | Criar as ~36 tabelas faltantes (nomes Rails exatos)           | [x] done | [x] done |
| D2     | `D2-colunas-tipos.md`     | Paridade coluna-a-coluna: tipos, defaults, null, índices, FKs | [x] done | [x] done |
| D3     | `D3-import-chatwoot.md`   | Import: dump do Chatwoot original → nosso banco               | [x] done | [x] done |
| D4     | `D4-export-chatwoot.md`   | Export: nosso banco → dump que o Rails aceita                 | [x] done | [x] done |
| D5     | `D5-conformidade.md`      | CI anti-drift + política de upgrade do Chatwoot               | [x] done | [x] done |

## Ordem de execução

```
R1 → R2 → (R3, R4, R5 em paralelo) → (R6 → R7) → (R8, R9, R10, R11) → R12
```

D3 e D4 só começam com D2 com aceite verde na tabela-alvo do teste
(pelo menos `accounts, users, inboxes, contacts, conversations, messages`).
D5 fecha a trilha e vira guarda permanente: nenhum PR futuro pode introduzir
drift de schema sem atualizar o pino e os artefatos de diff.

## Definição de "100% compatível com dump"

1. **Mesmo DDL lógico:** mesmos nomes de tabela/coluna/índice/constraint,
   mesmos tipos Postgres (`bigint` vs `integer`, `timestamp` vs `timestamptz`,
   `uuid`, `jsonb`), mesmos defaults (`gen_random_uuid()`, `CURRENT_TIMESTAMP`,
   `{}`), mesma nulabilidade, mesmas PKs/sequências/FKs e mesmas extensões
   (`pgcrypto, pg_trgm, pg_stat_statements, vector, plpgsql`).
2. **Import (D3):** `pg_dump --schema-only` do Chatwoot v4 pinado aplica no nosso
   banco sem erro; `pg_dump --data-only` do Chatwoot restaura (tabelas de
   domínio) sem violação de constraint; app continua subindo e lendo os dados.
3. **Export (D4):** nosso `pg_dump` restaura num Postgres vazio onde
   `bin/rails db:migrate` do Chatwoot pinado roda com **zero migrations
   pendentes** e o Rails sobe lendo os dados.
4. **Exceções declaradas:** só o que D0 listar explicitamente
   (ex.: tabelas de infra que não carregam dado de domínio) — tudo o mais
   deve ser idêntico. Nenhuma tabela/coluna "extra nossa" sem registro em D5.

## Formato de cada spec

1. **Objetivo** — o que a spec entrega
2. **Referência Chatwoot** — arquivos exatos em `./chatwoot/`
3. **Tarefa** — o que implementar (DB-first; app só o mínimo para não regredir)
4. **Aceite** — checklist testável (comandos copiáveis)
5. **Done** — o que o PR deve conter
