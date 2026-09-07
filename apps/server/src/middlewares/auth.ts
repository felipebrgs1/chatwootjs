import { loadMembership, toRole, verifyAccessToken } from "@chatwootjs/core";
import type { AuthCtx } from "@chatwootjs/core";
import { ForbiddenError, UnauthorizedError } from "@chatwootjs/core";
import type { Context, Next } from "hono";

export interface UserEnv {
  Variables: {
    auth: { userId: number };
  };
}

export interface AppEnv {
  Variables: {
    auth: AuthCtx;
  };
}

export interface SuperAdminEnv {
  Variables: {
    superAdmin: { id: number; email: string };
  };
}

function extractToken(c: Context): string {
  // Authorization: Bearer <jwt> (novo) ou access-token: <jwt> (compat Chatwoot).
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  const legacy = c.req.header("access-token");
  if (legacy?.trim()) return legacy.trim();
  throw new UnauthorizedError("Missing bearer token");
}

async function userIdFromToken(c: Context): Promise<number> {
  try {
    return await verifyAccessToken(extractToken(c));
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
}

export async function superAdmin(c: Context, next: Next): Promise<Response | void> {
  const { requireSuperAdmin } = await import("@chatwootjs/core");
  try {
    c.set("superAdmin", await requireSuperAdmin(extractToken(c)));
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
  await next();
}

/** Só valida o JWT (rotas sem :account_id, ex.: /profile). */
export async function authUser(c: Context, next: Next): Promise<Response | void> {
  const userId = await userIdFromToken(c);
  c.set("auth", { userId });
  await next();
}

/**
 * Valida o JWT + vínculo com a conta da URL (403 se sem vínculo).
 * Exige que a rota tenha o param `:account_id`.
 */
export async function authAccount(c: Context, next: Next): Promise<Response | void> {
  const userId = await userIdFromToken(c);
  const rawAccountId = c.req.param("account_id");
  const accountId = Number(rawAccountId);
  if (!rawAccountId || !Number.isInteger(accountId) || accountId <= 0) {
    throw new ForbiddenError("Missing account scope");
  }
  const membership = await loadMembership(userId, accountId);
  if (!membership) {
    throw new ForbiddenError("No access to this account");
  }
  c.set("auth", { userId, accountId, role: toRole(membership.role ?? 0) });
  await next();
}
