# Specs por módulo — ChatwootJS

Spec-mãe: `../SPEC_CHATWOOTJS.md` (visão, stack, layout, princípios 1:1).
Esta pasta contém **uma spec executável por módulo**. Cada spec é auto-suficiente
para um agente implementar em 1 PR.

## Progresso

`Spec` = documento escrito. `Impl` = código finalizado — só vira `[x] done`
quando o módulo estiver implementado, testado e com o aceite da spec cumprido.

| Módulo | Spec                       | Descrição                                            | Spec     | Impl     |
| ------ | -------------------------- | ---------------------------------------------------- | -------- | -------- |
| M0     | `M0-fundacao.md`           | Fundação, `packages/core`, WootUI, seed              | [x] done | [x] done |
| M1     | `M1-auth-accounts.md`      | Auth, contas, usuários, roles                        | [x] done | [x] done |
| M2     | `M2-inboxes-channels.md`   | Inboxes, canais, horário comercial                   | [x] done | [x] done |
| M3     | `M3-contacts.md`           | Contatos, labels, atributos custom, import           | [x] done | [x] done |
| M4     | `M4-conversations.md`      | Conversas, mensagens, realtime                       | [x] done | [x] done |
| M5     | `M5-widget.md`             | Widget website + Channel API                         | [x] done | [x] done |
| M6     | `M6-automation.md`         | Teams, canned, macros, automações, webhooks          | [x] done | [x] done |
| M7     | `M7-campaigns.md`          | Campanhas ongoing + one-off                          | [x] done | [x] done |
| M8     | `M8-reports.md`            | Relatórios + CSAT                                    | [x] done | [x] done |
| M9     | `M9-helpcenter.md`         | Central de ajuda / portais públicos                  | [x] done | [x] done |
| M10    | `M10-external-channels.md` | WhatsApp, Meta, Telegram, Email, SMS, Line, Voice    | [x] done | [x] done |
| M11    | `M11-notifications.md`     | Notificações, presença, busca global, filtros salvos | [x] done | [x] done |
| M12    | `M12-polish.md`            | Superadmin, auditoria, AgentBots, QA 1:1             | [x] done | [ ] todo |

## Ordem de execução

```
M0 → M1 → (M2 + M3 em paralelo) → M4 → M5 → M6 → (M7 + M8 + M9 em paralelo) → M10 → M11 → M12
```

## Formato de cada spec

1. **Objetivo** — o que o módulo entrega
2. **Referência Chatwoot** — arquivos exatos em `./chatwoot/` para copiar comportamento
3. **DB** — tabelas Drizzle (nomes/colunas iguais ao `schema.rb`)
4. **API** — endpoints Hono + schemas Zod (paths iguais ao Rails)
5. **Front** — rotas TanStack Router + componentes
6. **Aceite** — checklist testável
7. **Done** — o que o PR deve conter para ser aceito
