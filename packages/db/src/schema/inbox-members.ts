import {
  bigint,
  bigserial,
  boolean,
  integer,
  jsonb,
  serial,
  text,
  timestamp,
  varchar,
  pgTable,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const assignmentPolicies = pgTable(
  "assignment_policies",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    assignmentOrder: integer("assignment_order").notNull().default(0),
    conversationPriority: integer("conversation_priority").notNull().default(0),
    fairDistributionLimit: integer("fair_distribution_limit").notNull().default(100),
    fairDistributionWindow: integer("fair_distribution_window").notNull().default(3600),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    excludeOlderThanHours: integer("exclude_older_than_hours").default(168),
  },
  (table) => [
    uniqueIndex("index_assignment_policies_on_account_id_and_name").on(table.accountId, table.name),
    index("index_assignment_policies_on_account_id").on(table.accountId),
    index("index_assignment_policies_on_enabled").on(table.enabled),
  ],
);

export const dashboardApps = pgTable(
  "dashboard_apps",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    content: jsonb("content").default([]),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_dashboard_apps_on_account_id").on(table.accountId),
    index("index_dashboard_apps_on_user_id").on(table.userId),
  ],
);

export const inboxAssignmentPolicies = pgTable(
  "inbox_assignment_policies",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    inboxId: bigint("inbox_id", { mode: "number" }).notNull(),
    assignmentPolicyId: bigint("assignment_policy_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("index_inbox_assignment_policies_on_assignment_policy_id").on(table.assignmentPolicyId),
    uniqueIndex("index_inbox_assignment_policies_on_inbox_id").on(table.inboxId),
  ],
);

export const inboxMembers = pgTable(
  "inbox_members",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    inboxId: integer("inbox_id").notNull(),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("index_inbox_members_on_inbox_id_and_user_id").on(table.inboxId, table.userId),
    index("index_inbox_members_on_inbox_id").on(table.inboxId),
  ],
);

export const workingHours = pgTable(
  "working_hours",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    inboxId: bigint("inbox_id", { mode: "number" }),
    accountId: bigint("account_id", { mode: "number" }),
    dayOfWeek: integer("day_of_week").notNull(),
    closedAllDay: boolean("closed_all_day").default(false),
    openHour: integer("open_hour"),
    openMinutes: integer("open_minutes"),
    closeHour: integer("close_hour"),
    closeMinutes: integer("close_minutes"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    openAllDay: boolean("open_all_day").default(false),
  },
  (table) => [
    index("index_working_hours_on_account_id").on(table.accountId),
    index("index_working_hours_on_inbox_id").on(table.inboxId),
  ],
);

export type AssignmentPolicies = typeof assignmentPolicies.$inferSelect;
export type DashboardApps = typeof dashboardApps.$inferSelect;
export type InboxAssignmentPolicies = typeof inboxAssignmentPolicies.$inferSelect;
export type InboxMember = typeof inboxMembers.$inferSelect;
export type WorkingHour = typeof workingHours.$inferSelect;
