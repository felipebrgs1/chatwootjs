import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

// O .env é único na raiz do monorepo — o drizzle-kit roda com cwd em
// packages/db, então carregamos o da raiz explicitamente.
// (Inline aqui porque o drizzle-kit resolve este arquivo via CJS e não
//  aceita importar o módulo ./env sem extensão.)
const configDir = dirname(fileURLToPath(import.meta.url));
for (const candidate of [
  resolve(configDir, "../../.env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), ".env"),
]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
