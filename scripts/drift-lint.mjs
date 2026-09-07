#!/usr/bin/env bun
// scripts/drift-lint.mjs — valida a política de drift-permitido.md (D5 item 2).
// Regra: todo item de exceção `- `token`` sob "## Exceções vigentes" precisa
// declarar os quatro campos — Motivo, Impacto, Plano, Expira — senão o CI
// quebra (entrada incompleta não pode liberar divergência em silêncio).
// Parser espelha o allowlist de schema-diff.mjs: só `- `token`` no início
// da linha conta; menções em prosa são ignoradas.
// Uso: bun scripts/drift-lint.mjs — sai 0 se tudo declarado, 1 caso contrário.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DRIFT_FILE = join(ROOT, "docs/specs/drift-permitido.md");

// Campos obrigatórios (case-insensitive; aceita "Impacto no dump:", "Plano de
// convergência:", "Expira em:" e variações curtas "Motivo:", "Plano:").
const REQUIRED = [
  { name: "Motivo", re: /motivo\s*:/i },
  { name: "Impacto no dump", re: /impacto[^.\n]*:/i },
  { name: "Plano (de convergência)", re: /plano[^.\n]*:/i },
  { name: "Expira em", re: /expira[^.\n]*:/i },
];

const txt = readFileSync(DRIFT_FILE, "utf8");
const section = (txt.split(/^## Exceções vigentes/m)[1] ?? "").split(/^## /m)[0];

// Bullets de exceção: `- `token`` no início da linha + corpo até o próximo
// bullet de exceção ou fim da seção (fatiado por índice — lookahead com $ em
// modo multiline pararia no fim da primeira linha).
const heads = [...section.matchAll(/^\s*-\s*`([a-z0-9_.]+)`/gm)];
const bullets = heads.map((m, i) => {
  const start = (m.index ?? 0) + m[0].length;
  const end = i + 1 < heads.length ? (heads[i + 1].index ?? section.length) : section.length;
  return [m[0], m[1], section.slice(start, end)];
});

if (bullets.length === 0) {
  console.log("drift-lint: nenhuma exceção vigente — nada a validar. OK");
  process.exit(0);
}

let failed = 0;
for (const [, token, body] of bullets) {
  const missing = REQUIRED.filter((f) => !f.re.test(body)).map((f) => f.name);
  if (missing.length > 0) {
    failed++;
    console.error(
      `drift-lint: exceção \` ${token} \` sem campo obrigatório: ${missing.join(", ")}`,
    );
    console.error(
      "  -> complete em docs/specs/drift-permitido.md (Motivo / Impacto / Plano / Expira), ver D5.",
    );
  }
}

if (failed > 0) {
  console.error(`\ndrift-lint: FALHOU (${failed} exceção(ões) incompleta(s)).`);
  process.exit(1);
}
console.log(`drift-lint: OK (${bullets.length} exceção(ões) com Motivo/Impacto/Plano/Expira).`);
