/**
 * M12 — Trilha de auditoria (`audit_logs`, tabela própria — ver M12).
 *
 * `logAudit` nunca quebra o fluxo chamador (try/catch interno) e é
 * fire-and-forget (`void`) nas rotas/services. Leitura só para admin.
 */
import { auditLogs, db } from "@chatwootjs/db";
import { and, count, desc, eq } from "drizzle-orm";

import { requireAdmin, type AuthCtx } from "../policies/index.js";
import type { AuditLogsQuery } from "../schemas/ops.js";

export type AuditAction = "create" | "update" | "destroy";

export async function logAudit(
  accountId: number,
  userId: number | null,
  action: AuditAction,
  auditableType: string,
  auditableId: number | null,
  changes: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      accountId,
      userId,
      action,
      auditableType,
      auditableId,
      changes,
    });
  } catch (err) {
    console.error("[audit]", err);
  }
}

export interface ApiAuditLog {
  id: number;
  user_id: number | null;
  action: string;
  auditable_type: string | null;
  auditable_id: number | null;
  changes: Record<string, unknown>;
  created_at: string;
}

export async function listAuditLogs(
  accountId: number,
  auth: AuthCtx,
  query: AuditLogsQuery,
): Promise<{ audit_logs: ApiAuditLog[]; meta: { page: number; total: number } }> {
  requireAdmin(auth);
  const conditions = [eq(auditLogs.accountId, accountId)];
  if (query.user_id) conditions.push(eq(auditLogs.userId, query.user_id));
  if (query.auditable_type) conditions.push(eq(auditLogs.auditableType, query.auditable_type));
  if (query.action) conditions.push(eq(auditLogs.action, query.action));
  const where = and(...conditions);

  const totalRows = await db.select({ total: count() }).from(auditLogs).where(where);
  const limit = 25;
  const rows = await db.query.auditLogs.findMany({
    where,
    orderBy: (a) => desc(a.createdAt),
    limit,
    offset: (query.page - 1) * limit,
  });
  return {
    audit_logs: rows.map((r) => ({
      id: r.id,
      user_id: r.userId,
      action: r.action,
      auditable_type: r.auditableType,
      auditable_id: r.auditableId,
      changes: r.changes ?? {},
      created_at: r.createdAt.toISOString(),
    })),
    meta: { page: query.page, total: totalRows[0]?.total ?? 0 },
  };
}
