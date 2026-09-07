# D5 — Conformidade contínua (anti-drift + política de upgrade)

## 1. Objetivo

Garantir a frase do pedido: "**ao tempo faremos atualizações, mas essa parte
deve ser possível ainda**". D5 tranca a compatibilidade de dump como
propriedade permanente do repo: nenhum PR futuro quebra em silêncio, e subir o
pino do Chatwoot vira procedimento, não aventura.

## 2. Referência Chatwoot

- `docs/specs/CHATWOOT_PIN.md` (D0), `docs/specs/drift-permitido.md`,
  `scripts/schema-diff.mjs`, fixtures e scripts de D3/D4.
- `chatwoot/db/schema.rb` e `chatwoot/db/migrate/*` da versão nova na hora de repinar.

## 3. Tarefa

1. **CI anti-drift:** workflow (ou job no CI existente) que em todo PR roda:
   - `bun scripts/schema-diff.mjs` (falha em divergência não declarada);
   - `db:migrate` do zero + import da fixture mini (D3) + round-trip (D4)
     contra Postgres de serviço — falha em qualquer erro de restore,
     `EXCEPT` não-vazio ou sequência quebrada.
   - Tempo-alvo: < 10 min.
2. **Política de `drift-permitido.md`:** cada entrada precisa de
   `motivo | impacto no dump | plano de convergência | dono | expira em`.
   Entrada sem esses campos quebra o CI. Revisão trimestral calendarizada.
3. **Procedimento de upgrade do pino** em `docs/specs/upgrade-chatwoot.md`:
   - como atualizar `CHATWOOT_PIN.md` (nova tag, novo `schema.rb`);
   - regenerar `schema-inventario.md`, rodar diff, abrir PRs D1/D2-like para o
     delta, revalidar D3/D4, só então mover o pino;
   - regra: `main` sempre importa/exporta contra o pino declarado, nunca contra
     "latest" flutuante.
4. **Fechamento da trilha:** marcar `Impl done` em `000-indice.md` para D0–D4
   somente com CI verde + evidências de D3/D4 anexadas; D5 done = CI ativo no
   `main` + doc de upgrade + primeira revisão de drift feita.

## 4. Aceite

- [ ] PR de teste com drift proposital (ex.: coluna renomeada) **quebra** o CI
      com mensagem apontando a divergência e o arquivo de exceção.
- [ ] CI executa import da fixture + round-trip e passa no `main`.
- [ ] `docs/specs/upgrade-chatwoot.md` existe com passo a passo executável.
- [ ] `000-indice.md` com `Impl [x] done` em D0–D5 só após os itens acima.

## 5. Done

PR com workflow de CI + docs (`upgrade-chatwoot.md`, política de drift) +
print/log do CI verde e do CI quebrando sob drift proposital (link ou anexo).
A partir daqui, a regra do repo passa a ser: **sem D5 verde, nenhum merge
que toque `packages/db`, scripts de dump ou o pino.**
