# ChatwootJS — paridade 1:1 com o Chatwoot OSS (M0–M12 ✅ `v1-parity`)

Recriação do **Chatwoot open-source** (comportamento, API e visual) com stack
JS moderna: **HonoJS + Drizzle + Zod + React 19 + TanStack Router/Query +
Tailwind/shadcn + Bun + Turbo + Postgres + Caddy.**

Fonte da verdade funcional/visual: `./chatwoot/` (Rails+Vue, só leitura).
Specs executáveis: `docs/SPEC_CHATWOOTJS.md` + `docs/specs/M0..M12`
(progresso em `docs/specs/000-indice.md`).

## Demo em 5 minutos

```bash
bun install
cp .env.example .env            # ajuste DATABASE_URL se preciso
bun run db:start                 # postgres via docker (ou use o seu)
bun run db:migrate && bun run db:seed
bun run dev                      # API :3000 + web :3001
```

Credenciais do seed (senha `password123` para todos):

| Quem  | E-mail                 | Papel                            |
| ----- | ---------------------- | -------------------------------- |
| Ada   | `admin@demo.test`      | administradora                   |
| Alan  | `agent@demo.test`      | agente                           |
| Super | `superadmin@demo.test` | superadmin (`/superadmin/login`) |

Fluxo ponta a ponta: login → `/app/conversations/2` → enviar mensagem →
resolver → `/app/reports` reflete → `/app/settings/audit-logs` registra.
E2E automatizado: `bun scripts/e2e.mjs` (13 checks, exige API :3000 + web :3001).
Screenshots: `bun scripts/shot.mjs` (saída em `shots/`).

## Widget embeddável

```html
<script>
  window.chatwootSettings = { websiteToken: "SEU_WEBSITE_TOKEN" };
</script>
<script src="http://localhost:3000/widget.js" defer></script>
```

Token em Settings → Inboxes → (inbox Website) → Configuração. Demo:
`http://localhost:3000/widget-demo?website_token=...`.

## Matriz de canais (M10)

| Canal              | Inbound                              | Outbound                             | Webhook           |
| ------------------ | ------------------------------------ | ------------------------------------ | ----------------- |
| Website / API      | widget / REST                        | realtime                             | —                 |
| Email              | IMAP poller + `POST /webhooks/email` | SMTP da inbox                        | SendGrid/SES      |
| Telegram           | `POST /webhooks/telegram/:bot_token` | Bot API                              | BotFather         |
| WhatsApp Meta      | `POST /webhooks/whatsapp`            | Cloud API (+ templates)              | app Meta          |
| WhatsApp Evolution | `POST /webhooks/evolution`           | sendText/sendMedia                   | `MESSAGES_UPSERT` |
| Facebook           | `POST /webhooks/facebook`            | Send API                             | app Meta          |
| Instagram          | `POST /webhooks/instagram`           | Send API                             | app Meta          |
| Twitter/X          | `POST /webhooks/twitter` (CRC+DM)    | indisponível no MVP (`failed` claro) | Account Activity  |
| SMS                | `POST /webhooks/sms/twilio`          | Twilio                               | console Twilio    |
| Line               | `POST /webhooks/line` (HMAC)         | push                                 | console Line      |
| Voice              | `POST /webhooks/voice?identifier=`   | stub (registra a chamada)            | Twilio Voice      |

Detalhes por canal: `docs/canais/*.md`. Idempotência por `source_id` em todos.

## Módulos

M0 fundação · M1 auth/contas · M2 inboxes · M3 contatos · M4 conversas ·
M5 widget · M6 automação · M7 campanhas · M8 relatórios · M9 help center ·
M10 canais externos · M11 notificações/presença/`⌘K`/views ·
M12 superadmin (`/superadmin`), auditoria (`settings/audit-logs`),
AgentBots (aba na inbox), Captain/AI stub (`✨` com
`feature_flags.captain_enabled` + `CAPTAIN_API_KEY`/`OPENAI_API_KEY`).

## Comandos

```bash
bun run dev            # API :3000 + web :3001
bun run check-types    # tsc em todos os pacotes
bun run check          # oxlint + oxfmt
bun run db:seed        # re-seed idempotente
bun scripts/e2e.mjs    # e2e (API :3000 + web :3001 no ar)
bun scripts/shot.mjs   # screenshots (saída em shots/)
```

## Convenções (resumo)

- API 1:1 com o Rails: mesmos paths, status e envelopes (`{ data, meta }`).
- Banco espelha `chatwoot/db/schema.rb` (snake_case); migrations via drizzle-kit.
- Domínio é Hono REST + `zValidator` (sem tRPC no domínio).
- `.env` único na raiz (nunca commitar). `chatwoot/` é só leitura.
