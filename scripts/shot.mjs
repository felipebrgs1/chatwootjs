/**
 * R1 — Screenshots do dashboard (playwright-core), com portas corretas e
 * dados obtidos via API (sem IDs hardcoded).
 *
 * Uso: bun scripts/shot.mjs
 *   WEB_URL=http://localhost:3001 SERVER_URL=http://localhost:3000 (defaults)
 * Saída: shots/*.png
 */
import { chromium } from "playwright-core";

const CHROME =
  process.env.CHROME_PATH ??
  `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`;
const WEB = process.env.WEB_URL ?? "http://localhost:3001";
const SERVER = process.env.SERVER_URL ?? "http://localhost:3000";
const SHOTS = new URL("../shots/", import.meta.url);

await Bun.$`mkdir -p ${SHOTS.pathname}`.quiet();

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${SERVER}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

// Contexto via API: conta, inbox do widget (token) e conversa para a thread.
const signIn = await api("/auth/sign_in", {
  method: "POST",
  body: { email: "admin@demo.test", password: "password123" },
});
const token = signIn.json?.data?.access_token ?? signIn.json?.access_token;
const accounts = await api("/api/v1/accounts", { token });
const accountId = accounts.json?.data?.accounts?.[0]?.id ?? accounts.json?.accounts?.[0]?.id;
if (!accountId) throw new Error("sem conta demo — rode bun run db:seed");

const inboxes = await api(`/api/v1/accounts/${accountId}/inboxes`, { token });
const inboxList = inboxes.json?.data?.inboxes ?? inboxes.json?.inboxes ?? [];
const webInbox = inboxList.find((i) =>
  String(i.channel_type ?? i.channelType).includes("WebWidget"),
);
const websiteToken = webInbox?.channel?.website_token ?? process.env.WIDGET_TOKEN ?? "";

const convs = await api(`/api/v1/accounts/${accountId}/conversations?status=open`, { token });
const convList =
  convs.json?.data?.data ?? convs.json?.data?.conversations ?? convs.json?.conversations ?? [];
const conversationId = convList[0]?.id ?? 1;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

async function settle(selector, timeout = 8000) {
  if (selector) {
    await page
      .locator(selector)
      .first()
      .waitFor({ timeout })
      .catch(() => {});
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
}

// Login
await page.goto(`${WEB}/auth/login`);
await page.getByLabel("E-mail").fill("admin@demo.test");
await page.getByLabel("Senha").fill("password123");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL("**/app**", { timeout: 15000 });
await settle();

// M2 — settings → inboxes
await page.goto(`${WEB}/app/settings/inboxes`);
await settle("text=Site Demo");
await page.screenshot({ path: `${SHOTS.pathname}/app-inboxes.png` });

// M2 — wizard
await page.goto(`${WEB}/app/settings/inboxes/new`);
await settle("text=Canais");
await page.screenshot({ path: `${SHOTS.pathname}/app-inbox-new.png` });

// M2 — inbox detail (working hours)
if (webInbox?.id) {
  await page.goto(`${WEB}/app/settings/inboxes/${webInbox.id}`);
  await settle("text=Horário comercial");
  await page
    .getByRole("button", { name: "Horário comercial" })
    .click({ timeout: 3000 })
    .catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS.pathname}/app-inbox-working-hours.png` });
}

// M3 — contacts
await page.goto(`${WEB}/app/contacts`);
await settle("text=Carla Souza");
await page.screenshot({ path: `${SHOTS.pathname}/app-contacts.png` });

// M3 — settings labels
await page.goto(`${WEB}/app/settings/labels`);
await settle("text=suporte");
await page.screenshot({ path: `${SHOTS.pathname}/app-labels.png` });

// M3 — custom attributes
await page.goto(`${WEB}/app/settings/custom-attributes`);
await settle();
await page.screenshot({ path: `${SHOTS.pathname}/app-custom-attributes.png` });

// M4 — thread da primeira conversa aberta
await page.goto(`${WEB}/app/conversations/${conversationId}`);
await settle("textarea");
await page.screenshot({ path: `${SHOTS.pathname}/app-thread.png` });
try {
  await page.getByRole("button", { name: "Ações" }).click({ timeout: 2500 });
  await page.waitForTimeout(400);
} catch {
  /* painel de ações já visível */
}
await page.screenshot({ path: `${SHOTS.pathname}/app-thread-actions.png` });

// M5 — widget (página demo servida pelo server :3000, mesma origem do widget.js)
await page.goto(`${SERVER}/widget-demo${websiteToken ? `?website_token=${websiteToken}` : ""}`);
await page
  .waitForFunction(
    () => !!document.getElementById("chatwoot-widget")?.shadowRoot?.querySelector(".cw-launcher"),
    { timeout: 10000 },
  )
  .catch(() => {});
await page
  .evaluate(() => {
    document.getElementById("chatwoot-widget")?.shadowRoot?.querySelector(".cw-launcher")?.click();
  })
  .catch(() => {});
await page.waitForTimeout(700);
await page.screenshot({ path: `${SHOTS.pathname}/app-widget-home.png` });

// M10 — wizard com os canais
await page.goto(`${WEB}/app/settings/inboxes/new`);
await settle("text=Canais");
await page.screenshot({ path: `${SHOTS.pathname}/app-inbox-channels.png` });

// M11 — notificações
await page.goto(`${WEB}/app/notifications`);
await settle();
await page.screenshot({ path: `${SHOTS.pathname}/app-notifications.png` });

// M12 — auditoria
await page.goto(`${WEB}/app/settings/audit-logs`);
await settle();
await page.screenshot({ path: `${SHOTS.pathname}/app-audit-logs.png` });

// M12 — superadmin (console separado)
await page.goto(`${WEB}/superadmin/login`);
await settle();
await page.screenshot({ path: `${SHOTS.pathname}/superadmin-login.png` });

await browser.close();
console.log(
  `shots ok: ${SHOTS.pathname} (conversation=${conversationId}, inbox=${webInbox?.id ?? "?"}, widget=${websiteToken ? "token ok" : "sem token"})`,
);
process.exit(0);
