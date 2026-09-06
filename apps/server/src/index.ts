import "./env";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { cableRoute, websocket } from "./cable";
import { notFound, onError } from "./routes/v1/_helpers";
import auth from "./routes/auth";
import v1 from "./routes/v1/index";
import { registerContactImportJob, registerSnoozeJob } from "@chatwootjs/core";

// Jobs de background (in-process; BullMQ entra no M6).
registerContactImportJob();
registerSnoozeJob();

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
app.get("/cable", cableRoute);

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
