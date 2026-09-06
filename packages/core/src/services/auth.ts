import { accessTokens, accountUsers, accounts, db, users } from "@my-better-t-app/db";
import { and, eq } from "drizzle-orm";

import { NotFoundError, UnauthorizedError, UnprocessableError } from "../lib/errors.js";
import {
  digestOf,
  invitationExpiresAt,
  isExpired,
  opaqueToken,
  refreshExpiresAt,
  resetExpiresAt,
  signAccessToken,
} from "../lib/tokens.js";
import type { AuthCtx, Role } from "../policies/index.js";
import type {
  InviteAgentInput,
  SignInInput,
  SignUpInput,
  UpdateProfileInput,
} from "../schemas/auth.js";

export const AVAILABILITY_TO_INT = { online: 0, busy: 1, offline: 2 } as const;
export const AVAILABILITY_FROM_INT = ["online", "busy", "offline"] as const;

function toRole(role: number): Role {
  return role === 1 ? "administrator" : "agent";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function issueTokenPair(userId: number): Promise<TokenPair> {
  const accessToken = await signAccessToken(userId);
  const { token: refreshToken, digest } = opaqueToken();
  await db.insert(accessTokens).values({
    ownerType: "refresh",
    ownerId: userId,
    tokenDigest: digest,
    expiresAt: refreshExpiresAt(),
  });
  return { accessToken, refreshToken };
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  availability: string;
  uiSettings: unknown;
}

export function toApiUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    availability: AVAILABILITY_FROM_INT[row.availabilityStatus] ?? "online",
    uiSettings: row.uiSettings,
  };
}

async function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: (u, { eq: equals }) => equals(u.email, normalizeEmail(email)),
  });
}

export async function signUp(
  input: SignUpInput,
): Promise<{ user: AuthUser; accountId: number; tokens: TokenPair }> {
  const email = normalizeEmail(input.email);
  const existing = await findUserByEmail(email);
  if (existing?.passwordDigest) {
    throw new UnprocessableError("Email already taken", { email: ["já está em uso"] });
  }

  const passwordDigest = await Bun.password.hash(input.password, { algorithm: "bcrypt", cost: 10 });

  const userId = await db.transaction(async (tx) => {
    let user = existing;
    if (!user) {
      const [created] = await tx
        .insert(users)
        .values({ name: input.name, email, passwordDigest })
        .returning();
      if (!created) throw new UnprocessableError("Could not create user");
      user = created;
    } else {
      await tx.update(users).set({ name: input.name, passwordDigest }).where(eq(users.id, user.id));
    }
    const [account] = await tx
      .insert(accounts)
      .values({ name: input.account_name?.trim() || `${input.name} Inc` })
      .returning();
    if (!account) throw new UnprocessableError("Could not create account");
    await tx.insert(accountUsers).values({ userId: user.id, accountId: account.id, role: 1 });
    return user.id;
  });

  const row = await db.query.users.findFirst({
    where: (u, { eq: equals }) => equals(u.id, userId),
  });
  if (!row) throw new UnprocessableError("Could not create user");
  const membership = await db.query.accountUsers.findFirst({
    where: (au) => eq(au.userId, userId),
  });
  if (!membership) throw new UnprocessableError("Could not create account membership");
  return {
    user: toApiUser(row),
    accountId: membership.accountId,
    tokens: await issueTokenPair(userId),
  };
}

export async function signIn(input: SignInInput): Promise<{ user: AuthUser; tokens: TokenPair }> {
  const row = await findUserByEmail(input.email);
  if (!row?.passwordDigest || !(await Bun.password.verify(input.password, row.passwordDigest))) {
    throw new UnauthorizedError("Invalid email or password");
  }
  return { user: toApiUser(row), tokens: await issueTokenPair(row.id) };
}

export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const digest = digestOf(refreshToken);
  const stored = await db.query.accessTokens.findFirst({
    where: (t, { eq: equals }) => equals(t.tokenDigest, digest),
  });
  if (!stored || stored.ownerType !== "refresh" || isExpired(stored.expiresAt)) {
    if (stored) await db.delete(accessTokens).where(eq(accessTokens.id, stored.id));
    throw new UnauthorizedError("Invalid refresh token");
  }
  await db.delete(accessTokens).where(eq(accessTokens.id, stored.id));
  return issueTokenPair(stored.ownerId);
}

export async function signOut(refreshToken: string): Promise<void> {
  await db.delete(accessTokens).where(eq(accessTokens.tokenDigest, digestOf(refreshToken)));
}

export async function forgotPassword(email: string): Promise<{ resetToken?: string }> {
  const row = await findUserByEmail(email);
  // Resposta sempre ok (não vazar se o e-mail existe). Em dev, devolver o token.
  if (!row) return {};
  const { token, digest } = opaqueToken();
  await db.insert(accessTokens).values({
    ownerType: "password_reset",
    ownerId: row.id,
    tokenDigest: digest,
    expiresAt: resetExpiresAt(),
  });
  if (process.env.NODE_ENV !== "production") {
    console.log(`[auth] reset token for ${email}: ${token}`);
    return { resetToken: token };
  }
  return {};
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const digest = digestOf(token);
  const stored = await db.query.accessTokens.findFirst({
    where: (t, { eq: equals }) => equals(t.tokenDigest, digest),
  });
  if (!stored || stored.ownerType !== "password_reset" || isExpired(stored.expiresAt)) {
    throw new UnprocessableError("Invalid or expired token", { token: ["inválido ou expirado"] });
  }
  const passwordDigest = await Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
  await db.update(users).set({ passwordDigest }).where(eq(users.id, stored.ownerId));
  await db.delete(accessTokens).where(eq(accessTokens.id, stored.id));
  // Revoga refresh tokens existentes por segurança.
  await db
    .delete(accessTokens)
    .where(and(eq(accessTokens.ownerType, "refresh"), eq(accessTokens.ownerId, stored.ownerId)));
}

// ---- Contas e agentes ----

export interface ApiAccount {
  id: number;
  name: string;
  locale: string;
  role: Role;
}

export async function listMyAccounts(userId: number): Promise<ApiAccount[]> {
  const memberships = await db.query.accountUsers.findMany({
    where: (au, { eq: equals }) => equals(au.userId, userId),
  });
  const result: ApiAccount[] = [];
  for (const membership of memberships) {
    const account = await db.query.accounts.findFirst({
      where: (a, { eq: equals }) => equals(a.id, membership.accountId),
    });
    if (account) {
      result.push({
        id: account.id,
        name: account.name,
        locale: account.locale,
        role: toRole(membership.role),
      });
    }
  }
  return result;
}

export async function getAccount(
  accountId: number,
): Promise<{ id: number; name: string; locale: string }> {
  const account = await db.query.accounts.findFirst({
    where: (a, { eq: equals }) => equals(a.id, accountId),
  });
  if (!account) throw new NotFoundError("Account not found");
  return { id: account.id, name: account.name, locale: account.locale };
}

export async function updateAccount(
  auth: AuthCtx,
  data: { name?: string; locale?: string },
): Promise<{ id: number; name: string; locale: string }> {
  const { requireAdmin } = await import("../policies/index.js");
  requireAdmin(auth);
  const patch: Partial<{ name: string; locale: string }> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.locale !== undefined) patch.locale = data.locale;
  if (Object.keys(patch).length > 0) {
    await db.update(accounts).set(patch).where(eq(accounts.id, auth.accountId));
  }
  return getAccount(auth.accountId);
}

export interface ApiAgent extends AuthUser {
  role: Role;
  confirmed: boolean;
}

export async function listAgents(accountId: number): Promise<ApiAgent[]> {
  const memberships = await db.query.accountUsers.findMany({
    where: (au, { eq: equals }) => equals(au.accountId, accountId),
  });
  const agents: ApiAgent[] = [];
  for (const membership of memberships) {
    const row = await db.query.users.findFirst({
      where: (u, { eq: equals }) => equals(u.id, membership.userId),
    });
    if (row) {
      agents.push({
        ...toApiUser(row),
        role: toRole(membership.role),
        confirmed: row.passwordDigest !== null,
      });
    }
  }
  return agents;
}

export async function inviteAgent(
  auth: AuthCtx,
  input: InviteAgentInput,
): Promise<{ agent: ApiAgent; invitationToken?: string }> {
  const { requireAdmin } = await import("../policies/index.js");
  requireAdmin(auth);
  const email = normalizeEmail(input.email);

  let user = await findUserByEmail(email);
  if (!user) {
    const [created] = await db
      .insert(users)
      .values({ name: input.name?.trim() || email.split("@")[0]!, email })
      .returning();
    if (!created) throw new UnprocessableError("Could not invite user");
    user = created;
  }
  const already = await db.query.accountUsers.findFirst({
    where: (au) => and(eq(au.userId, user.id), eq(au.accountId, auth.accountId)),
  });
  if (already) {
    throw new UnprocessableError("User is already a member", {
      email: ["já é membro desta conta"],
    });
  }
  await db.insert(accountUsers).values({
    userId: user.id,
    accountId: auth.accountId,
    role: input.role === "administrator" ? 1 : 0,
  });

  const { token, digest } = opaqueToken();
  await db.insert(accessTokens).values({
    ownerType: "invitation",
    ownerId: user.id,
    tokenDigest: digest,
    expiresAt: invitationExpiresAt(),
  });
  if (process.env.NODE_ENV !== "production") {
    console.log(`[auth] invitation token for ${email}: ${token}`);
  }
  const agent: ApiAgent = {
    ...toApiUser(user),
    role: input.role,
    confirmed: user.passwordDigest !== null,
  };
  return process.env.NODE_ENV === "production" ? { agent } : { agent, invitationToken: token };
}

export async function acceptInvitation(
  token: string,
  password: string,
  name?: string,
): Promise<{ user: AuthUser }> {
  const digest = digestOf(token);
  const stored = await db.query.accessTokens.findFirst({
    where: (t, { eq: equals }) => equals(t.tokenDigest, digest),
  });
  if (!stored || stored.ownerType !== "invitation" || isExpired(stored.expiresAt)) {
    throw new UnprocessableError("Invalid or expired token", {
      token: ["convite inválido ou expirado"],
    });
  }
  const passwordDigest = await Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
  const patch: Partial<{ name: string; passwordDigest: string }> = { passwordDigest };
  if (name?.trim()) patch.name = name.trim();
  await db.update(users).set(patch).where(eq(users.id, stored.ownerId));
  await db.delete(accessTokens).where(eq(accessTokens.id, stored.id));
  const row = await db.query.users.findFirst({
    where: (u, { eq: equals }) => equals(u.id, stored.ownerId),
  });
  if (!row) throw new NotFoundError("User not found");
  return { user: toApiUser(row) };
}

export async function updateAgentRole(
  auth: AuthCtx,
  userId: number,
  role: Role,
): Promise<ApiAgent> {
  const { requireAdmin } = await import("../policies/index.js");
  requireAdmin(auth);
  if (userId === auth.userId) {
    throw new UnprocessableError("You cannot change your own role", {
      role: ["não pode alterar o próprio papel"],
    });
  }
  const membership = await db.query.accountUsers.findFirst({
    where: (au) => and(eq(au.userId, userId), eq(au.accountId, auth.accountId)),
  });
  if (!membership) throw new NotFoundError("Agent not found");
  await db
    .update(accountUsers)
    .set({ role: role === "administrator" ? 1 : 0 })
    .where(eq(accountUsers.id, membership.id));
  const row = await db.query.users.findFirst({
    where: (u, { eq: equals }) => equals(u.id, userId),
  });
  if (!row) throw new NotFoundError("Agent not found");
  return { ...toApiUser(row), role, confirmed: row.passwordDigest !== null };
}

export async function removeAgent(auth: AuthCtx, userId: number): Promise<void> {
  const { requireAdmin } = await import("../policies/index.js");
  requireAdmin(auth);
  if (userId === auth.userId) {
    throw new UnprocessableError("You cannot remove yourself", {
      base: ["não pode remover a si mesmo"],
    });
  }
  const deleted = await db
    .delete(accountUsers)
    .where(and(eq(accountUsers.userId, userId), eq(accountUsers.accountId, auth.accountId)))
    .returning({ id: accountUsers.id });
  if (deleted.length === 0) throw new NotFoundError("Agent not found");
}

// ---- Perfil ----

export async function getProfile(userId: number): Promise<AuthUser> {
  const row = await db.query.users.findFirst({
    where: (u, { eq: equals }) => equals(u.id, userId),
  });
  if (!row) throw new NotFoundError("User not found");
  return toApiUser(row);
}

export async function updateProfile(userId: number, input: UpdateProfileInput): Promise<AuthUser> {
  const patch: Partial<{ name: string; availabilityStatus: number; uiSettings: unknown }> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.availability !== undefined)
    patch.availabilityStatus = AVAILABILITY_TO_INT[input.availability];
  if (input.ui_settings !== undefined) patch.uiSettings = input.ui_settings;
  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, userId));
  }
  return getProfile(userId);
}

export async function setAvailability(
  userId: number,
  availability: keyof typeof AVAILABILITY_TO_INT,
): Promise<AuthUser> {
  return updateProfile(userId, { availability });
}

export async function loadMembership(userId: number, accountId: number) {
  return db.query.accountUsers.findFirst({
    where: (au) => and(eq(au.userId, userId), eq(au.accountId, accountId)),
  });
}

export { toRole };
