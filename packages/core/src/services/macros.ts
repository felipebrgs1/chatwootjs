import { db, macros } from "@chatwootjs/db";
import { and, eq, or } from "drizzle-orm";

import { ForbiddenError, NotFoundError, UnprocessableError } from "../lib/errors.js";
import { jobs } from "../jobs/index.js";
import { requireAdmin, type AuthCtx } from "../policies/index.js";
import { logAudit } from "./audit.js";
import { MACRO_ACTION_NAMES } from "../schemas/macros.js";
import type { ActionItem } from "../schemas/automation.js";
import { applyActionItems, validateActionItems } from "./conversation-actions.js";

// Espelha macros_controller do Rails (incluindo `visibility` personal/global
// e execução assíncrona via job, como o MacrosExecutionJob).

export interface ApiMacro {
  id: number;
  name: string;
  visibility: "personal" | "global";
  actions: ActionItem[];
  created_by_id: number | null;
}

function toApi(row: typeof macros.$inferSelect): ApiMacro {
  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility === 1 ? "global" : "personal",
    actions: row.actions,
    created_by_id: row.createdById,
  };
}

export async function listMacros(accountId: number, auth: AuthCtx): Promise<ApiMacro[]> {
  const scope =
    auth.role === "administrator"
      ? eq(macros.accountId, accountId)
      : and(
          eq(macros.accountId, accountId),
          or(eq(macros.visibility, 1), eq(macros.createdById, auth.userId)),
        );
  const rows = await db.query.macros.findMany({ where: () => scope });
  return rows.map(toApi);
}

export async function findMacro(accountId: number, id: number) {
  const row = await db.query.macros.findFirst({
    where: (m) => and(eq(m.accountId, accountId), eq(m.id, id)),
  });
  if (!row) throw new NotFoundError("Macro not found");
  return row;
}

function assertCanUse(macro: typeof macros.$inferSelect, auth: AuthCtx): void {
  if (auth.role === "administrator") return;
  if (macro.visibility === 1) return;
  if (macro.createdById === auth.userId) return;
  throw new ForbiddenError("You cannot use this macro");
}

export async function createMacro(
  accountId: number,
  auth: AuthCtx,
  input: { name: string; visibility?: "personal" | "global"; actions: ActionItem[] },
): Promise<ApiMacro> {
  validateActionItems(input.actions, MACRO_ACTION_NAMES);
  if (input.visibility === "global") requireAdmin(auth);
  const [row] = await db
    .insert(macros)
    .values({
      accountId,
      name: input.name,
      visibility: input.visibility === "global" ? 1 : 0,
      createdById: auth.userId,
      updatedById: auth.userId,
      actions: input.actions,
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create macro");
  void logAudit(accountId, auth.userId, "create", "Macro", row.id, {});
  return toApi(row);
}

export async function updateMacro(
  accountId: number,
  auth: AuthCtx,
  id: number,
  input: { name?: string; visibility?: "personal" | "global"; actions?: ActionItem[] },
): Promise<ApiMacro> {
  const macro = await findMacro(accountId, id);
  assertCanUse(macro, auth);
  if (input.actions) validateActionItems(input.actions, MACRO_ACTION_NAMES);
  if (input.visibility === "global") requireAdmin(auth);
  const [updated] = await db
    .update(macros)
    .set({
      name: input.name ?? macro.name,
      visibility:
        input.visibility === undefined ? macro.visibility : input.visibility === "global" ? 1 : 0,
      actions: input.actions ?? macro.actions,
      updatedById: auth.userId,
      updatedAt: new Date(),
    })
    .where(eq(macros.id, macro.id))
    .returning();
  if (!updated) throw new NotFoundError("Macro not found");
  void logAudit(accountId, auth.userId, "update", "Macro", macro.id, {});
  return toApi(updated);
}

export async function deleteMacro(accountId: number, auth: AuthCtx, id: number): Promise<void> {
  const macro = await findMacro(accountId, id);
  assertCanUse(macro, auth);
  await db.delete(macros).where(eq(macros.id, macro.id));
  void logAudit(accountId, auth.userId, "destroy", "Macro", macro.id, {});
}

/**
 * Execução de macro (Rails: MacrosExecutionJob). Passa pela fila de jobs —
 * com BullMQ (REDIS_URL) roda no worker, sem ele roda in-process.
 */
export async function executeMacro(
  accountId: number,
  auth: AuthCtx,
  id: number,
  conversationIds: number[],
): Promise<{ queued: number }> {
  const macro = await findMacro(accountId, id);
  assertCanUse(macro, auth);
  if (conversationIds.length === 0) {
    throw new UnprocessableError("Select at least one conversation", {
      conversation_id: ["selecione ao menos uma conversa"],
    });
  }
  await jobs.dispatch({
    name: "macro.execute",
    payload: {
      accountId,
      macroId: macro.id,
      conversationIds: [...new Set(conversationIds)],
      actorId: auth.userId,
    },
  });
  return { queued: conversationIds.length };
}

/** Handler do job `macro.execute` (registrado no boot do server). */
export function registerMacroJob(): void {
  jobs.on("macro.execute", async (payload) => {
    const { accountId, macroId, conversationIds, actorId } = payload as {
      accountId: number;
      macroId: number;
      conversationIds: number[];
      actorId: number;
    };
    const macro = await db.query.macros.findFirst({
      where: (m) => and(eq(m.accountId, accountId), eq(m.id, macroId)),
    });
    if (!macro) return;
    const actor = await db.query.users.findFirst({
      where: (u, { eq: eqFn }) => eqFn(u.id, actorId),
      columns: { name: true },
    });
    for (const conversationId of conversationIds) {
      try {
        await applyActionItems(accountId, conversationId, macro.actions, {
          actorName: `Macro ${macro.name} (${actor?.name ?? "agente"})`,
        });
      } catch (err) {
        console.error(`[macro.execute] conversa ${conversationId}`, err);
      }
    }
  });
}
