# Specs — ChatwootJS (trilha D: compatibilidade de dump)

> **Objetivo atual (único): ser 100% compatível com o dump do Chatwoot original,
> nos dois sentidos** — poder ser **alimentado** por dados do Chatwoot
> (`pg_dump` do Rails restaura no nosso banco) e poder **alimentar** o Chatwoot
> (nosso `pg_dump` restaura no Rails). Atualizações futuras do produto não podem
> quebrar isso.
>
> Spec-mãe: `../SPEC_CHATWOOTJS.md`. Fonte da verdade: `./chatwoot/` (só leitura,
> nunca editar) + `chatwoot/db/schema.rb` na versão pinada (ver D0).
> O roadmap v1 (`M0–M12`, app completo 1:1) foi arquivado em `_arquivo-v1/`
> e **não é mais o plano vigente**.

## Progresso

`Spec` = documento escrito. `Impl` = código finalizado — só vira `[x] done`
quando o aceite da spec estiver cumprido (comandos da spec passando em CI/local).

| Módulo | Spec                      | Descrição                                                     | Spec     | Impl     |
| ------ | ------------------------- | ------------------------------------------------------------- | -------- | -------- |
| D0     | `D0-inventario-diff.md`   | Pinar versão, inventário 98 tabelas + harness de diff         | [x] done | [ ] todo |
| D1     | `D1-tabelas-faltantes.md` | Criar as ~36 tabelas faltantes (nomes Rails exatos)           | [x] done | [ ] todo |
| D2     | `D2-colunas-tipos.md`     | Paridade coluna-a-coluna: tipos, defaults, null, índices, FKs | [x] done | [ ] todo |
| D3     | `D3-import-chatwoot.md`   | Import: dump do Chatwoot original → nosso banco               | [x] done | [ ] todo |
| D4     | `D4-export-chatwoot.md`   | Export: nosso banco → dump que o Rails aceita                 | [x] done | [ ] todo |
| D5     | `D5-conformidade.md`      | CI anti-drift + política de upgrade do Chatwoot               | [x] done | [ ] todo |

## Ordem de execução

```
D0 → D1 → D2 → (D3 + D4 em paralelo) → D5
```

D3 e D4 só começam com D2 com aceite verde na tabela-alvo do teste
(pelo menos `accounts, users, inboxes, contacts, conversations, messages`).
D5 fecha a trilha e vira guarda permanente: nenhum PR futuro pode вводить
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
