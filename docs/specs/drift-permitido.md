# drift-permitido — exceções declaradas à paridade de dump

> Como funciona: `scripts/schema-diff.mjs` lê deste arquivo SOMENTE os itens de
> lista no formato `- \`token\``no início da linha (tokens no meio do texto,
como menções em prosa, são ignorados). Token`tabela`libera a tabela;
token`tabela.coluna`(ou`coluna`sozinha) libera a coluna.
Cada entrada precisa de motivo, impacto no dump, plano e expiração —
sem esses campos, D5 quebra o CI (ver`D5-conformidade.md`).

## Exceções vigentes

- `super_admins` — tabela só nossa (o Rails usa flag em `users`, não tabela).
  Motivo: console superadmin local (v1). Impacto no dump: tabela **excluída
  do export** (`--exclude-table=super_admins`) em D4 e ignorada no import
  (D3); o dump de domínio continua restaurável nos dois sentidos sem ela.
  Plano: manter fora do dump de domínio; convergência futura (flag em
  `users`) só se o pino do Chatwoot exigir. Expira em: nunca (permanente
  até decisão explícita em contrário).

## Decisões D1 (registro, não exceções — sem efeito no diff)

- labels vs tags/taggings: sem conflito. O Rails tem as três tabelas
  (labels, tags, taggings); aqui labels e taggings já existiam e tags foi
  criada em D1. Colunas de taggings (apontam para labels em vez de tags)
  alinham em D2.
- channel_twitter_profiles: só o nome da constante TS divergia
  (channelTwitters); a tabela já tinha o nome Rails. Constante mantida
  para não tocar rotas/services em D1.
- audits: tabela renomeada via ALTER TABLE (migration D1, sem perda de
  dados); colunas ainda nossas para não quebrar o service — D2 alinha
  coluna-a-coluna com o Rails.

## Histórico (já convergido — manter como registro)

(nenhum ainda)
