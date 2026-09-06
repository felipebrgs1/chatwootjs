import type { Context, Next } from "hono";

/**
 * Rate limit simples em memória (por IP) para as rotas públicas.
 * Suficiente para single-instance; com N réplicas, trocar por Redis
 * (mesmo REDIS_URL do M6) sem mudar a interface.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(maxPerMinute: number) {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("cf-connecting-ip") ||
      "unknown";
    const key = `${c.req.path}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + 60_000 });
      await next();
      return;
    }
    bucket.count += 1;
    if (bucket.count > maxPerMinute) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      c.header("Retry-After", String(retryAfter));
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
    await next();
  };
}
