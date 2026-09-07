import {
  automationRulePendingExecutions,
  automationRules,
  db,
  type AutomationRule,
} from "@chatwootjs/db";
import { and, eq, lte } from "drizzle-orm";

import { NotFoundError, UnprocessableError } from "../lib/errors.js";
import { requireAdmin, type AuthCtx } from "../policies/index.js";
import {
  AUTOMATION_ACTION_NAMES,
  AUTOMATION_CONDITION_KEYS,
  AUTOMATION_FILTER_OPERATORS,
  type ActionItem,
  type ConditionItem,
} from "../schemas/automation.js";
import { PRIORITY_FROM_INT, STATUS_FROM_INT } from "../schemas/conversations.js";
import { MESSAGE_TYPE_FROM_INT } from "../schemas/messages.js";
import { applyActionItems, validateActionItems } from "./conversation-actions.js";
import { findConversation } from "./conversations.js";

// Espelha automation_rules_controller + AutomationRule do Rails:
// CRUD validado + avaliação de condições (AND/OR) + execução de ações +
// regras com delay (pending_executions + sweep periódico).

export interface ApiAutomationRule {
  id: number;
  name: string;
  description: string | null;
  event_name: string;
  conditions: RuleCondition[];
  actions: ActionItem[];
  active: boolean;
  execution_delay: number | null;
  created_at: string;
}

/** Condição como vem do banco (query_operator aberto) ou do Zod (enum). */
export interface RuleCondition {
  attribute_key: string;
  filter_operator: string;
  values: unknown;
  query_operator?: string | null;
}

function toApi(row: AutomationRule): ApiAutomationRule {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    event_name: row.eventName,
    conditions: row.conditions,
    actions: row.actions,
    active: row.active,
    execution_delay: row.executionDelay,
    created_at: row.createdAt.toISOString(),
  };
}

// ---- CRUD ----

export async function listAutomationRules(accountId: number): Promise<ApiAutomationRule[]> {
  const rows = await db.query.automationRules.findMany({
    where: (r) => eq(r.accountId, accountId),
  });
  return rows.map(toApi);
}

export async function findAutomationRule(accountId: number, id: number): Promise<AutomationRule> {
  const row = await db.query.automationRules.findFirst({
    where: (r) => and(eq(r.accountId, accountId), eq(r.id, id)),
  });
  if (!row) throw new NotFoundError("Automation rule not found");
  return row;
}

async function customAttributeKeys(accountId: number): Promise<Set<string>> {
  const defs = await db.query.customAttributeDefinitions.findMany({
    where: (d) => eq(d.accountId, accountId),
    columns: { attributeKey: true },
  });
  return new Set(defs.map((d) => d.attributeKey));
}

/** Validação espelhando o model do Rails (json_conditions_format et al). */
export async function validateRule(
  accountId: number,
  input: {
    event_name: string;
    conditions: RuleCondition[];
    actions: ActionItem[];
    execution_delay?: number | null;
  },
): Promise<void> {
  const customKeys = await customAttributeKeys(accountId);
  const supportedKeys = new Set<string>([...AUTOMATION_CONDITION_KEYS, ...customKeys]);
  const badKeys = input.conditions.map((c) => c.attribute_key).filter((k) => !supportedKeys.has(k));
  if (badKeys.length > 0) {
    throw new UnprocessableError(`Unsupported conditions: ${[...new Set(badKeys)].join(", ")}`, {
      conditions: [`condições não suportadas: ${[...new Set(badKeys)].join(", ")}`],
    });
  }
  const badOps = input.conditions
    .map((c) => c.filter_operator)
    .filter((o) => !(AUTOMATION_FILTER_OPERATORS as readonly string[]).includes(o));
  if (badOps.length > 0) {
    throw new UnprocessableError(`Unsupported operators: ${[...new Set(badOps)].join(", ")}`, {
      conditions: [`operadores não suportados: ${[...new Set(badOps)].join(", ")}`],
    });
  }
  for (const c of input.conditions) {
    const op = (c.query_operator ?? "").toUpperCase();
    if (op && op !== "AND" && op !== "OR") {
      throw new UnprocessableError('Query operator must be "AND" or "OR"', {
        conditions: ['operador lógico deve ser "AND" ou "OR"'],
      });
    }
  }
  validateActionItems(input.actions, AUTOMATION_ACTION_NAMES);
  // Delay: para eventos de conversa, só condições de status/inbox (Rails:
  // DELAYED_CONVERSATION_ATTRIBUTES) — message_created aceita qualquer uma.
  if (input.execution_delay != null && input.event_name !== "message_created") {
    const bad = input.conditions
      .map((c) => c.attribute_key)
      .filter((k) => k !== "status" && k !== "inbox_id");
    if (bad.length > 0) {
      throw new UnprocessableError("Delayed rules only support status/inbox conditions", {
        execution_delay: ["com delay, use só condições de status/inbox"],
      });
    }
  }
}

export async function createAutomationRule(
  accountId: number,
  auth: AuthCtx,
  input: {
    name: string;
    description?: string;
    event_name: "conversation_created" | "conversation_updated" | "message_created";
    conditions: ConditionItem[];
    actions: ActionItem[];
    active?: boolean;
    execution_delay?: number | null;
  },
): Promise<ApiAutomationRule> {
  requireAdmin(auth);
  await validateRule(accountId, input);
  const [row] = await db
    .insert(automationRules)
    .values({
      accountId,
      name: input.name,
      description: input.description || null,
      eventName: input.event_name,
      conditions: input.conditions,
      actions: input.actions,
      active: input.active ?? true,
      executionDelay: input.execution_delay ?? null,
    })
    .returning();
  if (!row) throw new UnprocessableError("Could not create automation rule");
  return toApi(row);
}

export async function updateAutomationRule(
  accountId: number,
  auth: AuthCtx,
  id: number,
  input: Partial<{
    name: string;
    description: string;
    event_name: "conversation_created" | "conversation_updated" | "message_created";
    conditions: ConditionItem[];
    actions: ActionItem[];
    active: boolean;
    execution_delay: number | null;
  }>,
): Promise<ApiAutomationRule> {
  requireAdmin(auth);
  const rule = await findAutomationRule(accountId, id);
  const next = {
    event_name: input.event_name ?? (rule.eventName as ApiAutomationRule["event_name"]),
    conditions: input.conditions ?? rule.conditions,
    actions: input.actions ?? rule.actions,
    execution_delay:
      input.execution_delay !== undefined ? input.execution_delay : rule.executionDelay,
  };
  await validateRule(accountId, next);
  const [updated] = await db
    .update(automationRules)
    .set({
      name: input.name ?? rule.name,
      description: input.description !== undefined ? input.description || null : rule.description,
      eventName: next.event_name,
      conditions: next.conditions,
      actions: next.actions,
      active: input.active ?? rule.active,
      executionDelay: next.execution_delay,
      updatedAt: new Date(),
    })
    .where(eq(automationRules.id, rule.id))
    .returning();
  if (!updated) throw new NotFoundError("Automation rule not found");
  // Descarta execuções armadas sob a definição antiga (igual ao Rails).
  await db
    .delete(automationRulePendingExecutions)
    .where(
      and(
        eq(automationRulePendingExecutions.automationRuleId, rule.id),
        eq(automationRulePendingExecutions.status, 0),
      ),
    );
  return toApi(updated);
}

export async function deleteAutomationRule(
  accountId: number,
  auth: AuthCtx,
  id: number,
): Promise<void> {
  requireAdmin(auth);
  const rule = await findAutomationRule(accountId, id);
  await db.delete(automationRules).where(eq(automationRules.id, rule.id));
}

/** Duplica a regra (espelha clone do Rails: dup integral). */
export async function cloneAutomationRule(
  accountId: number,
  auth: AuthCtx,
  id: number,
): Promise<ApiAutomationRule> {
  requireAdmin(auth);
  const rule = await findAutomationRule(accountId, id);
  const [copy] = await db
    .insert(automationRules)
    .values({
      accountId,
      name: rule.name,
      description: rule.description,
      eventName: rule.eventName,
      conditions: rule.conditions,
      actions: rule.actions,
      active: rule.active,
      executionDelay: rule.executionDelay,
    })
    .returning();
  if (!copy) throw new NotFoundError("Automation rule not found");
  return toApi(copy);
}

// ---- Avaliação de condições ----

export interface RuleContext {
  conversationId: number;
  messageId?: number;
}

interface FactBag {
  conversation: Awaited<ReturnType<typeof findConversation>>;
  message?: {
    messageType: number;
    content: string | null;
    private: boolean;
  } | null;
  labels: string[];
  contact?: {
    email: string | null;
    phoneNumber: string | null;
    additionalAttributes: Record<string, unknown>;
    customAttributes: Record<string, unknown>;
  } | null;
}

async function loadFacts(ctx: RuleContext): Promise<FactBag | null> {
  const conversation = await db.query.conversations.findFirst({
    where: (c) => eq(c.id, ctx.conversationId),
  });
  if (!conversation) return null;
  const message = ctx.messageId
    ? await db.query.messages.findFirst({
        where: (m) => eq(m.id, ctx.messageId!),
        columns: { messageType: true, content: true, private: true },
      })
    : null;
  const tagRows = await db.query.taggings.findMany({
    where: (t) => and(eq(t.taggableType, "Conversation"), eq(t.taggableId, conversation.id)),
    columns: { tagId: true },
  });
  let labels: string[] = [];
  if (tagRows.length > 0) {
    const defs = await db.query.labels.findMany({
      where: (l, { inArray }) =>
        inArray(
          l.id,
          tagRows.map((t) => t.tagId),
        ),
      columns: { title: true },
    });
    labels = defs.map((d) => d.title ?? "").filter(Boolean);
  }
  const contact = conversation.contactId
    ? await db.query.contacts.findFirst({
        where: (c) => eq(c.id, conversation.contactId!),
        columns: {
          email: true,
          phoneNumber: true,
          additionalAttributes: true,
          customAttributes: true,
        },
      })
    : null;
  return { conversation, message, labels, contact };
}

function attributeValue(bag: FactBag, key: string): unknown {
  const conv = bag.conversation;
  switch (key) {
    case "status":
      return STATUS_FROM_INT[conv.status] ?? null;
    case "priority":
      return conv.priority == null ? "none" : (PRIORITY_FROM_INT[conv.priority] ?? null);
    case "inbox_id":
      return conv.inboxId;
    case "team_id":
      return conv.teamId;
    case "assignee_id":
      return conv.assigneeId;
    case "labels":
      return bag.labels;
    case "message_type":
      return bag.message ? (MESSAGE_TYPE_FROM_INT[bag.message.messageType] ?? null) : null;
    case "content":
      return bag.message?.content ?? null;
    case "private_note":
      return bag.message ? bag.message.private : null;
    case "email":
      return bag.contact?.email ?? null;
    case "phone_number":
      return bag.contact?.phoneNumber ?? null;
    default: {
      // Atributos custom ou additional (conversa e contato).
      const pools = [
        conv.additionalAttributes,
        conv.customAttributes,
        bag.contact?.additionalAttributes,
        bag.contact?.customAttributes,
      ];
      for (const pool of pools) {
        if (pool && typeof pool === "object" && key in pool) {
          return (pool as Record<string, unknown>)[key];
        }
      }
      return undefined;
    }
  }
}

function asList(values: unknown): unknown[] {
  if (values === null || values === undefined) return [];
  return Array.isArray(values) ? values : [values];
}

function sameScalar(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  // Compara com coerção leve: "3" == 3, "true" == true.
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
  if (typeof a === "boolean" || typeof b === "boolean") {
    const norm = (v: unknown) => v === true || v === "true" || v === 1 || v === "1";
    return norm(a) === norm(b);
  }
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function evalCondition(bag: FactBag, condition: RuleCondition): boolean {
  const actual = attributeValue(bag, condition.attribute_key);
  const expected = asList(condition.values);
  switch (condition.filter_operator) {
    case "equal_to":
      return expected.some((v) => sameScalar(actual, v));
    case "not_equal_to":
      return !expected.some((v) => sameScalar(actual, v));
    case "contains": {
      if (Array.isArray(actual)) {
        const set = new Set(actual.map((v) => String(v).toLowerCase()));
        return expected.some((v) => set.has(String(v).toLowerCase()));
      }
      if (actual === null || actual === undefined) return false;
      const hay = String(actual).toLowerCase();
      return expected.some((v) => hay.includes(String(v).toLowerCase()));
    }
    case "does_not_contain": {
      if (actual === null || actual === undefined) return true;
      if (Array.isArray(actual)) {
        const set = new Set(actual.map((v) => String(v).toLowerCase()));
        return !expected.some((v) => set.has(String(v).toLowerCase()));
      }
      const hay = String(actual).toLowerCase();
      return !expected.some((v) => hay.includes(String(v).toLowerCase()));
    }
    case "is_present":
      if (Array.isArray(actual)) return actual.length > 0;
      return actual !== null && actual !== undefined && actual !== "";
    case "is_not_present":
      if (Array.isArray(actual)) return actual.length === 0;
      return actual === null || actual === undefined || actual === "";
    case "is_greater_than":
      return Number(actual) > Number(expected[0]);
    case "is_less_than":
      return Number(actual) < Number(expected[0]);
    default:
      return false;
  }
}

/** AND/OR encadeado da esquerda para a direita (igual ao Rails). */
export function matchesConditions(bag: FactBag, conditions: RuleCondition[]): boolean {
  if (conditions.length === 0) return true;
  let result = evalCondition(bag, conditions[0]!);
  for (let i = 1; i < conditions.length; i += 1) {
    const op = (conditions[i - 1]!.query_operator ?? "AND").toUpperCase();
    const next = evalCondition(bag, conditions[i]!);
    result = op === "OR" ? result || next : result && next;
  }
  return result;
}

// ---- Execução ----

// Guarda anti-loop: mesma regra+conversa não reentra enquanto executa.
const running = new Set<string>();

export async function executeRuleOn(
  rule: AutomationRule,
  ctx: RuleContext,
): Promise<"executed" | "skipped" | "delayed"> {
  if (!rule.active) return "skipped";
  const bag = await loadFacts(ctx);
  if (!bag) return "skipped";
  if (!matchesConditions(bag, rule.conditions)) return "skipped";

  // Regra com delay em evento de conversa → arma execução futura.
  if (rule.executionDelay != null && rule.eventName !== "message_created") {
    const episodeKey = `conv:${STATUS_FROM_INT[bag.conversation.status] ?? bag.conversation.status}`;
    await db
      .insert(automationRulePendingExecutions)
      .values({
        automationRuleId: rule.id,
        conversationId: bag.conversation.id,
        accountId: rule.accountId,
        messageId: ctx.messageId ?? null,
        dueAt: new Date(Date.now() + rule.executionDelay * 60_000),
        episodeKey,
        status: 0,
      })
      .onConflictDoNothing({
        target: [
          automationRulePendingExecutions.automationRuleId,
          automationRulePendingExecutions.conversationId,
          automationRulePendingExecutions.episodeKey,
        ],
      });
    return "delayed";
  }
  if (rule.executionDelay != null && ctx.messageId) {
    await db
      .insert(automationRulePendingExecutions)
      .values({
        automationRuleId: rule.id,
        conversationId: bag.conversation.id,
        accountId: rule.accountId,
        messageId: ctx.messageId,
        dueAt: new Date(Date.now() + rule.executionDelay * 60_000),
        episodeKey: `message:${ctx.messageId}`,
        status: 0,
      })
      .onConflictDoNothing({
        target: [
          automationRulePendingExecutions.automationRuleId,
          automationRulePendingExecutions.conversationId,
          automationRulePendingExecutions.episodeKey,
        ],
      });
    return "delayed";
  }

  const key = `${rule.id}:${bag.conversation.id}`;
  if (running.has(key)) return "skipped";
  running.add(key);
  try {
    await applyActionItems(rule.accountId, bag.conversation.id, rule.actions, {
      actorName: `Automação ${rule.name}`,
      event: rule.eventName,
    });
    return "executed";
  } finally {
    running.delete(key);
  }
}

/** Avalia todas as regras ativas da conta para o evento. */
export async function runRulesFor(
  accountId: number,
  event: "conversation_created" | "conversation_updated" | "message_created",
  ctx: RuleContext,
): Promise<void> {
  const rules = await db.query.automationRules.findMany({
    where: (r) => and(eq(r.accountId, accountId), eq(r.eventName, event), eq(r.active, true)),
  });
  for (const rule of rules) {
    try {
      await executeRuleOn(rule, ctx);
    } catch (err) {
      console.error(`[automation] regra ${rule.id} (${rule.name})`, err);
    }
  }
}

/** Sweep de execuções com delay vencidas (30s, in-process + BullMQ). */
export async function processDueExecutions(): Promise<number> {
  const due = await db.query.automationRulePendingExecutions.findMany({
    where: (p) => and(eq(p.status, 0), lte(p.dueAt, new Date())),
    limit: 50,
  });
  let done = 0;
  for (const pending of due) {
    await db
      .update(automationRulePendingExecutions)
      .set({ status: 1, updatedAt: new Date() })
      .where(eq(automationRulePendingExecutions.id, pending.id));
    const finish = async (status: number, skipReason?: string) => {
      await db
        .update(automationRulePendingExecutions)
        .set({ status, skipReason: skipReason ?? null, updatedAt: new Date() })
        .where(eq(automationRulePendingExecutions.id, pending.id));
    };
    try {
      const rule = await db.query.automationRules.findFirst({
        where: (r) => eq(r.id, pending.automationRuleId),
      });
      if (!rule?.active) {
        await finish(4, "rule inactive");
        continue;
      }
      const bag = await loadFacts({
        conversationId: pending.conversationId,
        messageId: pending.messageId ?? undefined,
      });
      if (!bag) {
        await finish(4, "conversation gone");
        continue;
      }
      if (!matchesConditions(bag, rule.conditions)) {
        await finish(4, "conditions no longer match");
        continue;
      }
      await applyActionItems(rule.accountId, pending.conversationId, rule.actions, {
        actorName: `Automação ${rule.name}`,
        event: rule.eventName,
      });
      await finish(2);
      done += 1;
    } catch (err) {
      console.error(`[automation] pending ${pending.id}`, err);
      await finish(3, "error");
    }
  }
  return done;
}

export function registerAutomationSweep(): void {
  if (globalThis.__cw_automation_sweep_registered) return;
  globalThis.__cw_automation_sweep_registered = true;
  const tick = () => {
    void processDueExecutions().catch((err) => console.error("[automation sweep]", err));
  };
  setInterval(tick, 30_000);
  tick();
}

declare global {
  // eslint-disable-next-line no-var
  var __cw_automation_sweep_registered: boolean | undefined;
}

export type { FactBag };
