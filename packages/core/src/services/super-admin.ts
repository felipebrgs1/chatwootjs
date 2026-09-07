/**
 * M12 — Console do superadmin (área separada `/super_admin`, auth própria
 * por `super_admins` — fora do escopo de contas).
 */
import { accounts, accountUsers, db, installationConfigs, users } from "@chatwootjs/db";
import { count, desc, eq, ilike, or } from "drizzle-orm";

import { localeCodeFromId } from "../lib/locales.js";

import { NotFoundError, UnauthorizedError, UnprocessableError } from "../lib/errors.js";
import { signSuperAccessToken, verifySuperAccessToken } from "../lib/tokens.js";

export async function superAdminSignIn(
  email: string,
  password: string,
): Promise<{ token: string; super_admin: { id: number; email: string } }> {
  const row = await db.query.superAdmins.findFirst({
    where: (s) => eq(s.email, email.toLowerCase().trim()),
  });
  if (!row || !(await Bun.password.verify(password, row.passwordDigest))) {
    throw new UnauthorizedError("Invalid email or password");
  }
  return {
    token: await signSuperAccessToken(row.id),
    super_admin: { id: row.id, email: row.email },
  };
}

export async function requireSuperAdmin(token: string): Promise<{ id: number; email: string }> {
  const id = await verifySuperAccessToken(token).catch(() => {
    throw new UnauthorizedError("Invalid or expired token");
  });
  const row = await db.query.superAdmins.findFirst({ where: (s) => eq(s.id, id) });
  if (!row) throw new UnauthorizedError("Invalid or expired token");
  return { id: row.id, email: row.email };
}

export async function listAllAccounts(
  search?: string,
): Promise<Array<{ id: number; name: string; locale: string; users: number; created_at: string }>> {
  const rows = await db.query.accounts.findMany({
    where: search ? (a) => ilike(a.name, `%${search.slice(0, 60)}%`) : undefined,
    orderBy: (a) => desc(a.createdAt),
    limit: 100,
  });
  return Promise.all(
    rows.map(async (a) => {
      const members = await db
        .select({ total: count() })
        .from(accountUsers)
        .where(eq(accountUsers.accountId, a.id));
      return {
        id: a.id,
        name: a.name ?? "",
        locale: localeCodeFromId(a.locale),
        users: members[0]?.total ?? 0,
        created_at: a.createdAt?.toISOString() ?? "",
      };
    }),
  );
}

export async function listAllUsers(
  search?: string,
): Promise<Array<{ id: number; name: string; email: string; accounts: number }>> {
  const rows = await db.query.users.findMany({
    where: search
      ? (u) =>
          or(ilike(u.name, `%${search.slice(0, 60)}%`), ilike(u.email, `%${search.slice(0, 60)}%`))
      : undefined,
    orderBy: (u) => desc(u.createdAt),
    limit: 100,
    columns: { id: true, name: true, email: true },
  });
  return Promise.all(
    rows.map(async (u) => {
      const links = await db
        .select({ total: count() })
        .from(accountUsers)
        .where(eq(accountUsers.userId, u.id));
      return { id: u.id, name: u.name ?? "", email: u.email ?? "", accounts: links[0]?.total ?? 0 };
    }),
  );
}

export async function deleteUserEverywhere(id: number): Promise<void> {
  const deleted = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  if (deleted.length === 0) throw new NotFoundError("User not found");
}

export async function deleteAccountCascade(id: number): Promise<void> {
  const deleted = await db
    .delete(accounts)
    .where(eq(accounts.id, id))
    .returning({ id: accounts.id });
  if (deleted.length === 0) throw new NotFoundError("Account not found");
}

export async function listInstallationConfigs(): Promise<
  Array<{ id: number; name: string; value: unknown; locked: boolean }>
> {
  const rows = await db.query.installationConfigs.findMany({
    orderBy: (c) => c.name,
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name ?? "",
    value: r.serializedValue,
    locked: r.locked ?? false,
  }));
}

export async function upsertInstallationConfig(
  name: string,
  value: unknown,
): Promise<{ id: number; name: string; value: unknown; locked: boolean }> {
  const key = name.trim().slice(0, 255);
  if (!key) throw new UnprocessableError("Invalid config name");
  const existing = await db.query.installationConfigs.findFirst({
    where: (c) => eq(c.name, key),
  });
  if (existing) {
    const [row] = await db
      .update(installationConfigs)
      .set({ serializedValue: value as Record<string, unknown>, updatedAt: new Date() })
      .where(eq(installationConfigs.id, existing.id))
      .returning();
    if (!row) throw new NotFoundError("Config not found");
    return {
      id: row.id,
      name: row.name ?? "",
      value: row.serializedValue,
      locked: row.locked ?? false,
    };
  }
  const [row] = await db
    .insert(installationConfigs)
    .values({ name: key, serializedValue: value as Record<string, unknown> })
    .returning();
  if (!row) throw new UnprocessableError("Could not save config");
  return {
    id: row.id,
    name: row.name ?? "",
    value: row.serializedValue,
    locked: row.locked ?? false,
  };
}

export async function listPlatformApps(): Promise<Array<{ id: number; name: string }>> {
  const rows = await db.query.platformApps.findMany({ orderBy: (a) => a.name });
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export async function listPlatformBanners(): Promise<
  Array<{ id: number; banner_message: string; banner_type: number; active: boolean }>
> {
  const rows = await db.query.platformBanners.findMany({
    orderBy: (b) => desc(b.createdAt),
  });
  return rows.map((r) => ({
    id: r.id,
    banner_message: r.bannerMessage,
    banner_type: r.bannerType,
    active: r.active,
  }));
}
