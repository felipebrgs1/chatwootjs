import { createHash, randomBytes } from "node:crypto";
import { sign, verify } from "hono/jwt";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 2 * 60 * 60 * 1000;

let warnedFallback = false;

export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn("[core] JWT_SECRET ausente — usando segredo de dev. Defina no .env raiz.");
  }
  return "dev-secret-change-me";
}

export interface AccessClaims {
  sub: number;
  type: "access";
}

export async function signAccessToken(userId: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: userId, type: "access", iat: now, exp: now + ACCESS_TTL_SECONDS },
    jwtSecret(),
    "HS256",
  );
}

export async function verifyAccessToken(token: string): Promise<number> {
  const payload = await verify(token, jwtSecret(), "HS256");
  if (payload.type !== "access" || typeof payload.sub !== "number") {
    throw new Error("Invalid access token");
  }
  return payload.sub;
}

/** Token opaco (refresh/convite/reset). Retorna o segredo; guarde só o digest. */
export function opaqueToken(): { token: string; digest: string } {
  const token = randomBytes(32).toString("hex");
  const digest = createHash("sha256").update(token).digest("hex");
  return { token, digest };
}

export function digestOf(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TTL_MS);
}

export function invitationExpiresAt(): Date {
  return new Date(Date.now() + INVITATION_TTL_MS);
}

export function resetExpiresAt(): Date {
  return new Date(Date.now() + RESET_TTL_MS);
}

export function isExpired(expiresAt: Date | null): boolean {
  return !expiresAt || expiresAt.getTime() <= Date.now();
}
