# M7 — Campaigns

Depende de: **M4, M5, M6**. Paralelizável com M8, M9.

## 1. Objetivo

Campanhas `ongoing` (gatilho no widget/site) e `one_off` (disparo em massa
para audiência filtrada) — paridade com o módulo Campaigns do Chatwoot.

## 2. Referência Chatwoot

- `chatwoot/app/models/campaign.rb` + `campaigns_controller.rb`
- Vue: `dashboard/routes/dashboard/campaigns/` (lista, builder, audiência preview)
- Workers: `Campaigns::TriggerOneoffCampaignService`,
  `Campaigns::TriggerOngoingCampaignService`

## 3. DB

- `campaigns (id, account_id, inbox_id, title, message, trigger_rules jsonb
(url, time_on_page), campaign_type 0 ongoing/1 one_off,
campaign_status 0 active/1 completed, scheduled_at, audience jsonb
(labels, inboxes, conditions), created_at, updated_at)`

## 4. API + Jobs

| Método           | Path                                          | Obs                                 |
| ---------------- | --------------------------------------------- | ----------------------------------- |
| GET/POST         | `/api/v1/accounts/:id/campaigns`              | `campaign_type` filter              |
| GET/PATCH/DELETE | `/api/v1/accounts/:id/campaigns/:id`          |                                     |
| GET              | `/api/v1/accounts/:id/campaigns/:id/audience` | preview (count + amostra)           |
| POST             | `/api/v1/accounts/:id/campaigns/:id/trigger`  | one_off → job dispara por audiência |

- Job `campaign_oneoff`: pagina audiência (contatos com `contact_inbox` na inbox,
  respeitando `audience.labels`), cria/envia mensagem template por contato,
  marca `campaign_status=completed`, registra falhas.
- Ongoing: widget (M5) avalia `trigger_rules` (URL + tempo na página) e exibe
  a mensagem como Mi campanha ativa da inbox.

## 5. Front

- `campaigns/index` (cards/tabela por tipo+status) + `campaigns/:id`
  (builder: inbox, mensagem, audiência por labels, agendamento one_off).
- Preview da audiência igual ao Vue.

## 6. Aceite

- [ ] One-off para 200 contatos com label X envia 200 mensagens, com contador
      de sucesso/falha e status `completed`.
- [ ] Ongoing aparece no widget após N segundos na URL configurada.
- [ ] Audiência preview bate com o disparo real.

## 7. Done

Migration + CRUD + trigger + jobs + builder + testes (audiência, idempotência
do trigger — rodar 2x não duplica).
