// Gerado do Chatwoot (pino D0): config/initializers/languages.rb.
// enum locale de accounts: inteiro no banco, código na API.
export const LOCALE_BY_ID: Record<number, string> = {
  0: "en",
  1: "ar",
  2: "nl",
  3: "fr",
  4: "de",
  6: "it",
  7: "ja",
  8: "ko",
  9: "pt",
  10: "ru",
  12: "es",
  13: "ml",
  14: "ca",
  15: "el",
  16: "pt_BR",
  17: "ro",
  18: "ta",
  19: "fa",
  20: "zh_TW",
  21: "vi",
  22: "da",
  23: "tr",
  24: "cs",
  25: "fi",
  26: "id",
  27: "sv",
  28: "hu",
  29: "no",
  30: "zh_CN",
  31: "pl",
  32: "sk",
  33: "uk",
  34: "th",
  35: "lv",
  36: "is",
  37: "he",
  38: "lt",
  39: "sr",
  40: "bg",
  41: "et",
  42: "uz",
  43: "sl",
};

const ID_BY_LOCALE: Record<string, number> = Object.fromEntries(
  Object.entries(LOCALE_BY_ID).map(([id, code]) => [code, Number(id)]),
);

export function localeCodeFromId(id: number | null | undefined): string {
  if (id == null) return "en";
  return LOCALE_BY_ID[id] ?? "en";
}

export function localeIdFromCode(code: string | null | undefined): number {
  if (!code) return 0;
  return ID_BY_LOCALE[code] ?? ID_BY_LOCALE[code.replace("-", "_")] ?? 0;
}
