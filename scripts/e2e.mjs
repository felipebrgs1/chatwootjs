/**
 * R1 — E2E ponta a ponta autoabastecido (não depende do seed estar intocado).
 *
 * Fluxo: login → cria a própria conversa via canal API → confere na lista →
 * abre na UI → envia mensagem → resolve → relatório → auditoria → assign +
 * sino do agente → busca global → captain (501 sem flag) → superadmin.
 *
 * Idempotente: cada execução cria um contato/conversa novos (`e2e-<runId>`),
 * então pode rodar 2× seguidas com o mesmo resultado.
 *
 * Uso: WEB_URL=http://localhost:3001 SERVER_URL=http://localhost:3000 bun scripts/e2e.mjs
 */
import { chromium } from "playwright-core";

const CHROME =
  process.env.CHROME_PATH ??
  `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`;
const WEB = process.env.WEB_URL ?? "http://localhost:3001";
const SERVER = process.env.SERVER_URL ?? "http://localhost:3000";

const runId = Date.now().toString(36);
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(ok ? "  ✓" : "  ✗", name, detail);
}

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

// API helper (login direto para assertions de API)
async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${SERVER}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

const signIn = await api("/auth/sign_in", {
  method: "POST",
  body: { email: "admin@demo.test", password: "password123" },
});
const token = signIn.json?.data?.access_token ?? signIn.json?.access_token;
check("API login admin", signIn.status === 200 && !!token, `status=${signIn.status}`);
if (!token) {
  console.error("sem token, abortando");
  await browser.close();
  process.exit(1);
}

const accounts = await api("/api/v1/accounts", { token });
const accountId = accounts.json?.data?.accounts?.[0]?.id ?? accounts.json?.accounts?.[0]?.id;
check("lista contas", !!accountId, `account=${accountId}`);
if (!accountId) {
  console.error("sem conta, abortando");
  await browser.close();
  process.exit(1);
}

// --- Autoabastecimento: cria a conversa de teste pelo canal API ---
const inboxes = await api(`/api/v1/accounts/${accountId}/inboxes`, { token });
const inboxList = inboxes.json?.data?.inboxes ?? inboxes.json?.inboxes ?? [];
const apiInbox = inboxList.find(
  (i) => i.channel_type === "Channel::Api" || i.channelType === "Channel::Api",
);
check("inbox de canal API existe", !!apiInbox, `inboxes=${inboxList.length}`);
if (!apiInbox) {
  console.error("sem inbox Channel::Api no seed — rode bun run db:seed");
  await browser.close();
  process.exit(1);
}

const inboundBody = `e2e entrada ${runId}`;
const created = await api(`/api/v1/accounts/${accountId}/api_channel/conversations`, {
  method: "POST",
  token,
  body: {
    inbox_id: apiInbox.id,
    contact: { identifier: `e2e-${runId}`, name: `Contato E2E ${runId}` },
    message: { content: inboundBody },
  },
});
const conv = created.json?.data?.conversation ?? created.json?.conversation;
check(
  "API cria conversa via canal API",
  [200, 201].includes(created.status) && !!conv?.id,
  `status=${created.status} id=${conv?.id}`,
);
if (!conv?.id) {
  console.error("não criou conversa, abortando");
  await browser.close();
  process.exit(1);
}

const convs = await api(`/api/v1/accounts/${accountId}/conversations?status=open`, { token });
const list =
  convs.json?.data?.data ?? convs.json?.data?.conversations ?? convs.json?.conversations ?? [];
check(
  "lista conversas abertas contém a criada",
  convs.status === 200 && list.some((c) => String(c.id) === String(conv.id)),
  `n=${list.length}`,
);
const convId = conv.id;

// --- UI: login → abre a conversa criada → vê inbound → envia mensagem ---
await page.goto(`${WEB}/auth/login`);
await page.getByLabel("E-mail").fill("admin@demo.test");
await page.getByLabel("Senha").fill("password123");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL("**/app**", { timeout: 15000 });
check("UI login", true);

await page.goto(`${WEB}/app/conversations/${convId}`);
await page.getByText(inboundBody).first().waitFor({ timeout: 15000 });
check("UI carrega a conversa criada", true, `conv=${convId}`);

const outboundBody = `e2e saída ${runId}`;
const editor = page.locator("textarea").first();
await editor.fill(outboundBody);
await editor.press("Enter");
await page
  .getByText(outboundBody)
  .first()
  .waitFor({ timeout: 10000 })
  .catch(() => {});
const sent = await page.getByText(outboundBody).count();
check("UI envia mensagem", sent > 0, `ocorrências=${sent}`);

// --- API: resolve a conversa ---
const resolved = await api(`/api/v1/accounts/${accountId}/conversations/${convId}/toggle_status`, {
  method: "POST",
  token,
  body: { status: "resolved" },
});
check("API resolve conversa", [200, 201].includes(resolved.status), `status=${resolved.status}`);

// Relatório reflete (since no formato YYYY-MM-DD do reports_controller)
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const summary = await api(`/api/v1/accounts/${accountId}/reports/summary?since=${yesterday}`, {
  token,
});
check("API relatório summary", summary.status === 200, `status=${summary.status}`);

// Auditoria registrou (M12)
const audit = await api(`/api/v1/accounts/${accountId}/audit_logs`, { token });
const entries = audit.json?.data?.audit_logs ?? [];
check(
  "API auditoria tem eventos",
  audit.status === 200 && entries.length > 0,
  `n=${entries.length}`,
);

// Assign para o agente → sino realtime (R1: notification_settings default)
const agents = await api(`/api/v1/accounts/${accountId}/agents`, { token });
const agentList = agents.json?.data?.agents ?? agents.json?.agents ?? [];
const other = agentList.find((a) => a.email === "agent@demo.test");
if (other) {
  const assign = await api(`/api/v1/accounts/${accountId}/conversations/${convId}/assignments`, {
    method: "POST",
    token,
    body: { assignee_id: other.id },
  });
  check("API atribui conversa ao agente", assign.status === 200, `status=${assign.status}`);
}
const agentLogin = await api("/auth/sign_in", {
  method: "POST",
  body: { email: "agent@demo.test", password: "password123" },
});
const agentToken = agentLogin.json?.data?.access_token ?? agentLogin.json?.access_token;
const notifs = await api(`/api/v1/notifications?account_id=${accountId}`, { token: agentToken });
const items = notifs.json?.data?.notifications ?? [];
check(
  "API sino do agente tem assign",
  notifs.status === 200 && items.length > 0,
  `n=${items.length}`,
);

// Busca global (M11)
const search = await api(`/api/v1/accounts/${accountId}/search?q=car`, { token });
const sdata = search.json?.data ?? {};
check("API busca global", search.status === 200 && !!sdata.contacts, `status=${search.status}`);

// Captain sem flag → 501 claro (M12)
const captain = await api(`/api/v1/accounts/${accountId}/captain/assist`, {
  method: "POST",
  token,
  body: { type: "summarize", conversation_id: convId },
});
check("API captain 501 sem flag", captain.status === 501, `status=${captain.status}`);

// Superadmin (M12)
const superLogin = await fetch(`${SERVER}/super_admin/auth/sign_in`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "superadmin@demo.test", password: "password123" }),
});
const superJson = await superLogin.json().catch(() => ({}));
const superToken = superJson?.data?.token;
check("superadmin login", superLogin.status === 200 && !!superToken, `status=${superLogin.status}`);
if (superToken) {
  const res = await fetch(`${SERVER}/super_admin/accounts`, {
    headers: { Authorization: `Bearer ${superToken}` },
  });
  check("superadmin lista contas", res.status === 200, `status=${res.status}`);
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\ne2e: ${results.length - failed.length}/${results.length} ok`);
process.exit(failed.length ? 1 : 0);
