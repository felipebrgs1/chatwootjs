import { ForbiddenError } from "../lib/errors.js";

export type Role = "agent" | "administrator";

export interface AuthCtx {
  userId: number;
  accountId: number;
  role: Role;
}

/** Espelha o Pundit do Rails: só administrator passa. Agentes ganham regras em M1+. */
export function requireAdmin(auth: AuthCtx): void {
  if (auth.role !== "administrator") {
    throw new ForbiddenError("Administrator role required");
  }
}
