import "./env";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { cableRoute, websocket } from "./cable";
import { notFound, onError } from "./routes/v1/_helpers";
import auth from "./routes/auth";
import hc from "./routes/hc";
import publicWidget from "./routes/public";
import v1 from "./routes/v1/index";
import {
  initJobs,
  registerAutomationListeners,
  registerAutomationSweep,
  registerCampaignJob,
  registerContactImportJob,
  registerMacroJob,
  registerReportingEmitters,
  registerReportingRollup,
  registerSnoozeJob,
  registerWebhookJob,
} from "@chatwootjs/core";

// Jobs de background (in-process sem REDIS_URL; BullMQ com REDIS_URL).
registerContactImportJob();
registerSnoozeJob();
registerMacroJob();
registerWebhookJob();
registerCampaignJob();
registerAutomationListeners();
registerAutomationSweep();
registerReportingEmitters();
registerReportingRollup();
void initJobs();

const app = new Hono();

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3001";

app.use(logger());
app.use(
  "/*",
  cors({
    origin: CORS_ORIGIN,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.onError(onError);
app.notFound(notFound);

app.get("/", (c) => {
  return c.text("OK");
});

app.get("/health", (c) => {
  return c.json({ ok: true });
});

app.route("/auth", auth);
app.route("/api/v1", v1);
app.route("/hc/api", hc);
app.route("/public/api/v1/widgets", publicWidget);
app.get("/cable", cableRoute);

// Widget embeddável (M5): build IIFE de apps/widget (vanilla, sem React — ver ADR-001).
const WIDGET_JS = `${process.cwd()}/../widget/dist/widget.js`;
app.get("/widget.js", async (c) => {
  const file = Bun.file(WIDGET_JS);
  if (!(await file.exists())) {
    return c.text("Widget not built (run: turbo run build -F widget)", 404);
  }
  c.header("Content-Type", "application/javascript");
  c.header("Cache-Control", "public, max-age=60");
  return new Response(file.stream());
});

// Página demo do widget (QA manual — mesma origem, sem problema de CORS).
app.get("/widget-demo", (c) => {
  const token = c.req.query("website_token") ?? "";
  return c.html(`<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>Widget demo</title></head>
<body style="font-family:sans-serif;padding:40px">
  <h1>Site demo</h1>
  <p>Cole o snippet abaixo em qualquer HTML estático para testar o widget.</p>
  <pre>&lt;script&gt;
  window.chatwootSettings = { websiteToken: "${token || "SEU_WEBSITE_TOKEN"}" };
&lt;/script&gt;
&lt;script src="/widget.js" defer&gt;&lt;/script&gt;</pre>
  <script>window.chatwootSettings = { websiteToken: "${token}" };</script>
  <script src="/widget.js" defer></script>
</body>
</html>`);
});

// Arquivos enviados (anexos). Em produção, trocar por S3/MinIO (ver lib/storage).
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? `${process.cwd()}/.uploads`;
app.get("/uploads/*", async (c) => {
  const key = c.req.path.replace(/^\/uploads\//, "");
  if (key.includes("..")) return c.text("Forbidden", 403);
  const file = Bun.file(`${UPLOAD_DIR}/${key}`);
  if (!(await file.exists())) return c.text("Not found", 404);
  return new Response(file.stream(), {
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
});

export default { fetch: app.fetch, websocket };
