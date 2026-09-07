/**
 * M11 — Testes puros (sem DB): extração de `@menções`.
 */
import { describe, expect, test } from "bun:test";

import { extractMentionTokens } from "./notifications";

describe("extractMentionTokens", () => {
  test("extrai @nome simples", () => {
    expect(extractMentionTokens("oi @ada, vê isso?")).toEqual(["ada"]);
  });

  test("ignora e-mail (sem espaço antes do @ não conta se colado em palavra)", () => {
    expect(extractMentionTokens("me escreve em user@example.com")).toEqual([]);
  });

  test("múltiplas menções, dedup e case-insensitive", () => {
    expect(extractMentionTokens("@Ada e @alan, @ADA de novo")).toEqual(["ada", "alan"]);
  });

  test("texto sem menção", () => {
    expect(extractMentionTokens("bom dia, sem menções")).toEqual([]);
  });

  test("aceita ponto e hífen (sobrenome/slug)", () => {
    expect(extractMentionTokens("passa pra @ana.silva e @joao-paulo")).toEqual([
      "ana.silva",
      "joao-paulo",
    ]);
  });
});
