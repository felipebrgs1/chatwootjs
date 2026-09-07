#!/usr/bin/env bun
// scripts/db-roundtrip-check.mjs — ida-e-volta D3+D4 (D4 item 3).
// fixture → banco src (migrado do zero) → export D4 → banco dst vazio
// (restaura .dump e .sql em dois bancos) → compara counts + conteúdo (COPY
// ordenado, diff nos dois sentidos) nas tabelas do núcleo + probe de sequência.
// Uso: bun scripts/db-roundtrip-check.mjs   (KEEP=1 preserva os bancos rt_*).
// Sai 0 com "ROUNDTRIP PASS" ou 1 com a divergência que quebrou.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, compose, fail, info, psql, psqlValue, requireService } from "./db-pg-lib.mjs";

const FIXTURE = process.env.FIXTURE ?? "tests/fixtures/chatwoot-mini.sql";
const SRC = process.env.RT_SRC ?? "chatwootjs_rt_src";
const DST = process.env.RT_DST ?? "chatwootjs_rt_dst";
const DST_SQL = process.env.RT_DST_SQL ?? "chatwootjs_rt_dst_sql";
// Núcleo D3/D4: as 8 da fixture + channel_api (pai da inbox).
const NUCLEUS = [
  "accounts",
  "users",
  "account_users",
  "channel_api",
  "inboxes",
  "contacts",
  "contact_inboxes",
  "conversations",
  "messages",
];
const pgUser = process.env.PGUSER ?? "postgres";
const dbUrl = (db) => `postgresql://${pgUser}:${process.env.PGPASSWORD}@localhost:5432/${db}`;

if (!existsSync(resolve(REPO_ROOT, FIXTURE))) fail(`fixture não encontrada: ${FIXTURE}`);
await requireService();

async function cleanup() {
  if (process.env.KEEP === "1") {
    info(`KEEP=1 — bancos ${SRC}/${DST}/${DST_SQL} preservados`);
    return;
  }
  for (const d of [SRC, DST, DST_SQL])
    await psql("postgres", ["-q", "-c", `DROP DATABASE IF EXISTS "${d}";`]);
}
process.on("SIGINT", async () => {
  await cleanup();
  process.exit(1);
});

for (const d of [SRC, DST, DST_SQL]) {
  await psql("postgres", ["-q", "-c", `DROP DATABASE IF EXISTS "${d}";`]);
  await psql("postgres", ["-q", "-c", `CREATE DATABASE "${d}";`]);
}
info(`migrando ${SRC} do zero`);
// drizzle-kit direto (turbo exige TTY); loadEnvFile do .env NÃO sobrescreve DATABASE_URL exportada.
{
  const child = Bun.spawn(["bun", "x", "drizzle-kit", "migrate"], {
    cwd: resolve(REPO_ROOT, "packages/db"),
    env: { ...process.env, DATABASE_URL: dbUrl(SRC) },
    stdout: "ignore",
    stderr: "pipe",
  });
  const [err, code] = await Promise.all([child.stderr.text(), child.exited]);
  if (code !== 0) fail(`db:migrate falhou em ${SRC}:\n${err.trim()}`);
}

info(`D3: fixture → ${SRC}`);
{
  const child = Bun.spawn(["bun", "scripts/db-import-chatwoot.mjs"], {
    cwd: REPO_ROOT,
    env: { ...process.env, CHATWOOT_DUMP: resolve(REPO_ROOT, FIXTURE), TARGET_DB: SRC },
    stdout: "ignore",
    stderr: "pipe",
  });
  const [err, code] = await Promise.all([child.stderr.text(), child.exited]);
  if (code !== 0) fail(`import da fixture falhou:\n${err.trim()}`);
}

info(`D4: export de ${SRC}`);
{
  const child = Bun.spawn(["bun", "scripts/db-export-chatwoot.mjs"], {
    cwd: REPO_ROOT,
    env: { ...process.env, OUT_PREFIX: resolve(REPO_ROOT, "tmp/rt-compat"), TARGET_DB: SRC },
    stdout: "ignore",
    stderr: "pipe",
  });
  const [err, code] = await Promise.all([child.stderr.text(), child.exited]);
  if (code !== 0) fail(`export falhou:\n${err.trim()}`);
}

info(`restore .dump → ${DST} | restore .sql → ${DST_SQL}`);
await compose(["cp", resolve(REPO_ROOT, "tmp/rt-compat.dump"), "postgres:/tmp/rt-compat.dump"]);
await compose([
  "exec",
  "-T",
  "postgres",
  "pg_restore",
  "-U",
  pgUser,
  "--no-owner",
  "--no-privileges",
  "-d",
  DST,
  "/tmp/rt-compat.dump",
]);
await compose(["exec", "-T", "postgres", "rm", "-f", "/tmp/rt-compat.dump"]);
{
  const sql = Bun.file(resolve(REPO_ROOT, "tmp/rt-compat.sql"));
  const child = Bun.spawn(
    [
      "docker",
      "compose",
      "-f",
      resolve(REPO_ROOT, "docker-compose.yml"),
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      pgUser,
      "-d",
      DST_SQL,
      "-v",
      "ON_ERROR_STOP=1",
      "-q",
      "-f",
      "-",
    ],
    { cwd: REPO_ROOT, stdin: sql, stdout: "ignore", stderr: "pipe" },
  );
  const [err, code] = await Promise.all([child.stderr.text(), child.exited]);
  if (code !== 0) fail(`restore do .sql falhou:\n${err.trim()}`);
}

async function snap(db, t) {
  return psqlValue(db, `COPY (SELECT * FROM "${t}" ORDER BY id) TO STDOUT`);
}
let failed = false;
for (const t of NUCLEUS) {
  const cs = await psqlValue(SRC, `SELECT count(*) FROM "${t}";`);
  const cd1 = await psqlValue(DST, `SELECT count(*) FROM "${t}";`);
  const cd2 = await psqlValue(DST_SQL, `SELECT count(*) FROM "${t}";`);
  if (cs !== cd1 || cs !== cd2) {
    console.log(`FAIL count ${t}: src=${cs} dst=${cd1} dst_sql=${cd2}`);
    failed = true;
    continue;
  }
  const [s, d1, d2] = await Promise.all([snap(SRC, t), snap(DST, t), snap(DST_SQL, t)]);
  if (s !== d1) {
    console.log(`FAIL conteúdo ${t}: src×dst divergem`);
    failed = true;
  } else if (s !== d2) {
    console.log(`FAIL conteúdo ${t}: src×dst_sql divergem`);
    failed = true;
  } else console.log(`ok ${t} (n=${cs}, conteúdo idêntico nos 3)`);
}

// Probe: próximo insert não colide (sequências) — com ROLLBACK, sem sujar.
try {
  await psql(DST, [
    "-q",
    "-c",
    "BEGIN; INSERT INTO conversations (account_id, inbox_id, status, display_id, created_at, updated_at, last_activity_at, additional_attributes, custom_attributes) VALUES (1, 1, 0, 99999, now(), now(), now(), '{}', '{}'); ROLLBACK;",
  ]);
  console.log("ok sequências (insert probe com ROLLBACK)");
} catch {
  console.log("FAIL sequências: insert probe falhou");
  failed = true;
}

await cleanup();
if (failed) {
  console.log("== ROUNDTRIP FAIL ==");
  process.exit(1);
}
console.log("== ROUNDTRIP PASS ==");
