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

import { accounts, users } from "./auth";
import { inboxes } from "./inboxes";

// Membros por inbox + horário comercial + políticas de atribuição.
// Espelha chatwoot/db/schema.rb.

export const inboxMembers = pgTable(
  "inbox_members",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inboxId: integer("inbox_id")
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_inbox_members_on_inbox_id_and_user_id").on(table.inboxId, table.userId),
    index("index_inbox_members_on_inbox_id").on(table.inboxId),
  ],
);

export const workingHours = pgTable(
  "working_hours",
  {
    id: serial("id").primaryKey(),
    inboxId: integer("inbox_id")
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    closedAllDay: boolean("closed_all_day").notNull().default(false),
    openHour: integer("open_hour"),
    openMinutes: integer("open_minutes"),
    closeHour: integer("close_hour"),
    closeMinutes: integer("close_minutes"),
    openAllDay: boolean("open_all_day").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_working_hours_on_account_id").on(table.accountId),
    index("index_working_hours_on_inbox_id").on(table.inboxId),
  ],
);

// assignment_order / conversation_priority: 0 = round_robin / prioridade.
// (roteamento completo chega no M6; aqui só o espelho do schema.)
export const assignmentPolicies = pgTable(
  "assignment_policies",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    assignmentOrder: integer("assignment_order").notNull().default(0),
    conversationPriority: integer("conversation_priority").notNull().default(0),
    fairDistributionLimit: integer("fair_distribution_limit").notNull().default(100),
    fairDistributionWindow: integer("fair_distribution_window").notNull().default(3600),
    enabled: boolean("enabled").notNull().default(true),
    excludeOlderThanHours: integer("exclude_older_than_hours").default(168),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_assignment_policies_on_account_id_and_name").on(table.accountId, table.name),
    index("index_assignment_policies_on_enabled").on(table.enabled),
  ],
);

export const inboxAssignmentPolicies = pgTable(
  "inbox_assignment_policies",
  {
    id: serial("id").primaryKey(),
    inboxId: integer("inbox_id")
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),
    assignmentPolicyId: integer("assignment_policy_id")
      .notNull()
      .references(() => assignmentPolicies.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("uniq_inbox_assignment_policy").on(table.inboxId, table.assignmentPolicyId)],
);

// Apps de dashboard (integrações embed). Detalhes de uso no M12.
export const dashboardApps = pgTable(
  "dashboard_apps",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    content: jsonb("content").notNull().default([]),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    userId: integer("user_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("index_dashboard_apps_on_account_id").on(table.accountId),
    index("index_dashboard_apps_on_user_id").on(table.userId),
  ],
);

export type InboxMember = typeof inboxMembers.$inferSelect;
export type WorkingHour = typeof workingHours.$inferSelect;
