import type { AuthCtx } from "@chatwootjs/core";
import { ServiceUnavailableError, UnauthorizedError } from "@chatwootjs/core";
import { db } from "@my-better-t-app/db";
import { sql } from "drizzle-orm";
import type { Context, Next } from "hono";

export interface AppEnv {
  Variables: {
    auth: AuthCtx;
  };
}

interface DemoTokenRow {
  user_id: number;
  account_id: number;
  role: number;
}

function toRole(role: number): AuthCtx["role"] {
  return role === 1 ? "administrator" : "agent";
}

/**
 * Stub funcional até o M1 (JWT real).
 * `Bearer demo-token` resolve o primeiro admin do seed via banco.
 * Qualquer outro token -> 401. Sem banco -> 503 explícito.
 */
export async function authAccount(c: Context, next: Next): Promise<Response | void> {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing bearer token");
  }
  const token = header.slice("Bearer ".length).trim();
  if (token !== "demo-token") {
    throw new UnauthorizedError("Invalid token");
  }

  let rows: DemoTokenRow[];
  try {
    const result = await db.execute(sql`
      SELECT u.id AS user_id, au.account_id, au.role
      FROM users u
      JOIN account_users au ON au.user_id = u.id
      ORDER BY u.id ASC
      LIMIT 1
    `);
    rows = result.rows as unknown as DemoTokenRow[];
  } catch {
    throw new ServiceUnavailableError("Database unavailable (run db:push + db:seed)");
  }

  const row = rows[0];
  if (!row) {
    throw new UnauthorizedError("Demo seed not found (run db:seed)");
  }

  c.set("auth", { userId: row.user_id, accountId: row.account_id, role: toRole(row.role) });
  await next();
}
