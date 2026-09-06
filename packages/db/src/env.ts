// O .env é único na raiz do monorepo.
// Este módulo deve ser o PRIMEIRO import de qualquer entrypoint que usa o db,
// pois ES imports são avaliados antes do corpo do módulo.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
for (const candidate of [
  resolve(here, "../../.env"),
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), ".env"),
]) {
  if (existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}
