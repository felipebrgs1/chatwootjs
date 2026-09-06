import { toErrorBody } from "@chatwootjs/core";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Resposta de coleção no formato do Rails: `{ data, meta }`. */
export function ok<T>(c: Context, data: T, meta?: Record<string, unknown>) {
  if (meta) {
    return c.json({ data, meta });
  }
  return c.json({ data });
}

/** Mapeia HttpError (core) para status Rails; resto vira 500 com log. */
export function fail(c: Context, err: unknown) {
  const { status, body } = toErrorBody(err);
  if (status === 500) {
    console.error(err);
  }
  return c.json(body, status as ContentfulStatusCode);
}

export function onError(err: Error, c: Context) {
  return fail(c, err);
}

export function notFound(c: Context) {
  return c.json({ error: "Not found" }, 404);
}
