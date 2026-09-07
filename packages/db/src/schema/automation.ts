import {
  bigint,
  bigserial,
  boolean,
  integer,
  jsonb,
  text,
  timestamp,
  varchar,
  pgTable,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const automationRulePendingExecutions = pgTable(
  "automation_rule_pending_executions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    automationRuleId: bigint("automation_rule_id", { mode: "number" }).notNull(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    messageId: bigint("message_id", { mode: "number" }),
    dueAt: timestamp("due_at").notNull(),
    episodeKey: varchar("episode_key", { length: 255 }).notNull(),
    status: integer("status").notNull().default(0),
    skipReason: varchar("skip_reason", { length: 255 }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_automation_rule_pending_executions_on_account_id").on(table.accountId),
    uniqueIndex("uniq_automation_pending_execution_episode").on(
      table.automationRuleId,
      table.conversationId,
      table.episodeKey,
    ),
    index("index_automation_rule_pending_executions_on_automation_rule_id").on(
      table.automationRuleId,
    ),
    index("index_automation_rule_pending_executions_on_conversation_id").on(table.conversationId),
    index("index_automation_rule_pending_executions_on_status_and_due_at").on(
      table.status,
      table.dueAt,
    ),
    index("index_automation_pending_executions_on_status_and_updated_at").on(
      table.status,
      table.updatedAt,
    ),
  ],
);

export const automationRules = pgTable(
  "automation_rules",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    eventName: varchar("event_name", { length: 255 }).notNull(),
    conditions: jsonb("conditions").notNull().default("{}"),
    actions: jsonb("actions").notNull().default("{}"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    active: boolean("active").notNull().default(true),
    executionDelay: integer("execution_delay"),
  },
  (table) => [index("index_automation_rules_on_account_id").on(table.accountId)],
);

export type AutomationRulePendingExecution = typeof automationRulePendingExecutions.$inferSelect;
export type AutomationRule = typeof automationRules.$inferSelect;
