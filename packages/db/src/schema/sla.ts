import {
  bigint,
  bigserial,
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

// D1 — SLA, capacidade e licenças. Espelha `chatwoot/db/schema.rb`
// (sla_policies, applied_slas, sla_events, agent_capacity_policies,
// inbox_capacity_limits, leaves). Sem FKs em D1 (D2 alinha); sem dados
// funcionais novos — só DDL para paridade de dump.

const ts = (name: string) => timestamp(name, { withTimezone: false });

export const slaPolicies = pgTable(
  "sla_policies",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    // float do Rails = double precision.
    firstResponseTimeThreshold: doublePrecision("first_response_time_threshold"),
    nextResponseTimeThreshold: doublePrecision("next_response_time_threshold"),
    onlyDuringBusinessHours: boolean("only_during_business_hours").default(false),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    description: varchar("description", { length: 255 }),
    resolutionTimeThreshold: doublePrecision("resolution_time_threshold"),
  },
  (table) => [index("index_sla_policies_on_account_id").on(table.accountId)],
);

export const appliedSlas = pgTable(
  "applied_slas",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    slaPolicyId: bigint("sla_policy_id", { mode: "number" }).notNull(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
    slaStatus: integer("sla_status").default(0),
    completedAt: ts("completed_at"),
  },
  (table) => [
    unique("index_applied_slas_on_account_sla_policy_conversation").on(
      table.accountId,
      table.slaPolicyId,
      table.conversationId,
    ),
    index("index_applied_slas_on_account_id").on(table.accountId),
    index("index_applied_slas_on_conversation_id").on(table.conversationId),
    index("index_applied_slas_on_sla_policy_id").on(table.slaPolicyId),
  ],
);

export const slaEvents = pgTable(
  "sla_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    appliedSlaId: bigint("applied_sla_id", { mode: "number" }).notNull(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    slaPolicyId: bigint("sla_policy_id", { mode: "number" }).notNull(),
    inboxId: bigint("inbox_id", { mode: "number" }).notNull(),
    eventType: integer("event_type"),
    meta: jsonb("meta").$type<Record<string, unknown>>().default({}),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    index("index_sla_events_on_account_id").on(table.accountId),
    index("index_sla_events_on_applied_sla_id").on(table.appliedSlaId),
    index("index_sla_events_on_conversation_id").on(table.conversationId),
    index("index_sla_events_on_inbox_id").on(table.inboxId),
    index("index_sla_events_on_sla_policy_id").on(table.slaPolicyId),
  ],
);

export const agentCapacityPolicies = pgTable(
  "agent_capacity_policies",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    exclusionRules: jsonb("exclusion_rules").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [index("index_agent_capacity_policies_on_account_id").on(table.accountId)],
);

export const inboxCapacityLimits = pgTable(
  "inbox_capacity_limits",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    agentCapacityPolicyId: bigint("agent_capacity_policy_id", { mode: "number" }).notNull(),
    inboxId: bigint("inbox_id", { mode: "number" }).notNull(),
    conversationLimit: integer("conversation_limit").notNull(),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    unique("idx_on_agent_capacity_policy_id_inbox_id_71c7ec4caf").on(
      table.agentCapacityPolicyId,
      table.inboxId,
    ),
    index("index_inbox_capacity_limits_on_agent_capacity_policy_id").on(
      table.agentCapacityPolicyId,
    ),
    index("index_inbox_capacity_limits_on_inbox_id").on(table.inboxId),
  ],
);

export const leaves = pgTable(
  "leaves",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: bigint("account_id", { mode: "number" }).notNull(),
    userId: bigint("user_id", { mode: "number" }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    // leave_type: 0 vacation, 1 sick… status: 0 pending, 1 approved, 2 rejected.
    leaveType: integer("leave_type").notNull().default(0),
    status: integer("status").notNull().default(0),
    reason: text("reason"),
    approvedById: bigint("approved_by_id", { mode: "number" }),
    approvedAt: ts("approved_at"),
    createdAt: ts("created_at").notNull(),
    updatedAt: ts("updated_at").notNull(),
  },
  (table) => [
    index("index_leaves_on_account_id_and_status").on(table.accountId, table.status),
    index("index_leaves_on_account_id").on(table.accountId),
    index("index_leaves_on_approved_by_id").on(table.approvedById),
    index("index_leaves_on_user_id").on(table.userId),
  ],
);

export type SlaPolicy = typeof slaPolicies.$inferSelect;
export type AppliedSla = typeof appliedSlas.$inferSelect;
export type SlaEvent = typeof slaEvents.$inferSelect;
export type AgentCapacityPolicy = typeof agentCapacityPolicies.$inferSelect;
export type InboxCapacityLimit = typeof inboxCapacityLimits.$inferSelect;
export type Leave = typeof leaves.$inferSelect;
