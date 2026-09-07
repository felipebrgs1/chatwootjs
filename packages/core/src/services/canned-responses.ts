import { cannedResponses, db } from "@chatwootjs/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { requireAdmin, type AuthCtx } from "../policies/index.js";
import { logAudit } from "./audit.js";

// Espelha canned_responses_controller do Rails, incluindo a ordenação
// `order_by_search` (short_code que começa com a busca primeiro).

export interface ApiCannedResponse {
  id: number;
  short_code: string | null;
  content: string | null;
}

function toApi(row: typeof cannedResponses.$inferSelect): ApiCannedResponse {
  return { id: row.id, short_code: row.shortCode, content: row.content };
}

export async function listCannedResponses(
  accountId: number,
  search?: string,
): Promise<ApiCannedResponse[]> {
  const q = search?.trim();
  if (!q) {
    const rows = await db.query.cannedResponses.findMany({
      where: (c) => eq(c.accountId, accountId),
      orderBy: (c) => desc(c.createdAt),
      limit: 200,
    });
    return rows.map(toApi);
  }
  const pattern = `%${q}%`;
  const rows = await db
    .select()
    .from(cannedResponses)
    .where(
      and(
        eq(cannedResponses.accountId, accountId),
        or(ilike(cannedResponses.shortCode, pattern), ilike(cannedResponses.content, pattern)),
      ),
    )
    .orderBy(
      sql`case when ${cannedResponses.shortCode} ilike ${`${q}%`} then 1 when ${cannedResponses.shortCode} ilike ${pattern} then 0.5 when ${cannedResponses.content} ilike ${pattern} then 0.2 else 0 end desc`,
    )
    .limit(50);
  return rows.map(toApi);
}

export async function findCannedResponse(accountId: number, id: number) {
  const row = await db.query.cannedResponses.findFirst({
    where: (c) => and(eq(c.accountId, accountId), eq(c.id, id)),
  });
  if (!row) throw new NotFoundError("Canned response not found");
  return row;
}

export async function createCannedResponse(
  accountId: number,
  auth: AuthCtx,
  input: { short_code: string; content: string },
): Promise<ApiCannedResponse> {
  requireAdmin(auth);
  try {
    const [row] = await db
      .insert(cannedResponses)
      .values({ accountId, shortCode: input.short_code, content: input.content })
      .returning();
    if (!row) throw new UnprocessableError("Could not create canned response");
    void logAudit(accountId, auth.userId, "create", "CannedResponse", row.id, {});
    return toApi(row);
  } catch (err) {
    if (err instanceof UnprocessableError) throw err;
    throw new UnprocessableError("Could not create canned response", {
      short_code: ["já está em uso"],
    });
  }
}

export async function updateCannedResponse(
  accountId: number,
  auth: AuthCtx,
  id: number,
  input: { short_code?: string; content?: string },
): Promise<ApiCannedResponse> {
  requireAdmin(auth);
  const row = await findCannedResponse(accountId, id);
  try {
    const [updated] = await db
      .update(cannedResponses)
      .set({
        shortCode: input.short_code ?? row.shortCode,
        content: input.content ?? row.content,
        updatedAt: new Date(),
      })
      .where(eq(cannedResponses.id, row.id))
      .returning();
    if (!updated) throw new NotFoundError("Canned response not found");
    void logAudit(accountId, auth.userId, "update", "CannedResponse", row.id, {});
    return toApi(updated);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    throw new UnprocessableError("Could not update canned response", {
      short_code: ["já está em uso"],
    });
  }
}

export async function deleteCannedResponse(
  accountId: number,
  auth: AuthCtx,
  id: number,
): Promise<void> {
  requireAdmin(auth);
  const row = await findCannedResponse(accountId, id);
  await db.delete(cannedResponses).where(eq(cannedResponses.id, row.id));
  void logAudit(accountId, auth.userId, "destroy", "CannedResponse", row.id, {});
}
