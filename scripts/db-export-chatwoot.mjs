#!/usr/bin/env bun
// scripts/db-export-chatwoot.mjs — ChatwootJS → Chatwoot (D4).
// Uso: [TARGET_DB=chatwootjs] [OUT_PREFIX=./tmp/chatwootjs-compat] bun scripts/db-export-chatwoot.mjs
// Saídas: <prefix>.dump (custom, pg_restore) + <prefix>.sql (plain, psql).
// Exclusões (fora do dump de domínio, ver drift-permitido.md):
//   super_admins (+ EXCLUDE_TABLES, vírgula, para extras futuros chatwootjs_*).
// --no-owner/--no-privileges: nada de owner/ACL que quebre o restore no Rails.
// Sequências (setval) incluídas por padrão.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  COMPOSE,
  REPO_ROOT,
  fail,
  info,
  requireMigrated,
  requireService,
  targetDb,
} from "./db-pg-lib.mjs";

const DB = targetDb();
import { resolve } from "node:path";
const OUT = resolve(process.cwd(), process.env.OUT_PREFIX ?? "./tmp/chatwootjs-compat");
const EXCLUDE = (process.env.EXCLUDE_TABLES ?? "super_admins")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

await requireService();
await requireMigrated(DB);
mkdirSync(dirname(OUT), { recursive: true });

const flags = ["--no-owner", "--no-privileges"];
for (const t of EXCLUDE) flags.push(`--exclude-table=${t}`);

info(`exportando ${DB} → ${OUT}.dump + ${OUT}.sql (exclui: ${EXCLUDE.join(",") || "nada"})`);
const pgUser = process.env.PGUSER ?? "postgres";
const dumpChild = Bun.spawn(
  [
    "docker",
    "compose",
    "-f",
    COMPOSE,
    "exec",
    "-T",
    "postgres",
    "pg_dump",
    "-U",
    pgUser,
    ...flags,
    "-Fc",
    DB,
  ],
  { cwd: REPO_ROOT, stdout: Bun.file(`${OUT}.dump`), stderr: "pipe" },
);
const sqlChild = Bun.spawn(
  [
    "docker",
    "compose",
    "-f",
    COMPOSE,
    "exec",
    "-T",
    "postgres",
    "pg_dump",
    "-U",
    pgUser,
    ...flags,
    DB,
  ],
  { cwd: REPO_ROOT, stdout: Bun.file(`${OUT}.sql`), stderr: "pipe" },
);
for (const [child, name] of [
  [dumpChild, ".dump"],
  [sqlChild, ".sql"],
]) {
  const [err, code] = await Promise.all([child.stderr.text(), child.exited]);
  if (code !== 0) fail(`pg_dump ${name} falhou:\n${err.trim()}`);
}

console.log("== export ok ==");
for (const f of [`${OUT}.dump`, `${OUT}.sql`]) {
  const file = Bun.file(f);
  console.log(`${(await file.arrayBuffer()).byteLength} ${f}`);
}
const sql = await Bun.file(`${OUT}.sql`).text();
console.log(`-- tabelas com dados: ${(sql.match(/^COPY .* FROM stdin/gm) ?? []).length}`);
