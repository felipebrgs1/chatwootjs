#!/usr/bin/env bun
// scripts/db-pg-lib.mjs — helpers Postgres via container (D3/D4).
// Não exige psql/pg_dump local: tudo roda com `docker compose exec -T postgres`.
// Tabelas preservadas (nunca truncadas nem exportadas como domínio):
//   super_admins (só nossa, ver drift-permitido.md) e __drizzle_migrations.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const COMPOSE = resolve(REPO_ROOT, "docker-compose.yml");
export const PGUSER = process.env.PGUSER ?? "postgres";
export const targetDb = () => process.env.TARGET_DB ?? "chatwootjs";

if (!process.env.PGPASSWORD) {
  const envFile = Bun.file(resolve(REPO_ROOT, ".env"));
  let pw = "password";
  if (await envFile.exists()) {
    const m = (await envFile.text()).match(/^POSTGRES_PASSWORD=(.*)$/m);
    if (m) pw = m[1].trim();
  }
  process.env.PGPASSWORD = pw;
}

export function fail(msg) {
  console.error(`ERRO: ${msg}`);
  process.exit(1);
}
export const info = (msg) => console.log(`-- ${msg}`);

// Roda `docker compose ...` e retorna stdout (throw em erro, exceto check:false).
export async function compose(args, opts = {}) {
  const p = Bun.spawn(["docker", "compose", "-f", COMPOSE, ...args], {
    stdout: opts.stdout ?? "pipe",
    stderr: opts.stderr ?? "pipe",
    stdin: opts.stdin,
  });
  const [out, err, code] = await Promise.all([p.stdout.text(), p.stderr.text(), p.exited]);
  if (code !== 0 && opts.check !== false) {
    fail(`${opts.label ?? args.join(" ")}\n${err.trim() || out.trim()}`.trim());
  }
  return { code, out, err };
}

const pgArgs = (db, extra) => [
  "exec",
  "-T",
  "postgres",
  "psql",
  "-U",
  PGUSER,
  "-d",
  db,
  "-v",
  "ON_ERROR_STOP=1",
  ...extra,
];

export const psql = (db, extra, opts) => compose(pgArgs(db, extra), opts);
// Valor único (tupla, sem cabeçalho).
export async function psqlValue(db, sql) {
  const { out } = await psql(db, ["-At", "-c", sql]);
  return out.trim();
}

// Tabelas public menos as preservadas.
export async function domainTables(db) {
  const out = await psqlValue(
    db,
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('super_admins','__drizzle_migrations') ORDER BY 1;",
  );
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function requireService() {
  const { code } = await compose(["exec", "-T", "postgres", "pg_isready", "-U", PGUSER], {
    check: false,
  });
  if (code !== 0) fail("postgres do compose não está acessível (rode: bun run db:start)");
}

export async function requireMigrated(db) {
  let reg = "";
  try {
    reg = await psqlValue(db, "SELECT to_regclass('public.accounts');");
  } catch {
    fail(`banco '${db}' não existe (crie com createdb via compose)`);
  }
  if (reg !== "accounts") fail(`banco '${db}' sem schema (rode: bun run db:migrate)`);
}
