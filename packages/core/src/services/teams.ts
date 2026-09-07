import { conversations as conversationsTable, db, teamMembers, teams, users } from "@chatwootjs/db";
import { and, eq, inArray } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { requireAdmin, type AuthCtx } from "../policies/index.js";
import { logAudit } from "./audit.js";

// Espelha teams_controller + team_members do Rails.

export interface ApiTeamMember {
  id: number;
  name: string;
  email: string;
}

export interface ApiTeam {
  id: number;
  name: string;
  description: string | null;
  allow_auto_assign: boolean;
  members: ApiTeamMember[];
  conversations_count?: number;
}

async function membersOf(teamId: number): Promise<ApiTeamMember[]> {
  const rows = await db
    .select({ user: users })
    .from(teamMembers)
    .innerJoin(users, eq(users.id, teamMembers.userId))
    .where(eq(teamMembers.teamId, teamId));
  return rows.map((r) => ({ id: r.user.id, name: r.user.name, email: r.user.email }));
}

export async function toApiTeam(
  row: typeof teams.$inferSelect,
  withCount = false,
): Promise<ApiTeam> {
  const members = await membersOf(row.id);
  const api: ApiTeam = {
    id: row.id,
    name: row.name,
    description: row.description,
    allow_auto_assign: row.allowAutoAssign,
    members,
  };
  if (withCount) {
    const convs = await db.query.conversations.findMany({
      where: (c) => and(eq(c.accountId, row.accountId), eq(c.teamId, row.id)),
      columns: { id: true },
    });
    api.conversations_count = convs.length;
  }
  return api;
}

export async function findTeam(accountId: number, id: number) {
  const row = await db.query.teams.findFirst({
    where: (t) => and(eq(t.accountId, accountId), eq(t.id, id)),
  });
  if (!row) throw new NotFoundError("Team not found");
  return row;
}

export async function listTeams(accountId: number): Promise<ApiTeam[]> {
  const rows = await db.query.teams.findMany({
    where: (t) => eq(t.accountId, accountId),
  });
  return Promise.all(rows.map((r) => toApiTeam(r, true)));
}

export async function getTeam(accountId: number, id: number): Promise<ApiTeam> {
  return toApiTeam(await findTeam(accountId, id), true);
}

async function assertAgentsInAccount(accountId: number, userIds: number[]): Promise<void> {
  if (userIds.length === 0) return;
  const rows = await db.query.accountUsers.findMany({
    where: (au) => and(eq(au.accountId, accountId), inArray(au.userId, userIds)),
    columns: { userId: true },
  });
  const found = new Set(rows.map((r) => r.userId));
  const missing = userIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw new UnprocessableError("Some agents do not belong to this account", {
      user_ids: [`agentes inválidos: ${missing.join(", ")}`],
    });
  }
}

export async function createTeam(
  accountId: number,
  auth: AuthCtx,
  input: { name: string; description?: string; allow_auto_assign?: boolean; user_ids?: number[] },
): Promise<ApiTeam> {
  requireAdmin(auth);
  const name = input.name
    .replace(/[[:cntrl:]]/g, "")
    .trim()
    .toLowerCase();
  if (!name) throw new UnprocessableError("Invalid team name", { name: ["é inválido"] });
  await assertAgentsInAccount(accountId, input.user_ids ?? []);
  try {
    const [row] = await db
      .insert(teams)
      .values({
        accountId,
        name,
        description: input.description ?? null,
        allowAutoAssign: input.allow_auto_assign ?? true,
      })
      .returning();
    if (!row) throw new UnprocessableError("Could not create team");
    void logAudit(auth.accountId, auth.userId, "create", "Team", row.id, {});
    if (input.user_ids?.length) {
      await db
        .insert(teamMembers)
        .values([...new Set(input.user_ids)].map((userId) => ({ teamId: row.id, userId })));
    }
    return toApiTeam(row, true);
  } catch (err) {
    if (err instanceof UnprocessableError) throw err;
    throw new UnprocessableError("Could not create team", { name: ["já está em uso"] });
  }
}

export async function updateTeam(
  accountId: number,
  auth: AuthCtx,
  id: number,
  input: { name?: string; description?: string; allow_auto_assign?: boolean },
): Promise<ApiTeam> {
  requireAdmin(auth);
  const row = await findTeam(accountId, id);
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) {
    const name = input.name
      .replace(/[[:cntrl:]]/g, "")
      .trim()
      .toLowerCase();
    if (!name) throw new UnprocessableError("Invalid team name", { name: ["é inválido"] });
    patch.name = name;
  }
  if (input.description !== undefined) patch.description = input.description || null;
  if (input.allow_auto_assign !== undefined) patch.allowAutoAssign = input.allow_auto_assign;
  try {
    const [updated] = await db.update(teams).set(patch).where(eq(teams.id, row.id)).returning();
    if (!updated) throw new NotFoundError("Team not found");
    void logAudit(accountId, auth.userId, "update", "Team", row.id, {});
    return toApiTeam(updated, true);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof UnprocessableError) throw err;
    throw new UnprocessableError("Could not update team", { name: ["já está em uso"] });
  }
}

export async function deleteTeam(accountId: number, auth: AuthCtx, id: number): Promise<void> {
  requireAdmin(auth);
  const row = await findTeam(accountId, id);
  await db.transaction(async (tx) => {
    await tx
      .update(conversationsTable)
      .set({ teamId: null })
      .where(eq(conversationsTable.teamId, row.id));
    await tx.delete(teams).where(eq(teams.id, row.id));
  });
  void logAudit(accountId, auth.userId, "destroy", "Team", row.id, {});
}

export async function addTeamMembers(
  accountId: number,
  auth: AuthCtx,
  id: number,
  userIds: number[],
): Promise<ApiTeamMember[]> {
  requireAdmin(auth);
  const row = await findTeam(accountId, id);
  await assertAgentsInAccount(accountId, userIds);
  await db
    .insert(teamMembers)
    .values([...new Set(userIds)].map((userId) => ({ teamId: row.id, userId })))
    .onConflictDoNothing();
  return membersOf(row.id);
}

export async function removeTeamMember(
  accountId: number,
  auth: AuthCtx,
  id: number,
  userId: number,
): Promise<void> {
  requireAdmin(auth);
  const row = await findTeam(accountId, id);
  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.teamId, row.id), eq(teamMembers.userId, userId)));
}

/** Times do agente (para o seletor no header da conversa). */
export async function listMyTeams(accountId: number, auth: AuthCtx): Promise<ApiTeam[]> {
  if (auth.role === "administrator") return listTeams(accountId);
  const memberships = await db.query.teamMembers.findMany({
    where: (tm) => eq(tm.userId, auth.userId),
    columns: { teamId: true },
  });
  const ids = memberships.map((m) => m.teamId);
  if (ids.length === 0) return [];
  const rows = await db.query.teams.findMany({
    where: (t) => and(eq(t.accountId, accountId), inArray(t.id, ids)),
  });
  return Promise.all(rows.map((r) => toApiTeam(r)));
}

/**
 * Round-robin/least-busy entre membros online da inbox (espelha o
 * auto-assignment do Rails). Retorna o userId escolhido ou null.
 */
export async function pickAutoAssignee(inboxId: number): Promise<number | null> {
  const memberships = await db.query.inboxMembers.findMany({
    where: (im) => eq(im.inboxId, inboxId),
    columns: { userId: true },
  });
  if (memberships.length === 0) return null;
  const userIds = memberships.map((m) => m.userId);
  const online = await db.query.users.findMany({
    where: (u) => and(inArray(u.id, userIds), eq(u.availabilityStatus, 0)),
    columns: { id: true },
  });
  const candidates = (online.length > 0 ? online : []).map((u) => u.id);
  if (candidates.length === 0) return null;
  // Least-busy: quem tem menos conversas abertas atribuídas (determinístico,
  // sem estado extra — equivale ao round-robin em regime estável).
  const open = await db.query.conversations.findMany({
    where: (c) => and(eq(c.status, 0), inArray(c.assigneeId, candidates)),
    columns: { assigneeId: true },
  });
  const load = new Map<number, number>(candidates.map((id) => [id, 0]));
  for (const c of open) {
    if (c.assigneeId != null) load.set(c.assigneeId, (load.get(c.assigneeId) ?? 0) + 1);
  }
  let best = candidates[0]!;
  for (const id of candidates) {
    if ((load.get(id) ?? 0) < (load.get(best) ?? 0)) best = id;
  }
  return best;
}
