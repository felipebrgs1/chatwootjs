import {
  bigint,
  bigserial,
  date,
  doublePrecision,
  integer,
  timestamp,
  varchar,
  pgTable,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Espelha chatwoot/db/schema.rb (pino docs/specs/CHATWOOT_PIN.md).
// Tipos Rails são normativos; camelCase só no nome da chave TS.

export const reportingEvents = pgTable(
  "reporting_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }),
    value: doublePrecision("value"),
    accountId: integer("account_id"),
    inboxId: integer("inbox_id"),
    userId: integer("user_id"),
    conversationId: integer("conversation_id"),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
    valueInBusinessHours: doublePrecision("value_in_business_hours"),
    eventStartTime: timestamp("event_start_time"),
    eventEndTime: timestamp("event_end_time"),
  },
  (table) => [
    index("reporting_events__account_id__name__created_at").on(
      table.accountId,
      table.name,
      table.createdAt,
    ),
    index("index_reporting_events_for_response_distribution").on(
      table.accountId,
      table.name,
      table.inboxId,
      table.createdAt,
    ),
    index("index_reporting_events_on_account_id").on(table.accountId),
    index("index_reporting_events_on_conversation_id").on(table.conversationId),
    index("index_reporting_events_on_created_at").on(table.createdAt),
    index("index_reporting_events_on_inbox_id").on(table.inboxId),
    index("index_reporting_events_on_name").on(table.name),
    index("index_reporting_events_on_user_id").on(table.userId),
  ],
);

export const reportingEventsRollups = pgTable(
  "reporting_events_rollups",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    accountId: integer("account_id").notNull(),
    date: date("date").notNull(),
    dimensionType: varchar("dimension_type", { length: 255 }).notNull(),
    dimensionId: bigint("dimension_id", { mode: "number" }).notNull(),
    metric: varchar("metric", { length: 255 }).notNull(),
    count: bigint("count", { mode: "number" }).notNull().default(0),
    sumValue: doublePrecision("sum_value").notNull().default(0.0),
    sumValueBusinessHours: doublePrecision("sum_value_business_hours").notNull().default(0.0),
    createdAt: timestamp("created_at")
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at")
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("index_rollup_unique_key").on(
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
