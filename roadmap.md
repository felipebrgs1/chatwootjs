# Roadmap ChatwootJS → 100% do Chatwoot OSS (pino 4.17.1)

> **O que é:** plano de execução por **módulo de produto**. O `roadmap.md` (este
> arquivo) é o índice; cada estágio tem um documento próprio em `roadmap/` com
> **tudo o que falta para bater 100% daquele módulo**: inventário de endpoints,
> telas, tarefas com IDs, aceite reproduzível e definição de done.
>
> **Escopo:** `chatwoot/app/` + dashboard + widget (Chatwoot **OSS**).
>
> - ❌ **Fora por decisão:** i18n (pt-BR/en) e pipeline/CI.
> - ❌ **Fora por licença:** `chatwoot/enterprise/` (SLA, custom roles,
>   capacity, calls/voice, copilot, Captain avançado, reporting_events,
>   campaign analytics). Cada doc marca o que é enterprise.
> - 🎁 **Bônus já implementados:** Empresas, Audit Logs e Custom Attributes
>   (no Rails são Enterprise/parciais) — mantidos.
>
> **DDL/dump:** já 100% pela trilha D (`schema-diff` + roundtrip). Nenhum módulo
> pode alterar schema; só usar tabelas/colunas existentes.

---

## 1. Definição de 100% (global)

Um módulo só fecha 100% quando **todas** as condições abaixo valem para ele:

1. **API 1:1:** toda action pública dos controllers OSS do módulo responde no
   mesmo `path`/método, com mesmo status (401/403/404/422) e mesmo envelope
   (`{ data, meta }` / `{ error, attributes }`).
2. **Front 1:1:** toda rota do Vue router do módulo tem página funcional com
   dados reais, estados vazio/loading/erro e comparação visual lado a lado com
   o original.
3. **Dados:** usa as tabelas/colunas do pino (sem DDL novo) e fecha os fluxos de
   escrita/leitura como o Rails.
4. **Realtime/jobs:** eventos e trabalhos assíncronos equivalentes, com
   idempotência.
5. **Aceite local verde:** comandos do doc do módulo + `bun run check-types` +
   `bunx oxlint` + `bun scripts/parity-report.mjs` (métrica do módulo sobe) e
   `bun scripts/e2e.mjs` quando o módulo tiver fluxo no e2e.
6. **Evidência:** o doc do módulo marca `[x]` e o status é atualizado aqui e no
   `docs/specs/paridade-mapa.md` (gerado).

> Os percentuais de partida vêm de `bun scripts/parity-report.mjs`
> (baseline 10/09/2026: **API 26/33 áreas — 46% ponderado por ações**;
> **front 15/28 áreas**). O número do módulo é o recorte dele no relatório.

---

## 2. Estágios

|   # | Módulo                               | Objetivo (1 linha)                                                    |        Status*        | Depende de  | Doc                                                                                                        |
| --: | ------------------------------------ | --------------------------------------------------------------------- | :-------------------: | ----------- | ---------------------------------------------------------------------------------------------------------- |
|  01 | Dashboard                            | Shell/UX 1:1: sidebar, layout, temas, command bar, rotas base         |    🟡 1✅ 9🟡 1❌     | —           | [`roadmap/01 - dashboard.md`](roadmap/01%20-%20dashboard.md)                                               |
|  02 | Conversas & Mensagens                | Coração do produto: thread, composer, filtros, bulk, drafts, realtime | 🟡 52% · 1✅ 7🟡 3❌  | 01          | [`roadmap/02 - conversas-e-mensagens.md`](roadmap/02%20-%20conversas-e-mensagens.md)                       |
|  03 | Contatos & Empresas                  | CRUD, merge, import/export CSV, atributos, segmentos                  | 🟡 54% · 1✅ 7🟡 4❌  | 02          | [`roadmap/03 - contatos-e-empresas.md`](roadmap/03%20-%20contatos-e-empresas.md)                           |
|  04 | Inboxes & Canais                     | Inboxes, membros, working hours e os 11 canais (in/out/webhook)       | 🟡 93% · 2✅ 18🟡 6❌ | 02          | [`roadmap/04 - inboxes-e-canais.md`](roadmap/04%20-%20inboxes-e-canais.md)                                 |
|  05 | Atribuição, Times & Agentes          | Times, agentes, assignment policies e auto-atribuição                 | 🟡 63% · 0✅ 6🟡 3❌  | 02, 04      | [`roadmap/05 - atribuicao-times-agentes.md`](roadmap/05%20-%20atribuicao-times-agentes.md)                 |
|  06 | Automação, Macros, Canned & Webhooks | Regras, macros, respostas prontas e webhooks de saída                 |   🟡 93% · 0✅ 6🟡    | 02          | [`roadmap/06 - automacao-macros-canned-webhooks.md`](roadmap/06%20-%20automacao-macros-canned-webhooks.md) |
|  07 | Relatórios & CSAT                    | API v2, live/summary reports, CSAT e exportação                       | 🟡 10% · 0✅ 3🟡 5❌  | 02          | [`roadmap/07 - relatorios-e-csat.md`](roadmap/07%20-%20relatorios-e-csat.md)                               |
|  08 | Help Center                          | Portais, categorias, artigos, API pública e portal                    | 🟡 40% · 0✅ 7🟡 1❌  | 01          | [`roadmap/08 - help-center.md`](roadmap/08%20-%20help-center.md)                                           |
|  09 | Widget & API Pública                 | Widget embeddável, API pública de inbox e CSAT público                | 🟡 24% · 0✅ 3🟡 3❌  | 02, 04      | [`roadmap/09 - widget-e-api-publica.md`](roadmap/09%20-%20widget-e-api-publica.md)                         |
|  10 | Integrações & Apps                   | Dashboard apps, Slack/Linear/Notion/Shopify/Dyte, OAuth               |   ❌ 0% · 1✅ 11❌    | 01, 09      | [`roadmap/10 - integracoes-e-apps.md`](roadmap/10%20-%20integracoes-e-apps.md)                             |
|  11 | Notificações, Busca & Comandos       | Sino, preferências, subscriptions, busca global, ⌘K, views            |    🟡 0✅ 7🟡 1❌     | 02          | [`roadmap/11 - notificacoes-busca-comandos.md`](roadmap/11%20-%20notificacoes-busca-comandos.md)           |
|  12 | Auth, Conta & Segurança              | Login/invite/reset/confirmação, perfil, MFA, sessões, conta           | 🟡 41% · 0✅ 7🟡 4❌  | —           | [`roadmap/12 - auth-conta-seguranca.md`](roadmap/12%20-%20auth-conta-seguranca.md)                         |
|  13 | Superadmin, Platform & Onboarding    | Console global, Platform API e onboarding da conta                    |   🟡 13% · 2🟡 3❌    | 12          | [`roadmap/13 - superadmin-platform-onboarding.md`](roadmap/13%20-%20superadmin-platform-onboarding.md)     |
|  14 | E-mail, Jobs & Realtime (infra)      | Mailers transacionais, filas, ActionCable multi-réplica, storage      |    🟡 0✅ 4🟡 2❌     | transversal | [`roadmap/14 - email-jobs-realtime-infra.md`](roadmap/14%20-%20email-jobs-realtime-infra.md)               |
|  15 | Captain & IA                         | Tasks OSS de IA com flag/provider; enterprise fora                    |    🟡 0✅ 5🟡 4❌     | 02, 14      | [`roadmap/15 - captain-e-ia.md`](roadmap/15%20-%20captain-e-ia.md)                                         |

\* **Percentual** = API ponderado por ações em 10/09/2026 (`bun scripts/parity-report.mjs`);
módulos sem recorte de API não têm número. **Contagem** = subáreas ✅/🟡/❌ do doc do
módulo (§2). O status definitivo é o aceite do próprio doc.

Legenda: `❌` ausente/estrutural · `🟡` parcial · `✅` 100% (aceite do doc cumprido).

---

## 3. Ordem recomendada de execução

```
Onda 1 (fundação do core):     01 → 02 → 03
Onda 2 (operação):             04 → 05 → 06
Onda 3 (valor visível):        07 → 08 → 09
Onda 4 (amplitude):            10 → 11 → 12 → 13
Transversais (podem rodar já): 14 (mailers/jobs/WS) · 15 (Captain OSS)
```

- **14** destrava e-mails de convite/reset (12), transcript/CSAT (07), sync de
  templates (04) e WS multi-réplica (11) — pode começar em paralelo.
- **11** depende de 02 (eventos de conversa) e da correção de notificações já
  feita na R1.
- **13** depende de 12 (auth/perfil) e da Platform API.
- **10** depende de 01/09 mas é paralelizável após a onda 2.

---

## 4. Como medir e aceitar (sem pipeline)

```bash
# progresso do módulo
bun scripts/parity-report.mjs --write-doc   # regenera docs/specs/paridade-mapa.md
bun scripts/parity-report.mjs --json        # para scripts de conferência

# qualidade
bun run check-types && bunx oxlint

# funcional
bun scripts/e2e.mjs        # fluxo global (deve continuar verde)
bun scripts/shot.mjs       # evidência visual (shots/)
bun scripts/db-roundtrip-check.mjs   # guarda de DDL da trilha D

# específicos do módulo: ver seção "Aceite" de cada doc
```

Regra: **nenhum módulo fecha sem os comandos do próprio doc verdes** e sem
atualizar o status neste arquivo + `docs/specs/paridade-mapa.md`.

---

## 5. Governança

- Cada doc de módulo é a **spec executável** dele (`Objetivo → Referência →
Estado → Lacunas → Tarefas → Aceite → Done`), no formato da trilha D.
- Tarefas usam IDs `NN-x`; marcar `[x]` no doc conforme concluídas.
- Tocar em `packages/db` continua proibido sem D5 verde (schema-diff + roundtrip).
- i18n e pipeline não entram em nenhum módulo; se um dia entrarem, viram
  documentos próprios.
- O roadmap anterior (`docs/specs/R0`/`R1`) fica como **histórico** (baseline e
  saneamento); este plano o substitui como fonte de execução.
