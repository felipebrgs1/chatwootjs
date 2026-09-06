import {
  bigint,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

import { accounts } from "./auth";
import { conversations } from "./conversations";
import { inboxes } from "./inboxes";
import { users } from "./auth";

// Relatórios — espelha `reporting_events` e `reporting_events_rollups`.
// name: incoming_conversation, conversation_resolved, first_response,
// reply_time, csat, outgoing_message...

export const reportingEvents = pgTable(
  "reporting_events",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    conversationId: integer("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    inboxId: integer("inbox_id").references(() => inboxes.id, { onDelete: "set null" }),
    teamId: integer("team_id"),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    label: varchar("label", { length: 255 }),
    name: varchar("name", { length: 255 }),
    value: doublePrecision("value"),
    valueInBusinessHours: doublePrecision("value_in_business_hours"),
    eventStartTime: timestamp("event_start_time", { withTimezone: true }),
    eventEndTime: timestamp("event_end_time", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("reporting_events__account_id__name__created_at").on(
      table.accountId,
      table.name,
      table.createdAt,
    ),
    index("index_reporting_events_on_account_id").on(table.accountId),
    index("index_reporting_events_on_conversation_id").on(table.conversationId),
    index("index_reporting_events_on_inbox_id").on(table.inboxId),
    index("index_reporting_events_on_name").on(table.name),
    index("index_reporting_events_on_created_at").on(table.createdAt),
  ],
);

export const reportingEventsRollups = pgTable(
  "reporting_events_rollups",
  {
    id: serial("id").primaryKey(),
    accountId: integer("account_id").notNull(),
    date: date("date").notNull(),
    dimensionType: varchar("dimension_type", { length: 255 }).notNull(),
    dimensionId: bigint("dimension_id", { mode: "number" }).notNull(),
    metric: varchar("metric", { length: 255 }).notNull(),
    count: bigint("count", { mode: "number" }).notNull().default(0),
    sumValue: doublePrecision("sum_value").notNull().default(0),
    sumValueBusinessHours: doublePrecision("sum_value_business_hours").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("index_rollup_unique_key").on(
      table.accountId,
      table.date,
      table.dimensionType,
      table.dimensionId,
      table.metric,
    ),
    index("index_rollup_summary").on(table.accountId, table.dimensionType, table.date),
    index("index_rollup_timeseries").on(table.accountId, table.metric, table.date),
  ],
);

export type ReportingEvent = typeof reportingEvents.$inferSelect;
export type ReportingEventsRollup = typeof reportingEventsRollups.$inferSelect;
