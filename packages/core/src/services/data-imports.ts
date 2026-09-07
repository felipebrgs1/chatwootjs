/**
 * M12 — UI de importações (o processamento em si é do M3):
 * lista + detalhe das importações da conta.
 */
import { dataImports, db } from "@chatwootjs/db";
import { and, count, desc, eq } from "drizzle-orm";

import { NotFoundError } from "../lib/errors.js";
import { requireAdmin, type AuthCtx } from "../policies/index.js";

export interface ApiDataImport {
  id: number;
  data_type: string;
  status: string;
  total_records: number | null;
  processed_records: number | null;
  name: string | null;
  created_at: string;
}

const STATUS = ["pending", "processing", "completed", "failed", "abandoned"] as const;

export async function listDataImports(
  accountId: number,
  auth: AuthCtx,
  page = 1,
): Promise<{ data_imports: ApiDataImport[]; meta: { page: number; total: number } }> {
  requireAdmin(auth);
  const where = eq(dataImports.accountId, accountId);
  const totalRows = await db.select({ total: count() }).from(dataImports).where(where);
  const rows = await db.query.dataImports.findMany({
    where,
    orderBy: (d) => desc(d.createdAt),
    limit: 25,
    offset: (page - 1) * 25,
  });
  return {
    data_imports: rows.map((r) => ({
      id: r.id,
      data_type: r.dataType,
      status: STATUS[r.status] ?? "pending",
      total_records: r.totalRecords,
      processed_records: r.processedRecords,
      name: r.name,
      created_at: r.createdAt.toISOString(),
    })),
    meta: { page, total: totalRows[0]?.total ?? 0 },
  };
}

export async function getDataImport(
  accountId: number,
  auth: AuthCtx,
  id: number,
): Promise<ApiDataImport & { processing_errors: string | null }> {
  requireAdmin(auth);
  const row = await db.query.dataImports.findFirst({
    where: (d) => and(eq(d.id, id), eq(d.accountId, accountId)),
  });
  if (!row) throw new NotFoundError("Import not found");
  return {
    id: row.id,
    data_type: row.dataType,
    status: STATUS[row.status] ?? "pending",
    total_records: row.totalRecords,
    processed_records: row.processedRecords,
    name: row.name,
    created_at: row.createdAt.toISOString(),
    processing_errors: row.processingErrors,
  };
}
