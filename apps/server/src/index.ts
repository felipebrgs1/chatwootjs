import "./env";

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { notFound, onError } from "./routes/v1/_helpers";
import auth from "./routes/auth";
import v1 from "./routes/v1/index";
import { registerContactImportJob } from "@chatwootjs/core";

// Jobs de background (in-process; BullMQ entra no M6).
registerContactImportJob();

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

export default app;
