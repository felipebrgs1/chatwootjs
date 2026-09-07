#!/usr/bin/env bun
// scripts/db-import-chatwoot.mjs — Chatwoot → ChatwootJS (D3).
// Uso: CHATWOOT_DUMP=./tmp/chatwoot.dump [TARGET_DB=chatwootjs] bun scripts/db-import-chatwoot.mjs [--yes]
// Modos (detectados pelo conteúdo):
//   1. SQL só-dados (INSERT/COPY, ex. tests/fixtures/chatwoot-mini.sql): carga
//      aditiva direta, sem truncate.
//   2. Dump completo (schema+dados, .sql com CREATE TABLE ou .dump custom):
//      restaura num banco temporário, extrai só-dados e carrega após TRUNCATE
//      do domínio (preserva super_admins e __drizzle_migrations). Exige --yes
//      (ou IMPORT_CONFIRM=1) se o alvo já contém dados.
// FKs desligadas na carga (session_replication_role=replica, igual a
// pg_restore --disable-triggers), setval de TODAS as sequências + ANALYZE.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  REPO_ROOT,
  compose,
  domainTables,
  fail,
  info,
  psql,
  psqlValue,
  requireMigrated,
  requireService,
  targetDb,
} from "./db-pg-lib.mjs";

const DUMP = resolve(process.cwd(), process.env.CHATWOOT_DUMP ?? "./tmp/chatwoot.dump");
const DB = targetDb();
const YES = process.argv.includes("--yes") || process.env.IMPORT_CONFIRM === "1";

if (!existsSync(DUMP)) fail(`arquivo não encontrado: ${DUMP} (CHATWOOT_DUMP)`);
await requireService();
await requireMigrated(DB);

const head = await Bun.file(DUMP).slice(0, 5).text();
const isCustom = head === "PGDMP";
let isFull = isCustom;
if (!isFull) {
  // Procura DDL só no começo do arquivo (dumps gigantes: não ler tudo).
  const sample = await Bun.file(DUMP)
    .slice(0, 5 * 1024 * 1024)
    .text();
  isFull = /CREATE TABLE|CREATE SEQUENCE|ALTER TABLE .* OWNER TO/.test(sample);
}

// setval genérico: toda sequência "owned" por coluna vira MAX(coluna).
async function fixSequences() {
  await psql(DB, [
    "-q",
    "-c",
    `DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT s.seqrelid::regclass AS seq, n.nspname AS sch, t.relname AS tbl, a.attname AS col
           FROM pg_sequence s
           JOIN pg_depend d ON d.objid = s.seqrelid
           JOIN pg_class t ON t.oid = d.refobjid
           JOIN pg_namespace n ON n.oid = t.relnamespace
           JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
           WHERE d.deptype = 'a' LOOP
    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I.%I), 1))', r.seq, r.col, r.sch, r.tbl);
  END LOOP;
END $$;`,
  ]);
  await psql(DB, ["-q", "-c", "ANALYZE;"]);
}

// Carga de SQL só-dados via stdin do psql do container.
async function loadDataOnlySql(path) {
  info(`carga só-dados (aditiva, sem truncate): ${path}`);
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
      process.env.PGUSER ?? "postgres",
      "-d",
      DB,
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "SET session_replication_role='replica';",
      "-f",
      "-",
      "-c",
      "SET session_replication_role='origin';",
    ],
    { stdin: Bun.file(path), stdout: "ignore", stderr: "pipe" },
  );
  const [err, code] = await Promise.all([child.stderr.text(), child.exited]);
  if (code !== 0) fail(`carga falhou:\n${err.trim()}`);
}

if (!isFull) {
  await loadDataOnlySql(DUMP);
  info("carga aplicada");
} else {
  const existing = await psqlValue(DB, "SELECT count(*) FROM accounts;");
  if (existing !== "0" && !YES) {
    fail(
      `dump completo substitui os dados de domínio (accounts=${existing}). Rode com --yes para confirmar o TRUNCATE.`,
    );
  }
  const TMPDB = "chatwootjs_import_tmp";
  info(`dump completo → banco temporário '${TMPDB}'`);
  await psql("postgres", ["-q", "-c", `DROP DATABASE IF EXISTS "${TMPDB}";`]);
  await psql("postgres", ["-q", "-c", `CREATE DATABASE "${TMPDB}";`]);
  const dropTmp = () =>
    psql("postgres", ["-q", "-c", `DROP DATABASE IF EXISTS "${TMPDB}";`]).catch(() => {});
  try {
    if (isCustom) {
      await compose(["cp", DUMP, "postgres:/tmp/import.dump"]);
      await compose([
        "exec",
        "-T",
        "postgres",
        "pg_restore",
        "-U",
        process.env.PGUSER ?? "postgres",
        "--no-owner",
        "--no-privileges",
        "-d",
        TMPDB,
        "/tmp/import.dump",
      ]);
      await compose(["exec", "-T", "postgres", "rm", "-f", "/tmp/import.dump"]);
    } else {
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
          process.env.PGUSER ?? "postgres",
          "-d",
          TMPDB,
          "-v",
          "ON_ERROR_STOP=1",
          "-q",
          "-f",
          "-",
        ],
        { stdin: Bun.file(DUMP), stdout: "ignore", stderr: "pipe" },
      );
      const [err, code] = await Promise.all([child.stderr.text(), child.exited]);
      if (code !== 0) fail(`restore do dump no tmp falhou:\n${err.trim()}`);
    }
    const targetList = await domainTables(DB);
    const tmpList = await domainTables(TMPDB);
    const keep = targetList.filter((t) => tmpList.includes(t));
    const skip = tmpList.filter((t) => !targetList.includes(t));
    if (skip.length > 0) info(`tabelas do dump ausentes no alvo (ignoradas): ${skip.join(" ")}`);
    if (keep.length === 0) fail("nenhuma tabela em comum entre dump e alvo");
    info(`truncando domínio do alvo (preserva super_admins) e carregando ${keep.length} tabelas`);
    await psql(DB, ["-q", "-c", `TRUNCATE ${keep.map((t) => `"${t}"`).join(", ")} CASCADE;`]);
    // pg_dump (tmp) → stdout → psql (alvo): pipe direto, sem arquivo intermediário.
    const dumpArgs = [
      "docker",
      "compose",
      "-f",
      resolve(REPO_ROOT, "docker-compose.yml"),
      "exec",
      "-T",
      "postgres",
      "pg_dump",
      "-U",
      process.env.PGUSER ?? "postgres",
      "--data-only",
      "--no-owner",
      "--no-privileges",
    ];
    for (const t of keep) dumpArgs.push("-t", t);
    dumpArgs.push(TMPDB);
    const dumpChild = Bun.spawn(dumpArgs, { stdout: "pipe", stderr: "pipe" });
    const loadChild = Bun.spawn(
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
        process.env.PGUSER ?? "postgres",
        "-d",
        DB,
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
        "-c",
        "SET session_replication_role='replica';",
        "-f",
        "-",
        "-c",
        "SET session_replication_role='origin';",
      ],
      { stdin: dumpChild.stdout, stdout: "ignore", stderr: "pipe" },
    );
    const [dumpErr, dumpCode] = await Promise.all([dumpChild.stderr.text(), dumpChild.exited]);
    const [loadErr, loadCode] = await Promise.all([loadChild.stderr.text(), loadChild.exited]);
    if (dumpCode !== 0) fail(`pg_dump do tmp falhou:\n${dumpErr.trim()}`);
    if (loadCode !== 0) fail(`carga no alvo falhou:\n${loadErr.trim()}`);
  } finally {
    await dropTmp();
  }
}

await fixSequences();
console.log(`== import ok: ${DUMP} → ${DB} ==`);
console.log("-- linhas por tabela (top 15):");
const tables = await domainTables(DB);
const counts = [];
for (const t of tables) counts.push([await psqlValue(DB, `SELECT count(*) FROM "${t}";`), t]);
counts.sort((a, b) => Number(b[0]) - Number(a[0]));
for (const [n, t] of counts.slice(0, 15)) console.log(`${n} ${t}`);
console.log("-- sequências ajustadas (setval=MAX) + ANALYZE ok");
