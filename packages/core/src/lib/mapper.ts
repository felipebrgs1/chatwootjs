function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date)
  );
}

/** Converte chaves snake_case do banco para camelCase na borda da API. */
export function keysToCamel<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => keysToCamel(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const out: PlainObject = {};
    for (const [key, entry] of Object.entries(value)) {
      out[snakeToCamel(key)] = keysToCamel(entry);
    }
    return out as T;
  }
  return value;
}
