import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@my-better-t-app/api/context";
import { appRouter } from "@my-better-t-app/api/routers/index";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// O .env é único na raiz do monorepo. Em dev o Bun/Node carrega o .env do
// cwd, que é apps/server — então carregamos o da raiz explicitamente.
// Não sobrescreve variáveis já definidas (ex.: `environment:` no compose).
const here = dirname(fileURLToPath(import.meta.url));
for (const candidate of [
  resolve(here, "../../../.env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), ".env"),
]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const app = new Hono();

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3001";

app.use(logger());
app.use(
  "/*",
  cors({
    origin: CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
