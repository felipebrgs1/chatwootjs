import { chromium } from "playwright-core";

const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`;
const WEB = process.env.WEB_URL ?? "http://localhost:3121";
const SHOTS = new URL("../shots/", import.meta.url);

await Bun.$`mkdir -p ${SHOTS.pathname}`.quiet();

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

// Login
await page.goto(`${WEB}/auth/login`);
await page.getByLabel("E-mail").fill("admin@demo.test");
await page.getByLabel("Senha").fill("password123");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL("**/app", { timeout: 15000 });
await page.waitForTimeout(1200);

// M2 — settings → inboxes
await page.goto(`${WEB}/app/settings/inboxes`);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${SHOTS.pathname}/app-inboxes.png` });

// M2 — wizard
await page.goto(`${WEB}/app/settings/inboxes/new`);
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOTS.pathname}/app-inbox-new.png` });

// M2 — inbox detail (working hours)
await page.goto(`${WEB}/app/settings/inboxes/1`);
await page.waitForTimeout(800);
await page.getByRole("button", { name: "Horário comercial" }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOTS.pathname}/app-inbox-working-hours.png` });

// M3 — contacts
await page.goto(`${WEB}/app/contacts`);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${SHOTS.pathname}/app-contacts.png` });

// M3 — settings labels
await page.goto(`${WEB}/app/settings/labels`);
await page.waitForTimeout(800);
await page.screenshot({ path: `${SHOTS.pathname}/app-labels.png` });

// M3 — custom attributes
await page.goto(`${WEB}/app/settings/custom-attributes`);
await page.waitForTimeout(800);
await page.screenshot({ path: `${SHOTS.pathname}/app-custom-attributes.png` });

// M4 — thread da conversa 2 (urgente, com labels)
await page.goto(`${WEB}/app/conversations/2`);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOTS.pathname}/app-thread.png` });
// aba ações do painel de detalhes (tolerante: o painel pode já vir expandido)
try {
  await page.getByRole("button", { name: "Ações" }).click({ timeout: 3000 });
  await page.waitForTimeout(500);
} catch {
  /* painel de ações já visível */
}
await page.screenshot({ path: `${SHOTS.pathname}/app-thread-actions.png` });

// M5 — widget (página demo servida pelo server :3000, mesma origem do widget.js)
const SERVER = process.env.SERVER_URL ?? "http://localhost:3000";
const demoToken = process.env.WIDGET_TOKEN ?? "";
await page.goto(`${SERVER}/widget-demo${demoToken ? `?website_token=${demoToken}` : ""}`);
await page.waitForTimeout(1500);
await page.evaluate(() => {
  document.getElementById("chatwoot-widget")?.shadowRoot.querySelector(".cw-launcher")?.click();
});
await page.waitForTimeout(800);
await page.screenshot({ path: `${SHOTS.pathname}/app-widget-home.png` });

// M10 — wizard com os 11 canais
await page.goto(`${WEB}/app/settings/inboxes/new`);
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOTS.pathname}/app-inbox-channels.png` });

// M11 — notificações
await page.goto(`${WEB}/app/notifications`);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${SHOTS.pathname}/app-notifications.png` });

// M12 — auditoria
await page.goto(`${WEB}/app/settings/audit-logs`);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${SHOTS.pathname}/app-audit-logs.png` });

// M12 — superadmin (console separado)
await page.goto(`${WEB}/superadmin/login`);
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOTS.pathname}/superadmin-login.png` });

await browser.close();
console.log("shots ok:", SHOTS.pathname);
process.exit(0);
