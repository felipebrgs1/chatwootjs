/**
 * Trilha de auditoria (tabela `audits`, DDL Rails — D2).
 * Escopo por conta via associated (associated_type='Account',
 * associated_id=account_id); payload em audited_changes.
 *
 * `logAudit` nunca quebra o fluxo chamador (try/catch interno) e é
 * fire-and-forget (`void`) nas rotas/services. Leitura só para admin.
 */
import { audits, db } from "@chatwootjs/db";
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
    await db.insert(audits).values({
      associatedId: accountId,
      associatedType: "Account",
      userId,
      action,
      auditableType,
      auditableId,
      auditedChanges: changes,
    });
  } catch (err) {
    console.error("[audit]", err);
  }
}

export interface ApiAuditLog {
  id: number;
  user_id: number | null;
  action: string | null;
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
  const conditions = [eq(audits.associatedId, accountId), eq(audits.associatedType, "Account")];
  if (query.user_id) conditions.push(eq(audits.userId, query.user_id));
  if (query.auditable_type) conditions.push(eq(audits.auditableType, query.auditable_type));
  if (query.action) conditions.push(eq(audits.action, query.action));
  const where = and(...conditions);

  const totalRows = await db.select({ total: count() }).from(audits).where(where);
  const limit = 25;
  const rows = await db.query.audits.findMany({
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
      changes: (r.auditedChanges ?? {}) as Record<string, unknown>,
      created_at: r.createdAt?.toISOString() ?? "",
    })),
    meta: { page: query.page, total: totalRows[0]?.total ?? 0 },
  };
}
