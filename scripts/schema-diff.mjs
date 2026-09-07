// schema-diff.mjs — Harness D0: compara DDL Rails (chatwoot/db/schema.rb,
// pino docs/specs/CHATWOOT_PIN.md) com Drizzle (packages/db/src/schema/*.ts).
//
// Uso: bun scripts/schema-diff.mjs
// Sai 0 se não há divergência fora de docs/specs/drift-permitido.md, 1 caso contrário.
// Parse 100% estático, sem banco. Bun/Node puro, zero deps.
//
// Limitações conhecidas (D0): defaults são reportados como avisos (não falham);
// índices unique vindos de `.unique()` sem nome explícito não são cruzados com
// os nomes do Rails (D2 nomeia todos e o diff endurece).

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA_RB = join(ROOT, "chatwoot/db/schema.rb");
const DRIZZLE_DIR = join(ROOT, "packages/db/src/schema");
const DRIFT_FILE = join(ROOT, "docs/specs/drift-permitido.md");

// Rails t.* -> builders Drizzle aceitos. `t.datetime` é `timestamp WITHOUT time
// zone`, logo exige withTimezone:false (normativo D0/D2).
const TYPE_MAP = {
  datetime: { builders: ["timestamp"], tz: false },
  bigint: { builders: ["bigint", "bigserial"] },
  integer: { builders: ["integer", "serial", "smallint", "smallserial"] },
  boolean: { builders: ["boolean"] },
  jsonb: { builders: ["jsonb"] },
  json: { builders: ["json", "jsonb"] },
  string: { builders: ["varchar", "text", "char"] },
  text: { builders: ["text", "varchar"] },
  uuid: { builders: ["uuid"] },
  float: { builders: ["real", "doublePrecision"] },
  date: { builders: ["date"] },
  vector: { builders: ["vector"] }, // sem builder nativo: sempre diverge até D1/D2 decidir
};

function parseSchemaRb(src) {
  const tables = new Map();
  const lines = src.split("\n");
  let cur = null;
  for (const line of lines) {
    let m = line.match(/^  create_table "([^"]+)",?(.*)$/);
    if (m) {
      const header = m[2] || "";
      const pk = /id:\s*false/.test(header)
        ? "none"
        : /id:\s*:serial/.test(header)
          ? "serial"
          : "bigint";
      cur = { name: m[1], pk, cols: [], indexes: [] };
      tables.set(m[1], cur);
      continue;
    }
    if (/^  end\s*$/.test(line)) {
      cur = null;
      continue;
    }
    if (!cur) continue;
    m = line.match(/^\s+(t\.\w+)\s+(?:"([^"]+)"|\[([^\]]+)\])\s*(.*)$/);
    if (!m) continue;
    const [, method, cname, arr, opts] = m;
    if (method === "t.index") {
      const cols = arr ? arr.split(",").map((s) => s.trim().replace(/^"|"$/g, "")) : [cname];
      const iname = (opts.match(/name:\s*"([^"]+)"/) || [])[1] || `(sem-nome: ${cols.join("+")})`;
      cur.indexes.push({ name: iname, cols, unique: /unique:\s*true/.test(opts) });
      continue;
    }
    if (method === "t.timestamps") {
      for (const n of ["created_at", "updated_at"])
        cur.cols.push({ type: "datetime", name: n, opts });
      continue;
    }
    cur.cols.push({ type: method.slice(2), name: cname || arr, opts: opts || "" });
  }
  return tables;
}

const COL_RE =
  /(serial|bigserial|integer|bigint|varchar|text|boolean|jsonb|json|timestamp|uuid|date|numeric|real|doublePrecision|smallint|smallserial|char|time|vector)\(\s*"([a-z0-9_]+)"([^)]*)\)/g; // D1: vector (pgvector)
const CHAIN_CUT = /\n\s*[A-Za-z_]\w*\s*:|\n\s*\}\s*[,)]|\n\s*\),/;

function parseDrizzleFile(src) {
  const tables = new Map();
  const starts = [...src.matchAll(/export const (\w+)\s*=\s*pgTable\(\s*"([a-z0-9_]+)"/g)];
  for (let i = 0; i < starts.length; i++) {
    const tname = starts[i][2];
    const from = starts[i].index + starts[i][0].length;
    const nextExport = src.indexOf("export const", from);
    const chunk = src.slice(from, nextExport === -1 ? undefined : nextExport);
    const cols = [];
    COL_RE.lastIndex = 0;
    let cm;
    while ((cm = COL_RE.exec(chunk))) {
      const cut = chunk.slice(COL_RE.lastIndex).search(CHAIN_CUT);
      const chain =
        cut === -1
          ? chunk.slice(COL_RE.lastIndex)
          : chunk.slice(COL_RE.lastIndex, COL_RE.lastIndex + cut);
      const tail = cm[3] + chain;
      // $defaultFn é client-side (runtime) — NÃO conta como default DDL.
      const noFn = chain.replace(/\.\$defaultFn\([^)]*\)/g, "");
      cols.push({
        name: cm[2],
        builder: cm[1],
        notNull: /\.notNull\(\)/.test(chain),
        pk: /\.primaryKey\(\)/.test(chain),
        tz: /withTimezone:\s*true/.test(tail)
          ? true
          : /withTimezone:\s*false/.test(tail)
            ? false
            : null,
        hasDefault: /\.default\(|\.defaultNow\(/.test(noFn),
        // .unique() em coluna sem unique("nome") explícito: o nome gerado
        // nunca bate com o Rails — D2 exige nomear todos.
        unnamedUnique: /\.unique\(\)/.test(chain),
      });
    }
    const explicitIdx = [...chunk.matchAll(/\b(?:uniqueIndex|unique|index)\(\s*"([^"]+)"/g)].map(
      (m) => m[1],
    );
    const pkCol = cols.find((c) => c.pk);
    tables.set(tname, { cols, indexes: explicitIdx, pkBuilder: pkCol ? pkCol.builder : null });
  }
  return tables;
}

function loadAllowlist() {
  try {
    const txt = readFileSync(DRIFT_FILE, "utf8");
    // Só itens de lista `- `token`` no início da linha valem como exceção;
    // menções em prosa (crases no meio do texto) são ignoradas de propósito.
    return new Set([...txt.matchAll(/^\s*-\s*`([a-z0-9_.]+)`/gm)].map((m) => m[1]));
  } catch {
    return new Set();
  }
}

function allowed(list, table, col) {
  if (list.has(table)) return true;
  if (col && (list.has(`${table}.${col}`) || list.has(col))) return true;
  return false;
}

const rb = parseSchemaRb(readFileSync(SCHEMA_RB, "utf8"));
const ours = new Map();
for (const f of readdirSync(DRIZZLE_DIR).filter((f) => f.endsWith(".ts"))) {
  for (const [k, v] of parseDrizzleFile(readFileSync(join(DRIZZLE_DIR, f), "utf8"))) {
    if (!ours.has(k)) ours.set(k, { ...v, file: f });
  }
}
const allow = loadAllowlist();

const missingTables = [];
const extraTables = [];
const colDiffs = []; // {table, missing[], extra[], typeMismatch[], nullMismatch[]}
const pkDiffs = [];
const indexDiffs = [];

for (const t of [...rb.keys()].sort()) {
  if (!ours.has(t)) {
    if (!allowed(allow, t)) missingTables.push(t);
    continue;
  }
  const r = rb.get(t);
  const o = ours.get(t);
  // id implícito do Rails: serial/bigint conforme header (portals_members: none)
  const rCols = new Map(r.cols.map((c) => [c.name, c]));
  if (r.pk !== "none" && !rCols.has("id"))
    rCols.set("id", {
      type: r.pk === "serial" ? "integer" : "bigint",
      name: "id",
      opts: "",
      implicitPk: true,
    });
  const oCols = new Map(o.cols.map((c) => [c.name, c]));
  const missing = [...rCols.keys()].filter((c) => !oCols.has(c) && !allowed(allow, t, c));
  const extra = [...oCols.keys()].filter((c) => !rCols.has(c) && !allowed(allow, t, c));
  const typeMismatch = [];
  const nullMismatch = [];
  const defaultMismatch = [];
  for (const [c, rc] of rCols) {
    if (!oCols.has(c) || allowed(allow, t, c)) continue;
    const oc = oCols.get(c);
    if (rc.implicitPk) {
      const want = r.pk === "serial" ? ["serial"] : ["bigserial", "bigint"];
      if (!want.includes(oc.builder))
        typeMismatch.push(`${c}: pk rails=${r.pk} vs nosso=${oc.builder}`);
      continue;
    }
    const exp = TYPE_MAP[rc.type];
    if (!exp) {
      typeMismatch.push(`${c}: tipo rails desconhecido '${rc.type}'`);
      continue;
    }
    if (!exp.builders.includes(oc.builder)) {
      typeMismatch.push(`${c}: rails=${rc.type} vs nosso=${oc.builder}`);
      continue;
    }
    // Drizzle `timestamp()` sem withTimezone emite `timestamp` (sem tz) —
    // igual ao Rails. Só withTimezone:true diverge.
    if (rc.type === "datetime" && oc.tz === true) {
      typeMismatch.push(`${c}: rails=datetime (sem tz) vs nosso=timestamp COM tz`);
      continue;
    }
    const railsNull = !/null:\s*false/.test(rc.opts);
    const oursNull = !oc.notNull && !oc.pk;
    if (railsNull !== oursNull)
      nullMismatch.push(
        `${c}: rails ${railsNull ? "NULL" : "NOT NULL"} vs nosso ${oursNull ? "NULL" : "NOT NULL"}`,
      );
    if (/default:/.test(rc.opts) !== oc.hasDefault) {
      defaultMismatch.push(
        `${c}: default rails=${/default:/.test(rc.opts) ? "sim" : "não"} vs nosso=${oc.hasDefault ? "sim" : "não"}`,
      );
    }
    if (oc.unnamedUnique) {
      const rUniq = r.indexes.find((ix) => ix.unique && ix.cols.length === 1 && ix.cols[0] === c);
      defaultMismatch.push(
        `${c}: .unique() sem nome explícito (Rails: ${rUniq ? rUniq.name : "sem índice unique"})`,
      );
    }
  }
  if (
    missing.length ||
    extra.length ||
    typeMismatch.length ||
    nullMismatch.length ||
    defaultMismatch.length
  ) {
    colDiffs.push({
      table: t,
      file: o.file,
      missing,
      extra,
      typeMismatch,
      nullMismatch,
      defaultMismatch,
    });
  }
  // índices: compara nomes explícitos
  const rIdx = new Set(r.indexes.map((idx) => idx.name));
  const oIdx = new Set(o.indexes);
  const idxMissing = [...rIdx].filter(
    (n) => !oIdx.has(n) && !n.startsWith("(sem-nome") && !allowed(allow, t, n),
  );
  if (idxMissing.length) indexDiffs.push({ table: t, missing: idxMissing });
}
for (const t of [...ours.keys()].sort()) {
  if (!rb.has(t) && !allowed(allow, t)) extraTables.push(t);
}

console.log("== schema-diff (Rails pinado x Drizzle) ==");
console.log(`tabelas: rails=${rb.size} nossas=${ours.size}`);
console.log(
  `faltantes: ${missingTables.length} | extras: ${extraTables.length} | tabelas com diff de colunas: ${colDiffs.length} | com diff de índices: ${indexDiffs.length}`,
);
if (missingTables.length)
  console.log(`\n-- TABELAS FALTANTES (${missingTables.length}):\n${missingTables.join(", ")}`);
if (extraTables.length)
  console.log(`\n-- TABELAS EXTRAS (${extraTables.length}):\n${extraTables.join(", ")}`);
for (const d of colDiffs) {
  console.log(`\n-- ${d.table} (${d.file}):`);
  if (d.missing.length)
    console.log(`   colunas faltantes (${d.missing.length}): ${d.missing.join(", ")}`);
  if (d.extra.length) console.log(`   colunas extras (${d.extra.length}): ${d.extra.join(", ")}`);
  for (const x of d.typeMismatch) console.log(`   tipo: ${x}`);
  for (const x of d.nullMismatch) console.log(`   null: ${x}`);
  for (const x of d.defaultMismatch) console.log(`   default: ${x}`);
}
for (const d of indexDiffs) {
  console.log(
    `\n-- índices faltantes em ${d.table} (${d.missing.length}): ${d.missing.join(", ")}`,
  );
}

if (pkDiffs.length) console.log(`\n-- PKs: ${pkDiffs.join("; ")}`);

const hardFails = missingTables.length + extraTables.length + colDiffs.length + indexDiffs.length;
if (hardFails > 0) {
  console.log(`\nRESULTADO: DIVERGENTE (${hardFails} blocos) — ver trilha D1/D2.`);
  process.exit(1);
}
console.log("\nRESULTADO: IDÊNTICO (dentro do drift-permitido).");
