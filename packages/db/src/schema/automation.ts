import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./auth";
import { conversations } from "./conversations";
import { messages } from "./messages";

// Automações — espelha `automation_rules` e
// `automation_rule_pending_executions` do schema.rb.
// event_name: conversation_created | conversation_updated | message_created.
// conditions: [{ attribute_key, filter_operator, values, query_operator? }]
// actions: [{ action_name, action_params }]

export const automationRules = pgTable(
  "automation_rules",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    eventName: varchar("event_name", { length: 255 }).notNull(),
    conditions: jsonb("conditions")
      .notNull()
      .$type<
        Array<{
          attribute_key: string;
          filter_operator: string;
          values: unknown;
          query_operator?: string | null;
        }>
      >()
      .default([]),
    actions: jsonb("actions")
      .notNull()
      .$type<Array<{ action_name: string; action_params: unknown[] }>>()
      .default([]),
    active: boolean("active").notNull().default(true),
    executionDelay: integer("execution_delay"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("index_automation_rules_on_account_id").on(table.accountId)],
);

// status: 0 pending, 1 processing, 2 completed, 3 failed, 4 skipped.

export const automationRulePendingExecutions = pgTable(
  "automation_rule_pending_executions",
  {
    id: serial("id").primaryKey(),
    automationRuleId: integer("automation_rule_id")
      .notNull()
      .references(() => automationRules.id, { onDelete: "cascade" }),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    messageId: integer("message_id").references(() => messages.id, { onDelete: "set null" }),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    episodeKey: varchar("episode_key", { length: 255 }).notNull(),
    status: integer("status").notNull().default(0),
    skipReason: varchar("skip_reason", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("uniq_automation_pending_execution_episode").on(
      table.automationRuleId,
      table.conversationId,
      table.episodeKey,
    ),
    index("index_automation_rule_pending_executions_on_account_id").on(table.accountId),
    index("index_automation_pending_executions_due_at").on(table.dueAt, table.status),
  ],
);

export type AutomationRule = typeof automationRules.$inferSelect;
export type AutomationRulePendingExecution = typeof automationRulePendingExecutions.$inferSelect;
