import { accessTokens, accountUsers, accounts, db, users } from "@chatwootjs/db";
import { and, eq } from "drizzle-orm";

import { defaultFeatureFlags, flagsToObject } from "../lib/feature-flags.js";
import { localeCodeFromId, localeIdFromCode } from "../lib/locales.js";

import { NotFoundError, UnauthorizedError, UnprocessableError } from "../lib/errors.js";
import {
  digestOf,
  INVITATION_TTL_MS,
  opaqueToken,
  REFRESH_TTL_MS,
  RESET_TTL_MS,
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

// access_tokens segue o DDL Rails (owner_type/owner_id/token, sem expires_at):
// a expiração deriva de created_at + TTL do tipo (refresh 30d, convite 7d, reset 2h).
function tokenExpired(createdAt: Date | null, ttlMs: number): boolean {
  if (!createdAt) return true;
  return createdAt.getTime() + ttlMs <= Date.now();
}

async function issueTokenPair(userId: number): Promise<TokenPair> {
  const accessToken = await signAccessToken(userId);
  const { token: refreshToken, digest } = opaqueToken();
  await db.insert(accessTokens).values({
    ownerType: "refresh",
    ownerId: userId,
    token: digest,
  });
  return { accessToken, refreshToken };
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  availability: string;
  uiSettings: unknown;
  /** true quando o e-mail consta em `super_admins` (vê o console /superadmin). */
  is_super_admin?: boolean;
}

export function toApiUser(row: typeof users.$inferSelect): AuthUser {
  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email ?? "",
    availability: AVAILABILITY_FROM_INT[row.availabilityStatus ?? 0] ?? "online",
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
    // Rails: before_create :enable_default_features.
    const [account] = await tx
      .insert(accounts)
      .values({ name: input.account_name?.trim() || `${input.name} Inc`, ...defaultFeatureFlags() })
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
  const membershipAccountId = membership?.accountId;
  if (!membershipAccountId) throw new UnprocessableError("Could not create account membership");
  const { ensureNotificationSettings } = await import("./notifications.js");
  await ensureNotificationSettings(membershipAccountId, userId);
  return {
    user: toApiUser(row),
    accountId: membershipAccountId,
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
    where: (t, { eq: equals }) => equals(t.token, digest),
  });
  if (!stored || stored.ownerType !== "refresh" || tokenExpired(stored.createdAt, REFRESH_TTL_MS)) {
    if (stored) await db.delete(accessTokens).where(eq(accessTokens.id, stored.id));
    throw new UnauthorizedError("Invalid refresh token");
  }
  if (!stored.ownerId) throw new UnauthorizedError("Invalid refresh token");
  await db.delete(accessTokens).where(eq(accessTokens.id, stored.id));
  return issueTokenPair(stored.ownerId);
}

export async function signOut(refreshToken: string): Promise<void> {
  await db.delete(accessTokens).where(eq(accessTokens.token, digestOf(refreshToken)));
}

export async function forgotPassword(email: string): Promise<{ resetToken?: string }> {
  const row = await findUserByEmail(email);
  // Resposta sempre ok (não vazar se o e-mail existe). Em dev, devolver o token.
  if (!row) return {};
  const { token, digest } = opaqueToken();
  await db.insert(accessTokens).values({
    ownerType: "password_reset",
    ownerId: row.id,
    token: digest,
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
    where: (t, { eq: equals }) => equals(t.token, digest),
  });
  const resetUserId = stored?.ownerId;
  if (
    !resetUserId ||
    stored?.ownerType !== "password_reset" ||
    tokenExpired(stored?.createdAt ?? null, RESET_TTL_MS)
  ) {
    throw new UnprocessableError("Invalid or expired token", { token: ["inválido ou expirado"] });
  }
  const passwordDigest = await Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
  await db.update(users).set({ passwordDigest }).where(eq(users.id, resetUserId));
  await db.delete(accessTokens).where(eq(accessTokens.id, stored.id));
  // Revoga refresh tokens existentes por segurança.
  await db
    .delete(accessTokens)
    .where(and(eq(accessTokens.ownerType, "refresh"), eq(accessTokens.ownerId, resetUserId)));
}

// ---- Contas e agentes ----

export interface ApiAccount {
  id: number;
  name: string;
  locale: string;
  role?: Role;
  feature_flags?: Record<string, unknown>;
}

export async function listMyAccounts(userId: number): Promise<ApiAccount[]> {
  const memberships = await db.query.accountUsers.findMany({
    where: (au, { eq: equals }) => equals(au.userId, userId),
  });
  const result: ApiAccount[] = [];
  for (const membership of memberships) {
    const memberAccountId = membership.accountId;
    if (!memberAccountId) continue;
    const account = await db.query.accounts.findFirst({
      where: (a, { eq: equals }) => equals(a.id, memberAccountId),
    });
    if (account) {
      result.push({
        id: account.id,
        name: account.name ?? "",
        locale: localeCodeFromId(account.locale),
        role: toRole(membership.role ?? 0),
      });
    }
  }
  return result;
}

export async function getAccount(accountId: number): Promise<ApiAccount> {
  const account = await db.query.accounts.findFirst({
    where: (a, { eq: equals }) => equals(a.id, accountId),
  });
  if (!account) throw new NotFoundError("Account not found");
  return {
    id: account.id,
    name: account.name ?? "",
    locale: localeCodeFromId(account.locale),
    feature_flags: flagsToObject(account.featureFlags, account.featureFlagsExt1),
  };
}

export async function updateAccount(
  auth: AuthCtx,
  data: { name?: string; locale?: string },
): Promise<ApiAccount> {
  const { requireAdmin } = await import("../policies/index.js");
  requireAdmin(auth);
  const patch: Partial<{ name: string; locale: number }> = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.locale !== undefined) patch.locale = localeIdFromCode(data.locale);
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
    const memberUserId = membership.userId;
    if (!memberUserId) continue;
    const row = await db.query.users.findFirst({
      where: (u, { eq: equals }) => equals(u.id, memberUserId),
    });
    if (row) {
      agents.push({
        ...toApiUser(row),
        role: toRole(membership.role ?? 0),
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
  const { ensureNotificationSettings } = await import("./notifications.js");
  await ensureNotificationSettings(auth.accountId, user.id);

  const { token, digest } = opaqueToken();
  await db.insert(accessTokens).values({
    ownerType: "invitation",
    ownerId: user.id,
    token: digest,
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
    where: (t, { eq: equals }) => equals(t.token, digest),
  });
  const invitedUserId = stored?.ownerId;
  if (
    !invitedUserId ||
    stored?.ownerType !== "invitation" ||
    tokenExpired(stored?.createdAt ?? null, INVITATION_TTL_MS)
  ) {
    throw new UnprocessableError("Invalid or expired token", {
      token: ["convite inválido ou expirado"],
    });
  }
  const passwordDigest = await Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
  const patch: Partial<{ name: string; passwordDigest: string }> = { passwordDigest };
  if (name?.trim()) patch.name = name.trim();
  await db.update(users).set(patch).where(eq(users.id, invitedUserId));
  await db.delete(accessTokens).where(eq(accessTokens.id, stored.id));
  const row = await db.query.users.findFirst({
    where: (u, { eq: equals }) => equals(u.id, invitedUserId),
  });
  if (!row) throw new NotFoundError("User not found");
  // R1: garante settings default também para convites antigos/importados.
  const memberships = await db.query.accountUsers.findMany({
    where: (au, { eq: equals }) => equals(au.userId, invitedUserId),
  });
  const { ensureNotificationSettings } = await import("./notifications.js");
  for (const membership of memberships) {
    if (membership.accountId != null) {
      await ensureNotificationSettings(membership.accountId, invitedUserId);
    }
  }
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
  if (!membership?.id) throw new NotFoundError("Agent not found");
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
  // Permissão do console /superadmin: e-mail presente em `super_admins`.
  const superRow = await db.query.superAdmins.findFirst({
    where: (s, { eq: equals }) => equals(s.email, (row.email ?? "").toLowerCase()),
  });
  return { ...toApiUser(row), is_super_admin: !!superRow };
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
